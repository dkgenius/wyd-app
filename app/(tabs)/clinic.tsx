// app/(tabs)/clinic.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

import { apiUrl } from "../../src/api/base";
import { Body, Display, Eyebrow, Muted, Subtitle, Title } from "@/components/ui";
import { Colors, Fonts, Radius, Spacing, TypeScale } from "@/constants/theme";

/* ───────── Types ───────── */
type Topic = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  featured_image_url?: string | null;
};

type Path = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  intended_level?: string | null;
  est_total_minutes?: number | null;
  featured_image_url?: string | null;
  step_count?: number | null;
};

type Item = {
  id: number;
  title: string;
  slug: string;
  item_type?: string | null;
  skill_level?: string | null;
  est_minutes?: number | null;
  youtube_url?: string | null;
  featured_image_url?: string | null;
  excerpt?: string | null;
  content_html?: string | null;
};

type Quiz = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
};

type PathStep = {
  step_no: number;
  step_title: string;
  note?: string | null;
  step_type?: "item" | "quiz";
  item?: Item;
  quiz?: Quiz;
};

type ViewState =
  | { name: "home" }
  | { name: "topics" }
  | { name: "topic"; slug: string; title?: string }
  | { name: "paths" }
  | { name: "path"; slug: string; title?: string }
  | { name: "item"; slug: string; title?: string; pathSlug?: string; step?: number }
  | { name: "quiz"; slug: string; title?: string; pathSlug?: string; step?: number };

const TYPE_LABEL: Record<string, string> = {
  guide: "Guide",
  lesson: "Lesson",
  drill: "Drill",
  troubleshoot: "Troubleshoot",
};
const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all: "All levels",
};

/**
 * Type-color mapping — each clinic item type gets a distinct accent so users
 * can scan a list and see what's a Drill vs a Guide at a glance.
 */
const TYPE_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  guide: {
    label: "Guide",
    color: "#7ec6ff",
    bg: "rgba(126,198,255,0.12)",
    border: "rgba(126,198,255,0.40)",
    icon: "document-text-outline",
  },
  lesson: {
    label: "Lesson",
    color: Colors.ball,
    bg: Colors.ballDim,
    border: Colors.ballSoft,
    icon: "school-outline",
  },
  drill: {
    label: "Drill",
    color: "#ffae42",
    bg: "rgba(255,174,66,0.14)",
    border: "rgba(255,174,66,0.45)",
    icon: "barbell-outline",
  },
  troubleshoot: {
    label: "Troubleshoot",
    color: "#ff8b6b",
    bg: "rgba(255,139,107,0.14)",
    border: "rgba(255,139,107,0.42)",
    icon: "construct-outline",
  },
};

const TYPE_ORDER = ["guide", "lesson", "drill", "troubleshoot"] as const;

function compact(s?: string | null) {
  const t = (s ?? "").trim();
  return t.length ? t : null;
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(apiUrl(path), { signal });
  return (await res.json()) as T;
}

/* ───────── WebView injected JS — strips the website's chrome ─────────
 * 1. Hides the fixed site header/footer that the PHP page renders.
 * 2. Collapses .page-hero's huge top padding (140 px desktop / 100 px
 *    mobile) that the website reserves for that now-hidden fixed header.
 *    Without (2), there's still a tall black gap before the lesson/quiz
 *    title even after the header is gone — the page is reserving space
 *    for a nav that no longer exists in app mode.
 * 3. Trims `main`'s padding-top so the content sits flush with the app's
 *    own TopBar.
 */
function makeInjectedJS() {
  return `
  (function () {
    try {
      var hide = [
        'header','footer','#header','#site-header','.site-header','.header',
        '.topbar','.top-bar','.navbar','.nav','.navigation',
        '#footer','.site-footer','.footer'
      ].join(',') + '{ display:none !important; }';

      // Collapse the top padding the page reserves for the (hidden) header.
      // The PHP page already drops main → 24 px in ?app=1 mode, but it
      // leaves .page-hero / .item-content / .quiz-content alone — those
      // are the actual containers showing 100+ px of black above the title.
      var tighten =
        '.page-hero { padding-top: 8px !important; padding-bottom: 20px !important; }' +
        'main { padding-top: 0 !important; }' +
        '.item-content, .quiz-content { padding-top: 0 !important; }';

      var css = hide + tighten;
      var style = document.createElement('style');
      style.innerHTML = css;
      document.head && document.head.appendChild(style);
    } catch(e) {}

    function hardTop(){
      try { window.scrollTo(0,0); } catch(e) {}
      try { document.documentElement.scrollTop = 0; } catch(e) {}
      try { document.body.scrollTop = 0; } catch(e) {}
    }

    function postHeight(){
      try{
        var body = document.body;
        var html = document.documentElement;
        var h = Math.max(
          body ? body.scrollHeight : 0,
          html ? html.scrollHeight : 0,
          body ? body.offsetHeight : 0,
          html ? html.offsetHeight : 0
        );
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type:'HEIGHT', height: h }));
      }catch(e){}
    }

    function bindImages(){
      try{
        var imgs = document.images || [];
        for (var i=0; i<imgs.length; i++){
          var img = imgs[i];
          if (img.__hBound) continue;
          img.__hBound = true;
          if (!img.complete){
            img.addEventListener('load', function(){ setTimeout(postHeight, 50); }, { once:true });
            img.addEventListener('error', function(){ setTimeout(postHeight, 50); }, { once:true });
          }
        }
      }catch(e){}
    }

    hardTop();
    postHeight();
    bindImages();

    document.addEventListener('DOMContentLoaded', function(){
      hardTop();
      bindImages();
      setTimeout(postHeight, 50);
    });

    window.addEventListener('load', function(){
      hardTop();
      bindImages();
      setTimeout(postHeight, 50);
      setTimeout(postHeight, 250);
    });

    window.addEventListener('resize', function(){
      setTimeout(postHeight, 50);
    });

    try{
      var mo = new MutationObserver(function(){
        bindImages();
        setTimeout(postHeight, 50);
      });
      mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true });
    }catch(e){}

    var tries = 0;
    var t = setInterval(function(){
      tries++;
      postHeight();
      if (tries > 20) clearInterval(t);
    }, 250);
  })();
  true;
  `;
}

