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
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Eyebrow, Muted, Title } from "@/components/ui";
import { Colors, Fonts, Radius, Spacing, TypeScale } from "@/constants/theme";

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

// Mirrors blog_posts.post_type on the website API. Anything unknown falls
// back to "general" so the app never renders an empty/broken card.
type PostType = "court_review" | "gear_review" | "list" | "general";

type PostGear = {
  category: string | null;
  brand: string | null;
  product: string | null;
  rating_overall: number | null;
};

type PostItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  post_type: PostType;
  gear?: PostGear | null;
  url?: string | null;
  url_abs?: string | null;
  location?: PostLocation | null;
};

// Label + accent color shown on the type badge. Keep colors inside the
// existing brand palette so nothing clashes with the dark theme.
const TYPE_META: Record<PostType, { label: string; color: string }> = {
  court_review: { label: "Court Review", color: Colors.ball },
  gear_review: { label: "Gear Review", color: "#8FD3FF" },
  list: { label: "Roundup", color: "#FFD479" },
  general: { label: "Article", color: Colors.muted },
};

function normalizePostType(t: unknown): PostType {
  return t === "court_review" || t === "gear_review" || t === "list" || t === "general"
    ? t
    : "general";
}

// Type filter pills, matching the website's blog filters (All / Courts / Gear
// / Lists / General). "general" is only shown when posts of that type exist.
type TypeFilter = "all" | PostType;
const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "court_review", label: "Courts" },
  { key: "gear_review", label: "Gear" },
  { key: "list", label: "Lists" },
  { key: "general", label: "General" },
];

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

