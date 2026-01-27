// app/(tabs)/clinic.tsx
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SectionKey = "intro" | "drills" | "modes" | "howto";
type DrillPeople = 1 | 2 | 3 | 4 | 5;

type VideoItem = {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  tags?: string[];
  people?: DrillPeople;
};

type Section = {
  key: SectionKey;
  title: string;
  subtitle: string;
  filters?: "drills_people";
  items: VideoItem[];
};

const SECTIONS: Section[] = [
  {
    key: "intro",
    title: "Intro",
    subtitle: "Start here: rules, scoring, basics.",
    items: [
      { id: "intro-rules", title: "Rules of Pickleball", description: "Core rules explained.", duration: "6:30", tags: ["rules"] },
      { id: "intro-score", title: "How to Keep Score", description: "Singles and doubles scoring.", duration: "5:10", tags: ["scoring"] },
      { id: "intro-court", title: "Court Basics", description: "Lines, kitchen, serve zones.", duration: "4:45", tags: ["basics"] },
    ],
  },
  {
    key: "drills",
    title: "Drills",
    subtitle: "Practice Drills with any number of players.",
    filters: "drills_people",
    items: [
      { id: "drill-1a", title: "Solo Wall Dinks", description: "Touch + control drill.", duration: "4:20", people: 1, tags: ["dinks"] },
      { id: "drill-2a", title: "Two-Person Dink Ladder", description: "Consistency + placement.", duration: "6:05", people: 2, tags: ["dinks"] },
      { id: "drill-3a", title: "3-Person Transition Drill", description: "Move from baseline to kitchen.", duration: "7:15", people: 3, tags: ["transition"] },
      { id: "drill-4a", title: "4-Person Crosscourt Patterns", description: "Patterns + resets.", duration: "8:00", people: 4, tags: ["patterns"] },
      { id: "drill-5a", title: "King/Queen of the Court Drill", description: "Group rotation drill.", duration: "9:30", people: 5, tags: ["group"] },
    ],
  },
  {
    key: "modes",
    title: "Game Modes",
    subtitle: "Different ways to play: singles, doubles, King of the Court, etc.",
    items: [
      { id: "mode-singles", title: "Singles Basics", description: "Movement + strategy.", duration: "7:40", tags: ["singles"] },
      { id: "mode-doubles", title: "Doubles Basics", description: "Positioning + teamwork.", duration: "8:10", tags: ["doubles"] },
      { id: "mode-skinny", title: "Skinny Singles", description: "Crosscourt game mode.", duration: "5:50", tags: ["skinny singles"] },
    ],
  },
  {
    key: "howto",
    title: "How To",
    subtitle: "Shot tutorials: serve, return, dink, drive, drop.",
    items: [
      { id: "howto-dink", title: "How to Dink", description: "Soft game fundamentals.", duration: "6:25", tags: ["dink"] },
      { id: "howto-drop", title: "How to Hit a Drop", description: "Third shot drop technique.", duration: "7:05", tags: ["drop"] },
      { id: "howto-drive", title: "How to Drive", description: "Power with control.", duration: "5:55", tags: ["drive"] },
      { id: "howto-serve", title: "How to Serve", description: "Legal mechanics + targets.", duration: "6:10", tags: ["serve"] },
    ],
  },
];

function SectionPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillOn,
        pressed && styles.pillPressed,
      ]}
    >
      <Text style={[styles.pillText, active && styles.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

export default function ClinicTab() {
  const [activeSectionKey, setActiveSectionKey] = useState<SectionKey | null>(null);
  const [drillPeople, setDrillPeople] = useState<1 | 2 | 3 | 4 | 5 | null>(null);

  const activeSection = useMemo(() => {
    if (!activeSectionKey) return null;
    return SECTIONS.find((s) => s.key === activeSectionKey) ?? null;
  }, [activeSectionKey]);

  const visibleItems = useMemo(() => {
    if (!activeSection) return [];
    if (activeSection.key === "drills" && drillPeople) {
      return activeSection.items.filter((v) => (v.people ?? null) === drillPeople);
    }
    return activeSection.items;
  }, [activeSection, drillPeople]);

  if (!activeSection) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
        <FlatList
          data={SECTIONS}
          keyExtractor={(s) => s.key}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.h1}>Clinic</Text>
              <Text style={styles.sub}>Training guides and drills — coming soon.</Text>
              <View style={styles.banner}>
                <Text style={styles.bannerTitle}>Coming Soon</Text>
                <Text style={styles.bannerSub}>
                  We’re building a video library for training, guides, drills, and game modes.
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setActiveSectionKey(item.key)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.subtitle}</Text>
              <Text style={styles.cardHint}>Tap to view</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <FlatList
        data={visibleItems}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.sectionTopRow}>
              <Pressable
                onPress={() => {
                  setActiveSectionKey(null);
                  setDrillPeople(null);
                }}
                style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </Pressable>
              <Text style={styles.h1}>{activeSection.title}</Text>
            </View>

            <Text style={styles.sub}>{activeSection.subtitle}</Text>

            {activeSection.filters === "drills_people" && (
              <View style={styles.filters}>
                <Text style={styles.filterLabel}>Players</Text>
                <View style={styles.pillRow}>
                  <SectionPill label="All" active={drillPeople === null} onPress={() => setDrillPeople(null)} />
                  <SectionPill label="1" active={drillPeople === 1} onPress={() => setDrillPeople(1)} />
                  <SectionPill label="2" active={drillPeople === 2} onPress={() => setDrillPeople(2)} />
                  <SectionPill label="3" active={drillPeople === 3} onPress={() => setDrillPeople(3)} />
                  <SectionPill label="4" active={drillPeople === 4} onPress={() => setDrillPeople(4)} />
                  <SectionPill label="5+" active={drillPeople === 5} onPress={() => setDrillPeople(5)} />
                </View>
              </View>
            )}

            <View style={styles.comingSoonInline}>
              <Text style={styles.comingSoonTitle}>Coming Soon</Text>
              <Text style={styles.comingSoonSub}>
                These are placeholder lessons.
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.card, { padding: 14 }]}>
            <Text style={styles.cardTitle}>No videos for this filter.</Text>
            <Text style={styles.cardSub}>Try a different selection.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.videoCard}>
            <Text style={styles.videoTitle}>{item.title}</Text>
            {!!item.description && <Text style={styles.videoSub}>{item.description}</Text>}
            <View style={styles.videoMetaRow}>
              {!!item.duration && <Text style={styles.meta}>{item.duration}</Text>}
              {activeSection.key === "drills" && typeof item.people === "number" && (
                <Text style={styles.meta}>• {item.people === 5 ? "5+" : item.people} players</Text>
              )}
              {!!item.tags?.length && <Text style={styles.meta}>• {item.tags.join(", ")}</Text>}
            </View>
            <Pressable
              onPress={() => Alert.alert("Coming Soon", "Video playback will be available once the library is ready.")}
              style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.playBtnText}>Open</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0f14" },
  listContent: { padding: 14, paddingBottom: 28 },

  header: { paddingBottom: 10 },
  h1: { fontSize: 28, fontWeight: "800", color: "rgba(255,255,255,0.92)", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 14, color: "rgba(255,255,255,0.60)" },

  banner: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
  },
  bannerTitle: { color: "rgba(255,255,255,0.92)", fontWeight: "900" },
  bannerSub: { marginTop: 6, color: "rgba(255,255,255,0.60)", lineHeight: 18 },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    marginTop: 12,
  },
  cardPressed: { transform: [{ translateY: -1 }], backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.16)" },
  cardTitle: { color: "rgba(255,255,255,0.92)", fontWeight: "900", fontSize: 16 },
  cardSub: { marginTop: 6, color: "rgba(255,255,255,0.60)", lineHeight: 18 },
  cardHint: { marginTop: 10, color: "rgba(255,255,255,0.70)", fontWeight: "800" },

  sectionTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  backBtnText: { color: "rgba(255,255,255,0.90)", fontWeight: "900" },

  filters: { marginTop: 12 },
  filterLabel: { color: "rgba(255,255,255,0.70)", fontWeight: "800", marginBottom: 8 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  pillText: { color: "rgba(255,255,255,0.65)", fontWeight: "800" },
  pillTextOn: { color: "rgba(255,255,255,0.92)" },

  comingSoonInline: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
  },
  comingSoonTitle: { color: "rgba(255,255,255,0.92)", fontWeight: "900" },
  comingSoonSub: { marginTop: 6, color: "rgba(255,255,255,0.60)", lineHeight: 18 },

  videoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    marginTop: 12,
  },
  videoTitle: { color: "rgba(255,255,255,0.92)", fontWeight: "900", fontSize: 16 },
  videoSub: { marginTop: 6, color: "rgba(255,255,255,0.60)", lineHeight: 18 },
  videoMetaRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  meta: { color: "rgba(255,255,255,0.60)", fontSize: 12, fontWeight: "700" },

  playBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnText: { color: "rgba(255,255,255,0.90)", fontWeight: "900" },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
});
