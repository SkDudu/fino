import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

type Props = {
  title: string;
  href: "/transactions" | "/notifications";
};

export function SectionHeader({ title, href }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <Link href={href} style={styles.link}>
        Ver todas
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  link: { ...typography.small, color: colors.secondary },
});
