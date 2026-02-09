import React, { useMemo, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function BlogPostWebScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [articleTitle, setArticleTitle] = useState("Article");

  const safeSlug = useMemo(
    () => (typeof slug === "string" ? slug : ""),
    [slug]
  );

  const url = useMemo(() => {
    return `https://whatyoudink.com/post.php?slug=${encodeURIComponent(
      safeSlug
    )}&app=1`;
  }, [safeSlug]);

  const shareUrl = useMemo(() => {
    return `https://whatyoudink.com/post.php?slug=${encodeURIComponent(
      safeSlug
    )}`;
  }, [safeSlug]);

  const injectedJS = useMemo(() => {
    const bottom = Math.max(0, Math.floor(insets.bottom || 0));
    return `
      (function() {
        try {
          var bottom = ${bottom};
          document.documentElement.style.paddingBottom = bottom + 'px';
          document.body.style.paddingBottom = bottom + 'px';

          function sendTitle() {
            try {
              var t =
                document.querySelector('meta[property="og:title"]')?.content ||
                document.title ||
                'Article';
              window.ReactNativeWebView &&
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({ type: 'title', title: t })
                );
            } catch (e) {}
          }

          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(sendTitle, 50);
            setTimeout(sendTitle, 500);
          } else {
            document.addEventListener('DOMContentLoaded', function () {
              setTimeout(sendTitle, 50);
              setTimeout(sendTitle, 500);
            });
          }
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

  const openInBrowser = async () => {
    try {
      await WebBrowser.openBrowserAsync(shareUrl);
    } catch {}
  };

  const onShare = useCallback(async () => {
    try {
      await Share.share({
        title: articleTitle,
        message: `${articleTitle}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) {
      console.warn("Share cancelled or failed", e);
    }
  }, [articleTitle, shareUrl]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>

        <Text style={styles.title} numberOfLines={1}>
          {articleTitle}
        </Text>

        <View style={styles.rightActions}>
          <Pressable onPress={onShare} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </Pressable>

          <Pressable onPress={openInBrowser} style={styles.iconBtn}>
            <Ionicons name="open-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <WebView
        ref={webRef}
        source={{ uri: url }}
        style={styles.web}
        onNavigationStateChange={(navState) =>
          setCanGoBack(Boolean(navState.canGoBack))
        }
        injectedJavaScript={injectedJS}
        allowsBackForwardNavigationGestures={Platform.OS === "ios"}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === "title" && typeof data.title === "string") {
              setArticleTitle(data.title);
            }
          } catch {}
        }}
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
  rightActions: {
    flexDirection: "row",
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
