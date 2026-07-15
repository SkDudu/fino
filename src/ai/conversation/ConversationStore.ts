import type {
  ConversationMemory,
  ConversationTxSnapshot,
} from "./ConversationTypes";
import type { Transaction } from "@/types/transaction";

export const CONVERSATION_TTL_MS = 10 * 60 * 1000;

let memory: ConversationMemory | null = null;

export function getMemory(): ConversationMemory | null {
  if (!memory) return null;
  if (Date.now() - memory.timestamp > CONVERSATION_TTL_MS) {
    memory = null;
    return null;
  }
  return memory;
}

export function startConversation(): ConversationMemory {
  memory = {
    conversationId: `c-${Date.now()}`,
    lastIntent: "general",
    lastQuestion: "",
    lastResponse: "",
    lastEntities: {
      transactionIds: [],
      merchants: [],
      banks: [],
      categories: [],
      amounts: [],
    },
    lastTransactions: [],
    timestamp: Date.now(),
  };
  return memory;
}

export function clearConversation(): void {
  memory = null;
}

export function expireConversation(): void {
  clearConversation();
}

export function txToSnapshot(t: Transaction): ConversationTxSnapshot {
  return {
    id: t.id,
    bank: t.bank,
    merchant: t.merchant ?? t.description,
    amount: t.amount,
    category: t.category,
    paymentMethod: t.paymentMethod,
    brand: t.brand,
    date: t.date.slice(0, 10),
  };
}

export function updateDirectReply(question: string, answer: string): void {
  const m = getMemory();
  if (!m) return;
  m.lastQuestion = question;
  m.lastResponse = answer;
  m.timestamp = Date.now();
}

export function updateMemory(partial: {
  lastIntent: string;
  lastQuestion: string;
  lastResponse: string;
  lastQuery?: string;
  txs: Transaction[];
}): ConversationMemory {
  const snaps = partial.txs.map(txToSnapshot);
  const m = getMemory() ?? startConversation();
  m.lastIntent = partial.lastIntent;
  m.lastQuestion = partial.lastQuestion;
  m.lastResponse = partial.lastResponse;
  m.lastQuery = partial.lastQuery;
  m.lastEntities = {
    transactionIds: snaps.map((s) => s.id),
    merchants: [...new Set(snaps.map((s) => s.merchant))],
    banks: [...new Set(snaps.map((s) => s.bank))],
    categories: [
      ...new Set(snaps.map((s) => s.category).filter(Boolean) as string[]),
    ],
    amounts: snaps.map((s) => s.amount),
  };
  m.lastTransactions = snaps;
  m.timestamp = Date.now();
  memory = m;
  return m;
}
