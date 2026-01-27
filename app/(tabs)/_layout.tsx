import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const BG = "#0b0f14";
const ACTIVE = "rgba(255,255,255,0.95)";
const INACTIVE = "rgba(255,255,255,0.55)";
const BORDER = "rgba(255,255,255,0.12)";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: BORDER,
          borderTopWidth: 1,

          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
        },

        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
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
          title: "Map",
          tabBarLabel: "Map",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="blog"
        options={{
          title: "Blog",
          tabBarLabel: "Blog",
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
          title: "Videos",
          tabBarLabel: "Videos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
