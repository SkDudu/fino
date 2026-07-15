import {
  aliasKey,
  confidenceLevel,
  needsReview,
} from "./enrichmentHelpers";

console.assert(aliasKey("  McDonald's  PIX  ") === "mcdonald's pix");
console.assert(confidenceLevel(0.99) === "very_high");
console.assert(confidenceLevel(0.8) === "medium");
console.assert(confidenceLevel(0.4) === "unknown");
console.assert(needsReview(0.4) === true);
console.assert(needsReview(0.9) === false);
console.log("enrichment ok");
