import React, { useState, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Line, Polygon } from "react-native-svg";
import { COLORS } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const BeforeAfterSlider = ({
  beforeImage,
  afterImage,
  containerStyle,
  initialPosition = 0.5, // 0-1 arası, 0.5 = ortada
  orientation = "vertical", // "vertical" veya "horizontal"
  onImageError,
}) => {
  const [sliderPosition, setSliderPosition] = useState(initialPosition);
  const pan = useRef(new Animated.Value(initialPosition)).current;

  // Container dimensions
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  // PanResponder for gesture handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Haptic feedback başlangıç (iOS için)
        // Vibration.vibrate(10);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (orientation === "vertical") {
          // Vertical slider - Y ekseninde hareket
          const newPosition = Math.max(
            0,
            Math.min(
              1,
              (gestureState.moveY - gestureState.y0) / containerDimensions.height +
                sliderPosition
            )
          );
          pan.setValue(newPosition);
        } else {
          // Horizontal slider - X ekseninde hareket
          const newPosition = Math.max(
            0,
            Math.min(
              1,
              (gestureState.moveX - gestureState.x0) / containerDimensions.width +
                sliderPosition
            )
          );
          pan.setValue(newPosition);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        let finalPosition;
        if (orientation === "vertical") {
          finalPosition = Math.max(
            0,
            Math.min(
              1,
              (gestureState.moveY - gestureState.y0) / containerDimensions.height +
                sliderPosition
            )
          );
        } else {
          finalPosition = Math.max(
            0,
            Math.min(
              1,
              (gestureState.moveX - gestureState.x0) / containerDimensions.width +
                sliderPosition
            )
          );
        }
        setSliderPosition(finalPosition);

        // Smooth spring animation to final position
        Animated.spring(pan, {
          toValue: finalPosition,
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }).start();
      },
    })
  ).current;

  const onLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  };

  // Calculate clip positions
  const getClipStyle = () => {
    if (orientation === "vertical") {
      return {
        height: pan.interpolate({
          inputRange: [0, 1],
          outputRange: ["0%", "100%"],
        }),
      };
    } else {
      return {
        width: pan.interpolate({
          inputRange: [0, 1],
          outputRange: ["0%", "100%"],
        }),
      };
    }
  };

  const getSliderLinePosition = () => {
    if (orientation === "vertical") {
      return {
        top: pan.interpolate({
          inputRange: [0, 1],
          outputRange: ["0%", "100%"],
        }),
      };
    } else {
      return {
        left: pan.interpolate({
          inputRange: [0, 1],
          outputRange: ["0%", "100%"],
        }),
      };
    }
  };

  return (
    <View 
      style={[styles.container, containerStyle]} 
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      {/* After Image (Background) */}
      <Image
        source={{ uri: afterImage }}
        style={styles.image}
        resizeMode="cover"
        onError={(error) => {
          console.error("❌ After image load error:", error.nativeEvent.error);
          onImageError && onImageError(error);
        }}
        onLoad={() => console.log("✅ After image loaded:", afterImage)}
      />

      {/* Before Image (Clipped) */}
      <Animated.View
        style={[
          styles.beforeImageContainer,
          getClipStyle(),
          orientation === "vertical"
            ? styles.verticalClip
            : styles.horizontalClip,
        ]}
      >
        <Image
          source={{ uri: beforeImage }}
          style={styles.image}
          resizeMode="cover"
          onError={(error) => {
            console.error("❌ Before image load error:", error.nativeEvent.error);
            onImageError && onImageError(error);
          }}
          onLoad={() => console.log("✅ Before image loaded:", beforeImage)}
        />

        {/* Label: BEFORE */}
        <View
          style={[
            styles.labelContainer,
            orientation === "vertical" ? styles.labelTop : styles.labelLeft,
          ]}
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)"]}
            style={styles.labelGradient}
          >
            <Svg width="16" height="16" viewBox="0 0 24 24" style={styles.labelIcon}>
              <Polygon
                points="12,2 15,8 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,8"
                fill="#FFD700"
              />
            </Svg>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* After Label */}
      <View
        style={[
          styles.labelContainer,
          orientation === "vertical" ? styles.labelBottom : styles.labelRight,
        ]}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)"]}
          style={styles.labelGradient}
        >
          <Svg width="16" height="16" viewBox="0 0 24 24" style={styles.labelIcon}>
            <Polygon
              points="12,2 15,8 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,8"
              fill="#FF8C00"
            />
          </Svg>
        </LinearGradient>
      </View>

      {/* Slider Line with Handle */}
      <Animated.View
        style={[
          styles.sliderLine,
          getSliderLinePosition(),
          orientation === "vertical"
            ? styles.sliderLineHorizontal
            : styles.sliderLineVertical,
        ]}
      >
        <LinearGradient
          colors={["#FFD700", "#FFFFFF", "#FFD700"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.sliderLineGradient,
            orientation === "vertical"
              ? styles.sliderLineGradientHorizontal
              : styles.sliderLineGradientVertical,
          ]}
        >
          {/* Handle (Circle with arrows) */}
          <View style={styles.sliderHandle}>
            <LinearGradient
              colors={["#FFD700", "#FFA500"]}
              style={styles.sliderHandleGradient}
            >
              <Svg width="24" height="24" viewBox="0 0 24 24">
                {orientation === "vertical" ? (
                  <>
                    {/* Up Arrow */}
                    <Polygon points="12,6 8,10 16,10" fill="#FFFFFF" />
                    {/* Down Arrow */}
                    <Polygon points="12,18 8,14 16,14" fill="#FFFFFF" />
                  </>
                ) : (
                  <>
                    {/* Left Arrow */}
                    <Polygon points="6,12 10,8 10,16" fill="#FFFFFF" />
                    {/* Right Arrow */}
                    <Polygon points="18,12 14,8 14,16" fill="#FFFFFF" />
                  </>
                )}
              </Svg>
            </LinearGradient>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Instruction Overlay (First time hint) */}
      <View style={styles.instructionOverlay} pointerEvents="none">
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "transparent"]}
          style={styles.instructionGradient}
        >
          <Svg width="30" height="30" viewBox="0 0 24 24">
            {orientation === "vertical" ? (
              <>
                <Polygon points="12,4 8,8 16,8" fill="#FFFFFF" opacity="0.8" />
                <Polygon points="12,20 8,16 16,16" fill="#FFFFFF" opacity="0.8" />
              </>
            ) : (
              <>
                <Polygon points="4,12 8,8 8,16" fill="#FFFFFF" opacity="0.8" />
                <Polygon points="20,12 16,8 16,16" fill="#FFFFFF" opacity="0.8" />
              </>
            )}
          </Svg>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  beforeImageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  verticalClip: {
    width: "100%",
  },
  horizontalClip: {
    height: "100%",
  },
  sliderLine: {
    position: "absolute",
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderLineHorizontal: {
    left: 0,
    right: 0,
    height: 4,
    marginTop: -2,
  },
  sliderLineVertical: {
    top: 0,
    bottom: 0,
    width: 4,
    marginLeft: -2,
  },
  sliderLineGradient: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  sliderLineGradientHorizontal: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderLineGradientVertical: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderHandle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sliderHandleGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 24,
  },
  labelContainer: {
    position: "absolute",
    zIndex: 50,
  },
  labelTop: {
    top: 20,
    left: 20,
  },
  labelBottom: {
    bottom: 20,
    left: 20,
  },
  labelLeft: {
    top: 20,
    left: 20,
  },
  labelRight: {
    top: 20,
    right: 20,
  },
  labelGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  labelIcon: {
    marginRight: 4,
  },
  instructionOverlay: {
    position: "absolute",
    top: "45%",
    left: "45%",
    zIndex: 10,
    pointerEvents: "none",
  },
  instructionGradient: {
    padding: 12,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BeforeAfterSlider;
