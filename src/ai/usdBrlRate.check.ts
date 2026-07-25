/** npx tsx src/ai/usdBrlRate.check.ts */
import { dateYmd, pickCotacaoVenda } from "./usdBrlRate";

const fixture = {
  cotacoes: [
    { cotacao_venda: 5.0747 },
    { cotacao_venda: 5.0744 },
    { cotacao_venda: 5.0666 },
  ],
  moeda: "USD",
  data: "2026-07-24",
};

console.assert(pickCotacaoVenda(fixture) === 5.0666);
console.assert(pickCotacaoVenda({ cotacoes: [] }) === null);
console.assert(pickCotacaoVenda({}) === null);
console.assert(pickCotacaoVenda({ cotacoes: [{ cotacao_venda: 0 }] }) === null);

const fixed = new Date(2026, 6, 25); // local Jul 25 2026
console.assert(dateYmd(0, fixed) === "2026-07-25");
console.assert(dateYmd(1, fixed) === "2026-07-24");
console.assert(dateYmd(2, fixed) === "2026-07-23");

console.log("usdBrlRate.check.ts OK");
