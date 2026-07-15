import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";

export function InsightBanner({ text }: { text: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name="bulb-outline" size={16} color={colors.accent} />
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
  },
  text: { ...typography.small, color: colors.text, flex: 1 },
});
