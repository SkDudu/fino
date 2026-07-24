import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isModelInstalled } from "@/ai/AIService";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsRow } from "@/components/SettingsRow";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { listWatchedBanks, replaceWatchedBanks } from "@/database/watchedBanksRepo";
import { useNotifications } from "@/hooks/useNotifications";
import { useWatchedBanks } from "@/hooks/useWatchedBanks";
import { processNotification } from "@/services/notificationPipeline";
import { bumpData } from "@/store/dataVersion";
import type { SimType } from "@/dev/simulateNotification";
import { buildSimPayload, SIM_BANKS } from "@/dev/simulateNotification";

const SIM_VALUES = [10, 25, 50, 200];

export default function ProfileScreen() {
  const router = useRouter();
  const { enabled, openSettings, isAndroid } = useNotifications();
  const { banks } = useWatchedBanks();
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const [aiInstalled, setAiInstalled] = useState(false);

  const [bankModal, setBankModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      isModelInstalled().then(setAiInstalled);
    }, [])
  );
  const banksSubtitle =
    banks.length === 0
      ? "Nenhum ainda"
      : banks
          .slice(0, 3)
          .map((b) => b.label)
          .join(", ") + (banks.length > 3 ? "…" : "");

  async function runSim(pkg: string, type: SimType, amount: number) {
    const label = SIM_BANKS.find((b) => b.packageName === pkg)?.label ?? pkg;
    const watched = await listWatchedBanks();
    if (!watched.some((w) => w.packageName === pkg)) {
      await replaceWatchedBanks([
        ...watched.map((w) => ({ packageName: w.packageName, label: w.label })),
        { packageName: pkg, label },
      ]);
      bumpData();
    }
    const payload = buildSimPayload(pkg, type, amount);
    const result = await processNotification(payload);
    bumpData();
    if (result.status === "stored") {
      router.push("/notifications" as never);
    } else {
      Alert.alert("Simulação", `Status: ${result.status}`);
    }
  }

  function pickType(pkg: string) {
    setBankModal(false);
    setTimeout(() => {
      Alert.alert("Tipo de notificação", "Qual operação?", [
        { text: "Pix", onPress: () => pickValue(pkg, "pix") },
        { text: "Compra", onPress: () => pickValue(pkg, "compra") },
        { text: "Transferência", onPress: () => pickValue(pkg, "transferencia") },
        { text: "Cancelar", style: "cancel" },
      ]);
    }, 350);
  }

  function pickValue(pkg: string, type: SimType) {
    setTimeout(() => {
      Alert.alert("Valor", "Escolha o valor:", [
        ...SIM_VALUES.map((v) => ({
          text: `R$ ${v},00`,
          onPress: () => runSim(pkg, type, v),
        })),
        { text: "Cancelar", style: "cancel" },
      ]);
    }, 350);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader eyebrow="CONTA" title="Perfil" />

      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>FI</Text>
        </View>
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
        title="AI Local"
        subtitle={aiInstalled ? "1 modelo" : "Nenhum modelo baixado"}
        onPress={() => router.push("/ai-local" as never)}
      />
      <SettingsRow
        icon="information-circle-outline"
        title="Sobre o Fino"
        subtitle={`Versão ${version}`}
        onPress={() => Alert.alert("Fino", `Versão ${version}\nOffline · dados só no aparelho`)}
      />
      <SettingsRow
        icon="bug-outline"
        title="Simular notificação"
        subtitle="Injetar payload fake (teste)"
        onPress={() => setBankModal(true)}
      />

      <Modal
        visible={bankModal}
        transparent
        animationType="fade"
        onRequestClose={() => setBankModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setBankModal(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Escolha o banco</Text>
            <FlatList
              data={SIM_BANKS}
              keyExtractor={(b) => b.packageName}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.bankRow}
                  onPress={() => pickType(item.packageName)}
                >
                  <Text style={styles.bankLabel}>{item.label}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.title,
    color: colors.primary,
  },
  userMeta: { flex: 1, gap: 2 },
  name: {
    ...typography.title,
    color: colors.text,
  },
  sub: { ...typography.small, color: colors.textTertiary },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["2xl"],
    maxHeight: "60%",
  },
  sheetTitle: {
    ...typography.title,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.base,
  },
  bankRow: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  bankLabel: {
    ...typography.body,
    color: colors.text,
  },
});
