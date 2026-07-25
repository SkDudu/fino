import { getInstalledApps, type InstalledApp } from "notification-listener";

let cache: InstalledApp[] | null = null;

function normalize(raw: unknown): InstalledApp[] {
  if (!Array.isArray(raw)) return [];
  const out: InstalledApp[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const packageName = String(r.packageName ?? r.package_name ?? "").trim();
    const label = String(r.label ?? "").trim() || packageName;
    if (!packageName) continue;
    out.push({ packageName, label });
  }
  return out;
}

/** Sync native query + cache. Call before navigating to choose-apps. */
export function loadInstalledApps(): InstalledApp[] {
  cache = normalize(getInstalledApps());
  return cache;
}

export function peekInstalledApps(): InstalledApp[] | null {
  return cache;
}
