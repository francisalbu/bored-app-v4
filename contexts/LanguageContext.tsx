import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '../lib/i18n';

type Locale = 'en' | 'pt';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@bored_app_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('en');

  // Initialize language on mount
  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      // 1. Check if user has manually selected a language
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'pt')) {
        console.log('🔧 User manually selected language:', savedLanguage);
        i18n.locale = savedLanguage;
        setLocaleState(savedLanguage);
        return;
      }

      // 2. Default to English (app is English-first)
      console.log('🌍 Defaulting to English');
      i18n.locale = 'en';
      setLocaleState('en');
    } catch (error) {
      console.error('Error initializing language:', error);
      // Fallback to English
      i18n.locale = 'en';
      setLocaleState('en');
    }
  };

  const setLocale = async (newLocale: Locale) => {
    try {
      console.log('🔄 Changing language to:', newLocale);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
      
      // Update i18n instance
      i18n.locale = newLocale;
      
      // Update state to trigger re-render
      setLocaleState(newLocale);
      
      console.log('✅ Language changed successfully');
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = (key: string, options?: any): string => {
    return i18n.t(key, options);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
