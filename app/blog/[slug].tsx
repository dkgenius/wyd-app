// app/blog/[slug].tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { WebView } from "react-native-webview";

const API_BASE = "https://whatyoudink.com";

type ApiPost = {
  ok: boolean;
  post?: {
    id: number;
    title: string;
    slug: string;
    excerpt?: string | null;
    content_html?: string | null;
    featured_image_url?: string | null;
    published_at?: string | null;
    updated_at?: string | null;
  };
  error?: string;
};

export default function BlogSlugScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Blog");
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!slug) {
          setErr("Missing slug");
          setLoading(false);
          return;
        }

        // Try post.php first (common), fall back to posts.php
        const candidates = [
          `${API_BASE}/api/v1/post.php?slug=${encodeURIComponent(slug)}`,
          `${API_BASE}/api/v1/posts.php?slug=${encodeURIComponent(slug)}`,
        ];

        let json: ApiPost | null = null;

        for (const u of candidates) {
          const res = await fetch(u);
          const j = await res.json().catch(() => null);
          if (j && (j.ok || j.post)) {
            json = j;
            break;
          }
        }

        if (!json) {
          setErr("Could not load the post from the API.");
          setLoading(false);
          return;
        }

        if (json.ok === false) {
          setErr(json.error || "API error");
          setLoading(false);
          return;
        }

        const p = json.post;
        if (!p) {
          setErr("Post not found.");
          setLoading(false);
          return;
        }

        setTitle(p.title || "Blog");
        const body = p.content_html || "<p>No content.</p>";

        // Wrap in minimal HTML so it looks decent inside WebView
        const wrapped = `
<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { background:#0b0f14; color:#fff; margin:0; padding:16px; font-family: -apple-system, system-ui, Segoe UI, Roboto, Arial; }
  h1,h2,h3 { color:#fff; }
  p,li { color: rgba(255,255,255,0.78); line-height: 1.45; font-size: 16px; }
  a { color: rgba(199,255,46,0.95); }
  img { max-width: 100%; height: auto; border-radius: 14px; }
</style>
</head>
<body>
${body}
</body>
</html>`;
        setHtml(wrapped);
        setLoading(false);
      } catch (e: any) {
        setErr(e?.message || "Failed to load post");
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <>
      <Stack.Screen options={{ title }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : err ? (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.h1}>Error</Text>
          <Text style={styles.muted}>{err}</Text>
        </ScrollView>
      ) : (
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={{ flex: 1, backgroundColor: "#0b0f14" }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0f14" },
  center: { flex: 1, backgroundColor: "#0b0f14", alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 22, fontWeight: "800", color: "white" },
  muted: { marginTop: 10, color: "rgba(255,255,255,0.65)" },
});
