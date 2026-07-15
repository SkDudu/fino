import assert from "node:assert/strict";
import { detectType } from "./BaseParser";
import { nubankParser } from "./NubankParser";
import type { NotificationData } from "@/types/notification";

const nubankSample: NotificationData = {
  id: "com.nu.production:1:1700000000000",
  packageName: "com.nu.production",
  appName: "Nubank",
  title: "Compra aprovada",
  text: "R$ 53,90\nMcDonald's\nCartão final 1234",
  timestamp: Date.parse("2026-07-11T17:42:00"),
};

assert.equal(nubankParser.canParse(nubankSample), true);

const tx = nubankParser.parse(nubankSample);
assert.ok(tx);
assert.equal(tx!.amount, 53.9);
assert.equal(tx!.merchant, "McDonald's");
assert.equal(tx!.cardFinal, "1234");
assert.equal(tx!.type, "expense");
assert.equal(tx!.paymentMethod, "credit_card");
assert.equal(tx!.bank, "Nubank");

assert.equal(detectType("Transferência recebida\nR$ 200,00"), "income");
assert.equal(detectType("Você recebeu uma transferência de R$ 200,00"), "income");
assert.equal(detectType("Transferência enviada\nR$ 50,00"), "transfer");

console.log("parser.check.ts OK");
