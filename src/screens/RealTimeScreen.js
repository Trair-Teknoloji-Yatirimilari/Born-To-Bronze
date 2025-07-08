import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Linking,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import {
  Camera,
  CameraPosition,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useSkiaFrameProcessor,
} from "react-native-vision-camera";
import {
  Contours,
  useFaceDetector,
} from "react-native-vision-camera-face-detector";
import { ClipOp, Skia, TileMode } from "@shopify/react-native-skia";
import { useRef } from "react";

const RealTimeScreen = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [position, setPosition] = useState("front");
  const [isCameraActive, setIsCameraActive] = useState(true);
  
  const device = useCameraDevice(position);
  const format = device
    ? useCameraFormat(device, [
        {
          videoResolution: {
            width: 800,
            height: 600,
          }
        },
        {
          fps: 15,
        },
      ])
    : undefined;

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const faceDetector = useFaceDetector({
    performanceMode: "fast",
    contourMode: "all",
    landmarkMode: "none",
    classificationMode: "none",
  });

  console.log('Face detector loaded:', !!faceDetector);

  const blurRadius = 20;
  const blurFilter = Skia.ImageFilter.MakeBlur(
    blurRadius,
    blurRadius,
    TileMode.Repeat,
    null
  );
  const paint = Skia.Paint();
  paint.setImageFilter(blurFilter);



  const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet';
    frame.render();

    if (!faceDetector || !faceDetector.detectFaces) {
      console.log('Face detector not available');
      return;
    }

    try {
      const result = faceDetector.detectFaces(frame);
      
      // Result direkt array olabilir, object değil
      const faces = Array.isArray(result) ? result : (result?.faces || []);


      for (const face of faces) {
        
        if (face.contours != null) {
          try {
            const facePoints = face.contours['FACE'] || [];
            
            // Gözlerin konumunu al
            let leftEyeY = null;
            let rightEyeY = null;
            
            if (face.contours['LEFT_EYE'] && face.contours['LEFT_EYE'].length > 0) {
              leftEyeY = face.contours['LEFT_EYE'][0].y;
            }
            if (face.contours['RIGHT_EYE'] && face.contours['RIGHT_EYE'].length > 0) {
              rightEyeY = face.contours['RIGHT_EYE'][0].y;
            }
            
            const eyeY = leftEyeY && rightEyeY ? Math.min(leftEyeY, rightEyeY) : null;
            
            // Alın bölgesini blur yap (sadece gözlerin üstü)
            if (facePoints.length > 10 && eyeY) {
              const foreheadPath = Skia.Path.Make();

              // Sadece gözlerin üstündeki noktaları al
              const foreheadPoints = facePoints.filter(point => point.y < eyeY - 20);
              
              if (foreheadPoints.length > 2) {
                // Yüzün kenar noktalarını da ekle
                const leftEdge = facePoints.slice(0, 3);
                const rightEdge = facePoints.slice(-3);
                
                const allForeheadPoints = [...leftEdge, ...foreheadPoints, ...rightEdge];
                
                allForeheadPoints.forEach((point, index) => {
                  if (index === 0) {
                    foreheadPath.moveTo(point.x, point.y);
                  } else {
                    foreheadPath.lineTo(point.x, point.y);
                  }
                });
                foreheadPath.close();
                
                frame.save();
                frame.clipPath(foreheadPath, ClipOp.Intersect, true);
                frame.render(paint);
                frame.restore();
              }
            }
            
            // Çene bölgesini blur yap (dudakların altı)
            let lowerLipY = null;
            if (face.contours['LOWER_LIP_BOTTOM'] && face.contours['LOWER_LIP_BOTTOM'].length > 0) {
              lowerLipY = Math.max(...face.contours['LOWER_LIP_BOTTOM'].map(p => p.y));
            }
            
            if (facePoints.length > 10 && lowerLipY) {
              const chinPath = Skia.Path.Make();
              
              // Sadece dudakların altındaki noktaları al
              const chinPoints = facePoints.filter(point => point.y > lowerLipY + 10);
              
              if (chinPoints.length > 2) {
                chinPoints.forEach((point, index) => {
                  if (index === 0) {
                    chinPath.moveTo(point.x, point.y);
                  } else {
                    chinPath.lineTo(point.x, point.y);
                  }
                });
                chinPath.close();
                
                frame.save();
                frame.clipPath(chinPath, ClipOp.Intersect, true);
                frame.render(paint);
                frame.restore();
              }
            }
            
            // Yanak bölgelerini blur yap (gözler ve dudakların yanında)
            if (eyeY && lowerLipY) {
              // Sol yanak
              const leftCheekPath = Skia.Path.Make();
              const leftCheekPoints = facePoints.filter(point => 
                point.x < face.bounds.x + face.bounds.width * 0.3 && 
                point.y > eyeY + 10 && 
                point.y < lowerLipY - 10
              );
              
              if (leftCheekPoints.length > 2) {
                leftCheekPoints.forEach((point, index) => {
                  if (index === 0) {
                    leftCheekPath.moveTo(point.x, point.y);
                  } else {
                    leftCheekPath.lineTo(point.x, point.y);
                  }
                });
                leftCheekPath.close();
                
                frame.save();
                frame.clipPath(leftCheekPath, ClipOp.Intersect, true);
                frame.render(paint);
                frame.restore();
              }
              
              // Sağ yanak
              const rightCheekPath = Skia.Path.Make();
              const rightCheekPoints = facePoints.filter(point => 
                point.x > face.bounds.x + face.bounds.width * 0.7 && 
                point.y > eyeY + 10 && 
                point.y < lowerLipY - 10
              );
              
              if (rightCheekPoints.length > 2) {
                rightCheekPoints.forEach((point, index) => {
                  if (index === 0) {
                    rightCheekPath.moveTo(point.x, point.y);
                  } else {
                    rightCheekPath.lineTo(point.x, point.y);
                  }
                });
                rightCheekPath.close();
                
                frame.save();
                frame.clipPath(rightCheekPath, ClipOp.Intersect, true);
                frame.render(paint);
                frame.restore();
              }
            }
            
          } catch (error) {
            console.log('Bölgesel blur hatası:', error);
            // Hata durumunda basit blur kullan
            const path = Skia.Path.Make();
            const rect = Skia.XYWHRect(
              face.bounds.x,
              face.bounds.y,
              face.bounds.width,
              face.bounds.height,
            );
            path.addOval(rect);

            frame.save();
            frame.clipPath(path, ClipOp.Intersect, true);
            frame.render(paint);
            frame.restore();
          }
          
        } else {
          // Eğer kontur yoksa basit yüz blur'u
          const path = Skia.Path.Make();
          const rect = Skia.XYWHRect(
            face.bounds.x,
            face.bounds.y,
            face.bounds.width,
            face.bounds.height,
          );
          path.addOval(rect);

          frame.save();
          frame.clipPath(path, ClipOp.Intersect, true);
          frame.render(paint);
          frame.restore();
        }
      }
    } catch (error) {
      console.log('Face detection error:', error);
      return;
    }
  }, [faceDetector, paint]);

  const flipCamera = useCallback(() => {
    setPosition((pos) => (pos === "front" ? "back" : "front"));
  }, []);

  const handleCameraMountError = useCallback((error) => {
    console.error('Camera mount error:', error);
  }, []);

  const cameraDevice = useCameraDevice(position);
  const camera = useRef(null);

  return (
    <View style={styles.container} onTouchEnd={flipCamera}>
      {hasPermission ? (
        device != null ? (
          format != null ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isCameraActive}
              format={format}
              frameProcessor={frameProcessor}
              fps={format?.maxFps}
              pixelFormat="rgb"
              exposure={0}
              ref={camera}
              onError={handleCameraMountError}
            />
          ) : (
            <View style={styles.textContainer}>
              <Text style={styles.text}>
                Your phone does not have a {position} Camera.
              </Text>
            </View>
          )
        ) : (
          <View style={styles.textContainer}>
            <Text style={styles.text}>
              Your phone does not have a {position} Camera.
            </Text>
          </View>
        )
      ) : (
        <View style={styles.textContainer}>
          <Text style={styles.text} numberOfLines={5}>
            FaceBlurApp needs Camera permission.{" "}
            <Text style={styles.link} onPress={Linking.openSettings}>
              Grant
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    maxWidth: "60%",
    fontWeight: "bold",
    fontSize: 15,
    color: "black",
  },
  link: {
    color: "rgb(80, 80, 255)",
  },
});

export default RealTimeScreen;
