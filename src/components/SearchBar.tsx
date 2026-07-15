import { StyleSheet, TextInput } from "react-native";
import { colors, layout, radius, spacing, typography } from "@/constants/theme";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = "Buscar..." }: Props) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      clearButtonMode="while-editing"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: layout.inputHeight,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.elevatedSurface,
  },
});
