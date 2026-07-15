import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

type Props = {
  eyebrow: string;
  title: string;
  trailing?: ReactNode;
};

export function ScreenHeader({ eyebrow, title, trailing }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  left: { gap: 2 },
  eyebrow: {
    ...typography.caption,
    color: colors.textTertiary,
    textTransform: "uppercase",
  },
  title: { ...typography.h2, color: colors.text },
});
