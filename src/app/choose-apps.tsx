import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getInstalledApps, type InstalledApp } from "notification-listener";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SearchBar } from "@/components/SearchBar";
import { bankColor } from "@/components/bankColor";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useWatchedBanks } from "@/hooks/useWatchedBanks";

function initials(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export default function ChooseAppsScreen() {
  const router = useRouter();
  const { banks, replace } = useWatchedBanks();
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setApps(getInstalledApps());
  }, []);

  useEffect(() => {
    setSelected(new Set(banks.map((b) => b.packageName)));
  }, [banks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
    );
  }, [apps, search]);

  function toggle(pkg: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  }

  async function continueFlow() {
    const next = apps
      .filter((a) => selected.has(a.packageName))
      .map((a) => ({ packageName: a.packageName, label: a.label }));
    await replace(next);
    router.replace("/watched-banks" as never);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>APPS DO CELULAR</Text>
          <Text style={styles.title}>Escolher bancos</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar app…" />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.packageName}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const on = selected.has(item.packageName);
          return (
            <Pressable style={styles.row} onPress={() => toggle(item.packageName)}>
              <View style={[styles.icon, { backgroundColor: bankColor(item.label) }]}>
                <Text style={styles.iconText}>{initials(item.label)}</Text>
              </View>
              <View style={styles.meta}>
                <Text style={styles.label} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.sub}>Instalado</Text>
              </View>
              <View style={[styles.check, on && styles.checkOn]}>
                {on ? (
                  <Ionicons name="checkmark" size={14} color={colors.buttonPrimaryText} />
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum app encontrado</Text>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.count}>
          {selected.size} app{selected.size === 1 ? "" : "s"} selecionado
          {selected.size === 1 ? "" : "s"}
        </Text>
        <PrimaryButton
          label="Continuar"
          onPress={continueFlow}
          style={styles.cta}
        />
      </View>
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
    paddingBottom: spacing.base,
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
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.base },
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
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  empty: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: "center",
    padding: spacing.xl,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  count: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
  },
  cta: { marginHorizontal: spacing.lg },
});
