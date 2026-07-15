import type { NotificationData } from "@/types/notification";
import type { Transaction } from "@/types/transaction";

export interface NotificationParser {
  bank: string;
  packageNames: string[];
  canParse(notification: NotificationData): boolean;
  parse(notification: NotificationData): Transaction | null;
}

export type ParseResult = {
  transaction: Transaction | null;
  parser: string | null;
  durationMs: number;
  error?: string;
};
