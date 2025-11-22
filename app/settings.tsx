import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerSection}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <Pressable style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Currency</Text>
              <Text style={styles.settingValue}>(€) Euro</Text>
            </View>
          </Pressable>
          
          <Pressable style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingValue}>English</Text>
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
});
