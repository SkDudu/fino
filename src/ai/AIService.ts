import {
  createDownloadResumable,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
} from "expo-file-system/legacy";
import { Platform } from "react-native";
import type { LlamaContext } from "llama.rn";
import { getSetting, setSetting } from "@/database/settingsRepo";
import {
  AI_RUNTIME,
  AI_VERSION_DEFAULT,
  DEFAULT_MODEL_ID,
  type AiManifest,
  type AiModelEntry,
  type AiStatus,
  type EnrichmentJson,
} from "./constants";
import { getCatalogModel, listCatalogModels } from "./modelCatalog";
import { parseEnrichmentJson } from "./parseEnrichment";
import { initContextManager } from "./builders/ContextManager";
import {
  buildEnrichmentMessages,
  buildTestMessages,
} from "./builders/PromptBuilder";
import type { EnrichmentMessages } from "./builders/PromptTemplates";
import { handleChatQuestion } from "./conversation/ConversationManager";
import {
  registerInference,
  type InferOptions,
  type InferResult,
} from "./InferenceEngine";
import { formatAiError } from "./formatAiError";
import { getAiMode, getApiKey, getOnlineModel, hasApiKey } from "./aiSettings";
import type { TokenUsage } from "./deepseekPricing";
import { onlineInfer } from "./onlineInfer";
import { redactForOnline } from "./redactForOnline";

export { formatAiError } from "./formatAiError";

const KEY_VERSION = "ai_model_version";
const KEY_SHA = "ai_model_sha256";
const KEY_INSTALLED_AT = "ai_model_installed_at";
const KEY_SIZE = "ai_model_size";
const KEY_ACTIVE = "ai_active_model_id";
const KEY_KEEP_IN_MEMORY = "ai_keep_in_memory";

type StatusListener = (s: AiStatus) => void;

let status: AiStatus = "NOT_INSTALLED";
let context: LlamaContext | null = null;
let downloadProgress = 0;
let downloadCancelled = false;
let activeDownload: ReturnType<typeof createDownloadResumable> | null = null;
let downloadInFlight: Promise<void> | null = null;
let lastRuntimeError: string | null = null;
let initPromise: Promise<void> | null = null;
let downloadingModelId: string | null = null;
const listeners = new Set<StatusListener>();

const QWEN_STOPS = ["<|im" + "_end|>", "<|endoftext|>", "</s>"];
// ponytail: ~800 tokens sem tokenizer; add contagem real quando tiver
const PROMPT_CHAR_LIMIT = 3200;

async function loadLlamaContext(entry: AiModelEntry): Promise<LlamaContext> {
  const { initLlama } = await import("llama.rn");
  const base = {
    model: await modelPath(),
    n_ctx: entry.nCtx ?? 2048,
    n_threads: entry.nThreads ?? 4,
    use_mmap: true,
  };
  const wantGpu = entry.nGpuLayers ?? 99;
  try {
    let ctx = await initLlama({ ...base, n_gpu_layers: wantGpu });
    if (wantGpu > 0 && !ctx.gpu) {
      await ctx.release();
      ctx = await initLlama({ ...base, n_gpu_layers: 0 });
    }
    return ctx;
  } catch {
    return initLlama({ ...base, n_gpu_layers: 0 });
  }
}

function setStatus(next: AiStatus) {
  status = next;
  listeners.forEach((l) => l(status));
}

function setDownloadProgress(pct: number) {
  downloadProgress = pct;
  // wake UI subscribers without a separate progress bus
  listeners.forEach((l) => l(status));
}

function modelsDir(): string {
  const root = documentDirectory;
  if (!root) throw new Error("NO_DOCUMENT_DIR");
  return `${root}models/`;
}

function modelPathFor(entry: AiModelEntry): string {
  return `${modelsDir()}${entry.file}`;
}

async function getActiveModelId(): Promise<string> {
  const saved = await getSetting(KEY_ACTIVE);
  if (saved && listCatalogModels().some((m) => m.id === saved)) return saved;
  return DEFAULT_MODEL_ID;
}

