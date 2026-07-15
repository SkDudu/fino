import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  FILTER_TYPES,
  toggleIn,
  type InsightFilters,
} from "@/components/insightFilters";
import { transactionTypeLabel } from "@/components/transactionLabels";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { CATEGORIES } from "@/parsers/categorize";

type Props = {
  visible: boolean;
  draft: InsightFilters;
  banks: string[];
  onChange: (next: InsightFilters) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
};

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

export function InsightsFilterSheet({
  visible,
  draft,
  banks,
  onChange,
  onClear,
  onApply,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Filtros</Text>
            <Pressable onPress={onClear} hitSlop={8}>
              <Text style={styles.clear}>Limpar</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Section title="CATEGORIAS">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  selected={draft.categories.includes(c)}
                  onPress={() =>
                    onChange({ ...draft, categories: toggleIn(draft.categories, c) })
                  }
                />
              ))}
            </Section>

            <Section title="BANCOS">
              {banks.length === 0 ? (
                <Text style={styles.empty}>Nenhum banco nas transações</Text>
              ) : (
                banks.map((b) => (
                  <Chip
                    key={b}
                    label={b}
                    selected={draft.banks.includes(b)}
                    onPress={() =>
                      onChange({ ...draft, banks: toggleIn(draft.banks, b) })
                    }
                  />
                ))
              )}
            </Section>

            <Section title="TIPOS">
              {FILTER_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={transactionTypeLabel(t)}
                  selected={draft.types.includes(t)}
                  onPress={() =>
                    onChange({ ...draft, types: toggleIn(draft.types, t) })
                  }
                />
              ))}
            </Section>
          </ScrollView>

          <PrimaryButton
            label="Aplicar filtros"
            onPress={onApply}
            style={styles.apply}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["2xl"],
    gap: spacing.lg,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.textTertiary,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { ...typography.title, color: colors.text },
  clear: { ...typography.small, color: colors.textTertiary },
  body: { flexGrow: 0 },
  bodyContent: { gap: spacing.lg, paddingBottom: spacing.sm },
  section: { gap: 10 },
  sectionTitle: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.elevatedSurface,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: { ...typography.small, color: colors.textSecondary },
  chipTextOn: { color: colors.primary },
  empty: { ...typography.small, color: colors.textTertiary },
  apply: { marginHorizontal: 0 },
});
