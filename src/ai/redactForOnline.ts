/** Strip PAN/CPF before sending notification text to online LLM. */
export function redactForOnline(s: string): string {
  // ponytail: regex only — no PII lib; add phone/email PIX keys if leaks show up
  return s
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]")
    .replace(/\b(?:\d{4}[\s-]){3}\d{4}\b/g, (m) => {
      const d = m.replace(/\D/g, "");
      return `****${d.slice(-4)}`;
    })
    .replace(/\b\d{13,19}\b/g, (m) => `****${m.slice(-4)}`);
}
