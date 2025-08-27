import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
  useWindowDimensions,
  Animated,
  StatusBar,
  Linking,
  Alert,
  Platform,
  Vibration,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useSkiaFrameProcessor,
  runAtTargetFps,
} from "react-native-vision-camera";
import { useIsFocused } from "@react-navigation/core";
import { useAppState } from "@react-native-community/hooks";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import { ClipOp, Skia, TileMode, BlendMode } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import ViewShot from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import DeviceInfo from "react-native-device-info";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import Share from "react-native-share";

// API URL Configuration
const API_URL = "https://kafanagoreya.yumru.dev";

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

function RealTimeScreen() {
  const { width, height } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraFacing, setCameraFacing] = useState("front");
  const cameraDevice = useCameraDevice(cameraFacing);

  // Çözünürlük seçenekleri ve state
  const [selectedResolution, setSelectedResolution] = useState("phone");

  const resolutionOptions = {
    "480p": { width: 640, height: 480 },
    "720p": { width: 1280, height: 720 },
    phone: Dimensions.get("window"),
  };

  const format = useCameraFormat(cameraDevice, [
    {
      videoResolution: resolutionOptions[selectedResolution],
    },
    {
      fps: 30,
    },
  ]);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [filteredPhoto, setFilteredPhoto] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [hideUIOnPress, setHideUIOnPress] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Paylaşım için yeni state'ler
  const [resultImageId, setResultImageId] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(false); // Fotoğraf yükleniyor mu?

  // Animasyonlar
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const uiOpacityAnim = useRef(new Animated.Value(1)).current;

  // Loading dots animasyonları
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();
  const appState = useAppState();
  const isCameraActive = isFocused && appState === "active";

  const camera = useRef(null);
  const viewShotRef = useRef(null);

  const [PRODUCTS, setPRODUCTS] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductsLoading, setIsProductsLoading] = useState(true); // <-- Loading state

  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true); // <-- Başlangıçta loading
      try {
        const response = await fetch(`${API_URL}/api/products?product=filter`);
        const data = await response.json();
        setPRODUCTS(data.products);
        setSelectedProduct(data.products[1]);
        if (data.products.length > 0) {
          setIsProductsLoading(false);
        }
      } catch (e) {
        console.error("Ürünler yüklenirken hata:", e);
        setIsProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  // Pulse animasyonu - sadece kamera aktifken çalışsın
  // useEffect(() => {
  //   if (!isCameraActive) return;

  //   const pulse = Animated.loop(
  //     Animated.sequence([
  //       Animated.timing(pulseAnim, {
  //         toValue: 1.1,
  //         duration: 1000,
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(pulseAnim, {
  //         toValue: 1,
  //         duration: 1000,
  //         useNativeDriver: true,
  //       }),
  //     ])
  //   );
  //   pulse.start();
  //   return () => pulse.stop();
  // }, [isCameraActive]);

  // Yardım ipucunu otomatik gizle
  // useEffect(() => {
  //   if (showHelp) {
  //     const timer = setTimeout(() => setShowHelp(false), 3000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [showHelp]);

  // Preview ekranında hint'i otomatik gizle
  useEffect(() => {
    if (capturedPhoto && showHint) {
      const timer = setTimeout(() => setShowHint(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [capturedPhoto, showHint]);

  // Loading dots animasyonu - optimize edilmiş
  useEffect(() => {
    if (isProcessingPhoto || isUploading || isSharing) {
      const animateDotsSequence = () => {
        const sequence = Animated.stagger(200, [
          // Daha yavaş animasyon
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]);

        const reset = Animated.parallel([
          Animated.timing(dot1Anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]);

        Animated.loop(Animated.sequence([sequence, reset]), {
          iterations: -1,
        }).start();
      };

      animateDotsSequence();
    } else {
      // Animasyonları durdur
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
    }
  }, [isProcessingPhoto, isUploading, isSharing]);

  const { detectFaces } = useFaceDetector({
    performanceMode: "fast",
    classificationMode: "none", // Sadece yüz algılama
    contourMode: "all",
    landmarkMode: "none",
    windowWidth: width,
    windowHeight: height,
    fps: 30,
  });

  const NECESSARY_CONTOURS = ["FACE", "LEFT_CHEEK", "RIGHT_CHEEK"];
  const EXCLUDE_CONTOURS = [
    "LEFT_EYE",
    "RIGHT_EYE",
    "UPPER_LIP_TOP",
    "UPPER_LIP_BOTTOM",
    "LOWER_LIP_TOP",
    "LOWER_LIP_BOTTOM",
  ];
  // Paint object created outside of worklet
  const bronzePaint = useMemo(() => {
    if (!selectedProduct?.filterColor) return null;

    const hex = selectedProduct.filterColor;
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    // Ürün verisinden gelen intensity değeri, yoksa varsayılan 1.0
    const intensity = selectedProduct?.intensity || 1.0;

    // Daha gerçekçi bronz efekti için geliştirilmiş renk matrisi
    // Bu matris, orijinal renkleri koruyarak bronz tonunu daha doğal şekilde uygular
    const colorMatrix = [
      // Kırmızı kanal - bronz tonunu daha doğal şekilde uygula
      0.8 + 0.2 * intensity, // Temel kırmızı kanalı koru
      0.1 * intensity, // Yeşilden kırmızıya hafif geçiş
      0.1 * intensity, // Maviden kırmızıya hafif geçiş
      0,
      r * (0.3 * intensity), // Bronz renginin kırmızı bileşeni

      // Yeşil kanal - doğal bronz tonu için
      0.05 * intensity, // Kırmızıdan yeşile hafif geçiş
      0.85 + 0.15 * intensity, // Temel yeşil kanalı koru
      0.05 * intensity, // Maviden yeşile hafif geçiş
      0,
      g * (0.25 * intensity), // Bronz renginin yeşil bileşeni

      // Mavi kanal - bronz efektini dengele
      0.05 * intensity, // Kırmızıdan maviye hafif geçiş
      0.05 * intensity, // Yeşilden maviye hafif geçiş
      0.7 + 0.3 * intensity, // Temel mavi kanalı koru
      0,
      b * (0.2 * intensity), // Bronz renginin mavi bileşeni

      // Alpha kanal - şeffaflık kontrolü
      0,
      0,
      0,
      0.85 * intensity, // Daha doğal şeffaflık
      0,
    ];

    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(colorMatrix));
    // Ürün verisinden gelen filterType, yoksa varsayılan "Color"
    const filterType = selectedProduct?.filterType || "Color";
    paint.setBlendMode(BlendMode[filterType]);
    paint.setImageFilter(
      Skia.ImageFilter.MakeBlur(1.5, 1.5, TileMode.Clamp, null)
    );

    return paint;
  }, [
    selectedProduct?.filterColor,
    selectedProduct?.intensity,
    selectedProduct?.filterType,
  ]);

  // Cache'lenmiş path'ler için ref'ler
  const facePathRef = useRef(null);
  const excludePathRef = useRef(null);
  const lastContoursRef = useRef(null);

  const frameProcessor = useSkiaFrameProcessor(
    (frame) => {
      "worklet";

      // Her durumda frame'i render et - kamera görüntüsünü göster
      frame.render();

      // Eğer bronzePaint yoksa sadece normal kamera görüntüsünü göster
      if (!bronzePaint) {
        return;
      }

      const faces = detectFaces(frame);
      if (!faces.length) {
        return;
      }

      const { contours } = faces[0];
      if (!contours) {
        return;
      }

      // Contours değişmediyse cache'lenmiş path'leri kullan
      const contoursKey = JSON.stringify(contours);
      if (contoursKey === lastContoursRef.current) {
        if (facePathRef.current && excludePathRef.current) {
          frame.save();
          frame.clipPath(facePathRef.current, ClipOp.Intersect, true);
          if (excludePathRef.current.countPoints() > 0) {
            frame.clipPath(excludePathRef.current, ClipOp.Difference, true);
          }
          frame.render(bronzePaint);
          frame.restore();
        }
        return;
      }

      // Yeni contours - path'leri yeniden oluştur
      lastContoursRef.current = contoursKey;

      const facePath = Skia.Path.Make();
      const allPoints = NECESSARY_CONTOURS.flatMap(
        (key) => contours[key] || []
      );

      if (allPoints.length === 0) {
        return;
      }

      const maxX = Math.max(...allPoints.map((p) => p.x));
      const maxY = Math.max(...allPoints.map((p) => p.y));
      const minY = Math.min(...allPoints.map((p) => p.y));
      const faceSpanY = Math.max(1, maxY - minY);
      const minX = Math.min(...allPoints.map((p) => p.x));
      const faceSpanX = Math.max(1, Math.max(...allPoints.map((p) => p.x)) - minX);

      // Kaş referansı: alın yüksekliğini ölçmek için
      const leftBrowTop = contours["LEFT_EYEBROW_TOP"] || [];
      const rightBrowTop = contours["RIGHT_EYEBROW_TOP"] || [];
      const browPoints = [...leftBrowTop, ...rightBrowTop];
      let avgBrowY = null;
      if (browPoints.length > 0) {
        avgBrowY = browPoints.reduce((s, p) => s + p.y, 0) / browPoints.length;
      } else {
        const leftEye = contours["LEFT_EYE"] || [];
        const rightEye = contours["RIGHT_EYE"] || [];
        const eyePoints = [...leftEye, ...rightEye];
        if (eyePoints.length > 0) {
          avgBrowY = eyePoints.reduce((s, p) => s + p.y, 0) / eyePoints.length;
        }
      }

      // Yüzün ekranda kapladığı oran (hem yükseklik hem genişlikten)
      const faceSizeRatioY = Math.max(0, Math.min(1, faceSpanY / height));
      const faceSizeRatioXOnScreen = Math.max(0, Math.min(1, faceSpanX / width));
      const combinedSize = 0.6 * faceSizeRatioY + 0.4 * faceSizeRatioXOnScreen;
      const sizeNorm = Math.max(0, Math.min(1, (combinedSize - 0.12) / 0.38)); // ≈0.12..0.50 -> 0..1
      // Yüz küçükse daha düşük, büyükse daha yüksek hedef alın oranı (X ekseninde)
      const baseTarget = 0.23 + sizeNorm * 0.11; // 0.23..0.34
      const smallBoost = 0.53; // çok az arttırma
      const targetForeheadRatioX = baseTarget + smallBoost; // ≈0.245..0.355

      // Alın için referans X: kaş (yoksa göz)
      let avgBrowX = null;
      if (browPoints.length > 0) {
        avgBrowX = browPoints.reduce((s, p) => s + p.x, 0) / browPoints.length;
      } else {
        const leftEye = contours["LEFT_EYE"] || [];
        const rightEye = contours["RIGHT_EYE"] || [];
        const eyePoints = [...leftEye, ...rightEye];
        if (eyePoints.length > 0) {
          avgBrowX = eyePoints.reduce((s, p) => s + p.x, 0) / eyePoints.length;
        }
      }

      // Alın genişletme için X ekseninde genişletme
      // Yüz boyutuna göre X ekseninde genişletme miktarını hesapla - daha orantılı
      const baseExtensionRatio = 0.05; // Temel genişletme oranı (%5)
      const sizeAdjustment = sizeNorm * 0.03; // Yüz boyutuna göre ek ayarlama (%0-3)
      const foreheadExtensionRatio = baseExtensionRatio + sizeAdjustment; // 0.05..0.08 arası
      const foreheadExtensionX = foreheadExtensionRatio * faceSpanX;
      
      // Belirli contour indeksleri için X ekseninde genişletme
      const foreheadContourIndices = [32,33, 34, 35, 36,0, 1, 2, 3,4];
      
      // 1. Yüz konturu oluştur - FACE contour'unda belirli noktaları X ekseninde genişlet
      NECESSARY_CONTOURS.forEach((key) => {
        const pts = contours[key];
        if (pts && pts.length > 0) {
          // FACE contour'u için belirli indekslerdeki noktaları X ekseninde genişlet
          if (key === "FACE") {
            // Yüzün merkez X koordinatını bul
            const centerX = (Math.min(...pts.map(p => p.x)) + Math.max(...pts.map(p => p.x))) / 2;
            
            pts.forEach(({ x, y }, index) => {
              let newX = x;
              
              // Belirli indekslerdeki noktaları X ekseninde genişlet
              if (foreheadContourIndices.includes(index)) {
                // Merkezden uzaklığa göre genişlet - daha hassas hesaplama
                const distanceFromCenter = Math.abs(x - centerX);
                const maxDistanceFromCenter = faceSpanX / 2;
                
                // Merkezden uzak noktalar daha fazla genişletilsin (0.5x ile 1.0x arası)
                const distanceRatio = Math.min(1.0, distanceFromCenter / maxDistanceFromCenter);
                const adjustedExtension = foreheadExtensionX * (0.5 + distanceRatio * 0.5);
                
                if (x > centerX) {
                  // Sağ taraf - daha sağa genişlet
                  newX = x + adjustedExtension;
                } else {
                  // Sol taraf - daha sola genişlet
                  newX = x - adjustedExtension;
                }
              }
              
              index === 0 ? facePath.moveTo(newX, y) : facePath.lineTo(newX, y);
            });
          } else {
            // Diğer contourlar (LEFT_CHEEK, RIGHT_CHEEK) için normal işlem
            pts.forEach(({ x, y }, index) => {
              index === 0 ? facePath.moveTo(x, y) : facePath.lineTo(x, y);
            });
          }
          facePath.close();
        }
      });

      // Normal kontur kısmı kaldırıldı - sadece genişletilmiş kontur kullanılıyor

      // 3. Hariç tutulacak bölgeler (göz, dudak)
      const excludePath = Skia.Path.Make();
      EXCLUDE_CONTOURS.forEach((key) => {
        const pts = contours[key];
        if (pts && pts.length > 0) {
          pts.forEach(({ x, y }, i) => {
            i ? excludePath.lineTo(x, y) : excludePath.moveTo(x, y);
          });
          excludePath.close();
        }
      });

      // Path'leri cache'le
      facePathRef.current = facePath;
      excludePathRef.current = excludePath;

      // 4. Çizim - bronz efekti uygula
      frame.save();
      frame.clipPath(facePath, ClipOp.Intersect, true);
      if (excludePath.countPoints() > 0) {
        frame.clipPath(excludePath, ClipOp.Difference, true);
      }
      frame.render(bronzePaint);
      frame.restore();
    },
    [bronzePaint]
  );

  async function takePhoto() {
    try {
      setIsProcessingPhoto(true);

      // SNAPCHAT TARZI: Sadece kamera görüntüsünü capture et (UI elementleri hariç)
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture({
          format: "jpg",
          quality: 0.9,
          result: "tmpfile",
        });

        // Screenshot'ı photo objesi formatında oluştur
        const capturedPhoto = {
          path: uri,
          width: width,
          height: height,
          isFiltered: true, // Zaten gerçek zamanlı filtre dahil
          captureMethod: "realtime_capture",
          timestamp: new Date().toISOString(),
        };

        setCapturedPhoto(capturedPhoto);

        // Bu durumda ayrı filter processing'e gerek yok
        // Çünkü screenshot zaten filtreli görüntüyü içeriyor
        setFilteredPhoto({
          ...capturedPhoto,
          filterInfo: {
            productName: selectedProduct.name,
            productColor: selectedProduct.filterColor,
            filterType: "realtime_capture",
            method: "view_screenshot",
          },
        });
      } else {
        console.warn("ViewShot ref not available, falling back to camera");
        // Fallback: Normal camera photo
        if (camera.current) {
          const photo = await camera.current.takePhoto({
            qualityPrioritization: "balanced",
          });
          setCapturedPhoto(photo);
          await applyFilterToPhoto(photo);
        }
      }
    } catch (error) {
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  async function applyFilterToPhoto(photo) {
    try {
      // Mevcut handleSkiaActions fonksiyonundaki bronzlaştırma algoritmasını kullan
      const processedPhoto = await applyBronzeFilterToImage(photo);

      setFilteredPhoto({
        ...processedPhoto,
        isFiltered: true,
        filterInfo: {
          productName: selectedProduct.name,
          productColor: selectedProduct.filterColor,
          filterType: selectedProduct?.filterType || "Color",
          intensity: selectedProduct?.intensity || 1.0,
          appliedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Hata durumunda orijinal fotoğrafı kullan
      setFilteredPhoto(photo);
    }
  }

  async function applyBronzeFilterToImage(photo) {
    try {
      // selectedProduct kontrolü ekle
      if (!selectedProduct || !selectedProduct.filterColor) {
        console.warn("selectedProduct veya filterColor bulunamadı");
        return photo;
      }

      // handleSkiaActions'daki aynı bronzlaştırma algoritmasını kullan
      const color = selectedProduct.filterColor;
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;

      // Color Matrix (handleSkiaActions'dan alıntı)
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

      return {
        ...photo,
        processed: true,
        bronzeSettings: {
          productName: selectedProduct.name,
          filterColor: selectedProduct.filterColor,
          colorMatrix: colorMatrix,
          intensityR: r * 0.15,
          intensityG: g * 0.08,
          intensityB: b * 0.03,
          blendMode: selectedProduct?.filterType || "Color",
          alpha: selectedProduct?.intensity || 1.0,
        },
      };
    } catch (error) {
      console.error("Bronze filter application error:", error);
      return photo; // Fallback to original
    }
  }

  // Fotoğrafı backend'e upload etme fonksiyonu
  async function uploadPhotoToBackend(photoUri) {
    try {
      setIsUploading(true);

      if (!photoUri) {
        throw new Error("Fotoğraf URI'si boş");
      }

      // Device bilgilerini al
      const deviceInfo = await getDeviceInfo();
      if (!deviceInfo) {
        throw new Error("Cihaz bilgileri alınamadı");
      }

      // Fotoğraf dosyasını oku
      let fileInfo;
      try {
        fileInfo = await FileSystem.getInfoAsync(photoUri);
      } catch (fileError) {
        throw new Error(`Dosya bilgisi alınamadı: ${fileError.message}`);
      }

      if (!fileInfo.exists) {
        throw new Error("Fotoğraf dosyası bulunamadı");
      }

      // FormData oluştur
      const formData = new FormData();

      // URI format'ını kontrol et ve düzelt
      let imageUri = photoUri;
      if (
        !imageUri.startsWith("file://") &&
        !imageUri.startsWith("content://")
      ) {
        imageUri = `file://${photoUri}`;
      }

      if (!selectedProduct) {
        throw new Error("Seçili ürün bulunamadı");
      }

      formData.append("image", {
        uri: imageUri,
        name: `realtime-${Date.now()}.jpg`,
        type: "image/jpeg",
      });

      // Sadece ürün ve device bilgisi gönder - mask gerekmez
      formData.append("selectedProduct", JSON.stringify(selectedProduct));
      formData.append("deviceInfo", JSON.stringify(deviceInfo));

      const response = await fetch(
        `${API_URL}/api/public/phone/upload-filtered-photo`,
        {
          method: "POST",
          body: formData,
        }
      );

      // Response status kontrolü
      if (!response.ok) {
        throw new Error(`Upload server hatası: ${response.status} ${response.statusText}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error("Upload yanıtı JSON formatında değil");
      }

      if (result && result.success) {
        return {
          imageId: result.imageId,
          imageUrl: result.imageUrl,
          success: true,
        };
      } else {
        throw new Error(result?.error || "Upload başarısız");
      }
    } catch (error) {
      console.error("❌ Upload hatası:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  // Paylaş fonksiyonu
  async function sharePhoto() {
    try {
      if (!filteredPhoto || !filteredPhoto.path) {
        Alert.alert("Hata", "Paylaşılacak fotoğraf bulunamadı!");
        return;
      }

      setIsSharing(true);

      // Eğer henüz backend'e upload edilmemişse, önce upload et
      if (!resultImageId) {
        const uploadResult = await uploadPhotoToBackend(filteredPhoto.path);

        if (uploadResult.success) {
          setResultImageId(uploadResult.imageId);

          // Upload sonrası paylaşımı yap
          await performShare(uploadResult.imageId);
        } else {
          throw new Error("Fotoğraf upload edilemedi");
        }
      } else {
        // Zaten upload edilmişse, doğrudan paylaş
        await performShare(resultImageId);
      }
    } catch (error) {
      console.error("❌ Paylaşım hatası:", error);
      Alert.alert(
        "Paylaşım Hatası",
        "Fotoğraf paylaşılırken hata oluştu. Lütfen tekrar deneyin.",
        [{ text: "Tamam", style: "default" }]
      );
    } finally {
      setIsSharing(false);
    }
  }

  // Gerçek paylaşım işlemini yapan fonksiyon
  async function performShare(imageId) {
    try {
      const deviceInfo = await getDeviceInfo();
      
      if (!deviceInfo || !deviceInfo.uniqueId) {
        throw new Error("Cihaz bilgileri alınamadı");
      }

      const response = await fetch(`${API_URL}/api/public/phone/share-photo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: imageId,
          uniqueId: deviceInfo.uniqueId,
        }),
      });

      // Response status kontrolü
      if (!response.ok) {
        throw new Error(`Server hatası: ${response.status} ${response.statusText}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error("Server yanıtı JSON formatında değil");
      }

      if (result && result.success) {
        // Başarı için haptic feedback
        try {
          Vibration.vibrate([100, 50, 100]);
        } catch (vibrationError) {
          console.warn("Vibration hatası:", vibrationError);
        }

        Alert.alert(
          "Paylaşım Başarılı! 🎉",
          "Fotoğrafınız başarıyla paylaşıldı! Şimdi diğer kullanıcılar da bronzlaştırma filtrenizi görebilir.",
          [
            {
              text: "Harika! 🚀",
              style: "default",
              onPress: () => {
                // Başarılı paylaşım sonrası UI feedback
              },
            },
          ]
        );
      } else {
        throw new Error(result?.error || "Paylaşım API'si hatası");
      }
    } catch (error) {
      console.error("performShare hatası:", error);
      throw error;
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
    setFilteredPhoto(null);
    setShowHint(true); // Yeni fotoğraf için hint'i yeniden göster

    // Paylaşım state'lerini temizle
    setResultImageId(null);
    setIsSharing(false);
    setIsUploading(false);
  }

  // UI gizleme/gösterme fonksiyonları
  function hideUI() {
    setHideUIOnPress(true);
    Animated.timing(uiOpacityAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }

  function showUI() {
    setHideUIOnPress(false);
    Animated.timing(uiOpacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }

  const getCurrentProductIndex = () => {
    if (!selectedProduct || !PRODUCTS.length) return -1;
    return PRODUCTS.findIndex((p) => p.id === selectedProduct.id);
  };

  const getPreviousProduct = () => {
    if (!PRODUCTS.length) return null;
    const currentIndex = getCurrentProductIndex();
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : PRODUCTS.length - 1;
    return PRODUCTS[prevIndex];
  };

  const getNextProduct = () => {
    if (!PRODUCTS.length) return null;
    const currentIndex = getCurrentProductIndex();
    const nextIndex = currentIndex < PRODUCTS.length - 1 ? currentIndex + 1 : 0;
    return PRODUCTS[nextIndex];
  };

  const switchToPreviousProduct = () => {
    const prevProduct = getPreviousProduct();
    if (!prevProduct) return;

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

    setSelectedProduct(prevProduct);
    setShowHelp(false);
  };

  const switchToNextProduct = () => {
    const nextProduct = getNextProduct();
    if (!nextProduct) return;

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

    setSelectedProduct(nextProduct);
    setShowHelp(false);
  };

  // Çözünürlük değiştirme fonksiyonu
  const changeResolution = (newResolution) => {
    setSelectedResolution(newResolution);
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

  // Paylaşım fonksiyonları
  const handleShareApp = async () => {
    setShareModalVisible(false);
    await sharePhoto();
  };
  const handleShareWhatsApp = async () => {
    setShareModalVisible(false);
    if (!filteredPhoto || !filteredPhoto.path) {
      Alert.alert("Hata", "Paylaşılacak fotoğraf bulunamadı!");
      return;
    }
    try {
      let shareUrl = filteredPhoto.path;
      if (/^https?:\/\//.test(filteredPhoto.path)) {
        const fileName = `shared-photo-${Date.now()}.jpg`;
        const fileUri = FileSystem.cacheDirectory + fileName;
        
        try {
          const downloadRes = await FileSystem.downloadAsync(
            filteredPhoto.path,
            fileUri
          );
          shareUrl = downloadRes.uri;
        } catch (downloadError) {
          console.error("Dosya indirme hatası:", downloadError);
          Alert.alert("Hata", "Fotoğraf indirilemedi!");
          return;
        }
      }

      await Share.open({
        url: shareUrl,
        social: Share.Social.WHATSAPP,
        failOnCancel: false,
      });
    } catch (shareError) {
      console.error("WhatsApp paylaşım hatası:", shareError);
      Alert.alert("Paylaşım Hatası", "WhatsApp'ta paylaşım yapılamadı.");
    }
  };
  const handleShareInstagram = async () => {
    setShareModalVisible(false);
    if (!filteredPhoto || !filteredPhoto.path) {
      Alert.alert("Hata", "Paylaşılacak fotoğraf bulunamadı!");
      return;
    }
    try {
      let shareUrl = filteredPhoto.path;
      if (/^https?:\/\//.test(filteredPhoto.path)) {
        const fileName = `shared-photo-${Date.now()}.jpg`;
        const fileUri = FileSystem.cacheDirectory + fileName;
        
        try {
          const downloadRes = await FileSystem.downloadAsync(
            filteredPhoto.path,
            fileUri
          );
          shareUrl = downloadRes.uri;
        } catch (downloadError) {
          console.error("Dosya indirme hatası:", downloadError);
          Alert.alert("Hata", "Fotoğraf indirilemedi!");
          return;
        }
      }
      
      await Share.open({
        url: shareUrl,
        social: Share.Social.INSTAGRAM,
        failOnCancel: false,
      });
    } catch (shareError) {
      console.error("Instagram paylaşım hatası:", shareError);
      Alert.alert("Paylaşım Hatası", "Instagram'da paylaşım yapılamadı.");
    }
  };
  const handleShareOther = async () => {
    setShareModalVisible(false);
    if (!filteredPhoto || !filteredPhoto.path) {
      Alert.alert("Hata", "Paylaşılacak fotoğraf bulunamadı!");
      return;
    }
    try {
      let shareUrl = filteredPhoto.path;
      
      if (/^https?:\/\//.test(filteredPhoto.path)) {
        const fileName = `shared-photo-${Date.now()}.jpg`;
        const fileUri = FileSystem.cacheDirectory + fileName;
        
        try {
          const downloadRes = await FileSystem.downloadAsync(
            filteredPhoto.path,
            fileUri
          );
          shareUrl = downloadRes.uri;
        } catch (downloadError) {
          console.error("Dosya indirme hatası:", downloadError);
          Alert.alert("Hata", "Fotoğraf indirilemedi!");
          return;
        }
      }
      
      // file:// ile başlamıyorsa ekle
      if (!shareUrl.startsWith("file://")) {
        shareUrl = "file://" + shareUrl;
      }
      
      // Dosya gerçekten var mı kontrol et
      try {
        const fileInfo = await FileSystem.getInfoAsync(shareUrl);
        if (!fileInfo.exists) {
          Alert.alert("Hata", "Paylaşılacak dosya bulunamadı veya erişilemiyor!");
          return;
        }
      } catch (fileCheckError) {
        console.error("Dosya kontrol hatası:", fileCheckError);
        Alert.alert("Hata", "Dosya kontrol edilemedi!");
        return;
      }
      
      await Share.open({
        url: shareUrl,
        type: "image/jpeg",
        title: "Bronzlaştırılmış Fotoğrafını Paylaş",
        message: "Bronzlaştırıcı krem ile oluşturduğum fotoğrafı paylaşıyorum!",
        failOnCancel: false,
      });
    } catch (shareError) {
      console.error("Genel paylaşım hatası:", shareError);
      Alert.alert(
        "Paylaşım Hatası",
        `Paylaşım ekranı açılamadı: ${shareError.message || 'Bilinmeyen hata'}`
      );
    }
  };

  // Shimmer Effect Component
  const Shimmer = ({ children, style }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );

      animation.start();

      return () => {
        animation.stop();
      };
    }, []);

    const translateX = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [-width, width],
    });

    return (
      <View style={[{ backgroundColor: "#e0e0e0", overflow: "hidden" }, style]}>
        {children}
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            transform: [{ translateX }],
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      </View>
    );
  };

  const LoadingPlaceholder = () => (
    <View style={StyleSheet.absoluteFill}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* Camera view placeholder */}
      <View style={StyleSheet.absoluteFill}>
        <Shimmer style={StyleSheet.absoluteFill} />
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "transparent"]}
          style={styles.topBarGradient}
        />
        <View style={styles.productHeader}>
          <Shimmer style={styles.topProductImage} />
          <View style={styles.productInfo}>
            <Shimmer style={{ height: 18, width: 120, marginBottom: 4 }} />
            <Shimmer style={{ height: 14, width: 100 }} />
          </View>
        </View>
        <Shimmer style={styles.helpButton} />
      </View>

      {/* Bottom Container */}
      <View style={styles.bottomContainer}>
        {/* Sol yan ürün */}
        <View style={styles.sideProduct}>
          <View style={styles.sideProductContainer}>
            <Shimmer style={styles.sideProductImage} />
            <Shimmer style={{ height: 10, width: 50, marginTop: 6 }} />
          </View>
        </View>

        {/* Ana fotoğraf çekme butonu */}
        <View style={styles.mainCaptureButton}>
          <Shimmer style={styles.captureButtonGradient} />
          <Shimmer style={styles.innerMainCaptureButton} />
          <Shimmer style={styles.mainCaptureButtonImage} />
        </View>

        {/* Sağ yan ürün */}
        <View style={styles.sideProduct}>
          <View style={styles.sideProductContainer}>
            <Shimmer style={styles.sideProductImage} />
            <Shimmer style={{ height: 10, width: 50, marginTop: 6 }} />
          </View>
        </View>
      </View>

      {/* Swipe indicator */}
      <View style={styles.swipeIndicator}>
        <Shimmer style={{ height: 14, width: 100, alignSelf: "center" }} />
      </View>
    </View>
  );

  if (isProductsLoading || !selectedProduct) {
    return <LoadingPlaceholder />;
  }

  if (capturedPhoto) {
    const displayPhoto = filteredPhoto || capturedPhoto;

    return (
      <TouchableWithoutFeedback onPressIn={hideUI} onPressOut={showUI}>
        <View style={StyleSheet.absoluteFill}>
          <StatusBar barStyle="light-content" backgroundColor="black" />

          {/* Background Image */}
          <Image
            source={{ uri: `file://${displayPhoto.path}` }}
            style={StyleSheet.absoluteFill}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={COLORS.text} />
              <Text style={styles.processingText}>Fotoğraf yükleniyor...</Text>
            </View>
          )}

          {/* ✅ Minimal overlay sadece görsel zenginlik için */}
          {filteredPhoto && filteredPhoto.captureMethod === "realtime_capture" && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  pointerEvents: "none",
                },
              ]}
            />
          )}

          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: uiOpacityAnim,
                pointerEvents: hideUIOnPress ? "none" : "auto",
              },
            ]}
          ></Animated.View>

          {/* Processing overlay - her zaman görünür olsun */}
          {(isProcessingPhoto || isUploading || isSharing) && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingContent}>
                {isProcessingPhoto && (
                  <>
                    <Ionicons name="camera" size={32} color={COLORS.text} />
                    <Text style={styles.processingText}>
                      📸 Fotoğraf çekiliyor...
                    </Text>
                    <Text style={styles.processingSubText}>
                      Lütfen bekleyin
                    </Text>
                  </>
                )}
                {isUploading && (
                  <>
                    <Ionicons name="cloud-upload" size={32} color="#4285F4" />
                    <Text style={styles.processingText}>
                      📤 Fotoğraf yükleniyor...
                    </Text>
                    <Text style={styles.processingSubText}>
                      Uygulamaya gönderiliyor
                    </Text>
                  </>
                )}
                {isSharing && !isUploading && (
                  <>
                    <Ionicons name="share-social" size={32} color="#FF6B35" />
                    <Text style={styles.processingText}>
                      🚀 Paylaşılıyor...
                    </Text>
                    <Text style={styles.processingSubText}>
                      Toplulukla paylaşılıyor
                    </Text>
                  </>
                )}
                <View style={styles.loadingDots}>
                  <Animated.View
                    style={[
                      styles.dot,
                      {
                        transform: [
                          {
                            scale: dot1Anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1.2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.dot,
                      {
                        transform: [
                          {
                            scale: dot2Anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1.2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.dot,
                      {
                        transform: [
                          {
                            scale: dot3Anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1.2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Animasyonlu UI Container */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: uiOpacityAnim,
                pointerEvents: hideUIOnPress ? "none" : "auto",
              },
            ]}
          >
            {/* Product info header */}
            <View style={styles.previewHeader}>
              <View style={styles.productBadge}>
                <Image
                  source={{ uri: `${API_URL}${selectedProduct.imageUrl}` }}
                  style={styles.productBadgeImage}
                />
                <View style={styles.productBadgeContent}>
                  <Text style={styles.productBadgeTitle}>
                    {selectedProduct.name}
                  </Text>
                </View>
              </View>
            </View>

            {/* Filter status indicator */}
            {/* {filteredPhoto &&
              filteredPhoto.captureMethod === "clean_camera" && (
                <View style={styles.filterStatusBadge}>
                  <Ionicons name="camera" size={16} color="#4CAF50" />
                  <Text style={styles.filterStatusText}>
                    Temiz Kamera Capture ✨
                  </Text>
                </View>
              )} */}

            {/* Action buttons */}
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.shareButton,
                  (isSharing || isUploading) && styles.actionButtonDisabled,
                ]}
                onPress={() => setShareModalVisible(true)}
                disabled={isProcessingPhoto || isSharing || isUploading}
              >
                <Ionicons name="share-social" size={20} color={COLORS.text} />
                <Text style={styles.actionButtonText}>Paylaş</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.buyButton]}
                onPress={buyProduct}
                disabled={isProcessingPhoto}
              >
                <Ionicons name="cart" size={20} color={COLORS.text} />
                <Text style={styles.actionButtonText}>Satın Al</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.closeButton]}
                onPress={closePreview}
                disabled={isProcessingPhoto}
              >
                <Ionicons name="close" size={20} color={COLORS.text} />
                <Text style={styles.actionButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Basılı tutma ipucu */}
          {!hideUIOnPress && showHint && (
            <Animated.View
              style={[styles.holdToHideHint, { opacity: uiOpacityAnim }]}
            >
              <Text style={styles.holdToHideText}>👆 Basılı tut: UI gizle</Text>
            </Animated.View>
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
                        <Ionicons
                          name="logo-whatsapp"
                          size={32}
                          color={COLORS.text}
                        />
                        <Text style={styles.shareOptionText}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.shareOption}
                        onPress={handleShareInstagram}
                      >
                        <Ionicons
                          name="logo-instagram"
                          size={32}
                          color={COLORS.text}
                        />
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
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* ViewShot sadece kamera görüntüsünü kapsıyor - UI elementleri dışında */}
      <ViewShot
        ref={viewShotRef}
        style={StyleSheet.absoluteFill}
        options={{
          format: "jpg",
          quality: 1,
        }}
      >
        {hasPermission && cameraDevice ? (
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}
          >
            <Camera
              ref={camera}
              style={StyleSheet.absoluteFill}
              isActive={isCameraActive}
              device={cameraDevice}
              frameProcessor={frameProcessor}
              format={format}
              exposure={0}
              pixelFormat={Platform.OS === 'ios' ? "rgb" : 'yuv'}
              fps={30}
              photoQualityBalance="speed"
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
      </ViewShot>

      {/* Tüm UI elementleri ViewShot'ın DIŞINDA - fotoğrafta görünmeyecek */}

      {/* Top UI Bar */}
      <View style={styles.topBar}>
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "transparent"]}
          style={styles.topBarGradient}
        />
        <View style={styles.productHeader}>
          <Image
            source={{ uri: `${API_URL}${selectedProduct.imageUrl}` }}
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
          <ScrollView style={{ flex: 1 }}>
            <View style={styles.productInfoHeader}>
              <Image
                source={{ uri: `${API_URL}${selectedProduct.imageUrl}` }}
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

            <View style={styles.productInfoActions}>
              <TouchableOpacity
                style={styles.infoActionButton}
                onPress={() => Linking.openURL(selectedProduct.link)}
              >
                <Text style={styles.infoActionText}>Sitede Keşfet</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.productInfoActions}>
              <TouchableOpacity
                style={styles.infoActionButton}
                onPress={() => setShowHelp(false)}
              >
                <Text style={styles.infoActionText}>Kullanmaya Devam Et</Text>
              </TouchableOpacity>
            </View>

            {/* Resolution selection row */}
            <View style={styles.resolutionSection}>
              <Text style={styles.resolutionSectionTitle}>
                Kamera Çözünürlüğü
              </Text>
              <View style={styles.resolutionRow}>
                {Object.keys(resolutionOptions).map((resolution) => (
                  <TouchableOpacity
                    key={resolution}
                    style={[
                      styles.resolutionButton,
                      selectedResolution === resolution &&
                        styles.resolutionButtonSelected,
                    ]}
                    onPress={() => changeResolution(resolution)}
                  >
                    <Text
                      style={[
                        styles.resolutionButtonText,
                        selectedResolution === resolution &&
                          styles.resolutionButtonTextSelected,
                      ]}
                    >
                      {resolution === "phone"
                        ? "Telefon"
                        : resolution.toUpperCase()}
                    </Text>
                    {selectedResolution === resolution && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={COLORS.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filter information section */}
            <View style={styles.filterInfoSection}>
              <Text style={styles.filterInfoSectionTitle}>
                Filtre Bilgileri
              </Text>
              <View style={styles.filterInfoCard}>
                <View style={styles.filterInfoRow}>
                  <View style={styles.filterInfoItem}>
                    <Text style={styles.filterInfoLabel}>Uygulama Tipi</Text>
                    <Text style={styles.filterInfoValue}>
                      {selectedProduct?.filterType === "Color"
                        ? "Normal"
                        : selectedProduct?.filterType === "Overlay"
                        ? "Yoğun"
                        : "İnce"}
                    </Text>
                  </View>
                  <View style={styles.filterInfoItem}>
                    <Text style={styles.filterInfoLabel}>Yoğunluk</Text>
                    <Text style={styles.filterInfoValue}>
                      {selectedProduct?.intensity || 1.0}
                    </Text>
                  </View>
                </View>
                <View style={styles.filterInfoRow}>
                  <View
                    style={[
                      styles.filterInfoItem,
                      { backgroundColor: selectedProduct?.filterColor },
                    ]}
                  >
                    <Text style={styles.filterInfoLabel}>Filtre Rengi</Text>
                    <Text style={styles.filterInfoValue}>
                      {selectedProduct?.filterColor || "Bronz"}
                    </Text>
                  </View>
                  <View style={styles.filterInfoItem}>
                    <Text style={styles.filterInfoLabel}>Görünüm</Text>
                    <Text style={styles.filterInfoValue}>
                      {selectedProduct?.name}
                    </Text>
                  </View>
                </View>
                <View style={styles.filterInfoDescription}>
                  <Ionicons
                    name="information-circle"
                    size={14}
                    color={COLORS.text}
                  />
                  <Text style={styles.filterInfoDescriptionText}>
                    Gerçek zamanlı yüz algılama ile uygulanan bronzlaştırma
                    filtresi
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* Processing overlay */}
      {isProcessingPhoto && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <Text style={styles.processingText}>📸 Fotoğraf alınıyor...</Text>
          </View>
        </View>
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
              {getPreviousProduct() && (
                <>
                  <Image
                    source={{
                      uri: `${API_URL}${getPreviousProduct().imageUrl}`,
                    }}
                    style={styles.sideProductImage}
                  />
                  <Text style={styles.sideProductName}>
                    {getPreviousProduct().name}
                  </Text>
                </>
              )}
            </Animated.View>
          </TouchableOpacity>

          {/* Ana fotoğraf çekme butonu */}
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }, { translateX: slideAnim }],
            }}
          >
            <TouchableOpacity
              style={[
                styles.mainCaptureButton,
                isProcessingPhoto && styles.mainCaptureButtonDisabled,
              ]}
              onPress={takePhoto}
              disabled={isProcessingPhoto}
            >
              <LinearGradient
                colors={
                  isProcessingPhoto
                    ? ["#ccc", "#999", "#666"]
                    : ["#FF6B35", "#F7931E", "#FFD23F"]
                }
                style={styles.captureButtonGradient}
              />

              {isProcessingPhoto ? (
                <View style={styles.processingIndicator}>
                  <Text style={styles.processingIndicatorText}>⏳</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: `${API_URL}${selectedProduct.imageUrl}` }}
                  style={styles.mainCaptureButtonImage}
                />
              )}

              <View style={styles.innerMainCaptureButton} />
              <Text style={styles.mainCaptureButtonText}>
                {isProcessingPhoto ? "Capturing..." : selectedProduct.name}
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
              {getNextProduct() && (
                <>
                  <Image
                    source={{ uri: `${API_URL}${getNextProduct().imageUrl}` }}
                    style={styles.sideProductImage}
                  />
                  <Text style={styles.sideProductName}>
                    {getNextProduct().name}
                  </Text>
                </>
              )}
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
    maxHeight: Dimensions.get("window").height - 200,
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
    marginBottom: 10,
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

  // Resolution Section Styles
  resolutionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  resolutionSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  resolutionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  resolutionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  resolutionButtonSelected: {
    backgroundColor: COLORS.active,
    borderColor: COLORS.active,
  },
  resolutionButtonText: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.text,
  },
  resolutionButtonTextSelected: {
    color: "#fff",
  },

  // Filter Information Section Styles
  filterInfoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  filterInfoSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  filterInfoCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  filterInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterInfoItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.button,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterInfoLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: 4,
    textAlign: "center",
  },
  filterInfoValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 2,
    textAlign: "center",
  },
  filterInfoDescription: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    gap: 6,
  },
  filterInfoDescriptionText: {
    fontSize: 11,
    color: COLORS.text,
    opacity: 0.7,
    textAlign: "center",
    flex: 1,
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
  mainCaptureButtonDisabled: {
    opacity: 0.7,
  },
  processingIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  processingIndicatorText: {
    fontSize: 30,
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
    backgroundColor: COLORS.background,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },

  // Preview Screen Styles
  previewHeader: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  processingContent: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  processingText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  processingSubText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 4,
    opacity: 0.7,
  },
  loadingDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B35",
    marginHorizontal: 3,
  },
  filterStatusBadge: {
    position: "absolute",
    top: 130,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 10,
  },
  filterStatusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
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
  actionButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  shareButton: {
    backgroundColor: COLORS.button,
  },
  buyButton: {
    backgroundColor: COLORS.button,
  },
  closeButton: {
    backgroundColor: COLORS.active,
    color: COLORS.text,
  },
  actionButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },

  // Hold to hide hint styles
  holdToHideHint: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    transform: [{ translateY: -10 }],
    alignItems: "center",
    pointerEvents: "none",
  },
  holdToHideText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: "center",
    overflow: "hidden",
  },

  // Share Modal Styles
  shareModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareModalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 20,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  shareModalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  shareOptionsRow: {
    flexDirection: "column",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
    gap: 10,
  },
  shareOption: {
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "100%",
    backgroundColor: COLORS.button,
  },
  shareOptionText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 8,
  },
  shareCancelButton: {
    backgroundColor: COLORS.active,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  shareCancelText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: 5,
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 4,
    marginHorizontal: 5,
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#FF6B35",
    borderRadius: 4,
  },
  sliderButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  sliderButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  toggleButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  toggleButtonActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  toggleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  filterModeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  filterModeButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
    gap: 2,
  },

  filterModeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "600",
  },
  activeFilterMode: {
    backgroundColor: COLORS.button,
    color: COLORS.background,
  },
});

export default RealTimeScreen;
