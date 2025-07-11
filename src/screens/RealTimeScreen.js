import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { PRODUCTS } from "../constants/products";


function RealTimeScreen() {
  const { width, height } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraMounted, setCameraMounted] = useState(true);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("front");
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
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

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

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
      1, 0, 0, 0, r * 0.15,
      0, 1, 0, 0, g * 0.08,
      0, 0, 1, 0, b * 0.03,
      0, 0, 0, 0.6, 0,
    ];
    const bronzeFilter = Skia.ColorFilter.MakeMatrix(colorMatrix);
    const bronzePaint = Skia.Paint();
    bronzePaint.setColorFilter(bronzeFilter);
    bronzePaint.setBlendMode(BlendMode.Overlay);

    // Kenarları yumuşatmak için blur
    const blurRadius = 8;
    const blurFilter = Skia.ImageFilter.MakeBlur(blurRadius, blurRadius, TileMode.Clamp, null);
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
    setSelectedProduct(getPreviousProduct());
  };

  const switchToNextProduct = () => {
    setSelectedProduct(getNextProduct());
  };

  // Swipe gesture tanımla
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      'worklet';
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
        <Image
          source={{ uri: `file://${capturedPhoto.path}` }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.productInfo}>{selectedProduct.name}</Text>
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
      <Text style={styles.productInfo}>{selectedProduct.name}</Text>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.bottomContainer}>
          {/* Sol yan ürün */}
          <TouchableOpacity 
            style={styles.sideProduct} 
            onPress={switchToPreviousProduct}
          >
            <Image 
              source={getPreviousProduct().pngImage} 
              style={styles.sideProductImage} 
            />
            <Text style={styles.sideProductName}>
              {getPreviousProduct().name}
            </Text>
          </TouchableOpacity>

          {/* Ana fotoğraf çekme butonu */}
          <TouchableOpacity style={styles.mainCaptureButton} onPress={takePhoto}>
            <Image 
              source={selectedProduct.pngImage} 
              style={styles.mainCaptureButtonImage} 
            />
            <View style={styles.innerMainCaptureButton} />
                      <Text style={styles.mainCaptureButtonText}>
            {selectedProduct.name}
          </Text>
        </TouchableOpacity>
        
        {/* Swipe ipucu */}
        <View style={styles.swipeIndicator}>
          <Text style={styles.swipeText}>← Kaydır →</Text>
        </View>

          {/* Sağ yan ürün */}
          <TouchableOpacity 
            style={styles.sideProduct} 
            onPress={switchToNextProduct}
          >
            <Image 
              source={getNextProduct().pngImage} 
              style={styles.sideProductImage} 
            />
            <Text style={styles.sideProductName}>
              {getNextProduct().name}
            </Text>
          </TouchableOpacity>
        </View>
      </GestureDetector>
      <View style={styles.toggleButtons}>
        <TouchableOpacity
          onPress={() =>
            setCameraFacing((current) => (current === "front" ? "back" : "front"))
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
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  sideProduct: {
    alignItems: "center",
    opacity: 0.6,
    transform: [{ scale: 0.8 }],
  },
  sideProductImage: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  sideProductName: {
    color: "#fff",
    fontSize: 10,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 60,
  },
  mainCaptureButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  innerMainCaptureButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.2)",
    position: "absolute",
  },
  mainCaptureButtonImage: {
    width: 60,
    height: 60,
    resizeMode: "contain",
    zIndex: 1,
  },
  mainCaptureButtonText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "bold",
    position: "absolute",
    bottom: -25,
    left: 0,
    right: 0,
  },
  swipeIndicator: {
    position: "absolute",
    bottom: -50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  swipeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  toggleButtons: {
    position: "absolute",
    top: 20,
    right: 20,
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
  productInfo: {
    position: "absolute",
    top: 60,
    left: 20,
    color: "#fff",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
  },
});

export default RealTimeScreen;