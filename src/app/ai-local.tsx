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
import { colors, radius, spacing, typography } from "@/constants/theme";

const MODELS = listModels();

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

  const refresh = useCallback(async () => {
    setInfo(await getModelInfo());
    setInstalledRows(await listInstalledModels());
    setStatus(getStatus());
    setProgress(getDownloadProgress());
    setDownloadingId(getDownloadingModelId());
    setRuntimeError(getLastRuntimeError());
    setKeepInMemoryUi(await getKeepInMemory());
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

  return (
    <>
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>PERFIL</Text>
          <Text style={styles.title}>AI Local</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
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
    </>
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
});
