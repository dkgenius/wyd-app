// app/(tabs)/videos.tsx  — labelled "About" in the tab bar
import React, { useCallback } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Body, Display, Eyebrow, Muted, Title } from "@/components/ui";
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

/* ───────── Linking helpers (preserved from original) ───────── */
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
    // silently swallow — we still attempt the deep link below
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
   Presentational helpers
   ═════════════════════════════════════════════════════════════════ */

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
  /** The last word/phrase in the heading rendered in ball-green */
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.chapter}>
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

      <View style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
        {children}
      </View>
    </View>
  );
}

/* A paragraph styled to match the website's story body */
function StoryParagraph({ children }: { children: React.ReactNode }) {
  return (
    <Body weight="regular" style={s.storyParagraph}>
      {children}
    </Body>
  );
}

/* Pull-quote — ball-green left border */
function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.pullQuote}>
      <Body weight="medium" style={s.pullQuoteText}>
        “{children}”
      </Body>
    </View>
  );
}

/* Social platform button */
function SocialButton({
  icon,
  label,
  handle,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  handle: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.socialBtn,
        { borderColor: `${color}55` },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={[s.socialIconWrap, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Body weight="extrabold" style={s.socialLabel}>
          {label}
        </Body>
        <Muted style={s.socialHandle}>{handle}</Muted>
      </View>
      <Ionicons name="arrow-forward" size={18} color={Colors.muted2} />
    </Pressable>
  );
}

/* ═════════════════════════════════════════════════════════════════
   Screen
   ═════════════════════════════════════════════════════════════════ */
export default function AboutTab() {
  const router = useRouter();

  const appVersion = (Constants?.expoConfig?.version as string | undefined) ?? "1.0.0";
  const year = new Date().getFullYear();

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
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ───── Hero ───── */}
        <View style={s.heroEyebrowRow}>
          <Eyebrow>Behind the channel</Eyebrow>
          <Muted style={s.heroIndex}>EST. 2025</Muted>
        </View>

        <Display size="xl" style={s.heroTitle}>
          THE{"\n"}REAL{"\n"}
          <Display size="xl" style={{ color: Colors.ball }}>
            STORY.
          </Display>
        </Display>

        <Body weight="regular" style={s.heroIntro}>
          <Body weight="extrabold">My name is David.</Body> I started playing pickleball in the
          summer of 2025 and immediately hit a wall — no reliable way to find a good court
          before showing up and hoping for the best. So I built one.
        </Body>

        <View style={s.heroCtas}>
          <Pressable
            onPress={() => router.push("/map")}
            style={({ pressed }) => [s.heroCtaPrimary, pressed && { opacity: 0.92 }]}
          >
            <Body weight="extrabold" style={s.heroCtaPrimaryText}>
              Explore the Map
            </Body>
            <Ionicons name="arrow-forward" size={16} color={Colors.onBall} />
          </Pressable>

          <Pressable
            onPress={onOpenYouTube}
            style={({ pressed }) => [s.heroCtaGhost, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="logo-youtube" size={16} color={Colors.text} />
            <Body weight="extrabold" style={s.heroCtaGhostText}>
              YouTube
            </Body>
          </Pressable>
        </View>

        <View style={s.divider} />

        {/* ───── Origin Story ───── */}
        <View style={s.sectionLabel}>
          <Muted style={s.sectionLabelText}>The Origin Story</Muted>
        </View>

        <StoryChapter
          number="01"
          tag="The Problem"
          heading="GREAT PLACES"
          accent="HARD TO FIND."
        >
          <StoryParagraph>
            When I started playing, I was looking for a reliable "home court" — somewhere I could
            go consistently, know the layout, know the crowd, and actually improve. That should
            be easy to figure out.
          </StoryParagraph>
          <StoryParagraph>
            It wasn't. The details weren't anywhere. Yelp entries were outdated. Google Maps gave
            you an address but nothing about court conditions, wait times, skill levels, or
            whether the lighting was actually usable after dark.
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
            database — every pickleball location in the area — and personally visiting each one.
            Not as a reviewer with a clipboard. As a regular player.
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
        </StoryChapter>

        <View style={s.divider} />

        {/* ───── Connect / Socials ───── */}
        <View style={s.sectionLabel}>
          <Muted style={s.sectionLabelText}>Connect</Muted>
        </View>

        <Display size="md" style={s.connectTitle}>
          FOLLOW THE{"\n"}
          <Display size="md" style={{ color: Colors.ball }}>
            JOURNEY.
          </Display>
        </Display>

        <Muted style={{ marginTop: Spacing.md, lineHeight: 22 }}>
          Court reviews drop on YouTube. Highlights and quick tips live on Instagram and TikTok.
        </Muted>

        {/* YouTube card */}
        <View style={s.ytCard}>
          <View style={s.ytCardHead}>
            <View style={[s.ytIconWrap, { backgroundColor: "rgba(255,0,0,0.16)", borderColor: "rgba(255,0,0,0.45)" }]}>
              <Ionicons name="logo-youtube" size={22} color={Colors.youtube} />
            </View>
            <View style={{ flex: 1 }}>
              <Body weight="extrabold" style={{ color: Colors.text, fontSize: 16 }}>
                {CHANNEL_HANDLE}
              </Body>
              <Muted style={{ fontSize: 12.5 }}>Court reviews and breakdowns</Muted>
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
        </View>

        {/* Instagram + TikTok */}
        <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
          <SocialButton
            icon={<FontAwesome name="instagram" size={20} color="#e1306c" />}
            label="Instagram"
            handle={`@${USERNAME}`}
            color="#e1306c"
            onPress={onInstagramPress}
          />
          <SocialButton
            icon={<Ionicons name="logo-tiktok" size={20} color={Colors.text} />}
            label="TikTok"
            handle={`@${USERNAME}`}
            color="#9da3a8"
            onPress={onTikTokPress}
          />
        </View>

        <Muted style={s.socialHint}>
          We copy the handle to your clipboard automatically — paste if the app opens Home instead
          of the profile.
        </Muted>

        {/* ───── Footer ───── */}
        <View style={s.divider} />

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
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.screenPadH, paddingBottom: 56 },

  /* Hero */
  heroEyebrowRow: {
    marginTop: Spacing.md,
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
  heroCtas: {
    marginTop: Spacing.xl,
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

  /* Divider between sections */
  divider: {
    marginVertical: Spacing.xxxl,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  /* Section label (small, uppercase, top of each section) */
  sectionLabel: {
    marginBottom: Spacing.xl,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  sectionLabelText: {
    fontSize: 10.5,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: Colors.muted,
    fontFamily: Fonts.body.bold,
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

  /* Connect section */
  connectTitle: {
    marginTop: 0,
    fontSize: 44,
    lineHeight: 44,
  },

  /* YouTube card */
  ytCard: {
    marginTop: Spacing.xl,
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
  socialHandle: { fontSize: 12.5, marginTop: 1 },
  socialHint: {
    marginTop: Spacing.md,
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
