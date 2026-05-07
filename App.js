import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { NotificationProvider } from "./src/context/NotificationContext";
import { ToastProvider } from "./src/context/ToastContext";
import * as Notifications from "expo-notifications";

Sentry.init({
  dsn: "https://db2634ebc0eee5f102f89416bd9e9537@o4509849775505408.ingest.de.sentry.io/4509849778389072",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default Sentry.wrap(function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <NotificationProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="auto" />
            <AppNavigator />
          </GestureHandlerRootView>
        </NotificationProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
});
