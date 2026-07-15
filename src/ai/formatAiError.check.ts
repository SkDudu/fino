import { formatAiError } from "./formatAiError";

const err = new Error("fail");
console.assert(formatAiError(err).includes("fail"));
console.assert(formatAiError("raw") === "raw");
console.log("formatAiError.check.ts ok");
