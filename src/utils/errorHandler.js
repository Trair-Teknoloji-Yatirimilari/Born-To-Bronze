import NetInfo from "@react-native-community/netinfo";

/**
 * İnternet bağlantısını kontrol eder
 */
export const checkInternetConnection = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable;
};

/**
 * API hatalarını kullanıcı dostu mesajlara çevirir
 */
export const getErrorMessage = (error) => {
  if (!error) {
    return "Bilinmeyen bir hata oluştu";
  }

  // Network hataları
  if (error.message === "Network request failed" || error.code === "NETWORK_ERROR") {
    return "İnternet bağlantınızı kontrol edin";
  }

  // Timeout hataları
  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return "İstek zaman aşımına uğradı. Lütfen tekrar deneyin";
  }

  // 400 Bad Request
  if (error.response?.status === 400) {
    return error.response?.data?.message || "Geçersiz istek";
  }

  // 401 Unauthorized
  if (error.response?.status === 401) {
    return "Oturum süreniz doldu. Lütfen tekrar giriş yapın";
  }

  // 403 Forbidden
  if (error.response?.status === 403) {
    return "Bu işlem için yetkiniz yok";
  }

  // 404 Not Found
  if (error.response?.status === 404) {
    return "İstenen kaynak bulunamadı";
  }

  // 500 Server Error
  if (error.response?.status >= 500) {
    return "Sunucu hatası. Lütfen daha sonra tekrar deneyin";
  }

  // Kamera izni hataları
  if (error.message?.includes("camera") || error.message?.includes("permission")) {
    return "Kamera iznine ihtiyacımız var";
  }

  // Fotoğraf galerisi hataları
  if (error.message?.includes("photo") || error.message?.includes("gallery")) {
    return "Fotoğraf galerisine erişim izni gerekli";
  }

  // Genel hata mesajı
  return error.message || "Bir hata oluştu. Lütfen tekrar deneyin";
};

/**
 * Hata durumunda kullanıcıya gösterilecek aksiyonları belirler
 */
export const getErrorActions = (error) => {
  const actions = [];

  // Network hatası varsa
  if (error.message === "Network request failed") {
    actions.push({
      label: "Tekrar Dene",
      action: "retry",
    });
    actions.push({
      label: "Ayarlar",
      action: "settings",
    });
  }

  // İzin hatası varsa
  if (error.message?.includes("permission")) {
    actions.push({
      label: "İzin Ver",
      action: "requestPermission",
    });
    actions.push({
      label: "Ayarlar",
      action: "openSettings",
    });
  }

  // Genel hatalar için
  if (actions.length === 0) {
    actions.push({
      label: "Tekrar Dene",
      action: "retry",
    });
  }

  return actions;
};

/**
 * Hata loglama - production'da Sentry'ye gönderilir
 */
export const logError = (error, context = {}) => {
  if (__DEV__) {
    console.error("Error:", error);
    console.error("Context:", context);
  }

  // Production'da Sentry'ye gönder
  try {
    // Sentry.captureException(error, {
    //   contexts: { custom: context },
    // });
  } catch (loggingError) {
    console.error("Failed to log error:", loggingError);
  }
};

/**
 * Retry mekanizması ile API çağrısı yapar
 */
export const fetchWithRetry = async (
  fetchFn,
  maxRetries = 3,
  delay = 1000
) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fetchFn();
      return result;
    } catch (error) {
      lastError = error;
      
      // Son deneme değilse bekle
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
};
