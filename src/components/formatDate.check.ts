import assert from "node:assert/strict";
import { formatDate } from "./formatDate";

const sample = new Date(2026, 6, 12, 17, 42).getTime();
assert.equal(formatDate(sample), "12/07/2026 17:42");
console.log("ok: formatDate");
