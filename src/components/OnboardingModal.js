import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
} from "react-native";

const { width } = Dimensions.get("window");

export default function OnboardingModal({ visible, onDone, appVersion }) {
  const scrollRef = useRef(null);
  const [page, setPage] = useState(0);

  // Gentle "beating" animation for the logo while the modal is open (also doubles as a nice first impression).
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, scale]);

  const slides = useMemo(
    () => [
      {
        key: "welcome",
        title: "Welcome to What You Dink",
        body: "Quick tour — swipe or tap Next.",
        showLogo: true,
      },
      {
        key: "clinic",
        title: "Clinic",
        body: "Find skills, training paths, and lessons fast.",
      },
      {
        key: "map",
        title: "Map",
        body: "Explore courts near you.",
      },
      {
        key: "blog",
        title: "Articles",
        body: "Read and share posts — built to help discovery.",
      },
      {
        key: "done",
        title: "You're all set",
        body: "Tap Finish to start exploring.",
      },
    ],
    []
  );

  useEffect(() => {
    if (!visible) {
      setPage(0);
      scrollRef.current?.scrollTo?.({ x: 0, animated: false });
    }
  }, [visible]);

  function goTo(nextIndex) {
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIndex));
    setPage(clamped);
    scrollRef.current?.scrollTo?.({ x: clamped * width, animated: true });
  }

  const isLast = page === slides.length - 1;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.card}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setPage(idx);
            }}
          >
            {slides.map((s) => (
              <View key={s.key} style={[styles.slide, { width }]}>
                {s.showLogo ? (
                  <>
                    <Animated.View style={{ transform: [{ scale }] }}>
                      <Image
                        source={require("../../assets/images/whatyoudinklogo-outline.png")}
                        style={styles.logo}
                        resizeMode="contain"
                      />
                    </Animated.View>
                    <View style={{ height: 16 }} />
                    <ActivityIndicator />
                    <View style={{ height: 8 }} />
                    <Text style={styles.version}>v{appVersion}</Text>
                  </>
                ) : null}

                <View style={{ height: s.showLogo ? 22 : 0 }} />

                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.body}>{s.body}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => goTo(page - 1)}
              style={[styles.btn, page === 0 && styles.btnDisabled]}
              disabled={page === 0}
            >
              <Text style={styles.btnText}>Back</Text>
            </Pressable>

            <Pressable
              onPress={() => (isLast ? onDone?.() : goTo(page + 1))}
              style={[styles.btn, styles.btnPrimary]}
            >
              <Text style={[styles.btnText, styles.btnTextPrimary]}>{isLast ? "Finish" : "Next"}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "92%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "white",
  },
  slide: {
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 180, height: 180 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 10 },
  body: { fontSize: 15, textAlign: "center", marginTop: 10, opacity: 0.8, paddingHorizontal: 12 },
  version: { fontSize: 12, opacity: 0.55 },
  dots: { flexDirection: "row", justifyContent: "center", paddingBottom: 6, paddingTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: "#d7d7d7", marginHorizontal: 4 },
  dotActive: { backgroundColor: "#111" },
  actions: { flexDirection: "row", justifyContent: "space-between", padding: 14 },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#efefef",
    minWidth: 96,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#111" },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: 15, fontWeight: "600" },
  btnTextPrimary: { color: "white" },
});
