import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BlogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Blog</Text>
      <Text style={styles.sub}>Next: list latest posts from /api/v1/posts.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0f14", padding: 16 },
  h1: { color: "white", fontSize: 22, fontWeight: "800" },
  sub: { marginTop: 8, color: "rgba(255,255,255,0.65)" },
});
