import { getDb } from "./db";
import {
  previewFromMessages,
  titleFromMessages,
  type ChatMsg,
  type ChatThreadSummary,
} from "./chatThread";

export type { ChatMsg, ChatThreadSummary };
export {
  groupThreads,
  previewFromMessages,
  threadTimeLabel,
  titleFromMessages,
} from "./chatThread";

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMsg[];
};

function parseRow(row: {
  id: string;
  title: string;
  updated_at: number;
  messages: string;
}): ChatThread {
  let messages: ChatMsg[] = [];
  try {
    messages = JSON.parse(row.messages) as ChatMsg[];
  } catch {
    messages = [];
  }
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    messages,
  };
}

export async function listChatThreads(search?: string): Promise<ChatThreadSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    updated_at: number;
    messages: string;
  }>(`SELECT id, title, updated_at, messages FROM chat_threads ORDER BY updated_at DESC`);

  const q = search?.trim().toLowerCase();
  return rows
    .map((r) => {
      const messages = parseRow(r).messages;
      return {
        id: r.id,
        title: r.title,
        preview: previewFromMessages(messages),
        updatedAt: r.updated_at,
      };
    })
    .filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q)
    );
}

export async function getChatThread(id: string): Promise<ChatThread | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    title: string;
    updated_at: number;
    messages: string;
  }>(`SELECT id, title, updated_at, messages FROM chat_threads WHERE id = ?`, id);
  return row ? parseRow(row) : null;
}

export async function saveChatThread(
  id: string,
  messages: ChatMsg[],
  updatedAt = Date.now()
): Promise<ChatThread> {
  const db = await getDb();
  const existing = await getChatThread(id);
  // ponytail: keep renamed title; only seed from messages on first save
  const title = existing?.title.trim() || titleFromMessages(messages);
  await db.runAsync(
    `INSERT INTO chat_threads (id, title, updated_at, messages) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       updated_at = excluded.updated_at,
       messages = excluded.messages`,
    id,
    title,
    updatedAt,
    JSON.stringify(messages)
  );
  return { id, title, updatedAt, messages };
}

export async function renameChatThread(
  id: string,
  title: string
): Promise<void> {
  const name = title.trim();
  if (!name) return;
  const db = await getDb();
  await db.runAsync(`UPDATE chat_threads SET title = ? WHERE id = ?`, name, id);
}

export async function deleteChatThread(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM chat_threads WHERE id = ?`, id);
}
