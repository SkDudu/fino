import { BaseParser } from "./BaseParser";
import type { NotificationData } from "@/types/notification";

class SantanderParser extends BaseParser {
  bank = "Santander";
  packageNames = ["com.santander.app"];

  parse(notification: NotificationData) {
    return this.parseStandard(notification);
  }
}

export const santanderParser = new SantanderParser();