async function getActiveEntry(): Promise<AiModelEntry> {
  return getCatalogModel(await getActiveModelId());
}

async function modelPath(): Promise<string> {
  return modelPathFor(await getActiveEntry());
}

function entryToManifest(entry: AiModelEntry): AiManifest {
  return {
    model: entry.id,
    version: AI_VERSION_DEFAULT,
    runtime: AI_RUNTIME,
    downloadUrl: entry.downloadUrl,
    sha256: entry.sha256,
    size: entry.size,
  };
}

async function fileExists(uri: string): Promise<boolean> {
  const info = await getInfoAsync(uri);
  return info.exists && !info.isDirectory;
}

async function readMeta() {
  return {
    version: (await getSetting(KEY_VERSION)) ?? AI_VERSION_DEFAULT,
    sha256: (await getSetting(KEY_SHA)) ?? "",
    installedAt: (await getSetting(KEY_INSTALLED_AT)) ?? "",
    size: Number((await getSetting(KEY_SIZE)) ?? 0),
  };
}

export function getStatus(): AiStatus {
  return status;
}

export function getDownloadProgress(): number {
  return downloadProgress;
}

export function getLastRuntimeError(): string | null {
  return lastRuntimeError;
}

function setRuntimeError(code: string | null) {
  lastRuntimeError = code;
}

export function subscribeStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDownloadingModelId(): string | null {
  return downloadingModelId;
}

export function listModels(): AiModelEntry[] {
  return listCatalogModels();
}

export async function getActiveModel(): Promise<AiModelEntry> {
  return getActiveEntry();
}

export async function isModelFileInstalled(modelId: string): Promise<boolean> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return false;
  try {
    return await fileExists(modelPathFor(getCatalogModel(modelId)));
  } catch {
    return false;
  }
}

export async function listInstalledModels(): Promise<
  { entry: AiModelEntry; bytes: number; active: boolean }[]
> {
  const activeId = await getActiveModelId();
  const out: { entry: AiModelEntry; bytes: number; active: boolean }[] = [];
  for (const entry of listCatalogModels()) {
    const path = modelPathFor(entry);
    if (!(await fileExists(path))) continue;
    const info = await getInfoAsync(path);
    const bytes =
      info.exists && "size" in info && typeof info.size === "number"
        ? info.size
        : 0;
    out.push({ entry, bytes, active: entry.id === activeId });
  }
  return out;
}

export async function selectModel(modelId: string): Promise<void> {
  const entry = getCatalogModel(modelId);
  if (!(await fileExists(modelPathFor(entry)))) {
    throw new Error("MODEL_NOT_INSTALLED");
  }
  if (status === "RUNNING") throw new Error("INFERENCE_IN_FLIGHT");
  if (context) {
    await context.release();
    context = null;
  }
  // ponytail: drop in-flight load so we don't finish loading the previous model
  initPromise = null;
  await setSetting(KEY_ACTIVE, modelId);
  setRuntimeError(null);
  await initialize();
}

export async function isModelInstalled(): Promise<boolean> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return false;
  try {
    return await fileExists(await modelPath());
  } catch {
    return false;
  }
}

export async function isAiReady(): Promise<boolean> {
  if ((await getAiMode()) === "online") return hasApiKey();
  return isModelInstalled();
}

export async function isReady(): Promise<boolean> {
  if ((await getAiMode()) === "online") return hasApiKey();
  return status === "READY" && context != null;
}

export async function getModelInfo() {
  const meta = await readMeta();
  const entry = await getActiveEntry();
  const path = modelPathFor(entry);
  const installed = await fileExists(path);
  let bytes = meta.size;
  if (installed) {
    const info = await getInfoAsync(path);
    if (info.exists && "size" in info && typeof info.size === "number") {
      bytes = info.size;
    }
  }
  return {
    model: entry.id,
    label: entry.label,
    file: entry.file,
    runtime: AI_RUNTIME,
    version: meta.version,
    status,
    installed,
    bytes,
    sha256: meta.sha256,
    installedAt: meta.installedAt,
    path,
  };
}

