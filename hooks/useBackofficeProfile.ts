import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';

export interface BackofficeUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface BackofficeOperator {
  id: number;
  user_id: number;
  company_name: string;
  logo_url?: string | null;
  description?: string | null;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  verified?: boolean;
}

export interface BackofficeProfile {
  user: BackofficeUser;
  operator: BackofficeOperator | null;
}

export function useBackofficeProfile() {
  const [profile, setProfile] = useState<BackofficeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.getBackofficeProfile();

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load backoffice profile');
      }

      setProfile(response.data as BackofficeProfile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load backoffice profile';
      setError(message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    refresh: loadProfile
  };
}
