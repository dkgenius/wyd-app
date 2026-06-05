import React, { useMemo, useRef, useState, useCallback } from "react";
import { View, Pressable, StyleSheet, Platform, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Body, Muted } from "@/components/ui";
import { Colors, Fonts, Radius, Spacing, TypeScale } from "@/constants/theme";

/**
 * Blog post detail screen — loads the public post page inside a WebView.
 *
 * The article body, "Published / Updated" date line, and hero treatment all
 * come from /post.php on the website, so any visual change there propagates
 * here automatically. This screen owns only the surrounding chrome:
 *   - Top bar with back + title + share + open-in-browser
 *   - Safe area handling for status bar
 *   - Bottom padding injection so content doesn't sit under the device chrome
 */
export default function BlogPostWebScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug, type } = useLocalSearchParams<{ slug?: string; type?: string }>();
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [articleTitle, setArticleTitle] = useState("Review");

  const safeSlug = useMemo(
    () => (typeof slug === "string" ? slug : ""),
    [slug]
  );

  // Eyebrow label driven by the post_type passed from the Reviews list.
  // Defaults to "Review" when opened from a context that doesn't pass it.
  const typeLabel = useMemo(() => {
    switch (type) {
      case "court_review":
        return "Court Review";
      case "gear_review":
        return "Gear Review";
      case "list":
        return "Roundup";
      case "general":
        return "Article";
      default:
        return "Review";
    }
  }, [type]);

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
                'Review';
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
      // user cancelled — no-op
    }
  }, [articleTitle, shareUrl]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Muted style={styles.eyebrow}>{typeLabel}</Muted>
          <Body weight="extrabold" numberOfLines={1} style={styles.title}>
            {articleTitle}
          </Body>
        </View>

        <View style={styles.rightActions}>
          <Pressable onPress={onShare} style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]} hitSlop={8}>
            <Ionicons name="share-outline" size={20} color={Colors.text} />
          </Pressable>

          <Pressable onPress={openInBrowser} style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]} hitSlop={8}>
            <Ionicons name="open-outline" size={20} color={Colors.text} />
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
  safe: { flex: 1, backgroundColor: Colors.bg },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },

  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  iconBtnPressed: {
    backgroundColor: Colors.card,
  },

  titleWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  eyebrow: {
    color: Colors.ball,
    fontSize: 9.5,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    fontFamily: Fonts.body.bold,
    marginBottom: 1,
  },
  title: {
    color: Colors.text,
    fontSize: TypeScale.bodySm,
    fontFamily: Fonts.body.extrabold,
    textAlign: "center",
  },

  rightActions: {
    flexDirection: "row",
    gap: 2,
  },

  web: { flex: 1, backgroundColor: Colors.bg },
});
