// app/(tabs)/videos.tsx
import React, { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

const CHANNEL_HANDLE = "@whatyoudink";
const CHANNEL_URL = `https://www.youtube.com/${CHANNEL_HANDLE}`;
const SUBSCRIBE_URL = `https://www.youtube.com/${CHANNEL_HANDLE}?sub_confirmation=1`;

async function openUrl(url: string) {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) throw new Error("Cannot open link");
    await Linking.openURL(url);
  } catch {
    Alert.alert("Videos", "Could not open YouTube. Please try again.");
  }
}

export default function VideosTab() {
  const onOpenChannel = useCallback(() => openUrl(CHANNEL_URL), []);
  const onSubscribe = useCallback(() => openUrl(SUBSCRIBE_URL), []);
  const onOpenInstagram = useCallback(() => {
    // optional placeholder if you ever add more socials
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.wrap}>
        <Text style={styles.h1}>Videos</Text>
        <Text style={styles.sub}>
          Watch pickleball reviews, courts, and guides on YouTube.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{CHANNEL_HANDLE}</Text>
          <Text style={styles.cardSub}>
            Tap below to open the channel or subscribe.
          </Text>

          <Pressable onPress={onOpenChannel} style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
            <Text style={styles.btnText}>Open YouTube Channel</Text>
          </Pressable>

          <Pressable onPress={onSubscribe} style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}>
            <Text style={styles.btnText}>Subscribe</Text>
          </Pressable>

          <Text style={styles.muted}>
            Tip: This will open the YouTube app if it’s installed, otherwise your browser.
          </Text>
        </View>

        <View style={styles.cardSoft}>
          <Text style={styles.cardTitle}>Coming Soon</Text>
          <Text style={styles.cardSub}>
            We’ll add an in-app library view (latest uploads, playlists, categories).
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0f14" },
  wrap: { padding: 14, paddingBottom: 28 },

  h1: { fontSize: 28, fontWeight: "800", color: "rgba(255,255,255,0.92)", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 14, color: "rgba(255,255,255,0.60)" },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
  },
  cardSoft: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
  },

  cardTitle: { color: "rgba(255,255,255,0.92)", fontWeight: "900", fontSize: 16 },
  cardSub: { marginTop: 6, color: "rgba(255,255,255,0.60)", lineHeight: 18 },

  btn: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {
    marginTop: 10,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  btnText: { color: "rgba(255,255,255,0.92)", fontWeight: "900" },

  muted: { marginTop: 12, color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 16 },
});
