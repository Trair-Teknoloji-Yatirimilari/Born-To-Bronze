import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import DeviceInfo from "react-native-device-info";
import { COLORS, FONTS, SIZES } from "../constants/theme";
import Dialog from "./Dialog";
import { Ionicons } from "@expo/vector-icons";

const getDeviceInfo = async () => {
  try {
    const [
      uniqueId,
      deviceId,
      deviceName,
      brand,
      deviceType,
      systemName,
      systemVersion,
      userAgent,
      appVersion,
      buildNumber,
      bundleId,
      isEmulator,
      isTablet,
    ] = await Promise.all([
      DeviceInfo.getUniqueId(),
      DeviceInfo.getDeviceId(),
      DeviceInfo.getDeviceName(),
      DeviceInfo.getBrand(),
      DeviceInfo.getDeviceType(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getUserAgent(),
      DeviceInfo.getVersion(),
      DeviceInfo.getBuildNumber(),
      DeviceInfo.getBundleId(),
      DeviceInfo.isEmulator(),
      DeviceInfo.isTablet(),
    ]);

    return {
      uniqueId,
      deviceId,
      deviceName,
      deviceBrand: brand,
      deviceType,
      systemName,
      systemVersion,
      userAgent,
      appVersion,
      buildNumber,
      bundleId,
      isEmulator,
      isTablet,
    };
  } catch (error) {
    console.error("Device bilgileri alınırken hata:", error);
    return {
      uniqueId: null,
      deviceId: null,
      deviceName: null,
      deviceBrand: null,
      deviceType: null,
      systemName: Platform.OS,
      systemVersion: Platform.Version?.toString(),
      userAgent: null,
      appVersion: null,
      buildNumber: null,
      bundleId: null,
      isEmulator: false,
      isTablet: false,
    };
  }
};

export default function SharedPhotos({ apiUrl }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [photos, setPhotos] = useState([]);
  const [deviceUniqueId, setDeviceUniqueId] = useState(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState({
    visible: false,
    photoId: null,
  });
  const [resultDialog, setResultDialog] = useState({
    visible: false,
    success: true,
    message: "",
  });

  const buttonHitSlop = useMemo(
    () => ({ top: 10, bottom: 10, left: 10, right: 10 }),
    []
  );

  useEffect(() => {
    const init = async () => {
      const info = await getDeviceInfo();
      setDeviceUniqueId(info.uniqueId);
    };
    init();
  }, []);

  const openModalAndFetch = async () => {
    setIsModalVisible(true);
    setIsLoading(true);
    setErrorMessage("");
    try {
      const url = `${apiUrl}/api/user/getMyPhotos?uniqueId=${encodeURIComponent(
        deviceUniqueId || ""
      )}`;
      const response = await fetch(url);
      const data = await response.json();
      const list = data?.data || data?.photos || [];
      setPhotos(Array.isArray(list) ? list : []);
    } catch (error) {
      setErrorMessage("Fotoğraflar alınamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setErrorMessage("");
  };

  const handlePressImage = (uri) => {
    setSelectedImageUri(uri);
    setIsPreviewVisible(true);
  };

  const handleClosePreview = () => {
    setIsPreviewVisible(false);
    setSelectedImageUri(null);
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${apiUrl}${url}`;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString("tr-TR", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return String(value);
    }
  };

  const renderItem = ({ item }) => {
    const imageUri = getImageUrl(item?.url || item?.imageUrl);
    const rawProduct = item?.product ?? item?.productName;
    const productName =
      typeof rawProduct === "string" ? rawProduct : rawProduct?.name ?? "-";
    const dateText = formatDate(
      item?.createdAt || item?.shareDate || item?.date
    );
    const photoId = item?.id || item?._id || item?.photoId;

    return (
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => handlePressImage(imageUri)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.thumb}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <View style={styles.info}>
          <Text style={styles.infoTitle} numberOfLines={1}>
            {productName}
          </Text>
          <Text style={styles.infoSub} numberOfLines={1}>
            {dateText}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onRequestDelete(photoId)}
          style={styles.deleteBtn}
          activeOpacity={0.8}
        >
          {deletingPhotoId === photoId ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Text style={styles.deleteBtnText}>Sil</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const onRequestDelete = (photoId) => {
    setPendingDelete({ visible: true, photoId });
  };

  const handleConfirmDelete = async () => {
    const photoId = pendingDelete.photoId;
    setPendingDelete({ visible: false, photoId: null });
    if (!photoId || !deviceUniqueId) return;
    try {
      setDeletingPhotoId(photoId);
      const url = `${apiUrl}/api/user/getMyPhotos?uniqueId=${encodeURIComponent(
        deviceUniqueId
      )}&photoId=${encodeURIComponent(photoId)}`;
      const response = await fetch(url, { method: "DELETE" });
      if (response.ok) {
        setPhotos((prev) =>
          prev.filter((p) => (p.id || p._id || p.photoId) !== photoId)
        );
        setResultDialog({
          visible: true,
          success: true,
          message: "Fotoğraf başarıyla silindi.",
        });
      } else {
        const text = await response.text();
        setResultDialog({
          visible: true,
          success: false,
          message: text || "Silme işlemi başarısız oldu.",
        });
      }
    } catch (e) {
      setResultDialog({
        visible: true,
        success: false,
        message: "Ağ hatası: Silme işlemi gerçekleştirilemedi.",
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleCancelDelete = () => {
    setPendingDelete({ visible: false, photoId: null });
  };

  return (
    <>
      {/* Sağ üst ikon buton */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openModalAndFetch}
        hitSlop={buttonHitSlop}
        activeOpacity={0.85}
      >
        <Ionicons
          name="share-social-outline"
          size={28}
          color={COLORS.background}
        />
      </TouchableOpacity>

      {/* Liste Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paylaşımlarım</Text>
              <TouchableOpacity onPress={closeModal} hitSlop={buttonHitSlop}>
                <Text style={styles.closeText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={COLORS.button} />
                <Text style={styles.loaderText}>Yükleniyor…</Text>
              </View>
            ) : errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : photos.length > 0 ? (
              <FlatList
                data={photos}
                keyExtractor={(it, idx) => String(it?.id || it?._id || idx)}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Henüz paylaşım yapılmadı.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Silme Onayı */}
      <Dialog
        visible={pendingDelete.visible}
        title="Silinsin mi?"
        message={"Bu işlem geri alınamaz. Emin misiniz?"}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        confirmText={"Evet, sil"}
        cancelText={"Vazgeç"}
        destructive
      />

      {/* Sonuç Bildirimi */}
      <Dialog
        visible={resultDialog.visible}
        title={resultDialog.success ? "İşlem Başarılı" : "Hata"}
        message={
          resultDialog.message ||
          (resultDialog.success
            ? "Fotoğraf silindi."
            : "Silme işlemi başarısız oldu.")
        }
        onClose={() =>
          setResultDialog({ visible: false, success: true, message: "" })
        }
        onConfirm={() =>
          setResultDialog({ visible: false, success: true, message: "" })
        }
        confirmText={"Tamam"}
        showActions={false}
        mode="alert"
        icon={resultDialog.success ? "checkmark-circle" : "alert-circle"}
        variant={resultDialog.success ? "normal" : "destructive"}
      />

      {/* Fotoğraf Önizleme */}
      <Modal visible={isPreviewVisible} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.previewBackdrop}
            onPress={handleClosePreview}
          />
          <View style={styles.previewCard}>
            {selectedImageUri ? (
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity
              style={styles.previewClose}
              onPress={handleClosePreview}
              hitSlop={buttonHitSlop}
            >
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    top: Platform.select({ ios: 60, android: 30, default: 30 }),
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  fabIcon: {
    width: 22,
    height: 22,
    tintColor: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 16,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  modalTitle: {
    ...FONTS.medium,
    fontSize: SIZES.large,
    color: COLORS.text,
  },
  closeText: {
    ...FONTS.regular,
    color: COLORS.text,
    opacity: 0.8,
  },
  listContent: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  infoTitle: {
    ...FONTS.medium,
    color: COLORS.text,
    fontSize: SIZES.medium,
  },
  infoSub: {
    ...FONTS.regular,
    color: COLORS.text,
    opacity: 0.8,
    marginTop: 2,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.button,
    borderRadius: 8,
  },
  deleteBtnText: {
    ...FONTS.medium,
    color: COLORS.text,
    fontSize: SIZES.small,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loaderText: {
    ...FONTS.regular,
    color: COLORS.text,
    opacity: 0.8,
  },
  errorBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    ...FONTS.regular,
    color: COLORS.text,
  },
  previewOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewCard: {
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    maxHeight: "85%",
  },
  previewImage: {
    width: "100%",
    height: 400,
    backgroundColor: "#000",
  },
  previewClose: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...FONTS.regular,
    color: COLORS.text,
  },
});
