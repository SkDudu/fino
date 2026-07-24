import type { EnrichmentMessages } from "./PromptTemplates";
import { fillTemplate } from "./PromptTemplates";
import { loadContextBundle } from "./PromptLoader";

function businessRulesBlock(): string {
  const { rules } = loadContextBundle();
  return [
    "Categorias:",
    rules.categories.join("\n"),
    "",
    "Subcategorias:",
    rules.subcategories.join("\n"),
    "",
    "Tipos de transação:",
    rules.transactionTypes.join(", "),
    "",
    "Bancos:",
    rules.banks.join(", "),
    "",
    "Formas de pagamento:",
    rules.paymentMethods.join(", "),
  ].join("\n");
}

export function buildEnrichmentMessages(rawText: string): EnrichmentMessages {
  const ctx = loadContextBundle();
  const system = [
    "[SYSTEM]",
    ctx.system,
    "",
    "[BUSINESS RULES]",
    businessRulesBlock(),
    "",
    "[CONTEXT]",
    ctx.transaction,
    ctx.merchant,
    ctx.categorization,
    "",
    "[EXPECTED OUTPUT]",
    "APENAS JSON válido (sem <think>, sem markdown) com merchant, brand, category, subcategory, confidence (0 a 1).",
  ].join("\n");

  const user = fillTemplate(ctx.prompts.extract, { notification: rawText });
  return { system, user };
}

export function buildTestMessages(): EnrichmentMessages {
  return buildEnrichmentMessages(
    "Compra aprovada R$53,90 McDonald's Cartão final 1234"
  );
}

export function buildChatMessages(
  question: string,
  sqliteContext: string,
  conversationBlock = ""
): EnrichmentMessages {
  const ctx = loadContextBundle();
  const system = ["[SYSTEM]", ctx.system, "", "[CONTEXT]", ctx.chat].join(
    "\n"
  );

  const user = fillTemplate(ctx.prompts.chat, {
    conversationBlock: conversationBlock.trim()
      ? `Memoria da conversa:\n${conversationBlock.trim()}\n`
      : "",
    sqliteContext,
    question,
  });
  return { system, user };
}

export function buildSummaryMessages(sqliteContext: string): EnrichmentMessages {
  const ctx = loadContextBundle();
  const system = [ctx.system, ctx.summary].join("\n\n");
  const user = fillTemplate(ctx.prompts.summary, { sqliteContext });
  return { system, user };
}
