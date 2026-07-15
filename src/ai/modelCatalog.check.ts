import { listCatalogModels } from "./modelCatalog";
import models from "./models.json";

const base = "https://pub-e98ba9e10ae046ac84ee9a184ee9ff80.r2.dev/";

console.assert(listCatalogModels().length === 2);
console.assert(models[0].id === "qwen3-0.6b");
console.assert(models[0].downloadUrl === `${base}Qwen3-0.6B-Q8_0.gguf`);
console.assert(models[1].id === "qwen2.5-3b");
console.assert(
  models[1].downloadUrl === `${base}qwen2.5-3b-instruct-q4_k_m.gguf`
);

console.log("modelCatalog ok");
