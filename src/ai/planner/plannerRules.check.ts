import { planQuestion } from "./plannerRules";

const sum = planQuestion("quanto gastei hoje?");
console.assert(sum.kind === "sql_sum");
if (sum.kind === "sql_sum") {
  console.assert(sum.metric === "expense" && sum.period === "today");
}

const list = planQuestion("liste meus gastos de hoje");
console.assert(list.kind === "sql_list");

const llm = planQuestion("como posso economizar?");
console.assert(llm.kind === "llm");

console.log("plannerRules ok");