/* ═════════════════════════════════════════════════════════════════
   Presentational helpers — small reusable pieces used by the views
   ═════════════════════════════════════════════════════════════════ */

/* Color-coded type badge — Guide / Lesson / Drill / Troubleshoot */
function TypeBadge({ type, size = "default" }: { type?: string | null; size?: "default" | "sm" }) {
  const t = (type ?? "").toLowerCase();
  const meta = TYPE_META[t];
  if (!meta) return null;
  const isSm = size === "sm";
  return (
    <View
      style={[
        s.typeBadge,
        { backgroundColor: meta.bg, borderColor: meta.border },
        isSm && { paddingHorizontal: 8, paddingVertical: 2 },
      ]}
    >
      <Ionicons name={meta.icon} size={isSm ? 11 : 13} color={meta.color} />
      <Body
        weight="extrabold"
        style={{
          color: meta.color,
          fontSize: isSm ? 10 : 11,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        {meta.label}
      </Body>
    </View>
  );
}

/* Skill-level chip — neutral */
function LevelChip({ level }: { level?: string | null }) {
  const l = (level ?? "").toLowerCase();
  const label = LEVEL_LABEL[l];
  if (!label) return null;
  return (
    <View style={s.metaChip}>
      <Ionicons name="trending-up-outline" size={11} color={Colors.muted} />
      <Body weight="bold" style={s.metaChipText}>
        {label}
      </Body>
    </View>
  );
}

/* Minutes chip */
function MinChip({ minutes }: { minutes?: number | null }) {
  if (typeof minutes !== "number" || minutes <= 0) return null;
  return (
    <View style={s.metaChip}>
      <Ionicons name="time-outline" size={11} color={Colors.muted} />
      <Body weight="bold" style={s.metaChipText}>
        {minutes} min
      </Body>
    </View>
  );
}

/* Steps chip (for paths) */
function StepsChip({ count }: { count?: number | null }) {
  if (typeof count !== "number" || count <= 0) return null;
  return (
    <View style={s.metaChip}>
      <Ionicons name="footsteps-outline" size={11} color={Colors.muted} />
      <Body weight="bold" style={s.metaChipText}>
        {count} step{count === 1 ? "" : "s"}
      </Body>
    </View>
  );
}

/* Big featured path card with image, name, meta chips, step count */
function FeaturedPathCard({ path, onPress }: { path: Path; onPress: () => void }) {
  const img = compact(path.featured_image_url);
  const level = compact(path.intended_level);
  const steps = path.step_count;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.pathCard, pressed && { opacity: 0.94 }]}>
      <View style={s.pathThumb}>
        {img ? (
          <Image source={{ uri: img }} style={s.pathImg} resizeMode="cover" />
        ) : (
          <View style={s.pathImgFallback}>
            <Ionicons name="map-outline" size={36} color={Colors.muted2} />
          </View>
        )}
        <View style={s.pathBadge}>
          <Ionicons name="footsteps" size={11} color={Colors.onBall} />
          <Body weight="extrabold" style={s.pathBadgeText}>
            {typeof steps === "number" ? `${steps} step${steps === 1 ? "" : "s"}` : "Path"}
          </Body>
        </View>
      </View>
      <View style={s.pathBody}>
        <Eyebrow style={{ marginBottom: 6 }}>Training Path</Eyebrow>
        <Title numberOfLines={2} style={{ fontSize: 19, lineHeight: 24 }}>
          {path.name}
        </Title>
        {compact(path.description) ? (
          <Muted numberOfLines={2} style={{ marginTop: 6 }}>
            {path.description}
          </Muted>
        ) : null}
        <View style={[s.chipRow, { marginTop: Spacing.md }]}>
          {level ? <LevelChip level={level} /> : null}
          {typeof path.est_total_minutes === "number" ? <MinChip minutes={path.est_total_minutes} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/* 2-col topic tile — featured image as full background */
function TopicTile({ topic, onPress }: { topic: Topic; onPress: () => void }) {
  const img = compact(topic.featured_image_url);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.topicTile, pressed && { opacity: 0.92 }]}>
      <View style={s.topicTileImgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={s.topicTileImg} resizeMode="cover" />
        ) : (
          <View style={s.topicTileFallback}>
            <Ionicons name="albums-outline" size={28} color={Colors.muted2} />
          </View>
        )}
        <View style={s.topicTileScrim} />
        <View style={s.topicTileTitleWrap}>
          <Title
            numberOfLines={2}
            style={{ fontSize: 16, lineHeight: 20, color: Colors.text }}
          >
            {topic.name}
          </Title>
        </View>
      </View>
    </Pressable>
  );
}

