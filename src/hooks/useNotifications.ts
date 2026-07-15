import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import {
  addNotificationListener,
  drainPending,
  isEnabled,
  openSettings,
} from "notification-listener";
import { initDb } from "@/database/db";
import { listNotifications } from "@/database/notificationsRepo";
import {
  discardPending,
  processNotification,
} from "@/services/notificationPipeline";
import { bumpData, setPending, useDataVersion, usePendingTransaction } from "@/store/dataVersion";
import type { NotificationData } from "@/types/notification";
import { insertTransaction } from "@/database/transactionsRepo";
import { learnFromTransaction } from "@/services/enrichment";

type StoredNotification = NotificationData & {
  parsed: boolean;
  discarded: boolean;
  createdAt: string;
};

export function useNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const { pendingTransaction, pendingNotificationId } = usePendingTransaction();
  const v = useDataVersion();

  const loadNotifications = useCallback(async () => {
    const rows = await listNotifications({ limit: 10 });
    setNotifications(rows);
  }, []);

  const refreshPermission = useCallback(() => {
    if (Platform.OS !== "android") {
      setEnabled(false);
      return;
    }
    setEnabled(isEnabled());
  }, []);

  useEffect(() => {
    initDb().then(async () => {
      if (Platform.OS === "android") {
        const pending = drainPending();
        for (const payload of pending) {
          const result = await processNotification(payload);
          bumpData();
          if (result.status === "pending") {
            setPending(result.transaction, result.notification.id);
          }
        }
      }
      loadNotifications();
    });
  }, [loadNotifications, v]);

  useEffect(() => {
    refreshPermission();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    return () => sub.remove();
  }, [refreshPermission]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = addNotificationListener(async (payload) => {
      const result = await processNotification(payload);
      bumpData();

      if (result.status === "pending") {
        setPending(result.transaction, result.notification.id);
      }
    });

    return () => subscription.remove();
  }, []);

  const approvePending = useCallback(async () => {
    if (!pendingTransaction) return;
    const tx = { ...pendingTransaction, approved: true };
    await insertTransaction(tx);
    await learnFromTransaction(tx);
    setPending(null, null);
    bumpData();
  }, [pendingTransaction]);

  const discardPendingTransaction = useCallback(async () => {
    if (pendingNotificationId) {
      await discardPending(pendingNotificationId);
    }
    setPending(null, null);
    bumpData();
  }, [pendingNotificationId]);

  return {
    enabled,
    notifications,
    pendingTransaction,
    approvePending,
    discardPendingTransaction,
    refreshPermission,
    openSettings,
    isAndroid: Platform.OS === "android",
  };
}
