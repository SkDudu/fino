import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { NotificationItem } from "@/components/NotificationItem";
import { TransactionPreviewModal } from "@/components/TransactionPreviewModal";
import { colors, spacing, typography } from "@/constants/theme";
import { initDb } from "@/database/db";
import { listNotifications } from "@/database/notificationsRepo";
import { insertTransaction } from "@/database/transactionsRepo";
import { parseNotification } from "@/parsers/ParserEngine";
import { enrichTransaction, learnFromTransaction } from "@/services/enrichment";
import { discardPending } from "@/services/notificationPipeline";
import { bumpData, useDataVersion } from "@/store/dataVersion";
import type { NotificationData } from "@/types/notification";
import type { Transaction } from "@/types/transaction";

type StoredNotification = NotificationData & {
  parsed: boolean;
  discarded: boolean;
  createdAt: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<StoredNotification[]>([]);
  const [pending, setPending] = useState<Transaction | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const v = useDataVersion();

  const load = useCallback(() => {
    listNotifications({ discarded: false }).then(setItems);
  }, []);

  useEffect(() => {
    initDb().then(load);
  }, [load, v]);

  async function onConvert(item: StoredNotification) {
    const { transaction } = parseNotification(item);
    if (!transaction) {
      return;
    }
    const rawText = [item.title, item.text, item.subText].filter(Boolean).join(" ");
    setPending(await enrichTransaction(transaction, rawText));
    setPendingId(item.id);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onConvert={() => onConvert(item)}
            onViewTransaction={() => router.push("/transactions")}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma notificação ainda</Text>
        }
      />
      <TransactionPreviewModal
        transaction={pending}
        visible={!!pending}
        onApprove={async () => {
          if (!pending) return;
          const tx = { ...pending, approved: true };
          await insertTransaction(tx);
          await learnFromTransaction(tx);
          setPending(null);
          setPendingId(null);
          bumpData();
        }}
        onDiscard={async () => {
          if (pendingId) await discardPending(pendingId);
          setPending(null);
          setPendingId(null);
          bumpData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingTop: spacing.base, paddingBottom: spacing.xl },
  empty: {
    ...typography.small,
    textAlign: "center",
    color: colors.textTertiary,
    padding: spacing.xl,
  },
});
