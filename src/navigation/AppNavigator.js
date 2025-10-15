import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import BottomTabNavigator from './BottomTabNavigator';
import PhotoEditScreen from "../screens/PhotoEditScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import RealTimeScreen from "../screens/RealTimeScreen";
import ErrorBoundary from "../components/ErrorBoundary";
import { isOnboardingCompleted } from "../utils/onboarding";
import { COLORS } from "../constants/theme";

const Stack = createNativeStackNavigator();

// Navigation referansını export et
export const navigationRef = React.createRef();

const AppNavigator = () => {
  const [isOnboardingDone, setIsOnboardingDone] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await isOnboardingCompleted();
      setIsOnboardingDone(completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Hata durumunda onboarding'i göster
      setIsOnboardingDone(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingDone(true);
  };

  // Loading ekranı
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LinearGradient
          colors={['#FF6B35', '#F7931E', '#FFD23F']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isOnboardingDone ? (
            // Onboarding akışı
            <Stack.Screen name="Onboarding">
              {(props) => (
                <OnboardingScreen 
                  {...props} 
                  onComplete={handleOnboardingComplete}
                />
              )}
            </Stack.Screen>
          ) : (
            // Ana uygulama akışı
            <>
              <Stack.Screen name="Main" component={BottomTabNavigator} />
              <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
              <Stack.Screen name="PhotoEdit" component={PhotoEditScreen} />
              <Stack.Screen name="RealTimeScreen" component={RealTimeScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default AppNavigator;
