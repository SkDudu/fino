import { BaseParser } from "./BaseParser";
import type { NotificationData } from "@/types/notification";

class BradescoParser extends BaseParser {
  bank = "Bradesco";
  packageNames = ["com.bradesco"];

  parse(notification: NotificationData) {
    return this.parseStandard(notification);
  }
}

export const bradescoParser = new BradescoParser();
