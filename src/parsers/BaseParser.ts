import { bankNameFromPackage } from "@/constants/banks";
import type { NotificationData } from "@/types/notification";
import type {
  PaymentMethod,
  Transaction,
  TransactionType,
} from "@/types/transaction";
import { categorize } from "./categorize";
import type { NotificationParser } from "./types";

const AMOUNT_RE = /R\$\s?([\d.]+,\d{2})/i;
const CARD_FINAL_RE = /final\s*(\d{4})/i;

export function parseAmount(text: string): number | null {
  const match = text.match(AMOUNT_RE);
  if (!match) return null;
  const normalized = match[1].replace(/\./g, "").replace(",", ".");
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseCardFinal(text: string): string | undefined {
  return text.match(CARD_FINAL_RE)?.[1];
}

export function fullText(notification: NotificationData): string {
  return [notification.title, notification.text, notification.subText]
    .filter(Boolean)
    .join("\n");
}

export function hasFinancialContent(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    AMOUNT_RE.test(text) ||
    /\bpix\b/.test(lower) ||
    /\bted\b/.test(lower) ||
    /compra|pagamento|transferência|transferencia|saque|depósito|deposito/.test(
      lower
    )
  );
}

export function detectType(text: string): TransactionType {
  const lower = text.toLowerCase();

  if (
    /pix\s*(enviado|realizado|feito)|você enviou|enviou um pix|enviou pix/.test(
      lower
    )
  ) {
    return "pix_sent";
  }
  if (
    /transferência enviada|transferencia enviada|ted enviado|você enviou|enviou.*transfer/.test(
      lower
    )
  ) {
    return "transfer";
  }

  if (
    /pix\s*(recebido|recebida|creditado|creditada)|você recebeu.*pix|pix recebid/.test(
      lower
    )
  ) {
    return "pix_received";
  }
  if (
    /transferência recebida|transferencia recebida|ted recebid|você recebeu|recebeu.*transfer|transferência creditada|transferencia creditada/.test(
      lower
    )
  ) {
    return "income";
  }

  if (/\bted\b/.test(lower)) {
    return /enviad|enviou/.test(lower) ? "transfer" : "income";
  }

  if (/saque/.test(lower)) return "withdraw";
  if (/pagamento|boleto/.test(lower)) return "payment";
  if (/recebid[oa]|creditad[oa]|depósito|deposito|salário|salario|recebeu/.test(lower)) {
    return "income";
  }

  if (/transferência|transferencia/.test(lower)) {
    return /enviad|enviou/.test(lower) ? "transfer" : "income";
  }

  return "expense";
}

export function detectPaymentMethod(text: string): PaymentMethod | undefined {
  const lower = text.toLowerCase();
  if (/\bpix\b/.test(lower)) return "pix";
  if (/cartão de crédito|cartao de credito|crédito|credito|final\s*\d{4}/.test(lower)) {
    return "credit_card";
  }
  if (/débito|debito/.test(lower)) return "debit_card";
  if (/\bted\b|transferência|transferencia/.test(lower)) return "transfer";
  return undefined;
}

export function extractMerchant(text: string, title: string): string | undefined {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (AMOUNT_RE.test(line)) continue;
    if (/cartão|cartao|final|pix|ted|compra|aprovada|pagamento/i.test(line)) {
      continue;
    }
    if (line.length > 2 && line !== title) return line;
  }
  return title || undefined;
}

export function newTransactionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildTransaction(
  notification: NotificationData,
  overrides: Partial<Transaction> & {
    type: TransactionType;
    amount: number;
    description: string;
  }
): Transaction {
  const text = fullText(notification);
  const type = overrides.type;
  const merchant = overrides.merchant ?? extractMerchant(text, notification.title);

  return {
    id: overrides.id ?? newTransactionId(),
    bank: overrides.bank ?? bankNameFromPackage(notification.packageName),
    packageName: notification.packageName,
    type,
    amount: overrides.amount,
    merchant,
    category: overrides.category ?? categorize(text, type),
    paymentMethod: overrides.paymentMethod ?? detectPaymentMethod(text),
    cardFinal: overrides.cardFinal ?? parseCardFinal(text),
    description: overrides.description,
    notificationId: notification.id,
    date: overrides.date ?? new Date(notification.timestamp).toISOString(),
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    approved: false,
  };
}

export abstract class BaseParser implements NotificationParser {
  abstract bank: string;
  abstract packageNames: string[];

  canParse(notification: NotificationData): boolean {
    if (!this.packageNames.includes(notification.packageName)) return false;
    return hasFinancialContent(fullText(notification));
  }

  abstract parse(notification: NotificationData): Transaction | null;

  protected parseStandard(notification: NotificationData): Transaction | null {
    const text = fullText(notification);
    const amount = parseAmount(text);
    if (!amount || amount <= 0) return null;

    const type = detectType(text);
    return buildTransaction(notification, {
      type,
      amount,
      description: notification.title || notification.text || text.slice(0, 120),
    });
  }
}
