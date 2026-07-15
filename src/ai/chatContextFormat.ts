import type { Transaction } from "@/types/transaction";

function rowJson(t: Transaction): string {
  // ponytail: sem rawText — estoura n_ctx; add campo quando pergunta pedir notificacao crua
  return JSON.stringify({
    date: t.date.slice(0, 10),
    bank: t.bank,
    type: t.type,
    amount: t.amount,
    merchant: t.merchant ?? null,
    brand: t.brand ?? null,
    category: t.category ?? null,
    subcategory: t.subcategory ?? null,
    paymentMethod: t.paymentMethod ?? null,
    cardFinal: t.cardFinal ?? null,
    description: t.description,
  });
}

export function formatChatContext(
  txs: Transaction[],
  queryHint = "ultimas aprovadas"
): string {
  if (txs.length === 0) {
    return `Consulta: ${queryHint}\nNenhuma transacao aprovada encontrada.`;
  }

  const total = txs.reduce((s, t) => s + t.amount, 0);
  const byCat = new Map<string, number>();
  const byBank = new Map<string, number>();
  for (const t of txs) {
    const c = t.category ?? "Outros";
    byCat.set(c, (byCat.get(c) ?? 0) + t.amount);
    byBank.set(t.bank, (byBank.get(t.bank) ?? 0) + t.amount);
  }

  const cats = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => `${c}: R$ ${v.toFixed(2)}`)
    .join("\n");
  const banks = [...byBank.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([b, v]) => `${b}: R$ ${v.toFixed(2)}`)
    .join("\n");

  const rows = txs.map(rowJson).join("\n");

  return `Consulta: ${queryHint}
${txs.length} transacoes — total: R$ ${total.toFixed(2)}
Por banco:
${banks}
Por categoria:
${cats}

Transacoes:
${rows}`;
}
