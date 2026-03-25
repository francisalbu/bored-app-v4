import React, { createContext, useContext } from 'react';
import { useBackofficeProfile } from '@/hooks/useBackofficeProfile';

const BackofficeContext = createContext<ReturnType<typeof useBackofficeProfile> | null>(null);

export function BackofficeProvider({ children }: { children: React.ReactNode }) {
  const value = useBackofficeProfile();
  return <BackofficeContext.Provider value={value}>{children}</BackofficeContext.Provider>;
}

export function useBackofficeContext() {
  const context = useContext(BackofficeContext);
  if (!context) {
    throw new Error('useBackofficeContext must be used within BackofficeProvider');
  }
  return context;
}
