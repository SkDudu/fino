import type { OnlineModelId } from "./aiSettings";
import { getUsdBrl } from "./usdBrlRate";

/** USD per 1M tokens — DeepSeek published rates */
export const DEEPSEEK_PRICE = {
  "deepseek-v4-flash": {
    inputHit: 0.0028,
    inputMiss: 0.14,
    output: 0.28,
  },
  "deepseek-v4-pro": {
    inputHit: 0.003625,
    inputMiss: 0.435,
    output: 0.87,
  },
} as const;

export type ApiUsageRaw = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
};

export type TokenUsage = {
  model: OnlineModelId;
  promptTokens: number;
  completionTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  totalTokens: number;
  costUsd: number;
};

export function costUsd(
  model: OnlineModelId,
  cacheHit: number,
  cacheMiss: number,
  completion: number
): number {
  const p = DEEPSEEK_PRICE[model];
  return (
    (cacheHit / 1e6) * p.inputHit +
    (cacheMiss / 1e6) * p.inputMiss +
    (completion / 1e6) * p.output
  );
}

/** Parse API usage. Missing cache split → all prompt as miss (conservative). */
export function parseUsage(
  model: OnlineModelId,
  raw: ApiUsageRaw | null | undefined
): TokenUsage | undefined {
  if (!raw) return undefined;
  const prompt = Math.max(0, raw.prompt_tokens ?? 0);
  const completion = Math.max(0, raw.completion_tokens ?? 0);
  if (prompt === 0 && completion === 0) return undefined;

  const hasSplit =
    raw.prompt_cache_hit_tokens != null || raw.prompt_cache_miss_tokens != null;
  // ponytail: no cache fields → treat all prompt as miss (upper bound)
  const cacheHit = hasSplit ? Math.max(0, raw.prompt_cache_hit_tokens ?? 0) : 0;
  const cacheMiss = hasSplit
    ? Math.max(0, raw.prompt_cache_miss_tokens ?? prompt - cacheHit)
    : prompt;

  const usd = costUsd(model, cacheHit, cacheMiss, completion);
  return {
    model,
    promptTokens: prompt,
    completionTokens: completion,
    cacheHitTokens: cacheHit,
    cacheMissTokens: cacheMiss,
    totalTokens: raw.total_tokens ?? prompt + completion,
    costUsd: usd,
  };
}

export function costBrl(usd: number): number {
  return usd * getUsdBrl();
}

export function formatCostBrl(usd: number): string {
  return costBrl(usd).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatTokenCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
}

export function modelShort(id: OnlineModelId): string {
  return id === "deepseek-v4-pro" ? "pro" : "flash";
}

/** Estimate cost on another model (all prompt as miss). */
export function estimateCostUsd(
  model: OnlineModelId,
  promptTokens: number,
  completionTokens: number
): number {
  return costUsd(model, 0, promptTokens, completionTokens);
}

export function selfCheckPricing(): void {
  const flashMiss = costUsd("deepseek-v4-flash", 0, 1_000_000, 0);
  if (Math.abs(flashMiss - 0.14) > 1e-9) throw new Error("selfCheck: flash miss");
  const proOut = costUsd("deepseek-v4-pro", 0, 0, 1_000_000);
  if (Math.abs(proOut - 0.87) > 1e-9) throw new Error("selfCheck: pro out");
  const u = parseUsage("deepseek-v4-flash", {
    prompt_tokens: 1000,
    completion_tokens: 500,
  });
  if (!u || u.cacheMissTokens !== 1000 || u.cacheHitTokens !== 0) {
    throw new Error("selfCheck: parse no-cache");
  }
  const c = parseUsage("deepseek-v4-flash", {
    prompt_tokens: 1000,
    completion_tokens: 0,
    prompt_cache_hit_tokens: 400,
    prompt_cache_miss_tokens: 600,
  });
  if (!c || c.cacheHitTokens !== 400 || c.cacheMissTokens !== 600) {
    throw new Error("selfCheck: parse cache");
  }
}

if (typeof __DEV__ !== "undefined" && __DEV__) selfCheckPricing();
