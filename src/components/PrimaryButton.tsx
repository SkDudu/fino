import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, layout, radius, spacing, typography } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  style,
  loading = false,
  disabled = false,
}: Props) {
  const blocked = loading || disabled;
  return (
    <Pressable
      style={[styles.btn, blocked && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={blocked}
    >
      {loading ? (
        <ActivityIndicator color={colors.buttonPrimaryText} />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
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
  btnDisabled: { opacity: 0.7 },
  text: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.buttonPrimaryText,
  },
});
