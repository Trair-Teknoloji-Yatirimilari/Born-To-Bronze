import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import BottomTabNavigator from './BottomTabNavigator';
import PhotoEditScreen from "../screens/PhotoEditScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import RealTimeScreen from "../screens/RealTimeScreen";
import TermsAcceptanceScreen, { checkTermsAccepted } from "../screens/TermsAcceptanceScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import TermsOfServiceScreen from "../screens/TermsOfServiceScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ErrorBoundary from "../components/ErrorBoundary";
import { isOnboardingCompleted } from "../utils/onboarding";
import { COLORS } from "../constants/theme";

const Stack = createNativeStackNavigator();

// Navigation referansını export et
export const navigationRef = React.createRef();

const AppNavigator = () => {
  const [isOnboardingDone, setIsOnboardingDone] = useState(null);
  const [isTermsAccepted, setIsTermsAccepted] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAppStatus();
  }, []);

  const checkAppStatus = async () => {
    try {
      const termsAccepted = await checkTermsAccepted();
      const onboardingCompleted = await isOnboardingCompleted();
      
      setIsTermsAccepted(termsAccepted);
      setIsOnboardingDone(onboardingCompleted);
    } catch (error) {
      console.error('Error checking app status:', error);
      // Hata durumunda terms'i göster
      setIsTermsAccepted(false);
      setIsOnboardingDone(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTermsAccept = () => {
    setIsTermsAccepted(true);
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
          {!isTermsAccepted ? (
            // Terms acceptance akışı (en önce)
            <>
              <Stack.Screen name="TermsAcceptance">
                {(props) => (
                  <TermsAcceptanceScreen 
                    {...props} 
                    onAccept={handleTermsAccept}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
              <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            </>
          ) : !isOnboardingDone ? (
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
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
              <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default AppNavigator;
