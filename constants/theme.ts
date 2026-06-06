/**
 * WhatYouDink brand tokens — single source of truth.
 *
 * Mirrors the public site (Bebas Neue display + DM Sans body, dark near-black bg,
 * ball-green accent, terra orange secondary) so the app feels native to the brand.
 *
 * Import like:
 *   import { Colors, Fonts, Spacing, Radius, Shadow } from "@/constants/theme";
 *
 * Note: This file intentionally exports a flat token set instead of a light/dark
 * scheme — the app is brand-dark only, matching the site. If you ever ship a
 * light theme, branch the Colors export into { dark, light } variants and consume
 * via useColorScheme().
 */

import { Platform } from "react-native";

/* ───────── Colors ───────── */
export const Colors = {
  // Surfaces
  bg: "#080808",
  surface: "#111111",
  surface2: "#1a1a1a",
  card: "rgba(255,255,255,0.04)",

  // Borders
  border: "rgba(235,235,235,0.07)",
  borderUp: "rgba(235,235,235,0.18)",

  // Text
  text: "#EBEBEB",
  muted: "rgba(235,235,235,0.55)",
  muted2: "rgba(235,235,235,0.28)",

  // Accent: brand ball green
  ball: "#C7FF2E",
  ballHover: "#d8ff5b",
  ballDim: "rgba(199,255,46,0.14)",
  ballSoft: "rgba(199,255,46,0.34)",

  // Secondary: terra (for destructive / accent contrast)
  terra: "#DC5B1E",
  terraDim: "rgba(220,91,30,0.18)",

  // YouTube red (used on the site for the play CTA)
  youtube: "#FF0000",

  // On-ball text (when text sits on a ball-green surface)
  onBall: "#080808",
} as const;

/* ───────── Fonts ───────── */
/**
 * Font family names match what useFonts() in _layout.tsx loads.
 * Bebas Neue is display-only (huge titles); DM Sans is the workhorse.
 */
export const Fonts = {
  display: "BebasNeue_400Regular",
  body: {
    regular: "DMSans_400Regular",
    medium: "DMSans_500Medium",
    semibold: "DMSans_600SemiBold",
    bold: "DMSans_700Bold",
    extrabold: "DMSans_800ExtraBold",
  },
  // Fallback for code blocks / numeric runs
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }) as string,
} as const;

/* ───────── Type scale ─────────
 * Matches the public site's display rhythm. clamp()-style on web translates to
 * fixed sizes here — sized for phone screens (375–428pt typical).
 */
export const TypeScale = {
  display1: 66, // hero h1 — Bebas Neue
  display2: 52, // section h2 — Bebas Neue
  display3: 38, // sub-section / card display — Bebas Neue
  title: 22, // screen title — DM Sans 800
  subtitle: 17, // section title — DM Sans 700
  body: 15,
  bodySm: 13,
  caption: 11,
  micro: 11, // eyebrow / uppercase labels
} as const;

/* ───────── Spacing ───────── */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  screenPadH: 20, // mirrors site's mobile gutter
} as const;

/* ───────── Radius ───────── */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/* ───────── Shadow ───────── */
export const Shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 6,
  },
  ball: {
    shadowColor: Colors.ball,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
} as const;

/* ───────── Typography helpers ─────────
 * Common composed styles you'd repeat 10× across screens. Use these via
 * StyleSheet.create or the Typography components in /components/ui/.
 */
export const Type = {
  display: {
    fontFamily: Fonts.display,
    letterSpacing: 1.2, // Bebas needs a bit of breathing room at large sizes
    color: Colors.text,
    lineHeight: undefined as number | undefined,
  },
  title: {
    fontFamily: Fonts.body.extrabold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    fontSize: TypeScale.body,
    lineHeight: 24,
  },
  muted: {
    fontFamily: Fonts.body.medium,
    color: Colors.muted,
    fontSize: TypeScale.bodySm,
  },
  eyebrow: {
    fontFamily: Fonts.body.bold,
    color: Colors.ball,
    fontSize: TypeScale.micro,
    letterSpacing: 2.4,
    textTransform: "uppercase" as const,
  },
} as const;

/* ───────── Theme bundle export (for consumers wanting one thing) ───────── */
export const Theme = {
  Colors,
  Fonts,
  TypeScale,
  Spacing,
  Radius,
  Shadow,
  Type,
} as const;

export default Theme;