export async function fetchManifest(modelId?: string): Promise<AiManifest> {
  const entry = getCatalogModel(modelId ?? (await getActiveModelId()));
  return entryToManifest(entry);
}

// ponytail: size opcional (0 = skip); R2 HTTPS direto, sem sniff de header
async function verifyDownload(path: string, manifest: AiManifest) {
  const info = await getInfoAsync(path);
  if (!info.exists || info.isDirectory) throw new Error("MODEL_MISSING");
  const bytes =
    typeof info.size === "number" && Number.isFinite(info.size) ? info.size : 0;
  if (manifest.size > 0 && bytes > 0 && bytes !== manifest.size) {
    throw new Error("MODEL_SIZE_MISMATCH");
  }
  if (manifest.sha256) {
    await setSetting(KEY_SHA, manifest.sha256);
  }
}

export async function downloadModel(modelId?: string): Promise<void> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    throw new Error("UNSUPPORTED_PLATFORM");
  }
  if (downloadInFlight) return downloadInFlight;

  const entry = getCatalogModel(modelId ?? (await getActiveModelId()));
  downloadingModelId = entry.id;
  downloadCancelled = false;
  setRuntimeError(null);
  setStatus("DOWNLOADING");
  setDownloadProgress(0);

  downloadInFlight = (async () => {
    let verified = false;
    try {
      const manifest = entryToManifest(entry);
      if (downloadCancelled) return;
      await makeDirectoryAsync(modelsDir(), { intermediates: true });
      const dest = modelPathFor(entry);
      if (await fileExists(dest)) {
        await deleteAsync(dest, { idempotent: true });
      }
      if (downloadCancelled) return;

      activeDownload = createDownloadResumable(
        manifest.downloadUrl,
        dest,
        {},
        (ev) => {
          if (downloadCancelled) return;
          if (ev.totalBytesExpectedToWrite > 0) {
            setDownloadProgress(
              ev.totalBytesWritten / ev.totalBytesExpectedToWrite
            );
          }
        }
      );
      await activeDownload.downloadAsync();
      if (downloadCancelled) return;

      await verifyDownload(dest, manifest);
      verified = true;
      await setSetting(KEY_ACTIVE, entry.id);
      await setSetting(KEY_VERSION, manifest.version);
      if (manifest.sha256) await setSetting(KEY_SHA, manifest.sha256);
      const info = await getInfoAsync(dest);
      const size =
        info.exists && "size" in info && typeof info.size === "number"
          ? info.size
          : manifest.size || 0;
      await setSetting(KEY_SIZE, String(size));
      await setSetting(KEY_INSTALLED_AT, new Date().toISOString());
      setDownloadProgress(1);
      if (context) {
        await context.release();
        context = null;
      }
      if (await getKeepInMemory()) {
        try {
          await initialize();
        } catch {
          setRuntimeError("MODEL_LOAD_FAILED");
          setStatus("NOT_INSTALLED");
        }
      } else {
        setStatus("NOT_INSTALLED");
      }
    } catch (e) {
      if (downloadCancelled) {
        setDownloadProgress(0);
        setStatus("NOT_INSTALLED");
        return;
      }
      const detail = formatAiError(e);
      setRuntimeError(detail);
      setStatus("ERROR");
      if (!verified) {
        try {
          await deleteAsync(modelPathFor(entry), { idempotent: true });
        } catch {
          /* ignore */
        }
      }
      throw e;
    } finally {
      downloadingModelId = null;
      activeDownload = null;
      downloadInFlight = null;
    }
  })();

  return downloadInFlight;
}

