import { CATEGORIES } from "@/parsers/categorize";
import catalog from "./models.json";

export type AiModelEntry = {
  id: string;
  label: string;
  file: string;
  downloadUrl: string;
  size: number;
  sha256: string;
  hint: string;
  nCtx?: number;
  nPredict?: number;
  nGpuLayers?: number;
  nThreads?: number;
};

export const DEFAULT_MODEL_ID = catalog[0].id;

/** @deprecated use getActiveModel / catalog */
export const AI_MODEL_ID = catalog[0].id;
/** @deprecated use catalog entry file */
export const AI_MODEL_FILE = catalog[0].file;
export const AI_RUNTIME = "llama.cpp";
export const AI_VERSION_DEFAULT = "1.0.0";

/** Override with EXPO_PUBLIC_AI_MANIFEST_URL (legado, um modelo só). */
export const AI_MANIFEST_URL =
  process.env.EXPO_PUBLIC_AI_MANIFEST_URL ?? "";

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

export type AiStatus =
  | "NOT_INSTALLED"
  | "DOWNLOADING"
  | "READY"
  | "LOADING"
  | "RUNNING"
  | "ERROR";

export type AiManifest = {
  model: string;
  version: string;
  runtime: string;
  downloadUrl: string;
  sha256: string;
  size: number;
};

export type EnrichmentJson = {
  merchant: string;
  brand: string;
  category: string;
  subcategory: string;
  confidence: number;
};

export const AI_CATEGORY_LIST = CATEGORIES.join("\n");
