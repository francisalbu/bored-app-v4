import React from 'react';
import { StripeProvider as NativeStripeProvider } from '@stripe/stripe-react-native';

interface StripeProviderProps {
  publishableKey: string;
  urlScheme?: string;
  merchantIdentifier?: string;
  children: React.ReactNode;
}

/**
 * Native Stripe provider - wraps @stripe/stripe-react-native
 */
export function StripeProvider({ 
  publishableKey, 
  urlScheme, 
  merchantIdentifier, 
  children 
}: StripeProviderProps) {
  return (
    <NativeStripeProvider
      publishableKey={publishableKey}
      urlScheme={urlScheme}
      merchantIdentifier={merchantIdentifier}
    >
      {children}
    </NativeStripeProvider>
  );
}
