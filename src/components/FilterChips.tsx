import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";

type Props = {
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function FilterChips({ options, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {options.map((opt) => (
        <Pressable
          key={opt}
          style={[styles.chip, selected === opt && styles.chipActive]}
          onPress={() => onSelect(opt)}
        >
          <Text
            style={[styles.chipText, selected === opt && styles.chipTextActive]}
          >
            {opt}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexGrow: 0, marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.lg },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.small, color: colors.text },
  chipTextActive: {
    color: colors.buttonPrimaryText,
    fontFamily: typography.title.fontFamily,
  },
});
