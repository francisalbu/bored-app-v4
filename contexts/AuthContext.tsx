import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/services/api';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userData = await SecureStore.getItemAsync(USER_KEY);

      if (token && userData) {
        api.setAuthToken(token);
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Attempting login for', email);
      const response = await api.login(email, password);
      console.log('AuthContext: Login response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const responseData = response.data as any;
        console.log('AuthContext: Response data:', JSON.stringify(responseData, null, 2));
        
        // Backend returns: { message: "Login successful", user: {...}, token: "..." }
        const { token, user: userData } = responseData;
        
        if (!token) {
          console.error('AuthContext: No token in response');
          return {
            success: false,
            error: 'No authentication token received',
          };
        }
        
        console.log('AuthContext: Storing token and user data');
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
        
        api.setAuthToken(token);
        setUser(userData);

        console.log('AuthContext: Login successful');
        return { success: true };
      }

      console.log('AuthContext: Login failed -', response.error);
      return {
        success: false,
        error: response.error || 'Login failed',
      };
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    try {
      const response = await api.register({ name, email, password, phone });
      
      console.log('Register response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const responseData = response.data as any;
        console.log('Response data:', JSON.stringify(responseData, null, 2));
        
        // Backend returns: { success: true, data: { token, user } }
        // But API service wraps it, so we get the nested data
        const actualData = responseData.data || responseData;
        const { token, user: userData } = actualData;
        
        if (!token || typeof token !== 'string') {
          console.error('Invalid token:', token);
          return {
            success: false,
            error: 'Invalid token received from server',
          };
        }
        
        if (!userData || typeof userData !== 'object') {
          console.error('Invalid user data:', userData);
          return {
            success: false,
            error: 'Invalid user data received from server',
          };
        }
        
        console.log('Storing token...');
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        console.log('Storing user data...');
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
        
        api.setAuthToken(token);
        setUser(userData);

        return { success: true };
      }

      return {
        success: false,
        error: response.error || 'Registration failed',
      };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      api.clearAuthToken();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
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
