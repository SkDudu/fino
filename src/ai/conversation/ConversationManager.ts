import { listTransactions } from "@/database/transactionsRepo";
import { buildChatMessages } from "../builders/PromptBuilder";
import { describeChatFilters, resolveChatFilters } from "../resolveChatFilters";
import { buildConversationBlock } from "./ConversationContext";
import { inferChat } from "../InferenceEngine";
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

export async function handleChatQuestion(
  question: string,
  onToken?: (token: string) => void
): Promise<string> {
  const plan = planQuestion(question);

  if (plan.kind === "memory") {
    updateDirectReply(question, plan.answer);
    return plan.answer;
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
    return answer;
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
    return answer;
  }

  const filters = resolveChatFilters(question);
  filters.limit = 10;
  const txs = (await listTransactions(filters)).filter((t) => t.approved);
  const queryHint = describeChatFilters(filters);
  const sqliteContext = buildSummaryContext(txs, queryHint);

  let reply: string;
  try {
    const messages = buildChatMessages(
      question,
      sqliteContext,
      plan.conversationBlock
    );
    reply = (
      await inferChat(messages, {
        onToken: onToken
          ? (token) => {
              onToken(token);
            }
          : undefined,
      })
    ).trim();
  } catch {
    reply = "";
  }
  if (!reply) reply = buildSummaryFallback(txs, queryHint);

  updateMemory({
    lastIntent: plan.intent,
    lastQuestion: question,
    lastResponse: reply,
    lastQuery: queryHint,
    txs,
  });

  return reply;
}

export function getCurrentContext(): string {
  const mem = getMemory();
  return mem ? buildConversationBlock(mem) : "";
}

export {
  clearConversation,
  expireConversation,
  getMemory,
  startConversation,
};
