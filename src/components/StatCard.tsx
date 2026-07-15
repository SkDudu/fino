import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatCurrency } from "./formatCurrency";

type Props = {
  label: string;
  amount: number;
  tone: "error" | "success";
};

export function StatCard({ label, amount, tone }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          { color: tone === "error" ? colors.error : colors.success },
        ]}
      >
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}

export function StatCardsRow({
  spent,
  received,
}: {
  spent: number;
  received: number;
}) {
  return (
    <View style={styles.row}>
      <StatCard label="Gasto" amount={spent} tone="error" />
      <StatCard label="Recebido" amount={received} tone="success" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  card: {
    flex: 1,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  label: { ...typography.caption, color: colors.textTertiary },
  value: { ...typography.title, fontFamily: typography.title.fontFamily },
});
