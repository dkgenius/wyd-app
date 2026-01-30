// /app/(tabs)/map.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiUrl } from "../../src/api/base";

type Ratings = {
  court?: number | null;
  facility?: number | null;
  amenities?: number | null;
  location?: number | null;
  gameplay?: number | null;
  vibe?: number | null;
};

type Courts = { indoor: number; outdoor: number };

type HoursDay = { open: string | null; close: string | null };
type Hours = {
  mon?: HoursDay;
  tue?: HoursDay;
  wed?: HoursDay;
  thu?: HoursDay;
  fri?: HoursDay;
  sat?: HoursDay;
  sun?: HoursDay;
  tz?: string | null;
};

type Blog = { id?: number | null; slug?: string | null; title?: string | null; url?: string | null };

type LocationItem = {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  latitude: number;
  longitude: number;
  distance_mi?: number | null;

  visited?: number | null;

  rating_overall?: number | null;
  ratings?: Ratings | null;

  courts?: Courts | null;
  access_type?: string | null;
  summary?: string | null;

  youtube_url?: string | null;
  website_url?: string | null;
  phone?: string | null;
  email?: string | null;

  hours?: Hours | null;

  blog?: Blog | null;

  skill_levels?: string[] | string | null;
};

type LocationItemUI = LocationItem & {
  _openNow?: boolean;
  _totalCourts?: number;
};

type NearbyResponse = {
  ok: boolean;
  error?: string;
  center?: { lat: number; lng: number; zoom?: number };
  locations?: LocationItem[];
};

type Filters = {
  access: "any" | "public" | "paid";
  courtType: "any" | "indoor" | "outdoor";
  visitedOnly: boolean;
  openNowOnly: boolean;
  courtsBucket: "any" | "1-2" | "3-5" | "6-9" | "10+";
  sortBy: "distance" | "rating" | "courts";
  skillLevels: string[];
};

