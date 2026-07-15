import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CategoryBar } from "@/components/CategoryBar";
import { InsightBanner } from "@/components/InsightBanner";
import {
  applyInsightFilters,
  EMPTY_FILTERS,
  filterCount,
  type InsightFilters,
} from "@/components/insightFilters";
import { InsightsFilterSheet } from "@/components/InsightsFilterSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import { formatCurrency } from "@/components/formatCurrency";
import { pickInsight } from "@/components/pickInsight";
import { transactionTypeLabel } from "@/components/transactionLabels";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { initDb } from "@/database/db";
import { listTransactions } from "@/database/transactionsRepo";
import { useDataVersion } from "@/store/dataVersion";
import type { Transaction } from "@/types/transaction";

const BAR_COLORS = [
  colors.primary,
  colors.secondary,
  colors.accent,
  colors.textTertiary,
];

function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

type ActiveChip = { key: string; label: string; clear: () => void };

export default function InsightsScreen() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<InsightFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<InsightFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const v = useDataVersion();

  useEffect(() => {
    initDb().then(() => listTransactions().then(setItems));
  }, [v]);

  const banks = useMemo(
    () => [...new Set(items.map((t) => t.bank))].sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const { total, prevTotal, categories, tip } = useMemo(() => {
    const cur = monthRange(0);
    const prev = monthRange(-1);
    const thisMonth = applyInsightFilters(
      items.filter((tx) => tx.approved && tx.date >= cur.from && tx.date < cur.to),
      filters
    );
    const lastMonth = applyInsightFilters(
      items.filter((tx) => tx.approved && tx.date >= prev.from && tx.date < prev.to),
      filters
    );
    const total = thisMonth.reduce((s, t) => s + t.amount, 0);
    const prevTotal = lastMonth.reduce((s, t) => s + t.amount, 0);

    const map = new Map<string, number>();
    for (const tx of thisMonth) {
      const cat = tx.category || "Outros";
      map.set(cat, (map.get(cat) ?? 0) + tx.amount);
    }
    const categories = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, amount]) => ({ label, amount }));

    const tip = pickInsight({
      spent: total,
      received: 0,
      topCategory: categories[0],
      trendPct: prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : undefined,
    });

    return { total, prevTotal, categories, tip };
  }, [items, filters]);

  const n = filterCount(filters);
  const trend =
    prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : total > 0 ? 100 : 0;
  const max = Math.max(...categories.map((c) => c.amount), 1);

  const activeChips: ActiveChip[] = [
    ...filters.categories.map((c) => ({
      key: `c:${c}`,
      label: c,
      clear: () =>
        setFilters((f) => ({
          ...f,
          categories: f.categories.filter((x) => x !== c),
        })),
    })),
    ...filters.banks.map((b) => ({
      key: `b:${b}`,
      label: b,
      clear: () =>
        setFilters((f) => ({ ...f, banks: f.banks.filter((x) => x !== b) })),
    })),
    ...filters.types.map((t) => ({
      key: `t:${t}`,
      label: transactionTypeLabel(t),
      clear: () =>
        setFilters((f) => ({ ...f, types: f.types.filter((x) => x !== t) })),
    })),
  ];

  function openSheet() {
    setDraft(filters);
    setSheetOpen(true);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        eyebrow="ANÁLISE"
        title="Insights"
        trailing={<Text style={styles.period}>Este mês</Text>}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        <Pressable style={[styles.chip, n > 0 && styles.chipOn]} onPress={openSheet}>
          <Ionicons
            name="options-outline"
            size={14}
            color={n > 0 ? colors.primary : colors.primary}
          />
          <Text style={[styles.chipText, n > 0 && styles.chipTextOn]}>
            {n > 0 ? `${n} filtros` : "Filtros"}
          </Text>
        </Pressable>
        {n === 0 ? (
          <>
            <Pressable style={styles.chipMuted} onPress={openSheet}>
              <Text style={styles.chipMutedText}>Categorias</Text>
            </Pressable>
            <Pressable style={styles.chipMuted} onPress={openSheet}>
              <Text style={styles.chipMutedText}>Bancos</Text>
            </Pressable>
            <Pressable style={styles.chipMuted} onPress={openSheet}>
              <Text style={styles.chipMutedText}>Tipos</Text>
            </Pressable>
          </>
        ) : (
          activeChips.map((c) => (
            <Pressable key={c.key} style={styles.chipOn} onPress={c.clear}>
              <Text style={styles.chipTextOn}>{c.label}</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Gasto total</Text>
          <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
          <Text style={styles.trend}>
            {trend <= 0 ? "↓" : "↑"} {Math.abs(Math.round(trend))}% vs mês passado
          </Text>
        </View>

        <Text style={styles.section}>
          Por categoria{n > 0 ? " · filtrado" : ""}
        </Text>
        {categories.length === 0 ? (
          <Text style={styles.empty}>Nenhuma transação ainda</Text>
        ) : (
          categories.map((c, i) => (
            <CategoryBar
              key={c.label}
              label={c.label}
              amount={c.amount}
              ratio={c.amount / max}
              barColor={BAR_COLORS[i % BAR_COLORS.length]}
            />
          ))
        )}

        <View style={styles.tip}>
          <InsightBanner text={tip} />
        </View>
      </ScrollView>

      <InsightsFilterSheet
        visible={sheetOpen}
        draft={draft}
        banks={banks}
        onChange={setDraft}
        onClear={() => setDraft(EMPTY_FILTERS)}
        onApply={() => {
          setFilters(draft);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chipScroll: { flexGrow: 0, marginBottom: spacing.base },
  chipRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  chipMuted: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.elevatedSurface,
  },
  chipMutedText: { ...typography.small, color: colors.textSecondary },
  chipOn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipText: { ...typography.small, color: colors.text },
  chipTextOn: { ...typography.small, color: colors.primary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing["2xl"] },
  period: { ...typography.small, color: colors.secondary },
  summary: {
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  summaryLabel: { ...typography.small, color: colors.textTertiary },
  summaryValue: { ...typography.h1, color: colors.text },
  trend: { ...typography.caption, color: colors.success },
  section: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.base,
  },
  empty: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: "center",
    padding: spacing.base,
  },
  tip: { marginTop: spacing.base, marginHorizontal: -spacing.lg },
});
