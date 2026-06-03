// app/(tabs)/videos.tsx  — labelled "About" in the tab bar
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { Body, Display, Eyebrow, Muted } from "@/components/ui";
import { Colors, Fonts, Radius, Spacing, TypeScale } from "@/constants/theme";

/* ───────── Constants ───────── */
const CHANNEL_HANDLE = "@whatyoudink";
const USERNAME = "whatyoudink";

const YT_WEB = `https://www.youtube.com/${CHANNEL_HANDLE}`;
const YT_SUB_WEB = `https://www.youtube.com/${CHANNEL_HANDLE}?sub_confirmation=1`;
const YT_DEEPLINK = `vnd.youtube://www.youtube.com/${CHANNEL_HANDLE}`;

const IG_WEB = `https://www.instagram.com/${USERNAME}/`;
const IG_ANDROID_INTENT = `intent://instagram.com/_u/${USERNAME}/#Intent;package=com.instagram.android;scheme=https;end`;
const IG_IOS = `instagram://user?username=${USERNAME}`;

const TT_WEB = `https://www.tiktok.com/@${USERNAME}`;
const TT_IOS = `snssdk1233://user/profile/${USERNAME}`;
const TT_ANDROID_INTENT = `intent://www.tiktok.com/@${USERNAME}#Intent;package=com.zhiliaoapp.musically;scheme=https;end`;

const PRIVACY_URL = "https://www.whatyoudink.com/privacy/?app=1";
const TERMS_URL = "https://www.whatyoudink.com/terms/?app=1";

/* ───────── Linking helpers (preserved logic) ───────── */
async function openWeb(url: string, label: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(label, "Could not open link. Please try again.");
  }
}

async function openPreferApp(appUrl: string, webUrl: string, label: string) {
  try {
    await Linking.openURL(appUrl);
  } catch {
    await openWeb(webUrl, label);
  }
}

async function copyUsername() {
  try {
    await Clipboard.setStringAsync(`@${USERNAME}`);
  } catch {
    // silently swallow
  }
}

async function openInstagramWithCopy() {
  await copyUsername();
  try {
    if (Platform.OS === "android") {
      await Linking.openURL(IG_ANDROID_INTENT);
      return;
    }
    await openPreferApp(IG_IOS, IG_WEB, "Instagram");
  } catch {
    await openWeb(IG_WEB, "Instagram");
  }
}

async function openTikTokWithCopy() {
  await copyUsername();
  try {
    if (Platform.OS === "android") {
      try {
        await Linking.openURL(TT_ANDROID_INTENT);
        return;
      } catch {
        // fall through
      }
      await openWeb(TT_WEB, "TikTok");
      return;
    }
    await openPreferApp(TT_IOS, TT_WEB, "TikTok");
  } catch {
    await openWeb(TT_WEB, "TikTok");
  }
}

/* ═════════════════════════════════════════════════════════════════
   Scroll-driven reveal — fade-up as element enters viewport.
   Mirrors the website's IntersectionObserver-based .reveal class.
   ═════════════════════════════════════════════════════════════════ */
const ScrollYContext = createContext<SharedValue<number> | null>(null);
const WINDOW_H = Dimensions.get("window").height;

/**
 * Wrap a chunk of content. As the user scrolls and the element's top reaches
 * ~80% down the viewport, it fades up into place. Once revealed, it stays.
 *
 * Set `delay` to stagger sibling reveals (in ms-equivalent — really a
 * scroll-offset translated to "appears later in the wave").
 */
