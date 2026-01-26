// src/components/CourtCard.js
import React from "react";
import { View, Text, Pressable } from "react-native";

export default function CourtCard({ item, onPress }) {
  const cityState = [item.city, item.state].filter(Boolean).join(", ");

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 280,
        padding: 14,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "800", color: "white" }} numberOfLines={1}>
        {item.name}
      </Text>

      <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.75)" }} numberOfLines={1}>
        {cityState}
      </Text>

      {item.rating_overall != null ? (
        <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>
          Overall: {Number(item.rating_overall).toFixed(1)}/10
        </Text>
      ) : null}

      {item.blog?.title ? (
        <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.75)" }} numberOfLines={2}>
          📝 {item.blog.title}
        </Text>
      ) : (
        <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.5)" }}>
          No linked blog post
        </Text>
      )}
    </Pressable>
  );
}
