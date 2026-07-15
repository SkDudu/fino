import {
  listTransactions,
  sumTodayExpenses,
  sumTodayIncome,
} from "@/database/transactionsRepo";
import type { Transaction } from "@/types/transaction";
import { describeChatFilters, resolveChatFilters } from "../resolveChatFilters";
import {
  formatTransactionList,
  isExpenseTx,
} from "../summary/SummaryBuilder";
import type { SqlPeriod } from "./plannerRules";

function periodLabel(p: SqlPeriod): string {
  if (p === "today") return "hoje";
  if (p === "week") return "esta semana";
  return "este mes";
}

async function txsForPeriod(
  question: string,
  period: SqlPeriod
): Promise<Transaction[]> {
  const filters = resolveChatFilters(question);
  if (period === "today") {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filters.from = start.toISOString();
    filters.to = end.toISOString();
  } else if (period === "week") {
    /* resolveChatFilters ja cobre semana */
  }
  filters.limit = 200;
  return (await listTransactions(filters)).filter((t) => t.approved);
}

export async function executeSqlSum(
  question: string,
  metric: "expense" | "income" | "pix_count",
  period: SqlPeriod
): Promise<{ answer: string; txs: Transaction[]; queryHint: string }> {
  const label = periodLabel(period);
  const queryHint = `${metric} ${label}`;

  if (metric === "expense" && period === "today") {
    const total = await sumTodayExpenses();
    const txs = await txsForPeriod(question, period);
    return {
      answer: `Voce gastou R$ ${total.toFixed(2)} hoje.`,
      txs: txs.filter(isExpenseTx),
      queryHint,
    };
  }

  if (metric === "income" && period === "today") {
    const total = await sumTodayIncome();
    const txs = await txsForPeriod(question, period);
    return {
      answer: `Voce recebeu R$ ${total.toFixed(2)} hoje.`,
      txs,
      queryHint,
    };
  }

  const txs = await txsForPeriod(question, period);

  if (metric === "pix_count") {
    const pix = txs.filter((t) => t.type === "pix_sent");
    return {
      answer: `Voce fez ${pix.length} PIX ${label}.`,
      txs: pix,
      queryHint,
    };
  }

  if (metric === "income") {
    const income = txs.filter(
      (t) => t.type === "income" || t.type === "pix_received"
    );
    const total = income.reduce((s, t) => s + t.amount, 0);
    return {
      answer: `Voce recebeu R$ ${total.toFixed(2)} ${label}.`,
      txs: income,
      queryHint,
    };
  }

  const expenses = txs.filter(isExpenseTx);
  const total = expenses.reduce((s, t) => s + t.amount, 0);
  return {
    answer: `Voce gastou R$ ${total.toFixed(2)} ${label}.`,
    txs: expenses,
    queryHint,
  };
}

export async function executeSqlList(
  question: string
): Promise<{ answer: string; txs: Transaction[]; queryHint: string }> {
  const filters = resolveChatFilters(question);
  filters.limit = 10;
  const txs = (await listTransactions(filters)).filter((t) => t.approved);
  const queryHint = describeChatFilters(filters);
  const list = formatTransactionList(txs);
  return {
    answer: txs.length ? list : "Nenhuma transacao aprovada encontrada.",
    txs,
    queryHint,
  };
}
