import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { BlurView } from "expo-blur";
import { COLORS } from "../constants/theme";

const LoadingOverlay = ({ visible, message = "Yükleniyor..." }) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <BlurView intensity={20} style={styles.blur}>
          <View style={styles.content}>
            <ActivityIndicator size="large" color={COLORS.text} />
            <Text style={styles.message}>{message}</Text>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  blur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: COLORS.button,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 150,
  },
  message: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default LoadingOverlay;