/** Stop in-flight download, delete partial file, reset to empty. */
export async function cancelDownload(): Promise<void> {
  downloadCancelled = true;
  setDownloadProgress(0);
  const task = activeDownload;
  const entryId = downloadingModelId;
  activeDownload = null;
  try {
    await task?.cancelAsync();
  } catch {
    /* ignore */
  }
  const pending = downloadInFlight;
  try {
    await pending;
  } catch {
    /* ignore */
  }
  if (entryId) {
    try {
      await deleteAsync(modelPathFor(getCatalogModel(entryId)), {
        idempotent: true,
      });
    } catch {
      /* ignore */
    }
  }
  downloadingModelId = null;
  setStatus("NOT_INSTALLED");
}

export async function removeModel(modelId?: string): Promise<void> {
  const entry = getCatalogModel(modelId ?? (await getActiveModelId()));
  const activeId = await getActiveModelId();
  if (context && entry.id === activeId) {
    await context.release();
    context = null;
  }
  try {
    await deleteAsync(modelPathFor(entry), { idempotent: true });
  } catch {
    /* ignore */
  }
  if (entry.id === activeId) {
    await setSetting(KEY_VERSION, "");
    await setSetting(KEY_SHA, "");
    await setSetting(KEY_SIZE, "0");
    await setSetting(KEY_INSTALLED_AT, "");
    setStatus("NOT_INSTALLED");
    const remaining = await listInstalledModels();
    if (remaining[0]) {
      await setSetting(KEY_ACTIVE, remaining[0].entry.id);
      await initialize();
    }
  }
}

