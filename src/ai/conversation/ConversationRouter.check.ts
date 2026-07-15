import { planQuestion } from "../planner/plannerRules";
import { startConversation, updateMemory } from "./ConversationStore";
import type { Transaction } from "@/types/transaction";

const mem = startConversation();
updateMemory({
  lastIntent: "expenses_today",
  lastQuestion: "O que foi gasto hoje?",
  lastResponse: "Compra na Padaria Central.",
  lastQuery: "hoje",
  txs: [
    {
      id: "t1",
      bank: "Nubank",
      packageName: "com.nu",
      type: "expense",
      amount: 20,
      merchant: "Padaria Central",
      category: "Alimentação",
      description: "Compra",
      notificationId: "n1",
      date: "2026-07-14T10:00:00.000Z",
      createdAt: "2026-07-14T10:00:00.000Z",
      approved: true,
    } as Transaction,
  ],
});

const direct = planQuestion("qual banco foi?");
console.assert(direct.kind === "memory");
if (direct.kind === "memory") {
  console.assert(direct.answer.includes("Nubank"));
}

const sumPlan = planQuestion("quanto gastei este mes?");
console.assert(sumPlan.kind === "sql_sum");

console.log("conversationRouter ok");
