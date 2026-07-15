import { BaseParser } from "./BaseParser";
import type { NotificationData } from "@/types/notification";

class MercadoPagoParser extends BaseParser {
  bank = "Mercado Pago";
  packageNames = ["com.mercadopago.wallet"];

  parse(notification: NotificationData) {
    return this.parseStandard(notification);
  }
}

export const mercadoPagoParser = new MercadoPagoParser();
