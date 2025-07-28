import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Animated,
  StatusBar,
  Alert,
  BackHandler,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermission } from "react-native-vision-camera";
import { COLORS } from "../constants/theme";

import {
  ONBOARDING_STEPS,
  ONBOARDING_KEYS,
  setCurrentOnboardingStep,
  markOnboardingMilestone,
  completeOnboarding,
  trackOnboardingEvent,
} from "../utils/onboarding";
import { ScrollView } from "react-native-gesture-handler";

const OnboardingScreen = ({ navigation, onComplete }) => {
  const { width, height } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();

  const [currentStep, setCurrentStep] = useState(ONBOARDING_STEPS.WELCOME);
  const [isLoading, setIsLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Feature showcase animations
  const feature1Anim = useRef(new Animated.Value(0)).current;
  const feature2Anim = useRef(new Animated.Value(0)).current;
  const feature3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Giriş animasyonu
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress animasyonu
    updateProgressAnimation();

    // Analytics tracking
    trackOnboardingEvent("screen_viewed", { step: currentStep });
  }, [currentStep]);

  useEffect(() => {
    // Feature animasyonları
    if (currentStep === ONBOARDING_STEPS.FEATURES) {
      Animated.stagger(300, [
        Animated.spring(feature1Anim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(feature2Anim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(feature3Anim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentStep]);

  // Android back button handling
  useEffect(() => {
    const backAction = () => {
      if (currentStep === ONBOARDING_STEPS.WELCOME) {
        Alert.alert(
          "Uygulamadan Çık",
          "Eda ürünlerini öğrenmeden çıkmak istediğinizden emin misiniz?",
          [
            { text: "Kalayım", style: "cancel" },
            {
              text: "Çık",
              style: "destructive",
              onPress: () => BackHandler.exitApp(),
            },
          ]
        );
        return true;
      } else {
        handlePrevious();
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [currentStep]);

  const updateProgressAnimation = () => {
    const steps = [
      ONBOARDING_STEPS.WELCOME,
      ONBOARDING_STEPS.FEATURES,
      ONBOARDING_STEPS.PERMISSIONS,
      ONBOARDING_STEPS.TUTORIAL,
    ];
    const currentIndex = steps.indexOf(currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const handleNext = async () => {
    setIsLoading(true);

    try {
      switch (currentStep) {
        case ONBOARDING_STEPS.WELCOME:
          await markOnboardingMilestone(ONBOARDING_KEYS.WELCOME_SHOWN);
          await setCurrentOnboardingStep(ONBOARDING_STEPS.FEATURES);
          setCurrentStep(ONBOARDING_STEPS.FEATURES);
          break;

        case ONBOARDING_STEPS.FEATURES:
          await markOnboardingMilestone(ONBOARDING_KEYS.FEATURES_DISCOVERED);
          await setCurrentOnboardingStep(ONBOARDING_STEPS.PERMISSIONS);
          setCurrentStep(ONBOARDING_STEPS.PERMISSIONS);
          break;

        case ONBOARDING_STEPS.PERMISSIONS:
          await handlePermissionRequest();
          break;

        case ONBOARDING_STEPS.TUTORIAL:
          await handleCompleteOnboarding();
          break;

        default:
          break;
      }
    } catch (error) {
      console.error("Onboarding next step error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = async () => {
    switch (currentStep) {
      case ONBOARDING_STEPS.FEATURES:
        setCurrentStep(ONBOARDING_STEPS.WELCOME);
        await setCurrentOnboardingStep(ONBOARDING_STEPS.WELCOME);
        break;

      case ONBOARDING_STEPS.PERMISSIONS:
        setCurrentStep(ONBOARDING_STEPS.FEATURES);
        await setCurrentOnboardingStep(ONBOARDING_STEPS.FEATURES);
        break;

      case ONBOARDING_STEPS.TUTORIAL:
        setCurrentStep(ONBOARDING_STEPS.PERMISSIONS);
        await setCurrentOnboardingStep(ONBOARDING_STEPS.PERMISSIONS);
        break;

      default:
        break;
    }
  };

  const handlePermissionRequest = async () => {
    try {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (granted) {
          await markOnboardingMilestone(ONBOARDING_KEYS.PERMISSIONS_GRANTED);
          await setCurrentOnboardingStep(ONBOARDING_STEPS.TUTORIAL);
          setCurrentStep(ONBOARDING_STEPS.TUTORIAL);
          trackOnboardingEvent("permission_granted", { permission: "camera" });
        } else {
          Alert.alert(
            "Kamera İzni Gerekli",
            "Bronzlaştırma filtresini kullanmak için kamera iznine ihtiyacımız var.",
            [
              { text: "Daha Sonra", style: "cancel" },
              { text: "Tekrar Dene", onPress: handlePermissionRequest },
            ]
          );
          trackOnboardingEvent("permission_denied", { permission: "camera" });
        }
      } else {
        await markOnboardingMilestone(ONBOARDING_KEYS.PERMISSIONS_GRANTED);
        await setCurrentOnboardingStep(ONBOARDING_STEPS.TUTORIAL);
        setCurrentStep(ONBOARDING_STEPS.TUTORIAL);
      }
    } catch (error) {
      console.error("Permission request error:", error);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      await markOnboardingMilestone(ONBOARDING_KEYS.TUTORIAL_COMPLETED);
      await completeOnboarding();
      trackOnboardingEvent("onboarding_completed");

      // Ana uygulamaya geçiş
      if (onComplete) {
        onComplete();
      } else {
        navigation.replace("Main");
      }
    } catch (error) {
      console.error("Onboarding completion error:", error);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Tanıtımı Atla",
      "Eda ürünlerini test etmeyi öğrenmek istemez misiniz?",
      [
        { text: "Öğrenmek İstiyorum", style: "cancel" },
        {
          text: "Atla",
          style: "destructive",
          onPress: () => {
            trackOnboardingEvent("onboarding_skipped", { step: currentStep });
            handleCompleteOnboarding();
          },
        },
      ]
    );
  };

  const renderWelcomeStep = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.welcomeHeader}>
        <Image source={require("../assets/logo.png")} style={styles.welcomeLogo} />
        <Text style={styles.welcomeTitle}>
          Eda Uygulamasına Hoş Geldiniz! ✨
        </Text>
        <Text style={styles.welcomeSubtitle}>
          Eda Taşpınar ürünlerini satın almadan önce test edin
        </Text>
      </View>

      <View style={styles.welcomeFeatures}>
        <View style={styles.welcomeFeature}>
          <Ionicons name="camera" size={24} color={COLORS.text} />
          <Text style={styles.welcomeFeatureText}>
            Gerçek zamanlı bronzlaştırma önizlemesi
          </Text>
        </View>
        <View style={styles.welcomeFeature}>
          <Ionicons name="image" size={24} color={COLORS.text} />
          <Text style={styles.welcomeFeatureText}>
            Fotoğraf üzerinde alan işaretleme
          </Text>
        </View>
        <View style={styles.welcomeFeature}>
          <Ionicons name="gift" size={24} color={COLORS.text} />
          <Text style={styles.welcomeFeatureText}>
            Paylaşım ile indirim kodu kazanın
          </Text>
        </View>
      </View>

      <Text style={styles.welcomeDescription}>
        Eda Taşpınar ürünlerinin sizde nasıl duracağını önceden görmek için
        uygulamayı keşfedelim. Hangi krem sizin için ideal?
      </Text>
    </Animated.View>
  );

  const renderFeaturesStep = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.stepTitle}>🎨 İki Farklı Deneyim</Text>
      <Text style={styles.stepSubtitle}>
        Eda Taşpınar ürünlerini test etmenin iki benzersiz yolu
      </Text>

      <View style={styles.featuresGrid}>
        <Animated.View
          style={[
            styles.featureCard,
            {
              opacity: feature1Anim,
              transform: [{ scale: feature1Anim }],
            },
          ]}
        >
          <View style={styles.featureCardIconTitle}>
            <Ionicons name="camera" size={32} color={COLORS.text} />
            <Text style={styles.featureCardTitle}>Gerçek Zamanlı Kamera</Text>
          </View>
          <Text style={styles.featureCardDescription}>
            Yüzünüzde bronzlaştırıcının etkisini anlık görün
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.featureCard,
            {
              opacity: feature2Anim,
              transform: [{ scale: feature2Anim }],
            },
          ]}
        >
          <View style={styles.featureCardIconTitle}>
            <Ionicons name="image" size={32} color={COLORS.text} />
            <Text style={styles.featureCardTitle}>Fotoğraf Düzenleme</Text>
          </View>
          <Text style={styles.featureCardDescription}>
            Fotoğrafınızda istediğiniz alanları işaretleyip test edin
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.featureCard,
            {
              opacity: feature3Anim,
              transform: [{ scale: feature3Anim }],
            },
          ]}
        >
          <View style={styles.featureCardIconTitle}>
            <Ionicons name="gift" size={32} color={COLORS.text} />
            <Text style={styles.featureCardTitle}>İndirim Kodu Kazanın</Text>
          </View>
          <Text style={styles.featureCardDescription}>
            Sonuçlarınızı paylaşın, Eda'da indirim kazanın
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );

  const renderPermissionsStep = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.permissionIcon}>
        <Ionicons name="camera" size={60} color={COLORS.text} />
      </View>

      <Text style={styles.stepTitle}>Kamera İzni</Text>
      <Text style={styles.stepSubtitle}>
        Eda Taşpınar ürünlerini yüzünüzde test etmek için kamera erişimi gerekli
      </Text>

      <View style={styles.permissionBenefits}>
        <View style={styles.permissionBenefit}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.text} />
          <Text style={styles.permissionBenefitText}>
            Yüzünüzde gerçek zamanlı bronzlaştırma önizlemesi
          </Text>
        </View>
        <View style={styles.permissionBenefit}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.text} />
          <Text style={styles.permissionBenefitText}>
            Yüz tanıma ile hassas ürün uygulaması
          </Text>
        </View>
        <View style={styles.permissionBenefit}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.text} />
          <Text style={styles.permissionBenefitText}>
            Sonucu fotoğraflayıp Eda'da satın alın
          </Text>
        </View>
      </View>

      <View style={styles.permissionNote}>
        <Ionicons name="shield-checkmark" size={16} color={COLORS.text} />
        <Text style={styles.permissionNoteText}>
          Kamera verileriniz güvenlidir ve sadece uygulamada kullanılır.
        </Text>
      </View>
    </Animated.View>
  );

  const renderTutorialStep = () => (
    <ScrollView>
      <Animated.View
        style={[
          styles.stepContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.tutorialIcon}>
          <Ionicons name="rocket" size={60} color={COLORS.text} />
        </View>

        <Text style={styles.stepTitle}>🚀 Nasıl Kullanılır?</Text>
        <Text style={styles.stepSubtitle}>
          Eda Taşpınar ürünlerini test etmek çok kolay!
        </Text>

        <View style={styles.tutorialMethods}>
          <View style={styles.tutorialMethod}>
            <Text style={styles.tutorialMethodTitle}>
              📹 Gerçek Zamanlı Test:
            </Text>
            <View style={styles.tutorialSteps}>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>1</Text>
                </View>
                <Text style={styles.tutorialStepText}>
                  Bronzlaştırıcı ürününü seçin
                </Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>2</Text>
                </View>
                <Text style={styles.tutorialStepText}>
                  Yüzünüzü kameraya getirin
                </Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>3</Text>
                </View>
                <Text style={styles.tutorialStepText}>
                  Bronzlaştırıcının etkisini gerçek zamanlı görün
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.tutorialMethod}>
            <Text style={styles.tutorialMethodTitle}>
              📸 Fotoğraf Düzenleme:
            </Text>
            <View style={styles.tutorialSteps}>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>1</Text>
                </View>
                <Text style={styles.tutorialStepText}>
                  Fotoğrafınızı yükleyin
                </Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>2</Text>
                </View>
                <Text style={styles.tutorialStepText}>
                  Bronzlaştırmak istediğiniz alanları işaretleyin
                </Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.tutorialStepNumber}>
                  <Text style={styles.tutorialStepNumberText}>3</Text>
                </View>
                <Text style={styles.tutorialStepText}>
                  Sonucu görün ve paylaşın
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tutorialReward}>
          <Ionicons name="gift" size={24} color={COLORS.text} />
          <Text style={styles.tutorialRewardText}>
            Sonuçlarınızı paylaştığınızda Eda'da kullanabileceğiniz indirim
            kodu kazanırsınız!
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case ONBOARDING_STEPS.WELCOME:
        return renderWelcomeStep();
      case ONBOARDING_STEPS.FEATURES:
        return renderFeaturesStep();
      case ONBOARDING_STEPS.PERMISSIONS:
        return renderPermissionsStep();
      case ONBOARDING_STEPS.TUTORIAL:
        return renderTutorialStep();
      default:
        return renderWelcomeStep();
    }
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case ONBOARDING_STEPS.WELCOME:
        return "Başlayalım";
      case ONBOARDING_STEPS.FEATURES:
        return "Devam Et";
      case ONBOARDING_STEPS.PERMISSIONS:
        return hasPermission ? "Devam Et" : "İzin Ver";
      case ONBOARDING_STEPS.TUTORIAL:
        return "Uygulamayı Başlat";
      default:
        return "Devam Et";
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.text} />
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        </View>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Atla</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>{renderCurrentStep()}</View>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        {currentStep !== ONBOARDING_STEPS.WELCOME && (
          <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
            <Text style={styles.backButtonText}>Geri</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>
            {isLoading ? "Yükleniyor..." : getNextButtonText()}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
    marginRight: 15,
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.text,
    borderRadius: 2,
  },
  skipButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  skipButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Welcome Step
  welcomeHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
  },
  welcomeFeatures: {
    marginBottom: 30,
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  welcomeFeature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: COLORS.button,
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 10,
  },
  welcomeFeatureText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 15,
    flex: 1,
  },
  welcomeDescription: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Generic Step Styles
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },

  // Features Step
  featuresGrid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  featureCard: {
    backgroundColor: COLORS.button,
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  featureCardIconTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  featureCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 15,
    marginBottom: 8,
  },
  featureCardDescription: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
    opacity: 0.7,
  },

  // Permissions Step
  permissionIcon: {
    width: 100,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  permissionBenefits: {
    width: "100%",
  },
  permissionBenefit: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: COLORS.button,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionBenefitText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 12,
    flex: 1,
  },
  permissionNote: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  permissionNoteText: {
    color: COLORS.text,
    fontSize: 10,
    marginLeft: 8,
    flex: 1,
  },

  // Tutorial Step
  tutorialIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.button,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  tutorialMethods: {
    width: "100%",
    marginBottom: 10,
  },
  tutorialMethod: {
    backgroundColor: COLORS.button,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  tutorialMethodTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
  },
  tutorialSteps: {
    marginBottom: 10,
  },
  tutorialStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: COLORS.button,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
  },
  tutorialStepNumber: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tutorialStepNumberText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: "700",
  },
  tutorialStepText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  tutorialReward: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.button,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 20,
  },
  tutorialRewardText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },

  // Navigation
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.button,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 5,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.button,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.text,
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    marginRight: 5,
  },
  welcomeLogo:{
    width: 100,
    height: 100,
  },
});

export default OnboardingScreen;
