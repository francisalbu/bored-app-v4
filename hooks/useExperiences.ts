import { useState, useEffect } from 'react';
import apiService from '@/services/api';
import type { Experience } from '@/constants/experiences';

export function useExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching experiences from API...');
      
      const response = await apiService.getExperiences();
      
      console.log('📦 Full response:', JSON.stringify(response, null, 2));
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch experiences');
      }
      
      const apiData = response.data as any;
      console.log('📦 apiData type:', typeof apiData);
      console.log('📦 apiData:', apiData);
      console.log('📦 Is array?', Array.isArray(apiData));
      
      if (!Array.isArray(apiData)) {
        console.error('❌ apiData is not an array:', apiData);
        throw new Error('Invalid data format from API');
      }
      
      console.log('✅ Experiences fetched:', apiData.length || 0);
      
      // Transform API data to match frontend Experience type
      const transformedExperiences = apiData.map((exp: any) => {
        console.log(`🔍 Experience ${exp.id} provider_logo:`, exp.provider_logo);
        return {
          id: exp.id.toString(),
          title: exp.title,
          provider: exp.operator_name || 'Local Provider',
          providerLogo: exp.provider_logo || exp.operator_logo,
          rating: exp.rating || 0,
          reviewCount: exp.review_count || 0,
          location: exp.location,
        distance: exp.distance || '0km away',
        price: exp.price,
        currency: exp.currency || 'EUR',
        duration: exp.duration,
        category: exp.category || 'Experience',
        verified: exp.verified === 1 || exp.verified === true,
        instantBooking: exp.instant_booking === 1 || exp.instant_booking === true,
        availableToday: exp.available_today === 1 || exp.available_today === true,
        video: exp.video_url,
        image: exp.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
        images: Array.isArray(exp.images) ? exp.images : (exp.images ? JSON.parse(exp.images) : []),
        highlights: Array.isArray(exp.highlights) ? exp.highlights : (exp.highlights ? JSON.parse(exp.highlights) : []),
        description: exp.description,
        short_description: exp.short_description,
        included: Array.isArray(exp.included) ? exp.included : (exp.included ? JSON.parse(exp.included) : []),
        whatToBring: Array.isArray(exp.what_to_bring) ? exp.what_to_bring : (exp.what_to_bring ? JSON.parse(exp.what_to_bring) : []),
        meetingPoint: exp.meeting_point || exp.location,
        languages: Array.isArray(exp.languages) ? exp.languages : (exp.languages ? JSON.parse(exp.languages) : ['Portuguese', 'English']),
        cancellationPolicy: exp.cancellation_policy || 'Free cancellation',
        importantInfo: exp.important_info || '',
        tags: Array.isArray(exp.tags) ? exp.tags : (exp.tags ? JSON.parse(exp.tags) : []),
        latitude: exp.latitude || 0,
        longitude: exp.longitude || 0,
        maxGroupSize: exp.max_group_size,
      }});
      
      console.log('✅ Transformed experiences with logos:', transformedExperiences.map(e => ({id: e.id, logo: e.providerLogo})));
      setExperiences(transformedExperiences);
    } catch (err: any) {
      console.error('❌ Error fetching experiences:', err);
      setError(err.message || 'Failed to load experiences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, []);

  return {
    experiences,
    loading,
    error,
    refetch: fetchExperiences,
  };
}
