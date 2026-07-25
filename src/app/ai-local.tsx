import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  bootAi,
  cancelDownload,
  downloadModel,
  formatAiError,
  getDownloadingModelId,
  getDownloadProgress,
  getKeepInMemory,
  getLastRuntimeError,
  getModelInfo,
  getStatus,
  listInstalledModels,
  listModels,
  removeModel,
  selectModel,
  setKeepInMemory,
  subscribeStatus,
} from "@/ai/AIService";
import type { AiModelEntry, AiStatus } from "@/ai/constants";
import {
  clearApiKey,
  getAiMode,
  getOnlineModel,
  hasApiKey,
  ONLINE_MODELS,
  saveApiKey,
  setAiMode,
  setOnlineModel,
  type AiMode,
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

const MODELS = listModels();

const MONTH_LABEL = new Date()
  .toLocaleDateString("pt-BR", { month: "long" })
  .toUpperCase();

type InstalledRow = Awaited<ReturnType<typeof listInstalledModels>>[number];

function formatBytes(n: number): string {
  if (n <= 0) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(0)} MB`;
}

function statusLabel(s: AiStatus): string {
  switch (s) {
    case "READY":
      return "Pronto";
    case "RUNNING":
      return "Processando…";
    case "LOADING":
      return "Carregando na memória…";
    case "ERROR":
      return "Erro no runtime";
    case "DOWNLOADING":
      return "Baixando…";
    default:
      return "Instalado (não carregado)";
  }
}

function statusColor(s: AiStatus): string {
  if (s === "READY") return colors.success;
  if (s === "ERROR") return colors.error;
  if (s === "LOADING" || s === "RUNNING") return colors.secondary;
  return colors.textTertiary;
}

function runtimeErrorLabel(code: string): string {
  switch (code) {
    case "MODEL_LOAD_FAILED":
      return "Falha ao carregar o modelo.";
    case "INFERENCE_FAILED":
      return "Falha na inferência.";
    case "INVALID_AI_RESPONSE":
      return "JSON inválido ou categoria não reconhecida.";
    default:
      return code;
  }
}

export default function AiLocalScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<AiStatus>(getStatus());
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getModelInfo>> | null>(
    null
  );
  const [progress, setProgress] = useState(getDownloadProgress());
  const [busy, setBusy] = useState(false);
  const [keepInMemory, setKeepInMemoryUi] = useState(false);
  const [togglingKeep, setTogglingKeep] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(
    getLastRuntimeError()
  );
  const [installedRows, setInstalledRows] = useState<InstalledRow[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(
    getDownloadingModelId()
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [mode, setMode] = useState<AiMode>("local");
  const [onlineModel, setOnlineModelUi] = useState<OnlineModelId>("deepseek-v4-flash");
  const [keySet, setKeySet] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [confirmClearKey, setConfirmClearKey] = useState(false);
  const [monthTotal, setMonthTotal] = useState<UsageMonthTotal | null>(null);
  const [monthByModel, setMonthByModel] = useState<UsageByModel[]>([]);
  const [todayChat, setTodayChat] = useState<UsageMonthTotal | null>(null);

  const refresh = useCallback(async () => {
    setInfo(await getModelInfo());
    setInstalledRows(await listInstalledModels());
    setStatus(getStatus());
    setProgress(getDownloadProgress());
    setDownloadingId(getDownloadingModelId());
    setRuntimeError(getLastRuntimeError());
    setKeepInMemoryUi(await getKeepInMemory());
    setMode(await getAiMode());
    setOnlineModelUi(await getOnlineModel());
    setKeySet(await hasApiKey());
    await initDb();
    setMonthTotal(await sumUsageMonth());
    setMonthByModel(await sumUsageByModelMonth());
    setTodayChat(await sumChatUsageToday());
  }, []);

  useEffect(() => {
    bootAi().then(refresh);
    return subscribeStatus(() => {
      setStatus(getStatus());
      setProgress(getDownloadProgress());
      void refresh();
    });
  }, [refresh]);

  const downloading = status === "DOWNLOADING";
  const activeInstalled = Boolean(info?.installed) && !downloading;
  const downloadingEntry = MODELS.find((m) => m.id === downloadingId);

  async function onKeepInMemoryChange(next: boolean) {
    setTogglingKeep(true);
    setKeepInMemoryUi(next);
    try {
      await setKeepInMemory(next);
    } catch {
      setKeepInMemoryUi(await getKeepInMemory());
      Alert.alert(
        "Erro",
        next
          ? "Não foi possível carregar o modelo."
          : "Aguarde a inferência terminar."
      );
    } finally {
      setTogglingKeep(false);
      await refresh();
    }
  }

  function onDownload(modelId: string) {
    void downloadModel(modelId).catch((e) => {
      setDownloadError(formatAiError(e));
    });
  }

  function onCancel() {
    void cancelDownload();
  }

  function onRemove(modelId: string) {
    const entry = MODELS.find((m) => m.id === modelId);
    Alert.alert(
      "Apagar modelo",
      `Remove ${entry?.label ?? "o modelo"} do aparelho. Continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await removeModel(modelId);
            } finally {
              setBusy(false);
              await refresh();
            }
          },
        },
      ]
    );
  }

  function onSelect(modelId: string) {
    void selectModel(modelId)
      .then(refresh)
      .catch(() => Alert.alert("Erro", "Não foi possível ativar o modelo."));
  }

  async function onModeChange(next: AiMode) {
    setMode(next);
    await setAiMode(next);
  }

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
        <View style={styles.segment}>
          <Pressable
            style={[styles.segBtn, mode === "local" && styles.segBtnActive]}
            onPress={() => void onModeChange("local")}
          >
            <Text style={[styles.segText, mode === "local" && styles.segTextActive]}>
              Offline
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segBtn, mode === "online" && styles.segBtnActive]}
            onPress={() => void onModeChange("online")}
          >
            <Text style={[styles.segText, mode === "online" && styles.segTextActive]}>
              Online
            </Text>
          </Pressable>
        </View>

        {mode === "online" ? (
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
        ) : (
          <>
            <Text style={styles.intro}>
              Escolha um modelo. Fica só no aparelho — o app funciona sem IA.
            </Text>

            {downloading && downloadingEntry ? (
              <DownloadingView
                entry={downloadingEntry}
                progress={progress}
                onCancel={onCancel}
              />
            ) : null}

            <Text style={styles.sectionLabel}>MODELOS DISPONÍVEIS</Text>
            <View style={styles.catalog}>
              {MODELS.map((entry) => {
                const row = installedRows.find((r) => r.entry.id === entry.id);
                const isActive = row?.active ?? false;
                const isDownloading = downloadingId === entry.id;
                return (
                  <ModelCard
                    key={entry.id}
                    entry={entry}
                    installed={Boolean(row)}
                    bytes={row?.bytes ?? 0}
                    active={isActive}
                    downloading={isDownloading}
                    disabled={downloading || busy}
                    onDownload={() => onDownload(entry.id)}
                    onSelect={() => onSelect(entry.id)}
                    onRemove={() => onRemove(entry.id)}
                  />
                );
              })}
            </View>

            {activeInstalled ? (
              <RuntimeSection
                label={info?.label ?? ""}
                status={status}
                keepInMemory={keepInMemory}
                togglingKeep={togglingKeep}
                runtimeError={runtimeError}
                busy={busy}
                onKeepInMemoryChange={(v) => void onKeepInMemoryChange(v)}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>

    <Modal
      visible={downloadError != null}
      transparent
      animationType="fade"
      onRequestClose={() => setDownloadError(null)}
    >
      <Pressable style={styles.errorOverlay} onPress={() => setDownloadError(null)}>
        <Pressable style={styles.errorSheet} onPress={() => {}}>
          <Text style={styles.errorTitle}>Falha no download</Text>
          <ScrollView style={styles.errorScroll}>
            <Text selectable style={styles.errorBody}>
              {downloadError}
            </Text>
          </ScrollView>
          <Pressable style={styles.errorBtn} onPress={() => setDownloadError(null)}>
            <Text style={styles.errorBtnText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>

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
              A chave será removida do aparelho. Para usar online de novo, cole uma
              nova. Essa ação não pode ser desfeita.
            </Text>
          </View>
          <Pressable style={styles.deleteConfirm} onPress={() => void onConfirmClearKey()}>
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
          Com online, trechos das conversas saem do aparelho para a DeepSeek —
          usando a sua API key.
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
                  <Ionicons name="checkmark" size={12} color={colors.buttonPrimaryText} />
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
            Após salvar, a chave não pode ser vista de novo. Para trocar, apague e
            cole uma nova.
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

function ModelCard({
  entry,
  installed,
  bytes,
  active,
  downloading,
  disabled,
  onDownload,
  onSelect,
  onRemove,
}: {
  entry: AiModelEntry;
  installed: boolean;
  bytes: number;
  active: boolean;
  downloading: boolean;
  disabled: boolean;
  onDownload: () => void;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.modelRow, active && styles.modelRowActive]}>
      <View style={styles.modelIcon}>
        <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
      </View>
      <Pressable
        style={styles.fileMeta}
        onPress={installed && !active ? onSelect : undefined}
        disabled={!installed || active || disabled}
      >
        <Text style={styles.fileTitle}>{entry.label}</Text>
        <Text style={styles.fileSub} numberOfLines={1}>
          {installed ? formatBytes(bytes) : entry.hint}
        </Text>
        <Text style={styles.fileSub} numberOfLines={1}>
          {entry.file}
        </Text>
      </Pressable>
      {installed ? (
        <View style={styles.modelActions}>
          {active ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Ativo</Text>
            </View>
          ) : (
            <Pressable style={styles.useBtn} onPress={onSelect} disabled={disabled}>
              <Text style={styles.useBtnText}>Usar</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.trash}
            onPress={onRemove}
            disabled={disabled || downloading}
            accessibilityLabel="Apagar modelo"
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.downloadBtn, disabled && styles.actionDisabled]}
          onPress={onDownload}
          disabled={disabled}
        >
          <Text style={styles.downloadBtnText}>
            {downloading ? "…" : "Baixar"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function DownloadingView({
  entry,
  progress,
  onCancel,
}: {
  entry: AiModelEntry;
  progress: number;
  onCancel: () => void;
}) {
  const pct = Math.min(100, Math.round(progress * 100));

  return (
    <View style={styles.downloadSection}>
      <View style={styles.card}>
        <View style={styles.fileRow}>
          <View style={styles.downloadIcon}>
            <Ionicons name="download-outline" size={20} color={colors.secondary} />
          </View>
          <View style={styles.fileMeta}>
            <Text style={styles.fileTitle}>{entry.label}</Text>
            <Text style={styles.fileSub} numberOfLines={1}>
              {entry.file}
            </Text>
          </View>
        </View>
        <View style={styles.progressBlock}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressStatus}>Baixando…</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressBytes}>{entry.hint}</Text>
        </View>
      </View>
      <Pressable style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelText}>Parar download</Text>
      </Pressable>
    </View>
  );
}

function RuntimeSection({
  label,
  status,
  keepInMemory,
  togglingKeep,
  runtimeError,
  busy,
  onKeepInMemoryChange,
}: {
  label: string;
  status: AiStatus;
  keepInMemory: boolean;
  togglingKeep: boolean;
  runtimeError: string | null;
  busy: boolean;
  onKeepInMemoryChange: (next: boolean) => void;
}) {
  const toggleDisabled =
    busy || togglingKeep || status === "RUNNING" || status === "LOADING";

  return (
    <View style={styles.installedSection}>
      <Text style={styles.sectionLabel}>RUNTIME — {label}</Text>
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor(status) }]} />
          <Text style={styles.statusText}>{statusLabel(status)}</Text>
        </View>
        {runtimeError ? (
          <Text style={styles.statusError}>{runtimeErrorLabel(runtimeError)}</Text>
        ) : null}
      </View>

      <View style={[styles.toggleRow, toggleDisabled && styles.actionDisabled]}>
        <View style={styles.toggleCopy}>
          <Text style={styles.toggleTitle}>Manter na memória</Text>
          <Text style={styles.toggleSub}>
            {keepInMemory
              ? "Carrega ao abrir o app e não libera ao minimizar."
              : "Libera RAM ao sair; carrega só quando precisar."}
          </Text>
        </View>
        <Switch
          value={keepInMemory}
          onValueChange={onKeepInMemoryChange}
          disabled={toggleDisabled}
          trackColor={{ false: colors.elevatedSurface, true: colors.primarySoft }}
          thumbColor={keepInMemory ? colors.primary : colors.textTertiary}
          accessibilityLabel="Manter modelo na memória"
        />
      </View>
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
  intro: {
    ...typography.small,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  catalog: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  modelRowActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modelActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  activeBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: typography.title.fontFamily,
  },
  useBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.elevatedSurface,
  },
  useBtnText: { ...typography.caption, color: colors.text },
  downloadBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  downloadBtnText: {
    ...typography.caption,
    color: colors.background,
    fontFamily: typography.title.fontFamily,
  },
  downloadSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.base,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.base,
  },
  fileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  downloadIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "#00C2FF1F",
    alignItems: "center",
    justifyContent: "center",
  },
  fileMeta: { flex: 1, gap: 2, minWidth: 0 },
  fileTitle: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  fileSub: { ...typography.caption, color: colors.textTertiary },
  progressBlock: { gap: spacing.sm },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressStatus: {
    ...typography.caption,
    color: colors.secondary,
  },
  progressPct: {
    ...typography.caption,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.elevatedSurface,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  progressBytes: { ...typography.caption, color: colors.textTertiary },
  cancelBtn: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { ...typography.body, color: colors.error },
  installedSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  modelIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  trash: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "#EF44441A",
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: radius.full },
  statusText: { ...typography.small, color: colors.text },
  statusError: { ...typography.caption, color: colors.error },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  toggleCopy: { flex: 1, gap: 4 },
  toggleTitle: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  toggleSub: { ...typography.caption, color: colors.textTertiary },
  actionDisabled: { opacity: 0.5 },
  errorOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
  errorSheet: {
    maxHeight: "80%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorTitle: { ...typography.title, color: colors.text },
  errorScroll: { maxHeight: 320 },
  errorBody: {
    ...typography.small,
    fontFamily: "monospace",
    color: colors.textSecondary,
  },
  errorBtn: {
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBtnText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.background,
  },
  segment: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  segBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  segText: {
    ...typography.small,
    color: colors.textTertiary,
  },
  segTextActive: {
    fontFamily: typography.title.fontFamily,
    color: colors.primary,
  },
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
