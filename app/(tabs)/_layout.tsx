import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Fonts } from "@/constants/theme";

/**
 * Bottom tabs — brand-matched to the public site.
 *
 * Design choices:
 *  - Same icon style (outlined) for active + inactive so there's no jarring
 *    icon swap on tap. Active state communicated through color only.
 *  - Ball-green tint on the focused tab (icon + label), muted gray otherwise.
 *  - No filled-vs-outlined toggling, no pill background — keeps the bar quiet.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,

          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
        },

        tabBarActiveTintColor: Colors.ball,
        tabBarInactiveTintColor: Colors.muted2,

        tabBarLabelStyle: {
          fontFamily: Fonts.body.bold,
          fontSize: 10.5,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Courts",
          tabBarLabel: "Courts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="blog"
        options={{
          title: "Reviews",
          tabBarLabel: "Reviews",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="clinic"
        options={{
          title: "Clinic",
          tabBarLabel: "Clinic",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="videos"
        options={{
          title: "About",
          tabBarLabel: "About",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
