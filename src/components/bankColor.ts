import { colors } from "@/constants/theme";

const BANK_DOT: Record<string, string> = {
  Nubank: "#820AD1",
  Inter: "#FF7A00",
  Itaú: "#EC7000",
  PicPay: "#21C25E",
  "Mercado Pago": "#009EE3",
  Chrome: "#4285F4",
};

const FALLBACKS = [
  colors.accent,
  colors.secondary,
  colors.warning,
  colors.primary,
  "#820AD1",
  "#009EE3",
];

export function bankColor(bank: string): string {
  if (BANK_DOT[bank]) return BANK_DOT[bank];
  let h = 0;
  for (let i = 0; i < bank.length; i++) h = (h + bank.charCodeAt(i) * (i + 1)) % FALLBACKS.length;
  return FALLBACKS[h];
}
