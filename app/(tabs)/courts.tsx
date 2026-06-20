// app/(tabs)/courts.tsx
//
// Courts (directory) tab — hybrid like Clinic: a native shell hosting a WebView
// of the public site's court directory (/courts/?app=1). The website renders
// chrome-free in app mode (wyd_is_app) and keeps ?app=1 on every internal link,
// so browsing states → cities → individual courts all stays inside this tab.
//
// WebView config intentionally mirrors clinic.tsx (known-good in Expo Go).

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import type {
  WebViewNavigation,
  ShouldStartLoadRequest,
} from "react-native-webview/lib/WebViewTypes";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import { Colors, Fonts } from "@/constants/theme";
import { apiUrl } from "../../src/api/base";

const DIRECTORY_URL = apiUrl("/courts/?app=1");
const SITE_HOST = "whatyoudink.com";

export default function CourtsScreen() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Ask for location up front so the directory's "nearby" / distance works
  // inside the WebView (best-effort — denial just hides distances).
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  // Android hardware back navigates within the WebView before leaving the tab.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(Boolean(nav.canGoBack));
  }, []);

  // Keep whatyoudink.com pages inside the WebView; send everything else
  // (YouTube, tel:, mailto:, other sites) to the system browser/dialer.
  const onShouldStart = useCallback((req: ShouldStartLoadRequest) => {
    const url = req.url || "";
    if (url.startsWith("about:") || url.includes(SITE_HOST)) return true;
    if (/^https?:\/\//i.test(url) || /^(tel:|mailto:)/i.test(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        {canGoBack ? (
          <Pressable
            onPress={() => webRef.current?.goBack()}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}

        <Text style={styles.title}>Courts</Text>

        <Pressable
          onPress={() => webRef.current?.reload()}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="refresh" size={19} color={Colors.muted} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          ref={webRef}
          source={{ uri: DIRECTORY_URL }}
          originWhitelist={["*"]}
          onNavigationStateChange={onNavChange}
          onShouldStartLoadWithRequest={onShouldStart}
          geolocationEnabled
          domStorageEnabled
          scrollEnabled
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentInset={{ top: 0, left: 0, right: 0, bottom: 0 }}
          style={{ flex: 1, backgroundColor: Colors.bg }}
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.loader, { paddingBottom: insets.bottom }]}>
              <ActivityIndicator color={Colors.ball} />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: Colors.text,
    fontFamily: Fonts.display,
    fontSize: 24,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bg,
  },
});
