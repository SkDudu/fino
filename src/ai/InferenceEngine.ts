import type { EnrichmentMessages } from "./builders/PromptTemplates";

export type InferOptions = {
  nPredict?: number;
  onToken?: (token: string) => void;
};

export type InferFn = (
  messages: EnrichmentMessages,
  opts?: InferOptions
) => Promise<string>;

let inferImpl: InferFn | null = null;
let inferInFlight: Promise<string> | null = null;

export function registerInference(fn: InferFn): void {
  inferImpl = fn;
}

export async function inferChat(
  messages: EnrichmentMessages,
  opts?: InferOptions
): Promise<string> {
  if (!inferImpl) throw new Error("INFERENCE_NOT_REGISTERED");
  if (inferInFlight) return inferInFlight;
  inferInFlight = inferImpl(messages, opts).finally(() => {
    inferInFlight = null;
  });
  return inferInFlight;
}
