import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bootAi } from "@/ai/AIService";
import {
  clearApiKey,
  getOnlineModel,
  hasApiKey,
  ONLINE_MODELS,
  saveApiKey,
  setOnlineModel,
  type OnlineModelId,
} from "@/ai/aiSettings";
import {
  estimateCostUsd,
  formatCostBrl,
  formatTokenCount,
  modelShort,
} from "@/ai/deepseekPricing";
import { initDb } from "@/database/db";
import {
  sumChatUsageToday,
  sumUsageByModelMonth,
  sumUsageMonth,
  type UsageByModel,
  type UsageMonthTotal,
} from "@/database/aiUsageRepo";
import { colors, layout, radius, spacing, typography } from "@/constants/theme";

const MONTH_LABEL = new Date()
  .toLocaleDateString("pt-BR", { month: "long" })
  .toUpperCase();

export default function AiLocalScreen() {
  const router = useRouter();
  const [onlineModel, setOnlineModelUi] = useState<OnlineModelId>("deepseek-v4-flash");
  const [keySet, setKeySet] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [confirmClearKey, setConfirmClearKey] = useState(false);
  const [monthTotal, setMonthTotal] = useState<UsageMonthTotal | null>(null);
  const [monthByModel, setMonthByModel] = useState<UsageByModel[]>([]);
  const [todayChat, setTodayChat] = useState<UsageMonthTotal | null>(null);

  const refresh = useCallback(async () => {
    setOnlineModelUi(await getOnlineModel());
    setKeySet(await hasApiKey());
    await initDb();
    setMonthTotal(await sumUsageMonth());
    setMonthByModel(await sumUsageByModelMonth());
    setTodayChat(await sumChatUsageToday());
  }, []);

  useEffect(() => {
    void bootAi().then(refresh);
  }, [refresh]);

  async function onPickOnlineModel(id: OnlineModelId) {
    setOnlineModelUi(id);
    await setOnlineModel(id);
  }

  async function onSaveKey() {
    setSavingKey(true);
    try {
      await saveApiKey(keyDraft);
      setKeyDraft("");
      setKeySet(true);
      await bootAi();
    } catch {
      Alert.alert("Erro", "Cole uma API key válida.");
    } finally {
      setSavingKey(false);
    }
  }

  async function onConfirmClearKey() {
    await clearApiKey();
    setKeySet(false);
    setConfirmClearKey(false);
    await bootAi();
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>PERFIL</Text>
            <Text style={styles.title}>IA</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <OnlineSection
            onlineModel={onlineModel}
            keySet={keySet}
            keyDraft={keyDraft}
            savingKey={savingKey}
            monthTotal={monthTotal}
            monthByModel={monthByModel}
            todayChat={todayChat}
            onPickModel={(id) => void onPickOnlineModel(id)}
            onKeyDraftChange={setKeyDraft}
            onSaveKey={() => void onSaveKey()}
            onClearKey={() => setConfirmClearKey(true)}
          />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={confirmClearKey}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmClearKey(false)}
      >
        <Pressable
          style={styles.deleteOverlay}
          onPress={() => setConfirmClearKey(false)}
        >
          <Pressable style={styles.deleteSheet} onPress={() => {}}>
            <View style={styles.deleteHandle} />
            <View style={styles.deleteHeader}>
              <View style={styles.deleteIcon}>
                <Ionicons name="trash-outline" size={24} color={colors.error} />
              </View>
              <Text style={styles.deleteTitle}>Apagar API key?</Text>
              <Text style={styles.deleteBody}>
                A chave será removida do aparelho. Para usar de novo, cole uma
                nova. Essa ação não pode ser desfeita.
              </Text>
            </View>
            <Pressable
              style={styles.deleteConfirm}
              onPress={() => void onConfirmClearKey()}
            >
              <Text style={styles.deleteConfirmText}>Apagar</Text>
            </Pressable>
            <Pressable
              style={styles.deleteCancel}
              onPress={() => setConfirmClearKey(false)}
            >
              <Text style={styles.deleteCancelText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function OnlineSection({
  onlineModel,
  keySet,
  keyDraft,
  savingKey,
  monthTotal,
  monthByModel,
  todayChat,
  onPickModel,
  onKeyDraftChange,
  onSaveKey,
  onClearKey,
}: {
  onlineModel: OnlineModelId;
  keySet: boolean;
  keyDraft: string;
  savingKey: boolean;
  monthTotal: UsageMonthTotal | null;
  monthByModel: UsageByModel[];
  todayChat: UsageMonthTotal | null;
  onPickModel: (id: OnlineModelId) => void;
  onKeyDraftChange: (v: string) => void;
  onSaveKey: () => void;
  onClearKey: () => void;
}) {
  const other: OnlineModelId =
    onlineModel === "deepseek-v4-flash" ? "deepseek-v4-pro" : "deepseek-v4-flash";
  const flash = monthByModel.find((r) => r.model === "deepseek-v4-flash");
  const pro = monthByModel.find((r) => r.model === "deepseek-v4-pro");
  const showSwap = (todayChat?.totalTokens ?? 0) > 0;
  const swapNow = todayChat
    ? estimateCostUsd(
        onlineModel,
        todayChat.promptTokens,
        todayChat.completionTokens
      )
    : 0;
  const swapAlt = todayChat
    ? estimateCostUsd(other, todayChat.promptTokens, todayChat.completionTokens)
    : 0;

  function modelHint(id: OnlineModelId, base: string): string {
    const row = monthByModel.find((r) => r.model === id);
    if (!row?.totalTokens) return base;
    return `${base.split(" · ")[0]} · ${formatTokenCount(row.totalTokens)} tokens · ${formatCostBrl(row.costUsd)}`;
  }

  return (
    <View style={styles.onlineWrap}>
      <View style={styles.notice}>
        <Ionicons name="warning-outline" size={18} color={colors.warning} />
        <Text style={styles.noticeText}>
          Trechos das conversas saem do aparelho para a DeepSeek — usando a sua
          API key.
        </Text>
      </View>

      <Text style={styles.onlineLabel}>PROVEDOR · DEEPSEEK</Text>
      <View style={styles.catalog}>
        {ONLINE_MODELS.map((m) => {
          const active = onlineModel === m.id;
          return (
            <Pressable
              key={m.id}
              style={[styles.modelRow, active && styles.modelRowActive]}
              onPress={() => onPickModel(m.id)}
            >
              <View style={styles.fileMeta}>
                <Text style={styles.fileTitle}>{m.label}</Text>
                <Text style={styles.fileSub}>{modelHint(m.id, m.hint)}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioOn]}>
                {active ? (
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={colors.buttonPrimaryText}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.onlineLabel}>API KEY</Text>
      {keySet ? (
        <>
          <View style={styles.keyStatus}>
            <View style={styles.keyCheck}>
              <Ionicons name="checkmark" size={12} color={colors.success} />
            </View>
            <Text style={styles.keyStatusText}>API key configurada</Text>
          </View>
          <Pressable style={styles.clearKeyBtn} onPress={onClearKey}>
            <Text style={styles.clearKeyText}>Apagar e substituir</Text>
          </Pressable>
          <Text style={styles.keyHint}>
            A chave não pode ser mostrada. Apague para colar uma nova.
          </Text>
        </>
      ) : (
        <>
          <TextInput
            style={styles.keyInput}
            value={keyDraft}
            onChangeText={onKeyDraftChange}
            placeholder="Cole a chave da DeepSeek"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Pressable
            style={[styles.saveKeyBtn, savingKey && styles.actionDisabled]}
            onPress={onSaveKey}
            disabled={savingKey || !keyDraft.trim()}
          >
            <Text style={styles.saveKeyText}>Salvar API key</Text>
          </Pressable>
          <Text style={styles.keyHint}>
            Após salvar, a chave não pode ser vista de novo. Para trocar, apague
            e cole uma nova.
          </Text>
        </>
      )}

      <Text style={styles.onlineLabel}>USO · {MONTH_LABEL} · POR MODELO</Text>
      <View style={styles.usoHero}>
        <Text style={styles.usoHeroLabel}>Gasto estimado</Text>
        <Text style={styles.usoHeroValue}>
          {formatCostBrl(monthTotal?.costUsd ?? 0)}
        </Text>
        <Text style={styles.usoHeroSub}>
          {formatTokenCount(monthTotal?.totalTokens ?? 0)} tokens · flash + pro
        </Text>
      </View>

      <View style={styles.usoBreakdown}>
        <View style={styles.usoRow}>
          <View style={styles.usoRowLeft}>
            <Text style={styles.usoRowTitle}>deepseek-v4-flash</Text>
            <Text style={styles.usoRowSub}>
              {formatTokenCount(flash?.totalTokens ?? 0)} tokens · chat + enrich
            </Text>
          </View>
          <Text style={styles.usoRowCost}>
            {formatCostBrl(flash?.costUsd ?? 0)}
          </Text>
        </View>
        <View style={styles.usoRow}>
          <View style={styles.usoRowLeft}>
            <Text style={styles.usoRowTitle}>deepseek-v4-pro</Text>
            <Text style={styles.usoRowSub}>
              {formatTokenCount(pro?.totalTokens ?? 0)} tokens · chat + enrich
            </Text>
          </View>
          <Text style={styles.usoRowCost}>
            {formatCostBrl(pro?.costUsd ?? 0)}
          </Text>
        </View>
        <View style={styles.usoSplit}>
          <View style={styles.usoSplitCol}>
            <Text style={styles.usoRowSub}>Input</Text>
            <Text style={styles.usoSplitVal}>
              {formatTokenCount(monthTotal?.promptTokens ?? 0)}
            </Text>
          </View>
          <View style={styles.usoSplitDiv} />
          <View style={[styles.usoSplitCol, styles.usoSplitColPad]}>
            <Text style={styles.usoRowSub}>Output</Text>
            <Text style={styles.usoSplitVal}>
              {formatTokenCount(monthTotal?.completionTokens ?? 0)}
            </Text>
          </View>
        </View>
      </View>

      {showSwap ? (
        <View style={styles.swapHint}>
          <Text style={styles.swapLabel}>
            SE TROCAR PARA {modelShort(other).toUpperCase()} AGORA
          </Text>
          <Text style={styles.swapBody}>
            Mesmos {formatTokenCount(todayChat!.totalTokens)} de hoje ≈{" "}
            {formatCostBrl(swapAlt)} (hoje {formatCostBrl(swapNow)} no{" "}
            {modelShort(onlineModel)})
          </Text>
        </View>
      ) : null}

      <Text style={styles.keyHint}>
        Custo por modelo. Trocar muda o preço daqui pra frente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  title: { ...typography.h3, color: colors.text },
  scroll: { flexGrow: 1, paddingBottom: spacing["2xl"] },
  catalog: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  modelRowActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  fileMeta: { flex: 1, gap: 2, minWidth: 0 },
  fileTitle: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  fileSub: { ...typography.caption, color: colors.textTertiary },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  actionDisabled: { opacity: 0.5 },
  onlineWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  notice: {
    marginHorizontal: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#F59E0B1F",
    borderWidth: 1,
    borderColor: "#F59E0B33",
    alignItems: "flex-start",
  },
  noticeText: {
    ...typography.small,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    flex: 1,
  },
  onlineLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  keyInput: {
    marginHorizontal: spacing.lg,
    height: layout.inputHeight,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.base,
    color: colors.text,
    ...typography.small,
  },
  keyStatus: {
    marginHorizontal: spacing.lg,
    height: layout.inputHeight,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: spacing.base,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  keyCheck: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: "#22C55E33",
    alignItems: "center",
    justifyContent: "center",
  },
  keyStatusText: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  saveKeyBtn: {
    marginHorizontal: spacing.lg,
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveKeyText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.buttonPrimaryText,
  },
  clearKeyBtn: {
    marginHorizontal: spacing.lg,
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  clearKeyText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.error,
  },
  keyHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  usoHero: {
    marginHorizontal: spacing.lg,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  usoHeroLabel: { ...typography.caption, color: colors.textTertiary },
  usoHeroValue: { ...typography.h1, color: colors.text },
  usoHeroSub: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.secondary,
  },
  usoBreakdown: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  usoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  usoRowLeft: { flex: 1, gap: 2 },
  usoRowTitle: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  usoRowSub: { ...typography.caption, color: colors.textTertiary },
  usoRowCost: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.secondary,
    flexShrink: 0,
  },
  usoSplit: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
  },
  usoSplitCol: { flex: 1, gap: 2 },
  usoSplitColPad: { paddingLeft: spacing.base },
  usoSplitDiv: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.divider,
  },
  usoSplitVal: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  swapHint: {
    marginHorizontal: spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    backgroundColor: colors.elevatedSurface,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  swapLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  swapBody: {
    ...typography.small,
    color: colors.text,
  },
  deleteOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  deleteSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["2xl"],
    gap: spacing.sm,
  },
  deleteHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  deleteHeader: {
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  deleteIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: "#EF44441F",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteTitle: { ...typography.h3, color: colors.text, textAlign: "center" },
  deleteBody: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },
  deleteConfirm: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: "#FFFFFF",
  },
  deleteCancel: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.elevatedSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteCancelText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
});
