import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { View, Text, Modal, Pressable, StyleSheet, TouchableWithoutFeedback, Platform, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

export default function DialogComponent({
  visible, // optional: controlled usage; if undefined, component manages its own state
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "Onayla",
  cancelText = "İptal",
  destructive = false,
  variant = "normal", // "normal" | "destructive"
  icon,
  dismissOnBackdrop = true,
  renderTrigger, // (helpers) => ReactNode
  showActions = true, // geriye dönük destek
  mode = "dialog", // "dialog" | "alert"
}) {
  const [internalVisible, setInternalVisible] = useState(false);

  const isControlled = typeof visible === "boolean";
  const isVisible = isControlled ? visible : internalVisible;

  const open = useCallback(() => {
    if (!isControlled) setInternalVisible(true);
  }, [isControlled]);

  const close = useCallback(() => {
    if (!isControlled) setInternalVisible(false);
  }, [isControlled]);

  const handleClose = () => {
    close();
    if (onClose) onClose();
  };

  const handleConfirm = () => {
    close();
    if (onConfirm) onConfirm();
  };

  const isDestructive = useMemo(() => destructive || variant === "destructive", [destructive, variant]);

  // Mod davranışı: alert => tek "Tamam" + backdropDismiss açık, dialog => iki buton + backdropDismiss kapalı
  const isAlert = mode === "alert" || showActions === false;
  const effectiveBackdropDismiss = isAlert ? true : false;

  // Slide-up + fade animasyonu
  const translateY = useRef(new Animated.Value(30)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      translateY.setValue(30);
      fade.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
          mass: 0.6,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // görünmez olduğunda başlangıç değerlerine dön
      translateY.setValue(30);
      fade.setValue(0);
    }
  }, [isVisible, translateY, fade]);

  return (
    <>
      {typeof renderTrigger === "function" ? renderTrigger({ open, close }) : null}

      <Modal
        animationType="fade"
        transparent={true}
        visible={!!isVisible}
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={effectiveBackdropDismiss ? handleClose : undefined}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.centeredView}>
          <Animated.View style={[styles.modalView, { transform: [{ translateY }], opacity: fade }]}>
            {icon ? (
              <View style={styles.iconWrapper}>
                <Ionicons name={icon} size={28} color={COLORS.text} />
              </View>
            ) : null}
            {!!title && <Text style={styles.title}>{title}</Text>}
            {!!message && <Text style={styles.message}>{message}</Text>}

            {/* Actions */}
            {isAlert ? (
              <View style={styles.actionsRowSingle}>
                <Pressable
                  style={[styles.button, styles.singleOkButton]}
                  onPress={handleConfirm}
                  android_ripple={{ color: "rgba(0,0,0,0.1)" }}
                >
                  <Text style={styles.confirmText}>{confirmText || "Tamam"}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actionsRow}>
                <Pressable style={[styles.button, styles.cancelButton]} onPress={handleClose} android_ripple={{ color: "rgba(0,0,0,0.1)" }}>
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, isDestructive ? styles.confirmButtonDestructive : styles.confirmButton]}
                  onPress={handleConfirm}
                  android_ripple={{ color: "rgba(0,0,0,0.1)" }}
                >
                  <Text style={styles.confirmText}>{confirmText}</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalView: {
    width: "100%",
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: "center",
    opacity: 0.85,
    marginTop: 8,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionsRowSingle: {
    flexDirection: "row",
    width: "100%",
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.button,
  },
  confirmButton: {
    //light green
    backgroundColor: "#7fba7f",
  },
  confirmButtonDestructive: {
    backgroundColor: Platform.OS === "ios" ? "#D32F2F" : "#C62828",
  },
  singleOkButton: {
    backgroundColor: "#7fba7f",
  },
  cancelText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  confirmText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
