export const BANK_PACKAGES: Record<string, string> = {
  "com.nu.production": "Nubank",
  "br.com.intermedium": "Inter",
  "com.itau": "Itaú",
  "com.picpay": "PicPay",
  "com.c6bank.app": "C6 Bank",
  "br.com.bb.android": "Banco do Brasil",
  "com.bradesco": "Bradesco",
  "com.santander.app": "Santander",
  "br.com.gabba.Caixa": "Caixa",
  "br.gov.caixa.tem": "CAIXA Tem",
  "br.com.banrisul.riogrande": "Banrisul",
  "com.safra.bancosafra": "Safra",
  "br.com.original.bank": "Original",
  "co.neon.neon": "Neon",
  "com.btg.pactual.digital": "BTG",
  "com.mercadopago.wallet": "Mercado Pago",
};

export function bankNameFromPackage(packageName: string): string {
  return BANK_PACKAGES[packageName] ?? packageName;
}
