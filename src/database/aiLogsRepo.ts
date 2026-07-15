import { getDb } from "./db";

export async function insertAiLog(input: {
  notificationId?: string;
  model?: string;
  modelVersion?: string;
  runtime?: string;
  executionTime?: number;
  confidence?: number;
  tokens?: number;
  usedAlias: boolean;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO ai_logs
      (notification_id, model, model_version, runtime, execution_time, confidence, tokens, used_alias, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.notificationId ?? null,
    input.model ?? null,
    input.modelVersion ?? null,
    input.runtime ?? null,
    input.executionTime ?? null,
    input.confidence ?? null,
    input.tokens ?? null,
    input.usedAlias ? 1 : 0,
    new Date().toISOString()
  );
}
