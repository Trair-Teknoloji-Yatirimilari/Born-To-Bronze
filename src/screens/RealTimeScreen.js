import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  Button,
  View,
  useWindowDimensions,
} from "react-native";
import {
  DrawableFrame,
  Frame,
  Camera as VisionCamera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useIsFocused } from "@react-navigation/core";
import { useAppState } from "@react-native-community/hooks";
import { Camera, Face } from "react-native-vision-camera-face-detector";
import { ClipOp, Skia, TileMode } from "@shopify/react-native-skia";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const RealTimeScreen = () => {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraMounted, setCameraMounted] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [cameraFacing, setCameraFacing] = useState("front");
  const [faceContours, setFaceContours] = useState(null);
  const [faceLandmarks, setFaceLandmarks] = useState(null);
  const faceDetectionOptions = useRef({
    performanceMode: "accurate",
    classificationMode: "all",
    contourMode: "all",
    landmarkMode: "all",
    trackingEnabled: true,
    minFaceSize: 0.1,
    windowWidth: screenW,
    windowHeight: screenH,
  });
  const isFocused = useIsFocused();
  const appState = useAppState();
  const isCameraActive = !cameraPaused && isFocused && appState === "active";
  const cameraDevice = useCameraDevice(cameraFacing);
  //
  // vision camera ref
  //
  const camera = useRef(null);
  //
  // face rectangle position
  //
  const aFaceW = useSharedValue(0);
  const aFaceH = useSharedValue(0);
  const aFaceX = useSharedValue(0);
  const aFaceY = useSharedValue(0);
  const aRot = useSharedValue(0);
  const boundingBoxStyle = useAnimatedStyle(() => {
    // Yüz daha çok oval şeklinde olduğu için genişlik ve yüksekliği ayrı ayrı kullan
    const faceWidth = aFaceW.value;
    const faceHeight = aFaceH.value;
    
    return {
      position: "absolute",
      borderWidth: 3,
      borderColor: "rgba(184, 134, 11, 0.8)", // Bronz çerçeve rengi
      backgroundColor: "rgba(210, 180, 140, 0.3)", // Yarı şeffaf bronz iç alan
      borderRadius: Math.min(faceWidth, faceHeight) / 2, // Daha doğal oval şekil
      width: withTiming(faceWidth * 1.1, { duration: 100 }), // Biraz daha geniş
      height: withTiming(faceHeight * 1.2, { duration: 100 }), // Biraz daha uzun
      left: withTiming(aFaceX.value - (faceWidth * 0.05), {
        duration: 100,
      }),
      top: withTiming(aFaceY.value - (faceHeight * 0.1), {
        duration: 100,
      }),
      transform: [
        {
          rotate: `${aRot.value}deg`,
        },
      ],
    };
  });

  useEffect(() => {
    if (hasPermission) return;
    requestPermission();
  }, []);

  useEffect(() => {
    if (hasPermission && cameraDevice) {
      // İzinler ve cihaz hazır olduğunda kamerayı otomatik monte et
      setCameraMounted(true);
    }
  }, [hasPermission, cameraDevice]);

  /**
   * Handle camera UI rotation
   *
   * @param {number} rotation Camera rotation
   */
  function handleUiRotation(rotation) {
    aRot.value = rotation;
  }

  /**
   * Hanldes camera mount error event
   *
   * @param {any} error Error event
   */
  function handleCameraMountError(error) {
    console.error("camera mount error", error);
  }

  /**
   * Handle detection result
   *
   * @param {Face[]} faces Detection result
   * @param {Frame} frame Current frame
   * @returns {void}
   */
  function handleFacesDetected(faces, frame) {
    // if no faces are detected we do nothing
    if (faces.length <= 0) {
      aFaceW.value = 0;
      aFaceH.value = 0;
      aFaceX.value = 0;
      aFaceY.value = 0;
      setFaceContours(null);
      setFaceLandmarks(null);
      return;
    }

    console.log(
      "faces",
      faces.length,
      "frame",
      frame.toString(),
      "faces",
      JSON.stringify(faces)
    );

    const { bounds, contours, landmarks } = faces[0];
    const { width, height, x, y } = bounds;

    console.log("CONTOURS mevcut mu?", contours ? "EVET" : "HAYIR");
    console.log("LANDMARKS mevcut mu?", landmarks ? "EVET" : "HAYIR");
    
    if (contours) {
      console.log("Mevcut contour'lar:", Object.keys(contours));
      setFaceContours(contours);
    } else {
      setFaceContours(null);
    }
    
    if (landmarks) {
      console.log("Mevcut landmark'lar:", Object.keys(landmarks));
      setFaceLandmarks(landmarks);
    } else {
      setFaceLandmarks(null);
    }

    // Yüz tespit kütüphanesinden gelen değerler 0-1 aralığında (yüzde) ise
    // bunları ekrandaki piksel değerlerine çevirelim.
    const faceW = width > 1 ? width : width * screenW;
    const faceH = height > 1 ? height : height * screenH;
    const faceX = x > 1 ? x : x * screenW;
    const faceY = y > 1 ? y : y * screenH;

    aFaceW.value = faceW;
    aFaceH.value = faceH;
    aFaceX.value = faceX;
    aFaceY.value = faceY;

    // only call camera methods if ref is defined
    if (camera.current) {
      // take photo, capture video, etc...
    }
  }

  /**
   * Handle skia frame actions
   *
   * @param {Face[]} faces Detection result
   * @param {DrawableFrame} frame Current frame
   * @returns {void}
   */
  function handleSkiaActions(faces, frame) {
    "worklet";
    
    console.log("SKIA ÇALIŞIYOR - faces sayısı:", faces.length);
    
    // Skia'nın çalıştığını test etmek için basit bir daire çiz
    const testPaint = Skia.Paint();
    testPaint.setColor(Skia.Color("red"));
    frame.drawCircle(100, 100, 50, testPaint);
    
    // if no faces are detected we do nothing
    if (faces.length <= 0) {
      console.log("YÜZ BULUNAMADI");
      return;
    }

    console.log("YÜZ BULUNDU - faces", faces.length, "frame", frame.toString());

    const { bounds, contours, landmarks } = faces[0];
    
    console.log("BOUNDS:", JSON.stringify(bounds));
    console.log("CONTOURS:", contours ? Object.keys(contours) : "contours yok");
    console.log("FACE contour:", contours?.FACE ? `${contours.FACE.length} nokta` : "FACE contour yok");

    // Yüz konturlarını kullanarak bronzlaştırma efekti uygula
    const bronzePaint = Skia.Paint();
    bronzePaint.setColor(Skia.Color("rgba(210, 180, 140, 0.4)")); // Bronz rengi, yarı şeffaf
    bronzePaint.setStyle(0); // Fill style
    
    const contourPath = Skia.Path.Make();
    const faceContours = ["FACE"];

    faceContours.map((key) => {
      const contourPoints = contours?.[key];
      if (!contourPoints || contourPoints.length === 0) {
        console.log(`${key} contour bulunamadı`);
        return;
      }

      console.log(`${key} contour bulundu - ${contourPoints.length} nokta`);

      contourPoints.map((point, index) => {
        if (index === 0) {
          // İlk nokta - başlangıç noktası
          contourPath.moveTo(point.x, point.y);
        } else {
          // Devam noktaları
          contourPath.lineTo(point.x, point.y);
        }
      });
      contourPath.close();
    });

    // Yüz şeklini boyayın
    console.log("YÜZ ŞEKLİ BOYANIYOR");
    frame.drawPath(contourPath, bronzePaint);

    // İsteğe bağlı: Yüz sınırlarını belirginleştirmek için çerçeve çizin
    const borderPaint = Skia.Paint();
    borderPaint.setColor(Skia.Color("rgba(184, 134, 11, 0.8)")); // Daha koyu bronz
    borderPaint.setStyle(1); // Stroke style
    borderPaint.setStrokeWidth(2);
    frame.drawPath(contourPath, borderPaint);
    
    console.log("SKIA İŞLEMLERİ TAMAMLANDI");
  }

  // Gelişmiş yüz şekli overlay'leri için fonksiyon
  const renderAdvancedFaceOverlay = () => {
    if (!faceContours && !faceLandmarks) {
      // Kontur verisi yoksa basit oval kullan
      return <Animated.View style={boundingBoxStyle} />;
    }

    // Kontur verisi varsa çoklu bölge overlay'i oluştur
    const overlays = [];
    
    if (faceContours) {
      // Ana yüz bölgesi için overlay (alın ve yanaklar)
      if (faceContours.FACE) {
        overlays.push(
          <ForeheadOverlay key="forehead" facePoints={faceContours.FACE} />
        );
      }
      
      // Yanak bölgeleri için ayrı overlay'ler
      if (faceContours.LEFT_CHEEK) {
        overlays.push(
          <FaceRegionOverlay 
            key="left-cheek"
            points={faceContours.LEFT_CHEEK}
            color="rgba(210, 180, 140, 0.4)"
            borderColor="rgba(184, 134, 11, 0.4)"
          />
        );
      }
      
      if (faceContours.RIGHT_CHEEK) {
        overlays.push(
          <FaceRegionOverlay 
            key="right-cheek"
            points={faceContours.RIGHT_CHEEK}
            color="rgba(210, 180, 140, 0.4)"
            borderColor="rgba(184, 134, 11, 0.4)"
          />
        );
      }
    }

    // Landmark verisi varsa, burun köprüsü ve çene için ek overlay'ler
    if (faceLandmarks) {
      if (faceLandmarks.NOSE_TIP) {
        overlays.push(
          <NoseBridgeOverlay key="nose" landmarks={faceLandmarks} />
        );
      }
    }

    return overlays.length > 0 ? overlays : <Animated.View style={boundingBoxStyle} />;
  };

  // Alın bölgesi için özel overlay (gözleri dışarıda bırakır)
  const ForeheadOverlay = ({ facePoints }) => {
    if (!facePoints || facePoints.length === 0) return null;
    
    const getBoundingBox = (points) => {
      let minX = points[0].x * screenW;
      let maxX = points[0].x * screenW;
      let minY = points[0].y * screenH;
      let maxY = points[0].y * screenH;
      
      points.forEach(point => {
        const x = point.x * screenW;
        const y = point.y * screenH;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
      
      return { minX, maxX, minY, maxY };
    };

    const bounds = getBoundingBox(facePoints);
    const faceHeight = bounds.maxY - bounds.minY;
    const faceWidth = bounds.maxX - bounds.minX;
    
    // Alın bölgesi (yüzün üst %30'u)
    const foreheadHeight = faceHeight * 0.3;
    
    return (
      <View 
        style={{
          position: 'absolute',
          left: bounds.minX + faceWidth * 0.1,
          top: bounds.minY,
          width: faceWidth * 0.8,
          height: foreheadHeight,
          backgroundColor: "rgba(210, 180, 140, 0.35)",
          borderColor: "rgba(184, 134, 11, 0.4)",
          borderWidth: 1,
          borderTopLeftRadius: faceWidth * 0.3,
          borderTopRightRadius: faceWidth * 0.3,
        }}
        pointerEvents="none"
      />
    );
  };

  // Burun köprüsü overlay'i
  const NoseBridgeOverlay = ({ landmarks }) => {
    if (!landmarks.NOSE_TIP) return null;
    
    const noseTip = landmarks.NOSE_TIP;
    const noseX = noseTip.x * screenW;
    const noseY = noseTip.y * screenH;
    
    return (
      <View 
        style={{
          position: 'absolute',
          left: noseX - 15,
          top: noseY - 25,
          width: 30,
          height: 40,
          backgroundColor: "rgba(210, 180, 140, 0.3)",
          borderColor: "rgba(184, 134, 11, 0.3)",
          borderWidth: 1,
          borderRadius: 15,
        }}
        pointerEvents="none"
      />
    );
  };

  // Yüz bölgesi overlay bileşeni
  const FaceRegionOverlay = ({ points, color, borderColor }) => {
    if (!points || points.length === 0) return null;

    // Kontur noktalarından bounding box hesapla
    const getBoundingBox = (points) => {
      if (points.length === 0) return null;
      
      let minX = points[0].x * screenW;
      let maxX = points[0].x * screenW;
      let minY = points[0].y * screenH;
      let maxY = points[0].y * screenH;
      
      points.forEach(point => {
        const x = point.x * screenW;
        const y = point.y * screenH;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    };

    const boundingBox = getBoundingBox(points);
    if (!boundingBox) return null;

    return (
      <View 
        style={{
          position: 'absolute',
          left: boundingBox.x,
          top: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
          backgroundColor: color,
          borderColor: borderColor,
          borderWidth: 1,
          borderRadius: Math.min(boundingBox.width, boundingBox.height) / 4,
        }}
        pointerEvents="none"
      />
    );
  };

  return (
    <>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
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
                  faceDetectionOptions={{
                    ...faceDetectionOptions,
                    autoMode,
                    cameraFacing,
                  }}
                />

                {renderAdvancedFaceOverlay()}

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
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <View
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-around",
          }}
        >
          <Button
            onPress={() =>
              setCameraFacing((current) =>
                current === "front" ? "back" : "front"
              )
            }
            title={"Toggle Cam"}
          />

          <Button
            onPress={() => setAutoMode((current) => !current)}
            title={`${autoMode ? "Disable" : "Enable"} AutoMode`}
          />
        </View>
        <View
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-around",
          }}
        >
          <Button
            onPress={() => setCameraPaused((current) => !current)}
            title={`${cameraPaused ? "Resume" : "Pause"} Cam`}
          />

          <Button
            onPress={() => setCameraMounted((current) => !current)}
            title={`${cameraMounted ? "Unmount" : "Mount"} Cam`}
          />
        </View>
      </View>
    </>
  );
};

export default RealTimeScreen;
