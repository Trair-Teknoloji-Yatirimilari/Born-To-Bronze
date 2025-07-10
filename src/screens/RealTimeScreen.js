import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  FlatList,
  useWindowDimensions,
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
import { PRODUCTS } from "../constants/products";

function RealTimeScreen() {
  const { width, height } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraMounted, setCameraMounted] = useState(true);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("front");
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]); // Varsayılan ürün
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
  const isCameraActive = !cameraPaused && isFocused && appState === "active";
  const cameraDevice = useCameraDevice(cameraFacing);
  const format = useCameraFormat(cameraDevice, [
    {
      videoResolution: { width: 854, height: 480 },
      fps: 30,
    },
  ]);
  const camera = useRef(null);
  const flatListRef = useRef(null);
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  useEffect(() => {
    // Seçili ürün değiştiğinde FlatList'i ortala
    const index = PRODUCTS.findIndex((p) => p.id === selectedProduct.id);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, [selectedProduct]);

  function handleUiRotation(rotation) {
    // Kamera rotasyonu için
  }

  function handleCameraMountError(error) {
    console.error("camera mount error", error);
  }

  function handleFacesDetected(faces, frame) {
    if (faces.length <= 0) return;
    // Yüz tespiti verileri sadece filtre için kullanılıyor
  }

  function handleSkiaActions(faces, frame) {
    "worklet";
    if (faces.length <= 0) return;

    const { contours } = faces[0];

    // Yüz konturu oluştur
    const facePath = Skia.Path.Make();
    const necessaryContours = ["FACE", "LEFT_CHEEK", "RIGHT_CHEEK"];
    necessaryContours.forEach((key) => {
      contours?.[key]?.forEach((point, index) => {
        if (index === 0) {
          facePath.moveTo(point.x, point.y);
        } else {
          facePath.lineTo(point.x, point.y);
        }
      });
      facePath.close();
    });

    // Seçili ürünün rengine göre bronzlaştırma filtresi
    const color = selectedProduct.color;
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    const colorMatrix = [
      1, 0, 0, 0, r * 0.2,
      0, 1, 0, 0, g * 0.1,
      0, 0, 1, 0, b * 0.05,
      0, 0, 0, 0.5, 0,
    ];
    const bronzeFilter = Skia.ColorFilter.MakeMatrix(colorMatrix);
    const bronzePaint = Skia.Paint();
    bronzePaint.setColorFilter(bronzeFilter);
    bronzePaint.setBlendMode(BlendMode.Overlay);

    // Kenarları yumuşatmak için blur
    const blurRadius = 10;
    const blurFilter = Skia.ImageFilter.MakeBlur(blurRadius, blurRadius, TileMode.Clamp, null);
    bronzePaint.setImageFilter(blurFilter);

    // Yüz bölgesine filtre uygula
    frame.save();
    frame.clipPath(facePath, ClipOp.Intersect, true);
    frame.render(bronzePaint);
    frame.restore();
  }

  const [capturedPhoto, setCapturedPhoto] = useState(null);

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
    if (selectedProduct.link) {
      Linking.openURL(selectedProduct.link);
    }
  }

  function closePreview() {
    setCapturedPhoto(null);
  }

  const renderProduct = ({ item, index }) => {
    if (item.id === selectedProduct.id) return null; // Seçili ürün butonda gösterilecek
    return (
      <TouchableOpacity
        style={styles.productItem}
        onPress={() => setSelectedProduct(item)}
      >
        <Image source={item.pngImage} style={styles.productImage} />
        <Text style={styles.productName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  if (capturedPhoto) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: `file://${capturedPhoto.path}` }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.previewButtons}>
          <TouchableOpacity style={styles.previewButton} onPress={buyProduct}>
            <Text style={styles.previewButtonText}>Satın Al</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewButton} onPress={() => {}}>
            <Text style={styles.previewButtonText}>Paylaş</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewButton} onPress={closePreview}>
            <Text style={styles.previewButtonText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {hasPermission && cameraDevice ? (
        <>
          {cameraMounted && (
            <>
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
              {cameraPaused && (
                <Text
                  style={{
                    width: "100%",
                    backgroundColor: "rgb(0,0,255)",
                    textAlign: "center",
                    color: "white",
                  }}
                >
                  Camera is PAUSED
                </Text>
              )}
            </>
          )}
          {!cameraMounted && (
            <Text
              style={{
                width: "100%",
                backgroundColor: "rgb(255,255,0)",
                textAlign: "center",
              }}
            >
              Camera is NOT mounted
            </Text>
          )}
        </>
      ) : (
        <Text
          style={{
            width: "100%",
            backgroundColor: "rgb(255,0,0)",
            textAlign: "center",
            color: "white",
          }}
        >
          No camera device or permission
        </Text>
      )}
      <View style={styles.bottomContainer}>
        <FlatList
          ref={flatListRef}
          data={PRODUCTS}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.productList}
          contentContainerStyle={{ paddingHorizontal: 10 }}
          initialScrollIndex={PRODUCTS.findIndex((p) => p.id === selectedProduct.id)}
          getItemLayout={(data, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
        />
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <Image source={selectedProduct.pngImage} style={styles.captureButtonImage} />
          <View style={styles.innerCaptureButton} />
        </TouchableOpacity>
        <View style={styles.dummyView} />
      </View>
      <View style={styles.toggleButtons}>
        <TouchableOpacity
          onPress={() =>
            setCameraFacing((current) => (current10 === "front" ? "back" : "front"))
          }
          style={styles.toggleButton}
        >
          <Text style={styles.toggleButtonText}>Toggle Cam</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCameraPaused((current) => !current)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleButtonText}>
            {cameraPaused ? "Resume" : "Pause"} Cam
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCameraMounted((current) => !current)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleButtonText}>
            {cameraMounted ? "Unmount" : "Mount"} Cam
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  productList: {
    flexGrow: 0,
    maxWidth: "40%",
  },
  productItem: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  productImage: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  productName: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
  },
  innerCaptureButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.3)",
    position: "absolute",
  },
  captureButtonImage: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    zIndex: 1,
  },
  dummyView: {
    width: "40%",
  },
  toggleButtons: {
    position: "absolute",
    top: 20,
    right: 0,
    flexDirection: "column",
    alignItems: "flex-end",
  },
  toggleButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  toggleButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  previewButtons: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  previewButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 15,
    borderRadius: 10,
  },
  previewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default RealTimeScreen;