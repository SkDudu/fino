import { useEffect, useState } from "react";
import { countNotifications, listNotifications } from "@/database/notificationsRepo";
import {
  countTransactions,
  sumTodayExpenses,
  sumTodayIncome,
} from "@/database/transactionsRepo";
import { useDataVersion } from "@/store/dataVersion";

export type Stats = {
  spentToday: number;
  receivedToday: number;
  balanceToday: number;
  notificationCount: number;
  transactionCount: number;
  conversionCount: number;
};

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    spentToday: 0,
    receivedToday: 0,
    balanceToday: 0,
    notificationCount: 0,
    transactionCount: 0,
    conversionCount: 0,
  });
  const v = useDataVersion();

  useEffect(() => {
    Promise.all([
      sumTodayExpenses(),
      sumTodayIncome(),
      countNotifications(),
      countTransactions(),
      listNotifications({ parsed: true, limit: 1000 }),
    ]).then(([spent, received, notifCount, txCount, parsed]) => {
      setStats({
        spentToday: spent,
        receivedToday: received,
        balanceToday: received - spent,
        notificationCount: notifCount,
        transactionCount: txCount,
        conversionCount: parsed.length,
      });
    });
  }, [v]);

  return { stats };
}
