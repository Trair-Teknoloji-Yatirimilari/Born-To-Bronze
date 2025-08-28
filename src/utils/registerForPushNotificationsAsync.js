import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";

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

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      throw new Error(
        "Permission not granted to get push token for push notification!"
      );
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      throw new Error("Project ID not found");
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(pushTokenString);

      //TODO: send push token to server
      //uniqueId, pushToken, deviceInfo
      const deviceInfo = await getDeviceInfo();
      try {
        await fetch(
          "https://kafanagoreya.yumru.dev/api/dashboard/pushNotification",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uniqueId: deviceInfo.uniqueId,
              pushToken: pushTokenString,
              deviceInfo: deviceInfo,
            }),
          }
        );
      } catch (err) {
        console.error("Token backend'e gönderilemedi:", err);
      }

      return pushTokenString;
    } catch (e) {
      throw new Error(`${e}`);
    }
  } else {
    throw new Error("Must use physical device for push notifications");
  }
}
