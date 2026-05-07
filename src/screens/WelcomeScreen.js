import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Easing,
  TouchableOpacity,
} from "react-native";
import { COLORS, SIZES, FONTS } from "../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../context/ToastContext";
import AnimatedLogo from "../components/AnimatedLogo";
import SharedPhotos from "../components/SharedPhotos";


const WelcomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useToast();
  const [sharedPhotos, setSharedPhotos] = useState([]);
  const [mySharedPhotos, setMySharedPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = "https://bronze-api.trair.com.tr";

  // Ekran boyutuna göre logo boyutu (responsive)
  const { width: screenW, height: screenH } = Dimensions.get("window");
  const logoSize = Math.min(screenW * 0.85, screenH * 0.45, 520);

  // useEffect(() => {
  //   const fetchMySharedPhotos = async () => {
  //     try {
  //       const response = await fetch(`${API_URL}/api/user/getMyPhotos`);
  //       const data = await response.json();
  //       setMySharedPhotos(data.data);
  //     } catch (e) {
  //       console.error(e);
  //     }
  //   };
  //   fetchMySharedPhotos();
  // }, []);


  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchSharedPhotos = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`${API_URL}/api/public/phone/share-photo`, {
          timeout: 10000, // 10 saniye timeout
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setSharedPhotos(data.data);
      } catch (e) {
        console.error("Shared photos fetch error:", e);
        // Sadece gerçek bir hata olduğunda göster, sessizce başarısız ol
        // Kullanıcı deneyimini bozmamak için arka planda çalışsın
      } finally {
        setIsLoading(false);
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

    const screenHeight = Dimensions.get("window").height;
    const screenWidth = Dimensions.get("window").width;
    const photoHeight = screenHeight / 2; // Her fotoğraf ekranın yarısı kadar yükseklikte
    const photoWidth = screenWidth / 2; // Her fotoğraf ekranın yarısı kadar genişlikte
    const gap = 0;

    // Fotoğrafları 2'şerli gruplar halinde düzenle
    const groupedPhotos = [];
    for (let i = 0; i < sharedPhotos.length; i += 2) {
      const group = sharedPhotos.slice(i, i + 2);
      if (group.length === 1) {
        // Tek fotoğraf kaldıysa, aynı fotoğrafı iki kez kullan
        group.push(sharedPhotos[0]);
      }
      groupedPhotos.push(group);
    }

    const basePhotos = Array(5).fill(groupedPhotos).flat(); // Grupları 5 kez tekrar et

    return basePhotos.map((photoGroup, groupIdx) => {
      const totalLength = (photoHeight + gap) * basePhotos.length;
      const startY = 0;
      const endY = -totalLength;

      const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [startY, endY],
      });

      const topOffset = groupIdx * (photoHeight + gap);

      return (
        <Animated.View
          key={`group_${groupIdx}`}
          style={{
            position: "absolute",
            top: topOffset,
            left: 0,
            right: 0,
            width: screenWidth,
            height: photoHeight,
            transform: [{ translateY }],
            flexDirection: "row",
          }}
        >
          {photoGroup.map((photo, photoIdx) => {
            let imageUrl = photo.url;
            if (imageUrl && !imageUrl.startsWith("http")) {
              imageUrl = `${API_URL}${imageUrl}`;
            }

            return (
              <Image
                key={`photo_${groupIdx}_${photoIdx}`}
                source={{ uri: imageUrl }}
                style={{
                  width: photoWidth,
                  height: photoHeight,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
                resizeMode="cover"
              />
            );
          })}
        </Animated.View>
      );
    });
  };

  return (
    <View style={styles.background}>
      {/* Ayarlar Butonu */}
      <TouchableOpacity
        style={[
          styles.settingsButton,
          { top: insets.top + 8, right: insets.right + 20 },
        ]}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={28} color={COLORS.text} />
      </TouchableOpacity>

      <SharedPhotos apiUrl={API_URL} showFab={false} />
      {/* Sonsuz kayan fotoğraflar */}
      {renderInfiniteSlider()}

      <LinearGradient
        colors={["rgba(244,235,208,0.4)", "rgba(255,255,255,0.95)"]}
        style={styles.gradient}
      >
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top + 24,
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <AnimatedLogo width={logoSize} height={logoSize} />
          </View>
          
          {/* Ana Butonlar */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("PhotoEdit")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#D4AF37", "#FFD700", "#D4AF37"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="images" size={32} color="#000" />
                <Text style={styles.primaryButtonText}>Fotoğraf Yükle</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("RealTimeScreen")}
              activeOpacity={0.8}
            >
              <View style={styles.secondaryButtonContent}>
                <Ionicons name="camera" size={32} color="#D4AF37" />
                <Text style={styles.secondaryButtonText}>Gerçek Zamanlı</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Alt Bilgi */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              ✨ Fotoğrafınıza bronzlaştırıcı efekti uygulayın
            </Text>
            <Text style={styles.infoText}>
              🎁 Paylaşarak indirim kodu kazanın
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFFFF",
  },
  settingsButton: {
    position: "absolute",
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 30,
    marginTop: -20,
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
    position: "absolute",
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
    width: 200,
    height: 200,
    marginBottom: 30,
    backgroundColor: COLORS.background,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonsContainer: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    ...FONTS.bold,
    fontSize: 15,
    color: "#000",
    textAlign: "center",
  },
  primaryButtonSubtext: {
    ...FONTS.regular,
    fontSize: 12,
    color: "#333",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(212, 175, 55, 0.08)",
    borderWidth: 2,
    borderColor: "#D4AF37",
    overflow: "hidden",
  },
  secondaryButtonContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    ...FONTS.bold,
    fontSize: 15,
    color: "#D4AF37",
    textAlign: "center",
  },
  secondaryButtonSubtext: {
    ...FONTS.regular,
    fontSize: 11,
    color: "#3A2A10",
    opacity: 0.8,
  },
  infoContainer: {
    marginTop: 20,
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    ...FONTS.regular,
    fontSize: 12,
    color: "#3A2A10",
    opacity: 0.85,
    textAlign: "center",
  },
});

export default WelcomeScreen;
