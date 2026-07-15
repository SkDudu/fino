import { formatChatContext } from "./chatContextFormat";
import type { Transaction } from "@/types/transaction";

const sample: Transaction[] = [
  {
    id: "1",
    bank: "Nubank",
    packageName: "com.nu",
    type: "expense",
    amount: 53.9,
    merchant: "McDonald's",
    category: "Alimentação",
    description: "Compra",
    notificationId: "n1",
    date: "2026-07-10T12:00:00.000Z",
    createdAt: "2026-07-10T12:00:00.000Z",
    approved: true,
  },
];

const ctx = formatChatContext(sample, "banco=Nubank");
console.assert(ctx.includes("R$ 53.90"));
console.assert(ctx.includes("Alimentação"));
console.assert(ctx.includes('"bank":"Nubank"'));
console.assert(
  formatChatContext([], "teste").includes("Nenhuma transacao aprovada encontrada")
);
console.log("chatContextFormat ok");
