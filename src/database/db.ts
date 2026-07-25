import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  app_name TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  sub_text TEXT,
  timestamp INTEGER NOT NULL,
  parsed INTEGER NOT NULL DEFAULT 0,
  discarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  bank TEXT NOT NULL,
  package_name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  merchant TEXT,
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  payment_method TEXT,
  card_final TEXT,
  description TEXT NOT NULL,
  notification_id TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  raw_text TEXT,
  ai_confidence REAL,
  ai_model TEXT,
  ai_version TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aliases (
  id TEXT PRIMARY KEY,
  raw_text TEXT NOT NULL UNIQUE,
  merchant TEXT,
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  confidence REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id TEXT,
  model TEXT,
  model_version TEXT,
  runtime TEXT,
  execution_time REAL,
  confidence REAL,
  tokens INTEGER,
  used_alias INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parser_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id TEXT,
  parser TEXT,
  duration_ms REAL,
  success INTEGER NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watched_banks (
  package_name TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  messages TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL,
  kind TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  cache_hit_tokens INTEGER NOT NULL DEFAULT 0,
  cache_miss_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL,
  created_at TEXT NOT NULL
);
`;

const TX_COLUMNS: [string, string][] = [
  ["brand", "TEXT"],
  ["subcategory", "TEXT"],
  ["raw_text", "TEXT"],
  ["ai_confidence", "REAL"],
  ["ai_model", "TEXT"],
  ["ai_version", "TEXT"],
];

async function migrate(database: SQLite.SQLiteDatabase) {
  const cols = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(transactions)`
  );
  const names = new Set(cols.map((c) => c.name));
  for (const [col, type] of TX_COLUMNS) {
    if (!names.has(col)) {
      await database.execAsync(
        `ALTER TABLE transactions ADD COLUMN ${col} ${type}`
      );
    }
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("fino.db");
    await db.execAsync(SCHEMA);
    await migrate(db);
  }
  return db;
}

export async function initDb(): Promise<void> {
  await getDb();
}
