import { getDb } from "./db";
import type { NotificationData } from "@/types/notification";

export type NotificationFilters = {
  bank?: string;
  from?: number;
  to?: number;
  search?: string;
  discarded?: boolean;
  parsed?: boolean;
  limit?: number;
};

type NotificationRow = {
  id: string;
  package_name: string;
  app_name: string;
  title: string;
  text: string;
  sub_text: string | null;
  timestamp: number;
  parsed: number;
  discarded: number;
  created_at: string;
};

function rowToNotification(row: NotificationRow): NotificationData & {
  parsed: boolean;
  discarded: boolean;
  createdAt: string;
} {
  return {
    id: row.id,
    packageName: row.package_name,
    appName: row.app_name,
    title: row.title,
    text: row.text,
    subText: row.sub_text ?? undefined,
    timestamp: row.timestamp,
    parsed: row.parsed === 1,
    discarded: row.discarded === 1,
    createdAt: row.created_at,
  };
}

export async function insertNotification(
  notification: NotificationData
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO notifications
      (id, package_name, app_name, title, text, sub_text, timestamp, parsed, discarded, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    notification.id,
    notification.packageName,
    notification.appName,
    notification.title,
    notification.text,
    notification.subText ?? null,
    notification.timestamp,
    new Date().toISOString()
  );
}

export async function markParsed(notificationId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE notifications SET parsed = 1 WHERE id = ?`, notificationId);
}

export async function markDiscarded(notificationId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE notifications SET discarded = 1 WHERE id = ?`,
    notificationId
  );
}

export async function listNotifications(filters: NotificationFilters = {}) {
  const db = await getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.discarded !== undefined) {
    clauses.push("discarded = ?");
    params.push(filters.discarded ? 1 : 0);
  }
  if (filters.parsed !== undefined) {
    clauses.push("parsed = ?");
    params.push(filters.parsed ? 1 : 0);
  }
  if (filters.bank) {
    clauses.push("app_name = ?");
    params.push(filters.bank);
  }
  if (filters.from) {
    clauses.push("timestamp >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("timestamp <= ?");
    params.push(filters.to);
  }
  if (filters.search) {
    clauses.push(
      "(title LIKE ? OR text LIKE ? OR app_name LIKE ? OR sub_text LIKE ?)"
    );
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filters.limit ? `LIMIT ${filters.limit}` : "";

  const rows = await db.getAllAsync<NotificationRow>(
    `SELECT * FROM notifications ${where} ORDER BY timestamp DESC ${limit}`,
    ...params
  );
  return rows.map(rowToNotification);
}

export async function getNotificationById(id: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<NotificationRow>(
    `SELECT * FROM notifications WHERE id = ?`,
    id
  );
  return row ? rowToNotification(row) : null;
}

export async function countNotifications(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM notifications`
  );
  return row?.count ?? 0;
}
