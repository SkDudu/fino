import {
  aliasKey,
  confidenceLevel,
  needsReview,
} from "../services/enrichmentHelpers";
import { parseEnrichmentJson } from "./parseEnrichment";

console.assert(aliasKey("  A  B  ") === "a b");
console.assert(confidenceLevel(0.99) === "very_high");
console.assert(needsReview(0.4) === true);

const ok = parseEnrichmentJson(
  `{"merchant":"McDonald's","brand":"McDonald's","category":"Alimentação","subcategory":"Fast Food","confidence":0.99}`
);
console.assert(ok?.category === "Alimentação");
console.assert(ok?.confidence === 0.99);

console.assert(
  parseEnrichmentJson(`{"merchant":"x","category":"Food","confidence":0.9}`)
    ?.category === "Alimentação"
);
console.assert(
  parseEnrichmentJson(`{"merchant":"x","category":"Alimentacao","confidence":"90"}`)
    ?.confidence === 0.9
);
console.assert(
  parseEnrichmentJson(`here is json {"merchant":"Padaria","brand":"Padaria","category":"Alimentação","subcategory":"Café","confidence":0.8}`)
    ?.merchant === "Padaria"
);
console.assert(
  parseEnrichmentJson(
    `<think>raciocinio longo</think>\n{"merchant":"Uber","brand":"Uber","category":"Transporte","subcategory":"App","confidence":0.91}`
  )?.merchant === "Uber"
);
console.assert(
  parseEnrichmentJson(
    `<think>ainda pensando\n{"merchant":"Pix","brand":"Pix","category":"Transferência","subcategory":"PIX","confidence":0.8}`
  )?.merchant === "Pix"
);
console.log("ai parseEnrichment ok");
