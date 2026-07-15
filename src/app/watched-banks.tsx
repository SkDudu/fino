import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bankColor } from "@/components/bankColor";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useWatchedBanks } from "@/hooks/useWatchedBanks";

function initials(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export default function WatchedBanksScreen() {
  const router = useRouter();
  const { banks, remove } = useWatchedBanks();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>ACOMPANHAMENTO</Text>
          <Text style={styles.title}>Bancos monitorados</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        {banks.length} app{banks.length === 1 ? "" : "s"} · toque em Remover para
        parar de acompanhar
      </Text>

      <FlatList
        data={banks}
        keyExtractor={(item) => item.packageName}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum banco ainda. Adicione apps abaixo.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: bankColor(item.label) }]}>
              <Text style={styles.iconText}>{initials(item.label)}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.label} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.sub}>Acompanhando</Text>
            </View>
            <Pressable
              style={styles.remove}
              onPress={() => remove(item.packageName)}
            >
              <Text style={styles.removeText}>Remover</Text>
            </Pressable>
          </View>
        )}
      />

      <Pressable
        style={styles.addBtn}
        onPress={() => router.push("/choose-apps" as never)}
      >
        <Text style={styles.addText}>+ Adicionar outro</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  title: { ...typography.h3, color: colors.text },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
  },
  list: { paddingHorizontal: spacing.lg, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: "#FFFFFF",
  },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  label: { ...typography.body, fontFamily: typography.title.fontFamily, color: colors.text },
  sub: { ...typography.caption, color: colors.textTertiary },
  remove: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "#EF44441F",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    fontSize: 13,
    fontFamily: typography.title.fontFamily,
    color: colors.error,
  },
  empty: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: "center",
    padding: spacing.xl,
  },
  addBtn: {
    height: 56,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.primary,
  },
});
