export type ChatMsg = { id: string; role: "ai" | "user"; text: string };

export type ChatThreadSummary = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
};

export function titleFromMessages(msgs: ChatMsg[]): string {
  const first = msgs.find((m) => m.role === "user" && m.text.trim());
  return (first?.text.trim() || "Nova conversa").slice(0, 48);
}

export function previewFromMessages(msgs: ChatMsg[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const t = msgs[i].text.trim();
    if (t) return t.slice(0, 64);
  }
  return "";
}

/** Groups for Conversas list: hoje → esta semana → anteriores. */
export function groupThreads(
  threads: ChatThreadSummary[],
  now = Date.now()
): { label: string; items: ChatThreadSummary[] }[] {
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const todayMs = startToday.getTime();
  const weekMs = todayMs - 6 * 24 * 60 * 60 * 1000;

  const hoje: ChatThreadSummary[] = [];
  const semana: ChatThreadSummary[] = [];
  const anteriores: ChatThreadSummary[] = [];

  for (const t of threads) {
    if (t.updatedAt >= todayMs) hoje.push(t);
    else if (t.updatedAt >= weekMs) semana.push(t);
    else anteriores.push(t);
  }

  const out: { label: string; items: ChatThreadSummary[] }[] = [];
  if (hoje.length) out.push({ label: "HOJE", items: hoje });
  if (semana.length) out.push({ label: "ESTA SEMANA", items: semana });
  if (anteriores.length) out.push({ label: "ANTERIORES", items: anteriores });
  return out;
}

export function threadTimeLabel(updatedAt: number, now = Date.now()): string {
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  if (updatedAt >= startToday.getTime()) {
    if (now - updatedAt < 60_000) return "Agora";
    const d = new Date(updatedAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return days[new Date(updatedAt).getDay()] ?? "";
}
