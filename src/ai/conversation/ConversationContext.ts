import type { ConversationMemory } from "./ConversationTypes";

export function buildConversationBlock(mem: ConversationMemory): string {
  const tx = mem.lastTransactions[0];
  const lines = [
    `Pergunta anterior: ${mem.lastQuestion}`,
    `Resposta anterior: ${mem.lastResponse}`,
  ];
  if (tx) {
    lines.push(
      `Transação em foco: ${tx.merchant} — R$ ${tx.amount.toFixed(2)} — ${tx.bank} — ${tx.category ?? "sem categoria"}`
    );
  }
  if (mem.lastEntities.banks.length) {
    lines.push(`Bancos: ${mem.lastEntities.banks.join(", ")}`);
  }
  if (mem.lastEntities.merchants.length) {
    lines.push(`Estabelecimentos: ${mem.lastEntities.merchants.join(", ")}`);
  }
  return lines.join("\n");
}