const DEFAULT_FILTERS: Filters = {
  access: "any",
  courtType: "any",
  visitedOnly: false,
  openNowOnly: false,
  courtsBucket: "any",
  sortBy: "distance",
  skillLevels: [],
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function normalizeWebsite(url?: string | null) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function cleanPhoneDigits(phone?: string | null) {
  const s = String(phone ?? "").trim();
  if (!s) return "";
  return s.replace(/(?!^\+)[^\d]/g, "");
}

function formatTime(t?: string | null) {
  const s = String(t ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return s;
  let hh = parseInt(m[1], 10);
  const mm = m[2];
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${mm} ${ampm}`;
}

function totalCourts(c?: Courts | null) {
  const indoor = Number(c?.indoor ?? 0);
  const outdoor = Number(c?.outdoor ?? 0);
  return Math.max(0, indoor + outdoor);
}

function courtsText(c?: Courts | null) {
  const indoor = Number(c?.indoor ?? 0);
  const outdoor = Number(c?.outdoor ?? 0);
  const parts: string[] = [];
  if (indoor > 0) parts.push(`${indoor} indoor`);
  if (outdoor > 0) parts.push(`${outdoor} outdoor`);
  return parts.length ? parts.join(" • ") : "—";
}

function accessText(t?: string | null) {
  const v = String(t ?? "").toLowerCase();
  if (v === "public") return "Public";
  if (v === "paid") return "Membership/Paid";
  return "—";
}


const SKILL_LABELS: Record<string, string> = {
  beginner: "Beginner (<3.0)",
  intermediate: "Intermediate (3.0–3.5)",
  adv_intermediate: "Advanced Intermediate (3.5–4.0)",
  advanced: "Advanced (4.0+)",
  pro: "Pro (5.0+)",
};

function getSkillLevelsArray(loc: LocationItemUI) {
  const v: any = (loc as any)?.skill_levels ?? (loc as any)?.skillLevels ?? null;
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function skillLevelsText(loc: LocationItemUI) {
  const arr = getSkillLevelsArray(loc).filter((k) => SKILL_LABELS[k]);
  if (!arr.length) return "";
  return arr.map((k) => SKILL_LABELS[k]).join(" • ");
}

function parseHHMMSS(t?: string | null) {
  const s = String(t ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ss = m[3] ? parseInt(m[3], 10) : 0;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
  return hh * 3600 + mm * 60 + ss;
}

function dayKeyFromIntl(weekday: string) {
  const w = String(weekday || "").toLowerCase();
  if (w.startsWith("mon")) return "mon";
  if (w.startsWith("tue")) return "tue";
  if (w.startsWith("wed")) return "wed";
  if (w.startsWith("thu")) return "thu";
  if (w.startsWith("fri")) return "fri";
  if (w.startsWith("sat")) return "sat";
  if (w.startsWith("sun")) return "sun";
  return null;
}

function prevDayKey(day: string) {
  const order = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const i = order.indexOf(day);
  if (i < 0) return null;
  return order[(i + 6) % 7];
}

function getNowPartsInTZ(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    let weekday = "";
    let hour = "00",
      minute = "00",
      second = "00";

    for (const p of parts) {
      if (p.type === "weekday") weekday = p.value;
      if (p.type === "hour") hour = p.value;
      if (p.type === "minute") minute = p.value;
      if (p.type === "second") second = p.value;
    }

    const dayKey = dayKeyFromIntl(weekday);
    const seconds = parseInt(hour, 10) * 3600 + parseInt(minute, 10) * 60 + parseInt(second, 10);
    if (!dayKey || !Number.isFinite(seconds)) return null;
    return { dayKey, seconds };
  } catch {
    return null;
  }
}

function getHoursForDay(h: Hours | null | undefined, dayKey: string) {
  if (!h) return null;
  const d = (h as any)[dayKey] as HoursDay | undefined;
  if (!d) return null;
  const openS = parseHHMMSS(d.open ?? null);
  const closeS = parseHHMMSS(d.close ?? null);
  if (openS === null || closeS === null) return null;
  return { openS, closeS };
}

function isOpenNow(loc: LocationItem) {
  const h = loc.hours;
  if (!h) return false;
  const tz = String(h.tz ?? "").trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = getNowPartsInTZ(tz);
  if (!now) return false;

  const todayKey = now.dayKey;
  const nowS = now.seconds;

  const todays = getHoursForDay(h, todayKey);
  if (todays) {
    const { openS, closeS } = todays;
    if (openS === closeS) return true;
    if (openS < closeS) return nowS >= openS && nowS < closeS;
    if (openS > closeS) return nowS >= openS || nowS < closeS;
  }

  const yKey = prevDayKey(todayKey);
  const y = yKey ? getHoursForDay(h, yKey) : null;
  if (y) {
    const { openS, closeS } = y;
    if (openS === closeS) return true;
    if (openS > closeS && nowS < closeS) return true;
  }

  return false;
}

// NOTE: You had ratingNum but you never use it — leaving it out would be fine,
// but keeping it is harmless.
function ratingNum(v?: number | null) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

function RatingBalls({ value, size = "md" }: { value: number | null | undefined; size?: "md" | "sm" }) {
  if (value === null || value === undefined || value === ("" as any)) {
    return <Text style={styles.muted}>—</Text>;
  }
  const v = clamp(Number(value), 0, 10);
  const full = Math.floor(v);
  const half = v - full >= 0.5;

  const d = size === "sm" ? 8 : 10;
  const gap = size === "sm" ? 3 : 4;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap }}>
      {Array.from({ length: 10 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= full;
        const isHalf = idx === full + 1 && half;

        return (
          <View
            key={idx}
            style={[
              styles.ball,
              { width: d, height: d, borderRadius: d / 2 },
              filled && styles.ballOn,
              isHalf && styles.ballHalf,
            ]}
          >
            {isHalf ? <View style={styles.ballHalfFill} /> : null}
          </View>
        );
      })}
      <Text style={[styles.muted, { marginLeft: 8, fontWeight: "800" }]}>{v.toFixed(1)}/10</Text>
    </View>
  );
}

function StarBadge() {
  return (
    <View style={styles.badgeVisited}>
      <Text style={styles.badgeVisitedText}>★ Verified</Text>
    </View>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

function inRegion(loc: LocationItem, r: Region) {
  const latMin = r.latitude - r.latitudeDelta / 2;
  const latMax = r.latitude + r.latitudeDelta / 2;
  const lngMin = r.longitude - r.longitudeDelta / 2;
  const lngMax = r.longitude + r.longitudeDelta / 2;
  return loc.latitude >= latMin && loc.latitude <= latMax && loc.longitude >= lngMin && loc.longitude <= lngMax;
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

const Pin = React.memo(function Pin({
  loc,
  visited,
  onSelect,
}: {
  loc: LocationItemUI;
  visited: boolean;
  onSelect: (loc: LocationItemUI) => void;
}) {
  return (
    <Marker
      coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
      pinColor={visited ? "#C7FF2E" : undefined}
      onPress={() => onSelect(loc)}
      tracksViewChanges={false}
    />
  );
});

export default function MapScreen() {
	  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (mounted) setHasLocationPermission(status === "granted");
      } catch {
        if (mounted) setHasLocationPermission(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const mapRef = useRef<MapView | null>(null);
  const regionRef = useRef<Region | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const radiusTimer = useRef<any>(null);

  // IMPORTANT: We no longer block the map from rendering while waiting on GPS/API.
  // loading = "startup" (permissions + first paint)
  const [loading, setLoading] = useState(true);
  const [loadingPins, setLoadingPins] = useState(false);

  const [initialRegion, setInitialRegion] = useState<Region>({
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 18,
    longitudeDelta: 18,
  });

  const [regionTick, setRegionTick] = useState(0);

  const [radiusMiles, setRadiusMiles] = useState(25);
  const [q, setQ] = useState("");
  const [lastUserCoords, setLastUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [raw, setRaw] = useState<LocationItemUI[]>([]);
  const [selected, setSelected] = useState<LocationItemUI | null>(null);

  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const bottomPad = insets.bottom + 86;
  const topPad = insets.top + 8;

  const recenterTo = useCallback((r: Region) => {
    regionRef.current = r;
    mapRef.current?.animateToRegion(r, 350);
    setRegionTick((t) => t + 1);
  }, []);

  const computeDeltaFromZoom = (zoom?: number) => {
    const z = clamp(Number(zoom ?? 11), 6, 16);
    return z >= 14 ? 0.06 : z >= 13 ? 0.09 : z >= 12 ? 0.14 : z >= 11 ? 0.22 : z >= 10 ? 0.35 : 0.6;
  };

  async function fetchNearby(lat: number, lng: number, radius: number, alsoRecenter: boolean) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoadingPins(true);
    try {
      const url = apiUrl(
        `/api/v1/locations/nearby.php?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(
          radius
        )}`
      );
      const res = await fetch(url, { signal: ac.signal });
      const data = (await res.json()) as NearbyResponse;

      if (!data.ok) throw new Error(data.error || "Nearby search failed");

      const items = Array.isArray(data.locations) ? data.locations : [];

      // Precompute expensive derived props once per fetch
      const enhanced: LocationItemUI[] = items.map((l) => ({
        ...l,
        _totalCourts: totalCourts(l.courts),
        _openNow: isOpenNow(l),
      }));

      setRaw(enhanced);

      if (alsoRecenter && data.center?.lat && data.center?.lng) {
        const delta = computeDeltaFromZoom(data.center.zoom ?? 11);
        recenterTo({
          latitude: data.center.lat,
          longitude: data.center.lng,
          latitudeDelta: delta,
          longitudeDelta: delta,
        });
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      throw e;
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setLoadingPins(false);
    }
  }

  // STARTUP: render map ASAP, then hydrate with last-known + fresh GPS without blocking UI.
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Location needed", "Allow location so we can show courts near you.");
          setLoading(false);
          return;
        }

        // Map can render now (don't wait for GPS or API)
        setLoading(false);

        // 1) Try last known location first (usually instant)
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last?.coords?.latitude && last?.coords?.longitude) {
            const lat = last.coords.latitude;
            const lng = last.coords.longitude;

            setLastUserCoords({ lat, lng });

            const r: Region = {
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.25,
              longitudeDelta: 0.25,
            };
            setInitialRegion(r);
            regionRef.current = r;

            // Start pins load in background (no await)
            fetchNearby(lat, lng, radiusMiles, false).catch(() => {});
          }
        } catch {
          // ignore
        }

        // 2) Try to get a fresh fix, but time out so we never block UX
        try {
          const pos = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            8000,
            "Location taking too long"
          );

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLastUserCoords({ lat, lng });

          const r: Region = {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.25,
            longitudeDelta: 0.25,
          };

          // If map already rendered, animate; otherwise, set initial
          if (regionRef.current) recenterTo(r);
          else {
            setInitialRegion(r);
            regionRef.current = r;
          }

          fetchNearby(lat, lng, radiusMiles, false).catch(() => {});
        } catch {
          // If GPS is slow, user still sees the map.
          // Optionally: you could show a small banner/toast here.
        }
      } catch (e: any) {
        setLoading(false);
        Alert.alert("Error", e?.message ?? "Failed to load map.");
      }
    })();

    return () => {
      abortRef.current?.abort();
      clearTimeout(radiusTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const passes = (loc: LocationItemUI) => {
      const isVisited = Number(loc.visited ?? 0) === 1;

      if (filters.visitedOnly && !isVisited) return false;
      if (filters.openNowOnly && !Boolean(loc._openNow)) return false;

      if (filters.access !== "any") {
        const t = String(loc.access_type ?? "").toLowerCase();
        if (t !== filters.access) return false;
      }

      if (filters.courtType !== "any") {
        const indoor = Number(loc.courts?.indoor ?? 0);
        const outdoor = Number(loc.courts?.outdoor ?? 0);
        if (filters.courtType === "indoor" && indoor <= 0) return false;
        if (filters.courtType === "outdoor" && outdoor <= 0) return false;
      }

      if (filters.courtsBucket !== "any") {
        const t = Number(loc._totalCourts ?? totalCourts(loc.courts));
        if (filters.courtsBucket === "1-2" && !(t >= 1 && t <= 2)) return false;
        if (filters.courtsBucket === "3-5" && !(t >= 3 && t <= 5)) return false;
        if (filters.courtsBucket === "6-9" && !(t >= 6 && t <= 9)) return false;
        if (filters.courtsBucket === "10+" && !(t >= 10)) return false;
      }

      return true;
    };

    const list = raw.filter(passes);

    const sortKey = filters.sortBy;
    const sortFn = (a: LocationItemUI, b: LocationItemUI) => {
      if (sortKey === "distance") {
        const da = typeof a.distance_mi === "number" ? a.distance_mi : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_mi === "number" ? b.distance_mi : Number.POSITIVE_INFINITY;
        return da - db;
      }
      if (sortKey === "rating") {
        const ra = a.rating_overall === null || a.rating_overall === undefined ? -1 : Number(a.rating_overall);
        const rb = b.rating_overall === null || b.rating_overall === undefined ? -1 : Number(b.rating_overall);
        return rb - ra;
      }
      const ca = Number(a._totalCourts ?? totalCourts(a.courts));
      const cb = Number(b._totalCourts ?? totalCourts(b.courts));
      return cb - ca;
    };

    const visited = list.filter((l) => Number(l.visited ?? 0) === 1).sort(sortFn);
    const notVisited = list.filter((l) => Number(l.visited ?? 0) !== 1).sort(sortFn);
    return [...visited, ...notVisited];
  }, [raw, filters]);

  const visiblePins = useMemo(() => {
    const r = regionRef.current;
    if (!r) return filtered.slice(0, 250);

    const zoomedOut = r.latitudeDelta > 3 || r.longitudeDelta > 3;
    const cap = zoomedOut ? 250 : 500;

    return filtered.filter((l) => inRegion(l, r)).slice(0, cap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, regionTick]);

  function onPressNearMe() {
    if (!lastUserCoords) {
      Alert.alert("Location", "We don’t have your location yet. Try again in a moment.");
      return;
    }

    const r: Region = {
      latitude: lastUserCoords.lat,
      longitude: lastUserCoords.lng,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    };
    recenterTo(r);

    fetchNearby(lastUserCoords.lat, lastUserCoords.lng, radiusMiles, false).catch((e) =>
      Alert.alert("Error", e?.message ?? "Failed")
    );
  }

  function onRadiusChange(delta: number) {
    const next = clamp(radiusMiles + delta, 5, 200);
    setRadiusMiles(next);

    if (!lastUserCoords) return;

    clearTimeout(radiusTimer.current);
    radiusTimer.current = setTimeout(() => {
      fetchNearby(lastUserCoords.lat, lastUserCoords.lng, next, false).catch(() => {});
    }, 250);
  }

  function activeFiltersLabel() {
    const parts: string[] = [];
    if (filters.access !== "any") parts.push(filters.access === "public" ? "Free/Public" : "Membership/Paid");
    if (filters.courtType !== "any") parts.push(filters.courtType === "indoor" ? "Indoor" : "Outdoor");
    if (filters.courtsBucket !== "any") parts.push(`Courts: ${filters.courtsBucket}`);
    if (filters.openNowOnly) parts.push("Open now");
    if (filters.visitedOnly) parts.push("Verified only");
    if (filters.skillLevels?.length) {
      const nice = filters.skillLevels.map((k) => SKILL_LABELS[k] || k).join(", ");
      parts.push(`Skill: ${nice}`);
    }
    if (filters.sortBy !== "distance") parts.push(`Sort: ${filters.sortBy === "rating" ? "Rating" : "Courts"}`);
    return parts.join(" • ");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.7)" />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search (optional for later)"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.searchInput}
            />
          </View>

          <Pressable style={styles.iconBtn} onPress={() => setFiltersOpen(true)}>
            <Ionicons name="options-outline" size={20} color="white" />
            <Text style={styles.iconBtnText}>Filters</Text>
          </Pressable>

          <Pressable style={styles.iconBtn} onPress={() => setViewMode((m) => (m === "map" ? "list" : "map"))}>
            <Ionicons name={viewMode === "map" ? "list-outline" : "map-outline"} size={20} color="white" />
            <Text style={styles.iconBtnText}>{viewMode === "map" ? "List" : "Map"}</Text>
          </Pressable>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.pillBtn} onPress={onPressNearMe}>
            <Ionicons name="locate-outline" size={18} color="white" />
            <Text style={styles.pillBtnText}>Near me</Text>
          </Pressable>

          <View style={styles.radiusRow}>
            <Pressable style={styles.radiusBtn} onPress={() => onRadiusChange(-5)}>
              <Text style={styles.radiusBtnText}>−</Text>
            </Pressable>
            <Pill text={`Radius ${radiusMiles} mi`} />
            <Pressable style={styles.radiusBtn} onPress={() => onRadiusChange(+5)}>
              <Text style={styles.radiusBtnText}>+</Text>
            </Pressable>
          </View>

          {loadingPins ? <ActivityIndicator style={{ marginLeft: 6 }} /> : <Pill text={`${filtered.length} shown`} />}
          {viewMode === "map" ? <Pill text={`${visiblePins.length} pins`} /> : null}
        </View>

        {!!activeFiltersLabel() && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersText}>{activeFiltersLabel()}</Text>
          </View>
        )}
      </View>

      {/* MAP/LIST AREA */}
      {viewMode === "map" ? (
        <View style={styles.mapWrap}>
          {/* Render the map immediately; never block on GPS/API */}
          <MapView
            ref={(r) => {
              mapRef.current = r;
            }}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            initialRegion={initialRegion}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={Platform.OS === "android" && hasLocationPermission}
            showsCompass
            onRegionChangeComplete={(r) => {
              regionRef.current = r;
              setRegionTick((t) => t + 1);
            }}
          >
            {lastUserCoords ? (
              <Circle
                center={{ latitude: lastUserCoords.lat, longitude: lastUserCoords.lng }}
                radius={radiusMiles * 1609.34}
                strokeWidth={2}
                strokeColor="rgba(199,255,46,0.65)"
                fillColor="rgba(199,255,46,0.12)"
              />
            ) : null}
            {visiblePins.map((loc) => {
              const visited = Number(loc.visited ?? 0) === 1;
              return <Pin key={loc.id} loc={loc} visited={visited} onSelect={setSelected} />;
            })}
          </MapView>

          {/* Overlay while we’re still in "startup" (permissions) */}
          {loading ? (
            <View style={styles.overlay}>
              <ActivityIndicator />
              <Text style={styles.overlayText}>Starting…</Text>
            </View>
          ) : null}

          {/* Overlay while pins are loading */}
          {loadingPins ? (
            <View style={[styles.overlay, { top: 12, bottom: undefined, alignItems: "flex-start" }]}>
              <View style={styles.overlayPill}>
                <ActivityIndicator />
                <Text style={styles.overlayPillText}>Loading locations…</Text>
              </View>
            </View>
          ) : null}

          <View style={{ height: bottomPad }} pointerEvents="none" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: bottomPad }}
          renderItem={({ item }) => <ResultCard item={item} onPress={() => setSelected(item)} />}
          ListEmptyComponent={<Text style={styles.empty}>No locations match your filters.</Text>}
          removeClippedSubviews
          windowSize={7}
          initialNumToRender={10}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* DETAILS MODAL */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.modalSafe} edges={["top", "left", "right"]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top ? 8 : 12 }]}>
            <Pressable onPress={() => setSelected(null)} style={styles.modalClose}>
              <Ionicons name="chevron-down" size={22} color="white" />
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>

          {selected ? (
            <DetailsPanel
              loc={selected}
              onOpenBlog={() => {
                const slug = selected.blog?.slug ? String(selected.blog.slug) : "";
                if (slug) {
                  try {
                    router.push(`/blog/${slug}` as any);
                    return;
                  } catch {}
                }
                const u = selected.blog?.url ? String(selected.blog.url) : "";
                if (u) Linking.openURL(u);
                else Alert.alert("Blog", "No blog article link available.");
              }}
              onOpenYouTube={() => {
                const u = selected.youtube_url ? String(selected.youtube_url) : "";
                if (u) Linking.openURL(u);
                else Alert.alert("YouTube", "No YouTube link available.");
              }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* FILTERS MODAL */}
      <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={["top", "left", "right"]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top ? 8 : 12 }]}>
            <Pressable onPress={() => setFiltersOpen(false)} style={styles.modalClose}>
              <Ionicons name="chevron-down" size={22} color="white" />
              <Text style={styles.modalCloseText}>Filters</Text>
            </Pressable>

            <Pressable onPress={() => setFilters(DEFAULT_FILTERS)} style={[styles.pillBtn, { marginLeft: "auto" }]}>
              <Text style={styles.pillBtnText}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            <FilterRow
              label="Access"
              value={filters.access === "any" ? "All" : filters.access === "public" ? "Free/Public" : "Membership/Paid"}
              onPress={() =>
                setFilters((f) => ({
                  ...f,
                  access: f.access === "any" ? "public" : f.access === "public" ? "paid" : "any",
                }))
              }
              hint="Tap to cycle"
            />

            <FilterRow
              label="Court type"
              value={filters.courtType === "any" ? "Any" : filters.courtType === "indoor" ? "Indoor" : "Outdoor"}
              onPress={() =>
                setFilters((f) => ({
                  ...f,
                  courtType: f.courtType === "any" ? "indoor" : f.courtType === "indoor" ? "outdoor" : "any",
                }))
              }
              hint="Tap to cycle"
            />

            <FilterRow
              label="Court count"
              value={filters.courtsBucket === "any" ? "Any" : filters.courtsBucket}
              onPress={() =>
                setFilters((f) => ({
                  ...f,
                  courtsBucket:
                    f.courtsBucket === "any"
                      ? "1-2"
                      : f.courtsBucket === "1-2"
                      ? "3-5"
                      : f.courtsBucket === "3-5"
                      ? "6-9"
                      : f.courtsBucket === "6-9"
                      ? "10+"
                      : "any",
                }))
              }
              hint="Tap to cycle"
            />

            <ToggleRow
              label="Open now"
              value={filters.openNowOnly}
              onToggle={() => setFilters((f) => ({ ...f, openNowOnly: !f.openNowOnly }))}
            />
            <ToggleRow
              label="Verified only"
              value={filters.visitedOnly}
              onToggle={() => setFilters((f) => ({ ...f, visitedOnly: !f.visitedOnly }))}
            />


            <Text style={[styles.filterSectionTitle, { marginTop: 10 }]}>Skill level</Text>
            {(["beginner", "intermediate", "adv_intermediate", "advanced", "pro"] as const).map((k) => (
              <ToggleRow
                key={k}
                label={SKILL_LABELS[k]}
                value={filters.skillLevels.includes(k)}
                onToggle={() =>
                  setFilters((f) => ({
                    ...f,
                    skillLevels: f.skillLevels.includes(k)
                      ? f.skillLevels.filter((x) => x !== k)
                      : [...f.skillLevels, k],
                  }))
                }
              />
            ))}

            <FilterRow
              label="Sort by"
              value={filters.sortBy === "distance" ? "Distance" : filters.sortBy === "rating" ? "Rating" : "Courts"}
              onPress={() =>
                setFilters((f) => ({
                  ...f,
                  sortBy: f.sortBy === "distance" ? "rating" : f.sortBy === "rating" ? "courts" : "distance",
                }))
              }
              hint="Tap to cycle"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ResultCard({ item, onPress }: { item: LocationItemUI; onPress: () => void }) {
  const visited = Number(item.visited ?? 0) === 1;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {visited ? <StarBadge /> : null}
      </View>

      <Text style={styles.cardMeta}>
        {item.city ? `${item.city}${item.state ? `, ${item.state}` : ""}` : "—"}
        {typeof item.distance_mi === "number" ? ` • ${item.distance_mi.toFixed(1)} mi` : ""}
      </Text>

      <View style={{ marginTop: 10 }}>
        <Text style={styles.cardMetaStrong}>Overall</Text>
        <RatingBalls value={item.rating_overall ?? null} />
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.cardMetaStrong}>Courts:</Text>
        <Text style={styles.cardMeta}>{courtsText(item.courts)}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.cardMetaStrong}>Access:</Text>
        <Text style={styles.cardMeta}>{accessText(item.access_type)}</Text>
      
{(() => {
  const s = skillLevelsText(item);
  return s ? <Text style={[styles.cardMeta, { marginTop: 6 }]}>Skill: {s}</Text> : null;
})()}

</View>

      {item.summary ? <Text style={[styles.cardMeta, { marginTop: 8 }]}>{item.summary}</Text> : null}
    </Pressable>
  );
}

function DetailsPanel({
  loc,
  onOpenBlog,
  onOpenYouTube,
}: {
  loc: LocationItemUI;
  onOpenBlog: () => void;
  onOpenYouTube: () => void;
}) {
  const visited = Number(loc.visited ?? 0) === 1;
  const website = normalizeWebsite(loc.website_url);
  const phoneRaw = String(loc.phone ?? "").trim();
  const phoneDial = cleanPhoneDigits(phoneRaw);
  const email = String(loc.email ?? "").trim();
  const ratings = loc.ratings ?? {};
  const h = loc.hours ?? null;

  const tz = String(h?.tz ?? "").trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = getNowPartsInTZ(tz);
  const todayKey = now?.dayKey || null;

  // Recompute so it stays accurate even if app sits open
  const openNow = isOpenNow(loc);

  const addr = [loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(", ");

  const days: Array<[keyof Hours, string]> = [
    ["mon", "Mon"],
    ["tue", "Tue"],
    ["wed", "Wed"],
    ["thu", "Thu"],
    ["fri", "Fri"],
    ["sat", "Sat"],
    ["sun", "Sun"],
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      <View style={styles.detailsTop}>
        <Text style={styles.detailsTitle}>{loc.name}</Text>
        {visited ? <StarBadge /> : null}
      </View>

      <Text style={styles.detailsMuted}>{addr || "—"}</Text>

      <View style={[styles.detailsBlock, { marginTop: 12 }]}>
        <View style={styles.openRow}>
          <View style={[styles.openPill, openNow ? styles.openPillOn : styles.openPillOff]}>
            <Text style={[styles.openPillText, openNow ? styles.openPillTextOn : styles.openPillTextOff]}>
              {openNow ? "Open now" : "Closed now"}
            </Text>
          </View>
          {h?.tz ? <Text style={styles.smallMuted}>Times in {String(h.tz)}</Text> : null}
        </View>

        <Text style={[styles.detailsBlockTitle, { marginTop: 10 }]}>Overall rating</Text>
        <RatingBalls value={loc.rating_overall ?? null} />

        <View style={{ marginTop: 10 }}>
          <Text style={styles.detailsLine}>Courts: {courtsText(loc.courts)}</Text>
{(() => {
  const s = skillLevelsText(loc);
  return s ? <Text style={styles.detailsLine}>Skill: {s}</Text> : null;
})()}
          <Text style={styles.detailsLine}>Access: {accessText(loc.access_type)}</Text>
          {loc.summary ? <Text style={[styles.detailsLine, { marginTop: 8 }]}>{loc.summary}</Text> : null}
        </View>

        {(() => {
  const hasBlog = !!(loc.blog?.slug || loc.blog?.url);
  const hasYouTube = !!String(loc.youtube_url ?? "").trim();

  if (!hasBlog && !hasYouTube) return null;

  return (
    <View style={styles.ctaRow}>
      {hasBlog ? (
        <Pressable style={styles.ctaPrimary} onPress={onOpenBlog}>
          <Ionicons name="newspaper-outline" size={18} color="#071018" />
          <Text style={styles.ctaPrimaryText}>Read article</Text>
        </Pressable>
      ) : null}

      {hasYouTube ? (
        <Pressable style={styles.ctaYouTube} onPress={onOpenYouTube}>
          <Ionicons name="logo-youtube" size={18} color="white" />
          <Text style={styles.ctaYouTubeText}>Watch YouTube</Text>
        </Pressable>
      ) : null}
    </View>
  );
})()}
</View>

      <View style={styles.detailsBlock}>
        <Text style={styles.detailsBlockTitle}>Contact</Text>

        {website ? (
          <Pressable style={styles.linkRow} onPress={() => Linking.openURL(website)}>
            <Ionicons name="globe-outline" size={18} color="white" />
            <Text style={styles.linkText}>{website.replace(/^https?:\/\//i, "")}</Text>
          </Pressable>
        ) : null}

        {phoneRaw ? (
          <Pressable style={styles.linkRow} onPress={() => (phoneDial ? Linking.openURL(`tel:${phoneDial}`) : null)}>
            <Ionicons name="call-outline" size={18} color="white" />
            <Text style={styles.linkText}>{phoneRaw}</Text>
          </Pressable>
        ) : null}

        {email ? (
          <Pressable style={styles.linkRow} onPress={() => Linking.openURL(`mailto:${email}`)}>
            <Ionicons name="mail-outline" size={18} color="white" />
            <Text style={styles.linkText}>{email}</Text>
          </Pressable>
        ) : null}

        {!website && !phoneRaw && !email ? <Text style={styles.detailsMuted}>No contact info.</Text> : null}
      </View>

      {h ? (
        <View style={styles.detailsBlock}>
          <Text style={styles.detailsBlockTitle}>Hours</Text>
          {days.map(([k, label]) => {
            const d = (h as any)[k] as HoursDay | undefined;
            const open = String(d?.open ?? "").trim();
            const close = String(d?.close ?? "").trim();
            let txt = "Closed";
            if (open && close) txt = `${formatTime(open)} – ${formatTime(close)}`;
            else if (open && !close) txt = `${formatTime(open)} – ?`;
            else if (!open && close) txt = `? – ${formatTime(close)}`;

            const isToday = todayKey && String(k) === todayKey;
            return (
              <View key={String(k)} style={[styles.hoursRow, isToday && styles.hoursRowToday]}>
                <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>{label}</Text>
                <Text style={[styles.hoursTime, isToday && styles.hoursTimeToday]}>{txt}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.detailsBlock}>
        <Text style={styles.detailsBlockTitle}>Rating details</Text>

        <SubRating label="Court" value={ratings.court ?? null} />
        <SubRating label="Facility" value={ratings.facility ?? null} />
        <SubRating label="Amenities" value={ratings.amenities ?? null} />
        <SubRating label="Location" value={ratings.location ?? null} />
        <SubRating label="Gameplay" value={ratings.gameplay ?? null} />
        <SubRating label="Vibe" value={ratings.vibe ?? null} />
      </View>
    </ScrollView>
  );
}

function SubRating({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={styles.subRatingRow}>
      <Text style={styles.subRatingLabel}>{label}</Text>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <RatingBalls value={value} size="sm" />
      </View>
    </View>
  );
}

function FilterRow({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.filterRow} onPress={onPress}>
      <View>
        <Text style={styles.filterLabel}>{label}</Text>
        {hint ? <Text style={styles.filterHint}>{hint}</Text> : null}
      </View>
      <View style={styles.filterRight}>
        <Text style={styles.filterValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.75)" />
      </View>
    </Pressable>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.filterRow} onPress={onToggle}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0f14" },

  topBar: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#0b0f14",
  },

  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },

  searchBox: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, color: "white" },

  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  iconBtnText: { marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "800" },

  actionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" },

  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  pillBtnText: { color: "white", fontWeight: "900" },

  radiusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  radiusBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  radiusBtnText: { color: "white", fontWeight: "900", fontSize: 18 },

  pill: {
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { color: "rgba(255,255,255,0.85)", fontWeight: "800", fontSize: 12 },

  activeFilters: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  activeFiltersText: { color: "rgba(255,255,255,0.75)", fontWeight: "700", fontSize: 12 },

  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "rgba(255,255,255,0.7)", fontWeight: "700" },

  mapWrap: { flex: 1 },

  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900", flex: 1 },
  cardMeta: { marginTop: 4, color: "rgba(255,255,255,0.70)", fontWeight: "650" },
  cardMetaStrong: { color: "rgba(255,255,255,0.90)", fontWeight: "900" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" },
  dot: { color: "rgba(255,255,255,0.35)", marginHorizontal: 2 },

  badgeVisited: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    backgroundColor: "rgba(199,255,46,0.92)",
  },
  badgeVisitedText: { color: "#071018", fontWeight: "950", fontSize: 12 },

  empty: { color: "rgba(255,255,255,0.65)", padding: 14 },

  modalSafe: { flex: 1, backgroundColor: "#0b0f14" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  modalClose: { flexDirection: "row", alignItems: "center", gap: 6 },
  modalCloseText: { color: "white", fontWeight: "900", fontSize: 14 },

  detailsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  detailsTitle: { color: "white", fontSize: 20, fontWeight: "950", flex: 1 },
  detailsMuted: { color: "rgba(255,255,255,0.65)", marginTop: 6, fontWeight: "650" },

  detailsBlock: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  detailsBlockTitle: { color: "white", fontWeight: "950", marginBottom: 10, fontSize: 14 },
  detailsLine: { color: "rgba(255,255,255,0.80)", fontWeight: "650", marginTop: 2, lineHeight: 19 },

  openRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  openPill: { paddingHorizontal: 10, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  openPillOn: { backgroundColor: "rgba(199,255,46,0.18)", borderColor: "rgba(199,255,46,0.40)" },
  openPillOff: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" },
  openPillText: { fontWeight: "950", fontSize: 12 },
  openPillTextOn: { color: "rgba(199,255,46,0.98)" },
  openPillTextOff: { color: "rgba(255,255,255,0.75)" },

  ctaRow: { flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" },
  ctaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(199,255,46,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
  },
  ctaPrimaryText: { color: "#071018", fontWeight: "950" },

  ctaYouTube: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,0,0,0.70)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  ctaYouTubeText: { color: "white", fontWeight: "950" },

  linkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  linkText: { color: "rgba(199,255,46,0.95)", fontWeight: "850" },

  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  hoursRowToday: { backgroundColor: "rgba(199,255,46,0.08)", borderRadius: 10, paddingHorizontal: 10 },
  hoursDay: { color: "rgba(255,255,255,0.80)", fontWeight: "900" },
  hoursDayToday: { color: "rgba(199,255,46,0.95)" },
  hoursTime: { color: "rgba(255,255,255,0.70)", fontWeight: "650" },
  hoursTimeToday: { color: "rgba(255,255,255,0.85)" },

  subRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  subRatingLabel: { color: "rgba(255,255,255,0.85)", fontWeight: "900", width: 92 },

  ball: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  ballOn: { backgroundColor: "rgba(199,255,46,0.92)", borderColor: "rgba(0,0,0,0.18)" },
  ballHalf: { backgroundColor: "rgba(255,255,255,0.06)" },
  ballHalfFill: { position: "absolute", left: 0, top: 0, bottom: 0, width: "50%", backgroundColor: "rgba(199,255,46,0.92)" },

  muted: { color: "rgba(255,255,255,0.60)", fontWeight: "700" },
  smallMuted: { color: "rgba(255,255,255,0.55)", fontWeight: "700" },

  filterRow: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  filterLabel: { color: "white", fontWeight: "950", fontSize: 14 },
  filterHint: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontWeight: "650", fontSize: 12 },
  filterRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterValue: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },

  switch: {
    width: 54,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 3,
    justifyContent: "center",
  },
  switchOn: { backgroundColor: "rgba(199,255,46,0.18)", borderColor: "rgba(199,255,46,0.30)" },
  switchKnob: { width: 24, height: 24, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.70)", transform: [{ translateX: 0 }] },
  switchKnobOn: { backgroundColor: "rgba(199,255,46,0.95)", transform: [{ translateX: 22 }] },
});