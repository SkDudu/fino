import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchBar } from "@/components/SearchBar";
import { colors, radius, spacing, typography } from "@/constants/theme";
import {
  groupThreads,
  listChatThreads,
  threadTimeLabel,
  type ChatThreadSummary,
} from "@/database/chatRepo";
import { initDb } from "@/database/db";

function HeaderBtn({
  onPress,
  primary,
  icon,
}: {
  onPress: () => void;
  primary?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.iconBtn, primary && styles.iconBtnPrimary]}
      accessibilityRole="button"
    >
      <Ionicons
        name={icon}
        size={20}
        color={primary ? colors.buttonPrimaryText : colors.text}
      />
    </Pressable>
  );
}

export default function ConversationsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);

  const load = useCallback(() => {
    void initDb()
      .then(() => listChatThreads(search))
      .then(setThreads);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = useMemo(() => groupThreads(threads), [threads]);
  const flat = useMemo(
    () =>
      sections.flatMap((s) => [
        { kind: "header" as const, key: `h-${s.label}`, label: s.label },
        ...s.items.map((t) => ({ kind: "row" as const, key: t.id, thread: t })),
      ]),
    [sections]
  );

  function openThread(id: string) {
    router.replace({ pathname: "/(tabs)/ai", params: { id } } as never);
  }

  function newChat() {
    router.replace({ pathname: "/(tabs)/ai", params: { new: "1" } } as never);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        eyebrow="HISTÓRICO"
        title="Conversas"
        leading={
          <HeaderBtn
            icon="chevron-back"
            onPress={() => router.back()}
          />
        }
        trailing={<HeaderBtn icon="add" primary onPress={newChat} />}
      />
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar conversas…"
        />
      </View>
      <FlatList
        data={flat}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma conversa ainda.</Text>
        }
        renderItem={({ item }) => {
          if (item.kind === "header") {
            return <Text style={styles.section}>{item.label}</Text>;
          }
          const t = item.thread;
          const time = threadTimeLabel(t.updatedAt);
          const isNow = time === "Agora";
          return (
            <Pressable
              style={[styles.row, isNow && styles.rowActive]}
              onPress={() => openThread(t.id)}
              accessibilityRole="button"
              accessibilityLabel={t.title}
            >
              <View
                style={[
                  styles.rowIcon,
                  isNow ? styles.rowIconActive : null,
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={isNow ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.rowCopy}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text
                    style={[styles.rowTime, isNow && styles.rowTimeActive]}
                  >
                    {time}
                  </Text>
                </View>
                <Text style={styles.rowPreview} numberOfLines={1}>
                  {t.preview || "Sem mensagens"}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBtnPrimary: { backgroundColor: colors.primary },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 4 },
  section: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  rowActive: { backgroundColor: colors.surface },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.elevatedSurface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowIconActive: { backgroundColor: colors.primarySoft },
  rowCopy: { flex: 1, gap: 4 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  rowTitle: { ...typography.body, fontFamily: typography.title.fontFamily, color: colors.text, flex: 1 },
  rowTime: {
    ...typography.caption,
    color: colors.textTertiary,
    flexShrink: 0,
  },
  rowTimeActive: { color: colors.primary },
  rowPreview: { ...typography.small, color: colors.textSecondary },
  empty: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: "center",
    padding: spacing.xl,
  },
});
