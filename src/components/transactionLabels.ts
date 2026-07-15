import type { PaymentMethod, TransactionType } from "@/types/transaction";

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Despesa",
  income: "Receita",
  pix_sent: "PIX enviado",
  pix_received: "PIX recebido",
  transfer: "Transferência",
  payment: "Pagamento",
  withdraw: "Saque",
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  pix: "PIX",
  cash: "Dinheiro",
  transfer: "Transferência",
};

export function transactionTypeLabel(type: TransactionType): string {
  return TYPE_LABELS[type];
}

export function paymentMethodLabel(method?: PaymentMethod): string {
  return method ? PAYMENT_LABELS[method] : "—";
}
