import { Alert, Linking, Platform } from "react-native";
import { Camera } from "react-native-vision-camera";
import * as ImagePicker from "expo-image-picker";

/**
 * Kamera iznini kontrol eder ve gerekirse ister
 */
export const requestCameraPermission = async () => {
  try {
    const permission = await Camera.getCameraPermissionStatus();
    
    if (permission === "granted") {
      return { granted: true, canAskAgain: false };
    }
    
    if (permission === "not-determined") {
      const newPermission = await Camera.requestCameraPermission();
      return {
        granted: newPermission === "granted",
        canAskAgain: newPermission === "not-determined",
      };
    }
    
    // İzin reddedilmiş
    return { granted: false, canAskAgain: false };
  } catch (error) {
    console.error("Camera permission error:", error);
    return { granted: false, canAskAgain: false };
  }
};

/**
 * Fotoğraf galerisi iznini kontrol eder ve gerekirse ister
 */
export const requestPhotoLibraryPermission = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return {
      granted: status === "granted",
      canAskAgain: status === "undetermined",
    };
  } catch (error) {
    console.error("Photo library permission error:", error);
    return { granted: false, canAskAgain: false };
  }
};

/**
 * Fotoğraf kaydetme iznini kontrol eder ve gerekirse ister
 */
export const requestPhotoSavePermission = async () => {
  try {
    if (Platform.OS === "android") {
      // Android 13+ için READ_MEDIA_IMAGES izni yeterli
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return {
        granted: status === "granted",
        canAskAgain: status === "undetermined",
      };
    } else {
      // iOS için photo library add izni
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return {
        granted: status === "granted",
        canAskAgain: status === "undetermined",
      };
    }
  } catch (error) {
    console.error("Photo save permission error:", error);
    return { granted: false, canAskAgain: false };
  }
};

/**
 * İzin reddedildiğinde kullanıcıya ayarlara gitme seçeneği sunar
 */
export const showPermissionDeniedAlert = (permissionType) => {
  const messages = {
    camera: {
      title: "Kamera İzni Gerekli",
      message:
        "Bronzlaştırma filtresini kullanmak için kamera iznine ihtiyacımız var. Lütfen ayarlardan kamera erişimini açın.\n\n" +
        "Kamera görüntüleriniz yalnızca cihazınızda işlenir ve sunucularımıza gönderilmez.",
    },
    photoLibrary: {
      title: "Galeri İzni Gerekli",
      message:
        "Fotoğraflarınızı düzenlemek için galeri erişimine ihtiyacımız var. Lütfen ayarlardan galeri erişimini açın.\n\n" +
        "Seçtiğiniz fotoğraflar yalnızca cihazınızda işlenir.",
    },
    photoSave: {
      title: "Kaydetme İzni Gerekli",
      message:
        "Düzenlediğiniz fotoğrafları galerinize kaydedebilmek için izin gerekiyor. Lütfen ayarlardan galeri erişimini açın.",
    },
  };

  const { title, message } = messages[permissionType] || messages.camera;

  Alert.alert(title, message, [
    {
      text: "İptal",
      style: "cancel",
    },
    {
      text: "Ayarlara Git",
      onPress: () => {
        if (Platform.OS === "ios") {
          Linking.openURL("app-settings:");
        } else {
          Linking.openSettings();
        }
      },
    },
  ]);
};

/**
 * İzin durumunu kontrol eder ve kullanıcıya uygun mesajı gösterir
 */
export const handlePermissionRequest = async (permissionType, onGranted) => {
  let result;

  switch (permissionType) {
    case "camera":
      result = await requestCameraPermission();
      break;
    case "photoLibrary":
      result = await requestPhotoLibraryPermission();
      break;
    case "photoSave":
      result = await requestPhotoSavePermission();
      break;
    default:
      return false;
  }

  if (result.granted) {
    if (onGranted) onGranted();
    return true;
  }

  if (!result.canAskAgain) {
    showPermissionDeniedAlert(permissionType);
  }

  return false;
};

/**
 * Tüm izinlerin durumunu kontrol eder
 */
export const checkAllPermissions = async () => {
  const cameraStatus = await Camera.getCameraPermissionStatus();
  const photoLibraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();

  return {
    camera: cameraStatus === "granted",
    photoLibrary: photoLibraryStatus.status === "granted",
  };
};

/**
 * İzin durumu açıklamaları
 */
export const getPermissionExplanation = (permissionType) => {
  const explanations = {
    camera: {
      title: "Kamera Erişimi",
      description:
        "Born To Bronze uygulamasında Eda Taşpınar bronzlaştırıcı ürünlerini yüzünüzde gerçek zamanlı test edebilmeniz için kamera erişimi gereklidir.",
      privacy:
        "Kamera görüntüleri yalnızca cihazınızda işlenir ve sunucularımıza gönderilmez.",
      icon: "camera",
    },
    photoLibrary: {
      title: "Galeri Erişimi",
      description:
        "Born To Bronze uygulamasında fotoğraflarınızı seçerek Eda Taşpınar bronzlaştırıcı ürünlerini sanal olarak test edebilmeniz için galeri erişimi gereklidir.",
      privacy: "Seçtiğiniz fotoğraflar yalnızca cihazınızda işlenir.",
      icon: "images",
    },
    photoSave: {
      title: "Fotoğraf Kaydetme",
      description:
        "Düzenlediğiniz fotoğrafları galerinize kaydedebilmeniz için izin gerekiyor.",
      privacy: "Kaydetmek istediğiniz fotoğraflar sadece sizin kontrolünüzde olacak.",
      icon: "save",
    },
  };

  return explanations[permissionType] || explanations.camera;
};
