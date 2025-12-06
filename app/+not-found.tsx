import { Stack, router } from 'expo-router';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useShareIntent } from 'expo-share-intent';

import colors from '@/constants/colors';

export default function NotFoundScreen() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [hasCheckedIntent, setHasCheckedIntent] = useState(false);

  // Always try to recover - either with share intent or go to feed
  useEffect(() => {
    // Small delay to let share intent load
    const timer = setTimeout(() => {
      if (hasShareIntent && shareIntent) {
        console.log('📤 [NOT-FOUND] Recovering share intent:', shareIntent);
        
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
      } else {
        // No share intent - just go to feed
        console.log('📤 [NOT-FOUND] No share intent, going to feed');
        router.replace('/(tabs)');
      }
      setHasCheckedIntent(true);
    }, 300); // Give share intent time to load

    return () => clearTimeout(timer);
  }, [hasShareIntent, shareIntent]);

  // Show loading spinner briefly while checking for share intent
  // This replaces the "Lost in the adventure?" screen
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
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
});
