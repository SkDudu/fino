import type { EnrichmentMessages } from "./builders/PromptTemplates";
import type { OnlineModelId } from "./aiSettings";
import {
  parseUsage,
  selfCheckPricing,
  type ApiUsageRaw,
  type TokenUsage,
} from "./deepseekPricing";

const BASE_URL = "https://api.deepseek.com/chat/completions";

export type OnlineChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type OnlineInferResult = { text: string; usage?: TokenUsage };

export function buildOnlineBody(
  model: OnlineModelId,
  messages: EnrichmentMessages
): Record<string, unknown> {
  return {
    model,
    messages: [
      { role: "system", content: messages.system },
      { role: "user", content: messages.user },
    ] satisfies OnlineChatMessage[],
    stream: false,
    thinking: { type: "disabled" },
  };
}

export async function onlineInfer(
  messages: EnrichmentMessages,
  opts: { apiKey: string; model: OnlineModelId }
): Promise<OnlineInferResult> {
  if (!opts.apiKey) throw new Error("ONLINE_NO_KEY");
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(buildOnlineBody(opts.model, messages)),
  });
  if (res.status === 401) throw new Error("ONLINE_UNAUTHORIZED");
  if (res.status === 429) throw new Error("ONLINE_RATE_LIMIT");
  if (!res.ok) throw new Error("ONLINE_FAILED");
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: ApiUsageRaw;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("ONLINE_FAILED");
  return { text, usage: parseUsage(opts.model, data.usage) };
}

/** ponytail: one assert-style check — run in __DEV__ from callers if needed */
export function selfCheckOnlineBody(): void {
  const body = buildOnlineBody("deepseek-v4-flash", {
    system: "s",
    user: "u",
  });
  if (body.model !== "deepseek-v4-flash") throw new Error("selfCheck: model");
  if ((body.thinking as { type: string }).type !== "disabled") {
    throw new Error("selfCheck: thinking");
  }
  const msgs = body.messages as OnlineChatMessage[];
  if (msgs.length !== 2 || msgs[0].role !== "system") {
    throw new Error("selfCheck: messages");
  }
  selfCheckPricing();
}

if (typeof __DEV__ !== "undefined" && __DEV__) selfCheckOnlineBody();
