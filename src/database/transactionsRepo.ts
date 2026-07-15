import { getDb } from "./db";
import type { Transaction, TransactionType } from "@/types/transaction";

export type TransactionFilters = {
  bank?: string;
  category?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
};

type TransactionRow = {
  id: string;
  bank: string;
  package_name: string;
  type: string;
  amount: number;
  merchant: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  payment_method: string | null;
  card_final: string | null;
  description: string;
  notification_id: string;
  date: string;
  approved: number;
  raw_text: string | null;
  ai_confidence: number | null;
  ai_model: string | null;
  ai_version: string | null;
  created_at: string;
};

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    bank: row.bank,
    packageName: row.package_name,
    type: row.type as TransactionType,
    amount: row.amount,
    merchant: row.merchant ?? undefined,
    brand: row.brand ?? undefined,
    category: row.category ?? undefined,
    subcategory: row.subcategory ?? undefined,
    paymentMethod: row.payment_method as Transaction["paymentMethod"],
    cardFinal: row.card_final ?? undefined,
    description: row.description,
    notificationId: row.notification_id,
    date: row.date,
    createdAt: row.created_at,
    approved: row.approved === 1,
    rawText: row.raw_text ?? undefined,
    aiConfidence: row.ai_confidence ?? undefined,
    aiModel: row.ai_model ?? undefined,
    aiVersion: row.ai_version ?? undefined,
  };
}

export async function insertTransaction(tx: Transaction): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO transactions
      (id, bank, package_name, type, amount, merchant, brand, category, subcategory,
       payment_method, card_final, description, notification_id, date, approved,
       raw_text, ai_confidence, ai_model, ai_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    tx.id,
    tx.bank,
    tx.packageName,
    tx.type,
    tx.amount,
    tx.merchant ?? null,
    tx.brand ?? null,
    tx.category ?? null,
    tx.subcategory ?? null,
    tx.paymentMethod ?? null,
    tx.cardFinal ?? null,
    tx.description,
    tx.notificationId,
    tx.date,
    tx.approved ? 1 : 0,
    tx.rawText ?? null,
    tx.aiConfidence ?? null,
    tx.aiModel ?? null,
    tx.aiVersion ?? null,
    tx.createdAt
  );
}

export async function getTransactionById(
  id: string
): Promise<Transaction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE id = ?`,
    id
  );
  return row ? rowToTransaction(row) : null;
}

export async function existsByNotificationId(
  notificationId: string
): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE notification_id = ?`,
    notificationId
  );
  return (row?.count ?? 0) > 0;
}

export async function listTransactions(filters: TransactionFilters = {}) {
  const db = await getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.bank) {
    clauses.push("bank = ?");
    params.push(filters.bank);
  }
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.type) {
    clauses.push("type = ?");
    params.push(filters.type);
  }
  if (filters.from) {
    clauses.push("date >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("date <= ?");
    params.push(filters.to);
  }
  if (filters.search) {
    clauses.push("(merchant LIKE ? OR bank LIKE ? OR description LIKE ? OR CAST(amount AS TEXT) LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filters.limit ? `LIMIT ${filters.limit}` : "";

  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions ${where} ORDER BY date DESC ${limit}`,
    ...params
  );
  return rows.map(rowToTransaction);
}

function todayRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

// ponytail: description hints fix misclassified rows saved before detectType fix
const INCOMING_HINT = `(
  LOWER(description) LIKE '%receb%' OR
  LOWER(description) LIKE '%credit%' OR
  LOWER(description) LIKE '%depósito%' OR
  LOWER(description) LIKE '%deposito%'
)`;

const INCOMING_CONDITION = `(
  type IN ('income', 'pix_received')
  OR (type IN ('transfer', 'expense') AND ${INCOMING_HINT})
)`;

const EXPENSE_CONDITION = `(
  type IN ('expense', 'pix_sent', 'payment', 'withdraw', 'transfer')
  AND NOT ${INCOMING_HINT}
)`;

export async function sumTodayExpenses(): Promise<number> {
  const db = await getDb();
  const { from, to } = todayRange();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE approved = 1 AND ${EXPENSE_CONDITION} AND date >= ? AND date < ?`,
    from,
    to
  );
  return row?.total ?? 0;
}

export async function sumTodayIncome(): Promise<number> {
  const db = await getDb();
  const { from, to } = todayRange();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE approved = 1 AND ${INCOMING_CONDITION} AND date >= ? AND date < ?`,
    from,
    to
  );
  return row?.total ?? 0;
}

export async function countTransactions(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE approved = 1`
  );
  return row?.count ?? 0;
}
