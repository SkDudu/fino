import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NotificationData } from "@/types/notification";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { bankColor } from "./bankColor";
import { formatRelative } from "./formatRelative";

type Stored = NotificationData & { parsed: boolean };

type Props = {
  item: Stored;
  onConvert?: () => void;
  onViewTransaction?: () => void;
};

export function NotificationItem({ item, onConvert, onViewTransaction }: Props) {
  const bank = item.appName || "(sem app)";
  const title =
    [item.title, item.text].filter(Boolean).join(" — ") || "(sem texto)";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.bankRow}>
          <View style={[styles.dot, { backgroundColor: bankColor(bank) }]} />
          <Text style={styles.bank}>{bank}</Text>
        </View>
        <Text style={styles.time}>{formatRelative(item.timestamp)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.status}>
          {item.parsed
            ? "Convertida automaticamente"
            : "Pronta para converter em transação"}
        </Text>
      </View>
      {item.parsed ? (
        onViewTransaction ? (
          <Pressable onPress={onViewTransaction}>
            <Text style={styles.link}>Ver transação</Text>
          </Pressable>
        ) : null
      ) : onConvert ? (
        <Pressable style={styles.convertBtn} onPress={onConvert}>
          <Text style={styles.convertText}>Converter</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bankRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  bank: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  time: { ...typography.caption, color: colors.textTertiary },
  body: { gap: spacing.xs },
  title: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  status: { ...typography.caption, color: colors.textTertiary },
  convertBtn: {
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  convertText: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.primary,
  },
  link: {
    ...typography.small,
    color: colors.secondary,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
});
