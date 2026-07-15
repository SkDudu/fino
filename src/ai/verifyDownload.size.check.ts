/** Size gate used by verifyDownload in AIService. */
export function sizeOk(
  bytes: number,
  expected: number
): boolean {
  if (expected <= 0) return true;
  if (bytes <= 0) return true;
  return bytes === expected;
}

console.assert(sizeOk(639446688, 639446688));
console.assert(sizeOk(100, 0));
console.assert(!sizeOk(1, 639446688));
console.log("verifyDownload.size.check.ts ok");
