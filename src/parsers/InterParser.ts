import { BaseParser } from "./BaseParser";
import type { NotificationData } from "@/types/notification";

class InterParser extends BaseParser {
  bank = "Inter";
  packageNames = ["br.com.intermedium"];

  parse(notification: NotificationData) {
    return this.parseStandard(notification);
  }
}

export const interParser = new InterParser();