export default function BlogTab() {
  const [inputQ, setInputQ] = useState("");
  const [q, setQ] = useState("");

  const [sort, setSort] = useState<"recent" | "nearby">("recent");
  const [radius, setRadius] = useState(25);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const [basePosts, setBasePosts] = useState<PostItem[]>([]);
  // Distances by slug from the last "Nearby" lookup; used to rank posts.
  const [nearbyDist, setNearbyDist] = useState<Map<string, number> | null>(null);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Per-type counts for the filter pills (mirrors the website's pill counts).
  const typeCounts = useMemo(() => {
    const c: Record<TypeFilter, number> = {
      all: basePosts.length,
      court_review: 0,
      gear_review: 0,
      list: 0,
      general: 0,
    };
    for (const p of basePosts) c[p.post_type] += 1;
    return c;
  }, [basePosts]);

  // The displayed list is derived: filter by type, then (optionally) rank by
  // distance when "Nearby" is active. No imperative posts state to keep in sync.
  const processed = useMemo(() => {
    let list =
      typeFilter === "all" ? basePosts : basePosts.filter((p) => p.post_type === typeFilter);
    if (sort === "nearby" && nearbyDist) {
      list = [...list].sort(
        (a, b) =>
          (nearbyDist.get(a.slug) ?? Number.POSITIVE_INFINITY) -
          (nearbyDist.get(b.slug) ?? Number.POSITIVE_INFINITY)
      );
    }
    return list;
  }, [basePosts, typeFilter, sort, nearbyDist]);

  const visible = useMemo(() => processed.slice(0, page * PER_PAGE), [processed, page]);
  const hasMore = useMemo(() => processed.length > page * PER_PAGE, [processed.length, page]);

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
        post_type: normalizePostType((p as any).post_type),
        gear: (p as any).gear ?? null,
        location: p.location ?? null,
      }));

    setBasePosts(list);
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
      setPage(1);

      if (mode === "recent") {
        setSort("recent");
        return;
      }

      const r = rOverride ?? radius;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Nearby", "Allow location to sort posts by nearby reviews.");
        setSort("recent");
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
        setSort("recent");
        return;
      }

      setNearbyDist(distBySlug);
      setSort("nearby");
    },
    [fetchNearbyRank, radius]
  );

  const onSelectType = useCallback((tf: TypeFilter) => {
    setTypeFilter(tf);
    setPage(1);
    // Only court reviews support a "Nearby" sort (they're the geo-located
    // posts). Every other type just shows most recent.
    if (tf !== "court_review") setSort("recent");
  }, []);

  const onSubmitSearch = useCallback(() => {
    setQ(inputQ.trim());
  }, [inputQ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPosts(true);
      if (sort === "nearby") await applySort("nearby");
    } catch (e: any) {
      Alert.alert("Reviews", e?.message || "Refresh failed");
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
        Alert.alert("Reviews", e?.message || "Failed to load posts");
      });
  }, [fetchPosts]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /* ───────── Card ───────── */
  const renderItem = useCallback(({ item }: { item: PostItem }) => {
    const dateLabel = fmtDate(item.published_at);
    const type = item.post_type;
    const meta = TYPE_META[type];
    const loc = item.location ?? null;
    const gear = item.gear ?? null;

    // Court reviews carry a place; gear reviews carry a product. Other types
    // (roundups/articles) have neither, so they fall back to date-only.
    const cityState =
      type === "court_review" && loc
        ? [loc.city, loc.state].filter(Boolean).join(", ")
        : type === "gear_review" && gear?.category
        ? gear.category
        : "";

    const subtitle =
      type === "court_review"
        ? loc?.name ?? null
        : type === "gear_review"
        ? [gear?.brand, gear?.product].filter(Boolean).join(" ") || null
        : null;

    const ratingNum =
      type === "court_review"
        ? loc?.rating_overall
        : type === "gear_review"
        ? gear?.rating_overall
        : null;
    const rating = typeof ratingNum === "number" ? ratingNum.toFixed(1) : null;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/blog/[slug]",
            params: { slug: item.slug, type },
          })
        }
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {/* Featured image with rating + share overlay */}
        <View style={styles.thumb}>
          {item.featured_image_url ? (
            <Image
              source={{ uri: item.featured_image_url }}
              style={styles.thumbImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbFallback}>
              <Ionicons name="image-outline" size={36} color={Colors.muted2} />
            </View>
          )}

          {rating ? (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color={Colors.onBall} />
              <Body weight="extrabold" style={styles.ratingNum}>
                {rating}
              </Body>
            </View>
          ) : null}

          <Pressable
            onPress={(e: any) => {
              e?.stopPropagation?.();
              const url = `${API_BASE}/blog/${item.slug}`;
              Share.share({
                title: item.title,
                message: `${item.title}\n\n${url}`,
                url,
              }).catch(() => {});
            }}
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
            hitSlop={10}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
          </Pressable>

          <View style={styles.typeBadge}>
            <View style={[styles.typeDot, { backgroundColor: meta.color }]} />
            <Body weight="extrabold" style={styles.typeBadgeText}>
              {meta.label}
            </Body>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {(cityState || dateLabel) ? (
            <Eyebrow numberOfLines={1} style={{ marginBottom: 6 }}>
              {[cityState, dateLabel].filter(Boolean).join(" · ")}
            </Eyebrow>
          ) : null}

          <Title numberOfLines={2} style={styles.cardTitle}>
            {item.title}
          </Title>

          {!!subtitle && (
            <Muted numberOfLines={1} style={{ marginTop: 4 }}>
              {subtitle}
            </Muted>
          )}

          {!!item.excerpt && (
            <Body
              weight="regular"
              size="small"
              numberOfLines={3}
              style={styles.excerpt}
            >
              {item.excerpt}
            </Body>
          )}
        </View>
      </Pressable>
    );
  }, []);

  /* ───────── Header (search + sort) ───────── */
  const Header = useMemo(() => {
    return (
      <View style={styles.headerWrap}>
        <Eyebrow>Reviews · gear · roundups</Eyebrow>
        <Title style={styles.h1}>Reviews</Title>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={Colors.muted2} />
            <TextInput
              value={inputQ}
              onChangeText={setInputQ}
              placeholder="Search courts, cities…"
              placeholderTextColor={Colors.muted2}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={onSubmitSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Pressable
            onPress={onSubmitSearch}
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.85 }]}
          >
            <Body weight="extrabold" style={styles.searchBtnText}>
              Search
            </Body>
          </Pressable>
        </View>

        {/* Type filter pills — mirrors the website (All / Courts / Gear / Lists) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeRow}
        >
          {TYPE_FILTERS.map(({ key, label }) => {
            // Hide "General" unless there are general posts (or it's selected).
            if (key === "general" && typeCounts.general === 0 && typeFilter !== "general") {
              return null;
            }
            const on = typeFilter === key;
            return (
              <Pressable
                key={key}
                onPress={() => onSelectType(key)}
                style={[styles.typePill, on && styles.typePillOn]}
              >
                <Body
                  weight="bold"
                  style={[styles.typePillText, on && styles.typePillTextOn]}
                >
                  {label}
                </Body>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sort is only meaningful for court reviews (the geo-located posts). */}
        {typeFilter === "court_review" && (
        <View style={styles.sortRow}>
          <Pressable
            onPress={() => applySort("recent")}
            style={[styles.sortPill, sort === "recent" && styles.sortPillOn]}
          >
            <Body
              weight="bold"
              style={[styles.sortPillText, sort === "recent" && styles.sortPillTextOn]}
            >
              Most recent
            </Body>
          </Pressable>

          <Pressable
            onPress={() => applySort("nearby")}
            style={[styles.sortPill, sort === "nearby" && styles.sortPillOn]}
          >
            <Body
              weight="bold"
              style={[styles.sortPillText, sort === "nearby" && styles.sortPillTextOn]}
            >
              Nearby
            </Body>
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
                  style={[styles.radiusPill, radius === r && styles.radiusPillOn]}
                >
                  <Body
                    weight="extrabold"
                    style={[styles.radiusText, radius === r && styles.radiusTextOn]}
                  >
                    {r}mi
                  </Body>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        )}
      </View>
    );
  }, [applySort, inputQ, onSelectType, onSubmitSearch, radius, sort, typeCounts, typeFilter]);

  if (loading && visible.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.ball} />
          <Muted style={{ marginTop: 10 }}>Loading reviews…</Muted>
        </View>
      </SafeAreaView>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.ball}
            colors={[Colors.ball]}
          />
        }
        onEndReachedThreshold={0.6}
        onEndReached={onLoadMore}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Body weight="extrabold" style={{ color: Colors.text }}>
                No reviews found.
              </Body>
              <Muted style={{ marginTop: 6 }}>Try a different search.</Muted>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ paddingVertical: Spacing.lg }}>
            {loadingMore ? (
              <View style={styles.footerRow}>
                <ActivityIndicator color={Colors.ball} />
                <Muted style={{ marginLeft: 10 }}>Loading more…</Muted>
              </View>
            ) : hasMore ? (
              <Pressable
                onPress={onLoadMore}
                style={({ pressed }) => [styles.loadMore, pressed && { opacity: 0.85 }]}
              >
                <Body weight="extrabold" style={styles.loadMoreText}>
                  Load more
                </Body>
              </Pressable>
            ) : visible.length > 0 ? (
              <Muted style={{ textAlign: "center" }}>You're all caught up.</Muted>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  listContent: { paddingHorizontal: Spacing.screenPadH, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  /* Header */
  headerWrap: { paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
  h1: {
    marginTop: 4,
    fontSize: 32,
    lineHeight: 36,
  },

  /* Search */
  searchRow: { flexDirection: "row", gap: 10, marginTop: Spacing.xl, alignItems: "center" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.body.medium,
    fontSize: TypeScale.bodySm,
  },
  searchBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: Colors.ball,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: Colors.onBall,
    fontSize: TypeScale.bodySm,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  /* Type filter pills */
  typeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingRight: Spacing.sm,
  },
  typePill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  typePillOn: { backgroundColor: Colors.ball, borderColor: Colors.ball },
  typePillText: {
    color: Colors.text,
    fontSize: TypeScale.caption,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  typePillTextOn: { color: Colors.onBall },

  /* Sort row */
  sortRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    alignItems: "center",
    flexWrap: "wrap",
  },
  sortPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  sortPillOn: {
    backgroundColor: Colors.ballDim,
    borderColor: Colors.ballSoft,
  },
  sortPillText: {
    color: Colors.muted,
    fontSize: TypeScale.caption,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sortPillTextOn: { color: Colors.ball },

  radiusRow: { flexDirection: "row", gap: 6 },
  radiusPill: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  radiusPillOn: { backgroundColor: Colors.ballDim, borderColor: Colors.ballSoft },
  radiusText: {
    color: Colors.muted,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  radiusTextOn: { color: Colors.ball },

  /* Card */
  card: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  cardPressed: { backgroundColor: "rgba(235,235,235,0.06)" },

  thumb: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surface,
    position: "relative",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  ratingPill: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ball,
  },
  ratingNum: {
    color: Colors.onBall,
    fontSize: TypeScale.caption,
    letterSpacing: 0.4,
  },

  shareBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },

  typeBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  typeDot: { width: 7, height: 7, borderRadius: 4 },
  typeBadgeText: {
    color: "#fff",
    fontSize: 10.5,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },

  cardBody: { padding: Spacing.lg },
  cardTitle: {
    fontSize: 20,
    lineHeight: 24,
  },
  excerpt: { marginTop: Spacing.md, color: Colors.muted, lineHeight: 19 },

  /* Footer / empty */
  empty: {
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  loadMore: {
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderUp,
    backgroundColor: "rgba(235,235,235,0.06)",
  },
  loadMoreText: {
    color: Colors.text,
    fontSize: TypeScale.bodySm,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
