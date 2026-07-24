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
import { processNotification } from "@/services/notificationPipeline";
import { bumpData, useDataVersion } from "@/store/dataVersion";
import type { NotificationData } from "@/types/notification";

type StoredNotification = NotificationData & {
  parsed: boolean;
  discarded: boolean;
  createdAt: string;
};

export function useNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
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
          await processNotification(payload);
          bumpData();
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
      await processNotification(payload);
      bumpData();
    });

    return () => subscription.remove();
  }, []);

  return {
    enabled,
    notifications,
    refreshPermission,
    openSettings,
    isAndroid: Platform.OS === "android",
  };
}
