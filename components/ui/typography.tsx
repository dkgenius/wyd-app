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
 */

import { Text, TextProps, TextStyle } from "react-native";
import { Colors, Fonts, TypeScale } from "@/constants/theme";

type DisplaySize = "xl" | "lg" | "md";
type FontWeightTier = "regular" | "medium" | "semibold" | "bold" | "extrabold";

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
    // Bebas Neue has very tall caps. iOS (unlike Android) has no
    // includeFontPadding, so any lineHeight near or below the font's natural
    // line box clips the glyph tops. ~1.2x clears the ascenders on both
    // platforms. Don't override this lower in screen styles or it clips again.
    lineHeight: Math.round(sizes[size] * 1.2),
    letterSpacing: 1.4,
    color: color ?? Colors.text,
  };
  return (
    <Text style={[baseStyle, style]} {...rest}>
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
    lineHeight: 30,
    letterSpacing: -0.3,
    color: color ?? Colors.text,
  };
  return (
    <Text style={[baseStyle, style]} {...rest}>
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
    lineHeight: 24,
    color: color ?? Colors.text,
  };
  return (
    <Text style={[baseStyle, style]} {...rest}>
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
    lineHeight: size === "small" ? 20 : 24,
    color: color ?? Colors.text,
  };
  return (
    <Text style={[baseStyle, style]} {...rest}>
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
    lineHeight: 20,
    color: color ?? Colors.muted,
  };
  return (
    <Text style={[baseStyle, style]} {...rest}>
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
    <Text style={[baseStyle, style]} {...rest}>
      {children}
    </Text>
  );
}
