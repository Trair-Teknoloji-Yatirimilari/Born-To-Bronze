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
      y: y1 + (y2 - y1) * t
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
    
    if (distance(lastPoint.x, lastPoint.y, currentPoint.x, currentPoint.y) >= minDistance) {
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
  
  allPoints.forEach(point => {
    const key = `${Math.round(point.x)},${Math.round(point.y)}`;
    if (!uniquePoints.has(key)) {
      uniquePoints.add(key);
      mergedPoints.push(point);
    }
  });
  
  return optimizePoints(mergedPoints);
}

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
    // Ekran sınırlarını kontrol et
    if (
      x < 0 ||
      x > Dimensions.get("window").width - 40 ||
      y < 0 ||
      y > 400
    ) {
      return;
    }

    if (lastPoint) {
      // Son nokta ile şimdiki nokta arasına ara noktalar ekle
      const newPoints = interpolatePoints(lastPoint.x, lastPoint.y, x, y);
      setCurrentPath(prev => optimizePoints([...prev, ...newPoints]));
    } else {
      setCurrentPath([{ x, y }]);
    }
    
    setLastPoint({ x, y });
  };

  const onGestureStart = () => {
    setIsDrawing(true);
    setLastPoint(null);
  };

  const onGestureEnd = () => {
    setIsDrawing(false);
    if (currentPath.length > 0) {
      // Mevcut path'i paths'e ekle ve optimize et
      const optimizedPaths = mergePaths([...paths, currentPath]);
      setPaths([optimizedPaths]);
      setCurrentPath([]);
    }
    setLastPoint(null);
  };

  // Silme modu için yeni fonksiyon
  const handleErase = (x, y) => {
    if (!eraseMode) return;

    const newPaths = paths.map(path => 
      path.filter(point => {
        const dx = point.x - x;
        const dy = point.y - y;
        return dx * dx + dy * dy >= BRUSH_RADIUS_SQ;
      })
    ).filter(path => path.length > 0);

    setPaths(newPaths);
  };

  // Silme modu için gesture handler
  const onEraseGestureEvent = (event) => {
    if (!eraseMode) return;
    const { x, y } = event.nativeEvent;
    handleErase(x, y);
  };

  const applyBronzeEffect = async () => {
    if (!image) {
      Alert.alert("Uyarı", "Lütfen önce bir fotoğraf seçin!");
      return;
    }

    if (paths.length === 0) {
      Alert.alert("Uyarı", "Lütfen önce bronzlaştırılacak alanı seçin!");
      return;
    }

    if (!selectedProduct) {
      Alert.alert("Uyarı", "Lütfen bir bronzlaştırıcı ürün seçin!");
      return;
    }

    setLoading(true);
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        image,
        [
          {
            tint: selectedProduct.color,
            intensity: selectedProduct.intensity,
          },
        ],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImage(manipulatedImage.uri);
    } catch (error) {
      Alert.alert("Hata", "Fotoğraf düzenlenirken bir hata oluştu!");
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
    Alert.alert("Fotoğrafı Temizle", "Fotoğrafı temizlemek istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      { text: "Temizle", onPress: () => {
        setImage(null);
      } }
    ]);
  };  


  
  // Base64'ten RGB array çıkaran yardımcı fonksiyon
  function getRGBArrayFromBase64(base64) {
    console.log("Fonksiyon çağrıldı. Base64:", base64);
    // PNG veya JPEG base64'ten doğrudan pikselleri almak mümkün değil, ancak küçük boyutlu (ör: 20x20) crop ile yaklaşık analiz yapılabilir.
    // Burada base64'i decode edip, byte dizisinden RGB'leri çıkarıyoruz (sadece demo amaçlı, gerçek projede native çözüm önerilir)
    // Bu fonksiyonun doğruluğu base64 formatına ve platforma göre değişebilir.
    // Burada sadece örnek amaçlı, base64'i Buffer ile decode edip, RGB'leri tahmini olarak alıyoruz.
    try {
      const buffer = Buffer.from(base64, "base64");
      // PNG ise ilk 8 byte header, JPEG ise farklı. Burada kaba bir şekilde RGB'leri arıyoruz.
      // Gerçek projede pikselleri almak için native modül gerekir.
      // Burada sadece demo amaçlı, buffer'da ardışık 3 byte'ı RGB olarak alıyoruz.
      let rgbs = [];
      for (let i = 0; i < buffer.length - 3; i += 4) {
        const r = buffer[i];
        const g = buffer[i + 1];
        const b = buffer[i + 2];
        if (r !== undefined && g !== undefined && b !== undefined) {
          rgbs.push([r, g, b]);
        }
      }
      return rgbs;
    } catch (e) {
      return [];
    }
  }

  // En çok tekrar eden rengi bul
  function getMostFrequentColor(rgbArray) {
    // Siyah ve beyazı ve çok koyu/açık renkleri filtrele
    const filtered = rgbArray.filter(([r, g, b]) => {
      const sum = r + g + b;
      // Tam siyah, tam beyaz, çok koyu (<80), çok açık (>650) renkleri çıkar
      if (
        (r === 0 && g === 0 && b === 0) ||
        (r === 255 && g === 255 && b === 255)
      )
        return false;
      if (sum < 80 || sum > 650) return false;
      return true;
    });
    if (filtered.length === 0) return [200, 160, 120]; // fallback: açık ten rengi
    
    // Renk gruplarını oluştur (benzer renkleri birleştir)
    const colorGroups = {};
    filtered.forEach(([r, g, b]) => {
      // Renkleri 10'ar birimlik gruplara ayır
      const groupR = Math.floor(r / 10) * 10;
      const groupG = Math.floor(g / 10) * 10;
      const groupB = Math.floor(b / 10) * 10;
      const key = `${groupR},${groupG},${groupB}`;
      colorGroups[key] = (colorGroups[key] || 0) + 1;
    });

    // En çok tekrar eden rengi bul
    let maxColor = null;
    let maxCount = 0;
    Object.entries(colorGroups).forEach(([key, count]) => {
      if (count > maxCount) {
        maxCount = count;
        const [r, g, b] = key.split(',').map(Number);
        maxColor = [r, g, b];
      }
    });

    return maxColor;
  }

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

  // Ortalama renk hesaplama fonksiyonu
  function getAverageColor(rgbArray) {
    const filtered = rgbArray.filter(([r, g, b]) => {
      const sum = r + g + b;
      // Griye yakın renkleri filtreleme eşiği artırıldı
      if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(b - r) < 15)
        return false;
      if (
        (r === 0 && g === 0 && b === 0) ||
        (r === 255 && g === 255 && b === 255)
      )
        return false;
      // Renk aralığı filtrelemesi daraltıldı
      if (sum < 150 || sum > 650) return false;
      return true;
    });
    if (filtered.length === 0) return [200, 160, 120];
    const total = filtered.reduce(
      (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
      [0, 0, 0]
    );
    return [
      Math.round(total[0] / filtered.length),
      Math.round(total[1] / filtered.length),
      Math.round(total[2] / filtered.length),
    ];
  }

  // Mask noktalarını crop ve küçültülmüş görsele göre normalize et
  function getNormalizedMask(paths, bbox, cropRect, downscaleSize) {
    const allPoints = paths.flat();
    const mask = allPoints.map(({ x, y }) => {
      // Önce crop alanına göre normalize et
      const relX = x - bbox.minX;
      const relY = y - bbox.minY;
      
      // Orijinal görsel boyutlarına göre ölçekle
      const scaleX = cropRect.width / (bbox.maxX - bbox.minX);
      const scaleY = cropRect.height / (bbox.maxY - bbox.minY);
      
      // Küçültülmüş görsele göre normalize et
      const normX = (relX * scaleX * downscaleSize) / cropRect.width;
      const normY = (relY * scaleY * downscaleSize) / cropRect.height;
      
      return [Math.round(normX), Math.round(normY)];
    });
    return mask;
  }

  // Ten rengini bulma butonuna basınca
  const handleFindSkinColor = () => {
    if (!image || paths.length === 0) {
      Alert.alert("Uyarı", "Lütfen önce fotoğraf seçip alanı işaretleyin!");
      return;
    }
    findSkinColor();
  };

  const findSkinColor = async () => {
    if (!image || paths.length === 0) {
      Alert.alert("Uyarı", "Lütfen önce fotoğraf seçip alanı işaretleyin!");
      return;
    }
    setFindingSkin(true);
    try {
      // Görsel boyutunu al
      const imgWidth = Dimensions.get("window").width - 40;
      const imgHeight = 400;
      
      // Seçili alanın bounding box'unu bul
      const bbox = getBoundingBox(paths);
      if (!bbox) throw new Error("Seçili alan yok");
      if (bbox.maxX - bbox.minX < 20 || bbox.maxY - bbox.minY < 20) {
        setFindingSkin(false);
        Alert.alert("Uyarı", "Daha büyük bir alan seçmelisiniz.");
        return;
      }

      // Orijinal görsel boyutlarını al
      const manipMeta = await ImageManipulator.manipulateAsync(image, [], {
        base64: false,
      });
      const origWidth = manipMeta.width;
      const origHeight = manipMeta.height;
      
      // Ekrandaki görsel ile orijinal görsel arasındaki ölçek oranlarını hesapla
      const scaleX = origWidth / imgWidth;
      const scaleY = origHeight / imgHeight;
      
      // Crop koordinatlarını hesapla
      let originX = Math.max(Math.round(bbox.minX * scaleX), 0);
      let originY = Math.max(Math.round(bbox.minY * scaleY), 0);
      let width = Math.max(Math.round((bbox.maxX - bbox.minX) * scaleX), 1);
      let height = Math.max(Math.round((bbox.maxY - bbox.minY) * scaleY), 1);
      
      // Sınırları kontrol et
      if (originX + width > origWidth) width = origWidth - originX;
      if (originY + height > origHeight) height = origHeight - originY;
      if (width < 1 || height < 1) throw new Error("Seçili alan çok küçük veya geçersiz.");
      
      const cropRect = { originX, originY, width, height };
      
      // Crop ve küçültme işlemi
      const manipulated = await ImageManipulator.manipulateAsync(
        image,
        [
          { crop: cropRect },
          { resize: { width: DOWNSCALE_SIZE, height: DOWNSCALE_SIZE } },
        ],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // Mask noktalarını normalize et
      const mask = getNormalizedMask(paths, bbox, cropRect, DOWNSCALE_SIZE);
      
      // Base64'ün başındaki data:image/jpeg;base64, kısmını temizle
      const base64 = manipulated.base64.replace(/^data:image\/(png|jpeg);base64,/, "");
      
      // Backend'e gönder
      const response = await fetch("http://10.0.2.2:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          base64, 
          mask,
          originalSize: { width: origWidth, height: origHeight },
          cropSize: { width, height },
          downscaleSize: DOWNSCALE_SIZE
        }),
      });
      
      if (!response.ok) throw new Error("Sunucu hatası: " + response.status);
      const { mod, avg } = await response.json();
      setSkinColor({ mod, avg, preview: manipulated.uri });
    } catch (e) {
      Alert.alert("Hata", `Ten rengi analizinde hata oluştu: ${e.message}`);
    } finally {
      setFindingSkin(false);
    }
  };

  return (
    <LinearGradient colors={["#FFE5B4", "#FFD700"]} style={styles.container}>
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

          {findingSkin && (
            <Modal transparent visible animationType="fade">
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#CD7F32" />
                <Text style={styles.loadingText}>
                  Ten rengi analiz ediliyor...
                </Text>
              </View>
            </Modal>
          )}

          {image ? (
            <View style={styles.imageContainer}>
              <PanGestureHandler
                onGestureEvent={eraseMode ? onEraseGestureEvent : onGestureEvent}
                onBegan={onGestureStart}
                onEnded={onGestureEnd}
                onCancelled={onGestureEnd}
              >
                <View>
                  <Image
                    source={{ uri: image }}
                    style={styles.image}
                    ref={imageRef}
                  />
                  <Svg
                    style={StyleSheet.absoluteFill}
                    width={Dimensions.get("window").width - 40}
                    height={400}
                  >
                    {paths.map((path, i) =>
                      path.map((point, j) => (
                        <Circle
                          key={`p${i}-${j}`}
                          cx={point.x}
                          cy={point.y}
                          r={BRUSH_RADIUS}
                          fill={BRUSH_COLOR}
                        />
                      ))
                    )}
                    {currentPath.map((point, j) => (
                      <Circle
                        key={`c-${j}`}
                        cx={point.x}
                        cy={point.y}
                        r={BRUSH_RADIUS}
                        fill={BRUSH_COLOR}
                      />
                    ))}
                  </Svg>
                </View>
              </PanGestureHandler>

              <View style={styles.floatingButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.floatingButton,
                    eraseMode ? styles.eraseActive : null,
                  ]}
                  onPress={() => setEraseMode((v) => !v)}
                >
                  <Text style={styles.buttonText}>
                    {eraseMode ? (
                      <Ionicons
                        name="arrow-undo"
                        size={16}
                        color={eraseMode ? "white" : "gray"}
                      />
                    ) : (
                      <Ionicons
                        name="arrow-undo"
                        size={16}
                        color={eraseMode ? "white" : "gray"}
                      />
                    )}
                  </Text>
                </TouchableOpacity>
                {/* Fırça Kontrol Butonu */}
                <TouchableOpacity
                  style={styles.floatingButton}
                  onPress={toggleBrushControls}
                >
                  <Ionicons
                    name={showBrushControls ? "brush" : "brush-outline"}
                    size={16}
                    color={"gray"}
                  />
                </TouchableOpacity>
                {/* //Sıfırla butonu */}
                {image && (
                  <>
                    <TouchableOpacity
                      style={[styles.floatingButton]}
                      onPress={clearDrawing}
                    >
                      <Ionicons name="trash" size={16} color={"gray"} />
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={styles.floatingButton}>
                  <Ionicons name="information" size={24} color={"gray"} />
                </TouchableOpacity>
              </View>
              {/* //Kapat butonu Yani seçilen fotoğrafı kapat */}
              <TouchableOpacity
                style={styles.floatingCloseButton}
                onPress={clearImage}
              >
                <Ionicons name="close" size={24} color={"white"} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Fotoğraf seçilmedi</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={pickImage}>
              <Ionicons name="image" size={24} color={"white"} />
            </TouchableOpacity>
            <Text style={styles.buttonText}>Veya</Text>
            <View style={{ width: 10 }} />
            <TouchableOpacity style={styles.button} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color={"white"} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleFindSkinColor}
            disabled={findingSkin}
          >
            <Text style={styles.buttonText}>
              {findingSkin ? "Ten Rengi Bulunuyor..." : "Ten Rengini Bul"}
            </Text>
          </TouchableOpacity>

          {skinColor && (
            <View style={styles.skinColorResult}>
              <View style={{ alignItems: "center", marginRight: 10 }}>
                <Image
                  source={{ uri: skinColor.preview }}
                  style={styles.previewBox}
                />
                <Text style={styles.previewLabel}>Seçili Alan</Text>
              </View>
              <View
                style={[
                  styles.skinColorBox,
                  {
                    backgroundColor: `rgb(${skinColor.mod[0]},${skinColor.mod[1]},${skinColor.mod[2]})`,
                  },
                ]}
              />
              <View style={{ flexDirection: "column", marginLeft: 10 }}>
                <Text style={styles.skinColorText}>
                  Mod (Baskın): RGB {skinColor.mod.join(", ")} | HEX #
                  {skinColor.mod
                    .map((x) => x.toString(16).padStart(2, "0"))
                    .join("")
                    .toUpperCase()}
                </Text>
                <View style={{ height: 6 }} />
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={[
                      styles.skinColorBox,
                      {
                        backgroundColor: `rgb(${skinColor.avg[0]},${skinColor.avg[1]},${skinColor.avg[2]})`,
                        width: 30,
                        height: 30,
                        marginRight: 8,
                      },
                    ]}
                  />
                  <Text style={styles.skinColorText}>
                    Ortalama: RGB {skinColor.avg.join(", ")} | HEX #
                    {skinColor.avg
                      .map((x) => x.toString(16).padStart(2, "0"))
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Fırça Kontrolleri */}
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
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.secondary}
                thumbTintColor={COLORS.primary}
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
          <View style={styles.productContainer}>
            <Text style={styles.productTitle}>Bronzlaştırıcı Ürünler</Text>
            <View style={styles.productList}>
              {BRONZE_PRODUCTS.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productButton,
                    selectedProduct?.id === product.id &&
                      styles.selectedProduct,
                  ]}
                  onPress={() => setSelectedProduct(product)}
                >
                  <View
                    style={[
                      styles.productColor,
                      { backgroundColor: product.color },
                    ]}
                  />
                  <Text style={styles.productName}>{product.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.bronzeButton]}
            onPress={applyBronzeEffect}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Bronz Efekti Uygula</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
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
    flex: 1,
    padding: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#8B4513",
    marginBottom: 20,
  },
  imageContainer: {
    width: "100%",
    height: "auto",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: 400,
    borderRadius: 10,
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
    backgroundColor: "#8B4513",
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
    backgroundColor: "#CD7F32",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  productContainer: {
    width: "100%",
    marginVertical: 10,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8B4513",
    marginBottom: 10,
  },
  productList: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  productButton: {
    flex: 1,
    minWidth: "30%",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#8B4513",
  },
  selectedProduct: {
    backgroundColor: "#FFE5B4",
    borderWidth: 2,
  },
  productColor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 5,
  },
  productName: {
    fontSize: 12,
    color: "#8B4513",
    textAlign: "center",
  },
  floatingButtonContainer: {
    position: "absolute",
    left: 5,
    top: 10,
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
    // backgroundColor: "red",
    zIndex: 1000,
  },
  floatingButton: {
    backgroundColor: "transparent",
    width: 30,
    height: 30,
    borderRadius: 25,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "gray",
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

  skinColorResult: {
    flexDirection: "column",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
    backgroundColor: "#FFF8E1",
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  skinColorBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginRight: 5,
  },
  skinColorText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
    fontWeight: "500",
  },
  desc: {
    fontSize: 15,
    color: "#6B4F1D",
    textAlign: "center",
    marginBottom: 10,
    marginTop: -10,
    fontStyle: "italic",
    letterSpacing: 0.2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    width: "100%",
    justifyContent: "center",
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
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
  previewBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 2,
  },
  previewLabel: {
    fontSize: 11,
    color: "#6B4F1D",
    textAlign: "center",
    marginTop: 2,
    fontStyle: "italic",
  },
  brushSizeIndicator: {
    position: "absolute",
    top: SIZES.padding * 2,
    right: SIZES.padding * 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: "center",
  },
  brushPreview: {
    backgroundColor: BRUSH_COLOR,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.background,
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
    backgroundColor: COLORS.primary,
  },
  brushPresetText: {
    ...FONTS.medium,
    color: COLORS.background,
  },
});

export default PhotoEditScreen;
