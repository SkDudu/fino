import { BANK_PACKAGES } from "@/constants/banks";
import type { TransactionFilters } from "@/database/transactionsRepo";
import { CATEGORIES } from "@/parsers/categorize";

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function weekRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

const BANKS = [...new Set(Object.values(BANK_PACKAGES))].sort(
  (a, b) => b.length - a.length
);

export function resolveChatFilters(question: string): TransactionFilters {
  const q = fold(question);
  const filters: TransactionFilters = { limit: 10 };

  for (const bank of BANKS) {
    const fb = fold(bank);
    if (q.includes(fb) || (fb.includes(" ") && q.includes(fb.split(" ")[0]))) {
      filters.bank = bank;
      break;
    }
  }

  for (const cat of CATEGORIES) {
    if (q.includes(fold(cat))) {
      filters.category = cat;
      break;
    }
  }

  if (q.includes("mes passado")) {
    Object.assign(filters, monthRange(-1));
  } else if (
    q.includes("este mes") ||
    q.includes("mes atual") ||
    (q.includes("mes") && !q.includes("passado"))
  ) {
    Object.assign(filters, monthRange(0));
  } else if (q.includes("semana")) {
    Object.assign(filters, weekRange());
  } else if (q.includes("hoje")) {
    Object.assign(filters, todayRange());
  }

  return filters;
}

export function describeChatFilters(filters: TransactionFilters): string {
  const parts: string[] = [];
  if (filters.bank) parts.push(`banco=${filters.bank}`);
  if (filters.category) parts.push(`categoria=${filters.category}`);
  if (filters.from || filters.to) {
    const from = filters.from?.slice(0, 10) ?? "?";
    const to = filters.to?.slice(0, 10) ?? "?";
    parts.push(`periodo=${from}..${to}`);
  }
  if (filters.limit) parts.push(`limite=${filters.limit}`);
  return parts.length ? parts.join(", ") : "ultimas aprovadas";
}
