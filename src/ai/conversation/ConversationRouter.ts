export {
  classifyIntent,
  detectPeriod,
  planQuestion,
  type PlannerPlan,
  type SqlPeriod,
} from "../planner/plannerRules";

import { planQuestion } from "../planner/plannerRules";
import type { RouteResult } from "./ConversationTypes";

/** @deprecated use planQuestion */
export function routeQuestion(question: string): RouteResult {
  const plan = planQuestion(question);
  if (plan.kind === "memory") return { kind: "direct", answer: plan.answer };
  if (plan.kind === "llm") {
    return {
      kind: "infer",
      intent: plan.intent,
      conversationBlock: plan.conversationBlock,
    };
  }
  return {
    kind: "infer",
    intent: plan.kind === "sql_list" ? plan.intent : "general",
    conversationBlock: "",
  };
}

export function isFollowUp(question: string): boolean {
  const plan = planQuestion(question);
  return plan.kind === "memory";
}
