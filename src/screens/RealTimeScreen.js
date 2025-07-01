import React, { useEffect, useRef, useState, useCallback } from "react";
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
  useCameraPermission,
  Camera as VisionCamera,
  runAsync,
  useCameraDevice,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useIsFocused } from "@react-navigation/core";
import { useAppState } from "@react-native-community/hooks";
import { runOnJS } from "react-native-reanimated";
import { ClipOp, Skia, TileMode } from "@shopify/react-native-skia";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Defs, Mask, Rect } from "react-native-svg";

import {
  useFaceDetector,
  FaceDetectionOptions,
} from "react-native-vision-camera-face-detector";

const RealTimeScreen = () => {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [cameraMounted, setCameraMounted] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [cameraFacing, setCameraFacing] = useState("front");

  const [contours, setContours] = useState(null);
  const [landmarks, setLandmarks] = useState(null);

  // Shared values for worklet communication
  const sharedContours = useSharedValue(null);
  const sharedLandmarks = useSharedValue(null);

  const isFocused = useIsFocused();
  const appState = useAppState();
  const isCameraActive = !cameraPaused && isFocused && appState === "active";
  const cameraDevice = useCameraDevice(cameraFacing);

  const { hasPermission, requestPermission } = useCameraPermission();
  console.log("📸 hasPermission:", hasPermission);
  const hasPermissionCheck = hasPermission === "authorized";

  const faceDetectionOptions = useRef(
    /** @type {FaceDetectionOptions} */ ({
      performanceMode: "accurate",
      contourMode: "all",
      landmarkMode: "all",
      classificationMode: "none",
      minFaceSize: 0.1,
      trackingEnabled: true,
      autoMode: false,
    })
  ).current;

  const { detectFaces } = useFaceDetector(faceDetectionOptions) || {};
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
      left: withTiming(aFaceX.value - faceWidth * 0.05, {
        duration: 100,
      }),
      top: withTiming(aFaceY.value - faceHeight * 0.1, {
        duration: 100,
      }),
      transform: [
        {
          rotate: `${aRot.value}deg`,
        },
      ],
    };
  });



  
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      console.log("frameProcessor", frame);
      if (!frame || !detectFaces) {
        return;
      }
      const faces = detectFaces(frame);
      console.log("faces", faces);
      
      if (faces && faces.length > 0) {
        sharedContours.value = faces[0].contours;
        sharedLandmarks.value = faces[0].landmarks;
      } else {
        sharedContours.value = null;
        sharedLandmarks.value = null;
      }
    },
    [detectFaces, sharedContours, sharedLandmarks]
  );



  // Shared values'ı React state'e senkronize et
  useEffect(() => {
    const interval = setInterval(() => {
      setContours(sharedContours.value);
      setLandmarks(sharedLandmarks.value);
    }, 100); // 10 FPS update rate

    return () => clearInterval(interval);
  }, [sharedContours, sharedLandmarks]);

  useEffect(() => {
    if (hasPermission) return;
    requestPermission();
  }, []);

  useEffect(() => {
    if (hasPermission && cameraDevice) {
      // İzinler ve cihaz hazır olduğunda kamerayı otomatik monte et
      console.log("Camera on mounted");
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

  /**
   * Handle skia frame actions
   *
   * @param {Face[]} faces Detection result
   * @param {DrawableFrame} frame Current frame
   * @returns {void}
   */
  function handleSkiaActions(frame) {
    "worklet";
    if (!contours?.FACE) return;

    // FACE contour’dan path oluşturma
    const facePath = Skia.Path.Make();
    contours.FACE.forEach((pt, i) => {
      facePath.lineTo(pt.x * screenW, pt.y * screenH);
    });
    facePath.close();

    // çıkarılacak contour anahtarları
    const cutKeys = [
      "LEFT_EYE",
      "RIGHT_EYE",
      "UPPER_LIP_TOP",
      "LOWER_LIP_BOTTOM",
      "LEFT_EYEBROW_TOP",
      "RIGHT_EYEBROW_TOP",
    ];
    let maskPath = facePath;
    cutKeys.forEach((key) => {
      const pts = contours[key];
      if (!pts?.length) return;
      const p = Skia.Path.Make();
      pts.forEach((pt, i) => {
        p.lineTo(pt.x * screenW, pt.y * screenH);
      });
      p.close();
      // farkı al
      const out = Skia.Path.Make();
      Skia.PathOp(maskPath, p, ClipOp.Difference, out);
      maskPath = out;
    });

    // dolgu ve stroke
    const fill = Skia.Paint();
    fill.setColor(Skia.Color("rgba(210,180,140,0.4)"));
    fill.setStyle(0);
    frame.drawPath(maskPath, fill);

    const stroke = Skia.Paint();
    stroke.setColor(Skia.Color("rgba(184,134,11,0.8)"));
    stroke.setStyle(1);
    stroke.setStrokeWidth(2);
    frame.drawPath(maskPath, stroke);
  }

  // Yüz konturlarından SVG path oluşturma fonksiyonu
  const createPathFromPoints = (points) => {
    if (!points || points.length === 0) return "";
    
    let path = `M ${points[0].x * screenW} ${points[0].y * screenH}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x * screenW} ${points[i].y * screenH}`;
    }
    path += " Z"; // Path'i kapat
    return path;
  };

  // Gelişmiş yüz şekli overlay'leri için fonksiyon
  const renderAdvancedFaceOverlay = () => {
    if (!contours?.FACE) {
      // Kontur verisi yoksa basit oval kullan
      return <Animated.View style={boundingBoxStyle} />;
    }

    // Ana yüz konturundan path oluştur
    const facePathData = createPathFromPoints(contours.FACE);
    
    // Çıkarılacak bölgeler (göz, dudak, kaş)
    const exclusionPaths = [];
    
    // Gözler
    if (contours.LEFT_EYE) {
      exclusionPaths.push(createPathFromPoints(contours.LEFT_EYE));
    }
    if (contours.RIGHT_EYE) {
      exclusionPaths.push(createPathFromPoints(contours.RIGHT_EYE));
    }
    
    // Dudaklar
    if (contours.UPPER_LIP_TOP) {
      exclusionPaths.push(createPathFromPoints(contours.UPPER_LIP_TOP));
    }
    if (contours.LOWER_LIP_BOTTOM) {
      exclusionPaths.push(createPathFromPoints(contours.LOWER_LIP_BOTTOM));
    }
    
    // Kaşlar
    if (contours.LEFT_EYEBROW_TOP) {
      exclusionPaths.push(createPathFromPoints(contours.LEFT_EYEBROW_TOP));
    }
    if (contours.RIGHT_EYEBROW_TOP) {
      exclusionPaths.push(createPathFromPoints(contours.RIGHT_EYEBROW_TOP));
    }

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg 
          width={screenW} 
          height={screenH} 
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            {/* Ana yüz maskesi */}
            <Mask id="faceMask">
              {/* Beyaz alan - gösterilecek bölge */}
              <Path 
                d={facePathData} 
                fill="white" 
                fillRule="evenodd"
              />
              {/* Siyah alanlar - gizlenecek bölgeler */}
              {exclusionPaths.map((pathData, index) => (
                <Path 
                  key={index}
                  d={pathData} 
                  fill="black" 
                  fillRule="evenodd"
                />
              ))}
            </Mask>
          </Defs>
          
          {/* Ana overlay - sadece yüz şeklinde gösterilecek */}
          <Rect
            width="100%"
            height="100%"
            fill="rgba(210, 180, 140, 0.4)"
            mask="url(#faceMask)"
          />
          
          {/* Yüz çerçevesi - kontur */}
          <Path 
            d={facePathData} 
            fill="none" 
            stroke="rgba(184, 134, 11, 0.8)" 
            strokeWidth="2"
          />
        </Svg>
      </View>
    );
  };



  console.log(
    "📸 permission hasPermission:",
    hasPermission,
    "hasPermission:",
    hasPermission
  );
  console.log("📸 cameraDevice:", cameraDevice);

  console.log("detectFaces is function?", typeof detectFaces === "function");
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
                <VisionCamera
                  style={StyleSheet.absoluteFill}
                  device={cameraDevice}
                  isActive={true}
                  frameProcessor={frameProcessor}
                  frameProcessorFps={5}
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
