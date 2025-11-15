import { useState, useEffect } from 'react';
import { api } from '@/services/api';

export function useExperiences() {
  const [experiences, setExperiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiences = async (params?: any) => {
    setLoading(true);
    setError(null);
    
    const response = await api.getExperiences(params);
    
    if (response.success && response.data) {
      setExperiences(Array.isArray(response.data) ? response.data : []);
    } else {
      setError(response.error || 'Failed to fetch experiences');
    }
    
    setLoading(false);
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

export function useExperience(id: string) {
  const [experience, setExperience] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExperience = async () => {
      setLoading(true);
      setError(null);
      
      const response = await api.getExperience(id);
      
      if (response.success && response.data) {
        setExperience(response.data);
      } else {
        setError(response.error || 'Failed to fetch experience');
      }
      
      setLoading(false);
    };

    if (id) {
      fetchExperience();
    }
  }, [id]);

  return { experience, loading, error };
}

export function useBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    
    const response = await api.getMyBookings();
    
    if (response.success && response.data) {
      setBookings(Array.isArray(response.data) ? response.data : []);
    } else {
      setError(response.error || 'Failed to fetch bookings');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings,
  };
}
