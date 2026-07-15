import { describeChatFilters, resolveChatFilters } from "./resolveChatFilters";

const nubank = resolveChatFilters("gastos no Nubank este mes");
console.assert(nubank.bank === "Nubank");
console.assert(nubank.from !== undefined);

const food = resolveChatFilters("meta de alimentacao");
console.assert(food.category === "Alimentação");

const week = resolveChatFilters("resumo da semana");
console.assert(week.from !== undefined);

console.assert(describeChatFilters(nubank).includes("Nubank"));
console.log("resolveChatFilters ok");
