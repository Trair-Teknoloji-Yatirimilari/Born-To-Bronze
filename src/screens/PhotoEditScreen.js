import React, { useState, useRef, useEffect } from "react";
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
  useAnimatedValue,
  StatusBar,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import {
  FlatList,
  PanGestureHandler,
  State as GestureState,
} from "react-native-gesture-handler";
import { Buffer } from "buffer";
import { COLORS, SIZES, FONTS } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { PRODUCTS } from "../constants/products";
import DeviceInfo from 'react-native-device-info';

// Fırça boyutu için sabitleri güncelliyoruz
const MIN_BRUSH_RADIUS = 5;
const MAX_BRUSH_RADIUS = 50;
const DEFAULT_BRUSH_RADIUS = 15; // 20'den 15'e düşürdüm

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
function optimizePoints(points, brush) {
  if (points.length <= 2) return points;

  const optimized = [points[0]];
  const minDistance = (brush || BRUSH_RADIUS) / 6;

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

  return optimizePoints(mergedPoints, null);
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
  containerWidth,
  containerHeight,
  brushSize
) {
  console.log("🎯 Koordinat Debug:", {
    origSize: `${origWidth}x${origHeight}`,
    containerSize: `${containerWidth}x${containerHeight}`,
    pointCount: points.length,
    samplePoints: points.slice(0, 3).map(p => `(${p.x.toFixed(0)},${p.y.toFixed(0)})`)
  });

  // 9:16 aspect ratio için optimize edilmiş koordinat dönüşümü
  const imageRatio = origWidth / origHeight;
  const containerRatio = containerWidth / containerHeight;
  
  // ResizeMode "contain" için doğru scale hesaplama
  let scale, displayWidth, displayHeight, offsetX, offsetY;
  
  if (imageRatio < containerRatio) {
    // Image daha uzun - yükseklik sınırlayıcı
    scale = containerHeight / origHeight;
    displayHeight = containerHeight;
    displayWidth = origWidth * scale;
    offsetX = (containerWidth - displayWidth) / 2;
    offsetY = 0;
  } else {
    // Image daha geniş - genişlik sınırlayıcı  
    scale = containerWidth / origWidth;
    displayWidth = containerWidth;
    displayHeight = origHeight * scale;
    offsetX = 0;
    offsetY = (containerHeight - displayHeight) / 2;
  }

  console.log("📐 Transform:", {
    scale: scale.toFixed(4),
    displaySize: `${displayWidth.toFixed(0)}x${displayHeight.toFixed(0)}`,
    offset: `${offsetX.toFixed(0)},${offsetY.toFixed(0)}`
  });

  // Brush parametreleri - daha küçük ve odaklı alan için
  const absBrush = Math.min(Math.ceil(brushSize / scale), 15); // 25'ten 15'e düşürdüm
  const gridSize = Math.max(2, Math.floor(absBrush / 8)); // 6'dan 8'e çıkardım daha az nokta için

  const grid = new Set();
  const mask = [];
  
  points.forEach((pt, index) => {
    // Screen koordinatlarını display koordinatlarına dönüştür
    const relX = pt.x - offsetX;
    const relY = pt.y - offsetY;
    
    // Debug için ilk birkaç nokta
    if (index < 3) {
      console.log(`📍 Nokta ${index}:`, {
        screen: `(${pt.x.toFixed(0)}, ${pt.y.toFixed(0)})`,
        relative: `(${relX.toFixed(0)}, ${relY.toFixed(0)})`,
        displaySize: `${displayWidth.toFixed(0)}x${displayHeight.toFixed(0)}`,
        containerSize: `${containerWidth}x${containerHeight}`
      });
    }
    
    // Bounds kontrolü
    if (relX < 0 || relY < 0 || relX >= displayWidth || relY >= displayHeight) {
      if (index < 3) console.log(`❌ Nokta ${index} bounds dışında`);
      return;
    }

    // Image koordinatlarına dönüştür - Y'yi normal bırakıyorum
    let absX = Math.round(relX / scale);
    let absY = Math.round(relY / scale);
    
    // Platform-specific koordinat düzeltmeleri kaldırıldı
    // Doğrudan koordinat dönüşümü kullanılıyor

    if (index < 3) {
      console.log(`🎯 FRONTEND DEBUG - Nokta ${index}:`, {
        platform: Platform.OS,
        screen: `(${pt.x.toFixed(0)}, ${pt.y.toFixed(0)})`,
        relative: `(${relX.toFixed(0)}, ${relY.toFixed(0)})`,
        image: `(${absX}, ${absY})`,
        imagePercent: `(${(absX/origWidth*100).toFixed(1)}%, ${(absY/origHeight*100).toFixed(1)}%)`,
        bounds: `0-${origWidth-1}, 0-${origHeight-1}`,
        scale: scale.toFixed(4),
        transform: {
          screenToRelative: `(${pt.x} - ${offsetX.toFixed(0)}, ${pt.y} - ${offsetY.toFixed(0)})`,
          relativeToImage: `(${relX.toFixed(0)} / ${scale.toFixed(4)}, ${relY.toFixed(0)} / ${scale.toFixed(4)})`
        }
      });
    }

    if (absX < 0 || absY < 0 || absX >= origWidth || absY >= origHeight) {
      if (index < 3) console.log(`❌ Nokta ${index} image bounds dışında`);
      return;
    }
    
    // Brush alanı oluştur
    for (let dy = -absBrush; dy <= absBrush; dy += gridSize) {
      for (let dx = -absBrush; dx <= absBrush; dx += gridSize) {
        if (dx * dx + dy * dy <= absBrush * absBrush) {
          const gx = Math.floor((absX + dx) / gridSize) * gridSize;
          const gy = Math.floor((absY + dy) / gridSize) * gridSize;
          
          if (gx >= 0 && gy >= 0 && gx < origWidth && gy < origHeight) {
            const key = `${gx},${gy}`;
            if (!grid.has(key)) {
              grid.add(key);
              mask.push({ x: gx, y: gy });
            }
          }
        }
      }
    }
  });

  // Final mask analizi
  if (mask.length > 0) {
    const bounds = {
      minX: Math.min(...mask.map(p => p.x)),
      maxX: Math.max(...mask.map(p => p.x)),
      minY: Math.min(...mask.map(p => p.y)),
      maxY: Math.max(...mask.map(p => p.y))
    };
    
    console.log("🎨 Final Mask:", {
      count: mask.length,
      bounds: `(${bounds.minX},${bounds.minY}) → (${bounds.maxX},${bounds.maxY})`,
      center: `(${Math.round((bounds.minX + bounds.maxX)/2)}, ${Math.round((bounds.minY + bounds.maxY)/2)})`,
      area: `${bounds.maxX - bounds.minX}x${bounds.maxY - bounds.minY}`,
      positionPercent: {
        centerX: `${((bounds.minX + bounds.maxX)/2/origWidth*100).toFixed(1)}%`,
        centerY: `${((bounds.minY + bounds.maxY)/2/origHeight*100).toFixed(1)}%`
      }
    });
  }
  
  return mask;
}

