/**
 * Supabase Auth Context
 * 
 * This context handles authentication using Supabase Auth.
 * Features:
 * - Email/Password authentication
 * - Session persistence with AsyncStorage
 * - Auto-refresh tokens
 * - Seamless integration with existing app structure
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  session: Session | null;
}

const SupabaseAuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Initial session:', session ? 'Found' : 'None');
      setSession(session);
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 Auth state changed:', _event, session ? 'Session exists' : 'No session');
      setSession(session);
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const mapSupabaseUser = (supabaseUser: SupabaseUser): User => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
      phone: supabaseUser.user_metadata?.phone || supabaseUser.phone,
    };
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting Supabase login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Supabase login error:', error.message);
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.session && data.user) {
        console.log('✅ Supabase login successful');
        setSession(data.session);
        setUser(mapSupabaseUser(data.user));
        return { success: true };
      }

      return {
        success: false,
        error: 'Login failed - no session returned',
      };
    } catch (error) {
      console.error('❌ Supabase login exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    try {
      console.log('🔐 Attempting Supabase registration for:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          },
        },
      });

      if (error) {
        console.error('❌ Supabase registration error:', error.message);
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.user) {
        console.log('✅ Supabase registration successful');
        // Note: User might need to verify email depending on Supabase settings
        if (data.session) {
          setSession(data.session);
          setUser(mapSupabaseUser(data.user));
        }
        return { success: true };
      }

      return {
        success: false,
        error: 'Registration failed',
      };
    } catch (error) {
      console.error('❌ Supabase registration exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      console.log('🔐 Logging out from Supabase');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        session,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
