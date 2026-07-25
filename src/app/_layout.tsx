import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native";
import { FinoMark } from "@/components/FinoMark";
import { colors, spacing } from "@/constants/theme";
import { initDb } from "@/database/db";
import { syncWatchedToNative } from "@/database/watchedBanksRepo";
import { getSetting } from "@/database/settingsRepo";

// Keep native splash up until we call hide (must be module scope).
SplashScreen.preventAutoHideAsync();

/** ponytail: start DB while fonts load — splash covers max(fonts, db), not sum */
let bootPromise: Promise<string | null> | null = null;
function bootDb(): Promise<string | null> {
  if (!bootPromise) {
    bootPromise = initDb()
      .then(() => syncWatchedToNative())
      .then(() => {
        void import("@/ai/usdBrlRate").then(({ ensureUsdBrlRate }) => {
          void ensureUsdBrlRate();
        });
        return getSetting("onboarding_done");
      });
  }
  return bootPromise;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsOk = fontsLoaded || !!fontError;
  const [gate, setGate] = useState<"loading" | "onboarding" | "app">("loading");
  const router = useRouter();
  // ponytail: redirect once — re-running it remounts onboarding and resets step
  const redirected = useRef(false);

  useEffect(() => {
    void bootDb();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      void import("@/ai/usdBrlRate").then(({ ensureUsdBrlRate }) => {
        void ensureUsdBrlRate();
      });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!fontsOk) return;
    let cancelled = false;

    bootDb()
      .then((v) => {
        if (!cancelled) setGate(v === "1" ? "app" : "onboarding");
      })
      .catch(() => {
        if (!cancelled) setGate("app");
      });

    return () => {
      cancelled = true;
    };
  }, [fontsOk]);

  // Hand off to our own boot screen once fonts can render it (no gray gap).
  useEffect(() => {
    if (!fontsOk) return;
    const id = requestAnimationFrame(() => {
      void SplashScreen.hideAsync();
    });
    return () => cancelAnimationFrame(id);
  }, [fontsOk]);

  // Runs after the Stack mounts, so replace() has a navigator to act on.
  useEffect(() => {
    if (gate !== "onboarding" || redirected.current) return;
    redirected.current = true;
    router.replace("/onboarding" as never);
  }, [gate, router]);

  if (gate === "loading") {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <FinoMark size={120} />
        <ActivityIndicator color={colors.primary} style={styles.bootSpinner} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="notifications" />
        <Stack.Screen
          name="discarded"
          options={{
            headerShown: true,
            title: "Descartadas",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="choose-apps" />
        <Stack.Screen name="watched-banks" />
        <Stack.Screen name="ai-settings" />
        <Stack.Screen name="conversations" />
        <Stack.Screen name="transaction/[id]" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  bootSpinner: { marginTop: spacing.xl },
});
