import { greetingForHour } from "./greeting";
import { formatRelative } from "./formatRelative";

console.assert(greetingForHour(8) === "Bom dia");
console.assert(greetingForHour(14) === "Boa tarde");
console.assert(greetingForHour(20) === "Boa noite");
console.assert(formatRelative(Date.now() - 2 * 60_000, Date.now()) === "há 2 min");
console.assert(formatRelative(Date.now() - 3 * 3_600_000, Date.now()) === "há 3 h");
console.log("greeting/formatRelative ok");
