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
      const response = await api.getSavedExperiences();
      if (response.success && response.data) {
        const responseData: any = response.data;
        const experiences = Array.isArray(responseData) ? responseData : responseData.data || [];
        const ids = experiences.map((exp: any) => exp.id?.toString());
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
      console.log('User not authenticated');
      return;
    }

    const isSavedNow = savedExperiences.includes(experienceId);

    try {
      if (isSavedNow) {
        // Optimistically remove
        setSavedExperiences(prev => prev.filter(id => id !== experienceId));
        await api.unsaveExperience(experienceId);
      } else {
        // Optimistically add
        setSavedExperiences(prev => [...prev, experienceId]);
        await api.saveExperience(experienceId);
      }
    } catch (error) {
      // Revert on error
      console.error('Error toggling save:', error);
      setSavedExperiences(prev => 
        isSavedNow 
          ? [...prev, experienceId]
          : prev.filter(id => id !== experienceId)
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
