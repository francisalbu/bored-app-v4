import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale, setLocale, t } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleLanguageChange = async (newLocale: 'en' | 'pt') => {
    await setLocale(newLocale);
    setShowLanguageModal(false);
  };

  const getLanguageLabel = () => {
    return locale === 'pt' ? 'Português' : 'English';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerSection}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <Pressable style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Currency</Text>
              <Text style={styles.settingValue}>(€) Euro</Text>
            </View>
          </Pressable>
          
          <Pressable style={styles.settingCard} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.language')}</Text>
              <Text style={styles.settingValue}>{getLanguageLabel()}</Text>
            </View>
          </Pressable>
          
          <Pressable style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Appearance</Text>
              <Text style={styles.settingValue}>System default</Text>
            </View>
          </Pressable>
          
          <Pressable style={styles.settingCard}>
            <Text style={styles.settingLabel}>Notifications</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <Pressable style={styles.settingCard} onPress={() => router.push('/info/about' as any)}>
            <Text style={styles.settingLabel}>About Bored Tourist</Text>
          </Pressable>
          
          <Pressable style={styles.settingCard} onPress={() => router.push('/info/help' as any)}>
            <Text style={styles.settingLabel}>Help Center</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <Pressable style={styles.settingCard} onPress={() => router.push('/info/terms' as any)}>
            <Text style={styles.settingLabel}>Terms and Conditions</Text>
          </Pressable>
          
          <Pressable style={styles.settingCard} onPress={() => router.push('/info/privacy' as any)}>
            <Text style={styles.settingLabel}>Privacy</Text>
          </Pressable>
          
          <Pressable style={styles.settingCard} onPress={() => router.push('/info/cancellation' as any)}>
            <Text style={styles.settingLabel}>Cancellation & Refund Policy</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            
            <Pressable 
              style={[styles.languageOption, locale === 'en' && styles.languageOptionSelected]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={styles.languageLabel}>English</Text>
              {locale === 'en' && <Check size={20} color={colors.dark.primary} />}
            </Pressable>
            
            <Pressable 
              style={[styles.languageOption, locale === 'pt' && styles.languageOptionSelected]}
              onPress={() => handleLanguageChange('pt')}
            >
              <Text style={styles.languageLabel}>Português</Text>
              {locale === 'pt' && <Check size={20} color={colors.dark.primary} />}
            </Pressable>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  headerSection: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 16,
  },
  settingCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  settingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.text,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.dark.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    marginBottom: 12,
  },
  languageOptionSelected: {
    backgroundColor: colors.dark.primary + '20',
    borderWidth: 2,
    borderColor: colors.dark.primary,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.text,
  },
});
