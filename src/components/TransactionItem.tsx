import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Transaction } from "@/types/transaction";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatCurrency } from "./formatCurrency";
import { formatTime } from "./formatRelative";
import { transactionTypeLabel } from "./transactionLabels";

function isIncome(type: Transaction["type"]) {
  return type === "income" || type === "pix_received";
}

function iconFor(tx: Transaction): keyof typeof Ionicons.glyphMap {
  if (tx.type === "pix_received" || tx.type === "pix_sent") return "arrow-up";
  if (tx.category === "Transporte") return "car-outline";
  if (tx.category === "Saúde") return "medical-outline";
  return "restaurant-outline";
}

function typeHint(tx: Transaction): string {
  if (isIncome(tx.type)) return "Recebido";
  if (tx.paymentMethod === "debit_card") return "Débito";
  if (tx.paymentMethod === "credit_card") return "Cartão";
  if (tx.type.startsWith("pix")) return "PIX";
  return transactionTypeLabel(tx.type);
}

export function TransactionItem({
  item,
  onPress,
}: {
  item: Transaction;
  onPress?: () => void;
}) {
  const income = isIncome(item.type);
  const amount = `${income ? "+" : "-"}${formatCurrency(item.amount)}`;

  const body = (
    <>
      <View style={styles.icon}>
        <Ionicons name={iconFor(item)} size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={1}>
          {item.merchant ?? item.description}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {item.bank} · {typeHint(item)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, income ? styles.amountIn : styles.amountOut]}>
          {amount}
        </Text>
        <Text style={styles.time}>{formatTime(new Date(item.date).getTime())}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.row} onPress={onPress}>
        {body}
      </Pressable>
    );
  }

  return <View style={styles.row}>{body}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.elevatedSurface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mid: { flex: 1, gap: 2 },
  title: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  sub: { ...typography.caption, color: colors.textTertiary },
  right: { width: 88, alignItems: "flex-end", gap: 2, flexShrink: 0 },
  amount: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  amountIn: { color: colors.primary },
  amountOut: { color: colors.error },
  time: { ...typography.caption, color: colors.textTertiary },
});
