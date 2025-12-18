import { usePostHog } from 'posthog-react-native';

export const useAnalytics = () => {
  const posthog = usePostHog();

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.capture(eventName, properties);
      console.log(`📊 Event: ${eventName}`, properties);
    }
  };

  const trackScreen = (screenName: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.screen(screenName, properties);
      console.log(`📱 Screen: ${screenName}`, properties);
    }
  };

  const identifyUser = (userId: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.identify(userId, properties);
      console.log(`👤 User identified: ${userId}`, properties);
    }
  };

  const resetUser = () => {
    if (posthog) {
      posthog.reset();
      console.log('🔄 User session reset');
    }
  };

  return {
    trackEvent,
    trackScreen,
    identifyUser,
    resetUser,
    posthog,
  };
};
