// app/(tabs)/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  Screen,
  Display,
  Title,
  Body,
  Muted,
  Eyebrow,
  Button,
  Card,
  Section,
} from "@/components/ui";
import { Colors, Fonts, Radius, Spacing, TypeScale } from "@/constants/theme";

const API_BASE = "https://whatyoudink.com";

type ApiNearbyLocation = {
  id: number;
  name: string;
  city: string;
  state: string;
  distance_mi?: number | null;
  rating_overall?: number | null;
  blog?: {
    id: number | null;
    slug?: string | null;
    title?: string | null;
    url?: string | null;
  };
};

type ApiPost = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  featured_image_url?: string | null;
  published_at?: string | null;
};

function slugFromBlogUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/blog\/([^/?#]+)/i);
  return m ? m[1] : null;
}

function fmtRating(r?: number | null) {
  if (typeof r !== "number" || Number.isNaN(r)) return null;
  return r.toFixed(1);
}

/* ───────── Header: logo + socials ───────── */
function BrandHeader() {
  return (
    <View style={styles.brandRow}>
      <Image
        source={require("../../assets/images/whatyoudinklogo-outline.png")}
        style={styles.brandLogo}
        resizeMode="contain"
      />

      <View style={styles.socials}>
        {[
          { icon: "logo-instagram" as const, url: "https://www.instagram.com/whatyoudink" },
          { icon: "logo-youtube" as const, url: "https://www.youtube.com/@whatyoudink" },
          { icon: "logo-tiktok" as const, url: "https://www.tiktok.com/@whatyoudink" },
        ].map((s) => (
          <Pressable
            key={s.icon}
            onPress={() => Linking.openURL(s.url)}
            hitSlop={8}
            style={({ pressed }) => [styles.socialIcon, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name={s.icon} size={20} color={Colors.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ───────── Hero ───────── */
function Hero() {
  return (
    <View style={styles.hero}>
      {/* Small marginBottom: the headline's paddingTop already adds room
          above the caps, so keep this tight to avoid a big eyebrow→title gap. */}
      <Eyebrow style={{ marginBottom: 4 }}>Pickleball court reviews</Eyebrow>

      {/* numberOfLines + adjustsFontSizeToFit keep the designed 2-line break:
          on a narrow screen the headline scales down instead of wrapping
          "WORTH YOUR TIME." onto a third line. */}
      <Display
        size="xl"
        style={styles.heroTitle}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        FIND COURTS{"\n"}WORTH YOUR TIME.
      </Display>

      <Muted style={styles.heroSub}>
        Real reviews. Honest ratings. Video walkthroughs.
      </Muted>

      <View style={styles.heroCtas}>
        <Button onPress={() => router.push("/map")}>
          Find Courts Near Me
        </Button>
      </View>
    </View>
  );
}

/* ───────── Nearby review card ───────── */
function NearbyReviewCard({
  loc,
  post,
  onPress,
}: {
  loc: ApiNearbyLocation;
  post?: ApiPost;
  onPress: () => void;
}) {
  const rating = fmtRating(loc.rating_overall);
  const imageUrl = post?.featured_image_url || null;
  const cityState = [loc.city, loc.state].filter(Boolean).join(", ");

  return (
    <Card pressable onPress={onPress} style={styles.reviewCard}>
      <View style={styles.reviewImageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.reviewImage} resizeMode="cover" />
        ) : (
          <View style={styles.reviewImageFallback}>
            <Ionicons name="image-outline" size={36} color={Colors.muted2} />
          </View>
        )}

        {rating ? (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color={Colors.onBall} />
            <Body weight="extrabold" style={styles.ratingText}>
              {rating}
            </Body>
          </View>
        ) : null}
      </View>

      <View style={styles.reviewBody}>
        <Eyebrow numberOfLines={1}>{cityState || "Court Review"}</Eyebrow>
        <Title numberOfLines={2} style={styles.reviewTitle}>
          {loc.blog?.title || post?.title || loc.name}
        </Title>
        <Muted numberOfLines={1} style={{ marginTop: 4 }}>
          {loc.name}
        </Muted>
      </View>
    </Card>
  );
}

/* ───────── Explore destination card — typographic, no icon ─────────
 * Each card uses the brand's signature pattern: small caps eyebrow on top,
 * a single Bebas Neue display verb (with a ball-green accent word), and a
 * muted description. Matches the visual language of the website's
 * "REVIEWED." and "READY TO IMPROVE?" panels instead of the off-brand
 * Ionicons icons it previously used.
 */
function ExploreCard({
  eyebrow,
  headline,
  accent,
  description,
  onPress,
}: {
  eyebrow: string;
  headline: string;
  accent?: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Card pressable onPress={onPress} style={styles.exploreCard}>
      <View style={styles.exploreHead}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Ionicons name="arrow-forward" size={18} color={Colors.muted2} />
      </View>

      <Display size="lg" style={styles.exploreHeadline}>
        {headline}
        {accent ? (
          <>
            {" "}
            {/* Inline Text inherits the parent headline's Bebas font + line
                metrics. We bump fontSize to 56 (vs the 48px headline) so the
                accent word stands taller — the intended brand effect. The
                parent's lineHeight (exploreHeadline) is sized to hold this
                taller word so it doesn't clip. */}
            <Text style={{ color: Colors.ball, fontSize: 50 }}>{accent}</Text>
          </>
        ) : null}
      </Display>

      <Muted numberOfLines={2} style={styles.exploreDescription}>
        {description}
      </Muted>
    </Card>
  );
}

/* ───────── Screen ───────── */
export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearby, setNearby] = useState<ApiNearbyLocation[]>([]);
  const [postsBySlug, setPostsBySlug] = useState<Record<string, ApiPost>>({});
  const [error, setError] = useState<string | null>(null);

  const reviewedNearby = useMemo(
    () => nearby.filter((x) => !!(x.blog?.slug || x.blog?.url)),
    [nearby]
  );

  const openBlogInApp = (loc: ApiNearbyLocation) => {
    const slug = loc.blog?.slug || slugFromBlogUrl(loc.blog?.url);
    if (!slug) return;
    router.push({ pathname: "/blog/[slug]", params: { slug } });
  };

  async function load() {
    try {
      setError(null);
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission not granted.");
        setNearby([]);
        setPostsBySlug({});
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      const nearbyUrl =
        `${API_BASE}/api/v1/locations/nearby.php` +
        `?lat=${encodeURIComponent(lat)}` +
        `&lng=${encodeURIComponent(lng)}` +
        `&radius=10`;

      const res = await fetch(nearbyUrl);
      const json = await res.json();

      if (!json?.ok) {
        setError(json?.error || "API error");
        setNearby([]);
        setPostsBySlug({});
        setLoading(false);
        return;
      }

      const locs: ApiNearbyLocation[] = json.locations || [];
      setNearby(locs);

      const postsRes = await fetch(`${API_BASE}/api/v1/posts.php?limit=100`);
      const postsJson = await postsRes.json();

      if (postsJson?.ok && Array.isArray(postsJson.posts)) {
        const map: Record<string, ApiPost> = {};
        for (const p of postsJson.posts as ApiPost[]) {
          if (p?.slug) map[p.slug] = p;
        }
        setPostsBySlug(map);
      } else {
        setPostsBySlug({});
      }

      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh} paddingBottom={48}>
      <BrandHeader />
      <Hero />

      {/* Nearby Reviews */}
      <Section
        title="Nearby Reviews"
        onSeeAll={() => router.push("/blog")}
        seeAllLabel="See all"
      >
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={Colors.ball} />
            <Muted style={{ marginTop: 10 }}>Loading nearby courts…</Muted>
          </View>
        ) : error ? (
          <Card style={styles.errorCard}>
            <Body weight="semibold">{error}</Body>
            <Muted style={{ marginTop: 4 }}>
              Pull down to retry, or open Courts to browse the map.
            </Muted>
          </Card>
        ) : reviewedNearby.length === 0 ? (
          <Card style={styles.errorCard}>
            <Body weight="semibold">No reviewed courts found nearby.</Body>
            <Muted style={{ marginTop: 4 }}>
              Try the Courts tab to expand your search radius.
            </Muted>
          </Card>
        ) : (
          <View style={{ gap: 14 }}>
            {reviewedNearby.slice(0, 4).map((loc) => {
              const slug = loc.blog?.slug || slugFromBlogUrl(loc.blog?.url) || "";
              const post = slug ? postsBySlug[slug] : undefined;
              return (
                <NearbyReviewCard
                  key={loc.id}
                  loc={loc}
                  post={post}
                  onPress={() => openBlogInApp(loc)}
                />
              );
            })}
          </View>
        )}
      </Section>

      {/* Explore — typographic destination cards */}
      <Section title="Explore">
        <View style={{ gap: 14 }}>
          <ExploreCard
            eyebrow="The Clinic"
            headline="LEVEL"
            accent="UP."
            description="Drills, lessons, and learning paths from beginner to advanced."
            onPress={() => router.push("/clinic")}
          />
          <ExploreCard
            eyebrow="Court Reviews"
            headline="EVERY"
            accent="COURT."
            description="Every court we've visited. Honest ratings."
            onPress={() =>
              router.push({ pathname: "/blog", params: { type: "court_review" } })
            }
          />
          <ExploreCard
            eyebrow="Gear Reviews"
            headline="THE"
            accent="GEAR."
            description="Paddles, shoes, bags, and balls — first-hand reviews."
            onPress={() =>
              router.push({ pathname: "/blog", params: { type: "gear_review" } })
            }
          />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* Brand header */
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  brandLogo: {
    width: 64,
    height: 64,
  },
  socials: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  socialIcon: { padding: 4 },

  /* Hero */
  hero: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heroTitle: {
    marginTop: 0,
    // adjustsFontSizeToFit shrinks the font on narrow screens but not the
    // lineHeight, which made the two lines look loosely spaced. Pin a tight
    // lineHeight tuned for the shrunk size so the lines sit close on every
    // device; paddingTop keeps the first line's tall caps from clipping.
    lineHeight: 54,
    paddingTop: 10,
  },
  heroSub: {
    marginTop: Spacing.lg,
    fontSize: TypeScale.body,
    lineHeight: 24,
    maxWidth: 320,
  },
  heroCtas: {
    marginTop: Spacing.xl,
    flexDirection: "row",
    gap: Spacing.md,
    flexWrap: "wrap",
  },

  /* Loading / error */
  loadingBlock: {
    paddingVertical: 28,
    alignItems: "center",
  },
  errorCard: {
    padding: Spacing.lg,
  },

  /* Nearby review card */
  reviewCard: {
    overflow: "hidden",
  },
  reviewImageWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surface,
  },
  reviewImage: {
    width: "100%",
    height: "100%",
  },
  reviewImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
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
  ratingText: {
    fontFamily: Fonts.body.extrabold,
    color: Colors.onBall,
    fontSize: TypeScale.caption,
    letterSpacing: 0.5,
  },
  reviewBody: {
    padding: Spacing.lg,
  },
  reviewTitle: {
    marginTop: 6,
    fontSize: 20,
    lineHeight: 26,
  },

  /* Explore destination card — typographic, brand-forward */
  exploreCard: {
    padding: Spacing.lg,
  },
  exploreHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  exploreHeadline: {
    // Base word is 44px; the accent word is 50px. lineHeight is sized to the
    // TALLER accent so it isn't clipped. These headlines are single-line, so
    // the taller line box adds no visible inter-line spacing.
    fontSize: 44,
    lineHeight: 52,
    color: Colors.text,
    marginBottom: 10,
  },
  exploreDescription: {
    fontSize: TypeScale.body,
    lineHeight: 22,
    color: Colors.muted,
  },
});
