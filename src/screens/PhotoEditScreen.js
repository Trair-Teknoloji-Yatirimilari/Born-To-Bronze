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
  StatusBar,
  Linking,
  SafeAreaView,
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

import DeviceInfo from "react-native-device-info";
import Share from "react-native-share";
import Dialog from "../components/Dialog";
import ProductSlider from "../components/ProductSlider";
import BeforeAfterSlider from "../components/BeforeAfterSlider";

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

// Mask noktalarını optimize eden fonksiyon - Basitleştirilmiş koordinat dönüşümü
function optimizeMaskPoints(
  points,
  origWidth,
  origHeight,
  containerWidth,
  containerHeight,
  brushSize
) {
  // Artık karmaşık hesaplama yok - container coordinates = display coordinates
  // resizeMode "cover" + aspectRatio 9/16 = 1:1 mapping

  // Brush parametreleri - daha küçük ve odaklı alan için
  const absBrush = Math.min(Math.ceil(brushSize / scale), 15); // 25'ten 15'e düşürdüm
  const gridSize = Math.max(2, Math.floor(absBrush / 8)); // 6'dan 8'e çıkardım daha az nokta için

  const grid = new Set();
  const mask = [];

  points.forEach((pt, index) => {
    // Basit koordinat dönüşümü - container coordinates zaten relative
    const containerX = pt.x;
    const containerY = pt.y;

    // Bounds kontrolü
    if (
      containerX < 0 ||
      containerY < 0 ||
      containerX >= containerWidth ||
      containerY >= containerHeight
    ) {
      return;
    }

    // resizeMode "cover" için koordinat dönüşümü - çok daha basit
    // Container boyutları = display boyutları (aspectRatio: 9/16 sabit)
    // Container'da image "cover" modunda, bu da 1:1 mapping demek
    let absX = Math.round((containerX / containerWidth) * origWidth);
    let absY = Math.round((containerY / containerHeight) * origHeight);

    // Image bounds kontrolü
    absX = Math.max(0, Math.min(absX, origWidth - 1));
    absY = Math.max(0, Math.min(absY, origHeight - 1));

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
      minX: Math.min(...mask.map((p) => p.x)),
      maxX: Math.max(...mask.map((p) => p.x)),
      minY: Math.min(...mask.map((p) => p.y)),
      maxY: Math.max(...mask.map((p) => p.y)),
    };
  }

  return mask;
}

const API_URL = "https://bronze-api.trair.com.tr";

