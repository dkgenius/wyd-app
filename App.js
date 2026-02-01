import React, { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";

import RootNavigator from "./src/navigation/RootNavigator";
import OnboardingModal from "./src/components/OnboardingModal";

// AsyncStorage is lightweight + reliable for first-run flags.
import AsyncStorage from "@react-native-async-storage/async-storage";

// Keep the native splash visible while we decide what to show.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const appVersion = useMemo(() => {
    // Prefer the build's native version where available; fall back to expo config version.
    const v =
      Constants?.expoConfig?.version ||
      Constants?.manifest2?.extra?.expoClient?.version ||
      "1.0.0";
    return v;
  }, []);

  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const seen = await AsyncStorage.getItem("wyd_has_seen_onboarding_v1");
        if (!cancelled) {
          setShowOnboarding(seen !== "1");
        }
      } catch (e) {
        // If storage fails, don't block the app.
        if (!cancelled) setShowOnboarding(false);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  return (
    <>
      <RootNavigator />

      <OnboardingModal
        visible={showOnboarding}
        appVersion={appVersion}
        onDone={async () => {
          try {
            await AsyncStorage.setItem("wyd_has_seen_onboarding_v1", "1");
          } catch (e) {
            // ignore
          }
          setShowOnboarding(false);
        }}
      />
    </>
  );
}
