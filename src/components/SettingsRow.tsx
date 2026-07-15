import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

type Props = {
  title: string;
  subtitle: string;
  subtitleColor?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function SettingsRow({
  title,
  subtitle,
  subtitleColor = colors.textTertiary,
  icon,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.base,
    marginHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  title: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  subtitle: { ...typography.small },
});
