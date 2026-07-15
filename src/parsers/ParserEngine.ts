import type { NotificationData } from "@/types/notification";
import { bbParser } from "./BBParser";
import { bradescoParser } from "./BradescoParser";
import { c6Parser } from "./C6Parser";
import { interParser } from "./InterParser";
import { itauParser } from "./ItauParser";
import { mercadoPagoParser } from "./MercadoPagoParser";
import { nubankParser } from "./NubankParser";
import { picPayParser } from "./PicPayParser";
import { santanderParser } from "./SantanderParser";
import type { NotificationParser, ParseResult } from "./types";
import { logParserResult } from "@/services/parserLogger";

const parsers: NotificationParser[] = [
  nubankParser,
  interParser,
  itauParser,
  picPayParser,
  mercadoPagoParser,
  bbParser,
  santanderParser,
  bradescoParser,
  c6Parser,
];

export function parseNotification(notification: NotificationData): ParseResult {
  const start = performance.now();
  const parser = parsers.find((p) => p.packageNames.includes(notification.packageName));

  if (!parser) {
    const durationMs = performance.now() - start;
    const result: ParseResult = {
      transaction: null,
      parser: null,
      durationMs,
      error: "no_parser_for_package",
    };
    logParserResult(notification.id, result);
    return result;
  }

  try {
    if (!parser.canParse(notification)) {
      const durationMs = performance.now() - start;
      const result: ParseResult = {
        transaction: null,
        parser: parser.bank,
        durationMs,
        error: "not_financial",
      };
      logParserResult(notification.id, result);
      return result;
    }

    const transaction = parser.parse(notification);
    const durationMs = performance.now() - start;

    if (!transaction || transaction.amount <= 0) {
      const result: ParseResult = {
        transaction: null,
        parser: parser.bank,
        durationMs,
        error: "invalid_transaction",
      };
      logParserResult(notification.id, result);
      return result;
    }

    const result: ParseResult = { transaction, parser: parser.bank, durationMs };
    logParserResult(notification.id, result);
    return result;
  } catch (e) {
    const durationMs = performance.now() - start;
    const result: ParseResult = {
      transaction: null,
      parser: parser.bank,
      durationMs,
      error: e instanceof Error ? e.message : "parse_error",
    };
    logParserResult(notification.id, result);
    return result;
  }
}
