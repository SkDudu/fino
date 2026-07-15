import { BaseParser } from "./BaseParser";
import type { NotificationData } from "@/types/notification";

class BBParser extends BaseParser {
  bank = "Banco do Brasil";
  packageNames = ["br.com.bb.android"];

  parse(notification: NotificationData) {
    return this.parseStandard(notification);
  }
}

export const bbParser = new BBParser();
