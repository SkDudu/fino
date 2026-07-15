import { getDb } from "@/database/db";
import type { ParseResult } from "@/parsers/types";

const SLOW_MS = 100;

export async function logParserResult(
  notificationId: string,
  result: ParseResult
): Promise<void> {
  if (__DEV__ && result.durationMs > SLOW_MS) {
    console.warn(
      `[parser] slow: ${result.parser ?? "none"} ${result.durationMs.toFixed(1)}ms`
    );
  }

  if (__DEV__ && result.error) {
    console.log(`[parser] ${result.parser ?? "none"}: ${result.error}`);
  }

  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO parser_logs (notification_id, parser, duration_ms, success, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      notificationId,
      result.parser,
      result.durationMs,
      result.transaction ? 1 : 0,
      result.error ?? null,
      new Date().toISOString()
    );
  } catch {
    // ponytail: logging must not break pipeline
  }
}
