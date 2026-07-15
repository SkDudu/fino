import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";

type Props = { active: boolean };

export function StatusBadge({ active }: Props) {
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: active ? colors.primary : colors.warning }]} />
      <Text style={[styles.label, { color: active ? colors.textSecondary : colors.warning }]}>
        {active ? "Ativo" : "Desativado"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  dot: { width: 6, height: 6, borderRadius: radius.full },
  label: { ...typography.small },
});
