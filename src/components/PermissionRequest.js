import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { getPermissionExplanation } from "../utils/permissionHandler";

const PermissionRequest = ({
  visible,
  permissionType,
  onAllow,
  onDeny,
  onClose,
}) => {
  const explanation = getPermissionExplanation(permissionType);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={explanation.icon} size={60} color={COLORS.text} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{explanation.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{explanation.description}</Text>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={COLORS.text}
              style={styles.privacyIcon}
            />
            <Text style={styles.privacyText}>{explanation.privacy}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.denyButton]}
              onPress={onDeny}
            >
              <Text style={styles.denyButtonText}>Şimdi Değil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.allowButton]}
              onPress={onAllow}
            >
              <Text style={styles.allowButtonText}>Devam Et</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} opacity={0.5} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
    opacity: 0.8,
  },
  privacyNote: {
    flexDirection: "row",
    backgroundColor: COLORS.button,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  privacyIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 25,
  },
  denyButton: {
    backgroundColor: COLORS.button,
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    opacity: 0.7,
  },
  allowButton: {
    backgroundColor: COLORS.button,
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginRight: 8,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },
});

export default PermissionRequest;
