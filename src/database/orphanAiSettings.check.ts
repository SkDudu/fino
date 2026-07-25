/**
 * Run: npx tsx src/database/orphanAiSettings.check.ts
 */
import assert from "node:assert/strict";
import { ORPHAN_AI_SETTING_KEYS } from "./orphanAiSettings";

assert.ok(ORPHAN_AI_SETTING_KEYS.includes("ai_keep_in_memory"));
assert.ok(ORPHAN_AI_SETTING_KEYS.includes("ai_mode"));
assert.ok(!(ORPHAN_AI_SETTING_KEYS as readonly string[]).includes("ai_online_model"));
assert.ok(!(ORPHAN_AI_SETTING_KEYS as readonly string[]).includes("ai_api_key_set"));
console.log("orphanAiSettings.check.ts ok");
