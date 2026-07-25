/**
 * ponytail: isAiReady = hasApiKey only (online).
 * Run: npx tsx src/ai/isAiReady.check.ts
 */
import assert from "node:assert/strict";

async function isAiReady(hasKey: () => Promise<boolean>): Promise<boolean> {
  return hasKey();
}

async function main() {
  assert.equal(await isAiReady(async () => false), false);
  assert.equal(await isAiReady(async () => true), true);
  console.log("isAiReady.check.ts ok");
}

void main();
