import { BaseParser } from "./BaseParser";
import type { NotificationData } from "@/types/notification";

class ItauParser extends BaseParser {
  bank = "Itaú";
  packageNames = ["com.itau"];

  parse(notification: NotificationData) {
    return this.parseStandard(notification);
  }
}

export const itauParser = new ItauParser();
