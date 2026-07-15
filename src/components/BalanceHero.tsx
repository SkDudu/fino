import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";
import { formatCurrency } from "./formatCurrency";

export function BalanceHero({ balance }: { balance: number }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Saldo do dia</Text>
      <Text style={styles.value}>{formatCurrency(balance)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  label: { ...typography.small, color: colors.textTertiary },
  value: { ...typography.h1, color: colors.text },
});
