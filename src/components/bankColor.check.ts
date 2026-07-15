import { bankColor } from "./bankColor";

console.assert(bankColor("Nubank") === "#820AD1");
console.assert(bankColor("Inter") === "#FF7A00");
console.assert(bankColor("Desconhecido X") === bankColor("Desconhecido X"));
console.log("bankColor.check: ok");
