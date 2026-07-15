import categories from "../context/rules/categories.json";
import subcategories from "../context/rules/subcategories.json";
import transactionTypes from "../context/rules/transaction-types.json";
import banks from "../context/rules/banks.json";
import paymentMethods from "../context/rules/payment-methods.json";
import systemMd from "../context/system.md";
import transactionMd from "../context/transaction.md";
import chatMd from "../context/chat.md";
import merchantMd from "../context/merchant.md";
import categorizationMd from "../context/categorization.md";
import summaryMd from "../context/summary.md";
import extractPrompt from "../context/prompts/extract.prompt";
import categorizePrompt from "../context/prompts/categorize.prompt";
import chatPrompt from "../context/prompts/chat.prompt";
import summaryPrompt from "../context/prompts/summary.prompt";

export type LoadedContext = {
  system: string;
  transaction: string;
  chat: string;
  merchant: string;
  categorization: string;
  summary: string;
  rules: {
    categories: string[];
    subcategories: string[];
    transactionTypes: string[];
    banks: string[];
    paymentMethods: string[];
  };
  prompts: {
    extract: string;
    categorize: string;
    chat: string;
    summary: string;
  };
};

let cached: LoadedContext | null = null;

export function loadContextBundle(): LoadedContext {
  if (cached) return cached;
  cached = {
    system: systemMd,
    transaction: transactionMd,
    chat: chatMd,
    merchant: merchantMd,
    categorization: categorizationMd,
    summary: summaryMd,
    rules: {
      categories,
      subcategories,
      transactionTypes,
      banks,
      paymentMethods,
    },
    prompts: {
      extract: extractPrompt,
      categorize: categorizePrompt,
      chat: chatPrompt,
      summary: summaryPrompt,
    },
  };
  return cached;
}

export function initPromptLoader(): LoadedContext {
  return loadContextBundle();
}
