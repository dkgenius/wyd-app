// src/navigation/RootNavigator.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import MapScreen from "../screens/MapScreen";
import BlogScreen from "../screens/BlogScreen";
import ClinicScreen from "../screens/ClinicScreen";
import VideosScreen from "../screens/VideosScreen";

const Tab = createBottomTabNavigator();

function tabIcon(routeName, focused) {
  // Simple, clean set. We can refine later.
  const map = {
    Home: focused ? "home" : "home-outline",
    Map: focused ? "map" : "map-outline",
    Blog: focused ? "reader" : "reader-outline",
    Clinic: focused ? "fitness" : "fitness-outline",
    Videos: focused ? "play-circle" : "play-circle-outline",
  };
  return map[routeName] || "ellipse";
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,
          tabBarIcon: ({ focused, size, color }) => (
            <Ionicons name={tabIcon(route.name, focused)} size={size} color={color} />
          ),
          tabBarLabelStyle: { fontSize: 11 },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Blog" component={BlogScreen} />
        <Tab.Screen name="Clinic" component={ClinicScreen} />
        <Tab.Screen name="Videos" component={VideosScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
