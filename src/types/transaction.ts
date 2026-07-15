export type TransactionType =
  | "expense"
  | "income"
  | "pix_sent"
  | "pix_received"
  | "transfer"
  | "payment"
  | "withdraw";

export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "pix"
  | "cash"
  | "transfer";

export interface Transaction {
  id: string;
  bank: string;
  packageName: string;
  type: TransactionType;
  amount: number;
  merchant?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  paymentMethod?: PaymentMethod;
  cardFinal?: string;
  description: string;
  notificationId: string;
  date: string;
  createdAt: string;
  approved: boolean;
  rawText?: string;
  aiConfidence?: number;
  aiModel?: string;
  aiVersion?: string;
}
