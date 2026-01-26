// src/components/YouTubeEmbed.js
import React, { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

function extractYouTubeId(url) {
  if (!url) return null;
  const s = String(url);

  // youtu.be/ID
  let m = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  // watch?v=ID
  m = s.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  // /embed/ID
  m = s.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  // /shorts/ID
  m = s.match(/\/shorts\/([A-Za-z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  return null;
}

export default function YouTubeEmbed({ url }) {
  const videoId = useMemo(() => extractYouTubeId(url), [url]);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

  if (!embedUrl) return null;

  return (
    <View style={{ height: 210, borderRadius: 16, overflow: "hidden" }}>
      <WebView
        source={{ uri: embedUrl }}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}
