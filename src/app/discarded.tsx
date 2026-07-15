import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { FilterChips } from "@/components/FilterChips";
import { NotificationItem } from "@/components/NotificationItem";
import { SearchBar } from "@/components/SearchBar";
import { colors, spacing, typography } from "@/constants/theme";
import { initDb } from "@/database/db";
import { listNotifications } from "@/database/notificationsRepo";
import { useWatchedBanks } from "@/hooks/useWatchedBanks";
import type { NotificationData } from "@/types/notification";

type StoredNotification = NotificationData & {
  parsed: boolean;
  discarded: boolean;
  createdAt: string;
};

export default function DiscardedScreen() {
  const { banks } = useWatchedBanks();
  const [items, setItems] = useState<StoredNotification[]>([]);
  const [search, setSearch] = useState("");
  const [bank, setBank] = useState<string | undefined>();
  const bankOptions = banks.map((b) => b.label);

  const load = useCallback(() => {
    listNotifications({
      discarded: true,
      search: search || undefined,
      bank,
    }).then(setItems);
  }, [search, bank]);

  useEffect(() => {
    initDb().then(load);
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar descartada..." />
        {bankOptions.length > 0 ? (
          <FilterChips options={bankOptions} selected={bank} onSelect={setBank} />
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma notificação descartada.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { padding: spacing.base, gap: spacing.sm },
  empty: {
    ...typography.small,
    textAlign: "center",
    color: colors.textTertiary,
    padding: spacing.xl,
  },
});
