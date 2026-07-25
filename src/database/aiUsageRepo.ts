import type { OnlineModelId } from "@/ai/aiSettings";
import type { TokenUsage } from "@/ai/deepseekPricing";
import { getDb } from "./db";

export type UsageKind = "chat" | "enrich";

export type UsageMonthTotal = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
};

export type UsageByModel = UsageMonthTotal & { model: OnlineModelId };

function monthStartIso(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export async function insertAiUsage(
  usage: TokenUsage,
  kind: UsageKind
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO ai_usage
      (model, kind, prompt_tokens, completion_tokens, cache_hit_tokens, cache_miss_tokens, cost_usd, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    usage.model,
    kind,
    usage.promptTokens,
    usage.completionTokens,
    usage.cacheHitTokens,
    usage.cacheMissTokens,
    usage.costUsd,
    new Date().toISOString()
  );
}

export async function sumUsageMonth(
  since = monthStartIso()
): Promise<UsageMonthTotal> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    prompt: number | null;
    completion: number | null;
    cost: number | null;
  }>(
    `SELECT
       COALESCE(SUM(prompt_tokens), 0) AS prompt,
       COALESCE(SUM(completion_tokens), 0) AS completion,
       COALESCE(SUM(cost_usd), 0) AS cost
     FROM ai_usage WHERE created_at >= ?`,
    since
  );
  const promptTokens = row?.prompt ?? 0;
  const completionTokens = row?.completion ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: row?.cost ?? 0,
  };
}

export async function sumUsageByModelMonth(
  since = monthStartIso()
): Promise<UsageByModel[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    model: string;
    prompt: number;
    completion: number;
    cost: number;
  }>(
    `SELECT model,
       COALESCE(SUM(prompt_tokens), 0) AS prompt,
       COALESCE(SUM(completion_tokens), 0) AS completion,
       COALESCE(SUM(cost_usd), 0) AS cost
     FROM ai_usage WHERE created_at >= ?
     GROUP BY model`,
    since
  );
  return rows.map((r) => ({
    model: (r.model === "deepseek-v4-pro"
      ? "deepseek-v4-pro"
      : "deepseek-v4-flash") as OnlineModelId,
    promptTokens: r.prompt,
    completionTokens: r.completion,
    totalTokens: r.prompt + r.completion,
    costUsd: r.cost,
  }));
}

function todayStartIso(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

/** Today's chat usage — used for swap-model estimate on settings. */
export async function sumChatUsageToday(): Promise<UsageMonthTotal> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    prompt: number | null;
    completion: number | null;
    cost: number | null;
  }>(
    `SELECT
       COALESCE(SUM(prompt_tokens), 0) AS prompt,
       COALESCE(SUM(completion_tokens), 0) AS completion,
       COALESCE(SUM(cost_usd), 0) AS cost
     FROM ai_usage WHERE kind = 'chat' AND created_at >= ?`,
    todayStartIso()
  );
  const promptTokens = row?.prompt ?? 0;
  const completionTokens = row?.completion ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: row?.cost ?? 0,
  };
}
