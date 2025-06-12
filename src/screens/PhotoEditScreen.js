import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Modal,
  Animated,
  Platform,
  ImageBackground,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { PanGestureHandler } from "react-native-gesture-handler";
import { Buffer } from "buffer";
import { COLORS, SIZES, FONTS } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";

const BRONZE_PRODUCTS = [
  {
    id: 1,
    name: "Altın Bronz",
    color: "#CD7F32",
    intensity: 0.7,
    image: "https://example.com/gold-bronze.png",
  },
  {
    id: 2,
    name: "Koyu Bronz",
    color: "#8B4513",
    intensity: 0.9,
    image: "https://example.com/dark-bronze.png",
  },
  {
    id: 3,
    name: "Açık Bronz",
    color: "#D2B48C",
    intensity: 0.5,
    image: "https://example.com/light-bronze.png",
  },
];

// Fırça boyutu için sabitleri güncelliyoruz
const MIN_BRUSH_RADIUS = 5;
const MAX_BRUSH_RADIUS = 50;
const DEFAULT_BRUSH_RADIUS = 20;

const BRUSH_COLOR = "rgba(0,255,0,0.3)";
let BRUSH_RADIUS = DEFAULT_BRUSH_RADIUS;
let BRUSH_RADIUS_SQ = BRUSH_RADIUS * BRUSH_RADIUS;
const DOWNSCALE_SIZE = 160; // Daha yüksek çözünürlük için artırıldı

// İki nokta arasındaki mesafeyi hesaplayan fonksiyon
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// İki nokta arasına ara noktalar ekleyen fonksiyon
function interpolatePoints(x1, y1, x2, y2) {
  const points = [];
  const dist = distance(x1, y1, x2, y2);
  const steps = Math.max(Math.floor(dist / (BRUSH_RADIUS / 2)), 1);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t,
    });
  }
  return points;
}

// Noktaları optimize eden fonksiyon
function optimizePoints(points) {
  if (points.length <= 2) return points;

  const optimized = [points[0]];
  const minDistance = BRUSH_RADIUS / 2;

  for (let i = 1; i < points.length; i++) {
    const lastPoint = optimized[optimized.length - 1];
    const currentPoint = points[i];

    if (
      distance(lastPoint.x, lastPoint.y, currentPoint.x, currentPoint.y) >=
      minDistance
    ) {
      optimized.push(currentPoint);
    }
  }

  return optimized;
}

// Noktaları birleştiren fonksiyon
function mergePaths(paths) {
  const allPoints = paths.flat();
  const uniquePoints = new Set();
  const mergedPoints = [];

  allPoints.forEach((point) => {
    const key = `${Math.round(point.x)},${Math.round(point.y)}`;
    if (!uniquePoints.has(key)) {
      uniquePoints.add(key);
      mergedPoints.push(point);
    }
  });

  return optimizePoints(mergedPoints);
}

// Koordinatları normalize eden fonksiyon
function normalizeCoordinates(paths, imageWidth, imageHeight) {
  return paths.map((path) =>
    path.map((point) => ({
      x: point.x / imageWidth,
      y: point.y / imageHeight,
    }))
  );
}

// Koordinatları denormalize eden fonksiyon
function denormalizeCoordinates(normalizedPaths, imageWidth, imageHeight) {
  return normalizedPaths.map((path) =>
    path.map((point) => ({
      x: point.x * imageWidth,
      y: point.y * imageHeight,
    }))
  );
}

