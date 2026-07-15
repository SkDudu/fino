import { useCallback, useEffect, useState } from "react";
import {
  countWatchedBanks,
  listWatchedBanks,
  removeWatchedBank,
  replaceWatchedBanks,
  type WatchedBank,
} from "@/database/watchedBanksRepo";
import { initDb } from "@/database/db";
import { bumpData, useDataVersion } from "@/store/dataVersion";

export function useWatchedBanks() {
  const [banks, setBanks] = useState<WatchedBank[]>([]);
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  const v = useDataVersion();

  // ponytail: native sync on boot (_layout) + on mutate (repo); not on every bumpData
  const reload = useCallback(async () => {
    await initDb();
    const [rows, n] = await Promise.all([listWatchedBanks(), countWatchedBanks()]);
    setBanks(rows);
    setCount(n);
    setReady(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload, v]);

  const replace = useCallback(
    async (next: { packageName: string; label: string }[]) => {
      await replaceWatchedBanks(next);
      bumpData();
    },
    []
  );

  const remove = useCallback(async (packageName: string) => {
    await removeWatchedBank(packageName);
    bumpData();
  }, []);

  return { banks, count, ready, replace, remove, reload };
}
