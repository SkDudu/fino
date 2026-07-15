import { BANK_PACKAGES } from "@/constants/banks";
import type { NotificationReceivedPayload } from "notification-listener";

export const SIM_BANKS = [
  { label: "Nubank", packageName: "com.nu.production" },
  { label: "Inter", packageName: "br.com.intermedium" },
  { label: "Itaú", packageName: "com.itau" },
  { label: "PicPay", packageName: "com.picpay" },
  { label: "Mercado Pago", packageName: "com.mercadopago.wallet" },
  { label: "Banco do Brasil", packageName: "br.com.bb.android" },
  { label: "Santander", packageName: "com.santander.app" },
  { label: "Bradesco", packageName: "com.bradesco" },
  { label: "C6 Bank", packageName: "com.c6bank.app" },
];

export type SimType = "pix" | "compra" | "transferencia";

function formatBRL(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

export function buildSimPayload(
  packageName: string,
  type: SimType,
  amount: number
): NotificationReceivedPayload {
  const appName = BANK_PACKAGES[packageName] ?? packageName;
  const brl = formatBRL(amount);

  switch (type) {
    case "pix":
      return {
        id: `${packageName}:sim:${Date.now()}`,
        packageName,
        appName,
        title: "Pix recebido",
        text: `Você recebeu um Pix de R$ ${brl}\nFulano`,
        timestamp: Date.now(),
      };
    case "compra":
      return {
        id: `${packageName}:sim:${Date.now()}`,
        packageName,
        appName,
        title: "Compra aprovada",
        text: `R$ ${brl}\nLoja Teste\nCartão final 1234`,
        timestamp: Date.now(),
      };
    case "transferencia":
      return {
        id: `${packageName}:sim:${Date.now()}`,
        packageName,
        appName,
        title: "Transferência enviada",
        text: `Transferência enviada\nR$ ${brl}`,
        timestamp: Date.now(),
      };
  }
}
