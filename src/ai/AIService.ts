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
import { getApiKey, getOnlineModel, hasApiKey } from "./aiSettings";
import type { TokenUsage } from "./deepseekPricing";
import { onlineInfer } from "./onlineInfer";
import { redactForOnline } from "./redactForOnline";
import type { AiStatus, EnrichmentJson } from "./constants";

export { formatAiError } from "./formatAiError";

type StatusListener = (s: AiStatus) => void;

let status: AiStatus = "IDLE";
let lastRuntimeError: string | null = null;
const listeners = new Set<StatusListener>();

function setStatus(next: AiStatus) {
  status = next;
  listeners.forEach((l) => l(status));
}

function setRuntimeError(code: string | null) {
  lastRuntimeError = code;
}

export function getStatus(): AiStatus {
  return status;
}

export function getLastRuntimeError(): string | null {
  return lastRuntimeError;
}

export function subscribeStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function isAiReady(): Promise<boolean> {
  return hasApiKey();
}

export async function isReady(): Promise<boolean> {
  return hasApiKey();
}

async function inferMessages(
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
    setRuntimeError(null);
    return { text, usage };
  } catch (e) {
    const code = e instanceof Error ? e.message : "ONLINE_FAILED";
    setRuntimeError(code);
    throw new Error(code);
  } finally {
    setStatus("READY");
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
    const { text, usage } = await inferMessages(
      buildEnrichmentMessages(redactForOnline(rawText)),
      { nPredict: 256 }
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
  if (!(await isAiReady())) throw new Error("ONLINE_NO_KEY");
  return handleChatQuestion(question, onToken);
}

export async function testInference(): Promise<EnrichmentJson> {
  if (!(await isAiReady())) throw new Error("ONLINE_NO_KEY");
  const { text } = await inferMessages(buildTestMessages());
  const parsed = parseEnrichmentJson(text);
  if (!parsed) throw new Error("INVALID_AI_RESPONSE");
  return parsed;
}

/** Soft boot — sync status from API key presence. */
export async function bootAi(): Promise<void> {
  setStatus((await hasApiKey()) ? "READY" : "IDLE");
}

initContextManager();
registerInference(inferMessages);
