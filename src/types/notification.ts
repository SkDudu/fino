export interface NotificationData {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  subText?: string;
  timestamp: number;
}
