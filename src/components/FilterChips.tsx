import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";

type Props = {
  options: string[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
};

export function FilterChips({ options, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      <Chip label="Todos" active={!selected} onPress={() => onSelect(undefined)} />
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          active={selected === opt}
          onPress={() => onSelect(opt)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexGrow: 0, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.small, color: colors.text },
  chipTextActive: { color: colors.buttonPrimaryText, fontFamily: typography.title.fontFamily },
});
