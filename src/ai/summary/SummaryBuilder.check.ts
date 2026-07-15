import { buildSummaryContext, buildSummaryFallback } from "./SummaryBuilder";
import type { Transaction } from "@/types/transaction";

const txs: Transaction[] = [
  {
    id: "1",
    bank: "Nubank",
    packageName: "com.nu",
    type: "expense",
    amount: 50,
    merchant: "Uber",
    category: "Transporte",
    description: "Corrida",
    notificationId: "n1",
    date: "2026-07-14T10:00:00.000Z",
    createdAt: "2026-07-14T10:00:00.000Z",
    approved: true,
  },
];

const ctx = buildSummaryContext(txs, "hoje");
console.assert(ctx.includes("R$ 50.00"));
console.assert(ctx.includes("Uber"));
console.assert(!ctx.includes('"cardFinal"'));

const fb = buildSummaryFallback(txs, "hoje");
console.assert(fb.includes("R$ 50.00"));

console.log("summaryBuilder ok");
