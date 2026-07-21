import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

type Props = {
  eyebrow: string;
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function ScreenHeader({ eyebrow, title, leading, trailing }: Props) {
  return (
    <View style={styles.row}>
      {leading}
      <View style={styles.left}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  left: { gap: 2, flex: 1 },
  eyebrow: {
    ...typography.caption,
    color: colors.textTertiary,
    textTransform: "uppercase",
  },
  title: { ...typography.h2, color: colors.text },
});
