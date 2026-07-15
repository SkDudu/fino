import { useEffect, useState } from "react";
import { listTransactions } from "@/database/transactionsRepo";
import { useDataVersion } from "@/store/dataVersion";
import type { Transaction } from "@/types/transaction";

export function useTransactions(limit = 10) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const v = useDataVersion();

  useEffect(() => {
    listTransactions({ limit }).then(setTransactions);
  }, [limit, v]);

  return { transactions };
}
