import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { usePostHog } from 'posthog-react-native';
import { api } from '@/services/api';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarIcon?: string;
  location?: string;
  birthdate?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean; email?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const posthog = usePostHog();

  useEffect(() => {
    loadStoredAuth();
    
    // Listen for auth state changes (token refresh, logout, OAuth, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [AUTH STATE CHANGE]:', event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in:', session.user.email);
        
        // Use Supabase auth data directly (faster and more reliable)
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          phone: session.user.phone || undefined,
        };

        await SecureStore.setItemAsync(TOKEN_KEY, session.access_token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

        api.setAuthToken(session.access_token);
        setUser(userData);
        
        console.log('✅ Login complete!');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('✅ Token refreshed automatically');
        const newToken = session.access_token;
        
        // Update stored token
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        api.setAuthToken(newToken);
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out');
        setUser(null);
        api.clearAuthToken();
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    });

    // Cleanup listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('🔄 Loading stored auth...');
      
      // FIRST: Check if there's an active Supabase session (from OAuth or previous login)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session && !sessionError) {
        console.log('✅ Found active Supabase session:', session.user.email);
        
        // Get user from public.users table
        const { data: publicUser, error: queryError } = await supabase
          .from('users')
          .select('*')
          .eq('supabase_uid', session.user.id)
          .single();
        
        if (publicUser && !queryError) {
          console.log('✅ Found user in public.users:', publicUser.email);
          
          const userData = {
            id: publicUser.id.toString(),
            email: publicUser.email,
            name: publicUser.name,
            phone: publicUser.phone || undefined,
            avatarIcon: publicUser.avatar_icon,
            birthdate: publicUser.birthdate,
            location: publicUser.location,
          };

          await SecureStore.setItemAsync(TOKEN_KEY, session.access_token);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

          api.setAuthToken(session.access_token);
          setUser(userData);

          console.log('✅ User loaded from public.users on app start!');
          setIsLoading(false);
          return;
        } else {
          console.error('❌ User not in public.users yet:', queryError);
        }
      }
      
      // FALLBACK: Load from SecureStore if no active session or sync failed
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userData = await SecureStore.getItemAsync(USER_KEY);

      if (token && userData) {
        console.log('✅ Loaded auth from SecureStore');
        api.setAuthToken(token);
        setUser(JSON.parse(userData));
      } else {
        console.log('ℹ️ No stored auth found');
      }
    } catch (error) {
      console.error('❌ Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Logging in with Supabase...', email);

      // Step 1: Login with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('❌ Supabase login error:', authError.message);
        
        // Check if email needs confirmation
        if (authError.message.includes('Email not confirmed')) {
          return {
            success: false,
            error: 'Please verify your email before logging in',
            needsEmailConfirmation: true,
          };
        }
        
        return {
          success: false,
          error: authError.message,
        };
      }

      if (!authData.user || !authData.session) {
        console.error('❌ No user or session returned from Supabase');
        return {
          success: false,
          error: 'Login failed - no session',
        };
      }

      console.log('✅ Supabase login successful:', authData.user.id);

      // Step 2: Sync with backend (gets/creates user in bored_tourist.db)
      const supabaseToken = authData.session.access_token;
      // Use production backend URL
      const backendURL = 'https://bored-tourist-api.onrender.com/api';
      
      console.log('📡 Calling backend:', `${backendURL}/auth/supabase/login`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for Render cold starts

      try {
        const response = await fetch(`${backendURL}/auth/supabase/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📥 Backend response status:', response.status);
        const backendData = await response.json();
        console.log('🗄️ Backend sync response:', backendData);

        if (!backendData.success) {
          return {
            success: false,
            error: backendData.error || 'Failed to sync with backend',
          };
        }

        // Step 3: Store session
        const userData = {
          id: backendData.data.user.id.toString(),
          email: backendData.data.user.email,
          name: backendData.data.user.name,
          phone: backendData.data.user.phone,
        };

        await SecureStore.setItemAsync(TOKEN_KEY, supabaseToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

        api.setAuthToken(supabaseToken);
        setUser(userData);

        // Track successful login
        if (posthog) {
          posthog.identify(userData.id, {
            email: userData.email,
            name: userData.name,
          });
          posthog.capture('user_logged_in', {
            method: 'email',
          });
        }

        console.log('✅ Login complete! User synced with backend.');

        return { success: true };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error('❌ Backend sync error:', fetchError);
        
        if (fetchError.name === 'AbortError') {
          return {
            success: false,
            error: 'Backend timeout - please try again',
          };
        }
        
        return {
          success: false,
          error: 'Failed to connect to backend',
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    try {
      // Trim and normalize inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();
      
      console.log('🔐 AuthContext: Starting registration...', trimmedEmail);
      console.log('📋 Name:', trimmedName);

      // NEW APPROACH: Call backend FIRST to create user via Supabase Admin API
      // This avoids the "User already registered" bug
      console.log('📡 Calling backend to create user...');
      
      // Use production backend URL - local backend is not running
      const backendURL = 'https://bored-tourist-api.onrender.com/api';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for Render cold starts

      try {
        const response = await fetch(`${backendURL}/auth/supabase/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            name: trimmedName, 
            email: trimmedEmail, 
            password, 
            phone: phone?.trim() 
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📥 Backend response status:', response.status);
        const backendData = await response.json();
        console.log('🗄️ Backend response:', backendData);

        if (!backendData.success) {
          console.error('❌ Backend registration failed:', backendData.error);
          return {
            success: false,
            error: backendData.error || 'Failed to create account',
          };
        }

        console.log('✅ User created via backend!');

        // Check if email confirmation is needed (from backend response)
        if (backendData.data.needsEmailConfirmation) {
          console.log('📧 Email confirmation required');
          return {
            success: true,
            needsEmailConfirmation: true,
            email: email,
          };
        }

        // Now login with Supabase to get a session
        console.log('🔐 Logging in to get session...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          console.error('❌ Login failed after registration:', authError.message);
          
          // Check if it's an email confirmation error
          if (authError.message.includes('Email not confirmed')) {
            console.log('📧 Email confirmation required');
            return {
              success: true,
              needsEmailConfirmation: true,
              email: email,
            };
          }
          
          return {
            success: false,
            error: 'Account created but unable to login. Please try signing in manually.',
          };
        }

        if (!authData.session) {
          console.error('❌ No session returned after login');
          return {
            success: false,
            error: 'Account created but unable to login. Please try signing in manually.',
          };
        }

        console.log('✅ Login successful!');

        // Step 3: Store session locally
        const supabaseToken = authData.session.access_token;
        
        const userData = {
          id: backendData.data.user.id.toString(),
          email: backendData.data.user.email,
          name: backendData.data.user.name,
          phone: backendData.data.user.phone || null,
        };

        await SecureStore.setItemAsync(TOKEN_KEY, supabaseToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

        api.setAuthToken(supabaseToken);
        setUser(userData);

        // Track successful registration
        if (posthog) {
          posthog.identify(userData.id, {
            email: userData.email,
            name: userData.name,
          });
          posthog.capture('user_registered', {
            method: 'email',
          });
        }

        console.log('✅ Registration complete!');

        return { success: true };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error('❌ Registration error:', fetchError);
        
        if (fetchError.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout - please try again',
          };
        }
        
        return {
          success: false,
          error: 'Failed to create account - please try again',
        };
      }
    } catch (error) {
      console.error('❌ Register error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out...');
      
      // Track logout before clearing data
      if (posthog) {
        posthog.capture('user_logged_out');
        posthog.reset();
      }
      
      // Step 1: Logout from Supabase
      await supabase.auth.signOut();
      
      // Step 2: Clear local storage
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      
      // Step 3: Clear API token
      api.clearAuthToken();
      
      // Step 4: Clear AI chat session
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('@bored_ai_session_id');
      
      setUser(null);
      
      console.log('✅ Logout complete!');
    } catch (error) {
      console.error('❌ Error logging out:', error);
    }
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🗑️ Deleting account...');
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return { success: false, error: 'No user logged in' };
      }

      // Call the backend API to delete the account
      // This uses the service_role key to delete from auth.users
      const response = await api.deleteAccount();
      
      console.log('🗑️ Delete account response:', response);
      
      if (!response.success) {
        console.error('❌ Delete account failed:', response.error);
        return { success: false, error: response.error || 'Failed to delete account' };
      }
      
      // Sign out from Supabase (may already be invalidated)
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.log('Note: signOut after delete:', e);
      }
      
      // Clear local storage
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      
      // Clear API token
      api.clearAuthToken();
      
      // Clear AI chat session and other local data
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('@bored_ai_session_id');
      await AsyncStorage.removeItem('@bored_tourist_onboarding_shown');
      
      setUser(null);
      
      console.log('✅ Account deleted successfully!');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error deleting account:', error);
      return { success: false, error: error.message || 'Failed to delete account' };
    }
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user data...');
      
      // Get current session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('❌ No active session:', error?.message || 'No session');
        return;
      }

      console.log('✅ Session found:', session.user.email);
      console.log('🔑 Token (first 20 chars):', session.access_token.substring(0, 20) + '...');

      // Sync with backend - use production URL
      const backendURL = 'https://bored-tourist-api.onrender.com/api';

      console.log('📡 Calling backend:', `${backendURL}/auth/supabase/me`);

      const response = await fetch(`${backendURL}/auth/supabase/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('📥 Backend response status:', response.status);
      const backendData = await response.json();
      console.log('📦 Backend response:', JSON.stringify(backendData, null, 2));
      
      if (backendData.success && backendData.data.user) {
        const userData = {
          id: backendData.data.user.id.toString(),
          email: backendData.data.user.email,
          name: backendData.data.user.name,
          phone: backendData.data.user.phone,
          avatarIcon: backendData.data.user.avatar_icon,
          birthdate: backendData.data.user.birthdate,
          location: backendData.data.user.location,
        };

        console.log('💾 Storing user data:', userData.email);

        await SecureStore.setItemAsync(TOKEN_KEY, session.access_token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

        api.setAuthToken(session.access_token);
        setUser(userData);

        console.log('✅ User data refreshed successfully!');
      } else {
        console.error('❌ Backend did not return user data:', backendData);
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('🔐 Starting Google Sign-In...');
      
      // Note: The actual OAuth flow is handled in app/auth/index.tsx
      // This function is for future direct calls if needed
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Sign-In failed',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        deleteAccount,
        refreshUser,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
