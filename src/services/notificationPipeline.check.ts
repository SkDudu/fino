/** ponytail: store-only intake; analyze is opt-in — `npx tsx src/services/notificationPipeline.check.ts` */
import assert from "node:assert/strict";
import { nubankParser } from "@/parsers/NubankParser";
import type { NotificationData } from "@/types/notification";

const financial: NotificationData = {
  id: "com.nu.production:sim:1",
  packageName: "com.nu.production",
  appName: "Nubank",
  title: "Pix recebido",
  text: "Você recebeu um Pix de R$ 50,00\nFulano",
  timestamp: Date.now(),
};

const noise: NotificationData = {
  ...financial,
  id: "noise",
  title: "Promo",
  text: "Ganhe pontos no app",
};

// Intake no longer auto-inserts — both kinds are just stored; analyze uses parse.
assert.equal(nubankParser.canParse(financial), true);
assert.ok(nubankParser.parse(financial));
assert.equal(nubankParser.canParse(noise), false);
assert.equal(nubankParser.parse(noise), null);

console.log("notificationPipeline.check.ts OK");
