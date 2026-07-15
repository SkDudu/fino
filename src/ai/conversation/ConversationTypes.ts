import type { Transaction } from "@/types/transaction";

export type ConversationEntities = {
  transactionIds: string[];
  merchants: string[];
  banks: string[];
  categories: string[];
  amounts: number[];
};

export type ConversationTxSnapshot = {
  id: string;
  bank: string;
  merchant: string;
  amount: number;
  category?: string;
  paymentMethod?: string;
  brand?: string;
  date: string;
};

export type ConversationMemory = {
  conversationId: string;
  lastIntent: string;
  lastQuestion: string;
  lastResponse: string;
  lastQuery?: string;
  lastEntities: ConversationEntities;
  lastTransactions: ConversationTxSnapshot[];
  timestamp: number;
};

export type ChatIntent =
  | "expenses_today"
  | "expenses_week"
  | "expenses_month"
  | "merchant_detail"
  | "bank_detail"
  | "category_detail"
  | "summary"
  | "advice"
  | "general";

export type RouteResult =
  | { kind: "direct"; answer: string }
  | {
      kind: "infer";
      intent: ChatIntent;
      conversationBlock: string;
    };
