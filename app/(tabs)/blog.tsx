// app/(tabs)/blog.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Share,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE = "https://whatyoudink.com";
const PER_PAGE = 20;
const FETCH_LIMIT = 100;

type PostLocation = {
  id: number | null;
  name: string | null;
  city: string | null;
  state: string | null;
  rating_overall: number | null;
};

type PostItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  url?: string | null;
  url_abs?: string | null;
  location?: PostLocation | null;
};

type PostsResponse = { ok: boolean; error?: string; posts?: PostItem[] };

type NearbyLocation = {
  distance_mi?: number | null;
  blog?: { slug?: string | null; url_abs?: string | null } | null;
};
type NearbyResponse = { ok: boolean; error?: string; locations?: NearbyLocation[] };

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function withTimeout<T>(p: Promise<T>, ms: number, label = "Timed out") {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function slugFromBlogUrl(url?: string | null) {
  if (!url) return null;
  const m = url.match(/\/blog\/([^/?#]+)/i);
  return m ? m[1] : null;
}

function RatingBalls({ value }: { value: number | null }) {
  if (value === null) return <Text style={styles.muted}>—</Text>;
  const v = clamp(Number(value), 0, 10);
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  return (
    <View style={styles.ballsRow}>
      {Array.from({ length: 10 }).map((_, idx) => {
        const i = idx + 1;
        const on = i <= full;
        const isHalf = i === full + 1 && half;
        return <View key={i} style={[styles.ball, on && styles.ballOn, isHalf && styles.ballHalf]} />;
      })}
    </View>
  );
}

export default function BlogTab() {
  const [inputQ, setInputQ] = useState("");
  const [q, setQ] = useState("");

  const [sort, setSort] = useState<"recent" | "nearby">("recent");
  const [radius, setRadius] = useState(25);

  const [basePosts, setBasePosts] = useState<PostItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const visible = useMemo(() => posts.slice(0, page * PER_PAGE), [posts, page]);
  const hasMore = useMemo(() => posts.length > page * PER_PAGE, [posts.length, page]);

  const fetchPosts = useCallback(async (replacePage = true) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    params.set("limit", String(FETCH_LIMIT));

    const url = `${API_BASE}/api/v1/posts.php?${params.toString()}`;

    const res = await fetch(url, { signal: ac.signal, headers: { Accept: "application/json" } });
    const json = (await res.json()) as PostsResponse;
    if (!json?.ok) throw new Error(json?.error || "Failed to load posts");

    const list = (json.posts ?? [])
      .filter((p) => p && typeof p.slug === "string" && typeof p.title === "string")
      .map((p) => ({
        ...p,
        excerpt: p.excerpt ?? null,
        featured_image_url: p.featured_image_url ?? null,
        published_at: p.published_at ?? null,
        location: p.location ?? null,
      }));

    setBasePosts(list);
    setPosts(list);
    if (replacePage) setPage(1);
  }, [q]);

  const fetchNearbyRank = useCallback(async (lat: number, lng: number, r: number) => {
    const url =
      `${API_BASE}/api/v1/locations/nearby.php` +
      `?lat=${encodeURIComponent(lat)}` +
      `&lng=${encodeURIComponent(lng)}` +
      `&radius=${encodeURIComponent(r)}`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const json = (await res.json()) as NearbyResponse;
    if (!json?.ok) throw new Error(json?.error || "Nearby failed");

    const map = new Map<string, number>();
    for (const loc of json.locations ?? []) {
      const slug = loc.blog?.slug || slugFromBlogUrl(loc.blog?.url_abs);
      const d = typeof loc.distance_mi === "number" ? loc.distance_mi : null;
      if (slug && d !== null && !map.has(slug)) map.set(slug, d);
    }
    return map;
  }, []);

  const applySort = useCallback(
    async (mode: "recent" | "nearby", rOverride?: number) => {
      setSort(mode);
      setPage(1);

      if (mode === "recent") {
        setPosts(basePosts);
        return;
      }

      const r = rOverride ?? radius;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Nearby", "Allow location to sort posts by nearby reviews.");
        setSort("recent");
        setPosts(basePosts);
        return;
      }

      const pos = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        8000,
        "Location taking too long"
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const distBySlug = await fetchNearbyRank(lat, lng, r);

      if (distBySlug.size === 0) {
        Alert.alert("Nearby", "No nearby reviewed locations found in that radius.");
        setPosts(basePosts);
        return;
      }

      const ranked = [...basePosts].map((p) => ({
        p,
        d: distBySlug.get(p.slug) ?? Number.POSITIVE_INFINITY,
      }));

      ranked.sort((a, b) => a.d - b.d);

      setPosts(ranked.map((x) => x.p));
    },
    [basePosts, fetchNearbyRank, radius]
  );

  const onSubmitSearch = useCallback(() => {
    setQ(inputQ.trim());
  }, [inputQ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPosts(true);
      if (sort === "nearby") await applySort("nearby");
    } catch (e: any) {
      Alert.alert("Blog", e?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [applySort, fetchPosts, sort]);

  const onLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading || refreshing) return;
    setLoadingMore(true);
    setPage((p) => p + 1);
    setTimeout(() => setLoadingMore(false), 200);
  }, [hasMore, loading, loadingMore, refreshing]);

  useEffect(() => {
    setLoading(true);
    fetchPosts(true)
      .then(() => setLoading(false))
      .catch((e: any) => {
        setLoading(false);
        Alert.alert("Blog", e?.message || "Failed to load posts");
      });
  }, [fetchPosts]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const renderItem = useCallback(({ item }: { item: PostItem }) => {
    const dateLabel = fmtDate(item.published_at);
    const loc = item.location ?? null;

    const locLine =
      loc?.name
        ? `${loc.name}${loc.city || loc.state ? ` (${loc.city ?? ""}${loc.city && loc.state ? ", " : ""}${loc.state ?? ""})` : ""}`
        : "";

    const rating = typeof loc?.rating_overall === "number" ? loc.rating_overall : null;

    return (
      <Pressable
        onPress={() => router.push({ pathname: "/blog/[slug]", params: { slug: item.slug } })}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <Pressable
          onPress={(e) => {
            // Prevent opening the article when tapping Share
            // @ts-ignore
            e?.stopPropagation?.();
            const url = `${API_BASE}/blog/${item.slug}`;
            Share.share({ title: item.title, message: `${item.title}\n\n${url}`, url }).catch(() => {});
          }}
          style={styles.shareBtn}
          hitSlop={10}
        >
          <Ionicons name="share-outline" size={18} color="#fff" />
        </Pressable>

        {!!item.featured_image_url && (
          <View style={styles.thumb}>
            <Image source={{ uri: item.featured_image_url }} style={styles.thumbImg} resizeMode="cover" />
          </View>
        )}

        <View style={styles.metaRow}>
          {!!dateLabel && <Text style={styles.metaText}>{dateLabel}</Text>}
          {!!locLine && <Text style={styles.metaText}>• {locLine}</Text>}

          {rating !== null && (
            <View style={styles.ratingPill}>
              <RatingBalls value={rating} />
              <Text style={styles.ratingNum}>{rating.toFixed(1)}/10</Text>
            </View>
          )}
        </View>

        <Text style={styles.h2} numberOfLines={2}>{item.title}</Text>
        {!!item.excerpt && <Text style={styles.excerpt} numberOfLines={3}>{item.excerpt}</Text>}
      </Pressable>
    );
  }, []);

  const Header = useMemo(() => {
    return (
      <View style={styles.headerWrap}>
        <Text style={styles.h1}>Articles</Text>

        <View style={styles.searchRow}>
          <TextInput
            value={inputQ}
            onChangeText={setInputQ}
            placeholder="Search courts, cities, gear, etc…"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={onSubmitSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <Pressable onPress={onSubmitSearch} style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
            <Text style={styles.btnText}>Search</Text>
          </Pressable>
        </View>

        <View style={styles.sortRow}>
          <Pressable
            onPress={() => applySort("recent")}
            style={({ pressed }) => [styles.pill, sort === "recent" && styles.pillOn, pressed && styles.pillPressed]}
          >
            <Text style={[styles.pillText, sort === "recent" && styles.pillTextOn]}>Most recent</Text>
          </Pressable>

          <Pressable
            onPress={() => applySort("nearby")}
            style={({ pressed }) => [styles.pill, sort === "nearby" && styles.pillOn, pressed && styles.pillPressed]}
          >
            <Text style={[styles.pillText, sort === "nearby" && styles.pillTextOn]}>Nearby</Text>
          </Pressable>

          {sort === "nearby" && (
            <View style={styles.radiusRow}>
              {[25, 50, 100].map((r) => (
                <Pressable
                  key={r}
                  onPress={() => {
                    setRadius(r);
                    applySort("nearby", r).catch(() => {});
                  }}
                  style={({ pressed }) => [
                    styles.radiusPill,
                    radius === r && styles.radiusPillOn,
                    pressed && styles.pillPressed,
                  ]}
                >
                  <Text style={[styles.radiusText, radius === r && styles.radiusTextOn]}>{r} mi</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }, [applySort, inputQ, onSubmitSearch, radius, sort]);

  if (loading && visible.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={[styles.muted, { marginTop: 10 }]}>Loading posts…</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <FlatList
        data={visible}
        keyExtractor={(it) => it.slug}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.6}
        onEndReached={onLoadMore}
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.card, { padding: 14, marginTop: 12 }]}>
              <Text style={styles.emptyTitle}>No posts found.</Text>
              <Text style={styles.muted}>Try a different search.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ paddingVertical: 14 }}>
            {loadingMore ? (
              <View style={styles.footerRow}>
                <ActivityIndicator />
                <Text style={[styles.muted, { marginLeft: 10 }]}>Loading more…</Text>
              </View>
            ) : hasMore ? (
              <Pressable onPress={onLoadMore} style={({ pressed }) => [styles.loadMore, pressed && styles.btnPressed]}>
                <Text style={styles.btnText}>Load more</Text>
              </Pressable>
            ) : visible.length > 0 ? (
              <Text style={[styles.muted, { textAlign: "center" }]}>You’re all caught up.</Text>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0f14" },
  listContent: { padding: 14, paddingBottom: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerWrap: { paddingBottom: 8 },
  h1: { fontSize: 28, fontWeight: "800", color: "rgba(255,255,255,0.92)", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 14, color: "rgba(255,255,255,0.60)" },

  searchRow: { flexDirection: "row", gap: 10, marginTop: 14, alignItems: "center" },
  searchInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    color: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  btn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  btnText: { color: "rgba(255,255,255,0.90)", fontWeight: "800" },

  sortRow: { flexDirection: "row", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pillOn: { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.22)" },
  pillPressed: { opacity: 0.92 },
  pillText: { color: "rgba(255,255,255,0.70)", fontWeight: "700" },
  pillTextOn: { color: "rgba(255,255,255,0.92)" },

  radiusRow: { flexDirection: "row", gap: 8, marginLeft: 2 },
  radiusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  radiusPillOn: { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.22)" },
  radiusText: { color: "rgba(255,255,255,0.65)", fontWeight: "800", fontSize: 12 },
  radiusTextOn: { color: "rgba(255,255,255,0.92)" },

  card: {
    position: "relative",

    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    marginTop: 12,
  },
  cardPressed: { transform: [{ translateY: -1 }], backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.16)" },

  shareBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    zIndex: 5,
  },

  thumb: {
    width: "100%",
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 10,
  },
  thumbImg: { width: "100%", height: "100%" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 2 },
  metaText: { fontSize: 13, color: "rgba(255,255,255,0.60)" },

  h2: { marginTop: 8, marginBottom: 6, fontSize: 18, fontWeight: "800", color: "rgba(255,255,255,0.92)", letterSpacing: -0.2, lineHeight: 22 },
  excerpt: { color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 19 },

  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  ratingNum: { fontWeight: "900", fontSize: 12, color: "rgba(255,255,255,0.90)" },

  ballsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ball: {
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ballOn: { backgroundColor: "rgba(184,255,0,0.95)", borderColor: "rgba(0,0,0,0.25)" },
  ballHalf: { backgroundColor: "rgba(184,255,0,0.55)", borderColor: "rgba(0,0,0,0.25)" },

  muted: { color: "rgba(255,255,255,0.60)" },
  emptyTitle: { color: "rgba(255,255,255,0.92)", fontWeight: "800" },

  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  loadMore: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
