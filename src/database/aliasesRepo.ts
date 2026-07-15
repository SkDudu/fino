import { getDb } from "./db";

export type Alias = {
  id: string;
  rawText: string;
  merchant: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  confidence: number;
  createdAt: string;
};

export async function findAlias(rawText: string): Promise<Alias | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    raw_text: string;
    merchant: string | null;
    brand: string | null;
    category: string | null;
    subcategory: string | null;
    confidence: number;
    created_at: string;
  }>(`SELECT * FROM aliases WHERE raw_text = ?`, rawText);
  if (!row) return null;
  return {
    id: row.id,
    rawText: row.raw_text,
    merchant: row.merchant,
    brand: row.brand,
    category: row.category,
    subcategory: row.subcategory,
    confidence: row.confidence,
    createdAt: row.created_at,
  };
}

export async function upsertAlias(input: {
  rawText: string;
  merchant?: string | null;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  confidence: number;
}): Promise<void> {
  const db = await getDb();
  const existing = await findAlias(input.rawText);
  if (existing) {
    await db.runAsync(
      `UPDATE aliases SET merchant = ?, brand = ?, category = ?, subcategory = ?, confidence = ?
       WHERE raw_text = ?`,
      input.merchant ?? null,
      input.brand ?? null,
      input.category ?? null,
      input.subcategory ?? null,
      input.confidence,
      input.rawText
    );
    return;
  }
  await db.runAsync(
    `INSERT INTO aliases (id, raw_text, merchant, brand, category, subcategory, confidence, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input.rawText,
    input.merchant ?? null,
    input.brand ?? null,
    input.category ?? null,
    input.subcategory ?? null,
    input.confidence,
    new Date().toISOString()
  );
}
