/** npx tsx src/ai/redactForOnline.check.ts */
import { redactForOnline } from "./redactForOnline";

console.assert(
  redactForOnline("Cartão 4111111111111111 ok") === "Cartão ****1111 ok"
);
console.assert(
  redactForOnline("4111 1111 1111 1111") === "****1111"
);
console.assert(redactForOnline("CPF 529.982.247-25") === "CPF [CPF]");
console.assert(
  redactForOnline("final 1234 McDonald's") === "final 1234 McDonald's"
);
console.log("redactForOnline.check.ts OK");
