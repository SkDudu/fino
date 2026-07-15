import { CATEGORIES, type Category } from "@/parsers/categorize";
import type { EnrichmentJson } from "./constants";
import { AI_SUBCATEGORIES } from "./constants";

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const CATEGORY_ALIASES: Record<string, Category> = {
  food: "Alimentação",
  alimentacao: "Alimentação",
  mercado: "Mercado",
  supermarket: "Mercado",
  transport: "Transporte",
  transporte: "Transporte",
  home: "Casa",
  casa: "Casa",
  education: "Educação",
  educacao: "Educação",
  health: "Saúde",
  saude: "Saúde",
  subscription: "Assinaturas",
  assinaturas: "Assinaturas",
  shopping: "Compras",
  compras: "Compras",
  salary: "Salário",
  salario: "Salário",
  transfer: "Transferência",
  transferencia: "Transferência",
  outros: "Outros",
  other: "Outros",
};

function normalizeCategory(raw: string): Category | null {
  const t = raw.trim();
  if ((CATEGORIES as readonly string[]).includes(t)) return t as Category;
  const folded = fold(t);
  for (const c of CATEGORIES) {
    if (fold(c) === folded) return c;
  }
  return CATEGORY_ALIASES[folded] ?? null;
}

function parseConfidence(v: unknown): number | null {
  const n =
    typeof v === "string" ? Number(v.trim().replace(",", ".")) : Number(v);
  if (!Number.isFinite(n)) return null;
  let score = n;
  if (score > 1 && score <= 100) score /= 100;
  if (score < 0 || score > 1) return null;
  return score;
}

export function parseEnrichmentJson(raw: string): EnrichmentJson | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const merchant = String(o.merchant ?? "").trim();
  const brand = String(o.brand ?? merchant).trim();
  const category = normalizeCategory(String(o.category ?? ""));
  const subcategory = String(o.subcategory ?? "Outros").trim();
  const confidence = parseConfidence(o.confidence);
  if (!merchant || !category || confidence == null) return null;
  const sub = (AI_SUBCATEGORIES as readonly string[]).includes(subcategory)
    ? subcategory
    : "Outros";
  return { merchant, brand, category, subcategory: sub, confidence };
}
