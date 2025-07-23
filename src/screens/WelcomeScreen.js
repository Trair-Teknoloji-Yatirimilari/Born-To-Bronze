import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Button,
  Image,
  Animated,
  Dimensions,
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
  // Animasyon için referanslar
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchSharedPhotos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/phone/share-photo`);
        const data = await response.json();
        setSharedPhotos(data.data);
        console.log("Shared Photos:", data.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSharedPhotos();
  }, []);

  // Animasyonu başlat
  useEffect(() => {
    animatedValue.setValue(0); // Her döngüde başa sar
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 15000, // 15 saniyede bir döngü
        useNativeDriver: true,
        easing: undefined,
      })
    ).start();
  }, [animatedValue, sharedPhotos]);

  // sharedPhotos'u arka planda kayan şekilde render eden fonksiyon
  const renderSlidingPhotos = () => {
    let photos = sharedPhotos;
    return photos.map((photo, idx) => {
      const photoHeight = 120;
      const gap = 30;
      const totalHeight = (photoHeight + gap) * photos.length;
      const startY = SCREEN_HEIGHT + idx * (photoHeight + gap);
      const endY = -photoHeight + idx * (photoHeight + gap);
      // url tam mı kontrol et
      let imageUrl = photo.url;
      if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = `${API_URL}${imageUrl}`;
      }
      const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [startY, endY],
      });
      return (
        <Animated.Image
          key={photo._id || idx}
          source={{ uri: imageUrl }}
          style={[
            {
              position: "absolute",
              borderRadius: 20,
              opacity: 0.7,
              overflow: "hidden",
              width: 120,
              height: 120,
              transform: [{ translateY }],
              left: (SCREEN_WIDTH - 120) / 2 + (idx % 2 === 0 ? -40 : 40),
              opacity: 0.7,
            },
          ]}
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
      {/* Kayan fotoğraflar arka planda, gradientten önce */}
      {renderSlidingPhotos()}
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
              <Text style={styles.buttonText}>{`Fotoğraf Seçerek`}</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>
              {`istediğiniz alanları seçerek bronzlaştırıcı kremler uygulayabilirsiniz.`}
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
  title: {
    ...FONTS.bold,
    fontSize: SIZES.extraLarge * 2,
    color: COLORS.background,
    marginBottom: SIZES.base,
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
  secondaryButton: {
    backgroundColor: COLORS.button,
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
