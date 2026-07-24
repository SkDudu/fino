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
import {
  ask as askAi,
  getStatus,
  initialize,
  isModelInstalled,
  isReady,
  subscribeStatus,
} from "@/ai/AIService";
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

const WELCOME_READY =
  "Modelo carregado. Pergunte sobre seus gastos ou escolha uma sugestão abaixo.";

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

function chipLabel(status: AiStatus): string {
  if (status === "READY" || status === "RUNNING") return "Modelo pronto · offline";
  if (status === "LOADING") return "Carregando na memória…";
  if (status === "ERROR") return "Erro no modelo";
  return "Instalado";
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
  const [runtimeStatus, setRuntimeStatus] = useState<AiStatus>(getStatus());
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const persistBusy = useRef(false);

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [msgs, showSuggestions, scrollToEnd]);

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
      void isModelInstalled().then(setInstalled);
      void isReady().then((ready) => {
        if (ready) setRuntimeStatus("READY");
        else setRuntimeStatus(getStatus());
      });
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
    }, [params.id, params.new, resetNew, router])
  );

  const canSend = useMemo(
    () => input.trim().length > 0 && !thinking && runtimeStatus !== "RUNNING",
    [input, thinking, runtimeStatus]
  );
  const chipTint = chipColor(runtimeStatus);
  const inThread = threadId != null && threadTitle != null;

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
    if (!(await isReady())) {
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
      const reply = await askAi(q, (token) => {
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
      setMsgs((prev) => {
        const next = prev.map((m) =>
          m.id === replyId ? { ...m, text: finalText } : m
        );
        finalMsgs = next;
        return next;
      });
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
      <View style={[styles.readyChip, { backgroundColor: `${chipTint}1F` }]}>
        <View style={[styles.readyDot, { backgroundColor: chipTint }]} />
        <Text style={[styles.readyText, { color: chipTint }]}>
          {chipLabel(runtimeStatus)}
        </Text>
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
              <View key={m.id} style={styles.aiBubble}>
                <View style={styles.aiHead}>
                  <View style={styles.aiDot} />
                  <Text style={styles.aiName}>Fino IA</Text>
                </View>
                <Text style={styles.aiText}>{m.text}</Text>
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
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
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
