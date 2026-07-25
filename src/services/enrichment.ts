import { enrichFromText, getActiveModel, isAiReady } from "@/ai/AIService";
import { getAiMode, getOnlineModel } from "@/ai/aiSettings";
import { insertAiLog } from "@/database/aiLogsRepo";
import { insertAiUsage } from "@/database/aiUsageRepo";
import { findAlias, upsertAlias } from "@/database/aliasesRepo";
import { categorize } from "@/parsers/categorize";
import type { Transaction } from "@/types/transaction";
import { aliasKey } from "./enrichmentHelpers";

export { aliasKey, confidenceLevel, needsReview } from "./enrichmentHelpers";

/** Enrich after parser. Alias → IA (online/local) → deterministic categorize. */
export async function enrichTransaction(
  tx: Transaction,
  rawText: string
): Promise<Transaction> {
  const key = aliasKey(rawText);
  const t0 = Date.now();

  const alias = await findAlias(key);
  if (alias) {
    await insertAiLog({
      notificationId: tx.notificationId,
      model: "alias",
      modelVersion: "1",
      runtime: "sqlite",
      executionTime: Date.now() - t0,
      confidence: alias.confidence,
      usedAlias: true,
    });
    return {
      ...tx,
      merchant: alias.merchant ?? tx.merchant,
      brand: alias.brand ?? undefined,
      category: alias.category ?? tx.category,
      subcategory: alias.subcategory ?? undefined,
      rawText: key,
      aiConfidence: alias.confidence,
      aiModel: "alias",
      aiVersion: "1",
    };
  }

  // ponytail: gate on isAiReady (online key | local GGUF), not isModelInstalled
  if (await isAiReady()) {
    const result = await enrichFromText(rawText);
    if (result) {
      const { json: ai, usage } = result;
      const mode = await getAiMode();
      const modelId =
        mode === "online" ? await getOnlineModel() : (await getActiveModel()).id;
      if (usage) void insertAiUsage(usage, "enrich").catch(() => {});
      await insertAiLog({
        notificationId: tx.notificationId,
        model: modelId,
        modelVersion: "1",
        runtime: mode === "online" ? "deepseek" : "llama.cpp",
        executionTime: Date.now() - t0,
        confidence: ai.confidence,
        tokens: usage?.totalTokens,
        usedAlias: false,
      });
      return {
        ...tx,
        merchant: ai.merchant,
        brand: ai.brand,
        category: ai.category,
        subcategory: ai.subcategory,
        rawText: key,
        aiConfidence: ai.confidence,
        aiModel: modelId,
        aiVersion: "1",
      };
    }
  }

  const category = tx.category ?? categorize(rawText, tx.type);
  const confidence = category === "Outros" ? 0.4 : 0.85;
  await insertAiLog({
    notificationId: tx.notificationId,
    model: "deterministic",
    modelVersion: "1",
    runtime: "js",
    executionTime: Date.now() - t0,
    confidence,
    usedAlias: false,
  });

  return {
    ...tx,
    brand: tx.merchant,
    category,
    rawText: key,
    aiConfidence: confidence,
    aiModel: "deterministic",
    aiVersion: "1",
  };
}

/** Learn from approved / corrected enrichment fields. */
export async function learnFromTransaction(tx: Transaction): Promise<void> {
  const key = tx.rawText ?? aliasKey(tx.description);
  if (!key) return;
  await upsertAlias({
    rawText: key,
    merchant: tx.merchant ?? null,
    brand: tx.brand ?? tx.merchant ?? null,
    category: tx.category ?? null,
    subcategory: tx.subcategory ?? null,
    confidence: Math.max(tx.aiConfidence ?? 0.9, 0.9),
  });
}
