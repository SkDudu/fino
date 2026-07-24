import {
  getNotificationById,
  insertNotification,
  markDiscarded,
  markParsed,
} from "@/database/notificationsRepo";
import { isWatchedPackage } from "@/database/watchedBanksRepo";
import {
  existsByNotificationId,
  insertTransaction,
} from "@/database/transactionsRepo";
import { parseNotification } from "@/parsers/ParserEngine";
import { enrichTransaction, learnFromTransaction } from "@/services/enrichment";
import type { NotificationData } from "@/types/notification";
import type { Transaction } from "@/types/transaction";
import type { NotificationReceivedPayload } from "notification-listener";

export type PipelineResult =
  | { status: "ignored" }
  | { status: "duplicate" }
  | { status: "stored"; notification: NotificationData };

function toNotificationData(payload: NotificationReceivedPayload): NotificationData {
  return {
    id: payload.id,
    packageName: payload.packageName,
    appName: payload.appName,
    title: payload.title,
    text: payload.text,
    subText: payload.subText ?? undefined,
    timestamp: payload.timestamp,
  };
}

/** Store every watched-bank notification. No parse / enrich / tx. */
export async function processNotification(
  payload: NotificationReceivedPayload
): Promise<PipelineResult> {
  const notification = toNotificationData(payload);

  if (!(await isWatchedPackage(notification.packageName))) {
    return { status: "ignored" };
  }

  if (await getNotificationById(notification.id)) {
    return { status: "duplicate" };
  }

  await insertNotification(notification);
  return { status: "stored", notification };
}

export async function discardPending(notificationId: string): Promise<void> {
  await markDiscarded(notificationId);
}

/**
 * User opted in: parse → enrich (IA if ready, else deterministic) → tx.
 * Returns null when amount/type can't be extracted.
 */
export async function analyzeNotification(
  notification: NotificationData
): Promise<Transaction | null> {
  const { transaction } = parseNotification(notification);
  if (!transaction) return null;
  if (await existsByNotificationId(notification.id)) {
    await markParsed(notification.id);
    return null;
  }
  const rawText = [notification.title, notification.text, notification.subText]
    .filter(Boolean)
    .join(" ");
  const enriched = await enrichTransaction(transaction, rawText);
  const tx = { ...enriched, approved: true };
  await insertTransaction(tx);
  await learnFromTransaction(tx);
  await markParsed(notification.id);
  return tx;
}

/** @deprecated use analyzeNotification */
export const convertStoredNotification = analyzeNotification;