/* Item card used in topic lists and search */
function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const img = compact(item.featured_image_url);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.itemCard, pressed && { opacity: 0.95 }]}>
      <View style={s.itemImgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={s.itemImg} resizeMode="cover" />
        ) : (
          <View style={s.itemImgFallback}>
            <Ionicons name="image-outline" size={20} color={Colors.muted2} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, paddingRight: 4 }}>
        <View style={[s.chipRow, { marginBottom: 6 }]}>
          <TypeBadge type={item.item_type} size="sm" />
          {item.skill_level && LEVEL_LABEL[(item.skill_level ?? "").toLowerCase()] ? (
            <LevelChip level={item.skill_level} />
          ) : null}
        </View>
        <Subtitle numberOfLines={2} style={{ fontSize: 15, lineHeight: 19 }}>
          {item.title}
        </Subtitle>
        {compact(item.excerpt) ? (
          <Muted numberOfLines={2} style={{ marginTop: 4, fontSize: 12.5, lineHeight: 17 }}>
            {item.excerpt}
          </Muted>
        ) : null}
        {typeof item.est_minutes === "number" && item.est_minutes > 0 ? (
          <View style={[s.chipRow, { marginTop: 6 }]}>
            <MinChip minutes={item.est_minutes} />
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.muted2} />
    </Pressable>
  );
}

/* Numbered step card for path views */
function PathStepCard({ step, onPress }: { step: PathStep; onPress: () => void }) {
  const isQuiz = step.step_type === "quiz" || (!!step.quiz && !step.item);
  const subject = isQuiz ? step.quiz : step.item;
  const title = step.step_title || subject?.title || "";
  const note = compact(step.note) ?? (isQuiz ? compact(step.quiz?.description) : compact(step.item?.excerpt));
  const img = compact(isQuiz ? null : step.item?.featured_image_url);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.stepCard, pressed && { opacity: 0.94 }]}>
      <View style={s.stepNumber}>
        <Body weight="extrabold" style={s.stepNumberText}>
          {step.step_no}
        </Body>
      </View>

      <View style={{ flex: 1 }}>
        <View style={[s.chipRow, { marginBottom: 6 }]}>
          {isQuiz ? (
            <View style={[s.typeBadge, { backgroundColor: Colors.ballDim, borderColor: Colors.ballSoft }]}>
              <Ionicons name="help-circle-outline" size={13} color={Colors.ball} />
              <Body weight="extrabold" style={{ color: Colors.ball, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" }}>
                Quiz
              </Body>
            </View>
          ) : (
            <TypeBadge type={step.item?.item_type} size="sm" />
          )}
          {!isQuiz && typeof step.item?.est_minutes === "number" ? <MinChip minutes={step.item?.est_minutes} /> : null}
        </View>

        <Subtitle numberOfLines={2} style={{ fontSize: 15, lineHeight: 19 }}>
          {title}
        </Subtitle>

        {note ? (
          <Muted numberOfLines={2} style={{ marginTop: 4, fontSize: 12.5, lineHeight: 17 }}>
            {note}
          </Muted>
        ) : null}
      </View>

      {img ? (
        <Image source={{ uri: img }} style={s.stepImg} resizeMode="cover" />
      ) : (
        <View style={s.stepImgFallback}>
          <Ionicons name={isQuiz ? "help-circle-outline" : "play-circle-outline"} size={22} color={Colors.muted2} />
        </View>
      )}
    </Pressable>
  );
}

/* Filter chip used inline on topic screen */
function FilterChip({
  label,
  active,
  onPress,
  accent,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.filterChip,
        active && {
          backgroundColor: accent ? `${accent}22` : Colors.ballDim,
          borderColor: accent ?? Colors.ballSoft,
        },
      ]}
    >
      <Body
        weight={active ? "extrabold" : "bold"}
        style={[
          s.filterChipText,
          active && { color: accent ?? Colors.ball },
        ]}
      >
        {label}
      </Body>
    </Pressable>
  );
}

/* ═════════════════════════════════════════════════════════════════
   Main ClinicTab — data layer unchanged, presentation rewritten
   ═════════════════════════════════════════════════════════════════ */
