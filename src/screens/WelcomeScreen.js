import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { COLORS, SIZES, FONTS } from "../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const WelcomeScreen = () => {
  const navigation = useNavigation();
  const [sharedPhotos, setSharedPhotos] = useState([]);
  const API_URL = "https://kafanagoreya.yumru.dev";

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchSharedPhotos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/phone/share-photo`);
        const data = await response.json();
        setSharedPhotos(data.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSharedPhotos();
  }, []);

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 80000, // daha yavaş, kesintisiz kayma
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  const renderInfiniteSlider = () => {
    if (!sharedPhotos || sharedPhotos.length === 0) {
      return null;
    }

    const photoHeight = 150;
    const photoWidth = 150;
    const gap = 20;
    const basePhotos = Array(5).fill(sharedPhotos).flat(); // Fotoğrafları 5 kez tekrar et

    return basePhotos.map((photo, idx) => {
      let imageUrl = photo.url;
      if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = `${API_URL}${imageUrl}`;
      }

      const totalLength = (photoHeight + gap) * basePhotos.length;
      const startY = 0;
      const endY = -totalLength;

      const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [startY, endY],
      });

      const topOffset = idx * (photoHeight + gap);
      const zigzagX = (SCREEN_WIDTH - photoWidth) / 2 + (idx % 2 === 0 ? -30 : 30);

      return (
        <Animated.Image
          key={`photo_${idx}`}
          source={{ uri: imageUrl }}
          style={{
            position: "absolute",
            top: topOffset,
            left: 0,
            right: 0,
            width: photoWidth,
            height: photoHeight,
            borderRadius: 15,
            transform: [{ translateY }, { translateX: new Animated.Value(zigzagX) }],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
          resizeMode="cover"
        />
      );
    });
  };

  return (
    <ImageBackground
      source={require("../assets/welcome-bg.png")}
      style={styles.background}
    >
      {/* Sonsuz kayan fotoğraflar */}
      {renderInfiniteSlider()}

      <LinearGradient
        colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.welcomeLogo}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate("Gerçek Zamanlı Önizleme")}
            >
              <Ionicons name="camera" size={24} color={COLORS.text} />
              <Text style={styles.buttonText}>Gerçek Zamanlı Deneyim</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>
              ile yüzünüze otomatik bronzlaştırıcı kremler uygulayabilirsiniz.
              Veya
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate("Düzenle ve Önizleme")}
            >
              <Ionicons name="image" size={24} color={COLORS.text} />
              <Text style={styles.buttonText}>Fotoğraf Seçerek</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>
              istediğiniz alanları seçerek bronzlaştırıcı kremler uygulayabilirsiniz.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  subtitle: {
    ...FONTS.regular,
    fontSize: SIZES.large,
    color: COLORS.background,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  button: {
    backgroundColor: COLORS.button,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  buttonText: {
    ...FONTS.medium,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  welcomeLogo: {
    width: 150,
    height: 150,
    marginBottom: 30,
    backgroundColor: COLORS.background,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default WelcomeScreen;
