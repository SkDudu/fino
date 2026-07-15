import { NativeModule, requireNativeModule } from "expo";
import { Platform } from "react-native";

export type NotificationReceivedPayload = {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  subText?: string | null;
  timestamp: number;
};

export type InstalledApp = {
  packageName: string;
  label: string;
};

type NotificationListenerEvents = {
  NotificationReceived: (params: NotificationReceivedPayload) => void;
};

declare class NotificationListenerNativeModule extends NativeModule<NotificationListenerEvents> {
  isEnabled(): boolean;
  openSettings(): void;
  drainPending(): NotificationReceivedPayload[];
  getInstalledApps(): InstalledApp[];
  setWatchedPackages(packages: string[]): void;
}

const NativeNotificationListener =
  Platform.OS === "android"
    ? requireNativeModule<NotificationListenerNativeModule>("NotificationListener")
    : null;

export function isEnabled(): boolean {
  return NativeNotificationListener?.isEnabled() ?? false;
}

export function openSettings(): void {
  NativeNotificationListener?.openSettings();
}

export function drainPending(): NotificationReceivedPayload[] {
  return NativeNotificationListener?.drainPending() ?? [];
}

export function getInstalledApps(): InstalledApp[] {
  return NativeNotificationListener?.getInstalledApps() ?? [];
}

export function setWatchedPackages(packages: string[]): void {
  NativeNotificationListener?.setWatchedPackages(packages);
}

export function addNotificationListener(
  listener: (event: NotificationReceivedPayload) => void
) {
  if (!NativeNotificationListener) {
    return { remove() {} };
  }
  // ponytail: native WatchedStore is the filter; JS just forwards
  return NativeNotificationListener.addListener("NotificationReceived", listener);
}
