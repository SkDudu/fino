/** ponytail: guard for ai_keep_in_memory — run with `npx tsx src/ai/aiKeepMemory.check.ts` */
function shouldBootLoad(keep: string | null): boolean {
  return keep === "1";
}

console.assert(!shouldBootLoad(null));
console.assert(!shouldBootLoad("0"));
console.assert(shouldBootLoad("1"));
console.log("aiKeepMemory.check.ts ok");
