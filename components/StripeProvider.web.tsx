import React from 'react';

interface StripeProviderProps {
  publishableKey: string;
  urlScheme?: string;
  merchantIdentifier?: string;
  children: React.ReactNode;
}

/**
 * Web fallback - Stripe native SDK is not supported on web.
 * Just passes through children without wrapping.
 */
export function StripeProvider({ children }: StripeProviderProps) {
  return <>{children}</>;
}
