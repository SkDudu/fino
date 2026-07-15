export function aliasKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}

export function confidenceLevel(score: number): string {
  if (score >= 0.98) return "very_high";
  if (score >= 0.9) return "high";
  if (score >= 0.75) return "medium";
  if (score >= 0.5) return "low";
  return "unknown";
}

export function needsReview(score: number): boolean {
  return score < 0.75;
}
