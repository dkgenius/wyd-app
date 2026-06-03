/**
 * Screen — the dark, safe-area-aware wrapper every brand screen should sit in.
 *
 *   <Screen>
 *     <Display>HEY</Display>
 *   </Screen>
 *
 *   <Screen scroll>...</Screen>            // wraps in ScrollView
 *   <Screen scroll refreshing onRefresh={...}>...</Screen>
 *
 * Saves us from copy-pasting SafeAreaView + ScrollView + bg color on every screen.
 */

import React from "react";
import {
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";

interface ScreenProps {
  children: React.ReactNode;

  /** Wrap content in a ScrollView */
  scroll?: boolean;

  /** Pull-to-refresh (when scroll=true) */
  refreshing?: boolean;
  onRefresh?: () => void;

  /** Horizontal padding (default = Spacing.screenPadH). Set 0 for full-bleed. */
  padH?: number;

  /** Safe area edges. Default ["top", "left", "right"] — bottom handled by tab bar */
  edges?: Edge[];

  /** Extra style on the outer wrapper */
  style?: StyleProp<ViewStyle>;

  /** Pass-through to inner ScrollView */
  scrollViewProps?: ScrollViewProps;

  /** Extra padding bottom on the content */
  paddingBottom?: number;
}

export function Screen({
  children,
  scroll,
  refreshing = false,
  onRefresh,
  padH = Spacing.screenPadH,
  edges = ["top", "left", "right"],
  style,
  scrollViewProps,
  paddingBottom = 32,
}: ScreenProps) {
  const inner = (
    <View style={{ paddingHorizontal: padH }}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.ball}
                colors={[Colors.ball]}
              />
            ) : undefined
          }
          {...scrollViewProps}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scrollView: { flex: 1 },
});
