import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

/**
 * Bottom tabs — brand-matched to the public site.
 * Background = near-black, ball-green active indicator + label, DM Sans Bold.
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

          height: 64 + insets.bottom,
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
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? activeIconWrap : undefined}>
              <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Courts",
          tabBarLabel: "Courts",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "location" : "location-outline"}
                size={size}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="blog"
        options={{
          title: "Reviews",
          tabBarLabel: "Reviews",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "newspaper" : "newspaper-outline"}
                size={size}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="clinic"
        options={{
          title: "Clinic",
          tabBarLabel: "Clinic",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "fitness" : "fitness-outline"}
                size={size}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="videos"
        options={{
          title: "About",
          tabBarLabel: "About",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "information-circle" : "information-circle-outline"}
                size={size}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const activeIconWrap = {
  // Subtle ball-green wash under the active icon, matching the site's
  // active-link treatment in the admin sidebar.
  backgroundColor: Colors.ballDim,
  paddingHorizontal: 14,
  paddingVertical: 4,
  borderRadius: 999,
};
