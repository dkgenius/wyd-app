// app/webview.tsx
import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { isMapUrl, isCourtsDirectoryUrl } from "../src/nav/links";

const SITE_HOST = "whatyoudink.com";

export default function AppWebviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);

  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();

  const safeUrl = useMemo(() => (typeof url === "string" ? url : ""), [url]);

  const [canGoBack, setCanGoBack] = useState(false);

  const headerTitle = useMemo(() => {
    if (typeof title === "string" && title.trim().length) return title;
    if (safeUrl.includes("privacy")) return "Privacy Policy";
    if (safeUrl.includes("terms")) return "Terms of Service";
    return "Web";
  }, [title, safeUrl]);

  const injectedJS = useMemo(() => {
    const bottom = Math.max(0, Math.floor(insets.bottom || 0));
    return `
      (function() {
        try {
          var bottom = ${bottom};
          document.documentElement.style.paddingBottom = bottom + 'px';
          document.body.style.paddingBottom = bottom + 'px';
        } catch (e) {}
      })();
      true;
    `;
  }, [insets.bottom]);

  const handleBack = () => {
    if (canGoBack && webRef.current) {
      webRef.current.goBack();
    } else {
      router.back();
    }
  };

  // Keep navigation native where it matters: map links open the native Map tab,
  // "view all courts" / directory links open the native Courts tab. The court
  // page itself (and other same-site pages) stay in this WebView; off-site
  // links go to the system browser.
  const onShouldStart = (req: ShouldStartLoadRequest) => {
    const url = req?.url || "";
    if (!url) return true;
    if (req.isTopFrame === false) return true;
    if (isMapUrl(url)) {
      router.push("/map");
      return false;
    }
    if (isCourtsDirectoryUrl(url)) {
      router.push("/courts");
      return false;
    }
    if (url.startsWith("about:") || url.includes(SITE_HOST)) return true;
    if (/^https?:\/\//i.test(url) || /^(tel:|mailto:)/i.test(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  };

  // If no URL, render nothing (or you can show an error screen)
  if (!safeUrl) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={handleBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>

        <Text style={styles.title} numberOfLines={1}>
          {headerTitle}
        </Text>

        {/* Right spacer to keep title centered like your blog */}
        <View style={styles.iconBtn} />
      </View>

      <WebView
        ref={webRef}
        source={{ uri: safeUrl }}
        style={styles.web}
        onNavigationStateChange={(navState) => setCanGoBack(Boolean(navState.canGoBack))}
        onShouldStartLoadWithRequest={onShouldStart}
        injectedJavaScript={injectedJS}
        geolocationEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures={Platform.OS === "ios"}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0f14" },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: "#0b0f14",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  web: { flex: 1, backgroundColor: "transparent" },
});
