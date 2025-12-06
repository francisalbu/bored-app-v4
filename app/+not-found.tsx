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

    // Keep waiting for share intent (up to 3 seconds)
    if (attempts < 6) {
      const timer = setTimeout(() => {
        setAttempts(prev => prev + 1);
        console.log(`📤 [NOT-FOUND] Waiting for share intent... attempt ${attempts + 1}`);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // After 3 seconds, stop waiting
      setWaitingForIntent(false);
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

  // After timeout, show option to go to feed
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🧭</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.button}>
          <Text style={styles.buttonText}>Go to Feed</Text>
        </Pressable>
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
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    color: colors.dark.text,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.background,
  },
});
