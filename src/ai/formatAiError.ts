/** Full error text for alerts / debug. */
export function formatAiError(e: unknown): string {
  if (e instanceof Error) {
    const extra = e as Error & { code?: string; cause?: unknown };
    const lines = [extra.message];
    if (extra.code) lines.push(`code: ${extra.code}`);
    if (extra.stack) lines.push(extra.stack);
    if (extra.cause !== undefined) lines.push(`cause: ${formatAiError(extra.cause)}`);
    return lines.join("\n\n");
  }
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}
