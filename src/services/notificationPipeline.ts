import {
  insertNotification,
  markDiscarded,
  markParsed,
} from "@/database/notificationsRepo";
import { isWatchedPackage } from "@/database/watchedBanksRepo";
import { existsByNotificationId } from "@/database/transactionsRepo";
import { parseNotification } from "@/parsers/ParserEngine";
import { enrichTransaction } from "@/services/enrichment";
import type { NotificationData } from "@/types/notification";
import type { Transaction } from "@/types/transaction";
import type { NotificationReceivedPayload } from "notification-listener";

export type PipelineResult =
  | { status: "ignored" }
  | { status: "duplicate" }
  | { status: "stored" }
  | { status: "pending"; transaction: Transaction; notification: NotificationData };

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

export async function processNotification(
  payload: NotificationReceivedPayload
): Promise<PipelineResult> {
  const notification = toNotificationData(payload);

  if (!(await isWatchedPackage(notification.packageName))) {
    return { status: "ignored" };
  }

  await insertNotification(notification);

  const { transaction } = parseNotification(notification);

  if (!transaction) {
    return { status: "stored" };
  }

  await markParsed(notification.id);

  if (await existsByNotificationId(notification.id)) {
    return { status: "duplicate" };
  }

  const rawText = [notification.title, notification.text, notification.subText]
    .filter(Boolean)
    .join(" ");
  const enriched = await enrichTransaction(transaction, rawText);

  return { status: "pending", transaction: enriched, notification };
}

export async function discardPending(notificationId: string): Promise<void> {
  await markDiscarded(notificationId);
}