export async function initialize(): Promise<void> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    setStatus("NOT_INSTALLED");
    return;
  }
  if (!(await isModelInstalled())) {
    setStatus("NOT_INSTALLED");
    return;
  }
  if (context) {
    setStatus("READY");
    return;
  }
  if (initPromise) return initPromise;
  setStatus("LOADING");
  initPromise = (async () => {
    try {
      const entry = await getActiveEntry();
      context = await loadLlamaContext(entry);
      setStatus("READY");
      setRuntimeError(null);
    } catch {
      context = null;
      setStatus("ERROR");
      setRuntimeError("MODEL_LOAD_FAILED");
      throw new Error("MODEL_LOAD_FAILED");
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
}

async function unloadContext(): Promise<void> {
  if (status === "RUNNING") throw new Error("INFERENCE_IN_FLIGHT");
  initPromise = null;
  if (!context) return;
  try {
    await context.release();
  } catch {
    /* ignore */
  }
  context = null;
  setRuntimeError(null);
  // ponytail: NOT_INSTALLED here = file exists, not loaded in RAM
  if (await isModelInstalled()) setStatus("NOT_INSTALLED");
}

export async function getKeepInMemory(): Promise<boolean> {
  return (await getSetting(KEY_KEEP_IN_MEMORY)) === "1";
}

/** Persist keep preference; load or unload RAM to match. */
export async function setKeepInMemory(keep: boolean): Promise<void> {
  await setSetting(KEY_KEEP_IN_MEMORY, keep ? "1" : "0");
  if (keep) await initialize();
  else await unloadContext();
}

/** Drop LlamaContext from RAM; GGUF on disk stays. */
export async function releaseModel(): Promise<void> {
  await setKeepInMemory(false);
}

/** Background unload only when user did not opt to keep the model loaded. */
export async function releaseModelIfNotKept(): Promise<void> {
  if (await getKeepInMemory()) return;
  await unloadContext();
}

/** Release context and load model again from disk. */
export async function reloadModel(): Promise<void> {
  await setKeepInMemory(true);
}

function toChatMessages({ system, user }: EnrichmentMessages) {
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

async function inferOnline(
  messages: EnrichmentMessages,
  opts?: InferOptions
): Promise<InferResult> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("ONLINE_NO_KEY");
  const model = await getOnlineModel();
  setStatus("RUNNING");
  try {
    const { text, usage } = await onlineInfer(messages, { apiKey, model });
    // ponytail: no SSE in v1 — deliver full text once for chat UI
    if (opts?.onToken && text) opts.onToken(text);
    return { text, usage };
  } catch (e) {
    const code = e instanceof Error ? e.message : "ONLINE_FAILED";
    setRuntimeError(code);
    throw new Error(code);
  } finally {
    setStatus("READY");
  }
}

async function inferMessages(
  messages: EnrichmentMessages,
  opts?: InferOptions
): Promise<InferResult> {
  if ((await getAiMode()) === "online") return inferOnline(messages, opts);

  if (!context) {
    if (!(await isModelInstalled())) throw new Error("MODEL_NOT_INSTALLED");
    await initialize();
  }
  if (!context) throw new Error("MODEL_LOAD_FAILED");
  const entry = await getActiveEntry();
  const promptLen = messages.system.length + messages.user.length;
  if (promptLen > PROMPT_CHAR_LIMIT) throw new Error("PROMPT_TOO_LARGE");
  setStatus("RUNNING");
  try {
    const result = await context.completion(
      {
        messages: toChatMessages(messages),
        n_predict: opts?.nPredict ?? entry.nPredict ?? 128,
        temperature: 0.1,
        stop: QWEN_STOPS,
      },
      opts?.onToken
        ? (data) => {
            const t = data.token ?? "";
            if (t) opts.onToken!(t);
          }
        : undefined
    );
    return { text: result.text ?? "" };
  } catch (e) {
    const code = e instanceof Error ? e.message : "INFERENCE_FAILED";
    setRuntimeError(code === "PROMPT_TOO_LARGE" ? code : "INFERENCE_FAILED");
    throw new Error(code === "PROMPT_TOO_LARGE" ? code : "INFERENCE_FAILED");
  } finally {
    setStatus(context ? "READY" : "ERROR");
  }
}

export type EnrichResult = {
  json: EnrichmentJson;
  usage?: TokenUsage;
};

export async function enrichFromText(
  rawText: string
): Promise<EnrichResult | null> {
  if (!(await isAiReady())) return null;
  try {
    const mode = await getAiMode();
    if (mode === "local" && !(await isReady())) await initialize();
    const entry =
      mode === "local" ? await getActiveEntry() : { nPredict: 256 };
    const payload = mode === "online" ? redactForOnline(rawText) : rawText;
    const { text, usage } = await inferMessages(
      buildEnrichmentMessages(payload),
      { nPredict: Math.max(entry.nPredict ?? 128, 256) }
    );
    const parsed = parseEnrichmentJson(text);
    if (!parsed) throw new Error("INVALID_AI_RESPONSE");
    return { json: parsed, usage };
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNKNOWN";
    setRuntimeError(code);
    return null;
  }
}

export type AskResult = { text: string; usage?: TokenUsage };

export async function ask(
  question: string,
  onToken?: (token: string) => void
): Promise<AskResult> {
  if (!(await isAiReady())) {
    throw new Error(
      (await getAiMode()) === "online" ? "ONLINE_NO_KEY" : "MODEL_NOT_INSTALLED"
    );
  }
  if ((await getAiMode()) === "local" && !(await isReady())) await initialize();
  return handleChatQuestion(question, onToken);
}

export async function testInference(): Promise<EnrichmentJson> {
  if (!(await isAiReady())) {
    throw new Error(
      (await getAiMode()) === "online" ? "ONLINE_NO_KEY" : "MODEL_NOT_INSTALLED"
    );
  }
  if ((await getAiMode()) === "local" && !(await isReady())) await initialize();
  const { text } = await inferMessages(buildTestMessages());
  const parsed = parseEnrichmentJson(text);
  if (!parsed) throw new Error("INVALID_AI_RESPONSE");
  return parsed;
}

/** Soft boot — never throws; app works without model. */
export async function bootAi(): Promise<void> {
  try {
    if (status === "DOWNLOADING" || downloadInFlight) return;
    if (!(await isModelInstalled())) {
      if (status !== "ERROR") setStatus("NOT_INSTALLED");
      return;
    }
    if (await getKeepInMemory()) await initialize();
    else if (context) await unloadContext();
    else if (status !== "ERROR") setStatus("NOT_INSTALLED");
  } catch {
    setStatus("ERROR");
  }
}

initContextManager();
registerInference(inferMessages);
