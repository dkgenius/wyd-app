/**
 * Brand typography primitives.
 *
 * Use these instead of <Text> with inline fontFamily/fontWeight everywhere.
 * They map directly to the public site's display rhythm.
 *
 *   <Display>HUGE BEBAS HEADLINE</Display>      // hero title
 *   <Display size="lg">Section h2</Display>     // smaller display
 *   <Title>Screen title</Title>                  // 24px, DM Sans 800
 *   <Subtitle>Section heading</Subtitle>         // 18px, DM Sans 700
 *   <Body>Paragraph copy</Body>                  // 16px, DM Sans
 *   <Muted>Helper / meta text</Muted>            // 14px muted DM Sans
 *   <Eyebrow>SECTION LABEL</Eyebrow>             // 11px uppercase ball-green
 *
 * Each accepts standard <Text> props (style, numberOfLines, etc.).
 *
 * Font scaling policy:
 *   The OS text-size / accessibility setting scales BOTH font size and line
 *   height on iOS. On a device with a larger text size that silently changes
 *   how headlines wrap and how loosely lines are spaced — and it diverges
 *   from Android, which uses a different scale. To keep the brand layout
 *   identical across devices and platforms:
 *     - Display / Title / Subtitle / Eyebrow are design-critical → no scaling.
 *     - Body / Muted still scale (for readability) but are capped so a large
 *       accessibility setting can't blow the layout apart.
 *   Callers can override per-instance by passing allowFontScaling explicitly.
 */

import { Text, TextProps, TextStyle } from "react-native";
import { Colors, Fonts, TypeScale } from "@/constants/theme";

type DisplaySize = "xl" | "lg" | "md";
type FontWeightTier = "regular" | "medium" | "semibold" | "bold" | "extrabold";

const BODY_MAX_SCALE = 1.3;

interface BaseProps extends TextProps {
  color?: string;
}

interface DisplayProps extends BaseProps {
  size?: DisplaySize;
}

interface BodyProps extends BaseProps {
  weight?: FontWeightTier;
  size?: "default" | "small";
}

/* ───────── Display ─────────
 * Bebas Neue. Three sizes. Use sparingly — these are screen-defining.
 */
export function Display({ size = "lg", color, style, children, ...rest }: DisplayProps) {
  const sizes: Record<DisplaySize, number> = {
    xl: TypeScale.display1,
    lg: TypeScale.display2,
    md: TypeScale.display3,
  };
  const baseStyle: TextStyle = {
    fontFamily: Fonts.display,
    fontSize: sizes[size],
    // Tight, compressed line spacing — matches the original brand rhythm so
    // multi-line headlines sit close together (no big black gaps between
    // lines). This is the gap BETWEEN lines and is kept deliberately small.
    lineHeight: Math.round(sizes[size] * 0.95),
    letterSpacing: 1.4,
    color: color ?? Colors.text,
    // At this tight lineHeight, iOS would clip the tops of Bebas Neue's tall
    // caps on the first line. A small top inset gives the ascenders room
    // WITHOUT loosening the spacing between lines. Kept minimal so the
    // headline still sits tight to whatever is above it. includeFontPadding:
    // false removes Android's extra built-in padding so both platforms match.
    includeFontPadding: false,
    paddingTop: Math.round(sizes[size] * 0.08),
  };
  return (
    <Text allowFontScaling={false} style={[baseStyle, style]} {...rest}>
      {children}
    </Text>
  );
}

/* ───────── Title ─────────
 * 24px DM Sans ExtraBold. Standard screen-level title (not display).
 */
export function Title({ color, style, children, ...rest }: BaseProps) {
  const baseStyle: TextStyle = {
    fontFamily: Fonts.body.extrabold,
    fontSize: TypeScale.title,
    lineHeight: 27,
    letterSpacing: -0.3,
    color: color ?? Colors.text,
  };
  return (
    <Text allowFontScaling={false} style={[baseStyle, style]} {...rest}>
      {children}
    </Text>
  );
}

/* ───────── Subtitle ─────────
 * 18px DM Sans Bold. Section headings, card titles.
 */
export function Subtitle({ color, style, children, ...rest }: BaseProps) {
  const baseStyle: TextStyle = {
    fontFamily: Fonts.body.bold,
    fontSize: TypeScale.subtitle,
    lineHeight: 22,
    color: color ?? Colors.text,
  };
  return (
    <Text allowFontScaling={false} style={[baseStyle, style]} {...rest}>
      {children}
    </Text>
  );
}

/* ───────── Body ─────────
 * 16px DM Sans Regular by default. Weight tier configurable.
 */
export function Body({
  weight = "regular",
  size = "default",
  color,
  style,
  children,
  ...rest
}: BodyProps) {
  const baseStyle: TextStyle = {
    fontFamily: Fonts.body[weight],
    fontSize: size === "small" ? TypeScale.bodySm : TypeScale.body,
    lineHeight: size === "small" ? 18 : 21,
    color: color ?? Colors.text,
  };
  return (
    <Text maxFontSizeMultiplier={BODY_MAX_SCALE} style={[baseStyle, style]} {...rest}>
      {children}
    </Text>
  );
}

/* ───────── Muted ─────────
 * 14px DM Sans Medium, muted color. Helper text, captions, metadata.
 */
export function Muted({ color, style, children, ...rest }: BaseProps) {
  const baseStyle: TextStyle = {
    fontFamily: Fonts.body.medium,
    fontSize: TypeScale.bodySm,
    lineHeight: 18,
    color: color ?? Colors.muted,
  };
  return (
    <Text maxFontSizeMultiplier={BODY_MAX_SCALE} style={[baseStyle, style]} {...rest}>
      {children}
    </Text>
  );
}

/* ───────── Eyebrow ─────────
 * Small uppercase ball-green label. Above hero headlines and section starts.
 */
export function Eyebrow({ color, style, children, ...rest }: BaseProps) {
  const baseStyle: TextStyle = {
    fontFamily: Fonts.body.bold,
    fontSize: TypeScale.micro,
    lineHeight: 14,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: color ?? Colors.ball,
  };
  return (
    <Text allowFontScaling={false} style={[baseStyle, style]} {...rest}>
      {children}
    </Text>
  );
}
