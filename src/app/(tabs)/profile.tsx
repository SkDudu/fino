import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getOnlineModel,
  hasApiKey,
  onlineModelShortLabel,
} from "@/ai/aiSettings";
import { FinoMark } from "@/components/FinoMark";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsRow } from "@/components/SettingsRow";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useNotifications } from "@/hooks/useNotifications";
import { useWatchedBanks } from "@/hooks/useWatchedBanks";

export default function ProfileScreen() {
  const router = useRouter();
  const { enabled, openSettings, isAndroid } = useNotifications();
  const { banks } = useWatchedBanks();
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const [aiSubtitle, setAiSubtitle] = useState("…");

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        if (!(await hasApiKey())) {
          setAiSubtitle("Online · sem API key");
          return;
        }
        setAiSubtitle(`Online · ${onlineModelShortLabel(await getOnlineModel())}`);
      })();
    }, [])
  );
  const banksSubtitle =
    banks.length === 0
      ? "Nenhum ainda"
      : banks
          .slice(0, 3)
          .map((b) => b.label)
          .join(", ") + (banks.length > 3 ? "…" : "");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader eyebrow="CONTA" title="Perfil" />

      <View style={styles.userCard}>
        <FinoMark size={52} />
        <View style={styles.userMeta}>
          <Text style={styles.name}>Fino</Text>
          <Text style={styles.sub}>
            Listener {enabled ? "ativo" : "desativado"} · {isAndroid ? "Android" : "—"}
          </Text>
        </View>
      </View>

      <SettingsRow
        icon="notifications-outline"
        title="Acesso a notificações"
        subtitle={enabled ? "Ativo" : "Desativado"}
        subtitleColor={enabled ? colors.primary : colors.warning}
        onPress={openSettings}
      />
      <SettingsRow
        icon="card-outline"
        title="Bancos monitorados"
        subtitle={banksSubtitle}
        onPress={() => router.push("/watched-banks" as never)}
      />
      <SettingsRow
        icon="trash-outline"
        title="Notificações descartadas"
        subtitle="Abrir lista"
        onPress={() => router.push("/discarded")}
      />
      <SettingsRow
        icon="hardware-chip-outline"
        title="IA"
        subtitle={aiSubtitle}
        onPress={() => router.push("/ai-settings" as never)}
      />
      <SettingsRow
        icon="information-circle-outline"
        title="Sobre o Fino"
        subtitle={`Versão ${version}`}
        onPress={() => Alert.alert("Fino", `Versão ${version}\nOffline · dados só no aparelho`)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  userCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  userMeta: { flex: 1, gap: 2 },
  name: {
    ...typography.title,
    color: colors.text,
  },
  sub: { ...typography.small, color: colors.textTertiary },
});
