import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStorage from '@/lib/secureStorage';
import { Platform } from 'react-native';

// Supabase configuration
const SUPABASE_URL = 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';

// Custom storage adapter that works on both native and web
const SecureStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStorage.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item from SecureStorage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStorage.setItemAsync(key, value);
    } catch (error) {
      console.error('Error setting item in SecureStorage:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStorage.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item from SecureStorage:', error);
    }
  },
};

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Changed to true to detect OAuth callbacks
    flowType: 'pkce', // Use PKCE flow for better security
  },
});