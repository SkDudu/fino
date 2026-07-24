import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FilterChips } from "@/components/FilterChips";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TransactionItem } from "@/components/TransactionItem";
import { colors, spacing, typography } from "@/constants/theme";
import { initDb } from "@/database/db";
import { listTransactions } from "@/database/transactionsRepo";
import { useDataVersion } from "@/store/dataVersion";
import type { Transaction } from "@/types/transaction";

type Chip = "Todos" | "PIX" | "Cartão" | "Débito";

function matchesChip(tx: Transaction, chip: Chip): boolean {
  if (chip === "Todos") return true;
  if (chip === "PIX") {
    return (
      tx.paymentMethod === "pix" ||
      tx.type === "pix_sent" ||
      tx.type === "pix_received"
    );
  }
  if (chip === "Cartão") return tx.paymentMethod === "credit_card";
  return tx.paymentMethod === "debit_card";
}

function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (start.getTime() - day.getTime()) / 86_400_000;
  if (diff === 0) return "HOJE";
  if (diff === 1) return "ONTEM";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

type Row =
  | { kind: "header"; key: string; label: string }
  | { kind: "tx"; key: string; item: Transaction };

export default function TransactionsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Transaction[]>([]);
  const [chip, setChip] = useState<Chip>("Todos");
  const v = useDataVersion();

  useEffect(() => {
    initDb().then(() => listTransactions().then(setItems));
  }, [v]);

  const rows = useMemo(() => {
    const filtered = items.filter((tx) => matchesChip(tx, chip));
    const out: Row[] = [];
    let last = "";
    for (const item of filtered) {
      const label = dayLabel(item.date);
      if (label !== last) {
        out.push({ kind: "header", key: `h-${label}-${item.id}`, label });
        last = label;
      }
      out.push({ kind: "tx", key: item.id, item });
    }
    return out;
  }, [items, chip]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader eyebrow="HISTÓRICO" title="Transações" />
      <FilterChips
        options={["Todos", "PIX", "Cartão", "Débito"]}
        selected={chip}
        onSelect={(v) => setChip(v as Chip)}
      />
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={({ item: row }) =>
          row.kind === "header" ? (
            <Text style={styles.day}>{row.label}</Text>
          ) : (
            <TransactionItem
              item={row.item}
              onPress={() =>
                router.push(`/transaction/${row.item.id}` as never)
              }
            />
          )
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma transação ainda</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  day: {
    ...typography.caption,
    color: colors.textTertiary,
    textTransform: "uppercase",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  empty: {
    ...typography.small,
    textAlign: "center",
    color: colors.textTertiary,
    padding: spacing.xl,
  },
});
