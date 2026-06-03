/**
 * Card — the base surface used for review cards, list items, etc.
 *
 *   <Card>...</Card>
 *   <Card pressable onPress={...}>...</Card>
 *   <Card variant="raised">...</Card>
 *
 * The site's review card pattern: tall image, padded body, no inner shadow.
 * We replicate that with a flat surface + subtle border.
 */

import React from "react";
import { Pressable, View, ViewStyle, StyleProp, StyleSheet } from "react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

type Variant = "flat" | "raised";

interface CardProps {
  children: React.ReactNode;
  variant?: Variant;
  pressable?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = "flat",
  pressable,
  onPress,
  style,
}: CardProps) {
  const variantStyle = variant === "raised" ? styles.raised : styles.flat;

  if (pressable && onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          variantStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.base, variantStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  flat: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
  },
  raised: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
});
