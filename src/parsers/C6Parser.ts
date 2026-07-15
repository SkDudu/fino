import { BaseParser } from "./BaseParser";
import type { NotificationData } from "@/types/notification";

class C6Parser extends BaseParser {
  bank = "C6 Bank";
  packageNames = ["com.c6bank.app"];

  parse(notification: NotificationData) {
    return this.parseStandard(notification);
  }
}

export const c6Parser = new C6Parser();