// __DEV__
//   ? Platform.select({
//       ios: "http://192.168.1.29:3000",
//       android: "http://10.0.2.2:3000",
//     })
//   : "https://kafanagoreya.yumru.dev";

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
    console.error("Device bilgileri alınırken hata:", error);
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
  const [stdAlertVisible, setStdAlertVisible] = useState(false);
  const [stdAlertTitle, setStdAlertTitle] = useState("");
  const [stdAlertMessage, setStdAlertMessage] = useState("");
  const [confirmLinkVisible, setConfirmLinkVisible] = useState(false);
  const [confirmClearDrawingVisible, setConfirmClearDrawingVisible] = useState(false);
  const [confirmClearImageVisible, setConfirmClearImageVisible] = useState(false);
  const [confirmShareVisible, setConfirmShareVisible] = useState(false);

  const showAlert = (title, message) => {
    setStdAlertTitle(title || "");
    setStdAlertMessage(message || "");
    setStdAlertVisible(true);
  };
  const [step, setStep] = useState(1); // Direkt çizim ekranından başla (galeri açılacak)
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // İlk galeri açılışı için
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
  const [containerLayout, setContainerLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }); // Container position
  const [resultImage, setResultImage] = useState(null);
  const [resultImageId, setResultImageId] = useState(null); // Paylaş için gerekli
  const paintedRef = useRef(new Set()); // Boyanmış grid anahtarları
  const productAnimationValue = useRef(new Animated.Value(0)).current;

  // Benzer fotoğraflar için state'ler
  const [similarPhotos, setSimilarPhotos] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [discountCode, setDiscountCode] = useState(null);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [PRODUCTS, setPRODUCTS] = useState([]);
  const [imageLoading, setImageLoading] = useState(false); // Fotoğraf yükleniyor mu?
  const [showInstructions, setShowInstructions] = useState(true); // İlk kullanım talimatları

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await fetch(`${API_URL}/api/products?product=filter`);
      const data = await response.json();
      setPRODUCTS(data.products);
    };
    fetchProducts();
  }, []);

  // Ekran açıldığında otomatik galeriyi aç
  useEffect(() => {
    const openGalleryOnMount = async () => {
      // Sadece ilk açılışta ve fotoğraf seçilmemişse
      if (!image && initialLoading) {
        setInitialLoading(false);
        await pickImage();
      }
    };
    openGalleryOnMount();
  }, []);

  // Bottom Tab Bar kontrolü - çizim aşamasında gizle
  useEffect(() => {
    if (step === 1) {
      // Çizim ve ürün seçimi aşamasında tab bar'ı gizle ve status bar'ı gizle
      navigation.setOptions({
        tabBarStyle: { display: "none" },
      });
      StatusBar.setHidden(true, "slide");
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
        },
      });
      StatusBar.setHidden(false, "slide");
    }
  }, [step, navigation]);

  // Component unmount olduğunda status bar'ı geri getir
  useEffect(() => {
    return () => {
      StatusBar.setHidden(false, "slide");
    };
  }, []);

  // Result ekranında benzer fotoğrafları yükle
  useEffect(() => {
    if (step === 2 && selectedProduct?.id && resultImage) {
      fetchSimilarPhotos(selectedProduct.id, resultImageId);
    }
  }, [step, selectedProduct?.id, resultImageId, resultImage]);

  // Ürün seçimi ekranı animasyonu - ARTIK KULLANILMIYOR (slider ile değiştirildi)
  useEffect(() => {
    if (step === 2 && resultImage) {
      Animated.timing(productAnimationValue, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      productAnimationValue.setValue(0);
    }
  }, [step, resultImage]);

  // İndirim kodunu kopyala
  const copyDiscountCode = async () => {
    if (discountCode) {
      // iOS ve Android için farklı yaklaşım
      if (Platform.OS === 'ios') {
        // iOS için Share API kullan
        try {
          await Share.open({
            message: `İndirim Kodunuz: ${discountCode}\n\n%15 indirim kazandınız! 🎉\n\nAlışverişinizi tamamlamak için kodu kullanın.`,
          });
        } catch (error) {
          // Kullanıcı iptal etti, sorun değil
        }
      } else {
        // Android için basit alert
        showAlert(
          "İndirim Kodunuz 🎉", 
          `${discountCode}\n\n%15 indirim kazandınız!\n\nKodu not alın ve alışverişinizi tamamlayın.`
        );
      }
      setDiscountModalVisible(false);
    }
  };

  // Paylaş fonksiyonu
  const sharePhoto = async () => {
    if (!resultImageId) {
      showAlert("Hata", "Paylaşılacak fotoğraf bulunamadı.");
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = await getDeviceInfo();

      const response = await fetch(`${API_URL}/api/public/phone/share-photo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: resultImageId,
          uniqueId: deviceInfo.uniqueId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // İndirim kodu varsa kaydet ve modal göster
        if (result.discountCode) {
          setDiscountCode(result.discountCode);
          setDiscountModalVisible(true);
        } else {
          showAlert(
            "Paylaşım Başarılı",
            "Fotoğrafınız başarıyla paylaşıldı. Topluluk, çalışmanızı şimdi görebilir."
          );
        }
        // Paylaş sonrası benzer fotoğrafları yenile
        if (selectedProduct?.id) {
          fetchSimilarPhotos(selectedProduct.id, resultImageId);
        }
      } else {
        showAlert("Paylaşım Hatası", result.error || "Paylaşım sırasında bir sorun oluştu.");
      }
    } catch (error) {
      console.error("Paylaş hatası:", error);
      showAlert("Bağlantı Hatası", "Paylaşım sırasında bağlantı hatası oluştu.");
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
        limit: "10",
      });

      if (currentImageId) {
        params.append("currentImageId", currentImageId);
      }

      const response = await fetch(
        `${API_URL}/api/public/phone/similar-photos?${params}`
      );
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
      showAlert("Hata", "Lütfen önce bir ürün seçin.");
      return;
    }

    try {
      const supported = await Linking.canOpenURL(selectedProduct.link);
      if (supported) {
        // Dış link onayı
        // Not: Onboarding kapsamı dışında; burada doğrudan yönlendirme vardı.
        // Dialog ile onaylayarak açmayı tercih edeceğiz: bileşeni en alta ekledik.
        setConfirmLinkVisible(true);
      } else {
        showAlert("Bağlantı Hatası", "Bu link açılamıyor: " + selectedProduct.link);
      }
    } catch (error) {
      console.error("Link açılırken hata:", error);
      showAlert("Hata", "Satın alma sayfası açılırken bir sorun oluştu.");
    }
  };

  // Fırça boyutunu güncelleme fonksiyonu
  const updateBrushSize = (size) => {
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

  // Fırça kontrollerini animasyonlu kapat
  const closeBrushControls = () => {
    if (showBrushControls) {
      Animated.spring(brushControlsAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start(() => {
        setShowBrushControls(false);
      });
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        showAlert("İzin Gerekli", "Kamera erişim izni gerekiyor.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [9, 16], // Modern mobil format: 9:16 (büyük görünüm)
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // 9:16 ratio kontrolü ve zorunlu kırpma
        const currentRatio = asset.width / asset.height;
        const targetRatio = 9 / 16;
        const ratioTolerance = 0.05;

        if (Math.abs(currentRatio - targetRatio) > ratioTolerance) {
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

          try {
            const manipulatedImage = await ImageManipulator.manipulateAsync(
              asset.uri,
              [
                {
                  crop: {
                    originX,
                    originY,
                    width: newWidth,
                    height: newHeight,
                  },
                },
              ],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            setImage(manipulatedImage.uri);
            setImageDimensions({
              width: manipulatedImage.width,
              height: manipulatedImage.height,
            });
          } catch (error) {
            showAlert("Hata", "Fotoğraf kırpılırken hata oluştu.");
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
      }
    } catch (error) {
      showAlert("Hata", "Kamera açılırken hata oluştu: " + error.message);
    }
  };

  const onGestureEvent = (event) => {
    const { x, y } = event.nativeEvent;

    // Container'a relative koordinatlar
    const relativeX = x;
    const relativeY = y;

    setBrushPos({ x: relativeX, y: relativeY });
    if (
      relativeX < 0 ||
      relativeY < 0 ||
      relativeX > containerLayout.width ||
      relativeY > containerLayout.height
    )
      return;

    // Nokta anahtarı (container'da piksel)
    const key = `${Math.round(relativeX)},${Math.round(relativeY)}`;
    if (paintedRef.current.has(key)) return; // Zaten boyanmış

    if (lastPoint) {
      const newPoints = interpolatePoints(
        lastPoint.x,
        lastPoint.y,
        relativeX,
        relativeY
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
      setCurrentPath({
        points: [{ x: relativeX, y: relativeY }],
        brush: brushSize,
      });
    }
    setLastPoint({ x: relativeX, y: relativeY });
  };

  const onGestureStart = (event) => {
    if (showBrushControls) {
      closeBrushControls();
    }
    setIsDrawing(true);
    setLastPoint(null);
    if (event && event.nativeEvent) {
      const { x, y } = event.nativeEvent;
      // Container'a relative koordinatlar
      const relativeX = x;
      const relativeY = y;

      const key = `${Math.round(relativeX)},${Math.round(relativeY)}`;
      if (!paintedRef.current.has(key)) {
        setCurrentPath({
          points: [{ x: relativeX, y: relativeY }],
          brush: brushSize,
        });
        paintedRef.current.add(key); // ilk pikseli kilitle
      } else {
        setCurrentPath({ points: [], brush: brushSize });
      }
      setBrushPos({ x: relativeX, y: relativeY });
    }
  };

  const onGestureEnd = () => {
    setIsDrawing(false);
    setBrushPos(null);
    if (currentPath.points && currentPath.points.length > 0) {
      // Önceki tüm noktaları topla
      const allPrevPoints = paths.flatMap((p) =>
        p.points.map((pt) => `${Math.round(pt.x)},${Math.round(pt.y)}`)
      );
      const prevPointsSet = new Set(allPrevPoints);
      // Yeni path'ten çakışan noktaları çıkar
      const filteredPoints = currentPath.points.filter(
        (pt) => !prevPointsSet.has(`${Math.round(pt.x)},${Math.round(pt.y)}`)
      );
      if (filteredPoints.length > 0) {
        setPaths((prev) => [
          ...prev,
          { points: filteredPoints, brush: brushSize },
        ]);
        // Boyanmış set'e ekle
        filteredPoints.forEach((pt) => {
          paintedRef.current.add(`${Math.round(pt.x)},${Math.round(pt.y)}`);
        });
      }
      setCurrentPath({ points: [], brush: brushSize });
    }
    setLastPoint(null);
  };
  // Silgi fonksiyonunu güncelliyorum
  const handleErase = (x, y) => {
    if (!eraseMode) return;
    const ERASE_RADIUS = 20; // Silgi hassasiyeti (piksel cinsinden)
    const ERASE_RADIUS_SQ = ERASE_RADIUS * ERASE_RADIUS;
  
    let newPaths = [];
  
    paths.forEach((p) => {
      let currentSegment = [];
      p.points.forEach((pt) => {
        const dx = pt.x - x;
        const dy = pt.y - y;
        if (dx * dx + dy * dy > ERASE_RADIUS_SQ) {
          currentSegment.push(pt);
        } else {
          // Silgiye temas etti, segmenti kaydet ve yeni segment başlat
          if (currentSegment.length > 1) {
            newPaths.push({ ...p, points: currentSegment });
          }
          currentSegment = [];
        }
      });
      // Path'in sonu segment olarak kaldıysa ekle
      if (currentSegment.length > 1) {
        newPaths.push({ ...p, points: currentSegment });
      }
    });
  
    setPaths(newPaths);
  };

  // Silgi için gesture event
  const onEraseGestureEvent = (event) => {
    const { x, y } = event.nativeEvent;
    setBrushPos({ x, y });
    handleErase(x, y);
  };

  // Image yüklendiğinde boyutlarını al - crop edilmiş boyutları kullan
  const onImageLoad = (event) => {
    // Crop işleminden sonra imageDimensions zaten doğru set edilmiş
    // Bu fonksiyon sadece load event'ini handle ediyor
  };

  const applyBronzeEffect = async () => {
    if (!image || paths.length === 0) {
      showAlert("Hata", "Lütfen bir fotoğraf seçin ve alan işaretleyin.");
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

      // Koordinatları normalize et (0-1 arası) - basit sistem
      const normalizedMask = [];

      paths.forEach((p) => {
        p.points.forEach((pt) => {
          // Basit koordinat normalizasyonu - container relative coordinates
          const containerX = pt.x;
          const containerY = pt.y;

          // Bounds kontrolü
          if (
            containerX < 0 ||
            containerY < 0 ||
            containerX >= containerWidth ||
            containerY >= containerHeight
          ) {
            return;
          }

          // Normalize koordinatlar (0-1 arası) - çok basit
          const normalizedX = containerX / containerWidth;
          const normalizedY = containerY / containerHeight;

          // Brush büyüklüğünü de normalize et (container boyutuna göre)
          const normalizedBrush =
            (p.brush || DEFAULT_BRUSH_RADIUS) /
            Math.min(containerWidth, containerHeight);

          normalizedMask.push({
            x: normalizedX,
            y: normalizedY,
            brush: normalizedBrush,
          });
        });
      });

      const mask = normalizedMask;

      // Device bilgilerini al
      const deviceInfo = await getDeviceInfo();

      const formData = new FormData();
      formData.append("image", {
        uri: manipMeta.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      });
      formData.append("mask", JSON.stringify(mask));
      formData.append("selectedProduct", selectedProduct.id);
      formData.append("deviceInfo", JSON.stringify(deviceInfo));

      const response = await fetch(
        `${API_URL}/api/public/phone/bronze-effect`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (result.success) {
        // Görüntüyü göster
        const imageUrl = `${API_URL}${result.imageUrl}`;
        console.log("✅ Bronzlaştırılmış fotoğraf URL:", imageUrl);
        console.log("📸 Orijinal fotoğraf URL:", image);
        setResultImage(imageUrl);
        setResultImageId(result.imageId); // Paylaş için imageId'yi kaydet
        setStep(2); // Artık step 2 = result ekranı
      } else {
        showAlert("Hata", "Filtrelenmiş fotoğraf alınamadı.");
      }
    } catch (e) {
      showAlert("Hata", "Filtre uygulanırken hata oluştu: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const clearDrawing = () => {
    setConfirmClearDrawingVisible(true);
  };

  const clearImage = () => {
    setConfirmClearImageVisible(true);
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        showAlert("İzin Gerekli", "Galeriye erişim izni gerekiyor.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [9, 16], // Modern mobil format: 9:16 (büyük görünüm)
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // 9:16 ratio kontrolü ve zorunlu kırpma
        const currentRatio = asset.width / asset.height;
        const targetRatio = 9 / 16;
        const ratioTolerance = 0.05;

        if (Math.abs(currentRatio - targetRatio) > ratioTolerance) {
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

          try {
            const manipulatedImage = await ImageManipulator.manipulateAsync(
              asset.uri,
              [
                {
                  crop: {
                    originX,
                    originY,
                    width: newWidth,
                    height: newHeight,
                  },
                },
              ],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            setImage(manipulatedImage.uri);
            setImageDimensions({
              width: manipulatedImage.width,
              height: manipulatedImage.height,
            });
          } catch (error) {
            console.error("❌ Kırpma hatası:", error);
            showAlert("Hata", "Fotoğraf kırpılırken hata oluştu.");
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
        // Kullanıcı galeriyi iptal etti, home'a dön
        navigation.goBack();
      }
    } catch (error) {
      console.error("Galeri hatası:", error);
      showAlert("Hata", "Galeri açılırken hata oluştu: " + error.message);
      navigation.goBack();
    }
  };

  // Paylaşım seçenekleri fonksiyonları
  const handleShareApp = async () => {
    setShareModalVisible(false);
    setConfirmShareVisible(true);
  };
  const handleShareWhatsApp = async () => {
    setShareModalVisible(false);
    if (!resultImage) {
      showAlert("Hata", "Paylaşılacak fotoğraf bulunamadı.");
      return;
    }
    try {
      let shareUrl = resultImage;
      // Eğer http(s) ile başlıyorsa önce indir
      if (/^https?:\/\//.test(resultImage)) {
        const fileName = `shared-photo-${Date.now()}.jpg`;
        const fileUri = FileSystem.cacheDirectory + fileName;
        const downloadRes = await FileSystem.downloadAsync(resultImage, fileUri);
        shareUrl = downloadRes.uri;
      }
      await Share.open({
        url: shareUrl,
        social: Share.Social.WHATSAPP,
        failOnCancel: false,
      });
    } catch (e) {}
  };
  const handleShareInstagram = async () => {
    setShareModalVisible(false);
    if (!resultImage) {
      showAlert("Hata", "Paylaşılacak fotoğraf bulunamadı.");
      return;
    }
    try {
      let shareUrl = resultImage;
      if (/^https?:\/\//.test(resultImage)) {
        const fileName = `shared-photo-${Date.now()}.jpg`;
        const fileUri = FileSystem.cacheDirectory + fileName;
        const downloadRes = await FileSystem.downloadAsync(resultImage, fileUri);
        shareUrl = downloadRes.uri;
      }
      await Share.open({
        url: shareUrl,
        social: Share.Social.INSTAGRAM,
        failOnCancel: false,
      });
    } catch (e) {}
  };
  const handleShareOther = async () => {
    setShareModalVisible(false);
    if (!resultImage) {
      showAlert("Hata", "Paylaşılacak fotoğraf bulunamadı.");
      return;
    }
    try {
      let shareUrl = resultImage;
      if (/^https?:\/\//.test(resultImage)) {
        const fileName = `shared-photo-${Date.now()}.jpg`;
        const fileUri = FileSystem.cacheDirectory + fileName;
        const downloadRes = await FileSystem.downloadAsync(resultImage, fileUri);
        shareUrl = downloadRes.uri;
      }
      await Share.open({
        url: shareUrl,
        failOnCancel: false,
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4EBD0" }}>
      <ImageBackground
        source={require("../assets/welcome-bg.png")}
        style={styles.background}
      >
        <LinearGradient
          colors={["rgba(244, 235, 208, 0.5)", "rgba(244, 235, 208, 1)"]}
          style={styles.container}
        >
          {/* Step 0 ekranı kaldırıldı - direkt galeri açılıyor */}
          
          {/* Galeri açılırken loading göster */}
          {!image && initialLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
              <Text style={styles.loadingText}>Galeri açılıyor...</Text>
            </View>
          )}

          {step !== 0 && step !== 2 && image && (
            <>
              <View style={styles.step1Container}>
                {/* Kullanıcı Talimatları */}
                {showInstructions && (
                  <View style={styles.instructionsContainer}>
                    <LinearGradient
                      colors={["#D4AF37", "#FFD700"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.instructionsGradient}
                    >
                      <View style={styles.instructionsContent}>
                        <Text style={styles.instructionsTitle}>
                          ✏️ Nasıl Kullanılır?
                        </Text>
                        <Text style={styles.instructionsText}>
                          1. Parmağınızla bronzlaştırmak istediğiniz bölgeyi çizin
                        </Text>
                        <Text style={styles.instructionsText}>
                          2. Alttaki slider'dan bir ürün seçin
                        </Text>
                        <Text style={styles.instructionsText}>
                          3. "Bronz Efekti Uygula" butonuna basın
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.instructionsCloseButton}
                        onPress={() => setShowInstructions(false)}
                      >
                        <Ionicons name="close" size={20} color="#000" />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.floatingTopNavBack}
                  onPress={() => {
                    if (step === 1) {
                      clearImage();
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
                      selectedProduct &&
                      styles.floatingTopNavActive),
                  ]}
                  onPress={() => {
                    if (step === 1) {
                      applyBronzeEffect();
                    }
                  }}
                  disabled={
                    step === 1 && (loading || !image || paths.length === 0 || !selectedProduct)
                  }
                >
                  {step === 1 && (
                    <Text style={styles.floatingTopNavText}>
                      Bronz Efekti Uygula
                      {loading && (
                        <ActivityIndicator color={COLORS.text} size="small" />
                      )}
                    </Text>
                  )}
                </TouchableOpacity>

                <View
                  style={styles.imageContainer}
                  onLayout={(e) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    setContainerLayout({ x, y, width, height });
                    setDisplaySize({ width, height }); // displaySize de container boyutları
                  }}
                >
                  <Image
                    ref={imageRef}
                    source={{ uri: image }}
                    style={styles.image}
                    resizeMode="cover"
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
                    <Animated.View style={StyleSheet.absoluteFill}>
                      <Svg style={StyleSheet.absoluteFill}>
                        {paths.length > 0 && (
                          <Path
                            d={paths
                              .map((p) =>
                                p.points.reduce((acc, point, i) => {
                                  if (i === 0)
                                    return `${acc}M ${point.x} ${point.y}`;
                                  return `${acc} L ${point.x} ${point.y}`;
                                }, "")
                              )
                              .join(" ")}
                            stroke={BRUSH_COLOR}
                            strokeWidth={
                              paths[0]?.brush
                                ? paths[0].brush * 2
                                : DEFAULT_BRUSH_RADIUS * 2
                            }
                            fill="none"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        )}
                        {currentPath.points &&
                          currentPath.points.length > 1 && (
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
                </View>

                {/* //? Fırça Kontrol Butonları */}
                {image && step === 1 && (
                  <>
                    {/* Fırça kontrol paneli açıkken overlay - dışarı tıklayınca kapat */}
                    {showBrushControls && (
                      <TouchableOpacity
                        style={styles.brushControlsOverlay}
                        activeOpacity={1}
                        onPress={closeBrushControls}
                      />
                    )}

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
                          styles.brushControlsPanel,
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
                          },
                        ]}
                      >
                        {Platform.OS === "ios" ? (
                          // iOS için Slider
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
                        ) : (
                          // Android için + - Buton Sistemi
                          <View style={styles.brushControlsAndroid}>
                            <TouchableOpacity
                              style={styles.brushButton}
                              onPress={() => {
                                const newSize = Math.max(
                                  MIN_BRUSH_RADIUS,
                                  brushSize - 2
                                );
                                updateBrushSize(newSize);
                              }}
                            >
                              <Text style={styles.brushButtonText}>−</Text>
                            </TouchableOpacity>

                            <View style={styles.brushSizeDisplay}>
                              <Text style={styles.brushSizeText}>
                                {Math.round(brushSize)}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={styles.brushButton}
                              onPress={() => {
                                const newSize = Math.min(
                                  MAX_BRUSH_RADIUS,
                                  brushSize + 2
                                );
                                updateBrushSize(newSize);
                              }}
                            >
                              <Text style={styles.brushButtonText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </Animated.View>
                    </View>
                  </>
                )}

                {/* ProductSlider - Step 1'de göster (çizim ekranında) */}
                {image && step === 1 && PRODUCTS.length > 0 && (
                  <View style={styles.productSliderContainer}>
                    <ProductSlider
                      products={PRODUCTS}
                      selectedProduct={selectedProduct}
                      onSelectProduct={setSelectedProduct}
                      apiUrl={API_URL}
                    />
                  </View>
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
          {step === 2 && resultImage && (
            <ScrollView
              contentContainerStyle={{
                paddingBottom: 40,
                minHeight: "100%",
              }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.resultSectionContainer}>
                <TouchableOpacity
                  style={styles.floatingTopNavBack}
                  onPress={() => {
                    setStep(1); // Artık step 1'e dönüyor (çizim ekranı)
                  }}
                >
                  <Text style={styles.floatingTopNavText}>Geri Dön</Text>
                </TouchableOpacity>
                
                {/* Önce/Sonra Karşılaştırma - Yan Yana */}
                <View style={styles.comparisonContainer}>
                  <View style={styles.comparisonImageWrapper}>
                    <Text style={styles.comparisonLabel}>Önce</Text>
                    <Image
                      source={{ uri: image }}
                      style={styles.comparisonImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.comparisonImageWrapper}>
                    <Text style={styles.comparisonLabel}>Sonra</Text>
                    <Image
                      source={{ uri: resultImage }}
                      style={styles.comparisonImage}
                      resizeMode="cover"
                    />
                  </View>
                </View>
                
                <View style={styles.resultButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.resultButtons, styles.shareButton]}
                    onPress={() => setShareModalVisible(true)}
                    disabled={loading}
                  >
                    <Ionicons
                      name="share-social"
                      size={20}
                      color={COLORS.text}
                    />
                    <Text style={styles.buttonText}>
                      {loading ? "Paylaşılıyor..." : "Paylaş"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.resultButtons, styles.buyButton]}
                    onPress={handlePurchase}
                  >
                    <Text>Hemen Satın Al</Text>
                  </TouchableOpacity>
                </View>
                <Text
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: COLORS.text,
                    }}
                  >
                    {`Fotoğrafınızı paylaşın ve sizin için özel oluşturulan indirim kodunu kaçırmayın!`}
                  </Text>
                {/* Benzer Fotoğraflar Bölümü */}
                <View style={styles.similarPhotosSection}>
                  <View style={styles.similarPhotosHeader}>
                    <Text style={styles.similarPhotosTitle}>
                      {selectedProduct?.name} ile Yapılan Diğer Çalışmalar
                    </Text>
                    <Text style={styles.similarPhotosSubtitle}>
                      Aynı ürünü kullanan diğer kullanıcıların sonuçlarını
                      keşfet
                    </Text>
                  </View>

                  {loadingSimilar ? (
                    <View style={styles.similarPhotosLoading}>
                      <ActivityIndicator size="large" color={COLORS.active} />
                      <Text style={styles.loadingText}>
                        Benzer çalışmalar yükleniyor...
                      </Text>
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
                            colors={["transparent", "rgba(0,0,0,0.6)"]}
                            style={styles.similarPhotoGradient}
                          >
                            <View style={styles.similarPhotoInfo}>
                              <View style={styles.deviceBadge}>
                                <Ionicons
                                  name={
                                    photo.device === "iPhone"
                                      ? "phone-portrait"
                                      : "phone-portrait-outline"
                                  }
                                  size={10}
                                  color="#FFFFFF"
                                />
                                <Text style={styles.deviceText}>
                                  {photo.device}
                                </Text>
                              </View>
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.noSimilarPhotos}>
                      <Ionicons
                        name="camera-outline"
                        size={48}
                        color={COLORS.text}
                      />
                      <Text style={styles.noSimilarPhotosTitle}>
                        Henüz paylaşım yok
                      </Text>
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
                style={[styles.photoModal, { opacity: modalOpacity }]}
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
                        colors={["transparent", "rgba(0,0,0,0.8)"]}
                        style={styles.modalInfoGradient}
                      >
                        <Text style={styles.modalProductName}>
                          {selectedPhotoModal.productName}
                        </Text>
                        <View style={styles.modalMetaInfo}>
                          <View style={styles.modalDeviceBadge}>
                            <Ionicons
                              name={
                                selectedPhotoModal.device === "iPhone"
                                  ? "phone-portrait"
                                  : "phone-portrait-outline"
                              }
                              size={14}
                              color="#FFFFFF"
                            />
                            <Text style={styles.modalDeviceText}>
                              {selectedPhotoModal.device}
                            </Text>
                          </View>
                          <Text style={styles.modalDate}>
                            {new Date(
                              selectedPhotoModal.createdAt
                            ).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
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
          {/* Paylaşım Modalı */}
          <Modal
            visible={shareModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setShareModalVisible(false)}
          >
            <View style={styles.shareModalBackdrop}>
              <Animated.View style={styles.shareModalContainer}>
                <Text style={styles.shareModalTitle}>Paylaşım Seçenekleri</Text>
                <View style={styles.shareOptionsRow}>
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={handleShareApp}
                  >
                    <Ionicons name="cloud-upload" size={32} color={COLORS.text} />
                    <Text style={styles.shareOptionText}>Uygulama İçinde</Text>
                  </TouchableOpacity>
                  {Platform.OS === "android" && (
                    <>
                      <TouchableOpacity
                        style={styles.shareOption}
                        onPress={handleShareWhatsApp}
                      >
                        <Ionicons name="logo-whatsapp" size={32} color={COLORS.text} />
                        <Text style={styles.shareOptionText}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.shareOption}
                        onPress={handleShareInstagram}
                      >
                        <Ionicons name="logo-instagram" size={32} color={COLORS.text} />
                        <Text style={styles.shareOptionText}>Instagram</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={handleShareOther}
                  >
                    <Ionicons name="share-social" size={32} color={COLORS.text} />
                    <Text style={styles.shareOptionText}>Diğer</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.shareCancelButton}
                  onPress={() => setShareModalVisible(false)}
                >
                  <Text style={styles.shareCancelText}>İptal</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>
        </LinearGradient>
      </ImageBackground>
      {eraseMode && (
        <View style={{
          position: 'absolute',
          top: 70,
          left: 0,
          right: 0,
          zIndex: 2000,
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: 'rgba(200,0,0,0.85)',
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>
              Silgi Modu Açık
            </Text>
          </View>
        </View>
      )}
      {/* Confirm: Clear Drawings */}
      <Dialog
        visible={confirmClearDrawingVisible}
        mode="dialog"
        icon="trash"
        title="Çizimleri Temizle"
        message="Seçim çizimlerini temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Temizle"
        cancelText="Vazgeç"
        onClose={() => setConfirmClearDrawingVisible(false)}
        onConfirm={() => {
          setConfirmClearDrawingVisible(false);
          setPaths([]);
          setCurrentPath({ points: [], brush: DEFAULT_BRUSH_RADIUS });
        }}
      />

      {/* Confirm: Clear Photo */}
      <Dialog
        visible={confirmClearImageVisible}
        mode="dialog"
        icon="image"
        title="Fotoğrafı Temizle"
        message="Fotoğrafı temizlemek istediğinize emin misiniz? Tüm seçimler ve ayarlar sıfırlanacaktır."
        confirmText="Temizle"
        cancelText="Vazgeç"
        onClose={() => setConfirmClearImageVisible(false)}
        onConfirm={() => {
          setConfirmClearImageVisible(false);
          setImage(null);
          setPaths([]);
          setCurrentPath({ points: [], brush: DEFAULT_BRUSH_RADIUS });
          setSelectedProduct(null);
          navigation.goBack(); // Home'a dön
        }}
      />

      {/* Confirm: App Share */}
      <Dialog
        visible={confirmShareVisible}
        mode="dialog"
        icon="share-social"
        title="Paylaşımı Onayla"
        message="Fotoğrafınızı uygulama içinde toplulukla paylaşmak istiyor musunuz?"
        confirmText="Paylaş"
        cancelText="Vazgeç"
        onClose={() => setConfirmShareVisible(false)}
        onConfirm={async () => {
          setConfirmShareVisible(false);
          await sharePhoto();
        }}
      />
      {/* Standardized Alert */}
      <Dialog
        visible={stdAlertVisible}
        mode="alert"
        icon="information-circle"
        title={stdAlertTitle}
        message={stdAlertMessage}
        onClose={() => setStdAlertVisible(false)}
        onConfirm={() => setStdAlertVisible(false)}
      />

      {/* Confirm: External Link */}
      <Dialog
        visible={confirmLinkVisible}
        mode="dialog"
        icon="link"
        title="Dış Bağlantı"
        message="Satın alma sayfası tarayıcıda açılacak. Devam etmek istiyor musunuz?"
        confirmText="Devam Et"
        cancelText="Vazgeç"
        onClose={() => setConfirmLinkVisible(false)}
        onConfirm={async () => {
          setConfirmLinkVisible(false);
          try {
            if (selectedProduct?.link) await Linking.openURL(selectedProduct.link);
          } catch {}
        }}
      />

      {/* İndirim Kodu Modalı */}
      <Modal
        visible={discountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDiscountModalVisible(false)}
      >
        <View style={styles.discountModalBackdrop}>
          <Animated.View style={styles.discountModalContainer}>
            <LinearGradient
              colors={["#FFD700", "#FFA500", "#FF8C00"]}
              style={styles.discountModalGradient}
            >
              {/* Konfeti Efekti */}
              <View style={styles.discountModalConfetti}>
                <Text style={styles.discountModalConfettiText}>🎉</Text>
                <Text style={styles.discountModalConfettiText}>✨</Text>
                <Text style={styles.discountModalConfettiText}>🎁</Text>
              </View>

              {/* Başlık */}
              <View style={styles.discountModalHeader}>
                <Ionicons name="gift" size={60} color="#FFFFFF" />
                <Text style={styles.discountModalTitle}>Tebrikler! 🎊</Text>
                <Text style={styles.discountModalSubtitle}>
                  Paylaşımınız için özel indirim kodunuz hazır!
                </Text>
              </View>

              {/* İndirim Kodu */}
              <View style={styles.discountCodeContainer}>
                <Text style={styles.discountCodeLabel}>İndirim Kodunuz:</Text>
                <View style={styles.discountCodeBox}>
                  <Text style={styles.discountCodeText}>{discountCode}</Text>
                </View>
                <Text style={styles.discountCodeInfo}>
                  %15 indirim kazandınız! 🎁
                </Text>
              </View>

              {/* Butonlar */}
              <View style={styles.discountModalButtons}>
                <TouchableOpacity
                  style={styles.discountCopyButton}
                  onPress={copyDiscountCode}
                >
                  <Ionicons name="share-social" size={20} color="#FFFFFF" />
                  <Text style={styles.discountCopyButtonText}>Kodu Paylaş</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.discountShopButton}
                  onPress={() => {
                    setDiscountModalVisible(false);
                    if (selectedProduct?.link) {
                      Linking.openURL(selectedProduct.link);
                    }
                  }}
                >
                  <Ionicons name="cart" size={20} color="#FF8C00" />
                  <Text style={styles.discountShopButtonText}>Alışverişe Başla</Text>
                </TouchableOpacity>
              </View>

              {/* Kapat Butonu */}
              <TouchableOpacity
                style={styles.discountCloseButton}
                onPress={() => setDiscountModalVisible(false)}
              >
                <Text style={styles.discountCloseButtonText}>Daha Sonra</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text,
    ...FONTS.medium,
  },
  instructionsContainer: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  instructionsGradient: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  instructionsContent: {
    gap: 8,
    paddingRight: 30,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 13,
    color: "#000",
    lineHeight: 18,
  },
  instructionsCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    paddingHorizontal: 10,
  },
  resultSectionContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 25,
  },
  resultImageContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
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
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    fontSize: 12,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
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
  // Brush Controls Overlay - dışarı tıklayınca kapat
  brushControlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 900, // Fırça panelinin altında
    backgroundColor: "transparent",
  },
  // Brush Controls Panel
  brushControlsPanel: {
    position: "absolute",
    zIndex: 1000, // Overlay'in üstünde
    backgroundColor: COLORS.background,
    borderRadius: 20,
    left: 50,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  // Android Brush Controls
  brushControlsAndroid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  brushButton: {
    backgroundColor: COLORS.text,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  brushButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 16,
  },
  brushSizeDisplay: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: "center",
  },
  brushSizeText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
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
    position: "relative",
    width: "100%",
    maxHeight: 600,
    aspectRatio: 9 / 16,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  comparisonContainer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 10,
    marginVertical: 20,
  },
  comparisonImageWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  comparisonLabel: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "bold",
  },
  comparisonImage: {
    width: "100%",
    aspectRatio: 9 / 16,
  },
  beforeAfterContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  sliderInstructions: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 200,
    pointerEvents: "none",
  },
  sliderInstructionsGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sliderInstructionsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  resultImage: {
    width: "100%",
    aspectRatio: 9 / 16, // Crop edilmiş fotoğrafın exact ratio'su
    borderRadius: 10,
  },
  resultButtonsContainer: {
    gap: 3,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    width: "100%",
    flexDirection: "row",
    padding: 10,
  },
  resultButtons: {
    backgroundColor: COLORS.button,
    padding: 10,
    borderRadius: 10,
    width: "50%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  shareButton: {
    backgroundColor: COLORS.button, // Yeşil paylaş butonu
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
    alignItems: "center",
  },
  similarPhotosTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  similarPhotosSubtitle: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.7,
    textAlign: "center",
  },
  similarPhotosLoading: {
    alignItems: "center",
    justifyContent: "center",
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
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  similarPhotoImage: {
    width: "100%",
    height: "100%",
  },
  similarPhotoGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: "flex-end",
    padding: 12,
  },
  similarPhotoInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  deviceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  deviceText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  noSimilarPhotos: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    opacity: 0.6,
  },
  noSimilarPhotosTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noSimilarPhotosDesc: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 20,
  },

  // Modal Stilleri
  photoModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    height: "80%",
    position: "relative",
  },
  modalCloseButton: {
    position: "absolute",
    top: -50,
    right: 10,
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  modalPhotoInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  modalInfoGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
  },
  modalProductName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  modalMetaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalDeviceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  modalDeviceText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  modalDate: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  shareModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareModalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 28,
    width: "90%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  shareModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 18,
    color: COLORS.text,
  },
  shareOptionsRow: {
    flexDirection: "column",
    justifyContent: "center",
    width: "100%",
    marginBottom: 18,
    height: 350,
    gap: 12,
  },
  shareOption: {
    
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    backgroundColor: COLORS.button,
    marginHorizontal: 4,
  },
  shareOptionText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
  },
  shareCancelButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.active,
    width: "100%",
    alignItems: "center",
  },
  shareCancelText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 16,
  },
  // İndirim Kodu Modal Stilleri
  discountModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  discountModalContainer: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  discountModalGradient: {
    padding: 30,
    alignItems: "center",
  },
  discountModalConfetti: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    zIndex: 1,
  },
  discountModalConfettiText: {
    fontSize: 30,
    opacity: 0.7,
  },
  discountModalHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  discountModalTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 15,
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  discountModalSubtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.95,
    lineHeight: 22,
  },
  discountCodeContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 25,
  },
  discountCodeLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 10,
    opacity: 0.9,
  },
  discountCodeBox: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  discountCodeText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FF8C00",
    letterSpacing: 2,
  },
  discountCodeInfo: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  discountModalButtons: {
    width: "100%",
    gap: 12,
  },
  discountCopyButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  discountCopyButtonText: {
    color: "#FF8C00",
    fontSize: 16,
    fontWeight: "700",
  },
  discountShopButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  discountShopButtonText: {
    color: "#FF8C00",
    fontSize: 16,
    fontWeight: "700",
  },
  discountCloseButton: {
    marginTop: 15,
    paddingVertical: 10,
  },
  discountCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.8,
  },
  // ProductSlider Container - Step 1'de alt kısımda gösterilecek
  productSliderContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});

export default PhotoEditScreen;
