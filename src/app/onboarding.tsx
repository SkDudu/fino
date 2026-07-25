import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FinoMark } from "@/components/FinoMark";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { setSetting } from "@/database/settingsRepo";

const HOW_STEPS = [
  { n: "1", t: "Banco notifica", d: "PIX, compra ou transferência chega no Android" },
  { n: "2", t: "Fino captura", d: "Filtra o banco e extrai valor, local e hora" },
  { n: "3", t: "Você confirma", d: "Aprova, edita ou descarta em um toque" },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      await setSetting("onboarding_done", "1");
    } finally {
      router.replace("/(tabs)" as never);
    }
  }

  function next() {
    if (step >= 2) void finish();
    else setStep((s) => s + 1);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        {step < 2 ? (
          <Pressable onPress={finish}>
            <Text style={styles.skip}>Pular</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      {step === 0 ? (
        <>
          <View style={styles.heroCenter}>
            <FinoMark size={120} />
          </View>
          <View style={styles.copyCenter}>
            <Text style={styles.title}>Seu dinheiro, organizado sozinho</Text>
            <Text style={styles.body}>
              O Fino lê notificações bancárias e transforma em lançamentos claros.
            </Text>
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <View style={styles.copyLeft}>
            <Text style={styles.titleLeft}>Como funciona</Text>
            <Text style={styles.bodyLeft}>
              Do alerta do banco ao lançamento, em três passos.
            </Text>
          </View>
          <View style={styles.steps}>
            {HOW_STEPS.map((s) => (
              <View key={s.n} style={styles.stepCard}>
                <View style={styles.stepN}>
                  <Text style={styles.stepNText}>{s.n}</Text>
                </View>
                <View style={styles.stepCopy}>
                  <Text style={styles.stepTitle}>{s.t}</Text>
                  <Text style={styles.stepDesc}>{s.d}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <View style={styles.heroCenter}>
            <View style={styles.mark}>
              <Ionicons name="checkmark" size={48} color={colors.primary} />
            </View>
          </View>
          <View style={styles.copyCenter}>
            <Text style={styles.title}>Pronto para começar</Text>
            <Text style={styles.body}>
              Quando o banco notificar, o Fino sugere o lançamento. Você só confirma.
            </Text>
          </View>
        </>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton
          label={step === 2 ? "Começar" : "Continuar"}
          onPress={next}
          loading={saving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  top: {
    paddingHorizontal: spacing.lg,
    alignItems: "flex-end",
    minHeight: 26,
  },
  skip: { ...typography.small, color: colors.textTertiary },
  heroCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copyCenter: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  copyLeft: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
  },
  title: { ...typography.h1, color: colors.text, textAlign: "center" },
  titleLeft: { ...typography.h2, color: colors.text },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  bodyLeft: { ...typography.body, color: colors.textSecondary },
  steps: { paddingHorizontal: spacing.lg, gap: spacing.md },
  stepCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  stepN: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNText: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.primary,
  },
  stepCopy: { flex: 1, gap: 2 },
  stepTitle: {
    ...typography.body,
    fontFamily: typography.title.fontFamily,
    color: colors.text,
  },
  stepDesc: { ...typography.small, color: colors.textTertiary },
  footer: { paddingBottom: spacing.xl, gap: spacing.base },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.elevatedSurface,
  },
  dotActive: { backgroundColor: colors.primary },
});
