import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCurrency } from "@/components/formatCurrency";
import { formatTime } from "@/components/formatRelative";
import {
  paymentMethodLabel,
  transactionTypeLabel,
} from "@/components/transactionLabels";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { initDb } from "@/database/db";
import { getNotificationById } from "@/database/notificationsRepo";
import { getTransactionById } from "@/database/transactionsRepo";
import type { NotificationData } from "@/types/notification";
import type { Transaction } from "@/types/transaction";

function isIncome(type: Transaction["type"]) {
  return type === "income" || type === "pix_received";
}

function dayHint(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (start.getTime() - day.getTime()) / 86_400_000;
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function Row({
  label,
  value,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last ? styles.rowLast : null]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stackRow}>
      <Text style={styles.stackLabel}>{label}</Text>
      <Text style={styles.stackValue}>{value}</Text>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [notif, setNotif] = useState<(NotificationData & { parsed: boolean }) | null>(
    null
  );

  useEffect(() => {
    if (!id) return;
    initDb().then(async () => {
      const t = await getTransactionById(id);
      setTx(t);
      if (t?.notificationId) {
        setNotif(await getNotificationById(t.notificationId));
      }
    });
  }, [id]);

  if (!tx) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TRANSAÇÕES</Text>
            <Text style={styles.title}>Detalhe</Text>
          </View>
        </View>
        <Text style={styles.empty}>Transação não encontrada</Text>
      </SafeAreaView>
    );
  }

  const income = isIncome(tx.type);
  const amount = `${income ? "+" : "-"}${formatCurrency(tx.amount)}`;
  const cat =
    [tx.category, tx.subcategory].filter(Boolean).join(" · ") || "—";
  const pay = [
    paymentMethodLabel(tx.paymentMethod),
    tx.cardFinal ? `final ${tx.cardFinal}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const notifText = notif
    ? [notif.text, notif.subText].filter(Boolean).join(" · ") || "—"
    : tx.rawText ?? "—";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>TRANSAÇÕES</Text>
          <Text style={styles.title}>Detalhe</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.merchant}>
            {tx.merchant ?? tx.description}
          </Text>
          <Text
            style={[styles.amount, income ? styles.amountIn : styles.amountOut]}
          >
            {amount}
          </Text>
          <Text style={styles.meta}>
            {dayHint(tx.date)} · {formatTime(new Date(tx.date).getTime())} ·{" "}
            {tx.bank}
          </Text>
        </View>

        <Section title="TRANSAÇÃO">
          <Row
            label="Tipo"
            value={`${transactionTypeLabel(tx.type)} · ${paymentMethodLabel(tx.paymentMethod)}`}
          />
          <Row label="Categoria" value={cat} />
          <Row label="Cartão" value={pay || "—"} last />
        </Section>

        <Section title="NOTIFICAÇÃO">
          <StackRow label="Título" value={notif?.title ?? "—"} />
          <StackRow label="Texto" value={notifText} />
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Banco</Text>
            <Text style={styles.rowValue}>{tx.bank}</Text>
          </View>
        </Section>

        <Section title="ENRIQUECIMENTO IA">
          <Row
            label="Modelo"
            value={tx.aiModel ?? "—"}
            valueColor={tx.aiModel ? colors.primary : undefined}
          />
          <Row
            label="Confiança"
            value={
              tx.aiConfidence != null
                ? `${Math.round(tx.aiConfidence * 100)}%`
                : "—"
            }
          />
          <Row label="Merchant" value={tx.merchant ?? "—"} />
          <Row label="Marca" value={tx.brand ?? "—"} />
          <Row label="Categoria" value={tx.category ?? "—"} />
          <Row label="Subcategoria" value={tx.subcategory ?? "—"} />
          <View style={[styles.stackRow, styles.rowLast]}>
            <Text style={styles.stackLabel}>raw_text (chave)</Text>
            <Text style={styles.stackValue}>{tx.rawText ?? "—"}</Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
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
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
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
  empty: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: "center",
    padding: spacing.xl,
  },
  scroll: { paddingBottom: spacing["2xl"] },
  hero: {
    alignItems: "center",
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  merchant: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.textSecondary,
  },
  amount: {
    ...typography.display,
    letterSpacing: -0.5,
  },
  amountIn: { color: colors.primary },
  amountOut: { color: colors.error },
  meta: { ...typography.caption, color: colors.textTertiary },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    ...typography.small,
    color: colors.textTertiary,
    width: 110,
    flexShrink: 0,
  },
  rowValue: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },
  stackRow: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  stackLabel: { ...typography.caption, color: colors.textTertiary },
  stackValue: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
});
