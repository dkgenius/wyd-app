/**
 * Brand button.
 *
 *   <Button onPress={...}>Primary CTA</Button>
 *   <Button variant="ghost" onPress={...}>Ghost</Button>
 *   <Button variant="danger" onPress={...}>Delete</Button>
 *   <Button size="sm" leftIcon={<Ionicons name="map" .../>}>Map</Button>
 *
 * Tap = haptic feedback on iOS via the parent if needed. We keep this primitive
 * dumb (no haptics) — wrap with HapticTab or similar where you want them.
 */

import React from "react";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Body } from "./typography";
import { Colors, Fonts, Radius, Spacing, TypeScale } from "@/constants/theme";

type Variant = "primary" | "ghost" | "soft" | "danger";
type Size = "default" | "sm" | "lg";

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  children,
  variant = "primary",
  size = "default",
  leftIcon,
  rightIcon,
  fullWidth,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variantStyle.container,
        sizeStyle.container,
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled}
      {...rest}
    >
      {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
      <Body
        weight="extrabold"
        style={[variantStyle.label as TextStyle, sizeStyle.label as TextStyle, styles.labelBase]}
      >
        {children}
      </Body>
      {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  labelBase: {
    fontFamily: Fonts.body.bold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: { alignSelf: "stretch" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});

const VARIANT_STYLES: Record<
  Variant,
  { container: ViewStyle; label: TextStyle }
> = {
  primary: {
    container: {
      backgroundColor: Colors.ball,
      borderColor: "rgba(0,0,0,0.18)",
    },
    label: {
      color: Colors.onBall,
      // Slight white text-shadow mirroring the admin button polish
      textShadowColor: "rgba(255,255,255,0.18)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 0,
    },
  },
  ghost: {
    container: {
      backgroundColor: "transparent",
      borderColor: Colors.borderUp,
    },
    label: {
      color: Colors.text,
    },
  },
  soft: {
    container: {
      backgroundColor: "rgba(255,255,255,0.05)",
      borderColor: Colors.border,
    },
    label: {
      color: Colors.text,
    },
  },
  danger: {
    container: {
      backgroundColor: Colors.terraDim,
      borderColor: "rgba(220,91,30,0.50)",
    },
    label: {
      color: "#ff9a6b",
    },
  },
};

const SIZE_STYLES: Record<Size, { container: ViewStyle; label: TextStyle }> = {
  default: {
    container: { paddingVertical: 14, paddingHorizontal: 22 },
    label: { fontSize: TypeScale.bodySm },
  },
  sm: {
    container: { paddingVertical: 10, paddingHorizontal: 16 },
    label: { fontSize: TypeScale.caption },
  },
  lg: {
    container: { paddingVertical: 17, paddingHorizontal: 28 },
    label: { fontSize: TypeScale.body },
  },
};
