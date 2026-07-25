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
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { colors } from "@/constants/theme";
import { initDb } from "@/database/db";
import { syncWatchedToNative } from "@/database/watchedBanksRepo";
import { getSetting } from "@/database/settingsRepo";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

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
    if (!fontsLoaded) return;
    let cancelled = false;

    initDb()
      .then(() => syncWatchedToNative())
      .then(() => {
        void import("@/ai/usdBrlRate").then(({ ensureUsdBrlRate }) => {
          void ensureUsdBrlRate();
        });
        return getSetting("onboarding_done");
      })
      .then((v) => {
        if (cancelled) return;
        setReady(true);
        if (v !== "1") router.replace("/onboarding" as never);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, router]);

  if (!fontsLoaded || !ready) return null;

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