// Mask noktalarını optimize eden fonksiyon (2x2 grid ve tekrarları engelle)
function optimizeMaskPoints(
  points,
  origWidth,
  origHeight,
  imgWidth,
  imgHeight,
  brushSize
) {
  const scaleX = origWidth / imgWidth;
  const scaleY = origHeight / imgHeight;
  const absBrush = Math.ceil(brushSize * scaleX);
  const grid = new Set();
  const mask = [];
  points.forEach((pt) => {
    const absX = Math.round(pt.x * scaleX);
    const absY = Math.round(pt.y * scaleY);
    for (let dy = -absBrush; dy <= absBrush; dy += 2) {
      for (let dx = -absBrush; dx <= absBrush; dx += 2) {
        if (dx * dx + dy * dy <= absBrush * absBrush) {
          const gx = Math.floor((absX + dx) / 2) * 2;
          const gy = Math.floor((absY + dy) / 2) * 2;
          const key = `${gx},${gy}`;
          if (!grid.has(key)) {
            grid.add(key);
            mask.push({ x: gx, y: gy });
          }
        }
      }
    }
  });
  return mask;
}

const API_URL = __DEV__
  ? Platform.select({
      ios: "http://localhost:5000",
      android: "http://10.0.2.2:5000",
    })
  : "https://your-production-api.com";

