import { useState, useEffect } from 'react';
import apiService from '@/services/api';
import { usePreferences } from '@/contexts/PreferencesContext';

interface ViatorExperience {
  id: string;
  source: string;
  productCode: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  location: string;
  imageUrl: string;
  images: string[];
  rating: number;
  reviewCount: number;
  productUrl: string;
  tags: string[];
  matchedTag?: string; // Which user preference tag matched this experience
}

export function useViatorExperiences(location: string, enabled: boolean = true) {
  const [experiences, setExperiences] = useState<ViatorExperience[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { favoriteCategories } = usePreferences();

  const fetchViatorExperiences = async () => {
    if (!enabled || !location) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching Viator experiences...', { location, tags: favoriteCategories });
      
      const response = await apiService.getViatorExperiences(
        location,
        favoriteCategories.length > 0 ? favoriteCategories : undefined,
        10
      );
      
      if (!response.success) {
        console.warn('⚠️ Viator API returned error:', response.error);
        setExperiences([]);
        setError(null); // Don't show error to user, just show no results
        return;
      }
      
      const viatorData = (response.data as ViatorExperience[]) || [];
      console.log('✅ Viator experiences fetched:', viatorData.length);
      setExperiences(viatorData);
      setError(null);
    } catch (err: any) {
      console.error('❌ Error fetching Viator experiences:', err);
      setError(null); // Don't show error to user, just fail silently
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViatorExperiences();
  }, [location, enabled, favoriteCategories.join(',')]); // Re-fetch when location or preferences change

  return {
    experiences,
    loading,
    error,
    refetch: fetchViatorExperiences,
  };
}
