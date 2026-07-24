import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FilterChips } from "@/components/FilterChips";
import { NotificationItem } from "@/components/NotificationItem";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { initDb } from "@/database/db";
import { listNotifications } from "@/database/notificationsRepo";
import {
  analyzeNotification,
  discardPending,
} from "@/services/notificationPipeline";
import { bumpData, useDataVersion } from "@/store/dataVersion";
import type { NotificationData } from "@/types/notification";

type StoredNotification = NotificationData & {
  parsed: boolean;
  discarded: boolean;
  createdAt: string;
};

const CHIPS = ["Pendentes", "Convertidas", "Todas"] as const;
type Chip = (typeof CHIPS)[number];

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<StoredNotification[]>([]);
  const [chip, setChip] = useState<Chip>("Pendentes");
  const v = useDataVersion();

  const load = useCallback(() => {
    listNotifications({ discarded: false }).then(setItems);
  }, []);

  useEffect(() => {
    initDb().then(load);
  }, [load, v]);

  const pendingCount = useMemo(
    () => items.filter((n) => !n.parsed).length,
    [items]
  );

  const visible = useMemo(() => {
    if (chip === "Pendentes") return items.filter((n) => !n.parsed);
    if (chip === "Convertidas") return items.filter((n) => n.parsed);
    return items;
  }, [items, chip]);

  const empty =
    chip === "Convertidas"
      ? "Nenhuma convertida ainda"
      : chip === "Todas"
        ? "Nenhuma notificação ainda"
        : "Nada pendente — tudo analisado ou descartado";

  const badge =
    chip === "Convertidas"
      ? `${items.length - pendingCount} convertidas`
      : chip === "Todas"
        ? `${items.length} no total`
        : pendingCount > 0
          ? `${pendingCount} pendentes`
          : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        eyebrow="INBOX"
        title="Notificações"
        leading={
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        }
        trailing={
          badge ? <Text style={styles.badge}>{badge}</Text> : null
        }
      />
      <FilterChips
        options={CHIPS}
        selected={chip}
        onSelect={(v) => setChip(v as Chip)}
      />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onConvert={
              item.parsed
                ? undefined
                : async () => {
                    const tx = await analyzeNotification(item);
                    bumpData();
                    if (tx) {
                      router.push("/transactions");
                      return;
                    }
                    Alert.alert(
                      "Sem valor",
                      "Não foi possível extrair um lançamento. A notificação continua pendente."
                    );
                  }
            }
            onDiscard={
              item.parsed
                ? undefined
                : async () => {
                    await discardPending(item.id);
                    bumpData();
                  }
            }
            onViewTransaction={
              item.parsed
                ? () => router.push("/transactions")
                : undefined
            }
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{empty}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badge: {
    ...typography.caption,
    fontFamily: typography.title.fontFamily,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  list: { paddingTop: spacing.base, paddingBottom: spacing.xl },
  empty: {
    ...typography.small,
    textAlign: "center",
    color: colors.textTertiary,
    padding: spacing.xl,
  },
});
