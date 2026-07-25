import type { EnrichmentMessages } from "./builders/PromptTemplates";
import type { TokenUsage } from "./deepseekPricing";

export type InferOptions = {
  nPredict?: number;
  onToken?: (token: string) => void;
};

export type InferResult = { text: string; usage?: TokenUsage };

export type InferFn = (
  messages: EnrichmentMessages,
  opts?: InferOptions
) => Promise<InferResult>;

let inferImpl: InferFn | null = null;
let inferInFlight: Promise<InferResult> | null = null;

export function registerInference(fn: InferFn): void {
  inferImpl = fn;
}

export async function inferChat(
  messages: EnrichmentMessages,
  opts?: InferOptions
): Promise<InferResult> {
  if (!inferImpl) throw new Error("INFERENCE_NOT_REGISTERED");
  if (inferInFlight) return inferInFlight;
  inferInFlight = inferImpl(messages, opts).finally(() => {
    inferInFlight = null;
  });
  return inferInFlight;
}
