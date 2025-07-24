import AsyncStorage from '@react-native-async-storage/async-storage';

// Onboarding storage keys
export const ONBOARDING_KEYS = {
  COMPLETED: '@onboarding_completed',
  CURRENT_STEP: '@onboarding_current_step',
  WELCOME_SHOWN: '@onboarding_welcome_shown',
  FEATURES_DISCOVERED: '@onboarding_features_discovered',
  PERMISSIONS_GRANTED: '@onboarding_permissions_granted',
  TUTORIAL_COMPLETED: '@onboarding_tutorial_completed',
};

// Onboarding steps
export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  FEATURES: 'features', 
  PERMISSIONS: 'permissions',
  TUTORIAL: 'tutorial',
  COMPLETED: 'completed',
};

// Check if onboarding is completed
export const isOnboardingCompleted = async () => {
  try {
    //TODO: Testten çıkınca burası true olacak
    const completed = await AsyncStorage.getItem(ONBOARDING_KEYS.COMPLETED);
    return completed === 'true';
    // return false;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

// Mark onboarding as completed
export const completeOnboarding = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEYS.COMPLETED, 'true');
    await AsyncStorage.setItem(ONBOARDING_KEYS.CURRENT_STEP, ONBOARDING_STEPS.COMPLETED);
  } catch (error) {
    console.error('Error completing onboarding:', error);
  }
};

// Get current onboarding step
export const getCurrentOnboardingStep = async () => {
  try {
    const step = await AsyncStorage.getItem(ONBOARDING_KEYS.CURRENT_STEP);
    return step || ONBOARDING_STEPS.WELCOME;
  } catch (error) {
    console.error('Error getting current onboarding step:', error);
    return ONBOARDING_STEPS.WELCOME;
  }
};

// Set current onboarding step
export const setCurrentOnboardingStep = async (step) => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEYS.CURRENT_STEP, step);
  } catch (error) {
    console.error('Error setting onboarding step:', error);
  }
};

// Mark specific onboarding milestone
export const markOnboardingMilestone = async (milestone, completed = true) => {
  try {
    await AsyncStorage.setItem(milestone, completed.toString());
  } catch (error) {
    console.error('Error marking onboarding milestone:', error);
  }
};

// Check specific onboarding milestone
export const checkOnboardingMilestone = async (milestone) => {
  try {
    const value = await AsyncStorage.getItem(milestone);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding milestone:', error);
    return false;
  }
};

// Reset onboarding (for testing)
export const resetOnboarding = async () => {
  try {
    await AsyncStorage.multiRemove([
      ONBOARDING_KEYS.COMPLETED,
      ONBOARDING_KEYS.CURRENT_STEP,
      ONBOARDING_KEYS.WELCOME_SHOWN,
      ONBOARDING_KEYS.FEATURES_DISCOVERED,
      ONBOARDING_KEYS.PERMISSIONS_GRANTED,
      ONBOARDING_KEYS.TUTORIAL_COMPLETED,
    ]);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
};

// Get onboarding progress percentage
export const getOnboardingProgress = async () => {
  try {
    const milestones = [
      ONBOARDING_KEYS.WELCOME_SHOWN,
      ONBOARDING_KEYS.FEATURES_DISCOVERED,
      ONBOARDING_KEYS.PERMISSIONS_GRANTED,
      ONBOARDING_KEYS.TUTORIAL_COMPLETED,
    ];

    let completedCount = 0;
    for (const milestone of milestones) {
      const isCompleted = await checkOnboardingMilestone(milestone);
      if (isCompleted) completedCount++;
    }

    return Math.round((completedCount / milestones.length) * 100);
  } catch (error) {
    console.error('Error calculating onboarding progress:', error);
    return 0;
  }
};

// Onboarding analytics
export const trackOnboardingEvent = async (eventName, data = {}) => {
  try {
    const eventData = {
      event: eventName,
      timestamp: new Date().toISOString(),
      step: await getCurrentOnboardingStep(),
      progress: await getOnboardingProgress(),
      ...data,
    };

    // TODO: Analytics service'e gönder
    // await analytics.track('onboarding_event', eventData);
  } catch (error) {
    console.error('Error tracking onboarding event:', error);
  }
}; 