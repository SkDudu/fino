import { CATEGORIES } from "@/parsers/categorize";

export const AI_VERSION_DEFAULT = "1.0.0";

export const AI_SUBCATEGORIES = [
  "Fast Food",
  "Restaurante",
  "Café",
  "Combustível",
  "Marketplace",
  "Corrida",
  "Streaming",
  "Farmácia",
  "Academia",
  "Outros",
] as const;

export type AiStatus = "IDLE" | "READY" | "RUNNING" | "ERROR";

export type EnrichmentJson = {
  merchant: string;
  brand: string;
  category: string;
  subcategory: string;
  confidence: number;
};

export const AI_CATEGORY_LIST = CATEGORIES.join("\n");
