// app/(tabs)/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { router } from "expo-router";

const API_BASE = "https://whatyoudink.com";

const FEATURED_EMBED =
  "https://www.youtube.com/embed/R2fy5zqaX-0?playsinline=1&modestbranding=1&rel=0&controls=1";

type ApiLocation = {
  id: number;
  name: string;
  city: string;
  state: string;
  distance_mi?: number | null;
  blog?: {
    id: number | null;
    slug?: string | null;
    title?: string | null;
    url?: string | null; // absolute (since you updated to absolute URLs)
  };
};

function slugFromBlogUrl(url?: string | null): string | null {
  if (!url) return null;
  // expects something like https://whatyoudink.com/blog/some-slug
  const m = url.match(/\/blog\/([^/?#]+)/i);
  return m ? m[1] : null;
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ApiLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reviewedNearby = useMemo(() => items.filter((x) => x.blog?.url), [items]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission not granted. Cannot show nearby reviews.");
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;

        const url =
          `${API_BASE}/api/v1/locations/nearby.php` +
          `?lat=${encodeURIComponent(lat)}` +
          `&lng=${encodeURIComponent(lng)}` +
          `&radius=25`;

        const res = await fetch(url);
        const json = await res.json();

        if (!json?.ok) {
          setError(json?.error || "API error");
          setItems([]);
          setLoading(false);
          return;
        }

        setItems(json.locations || []);
        setLoading(false);
      } catch (e: any) {
        setError(e?.message || "Failed to load nearby data");
        setLoading(false);
      }
    })();
  }, []);

  const openBlogInApp = (item: ApiLocation) => {
    const slug = item.blog?.slug || slugFromBlogUrl(item.blog?.url);
    if (!slug) {
      Alert.alert("Missing blog slug", "This location doesn't have a blog slug/url.");
      return;
    }

    // Navigate to in-app blog screen
    router.push({ pathname: "/blog/[slug]", params: { slug } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>What You Dink</Text>
      <Text style={styles.sub}>
        Pickleball reviews, courts, clinics, and videos.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Video</Text>
        <View style={styles.videoWrap}>
          <WebView
			  source={{ uri: FEATURED_EMBED }}
			  javaScriptEnabled
			  domStorageEnabled
			  allowsFullscreenVideo
			  mediaPlaybackRequiresUserAction={true}
			  originWhitelist={["*"]}
			  setSupportMultipleWindows={false}
			  style={styles.video}
			/>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Nearby Reviews</Text>
          <Text style={styles.muted}>Tap to open in app</Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 18 }}>
            <ActivityIndicator />
            <Text style={[styles.muted, { marginTop: 10 }]}>
              Loading nearby courts…
            </Text>
          </View>
        ) : error ? (
          <Text style={[styles.muted, { marginTop: 8 }]}>{error}</Text>
        ) : reviewedNearby.length === 0 ? (
          <Text style={[styles.muted, { marginTop: 8 }]}>
            No reviewed courts found nearby.
          </Text>
        ) : (
          reviewedNearby.map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() => openBlogInApp(item)}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.city}, {item.state}
                {typeof item.distance_mi === "number"
                  ? ` • ${item.distance_mi.toFixed(1)} mi`
                  : ""}
              </Text>
              <Text style={styles.cardLink}>
                Blog: {item.blog?.title || "Open review"}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={{ height: 18 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0f14" },
  content: { padding: 16, paddingBottom: 28 },

  h1: { fontSize: 28, fontWeight: "800", color: "white" },
  sub: { marginTop: 6, color: "rgba(255,255,255,0.7)" },

  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "white",
    marginBottom: 10,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  muted: { color: "rgba(255,255,255,0.5)" },

  videoWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    height: 210,
    backgroundColor: "black",
  },
  video: { flex: 1 },

  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 12,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "800" },
  cardMeta: { marginTop: 4, color: "rgba(255,255,255,0.65)" },
  cardLink: {
    marginTop: 8,
    color: "rgba(199,255,46,0.9)",
    fontWeight: "700",
  },
});
