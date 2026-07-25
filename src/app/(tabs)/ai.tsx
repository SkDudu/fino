import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GripThinkingIcon } from "@/components/GripThinkingIcon";
import {
  ask as askAi,
  getStatus,
  initialize,
  isAiReady,
  isReady,
  subscribeStatus,
} from "@/ai/AIService";
import {
  getAiMode,
  getOnlineModel,
  type OnlineModelId,
} from "@/ai/aiSettings";
import {
  formatCostBrl,
  formatTokenCount,
  modelShort,
} from "@/ai/deepseekPricing";
import { clearConversation } from "@/ai/conversation/ConversationStore";
import type { AiStatus } from "@/ai/constants";
import { DEFAULT_MODEL_ID } from "@/ai/constants";
import { getCatalogModel } from "@/ai/modelCatalog";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants/theme";
import {
  getChatThread,
  saveChatThread,
  type ChatMsg,
} from "@/database/chatRepo";
import { initDb } from "@/database/db";
import {
  sumUsageByModelMonth,
  type UsageByModel,
} from "@/database/aiUsageRepo";

const WELCOME_READY =
  "Modelo carregado. Pergunte sobre seus gastos ou escolha uma sugestão abaixo.";
const WELCOME_ONLINE =
  "DeepSeek online. Pergunte sobre seus gastos ou escolha uma sugestão abaixo.";

const SUGGESTIONS = [
  "Resumo da semana",
  "Onde posso cortar gastos?",
  "Meta de alimentação",
];

const WELCOME_MSG: ChatMsg = {
  id: "welcome",
  role: "ai",
  text: WELCOME_READY,
};

const defaultSize = getCatalogModel(DEFAULT_MODEL_ID).size;
const SIZE_HINT =
  defaultSize > 0
    ? `~${Math.round(defaultSize / (1024 * 1024))} MB`
    : "~650 MB";

const MONTH_LABEL = new Date()
  .toLocaleDateString("pt-BR", { month: "long" })
  .toUpperCase();

function chipLabel(
  status: AiStatus,
  online: boolean,
  onlineModel: OnlineModelId | null
): string {
  if (online) return `Online · ${onlineModel ? modelShort(onlineModel) : "DeepSeek"}`;
  if (status === "READY" || status === "RUNNING") return "Modelo pronto · offline";
  if (status === "LOADING") return "Carregando na memória…";
  if (status === "ERROR") return "Erro no modelo";
  return "Instalado";
}

function sessionUsage(msgs: ChatMsg[]): { tokens: number; costUsd: number; model?: OnlineModelId } {
  let tokens = 0;
  let costUsd = 0;
  let model: OnlineModelId | undefined;
  for (const m of msgs) {
    if (!m.usage) continue;
    tokens += m.usage.totalTokens;
    costUsd += m.usage.costUsd;
    model = m.usage.model;
  }
  return { tokens, costUsd, model };
}

function monthStripLabel(byModel: UsageByModel[], totalUsd: number): string {
  const flash = byModel.find((r) => r.model === "deepseek-v4-flash");
  const pro = byModel.find((r) => r.model === "deepseek-v4-pro");
  const parts: string[] = [];
  if (flash?.totalTokens) parts.push(`flash ${formatTokenCount(flash.totalTokens)}`);
  if (pro?.totalTokens) parts.push(`pro ${formatTokenCount(pro.totalTokens)}`);
  if (!parts.length) return "sem uso ainda";
  return `${parts.join(" · ")} ≈ ${formatCostBrl(totalUsd)}`;
}

function chipColor(status: AiStatus): string {
  if (status === "ERROR") return colors.error;
  if (status === "LOADING") return colors.secondary;
  return colors.success;
}

function HeaderBtn({
  onPress,
  primary,
  icon,
}: {
  onPress: () => void;
  primary?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.iconBtn, primary && styles.iconBtnPrimary]}
      accessibilityRole="button"
    >
      <Ionicons
        name={icon}
        size={20}
        color={primary ? colors.buttonPrimaryText : colors.textSecondary}
      />
    </Pressable>
  );
}

