import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

interface UserPreferences {
  favorite_categories: string[];
  preferences: Record<string, boolean>;
  quiz_completed: boolean;
  quiz_completed_at?: string;
}

interface PreferencesContextType {
  preferences: UserPreferences | null;
  isLoading: boolean;
  hasCompletedQuiz: boolean;
  favoriteCategories: string[];
  refreshPreferences: () => Promise<void>;
  savePreferences: (data: { favorite_categories: string[]; preferences: Record<string, boolean> }) => Promise<{ success: boolean; error?: string }>;
  getSortedCategories: <T extends { id: string }>(categories: T[]) => T[];
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      setPreferences(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.getPreferences();
      if (response.success && response.data) {
        const data = response.data as UserPreferences;
        setPreferences(data);
        console.log('📋 User preferences loaded:', data.favorite_categories);
      } else {
        setPreferences(null);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      setPreferences(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch preferences when auth state changes
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences, user?.id]);

  const savePreferences = async (data: { favorite_categories: string[]; preferences: Record<string, boolean> }) => {
    try {
      const response = await api.savePreferences(data);
      if (response.success) {
        // Refresh preferences after save
        await fetchPreferences();
        return { success: true };
      }
      return { success: false, error: response.error || 'Failed to save preferences' };
    } catch (error) {
      console.error('Error saving preferences:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Sort categories based on user preferences (favorite categories first)
  const getSortedCategories = useCallback(<T extends { id: string }>(categories: T[]): T[] => {
    if (!preferences?.favorite_categories || preferences.favorite_categories.length === 0) {
      return categories;
    }

    const favoriteIds = preferences.favorite_categories.map(cat => 
      cat.toLowerCase().replace(/_/g, '-')
    );

    return [...categories].sort((a, b) => {
      // Always keep "all" first if it exists
      if (a.id === 'all') return -1;
      if (b.id === 'all') return 1;

      const aIsFavorite = favoriteIds.includes(a.id.toLowerCase());
      const bIsFavorite = favoriteIds.includes(b.id.toLowerCase());

      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // If both are favorites, sort by order in favorites array
      if (aIsFavorite && bIsFavorite) {
        const aIndex = favoriteIds.indexOf(a.id.toLowerCase());
        const bIndex = favoriteIds.indexOf(b.id.toLowerCase());
        return aIndex - bIndex;
      }

      return 0;
    });
  }, [preferences?.favorite_categories]);

  const value: PreferencesContextType = {
    preferences,
    isLoading,
    hasCompletedQuiz: preferences?.quiz_completed || false,
    favoriteCategories: preferences?.favorite_categories || [],
    refreshPreferences: fetchPreferences,
    savePreferences,
    getSortedCategories,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
