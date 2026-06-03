/**
 * Section — wraps a content block with a title row + body. Mirrors the site's
 * .section-header layout (title on left, optional link on right).
 *
 *   <Section title="Nearby Reviews" onSeeAll={() => router.push("/blog")}>
 *     ...
 *   </Section>
 */

import React from "react";
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Display, Muted, Subtitle } from "./typography";
import { Colors, Spacing, TypeScale } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

interface SectionProps {
  children: React.ReactNode;

  /** Small uppercase label above the title, like the site's eyebrow */
  eyebrow?: string;

  /** Main title — either short text (uses Subtitle) or Display sizes */
  title?: string;
  display?: boolean;

  /** "See all →" link on the right side of the header row */
  onSeeAll?: () => void;
  seeAllLabel?: string;

  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
}

export function Section({
  children,
  eyebrow,
  title,
  display,
  onSeeAll,
  seeAllLabel = "See all",
  style,
  headerStyle,
}: SectionProps) {
  return (
    <View style={[styles.wrap, style]}>
      {(eyebrow || title) && (
        <View style={[styles.header, headerStyle]}>
          <View style={{ flex: 1 }}>
            {eyebrow ? (
              <Muted
                style={{
                  color: Colors.ball,
                  fontSize: TypeScale.micro,
                  letterSpacing: 2.4,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {eyebrow}
              </Muted>
            ) : null}

            {title ? (
              display ? (
                <Display size="md">{title.toUpperCase()}</Display>
              ) : (
                <Subtitle>{title}</Subtitle>
              )
            ) : null}
          </View>

          {onSeeAll ? (
            <Pressable
              onPress={onSeeAll}
              style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Muted style={styles.seeAllLabel}>{seeAllLabel}</Muted>
              <Ionicons name="arrow-forward" size={14} color={Colors.muted} />
            </Pressable>
          ) : null}
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.xxl },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  seeAllLabel: {
    fontSize: TypeScale.caption,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});