export default function ClinicTab() {
  const insets = useSafeAreaInsets();

  const [stack, setStack] = useState<ViewState[]>([{ name: "home" }]);
  const view = stack[stack.length - 1];

  const push = useCallback((v: ViewState) => setStack((st) => [...st, v]), []);
  const pop = useCallback(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), []);
  const goHome = useCallback(() => setStack([{ name: "home" }]), []);
  const replaceView = useCallback((v: ViewState) => {
    setStack((st) => (st.length ? [...st.slice(0, -1), v] : [v]));
  }, []);

  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [paths, setPaths] = useState<Path[] | null>(null);
  const [topicItems, setTopicItems] = useState<Record<string, Item[]>>({});
  const [topicMeta, setTopicMeta] = useState<Record<string, Topic>>({});
  const [pathSteps, setPathSteps] = useState<Record<string, PathStep[]>>({});
  const [pathMeta, setPathMeta] = useState<Record<string, Path>>({});
  const [itemDetail, setItemDetail] = useState<Record<string, Item>>({});

  // Topic-scope filters — kept on parent so they persist across pop/push
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [level, setLevel] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const webViewRef = useRef<WebView>(null);

  const start = useCallback(async <T,>(fn: (signal: AbortSignal) => Promise<T>) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      return await fn(ac.signal);
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setLoading(false);
    }
  }, []);

  const loadTopics = useCallback(async () => {
    const data = await start<{ ok: boolean; topics: Topic[]; error?: string }>((signal) =>
      fetchJson(`/api/v1/clinic/topics.php`, signal)
    );
    if (!data.ok) throw new Error(data.error || "Failed to load topics");
    setTopics(data.topics ?? []);
  }, [start]);

  const loadPaths = useCallback(async () => {
    const data = await start<{ ok: boolean; paths: Path[]; error?: string }>((signal) =>
      fetchJson(`/api/v1/clinic/paths.php`, signal)
    );
    if (!data.ok) throw new Error(data.error || "Failed to load paths");
    setPaths(data.paths ?? []);
  }, [start]);

  const loadTopic = useCallback(
    async (slug: string) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (type) params.set("type", type);
      if (level) params.set("level", level);
      const qs = params.toString();

      const data = await start<{ ok: boolean; topic: Topic; items: Item[]; error?: string }>((signal) =>
        fetchJson(`/api/v1/clinic/topic.php?slug=${encodeURIComponent(slug)}${qs ? `&${qs}` : ""}`, signal)
      );

      if (!data.ok) throw new Error(data.error || "Failed to load topic");
      setTopicItems((m) => ({ ...m, [slug]: data.items ?? [] }));
      if (data.topic) setTopicMeta((m) => ({ ...m, [slug]: data.topic }));
      return data.topic;
    },
    [start, q, type, level]
  );

  const loadPath = useCallback(
    async (slug: string) => {
      const data = await start<{ ok: boolean; path: Path; steps: PathStep[]; error?: string }>((signal) =>
        fetchJson(`/api/v1/clinic/path.php?slug=${encodeURIComponent(slug)}`, signal)
      );

      if (!data.ok) throw new Error(data.error || "Failed to load path");
      setPathSteps((m) => ({ ...m, [slug]: data.steps ?? [] }));
      if (data.path) setPathMeta((m) => ({ ...m, [slug]: data.path }));
      return data.path;
    },
    [start]
  );

  const loadItem = useCallback(
    async (slug: string) => {
      const data = await start<{ ok: boolean; item: Item; error?: string }>((signal) =>
        fetchJson(`/api/v1/clinic/item.php?slug=${encodeURIComponent(slug)}`, signal)
      );
      if (!data.ok) throw new Error(data.error || "Failed to load item");
      setItemDetail((m) => ({ ...m, [slug]: data.item }));
      return data.item;
    },
    [start]
  );

  /* Initial load */
  useEffect(() => {
    (async () => {
      try {
        if (!topics) await loadTopics();
        if (!paths) await loadPaths();
      } catch {
        // allow retry UI
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-load on navigation deeper */
  useEffect(() => {
    (async () => {
      try {
        if (view.name === "topics" && !topics) await loadTopics();
        if (view.name === "paths" && !paths) await loadPaths();
        if (view.name === "topic" && topicItems[view.slug] === undefined) await loadTopic(view.slug);
        if (view.name === "path" && pathSteps[view.slug] === undefined) await loadPath(view.slug);
        if (view.name === "item" && itemDetail[view.slug] === undefined) await loadItem(view.slug);
      } catch {
        // allow retry UI
      }
    })();
  }, [view, topics, paths, topicItems, pathSteps, itemDetail, loadTopics, loadPaths, loadTopic, loadPath, loadItem]);

  /* Refresh */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (view.name === "home") {
        await loadTopics();
        await loadPaths();
      } else if (view.name === "topics") {
        await loadTopics();
      } else if (view.name === "paths") {
        await loadPaths();
      } else if (view.name === "topic") {
        await loadTopic(view.slug);
      } else if (view.name === "path") {
        await loadPath(view.slug);
      } else if (view.name === "item") {
        await loadItem(view.slug);
        webViewRef.current?.reload();
      } else if (view.name === "quiz") {
        webViewRef.current?.reload();
      }
    } finally {
      setRefreshing(false);
    }
  }, [view, loadTopics, loadPaths, loadTopic, loadPath, loadItem]);

  const onShare = useCallback(async () => {
    if (!(view.name === "item" || view.name === "quiz")) return;

    const slug = view.slug;
    const isItem = view.name === "item";
    const title =
      (isItem ? itemDetail[slug]?.title : view.title) ||
      (isItem ? "Clinic Item" : "Clinic Quiz");

    const base = isItem ? "https://whatyoudink.com/clinic/item.php" : "https://whatyoudink.com/clinic/quiz.php";
    const params = new URLSearchParams();
    params.set("slug", String(slug));
    if (view.pathSlug) params.set("path", String(view.pathSlug));
    if (typeof view.step === "number") params.set("step", String(view.step));

    const shareUrl = `${base}?${params.toString()}`;

    try {
      await Share.share({
        title,
        message: `${title}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // user cancelled — no-op
    }
  }, [view, itemDetail]);

  /* Intercept in-page nav from WebView to native screens */
  const interceptClinicNav = useCallback(
    (url: string) => {
      try {
        const u = String(url || "");
        if (!u) return true;
        if (!u.includes("whatyoudink.com")) return true;

        if (u.includes("/clinic/paths.php")) {
          replaceView({ name: "paths" });
          return false;
        }
        if (u.includes("/clinic/path.php")) {
          const m = u.match(/[?&]slug=([^&#]+)/);
          const slug = m ? decodeURIComponent(m[1]) : "";
          if (slug) replaceView({ name: "path", slug });
          return false;
        }
        if (u.includes("/clinic/item.php")) {
          const m = u.match(/[?&]slug=([^&#]+)/);
          const slug = m ? decodeURIComponent(m[1]) : "";
          const mp = u.match(/[?&]path=([^&#]+)/);
          const ms = u.match(/[?&]step=([^&#]+)/);
          if (slug)
            replaceView({
              name: "item",
              slug,
              pathSlug: mp ? decodeURIComponent(mp[1]) : undefined,
              step: ms ? parseInt(decodeURIComponent(ms[1]), 10) : undefined,
            });
          return false;
        }
        if (u.includes("/clinic/quiz.php")) {
          const m = u.match(/[?&]slug=([^&#]+)/);
          const slug = m ? decodeURIComponent(m[1]) : "";
          const mp = u.match(/[?&]path=([^&#]+)/);
          const ms = u.match(/[?&]step=([^&#]+)/);
          if (slug)
            replaceView({
              name: "quiz",
              slug,
              pathSlug: mp ? decodeURIComponent(mp[1]) : undefined,
              step: ms ? parseInt(decodeURIComponent(ms[1]), 10) : undefined,
            });
          return false;
        }

        return true;
      } catch {
        return true;
      }
    },
    [replaceView]
  );

  const injectedJS = useMemo(() => makeInjectedJS(), []);

  /* Top bar — brand-styled. On the Home view we render only the safe-area
   * spacer; the hero itself is the page identifier (matching the Home,
   * About, and Reviews tabs). Deeper views get the back / share / home
   * navigation row.
   *
   * The wrapping SafeAreaView already pads `insets.top` so we only need
   * a small additional breathing-room (8 px) here. Using `insets.top + 8`
   * was double-padding — visible as a tall black gap at the top of the
   * Item and Quiz WebViews, where there's no hero image to absorb it.   */
  const TopBar = (
    <View style={[s.topBar, { paddingTop: 8 }]}>
      {stack.length > 1 ? (
        <View style={s.topBarRow}>
          <Pressable
            onPress={pop}
            style={({ pressed }) => [s.topBarBtn, pressed && s.topBarBtnPressed]}
            hitSlop={6}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
            <Body weight="extrabold" style={s.topBarBtnText}>
              Back
            </Body>
          </Pressable>

          <View style={{ flex: 1 }} />

          {view.name === "item" || view.name === "quiz" ? (
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [s.topBarIconBtn, pressed && s.topBarBtnPressed]}
              hitSlop={6}
            >
              <Ionicons name="share-outline" size={20} color={Colors.text} />
            </Pressable>
          ) : null}

          <Pressable
            onPress={goHome}
            style={({ pressed }) => [s.topBarIconBtn, pressed && s.topBarBtnPressed]}
            hitSlop={6}
          >
            <Ionicons name="home-outline" size={20} color={Colors.text} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  /* ───────── HOME ───────── */
  if (view.name === "home") {
    const allPaths = paths ?? [];
    const featuredPath = allPaths[0];
    const morePaths = allPaths.slice(1, 4);
    const topTopics = (topics ?? []).slice(0, 6);

    return (
      <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
        {TopBar}
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.ball}
              colors={[Colors.ball]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Hero — matches the website's "— Level Up Your Game" eyebrow,
              big split heading with ball-green accent, and aspirational sub.
              Pairs with the Home → Explore "LEVEL UP." card so the user
              lands on a hero that visually continues that phrase. */}
          <Eyebrow style={s.heroEyebrow}>— Level Up Your Game</Eyebrow>

          <Display size="xl" style={s.heroTitle}>
            LEVEL UP{"\n"}
            <Display size="xl" style={{ color: Colors.ball }}>
              YOUR GAME.
            </Display>
          </Display>

          <Muted style={s.heroSub}>
            Structured training paths and skill breakdowns for every level — from your first dink to tournament play.
          </Muted>

          {/* Start here — the first / featured path */}
          {loading && !paths ? (
            <View style={[s.loadingBlock, { marginTop: Spacing.xxl }]}>
              <ActivityIndicator color={Colors.ball} />
              <Muted style={{ marginTop: 10 }}>Loading…</Muted>
            </View>
          ) : featuredPath ? (
            <View style={{ marginTop: Spacing.xxl }}>
              <View style={s.startEyebrowRow}>
                <View style={s.startDot} />
                <Eyebrow>Start here</Eyebrow>
              </View>
              <FeaturedPathCard
                path={featuredPath}
                onPress={() =>
                  push({ name: "path", slug: featuredPath.slug, title: featuredPath.name })
                }
              />
            </View>
          ) : null}

          {/* More paths */}
          {morePaths.length ? (
            <>
              <View style={s.sectionHead}>
                <Eyebrow>More Training Paths</Eyebrow>
                <Pressable
                  onPress={() => push({ name: "paths" })}
                  style={({ pressed }) => [s.seeAll, pressed && { opacity: 0.7 }]}
                  hitSlop={6}
                >
                  <Body weight="bold" style={s.seeAllText}>
                    See all
                  </Body>
                  <Ionicons name="arrow-forward" size={14} color={Colors.muted} />
                </Pressable>
              </View>

              <View style={{ gap: 14 }}>
                {morePaths.map((p) => (
                  <FeaturedPathCard
                    key={p.id}
                    path={p}
                    onPress={() => push({ name: "path", slug: p.slug, title: p.name })}
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* Browse topics */}
          <View style={s.sectionHead}>
            <Eyebrow>Browse Topics</Eyebrow>
            <Pressable
              onPress={() => {
                setType("");
                setLevel("");
                setQ("");
                push({ name: "topics" });
              }}
              style={({ pressed }) => [s.seeAll, pressed && { opacity: 0.7 }]}
              hitSlop={6}
            >
              <Body weight="bold" style={s.seeAllText}>
                See all
              </Body>
              <Ionicons name="arrow-forward" size={14} color={Colors.muted} />
            </Pressable>
          </View>

          {loading && !topics ? (
            <View style={s.loadingBlock}>
              <ActivityIndicator color={Colors.ball} />
              <Muted style={{ marginTop: 10 }}>Loading topics…</Muted>
            </View>
          ) : topTopics.length ? (
            <View style={s.topicGrid}>
              {topTopics.map((t) => (
                <TopicTile
                  key={t.id}
                  topic={t}
                  onPress={() => push({ name: "topic", slug: t.slug, title: t.name })}
                />
              ))}
            </View>
          ) : (
            <Pressable
              onPress={loadTopics}
              style={({ pressed }) => [s.emptyCard, pressed && { opacity: 0.9 }]}
            >
              <Body weight="extrabold">No topics yet.</Body>
              <Muted style={{ marginTop: 6 }}>Pull to retry.</Muted>
            </Pressable>
          )}

          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ───────── ALL TOPICS ───────── */
  if (view.name === "topics") {
    return (
      <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
        {TopBar}

        <View style={s.headerSection}>
          <Eyebrow>Browse</Eyebrow>
          <Title style={{ fontSize: 26, lineHeight: 30, marginTop: 4 }}>All Topics</Title>
        </View>

        <FlatList
          data={topics ?? []}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={s.gridScroll}
          numColumns={2}
          columnWrapperStyle={{ gap: Spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.ball}
              colors={[Colors.ball]}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyCard}>
              {loading ? <ActivityIndicator color={Colors.ball} /> : null}
              <Body weight="extrabold">
                {loading ? "Loading topics…" : "No topics found."}
              </Body>
              {!loading ? (
                <Pressable
                  onPress={loadTopics}
                  style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, { marginTop: 12 }]}
                >
                  <Body weight="extrabold" style={s.primaryBtnText}>
                    Retry
                  </Body>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <TopicTile
                topic={item}
                onPress={() => push({ name: "topic", slug: item.slug, title: item.name })}
              />
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  /* ───────── ALL PATHS ───────── */
  if (view.name === "paths") {
    return (
      <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
        {TopBar}

        <View style={s.headerSection}>
          <Eyebrow>Browse</Eyebrow>
          <Title style={{ fontSize: 26, lineHeight: 30, marginTop: 4 }}>Training Paths</Title>
          <Muted style={{ marginTop: 6 }}>
            Step-by-step programs that build skills in order.
          </Muted>
        </View>

        <FlatList
          data={paths ?? []}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.ball}
              colors={[Colors.ball]}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyCard}>
              {loading ? <ActivityIndicator color={Colors.ball} /> : null}
              <Body weight="extrabold">
                {loading ? "Loading paths…" : "No paths found."}
              </Body>
              {!loading ? (
                <Pressable
                  onPress={loadPaths}
                  style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, { marginTop: 12 }]}
                >
                  <Body weight="extrabold" style={s.primaryBtnText}>
                    Retry
                  </Body>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <FeaturedPathCard
              path={item}
              onPress={() => push({ name: "path", slug: item.slug, title: item.name })}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  /* ───────── TOPIC (items with inline filter chips) ───────── */
  if (view.name === "topic") {
    const items = topicItems[view.slug];
    const meta = topicMeta[view.slug];
    const heroImg = compact(meta?.featured_image_url);

    return (
      <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
        {TopBar}

        <FlatList
          data={items ?? []}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.ball}
              colors={[Colors.ball]}
            />
          }
          ListHeaderComponent={
            <View>
              {heroImg ? (
                <Image source={{ uri: heroImg }} style={s.topicHero} resizeMode="cover" />
              ) : null}

              <Eyebrow style={{ marginTop: heroImg ? Spacing.md : 0 }}>Topic</Eyebrow>
              <Title style={{ fontSize: 28, lineHeight: 32, marginTop: 4 }}>
                {meta?.name || view.title || "Topic"}
              </Title>
              {compact(meta?.description) ? (
                <Body weight="regular" size="small" style={{ marginTop: 8, color: Colors.muted }}>
                  {meta?.description}
                </Body>
              ) : null}

              {/* Search */}
              <View style={s.searchRow}>
                <Ionicons name="search" size={16} color={Colors.muted2} style={{ marginLeft: 12 }} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search this topic…"
                  placeholderTextColor={Colors.muted2}
                  style={s.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={() => loadTopic(view.slug)}
                />
                {q ? (
                  <Pressable
                    onPress={() => {
                      setQ("");
                      loadTopic(view.slug);
                    }}
                    hitSlop={8}
                    style={{ paddingHorizontal: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color={Colors.muted2} />
                  </Pressable>
                ) : null}
              </View>

              {/* Type chips */}
              <View style={s.chipScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <FilterChip
                    label="All Types"
                    active={!type}
                    onPress={() => {
                      setType("");
                      loadTopic(view.slug);
                    }}
                  />
                  {TYPE_ORDER.map((t) => (
                    <FilterChip
                      key={t}
                      label={TYPE_META[t].label}
                      active={type === t}
                      accent={TYPE_META[t].color}
                      onPress={() => {
                        setType(type === t ? "" : t);
                        setTimeout(() => loadTopic(view.slug), 0);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Level chips */}
              <View style={s.chipScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <FilterChip
                    label="Any Level"
                    active={!level}
                    onPress={() => {
                      setLevel("");
                      loadTopic(view.slug);
                    }}
                  />
                  {(["beginner", "intermediate", "advanced", "all"] as const).map((l) => (
                    <FilterChip
                      key={l}
                      label={LEVEL_LABEL[l]}
                      active={level === l}
                      onPress={() => {
                        setLevel(level === l ? "" : l);
                        setTimeout(() => loadTopic(view.slug), 0);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>

              <View style={{ height: Spacing.md }} />
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyCard}>
              {loading ? <ActivityIndicator color={Colors.ball} /> : null}
              <Body weight="extrabold">
                {loading
                  ? "Loading content…"
                  : items === undefined
                    ? "Loading content…"
                    : "Nothing matches those filters."}
              </Body>
              {!loading && items !== undefined ? (
                <Pressable
                  onPress={() => {
                    setType("");
                    setLevel("");
                    setQ("");
                    loadTopic(view.slug);
                  }}
                  style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, { marginTop: 12 }]}
                >
                  <Body weight="extrabold" style={s.primaryBtnText}>
                    Clear filters
                  </Body>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => push({ name: "item", slug: item.slug, title: item.title })}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  /* ───────── PATH (hero + numbered steps) ───────── */
  if (view.name === "path") {
    const steps = pathSteps[view.slug];
    const meta = pathMeta[view.slug];
    const heroImg = compact(meta?.featured_image_url);

    return (
      <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
        {TopBar}

        <FlatList
          data={steps ?? []}
          keyExtractor={(stp) => String(stp.step_no)}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.ball}
              colors={[Colors.ball]}
            />
          }
          ListHeaderComponent={
            <View>
              {heroImg ? (
                <Image source={{ uri: heroImg }} style={s.pathHero} resizeMode="cover" />
              ) : null}

              <Eyebrow style={{ marginTop: heroImg ? Spacing.md : 0 }}>Training Path</Eyebrow>
              <Title style={{ fontSize: 28, lineHeight: 32, marginTop: 4 }}>
                {meta?.name || view.title || "Path"}
              </Title>
              {compact(meta?.description) ? (
                <Body weight="regular" size="small" style={{ marginTop: 8, color: Colors.muted }}>
                  {meta?.description}
                </Body>
              ) : null}

              <View style={[s.chipRow, { marginTop: Spacing.md }]}>
                <LevelChip level={meta?.intended_level} />
                <MinChip minutes={meta?.est_total_minutes} />
                <StepsChip count={meta?.step_count ?? steps?.length} />
              </View>

              <View style={{ height: Spacing.lg }} />
              <Eyebrow>Steps</Eyebrow>
              <View style={{ height: Spacing.sm }} />
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyCard}>
              {loading ? <ActivityIndicator color={Colors.ball} /> : null}
              <Body weight="extrabold">
                {loading
                  ? "Loading steps…"
                  : steps === undefined
                    ? "Loading steps…"
                    : "No steps yet."}
              </Body>
              {!loading && steps !== undefined ? (
                <Pressable
                  onPress={() => loadPath(view.slug)}
                  style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, { marginTop: 12 }]}
                >
                  <Body weight="extrabold" style={s.primaryBtnText}>
                    Refresh
                  </Body>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <PathStepCard
              step={item}
              onPress={() => {
                const isQuiz = item.step_type === "quiz" || (!!item.quiz && !item.item);
                if (isQuiz && item.quiz) {
                  push({
                    name: "quiz",
                    slug: item.quiz.slug,
                    title: item.step_title,
                    pathSlug: view.slug,
                    step: item.step_no,
                  });
                } else if (item.item) {
                  push({
                    name: "item",
                    slug: item.item.slug,
                    title: item.step_title,
                    pathSlug: view.slug,
                    step: item.step_no,
                  });
                }
              }}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  /* ───────── QUIZ (WebView with brand chrome) ───────── */
  if (view.name === "quiz") {
    const websiteQuizUrl =
      `https://whatyoudink.com/clinic/quiz.php?slug=${encodeURIComponent(view.slug)}&app=1` +
      (view.pathSlug
        ? `&path=${encodeURIComponent(view.pathSlug)}&step=${encodeURIComponent(String(view.step ?? ""))}`
        : "");

    return (
      <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
        {TopBar}

        <View style={{ flex: 1 }}>
          <WebView
            ref={webViewRef}
            source={{ uri: websiteQuizUrl }}
            originWhitelist={["*"]}
            injectedJavaScript={injectedJS}
            onShouldStartLoadWithRequest={(req) => interceptClinicNav(req.url)}
            scrollEnabled
            contentInsetAdjustmentBehavior="never"
            style={{ flex: 1, backgroundColor: Colors.bg }}
            startInLoadingState
            renderLoading={() => (
              <View style={s.webLoading}>
                <ActivityIndicator color={Colors.ball} />
                <Muted style={{ marginTop: 10 }}>Loading quiz…</Muted>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    );
  }

  /* ───────── ITEM (WebView; fall back to a styled detail if no content_html) ───────── */
  if (view.name === "item") {
    const item = itemDetail[view.slug];
    const websiteItemUrl =
      `https://whatyoudink.com/clinic/item.php?slug=${encodeURIComponent(view.slug)}&app=1` +
      (view.pathSlug
        ? `&path=${encodeURIComponent(view.pathSlug)}&step=${encodeURIComponent(String(view.step ?? ""))}`
        : "");

    return (
      <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
        {TopBar}

        {!item ? (
          <View style={s.webLoading}>
            {loading ? <ActivityIndicator color={Colors.ball} /> : null}
            <Muted style={{ marginTop: 10 }}>Loading…</Muted>
            {!loading ? (
              <Pressable
                onPress={() => loadItem(view.slug)}
                style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, { marginTop: 12 }]}
              >
                <Body weight="extrabold" style={s.primaryBtnText}>
                  Retry
                </Body>
              </Pressable>
            ) : null}
          </View>
        ) : compact(item.content_html) ? (
          <View style={{ flex: 1 }}>
            <WebView
              ref={webViewRef}
              source={{ uri: websiteItemUrl }}
              originWhitelist={["*"]}
              injectedJavaScript={injectedJS}
              onShouldStartLoadWithRequest={(req) => interceptClinicNav(req.url)}
              scrollEnabled
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustContentInsets={false}
              style={{ flex: 1, backgroundColor: Colors.bg }}
              startInLoadingState
              renderLoading={() => (
                <View style={s.webLoading}>
                  <ActivityIndicator color={Colors.ball} />
                  <Muted style={{ marginTop: 10 }}>Loading…</Muted>
                </View>
              )}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.ball}
                colors={[Colors.ball]}
              />
            }
          >
            {compact(item.featured_image_url) ? (
              <Image source={{ uri: item.featured_image_url! }} style={s.itemDetailHero} resizeMode="cover" />
            ) : null}

            <View style={[s.chipRow, { marginTop: Spacing.lg }]}>
              <TypeBadge type={item.item_type} />
              <LevelChip level={item.skill_level} />
              <MinChip minutes={item.est_minutes} />
            </View>

            <Title style={{ fontSize: 26, lineHeight: 30, marginTop: Spacing.md }}>
              {item.title}
            </Title>

            {compact(item.excerpt) ? (
              <Body
                weight="regular"
                style={{ marginTop: Spacing.md, color: Colors.muted, lineHeight: 22 }}
              >
                {item.excerpt}
              </Body>
            ) : null}

            {compact(item.youtube_url) ? (
              <Pressable
                onPress={() => Linking.openURL(item.youtube_url!)}
                style={({ pressed }) => [s.youtubeBtn, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="logo-youtube" size={18} color="#fff" />
                <Body weight="extrabold" style={s.youtubeBtnText}>
                  Watch on YouTube
                </Body>
              </Pressable>
            ) : null}

            <View style={{ height: insets.bottom + 32 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return null;
}

/* ═════════════════════════════════════════════════════════════════
   Styles
   ═════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },

  /* Top bar */
  topBar: {
    paddingHorizontal: Spacing.screenPadH,
    paddingBottom: Spacing.md,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  topBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: Radius.md,
  },
  topBarBtnText: {
    color: Colors.text,
    fontSize: TypeScale.bodySm,
    letterSpacing: 0.4,
  },
  topBarBtnPressed: { backgroundColor: Colors.card },
  topBarIconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Layout */
  scroll: { paddingHorizontal: Spacing.screenPadH, paddingBottom: 24 },
  list: { paddingHorizontal: Spacing.screenPadH, paddingBottom: 24 },
  gridScroll: {
    paddingHorizontal: Spacing.screenPadH,
    paddingBottom: 24,
    paddingTop: Spacing.sm,
  },

  /* Home hero */
  heroEyebrow: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    marginTop: 0,
    // xl Display defaults around 72px lineHeight; tighten slightly for the
    // 2-line split so "LEVEL UP / YOUR GAME." sits as one tight block.
    lineHeight: 64,
  },
  heroSub: {
    marginTop: Spacing.lg,
    fontSize: TypeScale.body,
    lineHeight: 24,
    maxWidth: 360,
  },

  /* "Start here" eyebrow row with ball-green dot */
  startEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.md,
  },
  startDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.ball,
  },

  /* Section headers */
  sectionHead: {
    marginTop: Spacing.xxxl,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 6 },
  seeAllText: {
    color: Colors.muted,
    fontSize: TypeScale.caption,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },

  /* Featured path card */
  pathCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  pathThumb: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surface,
    position: "relative",
  },
  pathImg: { width: "100%", height: "100%" },
  pathImgFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  pathBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ball,
  },
  pathBadgeText: {
    color: Colors.onBall,
    fontSize: TypeScale.caption,
    letterSpacing: 0.6,
  },
  pathBody: {
    padding: Spacing.lg,
  },

  /* Topic grid (home + topics list) */
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  topicTile: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    backgroundColor: Colors.card,
  },
  topicTileImgWrap: {
    width: "100%",
    aspectRatio: 4 / 5,
    position: "relative",
  },
  topicTileImg: { width: "100%", height: "100%" },
  topicTileFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  topicTileScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
    backgroundColor: "rgba(8,8,8,0.65)",
  },
  topicTileTitleWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },

  /* Section heading inside list-header */
  headerSection: {
    paddingHorizontal: Spacing.screenPadH,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },

  /* Topic & path hero images */
  topicHero: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  pathHero: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },

  /* Search */
  searchRow: {
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.body.medium,
    fontSize: TypeScale.bodySm,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  /* Filter chip rows */
  chipScroll: { marginTop: Spacing.md },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterChipText: {
    color: Colors.muted,
    fontSize: TypeScale.caption,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  /* Type badge */
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },

  /* Meta chip (level/min/steps) */
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  metaChipText: {
    color: Colors.muted,
    fontSize: 11,
    letterSpacing: 0.8,
  },

  /* Item card */
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  itemImgWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  itemImg: { width: "100%", height: "100%" },
  itemImgFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },

  /* Path step card */
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.ballDim,
    borderWidth: 1,
    borderColor: Colors.ballSoft,
  },
  stepNumberText: {
    color: Colors.ball,
    fontSize: 14,
    fontFamily: Fonts.body.extrabold,
  },
  stepImg: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  stepImgFallback: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Loading / empty */
  loadingBlock: { paddingVertical: 24, alignItems: "center" },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
  },

  /* Buttons */
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ball,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: Colors.onBall,
    fontSize: TypeScale.caption,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  youtubeBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: Colors.youtube,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  youtubeBtnText: {
    color: "#fff",
    fontSize: TypeScale.bodySm,
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },

  /* Web fallback loading */
  webLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },

  /* Fallback item detail (when content_html missing) */
  itemDetailHero: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    marginTop: Spacing.md,
  },
});
