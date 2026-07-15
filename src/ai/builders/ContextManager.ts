import { listTransactions } from "@/database/transactionsRepo";
import type { Transaction } from "@/types/transaction";
import { formatChatContext } from "../chatContextFormat";
import {
  describeChatFilters,
  resolveChatFilters,
} from "../resolveChatFilters";
import { initPromptLoader } from "./PromptLoader";
import { summarizeTransactions, type SqliteSummary } from "../summary/SummaryBuilder";

export type { SqliteSummary };

export function initContextManager(): void {
  initPromptLoader();
}

export async function loadSQLiteContext(
  question: string
): Promise<{ text: string; txs: Transaction[]; queryHint: string }> {
  const filters = resolveChatFilters(question);
  const txs = (await listTransactions(filters)).filter((t) => t.approved);
  const queryHint = describeChatFilters(filters);
  return { text: formatChatContext(txs, queryHint), txs, queryHint };
}

export { summarizeTransactions };

export async function buildContext(question: string): Promise<string> {
  const { text } = await loadSQLiteContext(question);
  return text;
}
