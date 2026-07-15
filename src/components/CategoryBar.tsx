import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatCurrency } from "./formatCurrency";

type Props = {
  label: string;
  amount: number;
  ratio: number;
  barColor: string;
};

export function CategoryBar({ label, amount, ratio, barColor }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.amount}>{formatCurrency(amount)}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.max(4, Math.min(100, ratio * 100))}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { ...typography.small, color: colors.text },
  amount: { ...typography.small, color: colors.textSecondary },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.elevatedSurface,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: radius.full },
});
