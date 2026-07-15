import type { Transaction } from "@/types/transaction";

const EXPENSE_TYPES = new Set([
  "expense",
  "pix_sent",
  "payment",
  "withdraw",
  "transfer",
]);

export type SqliteSummary = {
  count: number;
  total: number;
  topMerchants: string[];
  topCategories: string[];
  topBanks: string[];
};

export function summarizeTransactions(txs: Transaction[]): SqliteSummary {
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const merchants = new Map<string, number>();
  const categories = new Map<string, number>();
  const banks = new Map<string, number>();
  for (const t of txs) {
    const m = t.merchant ?? t.description;
    merchants.set(m, (merchants.get(m) ?? 0) + t.amount);
    const c = t.category ?? "Outros";
    categories.set(c, (categories.get(c) ?? 0) + t.amount);
    banks.set(t.bank, (banks.get(t.bank) ?? 0) + t.amount);
  }
  const top = (map: Map<string, number>, n = 3) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
  return {
    count: txs.length,
    total,
    topMerchants: top(merchants),
    topCategories: top(categories),
    topBanks: top(banks),
  };
}

export function isExpenseTx(t: Transaction): boolean {
  return EXPENSE_TYPES.has(t.type);
}

/** Compact context for LLM (Tipo 4). ponytail: max 5 sample rows */
export function buildSummaryContext(
  txs: Transaction[],
  queryHint = ""
): string {
  const s = summarizeTransactions(txs);
  const sample = txs.slice(0, 5).map((t) => ({
    date: t.date.slice(0, 10),
    merchant: t.merchant ?? t.description,
    bank: t.bank,
    amount: t.amount,
    category: t.category ?? null,
  }));
  return [
    `Consulta: ${queryHint || "geral"}`,
    `Total: R$ ${s.total.toFixed(2)} (${s.count} transacoes)`,
    `Top categorias: ${s.topCategories.join(", ") || "—"}`,
    `Top estabelecimentos: ${s.topMerchants.join(", ") || "—"}`,
    `Top bancos: ${s.topBanks.join(", ") || "—"}`,
    `Amostra: ${JSON.stringify(sample)}`,
  ].join("\n");
}

/** Deterministic fallback when inference fails */
export function buildSummaryFallback(
  txs: Transaction[],
  queryHint = ""
): string {
  if (txs.length === 0) {
    return "Nao encontrei transacoes aprovadas para essa consulta.";
  }
  const s = summarizeTransactions(txs);
  const lines = [
    `Resumo (${queryHint || "consulta"}):`,
    `Total: R$ ${s.total.toFixed(2)} em ${s.count} transacao(oes).`,
  ];
  if (s.topCategories.length) {
    lines.push(`Principais categorias: ${s.topCategories.join(", ")}.`);
  }
  if (s.topMerchants.length) {
    lines.push(`Principais estabelecimentos: ${s.topMerchants.join(", ")}.`);
  }
  return lines.join(" ");
}

export function formatTransactionList(txs: Transaction[]): string {
  if (txs.length === 0) return "Nenhuma transacao aprovada encontrada.";
  return txs
    .slice(0, 10)
    .map(
      (t) =>
        `${t.date.slice(0, 10)} · ${t.merchant ?? t.description} · ${t.bank} · R$ ${t.amount.toFixed(2)}`
    )
    .join("\n");
}
