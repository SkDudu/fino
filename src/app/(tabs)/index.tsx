import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BalanceHero } from "@/components/BalanceHero";
import { greetingForHour } from "@/components/greeting";
import { InsightBanner } from "@/components/InsightBanner";
import { NotificationItem } from "@/components/NotificationItem";
import { pickInsight } from "@/components/pickInsight";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCardsRow } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { TransactionItem } from "@/components/TransactionItem";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useNotifications } from "@/hooks/useNotifications";
import { useStats } from "@/hooks/useStats";
import { useTransactions } from "@/hooks/useTransactions";
import { useWatchedBanks } from "@/hooks/useWatchedBanks";
import { loadInstalledApps } from "@/services/installedApps";

export default function HomeScreen() {
  const router = useRouter();
  const { enabled, notifications, openSettings, isAndroid } = useNotifications();
  const { count: watchedCount, ready: watchedReady } = useWatchedBanks();
  const { transactions } = useTransactions(3);
  const { stats } = useStats();
  const [loadingApps, setLoadingApps] = useState(false);
  // ponytail: badge from last-10 sample; exact count if inbox grows past that
  const hasPending = notifications.some((n) => !n.parsed && !n.discarded);

  async function openChooseApps() {
    if (loadingApps) return;
    setLoadingApps(true);
    try {
      // yield so the spinner paints before the (sync) native query
      await new Promise<void>((r) => setTimeout(r, 0));
      loadInstalledApps();
      router.push("/choose-apps" as never);
    } finally {
      setLoadingApps(false);
    }
  }

  if (!isAndroid) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>
          Android only — NotificationListenerService não existe no iOS/web.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="HOJE"
          title={greetingForHour()}
          trailing={
            <View style={styles.headerActions}>
              <StatusBadge active={enabled} />
              <Pressable
                onPress={() => router.push("/notifications" as never)}
                hitSlop={8}
                style={styles.bell}
                accessibilityRole="button"
                accessibilityLabel="Notificações"
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={colors.text}
                />
                {hasPending ? <View style={styles.bellDot} /> : null}
              </Pressable>
            </View>
          }
        />

        {!enabled ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={40} color={colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>Ative o acesso a notificações</Text>
            <Text style={styles.emptyBody}>
              O Android precisa liberar o listener para o Fino capturar alertas dos
              bancos. Sem isso, a home fica vazia.
            </Text>
            <PrimaryButton label="Conceder acesso" onPress={openSettings} />
            <Text style={styles.micro}>Offline · Sem conta · Dados só no aparelho</Text>
          </View>
        ) : watchedReady && watchedCount === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, styles.emptyIconBanks]}>
              <Ionicons name="card-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum banco ainda</Text>
            <Text style={styles.emptyBody}>
              Escolha os apps do celular que o Fino deve acompanhar. Você pode
              adicionar ou remover quando quiser.
            </Text>
            <PrimaryButton
              label="Adicionar bancos"
              onPress={() => void openChooseApps()}
              loading={loadingApps}
            />
            <Text style={styles.micro}>Só apps instalados neste aparelho</Text>
          </View>
        ) : (
          <>
            <BalanceHero balance={stats.balanceToday} />
            <View style={styles.gap} />
            <StatCardsRow spent={stats.spentToday} received={stats.receivedToday} />
            {stats.spentToday > 0 || stats.receivedToday > 0 ? (
              <>
                <View style={styles.gap} />
                <InsightBanner
                  text={pickInsight({
                    spent: stats.spentToday,
                    received: stats.receivedToday,
                  })}
                />
              </>
            ) : null}

            <View style={styles.section}>
              <SectionHeader title="Últimas transações" href="/transactions" />
              {transactions.length === 0 ? (
                <Text style={styles.listEmpty}>Nenhuma transação ainda</Text>
              ) : (
                transactions.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    item={tx}
                    onPress={() =>
                      router.push(`/transaction/${tx.id}` as never)
                    }
                  />
                ))
              )}
            </View>

            <View style={styles.section}>
              <SectionHeader title="Notificações" href="/notifications" />
              {notifications.length === 0 ? (
                <Text style={styles.listEmpty}>Nenhuma notificação ainda</Text>
              ) : (
                notifications.slice(0, 2).map((n) => (
                  <NotificationItem
                    key={n.id}
                    item={n}
                    onViewTransaction={() => router.push("/transactions")}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing["2xl"], gap: 0 },
  gap: { height: spacing.base },
  section: { marginTop: spacing.xl },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  centeredText: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  empty: {
    alignItems: "center",
    paddingTop: spacing["3xl"],
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyIconBanks: { backgroundColor: colors.primarySoft },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.base,
  },
  micro: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  listEmpty: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: "center",
    padding: spacing.base,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
