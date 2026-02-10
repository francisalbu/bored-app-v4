import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  savedExperiences: string[];
  isLoading: boolean;
  toggleSave: (experienceId: string) => Promise<void>;
  isSaved: (experienceId: string) => boolean;
  refreshSaved: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [savedExperiences, setSavedExperiences] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadSavedExperiences();
    } else {
      setSavedExperiences([]);
    }
  }, [isAuthenticated]);

  const loadSavedExperiences = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 [FAV-CTX] Loading saved experiences...');
      const response = await api.getSavedExperiences();
      console.log('🔄 [FAV-CTX] Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const responseData: any = response.data;
        const experiences = Array.isArray(responseData) ? responseData : responseData.data || [];
        console.log('🔄 [FAV-CTX] Experiences array:', experiences);
        const ids = experiences.map((exp: any) => String(exp.id));
        console.log('🔄 [FAV-CTX] Saved IDs:', ids);
        setSavedExperiences(ids);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't log auth errors - user might not be logged in
      if (!errorMessage.includes('Invalid or expired token')) {
        console.error('Error loading saved experiences:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSave = async (experienceId: string) => {
    if (!isAuthenticated) {
      console.log('❌ [FAV-CTX] User not authenticated');
      return;
    }

    const expIdStr = String(experienceId);
    const isSavedNow = savedExperiences.includes(expIdStr);
    console.log('🔄 [FAV-CTX] Toggle save:', expIdStr, 'isSavedNow:', isSavedNow);

    try {
      if (isSavedNow) {
        // Optimistically remove
        setSavedExperiences(prev => prev.filter(id => id !== expIdStr));
        const result = await api.unsaveExperience(expIdStr);
        console.log('🔄 [FAV-CTX] Unsave result:', result);
      } else {
        // Optimistically add
        setSavedExperiences(prev => [...prev, expIdStr]);
        const result = await api.saveExperience(expIdStr);
        console.log('🔄 [FAV-CTX] Save result:', result);
      }
    } catch (error) {
      // Revert on error
      console.error('❌ [FAV-CTX] Error toggling save:', error);
      setSavedExperiences(prev => 
        isSavedNow 
          ? [...prev, expIdStr]
          : prev.filter(id => id !== expIdStr)
      );
    }
  };

  const isSaved = (experienceId: string) => {
    return savedExperiences.includes(experienceId);
  };

  const refreshSaved = async () => {
    await loadSavedExperiences();
  };

  return (
    <FavoritesContext.Provider
      value={{
        savedExperiences,
        isLoading,
        toggleSave,
        isSaved,
        refreshSaved,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