function Reveal({
  children,
  delayPx = 0,
}: {
  children: React.ReactNode;
  delayPx?: number;
}) {
  const scrollY = useContext(ScrollYContext);
  const [topY, setTopY] = useState<number | null>(null);
  const set = useRef(false);

  const style = useAnimatedStyle(() => {
    if (!scrollY || topY === null) {
      // Not yet measured — start hidden so we don't flash on the first frame
      return { opacity: 0, transform: [{ translateY: 24 }] };
    }
    // Trigger when the element top crosses 80% of the viewport
    const triggerStart = topY - WINDOW_H * 0.82 + delayPx;
    const triggerEnd = triggerStart + 140;
    const p = interpolate(
      scrollY.value,
      [triggerStart, triggerEnd],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: p,
      transform: [{ translateY: interpolate(p, [0, 1], [24, 0]) }],
    };
  });

  return (
    <Animated.View
      onLayout={(e) => {
        if (set.current) return;
        set.current = true;
        setTopY(e.nativeEvent.layout.y);
      }}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/* ═════════════════════════════════════════════════════════════════
   Presentational pieces
   ═════════════════════════════════════════════════════════════════ */

/* Social platform button */
function SocialButton({
  icon,
  label,
  handle,
  description,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  handle: string;
  description: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.socialBtn,
        { borderColor: `${color}55` },
        pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View
        style={[
          s.socialIconWrap,
          { backgroundColor: `${color}22`, borderColor: `${color}55` },
        ]}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Body weight="extrabold" style={s.socialLabel}>
          {label}
          <Body weight="bold" style={s.socialHandle}>
            {"  "}
            {handle}
          </Body>
        </Body>
        <Muted style={s.socialDescription}>{description}</Muted>
      </View>
      <Ionicons name="arrow-forward" size={18} color={Colors.muted2} />
    </Pressable>
  );
}

/* One chapter in the origin story */
function StoryChapter({
  number,
  tag,
  heading,
  accent,
  children,
}: {
  number: string;
  tag: string;
  heading: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.chapter}>
      <Reveal>
        <View style={s.chapterMeta}>
          <Display size="md" style={s.chapterNum}>
            {number}
          </Display>
          <View style={s.chapterMetaLine} />
          <Eyebrow>{tag}</Eyebrow>
        </View>

        <Display size="md" style={s.chapterHeading}>
          {heading}
          {accent ? (
            <>
              {"\n"}
              <Display size="md" style={{ color: Colors.ball }}>
                {accent}
              </Display>
            </>
          ) : null}
        </Display>
      </Reveal>

      <View style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
        {children}
      </View>
    </View>
  );
}

function StoryParagraph({ children }: { children: React.ReactNode }) {
  return (
    <Reveal delayPx={20}>
      <Body weight="regular" style={s.storyParagraph}>
        {children}
      </Body>
    </Reveal>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <Reveal delayPx={40}>
      <View style={s.pullQuote}>
        <Body weight="medium" style={s.pullQuoteText}>
          “{children}”
        </Body>
      </View>
    </Reveal>
  );
}

/* ═════════════════════════════════════════════════════════════════
   Screen
   ═════════════════════════════════════════════════════════════════ */
export default function AboutTab() {
  const router = useRouter();

  const appVersion = (Constants?.expoConfig?.version as string | undefined) ?? "1.0.0";
  const year = new Date().getFullYear();

  /* Scroll position is shared via context to all <Reveal> children */
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  /* Action handlers (logic preserved) */
  const onOpenYouTube = useCallback(
    () => openPreferApp(YT_DEEPLINK, YT_WEB, "YouTube"),
    []
  );
  const onSubscribe = useCallback(() => openWeb(YT_SUB_WEB, "YouTube"), []);

  const onInstagramPress = useCallback(async () => {
    await openInstagramWithCopy();
    Alert.alert(
      "Copied",
      `@${USERNAME} copied. If Instagram opens Home, paste/search @${USERNAME}.`
    );
  }, []);

  const onTikTokPress = useCallback(async () => {
    await openTikTokWithCopy();
    Alert.alert(
      "Copied",
      `@${USERNAME} copied. If TikTok doesn't open the profile, paste/search @${USERNAME}.`
    );
  }, []);

  const openPrivacy = useCallback(() => {
    router.push({ pathname: "/webview", params: { url: PRIVACY_URL, title: "Privacy Policy" } });
  }, [router]);

  const openTerms = useCallback(() => {
    router.push({ pathname: "/webview", params: { url: TERMS_URL, title: "Terms of Service" } });
  }, [router]);

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <ScrollYContext.Provider value={scrollY}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ═════ Top brand strip ═════ */}
          <Animated.View entering={FadeIn.duration(500)} style={s.topRow}>
            <View>
              <Eyebrow>WhatYouDink</Eyebrow>
              <Muted style={s.topRowSub}>Behind the channel · EST. 2025</Muted>
            </View>
            <Image
              source={require("../../assets/images/whatyoudinklogo-outline.png")}
              style={s.topLogo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* ═════ One-liner intro ═════ */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(80)}
            style={s.introBlock}
          >
            <Body weight="extrabold" style={s.introHeadline}>
              Real pickleball court reviews.{"\n"}No sponsors. No fluff.
            </Body>
          </Animated.View>

          {/* ═════ Connect cards (the priority) ═════ */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(140)}
            style={{ marginTop: Spacing.xl }}
          >
            <Eyebrow>Connect</Eyebrow>
          </Animated.View>

          {/* YouTube card — first */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(180)}
            style={s.ytCard}
          >
            <View style={s.ytCardHead}>
              <View
                style={[
                  s.ytIconWrap,
                  { backgroundColor: "rgba(255,0,0,0.16)", borderColor: "rgba(255,0,0,0.45)" },
                ]}
              >
                <Ionicons name="logo-youtube" size={22} color={Colors.youtube} />
              </View>
              <View style={{ flex: 1 }}>
                <Body weight="extrabold" style={{ color: Colors.text, fontSize: 16 }}>
                  YouTube
                  <Body weight="bold" style={s.socialHandle}>
                    {"  "}
                    {CHANNEL_HANDLE}
                  </Body>
                </Body>
                <Muted style={s.socialDescription}>
                  Court reviews and breakdowns
                </Muted>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: Spacing.md }}>
              <Pressable
                onPress={onOpenYouTube}
                style={({ pressed }) => [s.ytBtnGhost, pressed && { opacity: 0.85 }]}
              >
                <Body weight="extrabold" style={s.ytBtnGhostText}>
                  Open Channel
                </Body>
              </Pressable>
              <Pressable
                onPress={onSubscribe}
                style={({ pressed }) => [s.ytBtnPrimary, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Body weight="extrabold" style={s.ytBtnPrimaryText}>
                  Subscribe
                </Body>
              </Pressable>
            </View>
          </Animated.View>

          {/* Instagram + TikTok */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(240)}
            style={{ marginTop: Spacing.md }}
          >
            <SocialButton
              icon={<FontAwesome name="instagram" size={20} color="#e1306c" />}
              label="Instagram"
              handle={`@${USERNAME}`}
              description="Highlights and quick tips"
              color="#e1306c"
              onPress={onInstagramPress}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(500).delay(290)}
            style={{ marginTop: Spacing.md }}
          >
            <SocialButton
              icon={<Ionicons name="logo-tiktok" size={20} color={Colors.text} />}
              label="TikTok"
              handle={`@${USERNAME}`}
              description="Shorts and behind-the-scenes"
              color="#9da3a8"
              onPress={onTikTokPress}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(500).delay(340)}
            style={{ marginTop: Spacing.md }}
          >
            <Muted style={s.socialHint}>
              We copy the handle to your clipboard automatically — paste if the app opens Home
              instead of the profile.
            </Muted>
          </Animated.View>

          {/* ═════ Quick CTAs ═════ */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(400)}
            style={[s.heroCtas, { marginTop: Spacing.xl }]}
          >
            <Pressable
              onPress={() => router.push("/map")}
              style={({ pressed }) => [s.heroCtaPrimary, pressed && { opacity: 0.92 }]}
            >
              <Body weight="extrabold" style={s.heroCtaPrimaryText}>
                Find Courts
              </Body>
              <Ionicons name="arrow-forward" size={16} color={Colors.onBall} />
            </Pressable>

            <Pressable
              onPress={() => router.push("/blog")}
              style={({ pressed }) => [s.heroCtaGhost, pressed && { opacity: 0.8 }]}
            >
              <Body weight="extrabold" style={s.heroCtaGhostText}>
                Read Reviews
              </Body>
            </Pressable>
          </Animated.View>

          {/* ═════ Story divider ═════ */}
          <View style={s.divider} />

          <Reveal>
            <View style={s.sectionLabel}>
              <Muted style={s.sectionLabelText}>The Backstory</Muted>
            </View>
          </Reveal>

          {/* ═════ Story Hero ═════ */}
          <Reveal>
            <View style={s.storyEyebrowRow}>
              <Eyebrow>Behind the channel</Eyebrow>
              <Muted style={s.heroIndex}>EST. 2025</Muted>
            </View>
          </Reveal>

          <Reveal delayPx={10}>
            <Display size="xl" style={s.heroTitle}>
              THE{"\n"}REAL{"\n"}
              <Display size="xl" style={{ color: Colors.ball }}>
                STORY.
              </Display>
            </Display>
          </Reveal>

          <Reveal delayPx={30}>
            <Body weight="regular" style={s.heroIntro}>
              <Body weight="extrabold">My name is David.</Body> I started playing pickleball in
              the summer of 2025 and immediately hit a wall — no reliable way to find a good
              court before showing up and hoping for the best. So I built one.
            </Body>
          </Reveal>

          {/* ═════ Origin Story Chapters ═════ */}
          <View style={{ marginTop: Spacing.xxxl }} />

          <StoryChapter
            number="01"
            tag="The Problem"
            heading="GREAT PLACES"
            accent="HARD TO FIND."
          >
            <StoryParagraph>
              When I started playing, I was looking for a reliable "home court" — somewhere I
              could go consistently, know the layout, know the crowd, and actually improve. That
              should be easy to figure out.
            </StoryParagraph>
            <StoryParagraph>
              It wasn't. The details weren't anywhere. Yelp entries were outdated. Google Maps
              gave you an address but nothing about court conditions, wait times, skill levels,
              or whether the lighting was actually usable after dark.
            </StoryParagraph>
            <PullQuote>
              Even as new clubs kept popping up everywhere, clear and helpful information about
              them was nearly impossible to find.
            </PullQuote>
          </StoryChapter>

          <StoryChapter
            number="02"
            tag="The Process"
            heading="SHOW UP. PLAY."
            accent="REPORT BACK."
          >
            <StoryParagraph>
              So I decided to take matters into my own hands. I started building a personal
              database — every pickleball location in the area — and personally visiting each
              one. Not as a reviewer with a clipboard. As a regular player.
            </StoryParagraph>
            <StoryParagraph>
              I note the courts, the lighting, the waits, the skill levels, the parking, the
              facilities, and the overall vibe. Then I share it honestly — no sugarcoating, no
              sponsored content.
            </StoryParagraph>
            <StoryParagraph>
              Locations I've personally visited get verified pins on the map and appear first in
              results. Every rating is earned from real court time.
            </StoryParagraph>
          </StoryChapter>

          <StoryChapter
            number="03"
            tag="The Product"
            heading="EVERYTHING I WISH"
            accent="I HAD."
          >
            <StoryParagraph>
              This app and the What You Dink YouTube channel are the direct product of those
              visits — the resource I was looking for when I first started playing.
            </StoryParagraph>
            <StoryParagraph>
              Interactive court map. Honest ratings across 7 categories. Video walkthroughs.
              Nearby alternatives. All available to every player, completely free.
            </StoryParagraph>

            <Reveal delayPx={40}>
              <View style={[s.heroCtas, { marginTop: Spacing.md }]}>
                <Pressable
                  onPress={() => router.push("/map")}
                  style={({ pressed }) => [s.heroCtaPrimary, pressed && { opacity: 0.92 }]}
                >
                  <Body weight="extrabold" style={s.heroCtaPrimaryText}>
                    Find a Court
                  </Body>
                  <Ionicons name="arrow-forward" size={16} color={Colors.onBall} />
                </Pressable>

                <Pressable
                  onPress={() => router.push("/blog")}
                  style={({ pressed }) => [s.heroCtaGhost, pressed && { opacity: 0.8 }]}
                >
                  <Body weight="extrabold" style={s.heroCtaGhostText}>
                    Read Reviews
                  </Body>
                </Pressable>
              </View>
            </Reveal>
          </StoryChapter>

          {/* ═════ Footer ═════ */}
          <View style={s.divider} />

          <Reveal>
            <View style={s.footer}>
              <Image
                source={require("../../assets/images/whatyoudinklogo-outline.png")}
                style={s.footerLogo}
                resizeMode="contain"
              />
              <Muted style={s.footerCopy}>
                © {year} WhatYouDink{"\n"}No sponsored rankings. Ever.
              </Muted>

              <View style={s.footerLinks}>
                <Pressable onPress={openPrivacy} hitSlop={10}>
                  <Body weight="bold" style={s.footerLink}>
                    Privacy
                  </Body>
                </Pressable>
                <Muted style={s.footerDot}>·</Muted>
                <Pressable onPress={openTerms} hitSlop={10}>
                  <Body weight="bold" style={s.footerLink}>
                    Terms
                  </Body>
                </Pressable>
                <Muted style={s.footerDot}>·</Muted>
                <Muted style={s.footerVersion}>v{appVersion}</Muted>
              </View>
            </View>
          </Reveal>
        </Animated.ScrollView>
      </ScrollYContext.Provider>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.screenPadH, paddingBottom: 56 },

  /* Top brand strip */
  topRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  topRowSub: {
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: Colors.muted2,
  },
  topLogo: { width: 44, height: 44 },

  /* One-liner intro */
  introBlock: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  introHeadline: {
    color: Colors.text,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.2,
  },

  /* Quick CTAs */
  heroCtas: {
    flexDirection: "row",
    gap: Spacing.md,
    flexWrap: "wrap",
  },
  heroCtaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ball,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
  },
  heroCtaPrimaryText: {
    color: Colors.onBall,
    fontSize: TypeScale.bodySm,
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },
  heroCtaGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderUp,
    backgroundColor: "transparent",
  },
  heroCtaGhostText: {
    color: Colors.text,
    fontSize: TypeScale.bodySm,
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },

  /* Divider */
  divider: {
    marginVertical: Spacing.xxxl,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  /* Section label pill */
  sectionLabel: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    marginBottom: Spacing.xl,
  },
  sectionLabelText: {
    fontSize: 10.5,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: Colors.muted,
    fontFamily: Fonts.body.bold,
  },

  /* Story hero */
  storyEyebrowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIndex: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: Colors.muted2,
  },
  heroTitle: {
    marginTop: Spacing.md,
    lineHeight: 76,
  },
  heroIntro: {
    marginTop: Spacing.xl,
    lineHeight: 24,
    color: Colors.muted,
    fontSize: TypeScale.body,
  },

  /* Story chapter */
  chapter: {
    marginBottom: Spacing.xxxl,
  },
  chapterMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.lg,
  },
  chapterNum: {
    color: Colors.muted2,
    fontSize: 36,
    lineHeight: 36,
  },
  chapterMetaLine: {
    height: 1,
    width: 28,
    backgroundColor: Colors.border,
  },
  chapterHeading: {
    fontSize: 44,
    lineHeight: 44,
    color: Colors.text,
  },
  storyParagraph: {
    color: Colors.muted,
    fontSize: TypeScale.body,
    lineHeight: 24,
  },
  pullQuote: {
    marginTop: Spacing.sm,
    paddingLeft: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.ball,
  },
  pullQuoteText: {
    color: Colors.text,
    fontStyle: "italic",
    fontSize: TypeScale.body,
    lineHeight: 24,
  },

  /* YouTube card */
  ytCard: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  ytCardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ytIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  ytBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    backgroundColor: Colors.youtube,
  },
  ytBtnPrimaryText: {
    color: "#fff",
    fontSize: TypeScale.bodySm,
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },
  ytBtnGhost: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ytBtnGhostText: {
    color: Colors.text,
    fontSize: TypeScale.bodySm,
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },

  /* Social button */
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: Colors.card,
  },
  socialIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  socialLabel: { color: Colors.text, fontSize: 15 },
  socialHandle: {
    color: Colors.muted,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  socialDescription: { fontSize: 12.5, marginTop: 2 },
  socialHint: {
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.muted2,
  },

  /* Footer */
  footer: {
    alignItems: "center",
    gap: 10,
  },
  footerLogo: {
    width: 56,
    height: 56,
    marginBottom: 4,
  },
  footerCopy: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    color: Colors.muted2,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  footerLink: {
    fontSize: 12,
    color: Colors.muted,
    letterSpacing: 0.4,
  },
  footerDot: {
    fontSize: 12,
    color: Colors.muted2,
  },
  footerVersion: {
    fontSize: 11.5,
    color: Colors.muted2,
    fontFamily: Fonts.mono,
  },
});
