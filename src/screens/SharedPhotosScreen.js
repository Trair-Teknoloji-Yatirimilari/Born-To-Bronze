import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SharedPhotos from "../components/SharedPhotos";
import { COLORS } from "../constants/theme";

const API_URL = "https://bronze-api.trair.com.tr";

const SharedPhotosScreen = () => {
  const insets = useSafeAreaInsets();
  const ref = useRef(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.open();
    } else if (!isFocused && ref.current) {
      ref.current.close();
    }
  }, [isFocused]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <Ionicons name="share-social" size={28} color={COLORS.text} />
        <Text style={styles.headerTitle}>Paylaşımlarım</Text>
        <Text style={styles.headerSubtitle}>
          Daha önce paylaştığınız fotoğraflarınız burada görünür
        </Text>
      </View>
      <SharedPhotos apiUrl={API_URL} showFab={false} ref={ref} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 4,
  },
});

export default SharedPhotosScreen;
