// ponytail: TTL 12h ≈ 2x/dia se o app abrir; cron real só com backend
const TTL_MS = 12 * 60 * 60 * 1000;
const FALLBACK = 5.7;
const KEY_RATE = "usd_brl";
const KEY_FETCHED = "usd_brl_fetched_at";
const WALK_BACK_DAYS = 5;

let rate = FALLBACK;

export function getUsdBrl(): number {
  return rate;
}

export function setUsdBrl(n: number): void {
  if (Number.isFinite(n) && n > 0) rate = n;
}

export type CotacaoDia = {
  cotacoes?: { cotacao_venda?: number }[];
};

/** Last boletim's cotacao_venda, or null if missing/invalid. */
export function pickCotacaoVenda(body: CotacaoDia): number | null {
  const list = body.cotacoes;
  if (!list?.length) return null;
  const v = list[list.length - 1]?.cotacao_venda;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

/** YYYY-MM-DD in local time, optionally shifted by `daysAgo`. */
export function dateYmd(daysAgo = 0, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchRateForDate(ymd: string): Promise<number | null> {
  const res = await fetch(
    `https://brasilapi.com.br/api/cambio/v1/cotacao/USD/${ymd}`
  );
  if (!res.ok) return null;
  const body = (await res.json()) as CotacaoDia;
  return pickCotacaoVenda(body);
}

async function fetchLatestRate(): Promise<number | null> {
  for (let i = 0; i < WALK_BACK_DAYS; i++) {
    try {
      const n = await fetchRateForDate(dateYmd(i));
      if (n != null) return n;
    } catch {
      // try older day
    }
  }
  return null;
}

export async function ensureUsdBrlRate(): Promise<number> {
  const { getSetting, setSetting } = await import("@/database/settingsRepo");
  const cached = await getSetting(KEY_RATE);
  const fetchedAt = await getSetting(KEY_FETCHED);
  const cachedN = cached != null ? Number(cached) : NaN;
  const at = fetchedAt != null ? Number(fetchedAt) : NaN;

  if (Number.isFinite(cachedN) && cachedN > 0) setUsdBrl(cachedN);

  if (Number.isFinite(at) && Date.now() - at < TTL_MS && Number.isFinite(cachedN) && cachedN > 0) {
    return rate;
  }

  const fresh = await fetchLatestRate();
  if (fresh != null) {
    setUsdBrl(fresh);
    await setSetting(KEY_RATE, String(fresh));
    await setSetting(KEY_FETCHED, String(Date.now()));
    return rate;
  }

  // keep cache or FALLBACK already in memory
  return rate;
}
