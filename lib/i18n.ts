import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from '../locales/en.json';
import pt from '../locales/pt.json';

// Create i18n instance
const i18n = new I18n({
  en,
  pt,
});

// Set default locale from device settings
// If device is pt-PT or pt-BR, use 'pt'. Otherwise default to 'en'
const deviceLocale = Localization.getLocales()[0];
const deviceLanguage = deviceLocale?.languageCode || 'en';

// Map device language to supported locales
// pt-PT, pt-BR -> 'pt'
// en-US, en-GB, etc -> 'en'  
// Any other language -> 'en' (fallback)
const mapLanguageToLocale = (lang: string): string => {
  if (lang.startsWith('pt')) {
    return 'pt';
  }
  return 'en'; // Default fallback for all other languages
};

i18n.locale = mapLanguageToLocale(deviceLanguage);
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

console.log('📱 Device locale:', deviceLocale);
console.log('🌍 Selected app locale:', i18n.locale);

export default i18n;
