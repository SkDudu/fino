import { formatCurrency } from "./formatCurrency";

// ponytail: if/else templates; LLM tip engine if copy needs real variety
export function pickInsight(s: {
  spent: number;
  received: number;
  topCategory?: { label: string; amount: number };
  trendPct?: number;
}): string {
  if (s.spent === 0 && s.received === 0)
    return "Converta notificações para ver o ritmo do dia.";
  if (s.received > s.spent * 2)
    return `Entrada forte hoje: ${formatCurrency(s.received)}.`;
  if (s.trendPct != null && s.trendPct > 20)
    return `Gastos ${Math.round(s.trendPct)}% acima do mês passado.`;
  if (s.topCategory)
    return `${s.topCategory.label} lidera (${formatCurrency(s.topCategory.amount)}).`;
  return `Hoje: ${formatCurrency(s.spent)} saíram, ${formatCurrency(s.received)} entraram.`;
}
