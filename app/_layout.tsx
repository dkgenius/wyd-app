// app/_layout.tsx
import "react-native-reanimated";

import { useEffect, useMemo, useState, createContext } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Location from "expo-location";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import OnboardingModal from "../src/components/OnboardingModal";

// Brand fonts — mirrors the public site (Bebas Neue display + DM Sans body).
import {
  useFonts as useBebasFonts,
  BebasNeue_400Regular,
} from "@expo-google-fonts/bebas-neue";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from "@expo-google-fonts/dm-sans";

/**
 * Makes the user's first location available app-wide.
 * (Optional) Any screen can read it via useContext(InitialLocationContext).
 */
export const InitialLocationContext = createContext<Location.LocationObject | null>(null);

export const unstable_settings = {
  anchor: "(tabs)",
};

// Keep the native splash visible while we request location + load first-run flags.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const appVersion = useMemo(() => {
    return (
      Constants?.expoConfig?.version ||
      Constants?.manifest2?.extra?.expoClient?.version ||
      "1.0.0"
    );
  }, []);

  const [ready, setReady] = useState(false);
  const [initialLocation, setInitialLocation] = useState<Location.LocationObject | null>(null);

  // First-run onboarding flag (stored as "1" after completion)
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Load brand fonts before render. The hook merges all font maps; render is blocked below.
  const [fontsLoaded, fontError] = useBebasFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Read onboarding flag ASAP (doesn't block layout; modal can pop on top once ready)
        try {
          const seen = await AsyncStorage.getItem("wyd_has_seen_onboarding_v1");
          if (!cancelled) setShowOnboarding(seen !== "1");
        } catch {
          if (!cancelled) setShowOnboarding(false);
        }

        // Location permission + first fix (optional)
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          if (!cancelled) setInitialLocation(loc);
        } else {
          // Permission denied — continue loading the app (location remains null).
          if (!cancelled) setInitialLocation(null);
        }
      } catch {
        // If anything fails, don't hang on the splash screen.
        if (!cancelled) setInitialLocation(null);
      } finally {
        if (!cancelled) {
          setReady(true);
          await SplashScreen.hideAsync();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // While the splash is visible or fonts are mid-load, render nothing.
  // (We still continue if fontError fires — fall back to system fonts rather than block the app.)
  if (!ready || (!fontsLoaded && !fontError)) return null;

  return (
    <SafeAreaProvider>
      <InitialLocationContext.Provider value={initialLocation}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </InitialLocationContext.Provider>

      {/* Pops on top of the already-rendered layout on first launch */}
      <OnboardingModal
        visible={showOnboarding}
        appVersion={appVersion}
        onDone={async () => {
          try {
            await AsyncStorage.setItem("wyd_has_seen_onboarding_v1", "1");
          } catch {
            // ignore
          }
          setShowOnboarding(false);
        }}
      />

      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
