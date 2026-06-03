/**
 * Pill — the site's chip pattern. Used for filters, badges, labels.
 *
 *   <Pill>Public</Pill>
 *   <Pill variant="accent">Reviewed</Pill>
 *   <Pill variant="terra">Pending</Pill>
 *   <Pill leftIcon={...}>3 Indoor</Pill>
 */

import React from "react";
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Body } from "./typography";
import { Colors, Fonts, Radius, Spacing, TypeScale } from "@/constants/theme";

type Variant = "default" | "accent" | "terra" | "outline";

interface PillProps {
  children: React.ReactNode;
  variant?: Variant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Pill({
  children,
  variant = "default",
  leftIcon,
  rightIcon,
  onPress,
  style,
}: PillProps) {
  const v = VARIANT_STYLES[variant];
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.base,
        v.container,
        onPress && pressed && styles.pressed,
        style,
      ]}
    >
      {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
      <Body weight="bold" style={[styles.label, v.label]}>
        {children}
      </Body>
      {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  label: {
    fontFamily: Fonts.body.bold,
    fontSize: TypeScale.caption,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    lineHeight: 14,
  },
  icon: { alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.8 },
});

const VARIANT_STYLES: Record<Variant, { container: ViewStyle; label: any }> = {
  default: {
    container: {
      backgroundColor: "rgba(255,255,255,0.04)",
      borderColor: Colors.border,
    },
    label: { color: Colors.muted },
  },
  accent: {
    container: {
      backgroundColor: Colors.ballDim,
      borderColor: Colors.ballSoft,
    },
    label: { color: Colors.ball },
  },
  terra: {
    container: {
      backgroundColor: Colors.terraDim,
      borderColor: "rgba(220,91,30,0.40)",
    },
    label: { color: "#ff9a6b" },
  },
  outline: {
    container: {
      backgroundColor: "transparent",
      borderColor: Colors.borderUp,
    },
    label: { color: Colors.text },
  },
};
