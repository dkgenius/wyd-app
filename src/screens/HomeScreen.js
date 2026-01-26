// src/screens/HomeScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Alert } from "react-native";
import * as Location from "expo-location";
import { apiGet } from "../api/client";
import YouTubeEmbed from "../components/YouTubeEmbed";
import CourtCard from "../components/CourtCard";

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [courts, setCourts] = useState([]);
  const [coords, setCoords] = useState(null);

  // For now: hardcode your featured video.
  // Next step: we’ll pull this from an API endpoint or from your database settings.
  const featuredVideoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // replace

  const reviewedCourts = useMemo(() => {
    return (courts || []).filter((c) => c?.blog?.id && c?.blog?.url);
  }, [courts]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Location needed", "Enable location to show nearby courts.");
          setLoading(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({});
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        // Your endpoint: /api/v1/locations/nearby.php
        const data = await apiGet("/locations/nearby.php", {
          lat,
          lng,
          radius: 25,
        });

        setCourts(data?.locations || []);
      } catch (e) {
        Alert.alert("Error", e.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#0B0B0F" }}>
      <Text style={{ fontSize: 22, fontWeight: "900", color: "white" }}>
        What You Dink
      </Text>
      <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.65)" }}>
        Latest video + nearby reviews
      </Text>

      <View style={{ marginTop: 14 }}>
        <YouTubeEmbed url={featuredVideoUrl} />
      </View>

      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: "white" }}>
          Nearby reviews
        </Text>
        <Text style={{ marginTop: 4, color: "rgba(255,255,255,0.6)" }}>
          Courts near you with blog posts
        </Text>
      </View>

      {loading ? (
        <View style={{ marginTop: 18 }}>
          <ActivityIndicator />
        </View>
      ) : reviewedCourts.length === 0 ? (
        <Text style={{ marginTop: 14, color: "rgba(255,255,255,0.6)" }}>
          No nearby reviewed courts found{coords ? " within 25 miles." : "."}
        </Text>
      ) : (
        <FlatList
          style={{ marginTop: 12 }}
          data={reviewedCourts}
          keyExtractor={(item) => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }) => (
            <CourtCard
              item={item}
              onPress={() => {
                // Next step: navigate to Blog Post screen or Location Details screen
                Alert.alert("Open blog", item.blog.url);
              }}
            />
          )}
        />
      )}
    </View>
  );
}
