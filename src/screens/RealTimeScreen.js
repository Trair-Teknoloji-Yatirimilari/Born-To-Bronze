import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
  Animated,
  StatusBar,
  Linking,
} from "react-native";
import {
  DrawableFrame,
  Camera as VisionCamera,
  useCameraDevice,
  useCameraPermission,
  useCameraFormat,
} from "react-native-vision-camera";
import { useIsFocused } from "@react-navigation/core";
import { useAppState } from "@react-native-community/hooks";
import { Camera, Face } from "react-native-vision-camera-face-detector";
import { ClipOp, Skia, TileMode, BlendMode } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { PRODUCTS } from "../constants/products";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

function RealTimeScreen() {
  const { width, height } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraFacing, setCameraFacing] = useState("front");
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Animasyonlar
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const faceDetectionOptions = useRef({
    performanceMode: "fast",
    classificationMode: "all",
    contourMode: "all",
    landmarkMode: "all",
    windowWidth: width,
    windowHeight: height,
  }).current;
  const isFocused = useIsFocused();
  const appState = useAppState();
  const isCameraActive = isFocused && appState === "active";
  const cameraDevice = useCameraDevice(cameraFacing);
  const format = useCameraFormat(cameraDevice, [
    {
      videoResolution: { width: 854, height: 480 },
      fps: 30,
    },
  ]);
  const camera = useRef(null);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  // Pulse animasyonu
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Yardım ipucunu otomatik gizle
  useEffect(() => {
    if (showHelp) {
      const timer = setTimeout(() => setShowHelp(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showHelp]);

  function handleUiRotation(rotation) {}

  function handleCameraMountError(error) {
    console.error("camera mount error", error);
  }

  function handleFacesDetected(faces, frame) {
    if (faces.length <= 0) return;
  }

  function handleSkiaActions(faces, frame) {
    "worklet";
    if (faces.length <= 0) return;

    const { contours } = faces[0];

    // Hata ayıklama için konturları logla
    console.log("Contours available:", Object.keys(contours || {}));

    // Yüz konturu oluştur
    const facePath = Skia.Path.Make();
    const necessaryContours = ["FACE", "LEFT_CHEEK", "RIGHT_CHEEK"];
    necessaryContours.forEach((key) => {
      if (contours?.[key]) {
        contours[key].forEach((point, index) => {
          if (index === 0) {
            facePath.moveTo(point.x, point.y);
          } else {
            facePath.lineTo(point.x, point.y);
          }
        });
        facePath.close();
      }
    });

    // Gözler ve dudaklar için hariç tutma bölgeleri
    const excludePath = Skia.Path.Make();
    const excludeContours = [
      "LEFT_EYE",
      "RIGHT_EYE",
      "UPPER_LIP_TOP",
      "UPPER_LIP_BOTTOM",
      "LOWER_LIP_TOP",
      "LOWER_LIP_BOTTOM",
    ];
    excludeContours.forEach((key) => {
      if (contours?.[key]) {
        console.log(`Processing contour: ${key}`, contours[key].length);
        contours[key].forEach((point, index) => {
          if (index === 0) {
            excludePath.moveTo(point.x, point.y);
          } else {
            excludePath.lineTo(point.x, point.y);
          }
        });
        excludePath.close();
      } else {
        console.log(`Contour ${key} not found`);
      }
    });

    // Seçili ürünün rengine göre bronzlaştırma filtresi
    const color = selectedProduct.color;
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    const colorMatrix = [
      1,
      0,
      0,
      0,
      r * 0.15,
      0,
      1,
      0,
      0,
      g * 0.08,
      0,
      0,
      1,
      0,
      b * 0.03,
      0,
      0,
      0,
      0.6,
      0,
    ];
    const bronzeFilter = Skia.ColorFilter.MakeMatrix(colorMatrix);
    const bronzePaint = Skia.Paint();
    bronzePaint.setColorFilter(bronzeFilter);
    bronzePaint.setBlendMode(BlendMode.Overlay);

    // Kenarları yumuşatmak için blur
    const blurRadius = 8;
    const blurFilter = Skia.ImageFilter.MakeBlur(
      blurRadius,
      blurRadius,
      TileMode.Clamp,
      null
    );
    bronzePaint.setImageFilter(blurFilter);

    // Yüz bölgesine filtre uygula, gözler ve dudakları hariç tut
    frame.save();
    frame.clipPath(facePath, ClipOp.Intersect, true);
    if (excludePath.countPoints() > 0) {
      frame.clipPath(excludePath, ClipOp.Difference, true);
    }
    frame.render(bronzePaint);
    frame.restore();
  }

  async function takePhoto() {
    if (camera.current) {
      try {
        const photo = await camera.current.takePhoto();
        setCapturedPhoto(photo);
      } catch (error) {
        console.error("Photo capture error:", error);
      }
    }
  }

  function buyProduct() {
    // const handlePurchase = async () => {
    //   if (!selectedProduct || !selectedProduct.link) {
    //     Alert.alert("Hata", "Lütfen önce bir ürün seçin!");
    //     return;
    //   }
  
    //   try {
    //     const supported = await Linking.canOpenURL(selectedProduct.link);
    //     if (supported) {
    //       await Linking.openURL(selectedProduct.link);
    //     } else {
    //       Alert.alert("Hata", "Bu link açılamıyor: " + selectedProduct.link);
    //     }
    //   } catch (error) {
    //     console.error("Link açılırken hata:", error);
    //     Alert.alert("Hata", "Satın alma sayfası açılırken hata oluştu.");
    //   }
    // };
    if (selectedProduct.link) {
      Linking.openURL(selectedProduct.link);
    }
  }

  function closePreview() {
    setCapturedPhoto(null);
  }

  const getCurrentProductIndex = () => {
    return PRODUCTS.findIndex((p) => p.id === selectedProduct.id);
  };

  const getPreviousProduct = () => {
    const currentIndex = getCurrentProductIndex();
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : PRODUCTS.length - 1;
    return PRODUCTS[prevIndex];
  };

  const getNextProduct = () => {
    const currentIndex = getCurrentProductIndex();
    const nextIndex = currentIndex < PRODUCTS.length - 1 ? currentIndex + 1 : 0;
    return PRODUCTS[nextIndex];
  };

  const switchToPreviousProduct = () => {
    // Kaydırma animasyonu - sola kaydırma
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Scale animasyonu
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedProduct(getPreviousProduct());
    setShowHelp(false);
  };

  const switchToNextProduct = () => {
    // Kaydırma animasyonu - sağa kaydırma
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Scale animasyonu
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedProduct(getNextProduct());
    setShowHelp(false);
  };



  // Swipe gesture tanımla
  const swipeGesture = Gesture.Pan().onEnd((event) => {
    "worklet";
    const { velocityX, translationX } = event;

    // Sağa kaydırma (önceki ürün)
    if (translationX > 50 || velocityX > 500) {
      runOnJS(switchToPreviousProduct)();
    }
    // Sola kaydırma (sonraki ürün)
    else if (translationX < -50 || velocityX < -500) {
      runOnJS(switchToNextProduct)();
    }
  });

  if (capturedPhoto) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <Image
          source={{ uri: `file://${capturedPhoto.path}` }}
          style={StyleSheet.absoluteFill}
        />

        {/* Gradient overlay for better UI */}
        <LinearGradient
          colors={["rgba(244, 235, 208, 0.2)", "transparent", "rgba(244, 235, 208, 0.9)"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Product info header */}
        <View style={styles.previewHeader}>
          <View style={styles.productBadge}>
            <Image
              source={selectedProduct.pngImage}
              style={styles.productBadgeImage}
            />
            <View style={styles.productBadgeContent}>
              <Text style={styles.productBadgeTitle}>{selectedProduct.name}</Text>
              <Text style={styles.productBadgeSubtitle}>Bronzlaştırma Filtresi</Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => {}}
          >
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Paylaş</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.buyButton]}
            onPress={buyProduct}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Satın Al</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.closeButton]}
            onPress={closePreview}
          >
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {hasPermission && cameraDevice ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}
        >
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            isActive={isCameraActive}
            device={cameraDevice}
            onError={handleCameraMountError}
            faceDetectionCallback={handleFacesDetected}
            onUIRotationChanged={handleUiRotation}
            skiaActions={handleSkiaActions}
            faceDetectionOptions={faceDetectionOptions}
            format={format}
            photo={true}
          />
        </Animated.View>
      ) : (
        <View style={styles.permissionScreen}>
          <LinearGradient
            colors={["#FF6B35", "#F7931E", "#FFD23F"]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.permissionTitle}>🔒 Kamera İzni Gerekli</Text>
          <Text style={styles.permissionText}>
            Bronzlaştırma filtresini kullanmak için kamera izni vermeniz
            gerekmektedir.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Top UI Bar */}
      <View style={styles.topBar}>
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "transparent"]}
          style={styles.topBarGradient}
        />
        <View style={styles.productHeader}>
          <Image
            source={selectedProduct.pngImage}
            style={styles.topProductImage}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{selectedProduct.name}</Text>
            <Text style={styles.productDescription}>
              Bronzlaştırma Filtresi
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setShowHelp(!showHelp)}
        >
          <Text style={styles.helpIcon}>?</Text>
        </TouchableOpacity>
      </View>

      {/* Product info overlay */}
      {showHelp && (
        <Animated.View
          style={[styles.productInfoOverlay, { opacity: fadeAnim }]}
        >
          <View style={styles.productInfoHeader}>
            <Image
              source={selectedProduct.pngImage}
              style={styles.productInfoImage}
            />
            <View style={styles.productInfoContent}>
              <Text style={styles.productInfoTitle}>
                {selectedProduct.name}
              </Text>
              <Text style={styles.productInfoPrice}>
                ₺{selectedProduct.price.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeInfoButton}
              onPress={() => setShowHelp(false)}
            >
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.productInfoDescription}>
            {selectedProduct.description}
          </Text>

          <View style={styles.productInfoFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="color-palette" size={16} color={COLORS.text} />
              <Text style={styles.featureText}>Bronzlaştırma Filtresi</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="water" size={16} color={COLORS.text} />
              <Text style={styles.featureText}>200ml Premium Formül</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.text} />
              <Text style={styles.featureText}>Cilt Dostu İçerik</Text>
            </View>
          </View>

          <View style={styles.productInfoActions}>
            <TouchableOpacity
              style={styles.infoActionButton}
              onPress={() => setShowHelp(false)}
            >
              <Text style={styles.infoActionText}>Kullanmaya Devam Et</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Main camera controls */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={[
            styles.bottomContainer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Sol yan ürün */}
          <TouchableOpacity
            style={styles.sideProduct}
            onPress={switchToPreviousProduct}
          >
            <Animated.View
              style={[
                styles.sideProductContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Image
                source={getPreviousProduct().pngImage}
                style={styles.sideProductImage}
              />
              <Text style={styles.sideProductName}>
                {getPreviousProduct().name}
              </Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Ana fotoğraf çekme butonu */}
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }, { translateX: slideAnim }],
            }}
          >
            <TouchableOpacity
              style={styles.mainCaptureButton}
              onPress={takePhoto}
            >
              <LinearGradient
                colors={["#FF6B35", "#F7931E", "#FFD23F"]}
                style={styles.captureButtonGradient}
              />
              <Image
                source={selectedProduct.pngImage}
                style={styles.mainCaptureButtonImage}
              />
              <View style={styles.innerMainCaptureButton} />
              <Text style={styles.mainCaptureButtonText}>
                {selectedProduct.name}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Sağ yan ürün */}
          <TouchableOpacity
            style={styles.sideProduct}
            onPress={switchToNextProduct}
          >
            <Animated.View
              style={[
                styles.sideProductContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Image
                source={getNextProduct().pngImage}
                style={styles.sideProductImage}
              />
              <Text style={styles.sideProductName}>
                {getNextProduct().name}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>

      {/* Swipe indicator */}
      <View style={styles.swipeIndicator}>
        <Text style={styles.swipeText}>← Kaydır →</Text>
      </View>
      {/* Side controls */}
      <View style={styles.sideControls}>
        <TouchableOpacity
          onPress={() =>
            setCameraFacing((current) =>
              current === "front" ? "back" : "front"
            )
          }
          style={styles.sideButton}
        >
          <Ionicons name="camera-reverse" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Top Bar Styles
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topBarGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  topProductImage: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  productDescription: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: "400",
    marginTop: 2,
  },
  helpButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "transparent",
    width: 30,
    height: 30,
    borderRadius: 25,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.text,
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 20,
  },
  helpIcon: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "600",
  },

  // Product Info Overlay
  productInfoOverlay: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    zIndex: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  productInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  productInfoImage: {
    width: 50,
    height: 50,
    resizeMode: "contain",
    marginRight: 12,
  },
  productInfoContent: {
    flex: 1,
  },
  productInfoTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  productInfoPrice: {
    color: "#FF6B35",
    fontSize: 16,
    fontWeight: "600",
  },
  closeInfoButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(92, 58, 33, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfoDescription: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "left",
  },
  productInfoFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    color: COLORS.text,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  productInfoActions: {
    alignItems: "center",
  },
  infoActionButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  infoActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Bottom Container
  bottomContainer: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 30,
  },

  // Side Products
  sideProduct: {
    alignItems: "center",
    opacity: 0.7,
  },
  sideProductContainer: {
    alignItems: "center",
    padding: 12,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(10px)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 100,
    width: 60,
    height: 60,
    transform: [{ scale: 0.8 }],
  },
  sideProductImage: {
    width: 45,
    height: 45,
    resizeMode: "contain",
  },
  sideProductName: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
    maxWidth: 70,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Main Capture Button
  mainCaptureButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  captureButtonGradient: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  innerMainCaptureButton: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
    backgroundColor: "rgba(255,255,255,0.15)",
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  mainCaptureButtonImage: {
    width: 65,
    height: 65,
    resizeMode: "contain",
    zIndex: 1,
  },
  mainCaptureButtonText: {
    color: COLORS.background,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
    position: "absolute",
    bottom: -30,
    left: 0,
    right: 0,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Swipe Indicator
  swipeIndicator: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  swipeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Side Controls
  sideControls: {
    position: "absolute",
    left: 10,
    top: "35%",
    alignItems: "center",
  },
  sideButton: {
    width: 35,
    height: 35,
    borderRadius: 100,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.background,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },


  // Status Overlays
  statusOverlay: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statusText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  // Permission Screen
  permissionScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  permissionTitle: {
    color: COLORS.background,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  permissionText: {
    color: COLORS.background,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.9,
  },
  permissionButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  permissionButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },

  // Preview Screen Styles
  previewHeader: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  productBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignSelf: "flex-start",
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  productBadgeImage: {
    width: 35,
    height: 35,
    resizeMode: "contain",
    marginRight: 12,
  },
  productBadgeContent: {
    flex: 1,
  },
  productBadgeTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  productBadgeSubtitle: {
    color: "#FF6B35",
    fontSize: 12,
    fontWeight: "500",
  },
  previewActions: {
    position: "absolute",
    bottom: 100,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 90,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  shareButton: {
    backgroundColor: "#4285F4",
  },
  buyButton: {
    backgroundColor: "#FF6B35",
  },
  closeButton: {
    backgroundColor: COLORS.text,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
});

export default RealTimeScreen;
