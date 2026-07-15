import models from "./models.json";
import type { AiModelEntry } from "./constants";

export const AI_MODEL_CATALOG = models as AiModelEntry[];

export function getCatalogModel(id: string): AiModelEntry {
  const m = AI_MODEL_CATALOG.find((x) => x.id === id);
  if (!m) throw new Error("UNKNOWN_MODEL");
  return m;
}

export function listCatalogModels(): AiModelEntry[] {
  return AI_MODEL_CATALOG;
}
