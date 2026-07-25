import * as SecureStore from "expo-secure-store";
import { getSetting, setSetting } from "@/database/settingsRepo";

export type AiMode = "local" | "online";
export type OnlineModelId = "deepseek-v4-flash" | "deepseek-v4-pro";

const KEY_MODE = "ai_mode";
const KEY_ONLINE_MODEL = "ai_online_model";
const KEY_API_KEY_SET = "ai_api_key_set";
const SECURE_API_KEY = "fino_deepseek_api_key";

export const ONLINE_MODELS: { id: OnlineModelId; label: string; hint: string }[] =
  [
    { id: "deepseek-v4-flash", label: "deepseek-v4-flash", hint: "Rápido · padrão" },
    { id: "deepseek-v4-pro", label: "deepseek-v4-pro", hint: "Mais capaz · mais lento" },
  ];

export async function getAiMode(): Promise<AiMode> {
  return (await getSetting(KEY_MODE)) === "online" ? "online" : "local";
}

export async function setAiMode(mode: AiMode): Promise<void> {
  await setSetting(KEY_MODE, mode);
}

export async function getOnlineModel(): Promise<OnlineModelId> {
  const v = await getSetting(KEY_ONLINE_MODEL);
  return v === "deepseek-v4-pro" ? "deepseek-v4-pro" : "deepseek-v4-flash";
}

export async function setOnlineModel(model: OnlineModelId): Promise<void> {
  await setSetting(KEY_ONLINE_MODEL, model);
}

export async function hasApiKey(): Promise<boolean> {
  return (await getSetting(KEY_API_KEY_SET)) === "1";
}

/** Reads key only for inference — never for UI display. */
export async function getApiKey(): Promise<string | null> {
  if (!(await hasApiKey())) return null;
  return SecureStore.getItemAsync(SECURE_API_KEY);
}

export async function saveApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("API_KEY_EMPTY");
  await SecureStore.setItemAsync(SECURE_API_KEY, trimmed);
  await setSetting(KEY_API_KEY_SET, "1");
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_API_KEY);
  await setSetting(KEY_API_KEY_SET, "0");
}

export function onlineModelShortLabel(id: OnlineModelId): string {
  return id === "deepseek-v4-pro" ? "DeepSeek Pro" : "DeepSeek Flash";
}
