import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from "react-native-vision-camera";
import { runOnJS } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
// @ts-ignore – native plugin; make sure to install it via yarn add react-native-vision-camera-face-detector
import { detectFaces } from 'react-native-vision-camera-face-detector';
import { PRODUCTS } from "../constants/products";
import { COLORS } from "../constants/theme";

const RealTimeScreen = () => {
  // -----------------------
  // Permissions & devices
  // -----------------------
  const devices = useCameraDevices();
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const device = isFrontCamera ? devices.front : devices.back;
  const cameraRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [faces, setFaces] = useState([]); // Detected faces per frame
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [isCapturing, setIsCapturing] = useState(false);

  // Request permission on mount
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "authorized");
      if (status !== "authorized") {
        Alert.alert(
          "Kamera izni gerekli",
          "Gerçek zamanlı önizleme için kamera iznine ihtiyacımız var."
        );
      }
    })();
  }, []);

  // -----------------------
  // Frame Processor – Face detection
  // -----------------------
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const facesDetected = detectFaces(frame);
    runOnJS(setFaces)(facesDetected.faces ?? facesDetected); // sürüme göre
  }, []);

  // -----------------------
  // Camera actions
  // -----------------------
  const toggleCamera = () => setIsFrontCamera((prev) => !prev);

  const takePhoto = useCallback(async () => {
    if (cameraRef.current == null) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePhoto({});
      setIsCapturing(false);
      // TODO: Navigate to a preview screen or reuse PhotoEditScreen with the captured uri.
      Alert.alert("Fotoğraf çekildi", "Dosya yolu: " + photo.path);
    } catch (err) {
      setIsCapturing(false);
      console.error(err);
      Alert.alert("Hata", "Fotoğraf çekilemedi: " + err.message);
    }
  }, []);

  // -----------------------
  // Render helpers
  // -----------------------
  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.productItem,
        selectedProduct.id === item.id && styles.selectedProductItem,
      ]}
      onPress={() => setSelectedProduct(item)}
    >
      {/* PNG görüntü şişe görseli transparan arka planlı */}
      <Image source={item.pngImage} style={styles.productImage} />
      <Text style={styles.productName}>{item.name}</Text>
    </TouchableOpacity>
  );

  // -----------------------
  // Early return if no device or permission
  // -----------------------
  if (device == null || !hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={COLORS.text} />
        <Text style={styles.permissionText}>
          Kamera hazırlanıyor, lütfen bekleyin...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Kamera Görünümü */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={15}
      />

      {/* Yüze uygulanan bronzlaştırıcı overlay */}
      {faces.map((face, idx) => {
        const {
          bounds: { origin, size },
        } = face;
        const overlayColor = selectedProduct.color || "#CD7F32";
        return (
          <View
            key={idx}
            style={[
              styles.faceOverlay,
              {
                left: origin.x,
                top: origin.y,
                width: size.width,
                height: size.height,
                backgroundColor: overlayColor + "66", // ~40% opacity
              },
            ]}
          />
        );
      })}

      {/* Kamera değiştir ve fotoğraf çek butonları */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.iconButton} onPress={toggleCamera}>
          <Ionicons name="camera-reverse" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomControls}>
        {/* Ürün seçimi */}
        <FlatList
          data={PRODUCTS}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, gap: 10 }}
        />

        {/* Fotoğraf çekme butonu */}
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          {isCapturing ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Ionicons name="camera" size={32} color={COLORS.text} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  permissionText: {
    marginTop: 10,
    color: COLORS.text,
    fontSize: 16,
  },
  faceOverlay: {
    position: "absolute",
    borderRadius: 100,
  },
  topControls: {
    position: "absolute",
    top: 40,
    right: 20,
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    backgroundColor: COLORS.button,
    padding: 8,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 15,
  },
  captureButton: {
    marginTop: 10,
    backgroundColor: COLORS.button,
    padding: 15,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  productItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 150,
    borderWidth: 1,
    borderColor: COLORS.text,
    borderRadius: 10,
    padding: 5,
    backgroundColor: COLORS.background,
  },
  selectedProductItem: {
    backgroundColor: COLORS.active,
  },
  productImage: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  productName: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
  },
});

export default RealTimeScreen; 