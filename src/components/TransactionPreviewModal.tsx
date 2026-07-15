import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { Transaction } from "@/types/transaction";
import { colors, layout, radius, spacing, typography } from "@/constants/theme";
import { formatCurrency } from "./formatCurrency";
import { paymentMethodLabel, transactionTypeLabel } from "./transactionLabels";

type Props = {
  transaction: Transaction | null;
  visible: boolean;
  onApprove: () => void;
  onDiscard: () => void;
};

export function TransactionPreviewModal({
  transaction,
  visible,
  onApprove,
  onDiscard,
}: Props) {
  if (!transaction) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Nova transação</Text>
          <Text style={styles.label}>Banco</Text>
          <Text style={styles.value}>{transaction.bank}</Text>
          <Text style={styles.label}>Valor</Text>
          <Text style={styles.amount}>{formatCurrency(transaction.amount)}</Text>
          <Text style={styles.label}>Descrição</Text>
          <Text style={styles.value}>{transaction.description}</Text>
          {transaction.merchant ? (
            <>
              <Text style={styles.label}>Estabelecimento</Text>
              <Text style={styles.value}>{transaction.merchant}</Text>
            </>
          ) : null}
          <Text style={styles.label}>Categoria</Text>
          <Text style={styles.value}>{transaction.category ?? "Outros"}</Text>
          {transaction.aiConfidence != null ? (
            <>
              <Text style={styles.label}>Confiança</Text>
              <Text style={styles.value}>
                {Math.round(transaction.aiConfidence * 100)}% ·{" "}
                {transaction.aiModel ?? "—"}
              </Text>
            </>
          ) : null}
          <Text style={styles.label}>Forma de pagamento</Text>
          <Text style={styles.value}>
            {paymentMethodLabel(transaction.paymentMethod)} ·{" "}
            {transactionTypeLabel(transaction.type)}
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.discardBtn} onPress={onDiscard}>
              <Text style={styles.discardText}>Descartar</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={onApprove}>
              <Text style={styles.saveText}>Salvar transação</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.elevatedSurface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.sm },
  label: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
  value: { ...typography.body, color: colors.text },
  amount: { ...typography.h2, color: colors.primary },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  discardBtn: {
    flex: 1,
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  discardText: { ...typography.body, color: colors.primary },
  saveBtn: {
    flex: 1,
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.buttonPrimaryText,
  },
});
