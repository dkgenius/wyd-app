// app/_layout.tsx
import "react-native-reanimated";

import { useEffect, useState, createContext } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Location from "expo-location";

/**
 * Makes the user's first location available app-wide.
 * (Optional) Any screen can read it via useContext(InitialLocationContext).
 */
export const InitialLocationContext = createContext<Location.LocationObject | null>(null);

export const unstable_settings = {
  anchor: "(tabs)",
};

// Keep the native splash visible while we request location + fetch a first fix.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [initialLocation, setInitialLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
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

  // While the splash is visible, render nothing.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <InitialLocationContext.Provider value={initialLocation}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </InitialLocationContext.Provider>

      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
