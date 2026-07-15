import type { ChatIntent } from "../conversation/ConversationTypes";
import { buildConversationBlock } from "../conversation/ConversationContext";
import { getMemory } from "../conversation/ConversationStore";

export type SqlPeriod = "today" | "week" | "month";

export type PlannerPlan =
  | { kind: "memory"; answer: string }
  | { kind: "sql_sum"; metric: "expense" | "income" | "pix_count"; period: SqlPeriod }
  | { kind: "sql_list"; intent: ChatIntent }
  | { kind: "llm"; intent: ChatIntent; conversationBlock: string };

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const FOLLOW_UPS: {
  test: RegExp;
  answer: (m: NonNullable<ReturnType<typeof getMemory>>) => string | null;
}[] = [
  {
    test: /qual banco|que banco|banco foi|foi qual banco/,
    answer: (m) =>
      m.lastEntities.banks[0] ? `Foi o ${m.lastEntities.banks[0]}.` : null,
  },
  {
    test: /quanto foi|qual valor|valor foi/,
    answer: (m) => {
      const a = m.lastEntities.amounts[0];
      return a != null ? `Foi R$ ${a.toFixed(2)}.` : null;
    },
  },
  {
    test: /qual estabelecimento|onde foi|qual loja/,
    answer: (m) =>
      m.lastEntities.merchants[0]
        ? `Foi em ${m.lastEntities.merchants[0]}.`
        : null,
  },
  {
    test: /qual categoria|categoria foi/,
    answer: (m) =>
      m.lastEntities.categories[0]
        ? `Categoria: ${m.lastEntities.categories[0]}.`
        : null,
  },
  {
    test: /credito|crédito|foi credito/,
    answer: (m) => {
      const pm = m.lastTransactions[0]?.paymentMethod;
      if (!pm) return null;
      return pm === "credit_card" ? "Sim, foi no credito." : `Forma: ${pm}.`;
    },
  },
  {
    test: /debito|débito|foi debito/,
    answer: (m) => {
      const pm = m.lastTransactions[0]?.paymentMethod;
      if (!pm) return null;
      return pm === "debit_card" ? "Sim, foi no debito." : `Forma: ${pm}.`;
    },
  },
];

function isFollowUp(question: string): boolean {
  const q = fold(question);
  if (/mes|semana|hoje|ontem|passado|resumo/.test(q)) return false;
  return FOLLOW_UPS.some((f) => f.test.test(q));
}

export function detectPeriod(question: string): SqlPeriod {
  const q = fold(question);
  if (q.includes("hoje")) return "today";
  if (q.includes("semana")) return "week";
  return "month";
}

export function classifyIntent(question: string): ChatIntent {
  const q = fold(question);
  if (q.includes("hoje")) return "expenses_today";
  if (q.includes("semana")) return "expenses_week";
  if (q.includes("mes")) return "expenses_month";
  if (q.includes("resumo")) return "summary";
  if (/economiz|cortar|meta|suger|dica/.test(q)) return "advice";
  if (q.includes("banco")) return "bank_detail";
  if (q.includes("categoria")) return "category_detail";
  if (/estabelecimento|loja/.test(q)) return "merchant_detail";
  return "general";
}

function needsLlm(q: string): boolean {
  return /resumo|resuma|economiz|cortar|meta|suger|dica|analis|compar|padrao|padra|estranho|explique|como\s+posso|onde\s+posso|analise/.test(
    q
  );
}

function isSqlList(q: string): boolean {
  return /list(e|ar)|quais\s+(compras|gastos|despesas|transa)|mostre|mostrar/.test(
    q
  );
}

function isSqlSum(q: string): { metric: "expense" | "income" | "pix_count" } | null {
  if (/quantos?\s+pix|pix\s+envi/.test(q)) return { metric: "pix_count" };
  if (
    /quanto\s+(recebi|entr|ganhei)|quanto\s+recebeu|total\s+receb/.test(q) &&
    !/gast/.test(q)
  ) {
    return { metric: "income" };
  }
  if (/quanto\s+(gastei|gast|paguei|saiu)|total\s+(de\s+)?gast/.test(q)) {
    return { metric: "expense" };
  }
  return null;
}

export function planQuestion(question: string): PlannerPlan {
  const mem = getMemory();
  if (mem && isFollowUp(question)) {
    const q = fold(question);
    for (const f of FOLLOW_UPS) {
      if (f.test.test(q)) {
        const answer = f.answer(mem);
        if (answer) return { kind: "memory", answer };
      }
    }
  }

  const q = fold(question);
  const sum = isSqlSum(q);
  if (sum) {
    return {
      kind: "sql_sum",
      metric: sum.metric,
      period: detectPeriod(question),
    };
  }
  if (isSqlList(q)) {
    return { kind: "sql_list", intent: classifyIntent(question) };
  }
  if (needsLlm(q)) {
    return {
      kind: "llm",
      intent: classifyIntent(question),
      conversationBlock: mem ? buildConversationBlock(mem) : "",
    };
  }

  return {
    kind: "llm",
    intent: classifyIntent(question),
    conversationBlock: mem ? buildConversationBlock(mem) : "",
  };
}
