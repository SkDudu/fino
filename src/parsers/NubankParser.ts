import { BaseParser, buildTransaction, fullText, parseAmount, detectType } from "./BaseParser";
import type { NotificationData } from "@/types/notification";

class NubankParser extends BaseParser {
  bank = "Nubank";
  packageNames = ["com.nu.production"];

  parse(notification: NotificationData) {
    const text = fullText(notification);
    const amount = parseAmount(text);
    if (!amount) return null;
    return buildTransaction(notification, {
      type: detectType(text),
      amount,
      description: notification.title || "Transação Nubank",
      paymentMethod: /final\s*\d{4}/i.test(text) ? "credit_card" : undefined,
    });
  }
}

export const nubankParser = new NubankParser();
