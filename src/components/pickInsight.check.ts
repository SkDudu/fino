import { pickInsight } from "./pickInsight";

console.assert(
  pickInsight({ spent: 0, received: 0 }) ===
    "Converta notificações para ver o ritmo do dia."
);
console.assert(
  pickInsight({ spent: 10, received: 100 }).startsWith("Entrada forte")
);
console.assert(
  pickInsight({ spent: 100, received: 0, trendPct: 35 }).includes("35%")
);
console.assert(
  pickInsight({
    spent: 100,
    received: 0,
    topCategory: { label: "Alimentação", amount: 80 },
  }).startsWith("Alimentação lidera")
);
console.assert(
  pickInsight({ spent: 50, received: 20 }).startsWith("Hoje:")
);
console.log("pickInsight ok");
