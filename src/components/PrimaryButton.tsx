import { Pressable, StyleSheet, Text } from "react-native";
import { colors, layout, radius, spacing, typography } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  style?: object;
};

export function PrimaryButton({ label, onPress, style }: Props) {
  return (
    <Pressable style={[styles.btn, style]} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: layout.buttonHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.lg,
  },
  text: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.buttonPrimaryText,
  },
});
