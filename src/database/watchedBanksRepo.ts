import { setWatchedPackages } from "notification-listener";
import { getDb } from "./db";

export type WatchedBank = {
  packageName: string;
  label: string;
  createdAt: string;
};

async function syncNative(): Promise<void> {
  const rows = await listWatchedBanks();
  setWatchedPackages(rows.map((r) => r.packageName));
}

export async function listWatchedBanks(): Promise<WatchedBank[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    package_name: string;
    label: string;
    created_at: string;
  }>(`SELECT package_name, label, created_at FROM watched_banks ORDER BY label COLLATE NOCASE`);
  return rows.map((r) => ({
    packageName: r.package_name,
    label: r.label,
    createdAt: r.created_at,
  }));
}

export async function countWatchedBanks(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM watched_banks`
  );
  return row?.n ?? 0;
}

export async function isWatchedPackage(packageName: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ package_name: string }>(
    `SELECT package_name FROM watched_banks WHERE package_name = ?`,
    packageName
  );
  return !!row;
}

export async function replaceWatchedBanks(
  banks: { packageName: string; label: string }[]
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM watched_banks`);
    for (const b of banks) {
      await db.runAsync(
        `INSERT INTO watched_banks (package_name, label, created_at) VALUES (?, ?, ?)`,
        b.packageName,
        b.label,
        now
      );
    }
  });
  // ponytail: SQLite is source of truth; native filter retries on boot if this throws
  try {
    await syncNative();
  } catch {
    /* ignore */
  }
}

export async function removeWatchedBank(packageName: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM watched_banks WHERE package_name = ?`, packageName);
  await syncNative();
}

/** Call once after initDb so native filter matches SQLite. */
export async function syncWatchedToNative(): Promise<void> {
  await syncNative();
}
