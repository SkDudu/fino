import { fillTemplate } from "./builders/PromptTemplates";
import categories from "./context/rules/categories.json";

console.assert(categories.includes("Alimentação"));
console.assert(
  fillTemplate("Olá {{name}}", { name: "Fino" }) === "Olá Fino"
);

console.log("contextSystem ok");
