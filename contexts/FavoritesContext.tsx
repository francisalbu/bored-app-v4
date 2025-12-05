import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

interface SavedExperience {
  id: string;
  title?: string;
  image_url?: string;
  video_url?: string;
}

interface FavoritesContextType {
  savedExperiences: SavedExperience[];
  savedExperienceIds: string[];
  isLoading: boolean;
  toggleSave: (experienceId: string) => Promise<void>;
  isSaved: (experienceId: string) => boolean;
  refreshSaved: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [savedExperiences, setSavedExperiences] = useState<SavedExperience[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Computed array of IDs for backward compatibility
  const savedExperienceIds = savedExperiences.map(exp => exp.id);

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
        const formattedExperiences: SavedExperience[] = experiences.map((exp: any) => ({
          id: exp.id?.toString(),
          title: exp.title,
          image_url: exp.image_url,
          video_url: exp.video_url,
        }));
        setSavedExperiences(formattedExperiences);
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

    const isSavedNow = savedExperienceIds.includes(experienceId);

    try {
      if (isSavedNow) {
        // Optimistically remove
        setSavedExperiences(prev => prev.filter(exp => exp.id !== experienceId));
        await api.unsaveExperience(experienceId);
      } else {
        // Optimistically add with minimal data
        setSavedExperiences(prev => [...prev, { id: experienceId }]);
        await api.saveExperience(experienceId);
        // Refresh to get full data
        await loadSavedExperiences();
      }
    } catch (error) {
      // Revert on error
      console.error('Error toggling save:', error);
      await loadSavedExperiences();
    }
  };

  const isSaved = (experienceId: string) => {
    return savedExperienceIds.includes(experienceId);
  };

  const refreshSaved = async () => {
    await loadSavedExperiences();
  };

  return (
    <FavoritesContext.Provider
      value={{
        savedExperiences,
        savedExperienceIds,
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