export default function AiScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; new?: string }>();
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [onlineMode, setOnlineMode] = useState(false);
  const [onlineModel, setOnlineModel] = useState<OnlineModelId | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<AiStatus>(getStatus());
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [monthByModel, setMonthByModel] = useState<UsageByModel[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const persistBusy = useRef(false);

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [msgs, showSuggestions, scrollToEnd]);

  const refreshMonth = useCallback(async () => {
    await initDb();
    setMonthByModel(await sumUsageByModelMonth());
  }, []);

  const resetNew = useCallback(() => {
    clearConversation();
    setThreadId(null);
    setThreadTitle(null);
    setMsgs([WELCOME_MSG]);
    setShowSuggestions(true);
    setInput("");
  }, []);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const mode = await getAiMode();
        setOnlineMode(mode === "online");
        if (mode === "online") setOnlineModel(await getOnlineModel());
        else setOnlineModel(null);
        const ready = await isAiReady();
        setInstalled(ready);
        if (mode === "online" && ready) {
          setRuntimeStatus("READY");
          setMsgs((prev) =>
            prev.length === 1 && prev[0].id === "welcome"
              ? [{ ...WELCOME_MSG, text: WELCOME_ONLINE }]
              : prev
          );
        } else if (await isReady()) {
          setRuntimeStatus("READY");
        } else {
          setRuntimeStatus(getStatus());
        }
        void refreshMonth();
      })();
      const unsub = subscribeStatus(setRuntimeStatus);

      const id = typeof params.id === "string" ? params.id : undefined;
      const isNew = params.new === "1";

      if (isNew) {
        resetNew();
        router.setParams({ new: undefined, id: undefined } as never);
      } else if (id) {
        void initDb()
          .then(() => getChatThread(id))
          .then((t) => {
            if (!t) {
              resetNew();
              return;
            }
            clearConversation();
            setThreadId(t.id);
            setThreadTitle(t.title);
            setMsgs(t.messages.length ? t.messages : [WELCOME_MSG]);
            setShowSuggestions(false);
          });
      }

      return unsub;
    }, [params.id, params.new, resetNew, router, refreshMonth])
  );

  const canSend = useMemo(
    () => input.trim().length > 0 && !thinking && runtimeStatus !== "RUNNING",
    [input, thinking, runtimeStatus]
  );
  const chipTint = chipColor(runtimeStatus);
  const inThread = threadId != null && threadTitle != null;
  const session = useMemo(() => sessionUsage(msgs), [msgs]);
  const monthTotalUsd = useMemo(
    () => monthByModel.reduce((s, r) => s + r.costUsd, 0),
    [monthByModel]
  );

  async function persist(next: ChatMsg[], id: string) {
    if (persistBusy.current) return;
    persistBusy.current = true;
    try {
      await initDb();
      const saved = await saveChatThread(id, next);
      setThreadTitle(saved.title);
    } finally {
      persistBusy.current = false;
    }
  }

  async function sendQuestion(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    if (!(await isAiReady())) {
      Alert.alert(
        "IA indisponível",
        (await getAiMode()) === "online"
          ? "Configure a API key em Perfil → IA."
          : "Baixe um modelo local em Perfil → IA."
      );
      return;
    }
    if ((await getAiMode()) === "local" && !(await isReady())) {
      try {
        await initialize();
      } catch {
        Alert.alert("Erro", "Não foi possível carregar o modelo.");
        return;
      }
      if (!(await isReady())) {
        Alert.alert("Aguarde", "O modelo ainda está carregando.");
        return;
      }
    }
    setShowSuggestions(false);
    setInput("");
    const id = threadId ?? `c-${Date.now()}`;
    if (!threadId) setThreadId(id);

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", text: q };
    const replyId = `a-${Date.now()}`;
    const replyMsg: ChatMsg = { id: replyId, role: "ai", text: "" };

    setMsgs((prev) => {
      const base = prev[0]?.id === "welcome" ? prev.slice(1) : prev;
      return [...base, userMsg, replyMsg];
    });
    setThinking(true);

    let finalMsgs: ChatMsg[] = [];
    try {
      await initDb();
      let streamed = "";
      const { text: reply, usage } = await askAi(q, (token) => {
        streamed += token;
        const text = streamed;
        setMsgs((prev) => {
          const next = prev.map((m) =>
            m.id === replyId ? { ...m, text } : m
          );
          finalMsgs = next;
          return next;
        });
      });
      const finalText = reply.trim() || streamed.trim() || "Sem resposta.";
      const msgUsage = usage
        ? {
            model: usage.model,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            costUsd: usage.costUsd,
          }
        : undefined;
      setMsgs((prev) => {
        const next = prev.map((m) =>
          m.id === replyId
            ? { ...m, text: finalText, usage: msgUsage }
            : m
        );
        finalMsgs = next;
        return next;
      });
      if (usage) void refreshMonth();
    } catch {
      setMsgs((prev) => {
        const next = prev.map((m) =>
          m.id === replyId
            ? { ...m, text: "Não consegui responder agora. Tente de novo." }
            : m
        );
        finalMsgs = next;
        return next;
      });
    } finally {
      setThinking(false);
      if (finalMsgs.length) void persist(finalMsgs, id);
    }
  }

  const headerActions = (
    <View style={styles.actions}>
      <HeaderBtn
        icon="time-outline"
        onPress={() => router.push("/conversations" as never)}
      />
      <HeaderBtn
        icon="add"
        primary
        onPress={() => {
          resetNew();
          router.setParams({ id: undefined, new: undefined } as never);
        }}
      />
    </View>
  );

  if (installed !== true) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader eyebrow="ASSISTENTE" title="IA" trailing={headerActions} />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="hardware-chip-outline" size={40} color={colors.primary} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Modelo não baixado</Text>
            <Text style={styles.emptyBody}>
              Baixe o modelo local para conversar com seus dados financeiros — tudo
              offline, no aparelho.
            </Text>
          </View>
          <View style={styles.emptyCtaBlock}>
            <PrimaryButton
              label="Baixar modelo"
              onPress={() => router.push("/ai-local" as never)}
              style={styles.emptyCta}
            />
            <Text style={styles.emptyHint}>{SIZE_HINT} · Offline · Sem conta</Text>
          </View>
        </View>
        <View style={styles.composerDisabled}>
          <View style={styles.inputDisabled}>
            <Text style={styles.inputDisabledText}>Baixe o modelo para conversar…</Text>
          </View>
          <View style={styles.sendDisabledBox}>
            <Ionicons name="send" size={18} color={colors.textTertiary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        eyebrow={inThread ? "CONVERSA" : "ASSISTENTE"}
        title={inThread ? threadTitle! : "IA"}
        leading={
          inThread ? (
            <HeaderBtn
              icon="chevron-back"
              onPress={() => router.push("/conversations" as never)}
            />
          ) : undefined
        }
        trailing={headerActions}
      />
      <View style={styles.statusRow}>
        <View style={[styles.readyChip, { backgroundColor: `${chipTint}1F` }]}>
          <View style={[styles.readyDot, { backgroundColor: chipTint }]} />
          <Text style={[styles.readyText, { color: chipTint }]}>
            {chipLabel(runtimeStatus, onlineMode, onlineModel)}
          </Text>
        </View>
        {onlineMode && session.tokens > 0 ? (
          <View style={styles.sessionUso}>
            <Text style={styles.sessionMuted}>Sessão</Text>
            <Text style={styles.sessionStrong}>
              {formatTokenCount(session.tokens)}
            </Text>
            {session.model ? (
              <Text style={styles.sessionMuted}>{modelShort(session.model)}</Text>
            ) : null}
            <Text style={styles.sessionMuted}>·</Text>
            <Text style={styles.sessionCost}>{formatCostBrl(session.costUsd)}</Text>
          </View>
        ) : null}
      </View>
      <KeyboardAvoidingView
        style={styles.chatBody}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chat}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        >
          {msgs.map((m) =>
            m.role === "ai" ? (
              <View key={m.id} style={styles.aiBlock}>
                <View style={styles.aiBubble}>
                  <View style={styles.aiHead}>
                    <View style={styles.aiDot} />
                    <Text style={styles.aiName}>Fino IA</Text>
                  </View>
                  {thinking && !m.text ? (
                    <GripThinkingIcon size={22} color={colors.accent} />
                  ) : (
                    <Text style={styles.aiText}>{m.text}</Text>
                  )}
                </View>
                {m.usage ? (
                  <Text style={styles.tokenMeta}>
                    {formatTokenCount(m.usage.totalTokens)} ·{" "}
                    {modelShort(m.usage.model)} · {formatCostBrl(m.usage.costUsd)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View key={m.id} style={styles.userWrap}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{m.text}</Text>
                </View>
              </View>
            )
          )}
          {showSuggestions ? (
            <View style={styles.suggestions}>
              <Text style={styles.sugLabel}>SUGESTÕES</Text>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={styles.sugBtn}
                  onPress={() => void sendQuestion(s)}
                  disabled={thinking}
                >
                  <Text style={styles.sugText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
        {onlineMode ? (
          <Pressable
            style={styles.usoMes}
            onPress={() => router.push("/ai-local" as never)}
          >
            <View style={styles.usoMesLeft}>
              <Text style={styles.usoMesLabel}>USO · {MONTH_LABEL}</Text>
              <Text style={styles.usoMesValue}>
                {monthStripLabel(monthByModel, monthTotalUsd)}
              </Text>
            </View>
            <Text style={styles.usoMesLink}>Detalhes</Text>
          </Pressable>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Pergunte algo…"
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => void sendQuestion(input)}
            editable={!thinking}
            onFocus={scrollToEnd}
          />
          <Pressable
            style={[styles.send, !canSend && styles.sendDisabled]}
            onPress={() => void sendQuestion(input)}
            disabled={!canSend}
          >
            <Ionicons name="send" size={18} color={colors.buttonPrimaryText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBtnPrimary: { backgroundColor: colors.primary },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCopy: { gap: spacing.sm, alignItems: "center" },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },
  emptyBody: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 300,
  },
  emptyCtaBlock: {
    alignSelf: "stretch",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyCta: { marginHorizontal: 0 },
  emptyHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
  },
  composerDisabled: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    opacity: 0.45,
  },
  inputDisabled: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    justifyContent: "center",
  },
  inputDisabledText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  sendDisabledBox: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.elevatedSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  readyChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sessionUso: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexShrink: 1,
  },
  sessionMuted: { ...typography.caption, color: colors.textTertiary },
  sessionStrong: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  sessionCost: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.secondary,
  },
  readyDot: { width: 8, height: 8, borderRadius: radius.full },
  readyText: {
    ...typography.caption,
    fontFamily: typography.title.fontFamily,
  },
  chatBody: { flex: 1 },
  chatScroll: { flex: 1 },
  chat: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  aiBlock: { gap: 6 },
  aiBubble: {
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  aiHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  aiName: { ...typography.caption, color: colors.accent },
  aiText: { ...typography.body, color: colors.text },
  tokenMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    paddingLeft: 4,
  },
  userWrap: { alignItems: "flex-end" },
  userBubble: {
    maxWidth: "80%",
    padding: spacing.base,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: 4,
    backgroundColor: colors.userBubble,
  },
  userText: { ...typography.body, color: colors.text },
  suggestions: { gap: spacing.sm, marginTop: spacing.sm },
  sugLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  sugBtn: {
    padding: spacing.base,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  sugText: { ...typography.body, color: colors.text },
  usoMes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  usoMesLeft: { gap: 2, flex: 1 },
  usoMesLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  usoMesValue: {
    ...typography.small,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  usoMesLink: {
    ...typography.caption,
    fontFamily: typography.title.fontFamily,
    color: colors.primary,
  },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    color: colors.text,
    ...typography.body,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
});
