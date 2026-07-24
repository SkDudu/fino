import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchBar } from "@/components/SearchBar";
import { colors, layout, radius, spacing, typography } from "@/constants/theme";
import {
  deleteChatThread,
  groupThreads,
  listChatThreads,
  renameChatThread,
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

type Sheet =
  | { kind: "actions"; thread: ChatThreadSummary }
  | { kind: "rename"; thread: ChatThreadSummary }
  | { kind: "delete"; thread: ChatThreadSummary };

export default function ConversationsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

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

  function openActions(thread: ChatThreadSummary) {
    setSheet({ kind: "actions", thread });
  }

  function openRename(thread: ChatThreadSummary) {
    setRenameDraft(thread.title);
    setSheet({ kind: "rename", thread });
  }

  async function saveRename() {
    if (!sheet || sheet.kind !== "rename") return;
    await renameChatThread(sheet.thread.id, renameDraft);
    setSheet(null);
    load();
  }

  async function confirmDelete() {
    if (!sheet || sheet.kind !== "delete") return;
    await deleteChatThread(sheet.thread.id);
    setSheet(null);
    load();
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        eyebrow="HISTÓRICO"
        title="Conversas"
        leading={
          <HeaderBtn icon="chevron-back" onPress={() => router.back()} />
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
            <View style={[styles.row, isNow && styles.rowActive]}>
              <Pressable
                style={styles.rowMain}
                onPress={() => openThread(t.id)}
                onLongPress={() => openActions(t)}
                delayLongPress={280}
                accessibilityRole="button"
                accessibilityLabel={t.title}
              >
                <View
                  style={[styles.rowIcon, isNow ? styles.rowIconActive : null]}
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
              <Pressable
                style={styles.moreBtn}
                onPress={() => openActions(t)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Ações de ${t.title}`}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color={colors.textTertiary}
                />
              </Pressable>
            </View>
          );
        }}
      />

      <Modal
        visible={sheet != null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSheet(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />

            {sheet?.kind === "actions" ? (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetEyebrow}>CONVERSA</Text>
                  <Text style={styles.sheetTitle} numberOfLines={1}>
                    {sheet.thread.title}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.actionRow}
                    onPress={() => openRename(sheet.thread)}
                  >
                    <View style={styles.actionIcon}>
                      <Ionicons
                        name="pencil-outline"
                        size={18}
                        color={colors.text}
                      />
                    </View>
                    <Text style={styles.actionLabel}>Renomear</Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionRow}
                    onPress={() =>
                      setSheet({ kind: "delete", thread: sheet.thread })
                    }
                  >
                    <View style={[styles.actionIcon, styles.actionIconDanger]}>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.error}
                      />
                    </View>
                    <Text style={[styles.actionLabel, styles.actionDanger]}>
                      Apagar
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setSheet(null)}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
              </>
            ) : null}

            {sheet?.kind === "rename" ? (
              <>
                <View style={styles.renameHeader}>
                  <Text style={styles.renameTitle}>Renomear</Text>
                  <Pressable onPress={() => setSheet(null)} hitSlop={8}>
                    <Text style={styles.renameCancel}>Cancelar</Text>
                  </Pressable>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>NOME</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={renameDraft}
                    onChangeText={setRenameDraft}
                    autoFocus
                    selectTextOnFocus
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <Pressable
                  style={[
                    styles.saveBtn,
                    !renameDraft.trim() && styles.saveBtnDisabled,
                  ]}
                  disabled={!renameDraft.trim()}
                  onPress={() => void saveRename()}
                >
                  <Text style={styles.saveText}>Salvar</Text>
                </Pressable>
              </>
            ) : null}

            {sheet?.kind === "delete" ? (
              <>
                <View style={styles.deleteHeader}>
                  <View style={styles.deleteIconWrap}>
                    <Ionicons
                      name="trash-outline"
                      size={24}
                      color={colors.error}
                    />
                  </View>
                  <Text style={styles.deleteTitle}>Apagar conversa?</Text>
                  <Text style={styles.deleteBody}>
                    “{sheet.thread.title}” será removida. Essa ação não pode ser
                    desfeita.
                  </Text>
                </View>
                <View style={styles.deleteBtns}>
                  <Pressable
                    style={styles.deleteConfirm}
                    onPress={() => void confirmDelete()}
                  >
                    <Text style={styles.deleteConfirmText}>Apagar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setSheet(null)}
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
    gap: spacing.sm,
    paddingVertical: 14,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.lg,
  },
  rowActive: { backgroundColor: colors.surface },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minWidth: 0,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
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
  rowTitle: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
    flex: 1,
  },
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#0000008C",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["2xl"],
    gap: spacing.base,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.divider,
  },
  sheetHeader: { gap: 2 },
  sheetEyebrow: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
  },
  actions: { gap: spacing.sm },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.elevatedSurface,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionIconDanger: { backgroundColor: "#EF44441F" },
  actionLabel: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
    flex: 1,
  },
  actionDanger: { color: colors.error },
  cancelBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.elevatedSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  renameHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  renameTitle: { ...typography.h3, color: colors.text },
  renameCancel: { ...typography.body, color: colors.textTertiary },
  field: { gap: spacing.sm },
  fieldLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  fieldInput: {
    height: layout.inputHeight,
    borderRadius: radius.input,
    paddingHorizontal: spacing.base,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.elevatedSurface,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.buttonPrimaryText,
  },
  deleteHeader: { alignItems: "center", gap: spacing.md, paddingTop: spacing.sm },
  deleteIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: "#EF44441F",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteTitle: { ...typography.h3, color: colors.text },
  deleteBody: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },
  deleteBtns: { gap: spacing.sm },
  deleteConfirm: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
});
