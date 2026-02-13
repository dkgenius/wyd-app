// app/webview.tsx
import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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

  // If no URL, render nothing (or you can show an error screen)
  if (!safeUrl) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
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
        injectedJavaScript={injectedJS}
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
