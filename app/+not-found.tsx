import { Stack, router } from 'expo-router';
import { StyleSheet, View, ActivityIndicator, Text, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { useShareIntent } from 'expo-share-intent';

import colors from '@/constants/colors';

export default function NotFoundScreen() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [waitingForIntent, setWaitingForIntent] = useState(true);
  const [attempts, setAttempts] = useState(0);

  // Try to recover share intent with multiple attempts
  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      console.log('📤 [NOT-FOUND] Found share intent:', shareIntent);
      
      const sharedUrl = shareIntent.webUrl || shareIntent.text || '';
      const sharedText = shareIntent.text || '';
      
      // Navigate to shared-content with the intent data
      router.replace({
        pathname: '/shared-content',
        params: { 
          url: sharedUrl,
          text: sharedText
        }
      });
      
      resetShareIntent();
      return;
    }

    // Keep waiting for share intent (up to 2 seconds - reduced from 3)
    if (attempts < 4) {
      const timer = setTimeout(() => {
        setAttempts(prev => prev + 1);
        console.log(`📤 [NOT-FOUND] Waiting for share intent... attempt ${attempts + 1}`);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // After 2 seconds, if no share intent, go directly to feed
      // This prevents showing "Something went wrong" when returning from payment sheets, etc.
      console.log('📤 [NOT-FOUND] No share intent found, redirecting to feed...');
      setWaitingForIntent(false);
      router.replace('/(tabs)');
    }
  }, [hasShareIntent, shareIntent, attempts]);

  // While waiting for share intent, show spinner
  if (waitingForIntent) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <ActivityIndicator size="large" color={colors.dark.primary} />
          <Text style={styles.waitingText}>Loading...</Text>
        </View>
      </>
    );
  }

  // This should rarely be shown now (only if router.replace fails)
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
        <Text style={styles.waitingText}>Redirecting...</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.background,
  },
  waitingText: {
    marginTop: 16,
    color: colors.dark.textSecondary,
    fontSize: 14,
  },
});