const PhotoEditScreen = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [skinColor, setSkinColor] = useState(null);
  const [findingSkin, setFindingSkin] = useState(false);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_RADIUS);
  const [showBrushControls, setShowBrushControls] = useState(false);
  const brushControlsAnimation = useRef(new Animated.Value(0)).current;
  const imageRef = useRef(null);
  const [canvasModal, setCanvasModal] = useState({
    visible: false,
    handleCanvas: null,
  });
  const [lastPoint, setLastPoint] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [brushPos, setBrushPos] = useState(null);
  const [filterColor, setFilterColor] = useState(null); // Demo için seçili alanın üstüne uygulanacak renk
  const [filteredModal, setFilteredModal] = useState({
    visible: false,
    url: null,
  });

  // Fırça boyutunu güncelleme fonksiyonu
  const updateBrushSize = (size) => {
    BRUSH_RADIUS = size;
    BRUSH_RADIUS_SQ = size * size;
    setBrushSize(size);
  };

  // Fırça kontrollerini göster/gizle
  const toggleBrushControls = () => {
    const toValue = showBrushControls ? 0 : 1;
    setShowBrushControls(!showBrushControls);
    Animated.spring(brushControlsAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const pickImage = async () => {
    console.log("Galeri açılıyor...");
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Hata", "Galeriye erişim izni gerekiyor!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      console.log("Fotoğraf seçildi:", result.assets[0].uri);
      setImage(result.assets[0].uri);
      setPaths([]);
      setCurrentPath([]);
      setSelectedProduct(null);
    }
  };

  const takePhoto = async () => {
    console.log("Kamera açılıyor...");
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Hata", "Kamera erişim izni gerekiyor!");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      console.log("Fotoğraf çekildi:", result.assets[0].uri);
      setImage(result.assets[0].uri);
      setPaths([]);
      setCurrentPath([]);
      setSelectedProduct(null);
    }
  };

  const onGestureEvent = (event) => {
    const { x, y } = event.nativeEvent;
    setBrushPos({ x, y });
    if (x < 0 || x > Dimensions.get("window").width - 40 || y < 0 || y > 400) {
      return;
    }
    if (lastPoint) {
      const newPoints = interpolatePoints(lastPoint.x, lastPoint.y, x, y);
      setCurrentPath((prev) => optimizePoints([...prev, ...newPoints]));
    } else {
      setCurrentPath([{ x, y }]);
    }
    setLastPoint({ x, y });
  };

  const onGestureStart = (event) => {
    setIsDrawing(true);
    setLastPoint(null);
    if (event && event.nativeEvent) {
      const { x, y } = event.nativeEvent;
      setCurrentPath([{ x, y }]);
      setBrushPos({ x, y });
    }
  };

  const onGestureEnd = () => {
    setIsDrawing(false);
    setBrushPos(null);
    if (currentPath.length > 0) {
      // Mevcut path'i paths'e ayrı olarak ekle
      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath([]);
    }
    setLastPoint(null);
  };

  // Silgi fonksiyonunu güncelliyorum
  const handleErase = (x, y) => {
    if (!eraseMode) return;
    // Dairesel alanı sil
    const newPaths = paths
      .map((path) =>
        path.filter((point) => {
          const dx = point.x - x;
          const dy = point.y - y;
          return dx * dx + dy * dy >= brushSize * brushSize;
        })
      )
      .filter((path) => path.length > 0);
    setPaths(newPaths);
  };

  // Silgi için gesture event
  const onEraseGestureEvent = (event) => {
    const { x, y } = event.nativeEvent;
    setBrushPos({ x, y });
    handleErase(x, y);
  };

  // Image yüklendiğinde boyutlarını al
  const onImageLoad = (event) => {
    const { width, height } = event.nativeEvent.source;
    setImageDimensions({ width, height });
  };

  const applyBronzeEffect = async () => {
    if (!image || paths.length === 0) {
      Alert.alert("Hata", "Lütfen bir fotoğraf seçin ve alan işaretleyin!");
      return;
    }
    setLoading(true);
    try {
      // Fotoğrafı küçült ve kaliteyi düşür
      const manipMeta = await ImageManipulator.manipulateAsync(
        image,
        [{ resize: { width: 800 } }],
        { base64: true, compress: 0.7 }
      );
      const origWidth = manipMeta.width;
      const origHeight = manipMeta.height;
      const imgWidth = Dimensions.get("window").width - 40;
      const imgHeight = 400;
      const bbox = getBoundingBox(paths);
      // Mask noktalarını optimize et
      const mask = optimizeMaskPoints(
        paths.flat(),
        origWidth,
        origHeight,
        imgWidth,
        imgHeight,
        brushSize
      );
      // Backend'e gönder
      const response = await fetch(`${API_URL}/bronze-effect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: manipMeta.base64, mask }),
      });
      const data = await response.json();
      if (data && data.url) {
        setFilteredModal({ visible: true, url: data.url });
      } else {
        Alert.alert("Hata", "Filtrelenmiş fotoğraf alınamadı.");
      }
    } catch (e) {
      Alert.alert("Hata", "Filtre uygulanırken hata oluştu: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const clearDrawing = () => {
    Alert.alert(
      "Çizimleri Temizle",
      "Çizimleri temizlemek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Temizle",
          onPress: () => {
            setPaths([]);
            setCurrentPath([]);
          },
        },
      ]
    );
  };

  const clearImage = () => {
    Alert.alert(
      "Fotoğrafı Temizle",
      "Fotoğrafı temizlemek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Temizle",
          onPress: () => {
            setImage(null);
          },
        },
      ]
    );
  };

  // Seçili alanı saran dikdörtgeni bul
  function getBoundingBox(paths) {
    const allPoints = paths.flat();
    if (allPoints.length === 0) return null;
    const xs = allPoints.map((p) => p.x);
    const ys = allPoints.map((p) => p.y);
    const minX = Math.max(Math.min(...xs) - BRUSH_RADIUS, 0);
    const minY = Math.max(Math.min(...ys) - BRUSH_RADIUS, 0);
    const maxX = Math.max(...xs) + BRUSH_RADIUS;
    const maxY = Math.max(...ys) + BRUSH_RADIUS;
    return { minX, minY, maxX, maxY };
  }

  return (
    <ImageBackground
      source={require("../assets/welcome-bg.png")}
      style={styles.background}
    >
      <LinearGradient
        colors={["rgba(244, 235, 208, 0.5)", "rgba(244, 235, 208, 1)"]}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Bronzlaştırıcı Efekt</Text>
            <Text style={styles.desc}>
              Seçmek istediğiniz vücut bölgesini parmağınızla boyayın. Yanlış
              seçimleri silme modunda silebilirsiniz.
            </Text>

            {loading && (
              <Modal transparent visible animationType="fade">
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#CD7F32" />
                  <Text style={styles.loadingText}>
                    Bronz efekti uygulanıyor...
                  </Text>
                </View>
              </Modal>
            )}

            {image ? (
              <View style={styles.imageContainer}>
                <Image
                  ref={imageRef}
                  source={{ uri: image }}
                  style={styles.image}
                  onLoad={onImageLoad}
                />
                <PanGestureHandler
                  onGestureEvent={
                    eraseMode ? onEraseGestureEvent : onGestureEvent
                  }
                  onHandlerStateChange={({ nativeEvent }) => {
                    if (nativeEvent.state === 4) {
                      onGestureEnd();
                    } else if (nativeEvent.state === 2) {
                      onGestureStart(nativeEvent);
                    }
                  }}
                >
                  <Animated.View style={StyleSheet.absoluteFill}>
                    <Svg style={StyleSheet.absoluteFill}>
                      {paths.map((path, index) => (
                        <Path
                          key={index}
                          d={
                            path.reduce((acc, point, i) => {
                              if (i === 0) return `M ${point.x} ${point.y}`;
                              return `${acc} L ${point.x} ${point.y}`;
                            }, "") + (path.length > 2 ? " Z" : "")
                          }
                          stroke={BRUSH_COLOR}
                          strokeWidth={brushSize * 2}
                          fill="rgba(0,255,0,0.10)"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      ))}
                      {currentPath.length > 1 && (
                        <Path
                          d={currentPath.reduce((acc, point, i) => {
                            if (i === 0) return `M ${point.x} ${point.y}`;
                            return `${acc} L ${point.x} ${point.y}`;
                          }, "")}
                          stroke={BRUSH_COLOR}
                          strokeWidth={brushSize * 2}
                          fill="none"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      )}
                      {isDrawing && brushPos && !eraseMode && (
                        <Circle
                          cx={brushPos.x}
                          cy={brushPos.y}
                          r={brushSize}
                          fill={BRUSH_COLOR}
                          stroke="#00FF00"
                          strokeWidth={2}
                        />
                      )}
                      {isDrawing && brushPos && eraseMode && (
                        <Circle
                          cx={brushPos.x}
                          cy={brushPos.y}
                          r={brushSize}
                          fill="rgba(255,0,0,0.15)"
                          stroke="#FF0000"
                          strokeWidth={2}
                        />
                      )}
                    </Svg>
                  </Animated.View>
                </PanGestureHandler>

                <View style={styles.floatingButtonContainer}>
                  <TouchableOpacity
                    style={[
                      styles.floatingButton,
                      eraseMode ? styles.eraseActive : null,
                    ]}
                    onPress={() => setEraseMode((v) => !v)}
                  >
                    <Ionicons
                      name="brush"
                      size={16}
                      color={eraseMode ? COLORS.active : COLORS.text}
                    />
                  </TouchableOpacity>

                  {/* Fırça Kontrol Butonu */}
                  <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={toggleBrushControls}
                  >
                    <Ionicons
                      name={showBrushControls ? "brush" : "brush-outline"}
                      size={16}
                      color={COLORS.text}
                    />
                  </TouchableOpacity>

                  {/* Seçimi Temizle butonu */}
                  {image && (
                    <>
                      <TouchableOpacity
                        style={[styles.floatingButton]}
                        onPress={clearDrawing}
                      >
                        <Ionicons name="trash" size={16} color={COLORS.text} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Fotoğrafı Kaldır butonu */}
                <TouchableOpacity
                  style={styles.floatingCloseButton}
                  onPress={clearImage}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>Fotoğraf seçilmedi</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={pickImage}>
                <Ionicons name="image" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity style={styles.button} onPress={takePhoto}>
                <Ionicons name="camera" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.bronzeButton]}
              onPress={applyBronzeEffect}
              disabled={loading || !image || paths.length === 0}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.buttonText}>Bronz Efekti Uygula</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Filtrelenmiş fotoğraf modalı */}
        <Modal
          visible={filteredModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilteredModal({ visible: false, url: null })}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Image
                source={{ uri: `${API_URL}${filteredModal.url}` }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setFilteredModal({ visible: false, url: null })}
              >
                <Text style={styles.modalButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Fırça kontrolleri */}
        <Animated.View
          style={[
            styles.brushControls,
            {
              transform: [
                {
                  translateY: brushControlsAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [200, 0],
                  }),
                },
              ],
              opacity: brushControlsAnimation,
            },
          ]}
        >
          <View style={styles.brushControlsHeader}>
            <Text style={styles.brushControlsTitle}>Fırça Ayarları</Text>
            <TouchableOpacity
              onPress={toggleBrushControls}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={COLORS.background} />
            </TouchableOpacity>
          </View>

          <View style={styles.brushSizeContainer}>
            <Text style={styles.brushSizeText}>
              Fırça Boyutu: {Math.round(brushSize)}px
            </Text>
            <Slider
              style={styles.brushSlider}
              minimumValue={MIN_BRUSH_RADIUS}
              maximumValue={MAX_BRUSH_RADIUS}
              value={brushSize}
              onValueChange={updateBrushSize}
              minimumTrackTintColor={COLORS.text}
              maximumTrackTintColor={COLORS.text}
              thumbTintColor={COLORS.text}
            />
          </View>

          <View style={styles.brushPresets}>
            <TouchableOpacity
              style={[
                styles.brushPreset,
                brushSize === 10 && styles.selectedPreset,
              ]}
              onPress={() => updateBrushSize(10)}
            >
              <Text style={styles.brushPresetText}>İnce</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.brushPreset,
                brushSize === 20 && styles.selectedPreset,
              ]}
              onPress={() => updateBrushSize(20)}
            >
              <Text style={styles.brushPresetText}>Orta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.brushPreset,
                brushSize === 30 && styles.selectedPreset,
              ]}
              onPress={() => updateBrushSize(30)}
            >
              <Text style={styles.brushPresetText}>Kalın</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 10,
    alignItems: "center",
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
  },
  desc: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
    textAlign: "center",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.text,
    borderRadius: 10,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 1,
  },
  placeholder: {
    width: "100%",
    height: 400,
    backgroundColor: "transparent",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  placeholderText: {
    color: "#666",
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 10,
  },
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 140,
    marginHorizontal: 3,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bronzeButton: {
    width: "80%",
    marginTop: 20,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFF",
    fontSize: 18,
    marginTop: 10,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: 400,
    borderRadius: 10,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#CD7F32",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  brushControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    padding: SIZES.padding,
  },
  brushControlsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.padding,
  },
  brushControlsTitle: {
    ...FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.background,
  },
  closeButton: {
    padding: SIZES.base,
  },
  brushSizeContainer: {
    marginBottom: SIZES.padding,
  },
  brushSizeText: {
    ...FONTS.medium,
    color: COLORS.background,
    textAlign: "center",
    marginBottom: SIZES.base,
  },
  brushSlider: {
    width: "100%",
    height: 40,
  },
  brushPresets: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: SIZES.padding,
  },
  brushPreset: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    minWidth: 80,
    alignItems: "center",
  },
  selectedPreset: {
    backgroundColor: COLORS.button,
  },
  brushPresetText: {
    ...FONTS.medium,
    color: COLORS.text,
  },
  floatingButtonContainer: {
    position: "absolute",
    left: 5,
    top: 10,
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
    zIndex: 1000,
  },
  floatingButton: {
    backgroundColor: "transparent",
    width: 30,
    height: 30,
    borderRadius: 25,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.text,
    alignItems: "center",
  },
  floatingCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "transparent",
    width: 30,
    height: 30,
  },
  eraseActive: {
    backgroundColor: "#4CAF50",
  },
});

export default PhotoEditScreen;
