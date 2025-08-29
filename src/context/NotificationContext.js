import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotificationsAsync";
import { Linking } from "react-native";
import { navigationRef } from "../navigation/AppNavigator";

const NotificationContext = createContext(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      (token) => setExpoPushToken(token),
      (error) => setError(error)
    );

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        
        const notificationData = response.notification.request.content.data;

        // Bildirim verisi kontrolü
        if (!notificationData) {
          return;
        }

        // hasGoToUrl kontrolü ve URL açma
        if (notificationData.hasGoToUrl === true && notificationData.url) {
          Linking.openURL(notificationData.url).catch(err => {
            console.error("❌ URL açılamadı: ", err);
          });
          return; // URL açıldığında route navigasyonunu engelle
        }

        // hasGoToUrl kontrolü ve route navigasyonu
        if (notificationData.hasGoToRoute === true && notificationData.route) {

          // Navigation ref kontrolü
          if (navigationRef.current) {
            try {
              navigationRef.current.navigate(notificationData.route, notificationData.params || {});
            } catch (error) {
              console.error("❌ Route navigasyonu başarısız: ", error);
            }
          } else {
            console.error("❌ Navigation referansı bulunamadı");
          }
          return;
        }

      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
