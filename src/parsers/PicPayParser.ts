import { BaseParser } from "./BaseParser";
import type { NotificationData } from "@/types/notification";

class PicPayParser extends BaseParser {
  bank = "PicPay";
  packageNames = ["com.picpay"];

  parse(notification: NotificationData) {
    return this.parseStandard(notification);
  }
}

export const picPayParser = new PicPayParser();
