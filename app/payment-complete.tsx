import { Stack, router } from 'expo-router';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useEffect } from 'react';

import colors from '@/constants/colors';

/**
 * Payment Complete Deep Link Handler
 * 
 * This screen handles the return URL from Stripe payment sheet.
 * When returnURL: 'boredtourist://payment-complete' is triggered,
 * this screen catches it and redirects back to the payment flow.
 * 
 * The actual payment completion logic is in payment.tsx,
 * this just ensures the deep link doesn't go to +not-found.tsx
 */
export default function PaymentCompleteScreen() {
  useEffect(() => {
    // Log that we received the deep link
    console.log('💳 [PAYMENT-COMPLETE] Received return from Stripe');
    
    // Give a small delay for any pending state updates
    const timer = setTimeout(() => {
      // The payment flow in payment.tsx will handle the rest
      // We just need to go back - the payment.tsx screen should still be mounted
      // and will show the success state
      console.log('💳 [PAYMENT-COMPLETE] Navigating back...');
      
      // Use router.back() to return to the payment screen
      // If that doesn't work, navigate to bookings
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback: go to bookings tab
        router.replace('/(tabs)/bookings');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
        <Text style={styles.text}>Completing payment...</Text>
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
  text: {
    marginTop: 16,
    color: colors.dark.text,
    fontSize: 16,
  },
});
