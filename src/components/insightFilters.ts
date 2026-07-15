import type { Transaction, TransactionType } from "@/types/transaction";

export type InsightFilters = {
  categories: string[];
  banks: string[];
  types: TransactionType[];
};

export const EMPTY_FILTERS: InsightFilters = {
  categories: [],
  banks: [],
  types: [],
};

export const FILTER_TYPES: TransactionType[] = [
  "pix_sent",
  "pix_received",
  "expense",
  "transfer",
];

export function filterCount(f: InsightFilters) {
  return f.categories.length + f.banks.length + f.types.length;
}

export function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function isExpense(tx: Transaction) {
  return !(tx.type === "income" || tx.type === "pix_received");
}

// ponytail: AND across dimensions; empty dimension = all
export function applyInsightFilters(
  txs: Transaction[],
  f: InsightFilters
): Transaction[] {
  const matched = txs.filter((tx) => {
    if (
      f.categories.length &&
      !f.categories.includes(tx.category || "Outros")
    )
      return false;
    if (f.banks.length && !f.banks.includes(tx.bank)) return false;
    if (f.types.length && !f.types.includes(tx.type)) return false;
    return true;
  });
  return f.types.length ? matched : matched.filter(isExpense);
}
