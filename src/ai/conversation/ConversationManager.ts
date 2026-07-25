import { listTransactions } from "@/database/transactionsRepo";
import { insertAiUsage } from "@/database/aiUsageRepo";
import { buildChatMessages } from "../builders/PromptBuilder";
import { describeChatFilters, resolveChatFilters } from "../resolveChatFilters";
import { buildConversationBlock } from "./ConversationContext";
import { inferChat } from "../InferenceEngine";
import type { TokenUsage } from "../deepseekPricing";
import { executeSqlList, executeSqlSum } from "../planner/plannerSql";
import { planQuestion } from "../planner/plannerRules";
import {
  buildSummaryContext,
  buildSummaryFallback,
} from "../summary/SummaryBuilder";
import {
  clearConversation,
  expireConversation,
  getMemory,
  startConversation,
  updateDirectReply,
  updateMemory,
} from "./ConversationStore";

export type ChatAnswer = { text: string; usage?: TokenUsage };

export async function handleChatQuestion(
  question: string,
  onToken?: (token: string) => void
): Promise<ChatAnswer> {
  const plan = planQuestion(question);

  if (plan.kind === "memory") {
    updateDirectReply(question, plan.answer);
    return { text: plan.answer };
  }

  if (plan.kind === "sql_sum") {
    const { answer, txs, queryHint } = await executeSqlSum(
      question,
      plan.metric,
      plan.period
    );
    updateMemory({
      lastIntent: plan.metric,
      lastQuestion: question,
      lastResponse: answer,
      lastQuery: queryHint,
      txs,
    });
    return { text: answer };
  }

  if (plan.kind === "sql_list") {
    const { answer, txs, queryHint } = await executeSqlList(question);
    updateMemory({
      lastIntent: plan.intent,
      lastQuestion: question,
      lastResponse: answer,
      lastQuery: queryHint,
      txs,
    });
    return { text: answer };
  }

  const filters = resolveChatFilters(question);
  filters.limit = 10;
  const txs = (await listTransactions(filters)).filter((t) => t.approved);
  const queryHint = describeChatFilters(filters);
  const sqliteContext = buildSummaryContext(txs, queryHint);

  let reply = "";
  let usage: TokenUsage | undefined;
  try {
    const messages = buildChatMessages(
      question,
      sqliteContext,
      plan.conversationBlock
    );
    const result = await inferChat(messages, {
      onToken: onToken
        ? (token) => {
            onToken(token);
          }
        : undefined,
    });
    reply = result.text.trim();
    usage = result.usage;
  } catch {
    reply = "";
  }
  if (!reply) reply = buildSummaryFallback(txs, queryHint);

  if (usage) {
    void insertAiUsage(usage, "chat").catch(() => {});
  }

  updateMemory({
    lastIntent: plan.intent,
    lastQuestion: question,
    lastResponse: reply,
    lastQuery: queryHint,
    txs,
  });

  return { text: reply, usage };
}

export function getCurrentContext(): string {
  const mem = getMemory();
  return mem ? buildConversationBlock(mem) : "";
}

export { clearConversation, expireConversation, startConversation };
