import assert from "node:assert/strict";
import {
  groupThreads,
  previewFromMessages,
  threadTimeLabel,
  titleFromMessages,
  type ChatMsg,
  type ChatThreadSummary,
} from "./chatThread";

const msgs: ChatMsg[] = [
  { id: "w", role: "ai", text: "Olá" },
  { id: "u", role: "user", text: "Resumo da semana" },
  { id: "a", role: "ai", text: "Você gastou R$ 842 esta semana." },
];

assert.equal(titleFromMessages(msgs), "Resumo da semana");
assert.equal(previewFromMessages(msgs), "Você gastou R$ 842 esta semana.");
assert.equal(titleFromMessages([]), "Nova conversa");

const now = Date.parse("2026-07-15T18:00:00");
const threads: ChatThreadSummary[] = [
  { id: "1", title: "A", preview: "x", updatedAt: now - 30_000 },
  { id: "2", title: "B", preview: "y", updatedAt: now - 2 * 24 * 60 * 60 * 1000 },
  { id: "3", title: "C", preview: "z", updatedAt: now - 20 * 24 * 60 * 60 * 1000 },
];
const groups = groupThreads(threads, now);
assert.deepEqual(
  groups.map((g) => g.label),
  ["HOJE", "ESTA SEMANA", "ANTERIORES"]
);
assert.equal(threadTimeLabel(now - 10_000, now), "Agora");

console.log("chatThread.check.ts: ok");