const API_URL = __DEV__
  ? Platform.select({
      ios: "http://192.168.1.29:3000",
      android: "http://10.0.2.2:3000",
    })
  : "https://your-production-api.com";

// Device bilgilerini toplayan utility fonksiyon
const getDeviceInfo = async () => {
  try {
    const [
      uniqueId,
      deviceId,
      deviceName,
      brand,
      deviceType,
      systemName,
      systemVersion,
      userAgent,
      appVersion,
      buildNumber,
      bundleId,
      isEmulator,
      isTablet,
    ] = await Promise.all([
      DeviceInfo.getUniqueId(),
      DeviceInfo.getDeviceId(),
      DeviceInfo.getDeviceName(),
      DeviceInfo.getBrand(),
      DeviceInfo.getDeviceType(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getUserAgent(),
      DeviceInfo.getVersion(),
      DeviceInfo.getBuildNumber(),
      DeviceInfo.getBundleId(),
      DeviceInfo.isEmulator(),
      DeviceInfo.isTablet(),
    ]);

    return {
      uniqueId,
      deviceId,
      deviceName,
      deviceBrand: brand,
      deviceType,
      systemName,
      systemVersion,
      userAgent,
      appVersion,
      buildNumber,
      bundleId,
      isEmulator,
      isTablet,
    };
  } catch (error) {
    console.error('Device bilgileri alınırken hata:', error);
    return {
      uniqueId: null,
      deviceId: null,
      deviceName: null,
      deviceBrand: null,
      deviceType: null,
      systemName: Platform.OS,
      systemVersion: Platform.Version?.toString(),
      userAgent: null,
      appVersion: null,
      buildNumber: null,
      bundleId: null,
      isEmulator: false,
      isTablet: false,
    };
  }
};

const PhotoEditScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState(0); // 0: Fotoğraf seçme, 1: Alan Seçme, 2: Ürün seçme, 3: Bronzlaştır
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paths, setPaths] = useState([]); // { points: Point[], brush: number }
  const [currentPath, setCurrentPath] = useState({
    points: [],
    brush: DEFAULT_BRUSH_RADIUS,
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_RADIUS);
  const [showBrushControls, setShowBrushControls] = useState(false);
  const brushControlsAnimation = useRef(new Animated.Value(0)).current;
  const imageRef = useRef(null);
  const [lastPoint, setLastPoint] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [brushPos, setBrushPos] = useState(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [resultImage, setResultImage] = useState(null);
  const [resultImageId, setResultImageId] = useState(null); // Paylaş için gerekli
  const [showOriginal, setShowOriginal] = useState(false); // Before/After kontrolü
  const paintedRef = useRef(new Set()); // Boyanmış grid anahtarları
  const productAnimationValue = useRef(new Animated.Value(0)).current;
  const originalImageOpacity = useRef(new Animated.Value(0)).current;
  
  // Benzer fotoğraflar için state'ler
  const [similarPhotos, setSimilarPhotos] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // Bottom Tab Bar kontrolü - çizim aşamasında gizle
  useEffect(() => {
    if (step === 1 || step === 2) {
      // Çizim ve ürün seçimi aşamasında tab bar'ı gizle ve status bar'ı gizle
      navigation.setOptions({
        tabBarStyle: { display: 'none' }
      });
      StatusBar.setHidden(true, 'slide');
    } else {
      // Diğer aşamalarda tab bar'ı göster ve status bar'ı göster
      navigation.setOptions({
        tabBarStyle: {
          backgroundColor: COLORS.background,
          backdropFilter: "blur(10px)",
          borderTopWidth: 1,
          borderTopColor: COLORS.text,
          position: "absolute",
          height: 60,
          paddingBottom: 5,
        }
      });
      StatusBar.setHidden(false, 'slide');
    }
  }, [step, navigation]);

  // Component unmount olduğunda status bar'ı geri getir
  useEffect(() => {
    return () => {
      StatusBar.setHidden(false, 'slide');
    };
  }, []);

  // Result ekranında benzer fotoğrafları yükle
  useEffect(() => {
    if (step === 3 && selectedProduct?.id) {
      fetchSimilarPhotos(selectedProduct.id, resultImageId);
    }
  }, [step, selectedProduct?.id, resultImageId]);

  // Ürün seçimi ekranı animasyonu
  useEffect(() => {
    if (step === 2) {
      Animated.timing(productAnimationValue, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      productAnimationValue.setValue(0);
    }
  }, [step]);

  // Before/After görüntü kontrolü
  const showOriginalImage = () => {
    setShowOriginal(true);
    Animated.timing(originalImageOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideOriginalImage = () => {
    Animated.timing(originalImageOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowOriginal(false);
    });
  };

  // Paylaş fonksiyonu
  const sharePhoto = async () => {
    if (!resultImageId) {
      Alert.alert("Hata", "Paylaşılacak fotoğraf bulunamadı!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/public/phone/share-photo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: resultImageId,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          "Başarılı! 🎉", 
          "Fotoğrafınız başarıyla paylaşıldı! Şimdi diğer kullanıcılar da görebilir.",
          [
            {
              text: "Tamam",
              style: "default"
            }
          ]
        );
        // Paylaş sonrası benzer fotoğrafları yenile
        if (selectedProduct?.id) {
          fetchSimilarPhotos(selectedProduct.id, resultImageId);
        }
      } else {
        Alert.alert("Hata", result.error || "Paylaşım sırasında hata oluştu.");
      }
    } catch (error) {
      console.error("Paylaş hatası:", error);
      Alert.alert("Hata", "Paylaşım sırasında bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Benzer fotoğrafları getir
  const fetchSimilarPhotos = async (productId, currentImageId = null) => {
    if (!productId) return;
    
    setLoadingSimilar(true);
    try {
      const params = new URLSearchParams({
        productId: productId.toString(),
        limit: "10"
      });
      
      if (currentImageId) {
        params.append("currentImageId", currentImageId);
      }
      
      const response = await fetch(`${API_URL}/api/public/phone/similar-photos?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setSimilarPhotos(result.photos || []);
      } else {
        console.error("Benzer fotoğraflar alınamadı:", result.error);
        setSimilarPhotos([]);
      }
    } catch (error) {
      console.error("Benzer fotoğraflar hatası:", error);
      setSimilarPhotos([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Modal açma/kapama fonksiyonları
  const openPhotoModal = (photo) => {
    setSelectedPhotoModal(photo);
    Animated.timing(modalOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closePhotoModal = () => {
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setSelectedPhotoModal(null);
    });
  };

  // Hemen Satın Al fonksiyonu
  const handlePurchase = async () => {
    if (!selectedProduct || !selectedProduct.link) {
      Alert.alert("Hata", "Lütfen önce bir ürün seçin!");
      return;
    }

    try {
      const supported = await Linking.canOpenURL(selectedProduct.link);
      if (supported) {
        await Linking.openURL(selectedProduct.link);
      } else {
        Alert.alert("Hata", "Bu link açılamıyor: " + selectedProduct.link);
      }
    } catch (error) {
      console.error("Link açılırken hata:", error);
      Alert.alert("Hata", "Satın alma sayfası açılırken hata oluştu.");
    }
  };

  // Fırça boyutunu güncelleme fonksiyonu
  const updateBrushSize = (size) => {
    console.log("updateBrushSize", size);
    BRUSH_RADIUS = size;
    BRUSH_RADIUS_SQ = size * size;
    setBrushSize(size);
    // Yeni pathlerin fırça boyutu değişsin; mevcutlar etkilenmez
    setCurrentPath((prev) => ({ ...prev, brush: size }));
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

  const takePhoto = async () => {
    console.log("Kamera açılıyor...");
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log("Kamera izin durumu:", status);
      
      if (status !== "granted") {
        Alert.alert("Hata", "Kamera erişim izni gerekiyor!");
        return;
      }
      
      console.log("Kamera başlatılıyor...");
              const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [9, 16], // Modern mobil format: 9:16 (büyük görünüm)
          quality: 1,
        });
      
      console.log("Kamera sonucu:", result);
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log("Çekilen foto:", { width: asset.width, height: asset.height });
        
        // 9:16 ratio kontrolü ve zorunlu kırpma
        const currentRatio = asset.width / asset.height;
        const targetRatio = 9/16;
        const ratioTolerance = 0.05;
        
        if (Math.abs(currentRatio - targetRatio) > ratioTolerance) {
          console.log("⚠️ Aspect ratio uyumsuz, zorunlu kırpma uygulanıyor...");
          
          // 9:16 ratio için ideal boyutları hesapla
          let newWidth, newHeight;
          if (currentRatio > targetRatio) {
            // Image çok geniş - genişliği kırp
            newHeight = asset.height;
            newWidth = Math.round(newHeight * targetRatio);
          } else {
            // Image çok dar - yüksekliği kırp
            newWidth = asset.width;
            newHeight = Math.round(newWidth / targetRatio);
          }
          
          const originX = Math.round((asset.width - newWidth) / 2);
          const originY = Math.round((asset.height - newHeight) / 2);
          
          console.log("🔄 Kırpma parametreleri:", {
            original: `${asset.width}x${asset.height}`,
            target: `${newWidth}x${newHeight}`,
            crop: `${originX},${originY}`
          });
          
          try {
            const manipulatedImage = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{
                crop: {
                  originX,
                  originY,
                  width: newWidth,
                  height: newHeight
                }
              }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            console.log("✅ Kırpma tamamlandı:", {
              width: manipulatedImage.width,
              height: manipulatedImage.height,
              ratio: (manipulatedImage.width / manipulatedImage.height).toFixed(3)
            });
            
            setImage(manipulatedImage.uri);
            setImageDimensions({ 
              width: manipulatedImage.width, 
              height: manipulatedImage.height 
            });
          } catch (error) {
            console.error("❌ Kırpma hatası:", error);
            Alert.alert("Hata", "Fotoğraf kırpılırken hata oluştu");
            return;
          }
        } else {
          setImage(asset.uri);
          setImageDimensions({ width: asset.width, height: asset.height });
        }
        
        setPaths([]);
        setCurrentPath({ points: [], brush: DEFAULT_BRUSH_RADIUS });
        setSelectedProduct(null);
        setStep(1);
      } else {
        console.log("Kamera kullanımı iptal edildi");
      }
    } catch (error) {
      console.error("Kamera hatası:", error);
      Alert.alert("Hata", "Kamera açılırken hata oluştu: " + error.message);
    }
  };

  const onGestureEvent = (event) => {
    const { x, y } = event.nativeEvent;
    setBrushPos({ x, y });
    if (x < 0 || y < 0) return;

    // Nokta anahtarı (ekranda piksel)
    const key = `${Math.round(x)},${Math.round(y)}`;
    if (paintedRef.current.has(key)) return; // Zaten boyanmış

    if (lastPoint) {
      const newPoints = interpolatePoints(
        lastPoint.x,
        lastPoint.y,
        x,
        y
      ).filter((pt) => {
        const k = `${Math.round(pt.x)},${Math.round(pt.y)}`;
        return !paintedRef.current.has(k);
      });
      newPoints.forEach((pt) =>
        paintedRef.current.add(`${Math.round(pt.x)},${Math.round(pt.y)}`)
      );
      setCurrentPath((prev) => ({
        ...prev,
        points: optimizePoints([...prev.points, ...newPoints], brushSize),
      }));
    } else {
      setCurrentPath({ points: [{ x, y }], brush: brushSize });
    }
    setLastPoint({ x, y });
  };

  const onGestureStart = (event) => {
    setIsDrawing(true);
    setLastPoint(null);
    if (event && event.nativeEvent) {
      const { x, y } = event.nativeEvent;
      const key = `${Math.round(x)},${Math.round(y)}`;
      if (!paintedRef.current.has(key)) {
        setCurrentPath({ points: [{ x, y }], brush: brushSize });
        paintedRef.current.add(key); // ilk pikseli kilitle
      } else {
        setCurrentPath({ points: [], brush: brushSize });
      }
      setBrushPos({ x, y });
    }
  };

  const onGestureEnd = () => {
    setIsDrawing(false);
    setBrushPos(null);
    if (currentPath.points && currentPath.points.length > 0) {
      setPaths((prev) => [...prev, currentPath]);
      // Boyanmış set'e ekle
      currentPath.points.forEach((pt) => {
        paintedRef.current.add(`${Math.round(pt.x)},${Math.round(pt.y)}`);
      });
      setCurrentPath({ points: [], brush: brushSize });
    }
    setLastPoint(null);
  };

  // Silgi fonksiyonunu güncelliyorum
  const handleErase = (x, y) => {
    if (!eraseMode) return;
    // Dairesel alanı sil
    const newPaths = paths
      .map((p) => {
        const filtered = p.points.filter((point) => {
          const dx = point.x - x;
          const dy = point.y - y;
          return dx * dx + dy * dy >= brushSize * brushSize;
        });
        return { ...p, points: filtered };
      })
      .filter((p) => p.points.length > 0);
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
    const ratio = width / height;
    console.log(`📸 Image yüklendi: ${width}x${height}, ratio: ${ratio.toFixed(2)} (beklenen: 0.56)`);
    setImageDimensions({ width, height });
  };

  const applyBronzeEffect = async () => {
    if (!image || paths.length === 0) {
      Alert.alert("Hata", "Lütfen bir fotoğraf seçin ve alan işaretleyin!");
      return;
    }
    setLoading(true);
    try {
      // Eğer manipülasyon yapılacaksa, yeni boyutları da güncelle
      let manipMeta = {
        uri: image,
        width: imageDimensions.width,
        height: imageDimensions.height,
      };

      const origWidth = manipMeta.width;
      const origHeight = manipMeta.height;
      const containerWidth = displaySize.width || origWidth;
      const containerHeight = displaySize.height || origHeight;
      


      // Koordinatları normalize et (0-1 arası)
      const normalizedMask = [];
      
      // Container layout bilgilerini al
      const imageRatio = origWidth / origHeight;
      const containerRatio = containerWidth / containerHeight;
      
      let scale, displayWidth, displayHeight, offsetX, offsetY;
      if (imageRatio < containerRatio) {
        scale = containerHeight / origHeight;
        displayHeight = containerHeight;
        displayWidth = origWidth * scale;
        offsetX = (containerWidth - displayWidth) / 2;
        offsetY = 0;
      } else {
        scale = containerWidth / origWidth;
        displayWidth = containerWidth;
        displayHeight = origHeight * scale;
        offsetX = 0;
        offsetY = (containerHeight - displayHeight) / 2;
      }
      
      paths.forEach((p) => {
        p.points.forEach((pt) => {
          // Screen koordinatlarını display koordinatlarına dönüştür
          const relativeX = pt.x - offsetX;
          const relativeY = pt.y - offsetY;
          
          // Normalize koordinatlar (0-1 arası)
          const normalizedX = relativeX / displayWidth;
          const normalizedY = relativeY / displayHeight;
          
          // Sadece geçerli koordinatları ekle
          if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
            // Brush büyüklüğünü de normalize et (image boyutuna göre)
            const normalizedBrush = (p.brush || DEFAULT_BRUSH_RADIUS) / Math.min(displayWidth, displayHeight);
            
            normalizedMask.push({
              x: normalizedX,
              y: normalizedY,
              brush: normalizedBrush
            });
          }
        });
      });
      
      console.log('🎯 NORMALIZE DEBUG:', {
        displaySize: `${displaySize.width}x${displaySize.height}`,
        originalMaskCount: paths.reduce((sum, p) => sum + p.points.length, 0),
        normalizedMaskCount: normalizedMask.length,
        sampleNormalized: normalizedMask.slice(0, 3)
      });
      
      const mask = normalizedMask;

      // Device bilgilerini al
      const deviceInfo = await getDeviceInfo();
      console.log('📱 Device Info:', {
        brand: deviceInfo.deviceBrand,
        model: deviceInfo.deviceId,
        os: `${deviceInfo.systemName} ${deviceInfo.systemVersion}`,
        uniqueId: deviceInfo.uniqueId?.substring(0, 8) + '...' // Security için sadece ilk 8 karakter
      });

      const formData = new FormData();
      formData.append("image", {
        uri: manipMeta.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      });
      formData.append("mask", JSON.stringify(mask));
      formData.append("selectedProduct", JSON.stringify(selectedProduct));
      formData.append("deviceInfo", JSON.stringify(deviceInfo));

      const response = await fetch(
        `${API_URL}/api/public/phone/bronze-effect`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();
      console.log(result);
      if (result.success) {
        // Görüntüyü göster
        const imageUrl = `${API_URL}${result.imageUrl}`;
        setResultImage(imageUrl);
        setResultImageId(result.imageId); // Paylaş için imageId'yi kaydet
        setStep(3);
      } else {
        Alert.alert("Hata", "Filtrelenmiş fotoğraf alınamadı.");
      }
    } catch (e) {
      Alert.alert("Hata", "Filtre uygulanırken hata oluştu: " + e.message);
      console.log(e);
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
            setCurrentPath({ points: [], brush: DEFAULT_BRUSH_RADIUS });
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
            setPaths([]);
            setCurrentPath({ points: [], brush: DEFAULT_BRUSH_RADIUS });
            setSelectedProduct(null);
            setStep(0);
          },
        },
      ]
    );
  };

  const ProductItem = ({ product }) => {
    const handleSelect = () => {
      setSelectedProduct(product);
    };

    const isSelected = selectedProduct?.id === product.id;

    return (
      <TouchableOpacity
        style={[styles.productItem, isSelected && styles.selectedProductItem]}
        onPress={handleSelect}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isSelected ? ["#FFD700", "#FFA500"] : ["#FFFFFF", "#F5F5F5"]}
          style={styles.productGradient}
        >
          <View style={styles.productImageContainer}>
            <Image source={product.pngImage} style={styles.productImage} />
            {isSelected && (
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, isSelected && styles.selectedText]}
              numberOfLines={2}
            >
              {product.name}
            </Text>
            <Text
              style={[
                styles.productPrice,
                isSelected && styles.selectedPriceText,
              ]}
            >
              {product.price} TL
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const pickImage = async () => {
    console.log("Galeri açılıyor...");
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("Galeri izin durumu:", status);
      
      if (status !== "granted") {
        Alert.alert("Hata", "Galeriye erişim izni gerekiyor!");
        return;
      }
      
      console.log("ImagePicker başlatılıyor...");
              const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [9, 16], // Modern mobil format: 9:16 (büyük görünüm)
          quality: 1,
        });
      
      console.log("ImagePicker sonucu:", result);
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log("Seçilen asset:", { width: asset.width, height: asset.height });
        
        // 9:16 ratio kontrolü ve zorunlu kırpma
        const currentRatio = asset.width / asset.height;
        const targetRatio = 9/16;
        const ratioTolerance = 0.05;
        
        if (Math.abs(currentRatio - targetRatio) > ratioTolerance) {
          console.log("⚠️ Aspect ratio uyumsuz, zorunlu kırpma uygulanıyor...");
          
          // 9:16 ratio için ideal boyutları hesapla
          let newWidth, newHeight;
          if (currentRatio > targetRatio) {
            // Image çok geniş - genişliği kırp
            newHeight = asset.height;
            newWidth = Math.round(newHeight * targetRatio);
          } else {
            // Image çok dar - yüksekliği kırp
            newWidth = asset.width;
            newHeight = Math.round(newWidth / targetRatio);
          }
          
          const originX = Math.round((asset.width - newWidth) / 2);
          const originY = Math.round((asset.height - newHeight) / 2);
          
          console.log("🔄 Kırpma parametreleri:", {
            original: `${asset.width}x${asset.height}`,
            target: `${newWidth}x${newHeight}`,
            crop: `${originX},${originY}`
          });
          
          try {
            const manipulatedImage = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{
                crop: {
                  originX,
                  originY,
                  width: newWidth,
                  height: newHeight
                }
              }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            console.log("✅ Kırpma tamamlandı:", {
              width: manipulatedImage.width,
              height: manipulatedImage.height,
              ratio: (manipulatedImage.width / manipulatedImage.height).toFixed(3)
            });
            
            setImage(manipulatedImage.uri);
            setImageDimensions({ 
              width: manipulatedImage.width, 
              height: manipulatedImage.height 
            });
          } catch (error) {
            console.error("❌ Kırpma hatası:", error);
            Alert.alert("Hata", "Fotoğraf kırpılırken hata oluştu");
            return;
          }
        } else {
          setImage(asset.uri);
          setImageDimensions({ width: asset.width, height: asset.height });
        }
        
        setPaths([]);
        setCurrentPath({ points: [], brush: DEFAULT_BRUSH_RADIUS });
        setSelectedProduct(null);
        setStep(1);
      } else {
        console.log("Galeri seçimi iptal edildi");
      }
    } catch (error) {
      console.error("Galeri hatası:", error);
      Alert.alert("Hata", "Galeri açılırken hata oluştu: " + error.message);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/welcome-bg.png")}
      style={styles.background}
    >
      <LinearGradient
        colors={["rgba(244, 235, 208, 0.5)", "rgba(244, 235, 208, 1)"]}
        style={styles.container}
      >
        {step === 0 && (
          <>
            <View style={styles.step0Container}>
              <Text style={styles.title}>Fotoğraf Seç</Text>
              <Text style={styles.desc}>
                Bronzlaştırıcı etkileri denemek için hemen bir fotoğraf seçmen
                yeterli!
              </Text>
              <View style={styles.actions}>
                <Text style={styles.actionText}>
                  Yüz veya vücut bölgelerine bronzlaştırıcı krem uygulamak için
                  hemen{" "}
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera" size={24} color={COLORS.text} />
                  <Text>Kamerayı açın</Text>
                </TouchableOpacity>
                <Text style={styles.actionText}>
                  veya hızlıca dilediğiniz bir fotoğrafı
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={pickImage}
                >
                  <Ionicons name="image" size={24} color={COLORS.text} />
                  <Text>Galeriden seçin</Text>
                </TouchableOpacity>
                <Text style={styles.actionText}>ve değişimi görün!</Text>
              </View>
            </View>
          </>
        )}

        {step !== 0 && step !== 3 && (
          <>
            <View style={styles.step1Container}>
              <TouchableOpacity
                style={styles.floatingTopNavBack}
                onPress={() => {
                  if (step === 1) {
                    clearImage();
                  } else if (step === 2) {
                    setStep(1);
                  }
                }}
              >
                <Text style={styles.floatingTopNavText}>Geri Dön</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.floatingTopNavNext,
                  (step === 1 &&
                    paths.length > 0 &&
                    styles.floatingTopNavActive) ||
                    (step === 2 &&
                      selectedProduct &&
                      styles.floatingTopNavActive),
                ]}
                onPress={() => {
                  if (step === 1) {
                    setStep(2);
                  } else if (step === 2) {
                    applyBronzeEffect();
                  }
                }}
                disabled={
                  (step === 1 && (loading || !image || paths.length === 0)) ||
                  (step === 2 &&
                    (loading ||
                      !image ||
                      paths.length === 0 ||
                      !selectedProduct))
                }
              >
                {step === 1 && (
                  <Text style={styles.floatingTopNavText}>Çizimi Tamamla</Text>
                )}
                {step === 2 && (
                  <Text style={styles.floatingTopNavText}>
                    Bronz Efekti Uygula
                    {loading && (
                      <ActivityIndicator color={COLORS.text} size="small" />
                    )}
                  </Text>
                )}
              </TouchableOpacity>

              <Image
                ref={imageRef}
                source={{ uri: image }}
                style={styles.image}
                resizeMode="contain"
                onLoad={onImageLoad}
              />

              <PanGestureHandler
                onGestureEvent={
                  step === 1
                    ? eraseMode
                      ? onEraseGestureEvent
                      : onGestureEvent
                    : () => {}
                }
                onHandlerStateChange={({ nativeEvent }) => {
                  const s = nativeEvent.state;
                  if (s === GestureState.BEGAN) {
                    onGestureStart(nativeEvent);
                  } else if (
                    s === GestureState.END ||
                    s === GestureState.CANCELLED ||
                    s === GestureState.FAILED
                  ) {
                    onGestureEnd();
                  }
                }}
              >
                <Animated.View 
                  style={StyleSheet.absoluteFill}
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    console.log("📐 Container Layout:", { width, height });
                    setDisplaySize({ width, height });
                  }}
                >
                  <Svg style={StyleSheet.absoluteFill}>
                    {paths.map((p, index) => (
                      <Path
                        key={index}
                        d={p.points.reduce((acc, point, i) => {
                          if (i === 0) return `M ${point.x} ${point.y}`;
                          return `${acc} L ${point.x} ${point.y}`;
                        }, "")}
                        stroke={BRUSH_COLOR}
                        strokeWidth={p.brush * 2}
                        fill="none"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ))}
                    {currentPath.points && currentPath.points.length > 1 && (
                      <Path
                        d={currentPath.points.reduce((acc, point, i) => {
                          if (i === 0) return `M ${point.x} ${point.y}`;
                          return `${acc} L ${point.x} ${point.y}`;
                        }, "")}
                        stroke={BRUSH_COLOR}
                        strokeWidth={currentPath.brush * 2}
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

              {/* //? Fırça Kontrol Butonları */}
              {image && step === 1 && (
                <View style={styles.floatingButtonContainer}>
                  {/* //? Silme Modu Butonu */}
                  <TouchableOpacity
                    style={[
                      styles.floatingButton,
                      eraseMode ? styles.eraseActive : null,
                    ]}
                    onPress={() => setEraseMode((v) => !v)}
                  >
                    <Svg
                      width={18}
                      height={18}
                      viewBox="0 0 256.00098 256"
                      fill="none"
                      color={eraseMode ? COLORS.background : COLORS.text}
                    >
                      <Path
                        d="M216.001,207.833H130.34375l34.72949-34.72949.0166-.01465.01465-.0166,56.55371-56.55274a24.02962,24.02962,0,0,0,0-33.94141L176.40332,37.32324a24.0007,24.0007,0,0,0-33.94141,0L85.90283,93.88232l-.01025.00928-.00928.01026L29.32422,150.46094a24.00066,24.00066,0,0,0,0,33.9414l37.08887,37.08789a8.00232,8.00232,0,0,0,5.65722,2.34278H216.001a8,8,0,0,0,0-16ZM153.77637,48.6377a7.99708,7.99708,0,0,1,11.3125,0l45.25488,45.25488a8.00888,8.00888,0,0,1,0,11.31347l-50.91113,50.91114L102.86475,99.54932Z"
                        fill="currentColor"
                      />
                    </Svg>
                  </TouchableOpacity>

                  {/* //? Fırça Kontrol Butonu */}
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

                  {/* //? Seçimi Temizle butonu */}
                  <TouchableOpacity
                    style={[styles.floatingButton]}
                    onPress={clearDrawing}
                  >
                    <Ionicons name="trash" size={16} color={COLORS.text} />
                  </TouchableOpacity>

                  {/* //? Fırça Boyutu kontrolleri Modal */}
                  <Animated.View
                    pointerEvents="auto"
                    style={[
                      {
                        transform: [
                          {
                            translateX: brushControlsAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [100, 0],
                            }),
                          },
                        ],
                        opacity: brushControlsAnimation,
                        position: "absolute",
                        zIndex: 1000,
                        backgroundColor: COLORS.background,
                        borderRadius: 20,
                        left: 35,
                        padding: 3,
                      },
                    ]}
                  >
                    <Slider
                      style={{
                        width: 250,
                        height: 35,
                      }}
                      minimumValue={MIN_BRUSH_RADIUS}
                      maximumValue={MAX_BRUSH_RADIUS}
                      value={brushSize}
                      onValueChange={updateBrushSize}
                      minimumTrackTintColor={COLORS.text}
                      maximumTrackTintColor={COLORS.text}
                      thumbTintColor={COLORS.text}
                    />
                  </Animated.View>
                </View>
              )}

              {step === 2 && (
                <Animated.View
                  style={[
                    styles.productsOverlay,
                    {
                      opacity: productAnimationValue,
                      transform: [
                        {
                          translateY: productAnimationValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [100, 0],
                          }),
                        },
                        {
                          scale: productAnimationValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.productsHeader,
                      {
                        opacity: productAnimationValue.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, 0, 1],
                        }),
                        transform: [
                          {
                            translateY: productAnimationValue.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.productsTitle}>Ürün Seçin</Text>
                    <Text style={styles.productsSubtitle}>
                      Bronzlaştırıcı kremlerin arasından birini seçin
                    </Text>
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.productsScrollContainer,
                      {
                        opacity: productAnimationValue.interpolate({
                          inputRange: [0, 0.3, 1],
                          outputRange: [0, 0, 1],
                        }),
                        transform: [
                          {
                            translateY: productAnimationValue.interpolate({
                              inputRange: [0, 1],
                              outputRange: [30, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <FlatList
                      data={PRODUCTS}
                      renderItem={({ item }) => <ProductItem product={item} />}
                      keyExtractor={(item) => item.id.toString()}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.productsListContent}
                      ItemSeparatorComponent={() => (
                        <View style={styles.productSeparator} />
                      )}
                    />
                  </Animated.View>
                </Animated.View>
              )}
            </View>

            {loading && (
              <Modal transparent visible animationType="fade">
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.text} />
                  <Text style={styles.loadingText}>
                    Bronz efekti uygulanıyor...
                  </Text>
                </View>
              </Modal>
            )}
          </>
        )}
        {step === 3 && (
          <ScrollView
            style={{
              flex: 1,
            }}
          >
            <View style={styles.step1Container}>
              <TouchableOpacity
                style={styles.floatingTopNavBack}
                onPress={() => {
                  setStep(2);
                }}
              >
                <Text style={styles.floatingTopNavText}>Geri Dön</Text>
              </TouchableOpacity>
              <View style={styles.resultImageContainer}>
                {/* Filtered (Result) Image */}
                <Image
                  source={{ uri: resultImage }}
                  style={styles.resultImage}
                  resizeMode="contain"
                />
                
                {/* Interactive Overlay */}
                <TouchableOpacity
                  style={styles.resultImageOverlay}
                  activeOpacity={1}
                  onPressIn={showOriginalImage}
                  onPressOut={hideOriginalImage}
                >
                  {/* Original Image Overlay */}
                  {showOriginal && (
                    <Animated.View 
                      style={[
                        styles.originalImageOverlay,
                        { opacity: originalImageOpacity }
                      ]}
                    >
                      <Image
                        source={{ uri: image }}
                        style={styles.resultImage}
                        resizeMode="contain"
                      />
                      <View style={styles.originalImageLabel}>
                        <Text style={styles.originalImageLabelText}>ORİJİNAL</Text>
                      </View>
                    </Animated.View>
                  )}
                  
                  {/* Touch Instructions */}
                  <View style={styles.touchInstructions}>
                    <Ionicons name="hand-left" size={20} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.touchInstructionsText}>
                      Basılı tutarak orijinali gör
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.resultButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.resultButtons, styles.shareButton]}
                  onPress={sharePhoto}
                  disabled={loading}
                >
                  <Ionicons name="share-social" size={20} color={COLORS.text} />
                  <Text style={styles.buttonText}>
                    {loading ? "Paylaşılıyor..." : "Paylaş"}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    color: COLORS.text,
                  }}
                >
                  {`Fotoğrafınızı paylaşın ve sizin için özel oluşturulan indirim kodunu kaçırmayın!`}
                </Text>
                <TouchableOpacity style={styles.resultButtons} onPress={handlePurchase}>
                  <Text>Hemen Satın Al</Text>
                </TouchableOpacity>
              </View>
              {/* Benzer Fotoğraflar Bölümü */}
              <View style={styles.similarPhotosSection}>
                <View style={styles.similarPhotosHeader}>
                  <Text style={styles.similarPhotosTitle}>
                    {selectedProduct?.name} ile Yapılan Diğer Çalışmalar
                  </Text>
                  <Text style={styles.similarPhotosSubtitle}>
                    Aynı ürünü kullanan diğer kullanıcıların sonuçlarını keşfet
                  </Text>
                </View>

                {loadingSimilar ? (
                  <View style={styles.similarPhotosLoading}>
                    <ActivityIndicator size="large" color={COLORS.active} />
                    <Text style={styles.loadingText}>Benzer çalışmalar yükleniyor...</Text>
                  </View>
                ) : similarPhotos.length > 0 ? (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.similarPhotosScrollContent}
                    style={styles.similarPhotosScroll}
                  >
                    {similarPhotos.map((photo, index) => (
                      <TouchableOpacity
                        key={photo.id}
                        style={styles.similarPhotoItem}
                        onPress={() => openPhotoModal(photo)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: `${API_URL}${photo.url}` }}
                          style={styles.similarPhotoImage}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.6)']}
                          style={styles.similarPhotoGradient}
                        >
                          <View style={styles.similarPhotoInfo}>
                            <View style={styles.deviceBadge}>
                              <Ionicons 
                                name={photo.device === 'iPhone' ? 'phone-portrait' : 'phone-portrait-outline'} 
                                size={10} 
                                color="#FFFFFF" 
                              />
                              <Text style={styles.deviceText}>{photo.device}</Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noSimilarPhotos}>
                    <Ionicons name="camera-outline" size={48} color={COLORS.text} />
                    <Text style={styles.noSimilarPhotosTitle}>Henüz paylaşım yok</Text>
                    <Text style={styles.noSimilarPhotosDesc}>
                      Bu ürünle yapılan ilk paylaşım olacaksın!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Fotoğraf Büyük Görünüm Modal'ı */}
        {selectedPhotoModal && (
          <Modal transparent visible animationType="none">
            <Animated.View 
              style={[
                styles.photoModal,
                { opacity: modalOpacity }
              ]}
            >
              <TouchableOpacity 
                style={styles.modalBackdrop}
                onPress={closePhotoModal}
                activeOpacity={1}
              >
                <View style={styles.modalContent}>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={closePhotoModal}
                  >
                    <Ionicons name="close" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <Image
                    source={{ uri: `${API_URL}${selectedPhotoModal.url}` }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                  
                  <View style={styles.modalPhotoInfo}>
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.modalInfoGradient}
                    >
                      <Text style={styles.modalProductName}>
                        {selectedPhotoModal.productName}
                      </Text>
                      <View style={styles.modalMetaInfo}>
                        <View style={styles.modalDeviceBadge}>
                          <Ionicons 
                            name={selectedPhotoModal.device === 'iPhone' ? 'phone-portrait' : 'phone-portrait-outline'} 
                            size={14} 
                            color="#FFFFFF" 
                          />
                          <Text style={styles.modalDeviceText}>
                            {selectedPhotoModal.device}
                          </Text>
                        </View>
                        <Text style={styles.modalDate}>
                          {new Date(selectedPhotoModal.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Modal>
        )}
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
  step0Container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
  },
  desc: {
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 20,
    textAlign: "center",
  },
  actions: {
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 0,
  },
  actionText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
    textAlign: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.button,
    padding: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  step1Container: {
    position: "relative",
    flex: 1,
    justifyContent: "center",
    // alignItems: "center",
  },
  floatingTopNavBack: {
    position: "absolute",
    top: 25,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 30,
    zIndex: 1000,
    justifyContent: "center",
    backgroundColor: COLORS.button,
    borderRadius: 20,
    padding: 5,
    paddingHorizontal: 10,
    color: COLORS.text,
  },
  floatingTopNavNext: {
    position: "absolute",
    top: 25,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 30,
    zIndex: 1000,
    textAlign: "center",
    justifyContent: "center",
    backgroundColor: COLORS.button,
    borderRadius: 20,
    padding: 5,
    paddingHorizontal: 10,
    opacity: 0.4,
    color: COLORS.text,
  },
  floatingTopNavActive: {
    backgroundColor: COLORS.button,
    opacity: 1,
  },
  floatingTopNavText: {
    color: COLORS.text,
    display:'flex',
    justifyContent:'center',
    alignItems:'center',
    textAlign:'center',

  },
  imageContainer: {
    flex: 1,
    alignSelf: "center",
    borderRadius: 10,
  },
  image: {
    flex: 1,
    aspectRatio: 9/16, // Modern mobil format: 9:16 (büyük görünüm)
    width: '100%',
    maxHeight: '100%',
  },
  floatingButtonContainer: {
    position: "absolute",
    left: 5,
    top: "25%",
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
    zIndex: 1000,
    width: 25,
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
    backgroundColor: COLORS.background,
    borderRadius: 20,
  },
  eraseActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.background,
    color: COLORS.background,
  },
  productItem: {
    width: 140,
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 10,
  },
  selectedProductItem: {
    transform: [{ scale: 1.05 }],
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.active,
    textAlign: "center",
    marginTop: 2,
  },
  productGradient: {
    flex: 1,
    borderRadius: 10,
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    position: "relative",
    overflow: "hidden",
  },
  selectedIndicator: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: COLORS.active,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  productInfo: {
    marginTop: 5,
    alignItems: "center",
  },
  selectedText: {
    color: COLORS.active,
  },
  selectedPriceText: {
    color: COLORS.active,
  },

  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(92, 58, 33, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.background,
    fontSize: 18,
    marginTop: 10,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  resultImageContainer: {
    position: 'relative',
    width: "100%",
    height: 500,
    borderRadius: 10,
    overflow: 'hidden',
  },
  resultImage: {
    width: "100%",
    height: 500,
    borderRadius: 10,
    objectFit: "contain",
  },
  resultImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  originalImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  originalImageLabel: {
    position: 'absolute',
    top: 20,
    left: '40%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  originalImageLabelText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  touchInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  touchInstructionsText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  resultButtonsContainer: {
    gap: 3,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    width: "100%",
    padding: 10,
  },
  resultButtons: {
    backgroundColor: COLORS.button,
    padding: 10,
    borderRadius: 10,
    width: "100%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  shareButton: {
    backgroundColor: "#4CAF50", // Yeşil paylaş butonu
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  // Benzer Fotoğraflar Bölümü Stilleri
  similarPhotosSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  similarPhotosHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  similarPhotosTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  similarPhotosSubtitle: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.7,
    textAlign: 'center',
  },
  similarPhotosLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  similarPhotosScroll: {
    marginHorizontal: -10,
  },
  similarPhotosScrollContent: {
    paddingHorizontal: 10,
  },
  similarPhotoItem: {
    width: 140,
    height: 180,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  similarPhotoImage: {
    width: '100%',
    height: '100%',
  },
  similarPhotoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'flex-end',
    padding: 12,
  },
  similarPhotoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  deviceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  noSimilarPhotos: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    opacity: 0.6,
  },
  noSimilarPhotosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noSimilarPhotosDesc: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },

  // Modal Stilleri
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: -50,
    right: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  modalPhotoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  modalInfoGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  modalProductName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalMetaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDeviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  modalDeviceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  productsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(244, 235, 208, 0.95)",
    backdropFilter: "blur(10px)",
    zIndex: 100,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  productsHeader: {
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  productsTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  productsSubtitle: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: "center",
    opacity: 0.8,
    fontWeight: "500",
  },
  productsScrollContainer: {
    width: "100%",
    maxHeight: 220,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingVertical: 10,
  },
  productsListContent: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  productSeparator: {
    width: 15,
  },
});

export default PhotoEditScreen;
