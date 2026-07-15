import {
  applyInsightFilters,
  EMPTY_FILTERS,
  filterCount,
  toggleIn,
  type InsightFilters,
} from "./insightFilters";
import type { Transaction } from "@/types/transaction";

const txs: Transaction[] = [
  {
    id: "1",
    bank: "Nubank",
    packageName: "x",
    type: "pix_sent",
    amount: 50,
    category: "Alimentação",
    description: "a",
    notificationId: "1",
    date: "2026-01-01",
    createdAt: "2026-01-01",
    approved: true,
  },
  {
    id: "2",
    bank: "Inter",
    packageName: "x",
    type: "expense",
    amount: 30,
    category: "Casa",
    description: "b",
    notificationId: "2",
    date: "2026-01-01",
    createdAt: "2026-01-01",
    approved: true,
  },
  {
    id: "3",
    bank: "Nubank",
    packageName: "x",
    type: "pix_received",
    amount: 100,
    category: "PIX",
    description: "c",
    notificationId: "3",
    date: "2026-01-01",
    createdAt: "2026-01-01",
    approved: true,
  },
];

console.assert(filterCount(EMPTY_FILTERS) === 0);
console.assert(applyInsightFilters(txs, EMPTY_FILTERS).length === 2); // expenses only
console.assert(
  applyInsightFilters(txs, {
    ...EMPTY_FILTERS,
    banks: ["Nubank"],
  }).map((t) => t.id).join() === "1"
);
console.assert(
  applyInsightFilters(txs, {
    ...EMPTY_FILTERS,
    types: ["pix_received"],
  }).map((t) => t.id).join() === "3"
);
console.assert(toggleIn(["a"], "b").join() === "a,b");
console.assert(toggleIn(["a", "b"], "a").join() === "b");
console.log("insightFilters ok");
