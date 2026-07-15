export const CATEGORIES = [
  "Alimentação",
  "Mercado",
  "Transporte",
  "Casa",
  "Educação",
  "Saúde",
  "Assinaturas",
  "Compras",
  "Salário",
  "PIX",
  "Transferência",
  "Outros",
] as const;

export type Category = (typeof CATEGORIES)[number];

const KEYWORDS: Record<Category, string[]> = {
  Alimentação: [
    "mcdonald",
    "burger",
    "pizza",
    "restaurante",
    "ifood",
    "rappi",
    "café",
    "lanchonete",
    "padaria",
  ],
  Mercado: ["mercado", "supermercado", "carrefour", "extra", "pão de açúcar", "atacadão"],
  Transporte: ["uber", "99", "cabify", "posto", "combustível", "estacionamento", "metrô"],
  Casa: ["aluguel", "condomínio", "luz", "água", "internet", "energia", "claro", "vivo"],
  Educação: ["curso", "faculdade", "escola", "udemy", "alura"],
  Saúde: ["farmácia", "droga", "hospital", "clínica", "plano de saúde"],
  Assinaturas: ["netflix", "spotify", "amazon prime", "assinatura", "mensalidade"],
  Compras: ["amazon", "mercado livre", "shopee", "magazine", "loja", "compra"],
  Salário: ["salário", "salario", "pagamento recebido", "folha"],
  PIX: ["pix"],
  Transferência: ["ted", "transferência", "transferencia"],
  Outros: [],
};

export function categorize(text: string, type?: string): Category {
  const lower = text.toLowerCase();
  if (type === "pix_sent" || type === "pix_received") return "PIX";
  if (type === "transfer") return "Transferência";
  if (type === "income") return "Salário";

  for (const [category, words] of Object.entries(KEYWORDS)) {
    if (category === "Outros") continue;
    if (words.some((w) => lower.includes(w))) {
      return category as Category;
    }
  }
  return "Outros";
}
