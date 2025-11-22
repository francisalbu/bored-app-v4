import { Settings, Award, TrendingUp, MapPin, Star, LogOut, LogIn } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import colors from '@/constants/colors';
import { USER_PROFILE, type Badge } from '@/constants/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import AuthBottomSheet from '@/components/AuthBottomSheet';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { savedExperiences } = useFavorites();
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  
  // For new users, all stats start at 0
  const currentXP = 0;
  const nextLevelXP = 3500;
  const level = 1;
  const progressPercentage = (currentXP / nextLevelXP) * 100;
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleLogin = () => {
    setShowAuthSheet(true);
  };

  // Show login prompt when not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        
        <View style={styles.guestContainer}>
          <View style={styles.guestContent}>
            <Text style={styles.guestTitle}>Access your bookings from anywhere</Text>
            <Text style={styles.guestDescription}>
              Sign up to sync your bookings, add activities to your favorites list, and make payments faster with saved data.
            </Text>
            <Pressable style={styles.guestButton} onPress={handleLogin}>
              <Text style={styles.guestButtonText}>Sign in or create account</Text>
            </Pressable>
          </View>

          <AuthBottomSheet
            visible={showAuthSheet}
            onClose={() => setShowAuthSheet(false)}
          />

          <View style={styles.guestSettingsSection}>
            <Text style={styles.guestSectionTitle}>Settings</Text>
            
            <Pressable style={styles.guestSettingItem}>
              <Text style={styles.guestSettingLabel}>Currency</Text>
              <Text style={styles.guestSettingValue}>(€) Euro</Text>
            </Pressable>
            
            <Pressable style={styles.guestSettingItem}>
              <Text style={styles.guestSettingLabel}>Language</Text>
              <Text style={styles.guestSettingValue}>English</Text>
            </Pressable>
            
            <Pressable style={styles.guestSettingItem}>
              <Text style={styles.guestSettingLabel}>Appearance</Text>
              <Text style={styles.guestSettingValue}>System default</Text>
            </Pressable>
            
            <Pressable style={styles.guestSettingItem}>
              <Text style={styles.guestSettingLabel}>Notifications</Text>
            </Pressable>
          </View>

          <View style={styles.guestSettingsSection}>
            <Text style={styles.guestSectionTitle}>Support</Text>
            
            <Pressable style={styles.guestSettingItem}>
              <Text style={styles.guestSettingLabel}>About Bored Tourist</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerButtons}>
          <Pressable style={styles.settingsButton}>
            <Settings size={24} color={colors.dark.text} />
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={colors.dark.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{user?.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.username}>@{user?.email.split('@')[0]}</Text>

          <View style={styles.levelContainer}>
            <View style={styles.levelBadge}>
              <Award size={16} color={colors.dark.primary} />
              <Text style={styles.levelText}>Level {level}</Text>
            </View>
            <Text style={styles.title}>Beginner Explorer</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentXP} / {nextLevelXP} XP
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Star size={20} color={colors.dark.accent} />
            <Text style={styles.sectionTitle}>Saved Experiences</Text>
            {savedExperiences.length > 0 && (
              <Text style={styles.sectionCount}>({savedExperiences.length})</Text>
            )}
          </View>
          <Pressable
            style={styles.savedButton}
            onPress={() => router.push('/saved-experiences' as any)}
          >
            <View style={styles.savedButtonContent}>
              <View style={styles.savedButtonLeft}>
                <View style={styles.savedIconContainer}>
                  <Star size={24} color={colors.dark.accent} fill={colors.dark.accent} />
                </View>
                <View>
                  <Text style={styles.savedButtonTitle}>
                    {savedExperiences.length > 0 
                      ? `${savedExperiences.length} Saved Experience${savedExperiences.length !== 1 ? 's' : ''}`
                      : 'No Saved Experiences'}
                  </Text>
                  <Text style={styles.savedButtonSubtitle}>
                    {savedExperiences.length > 0 
                      ? 'Tap to view all your favorites'
                      : 'Start saving experiences you love'}
                  </Text>
                </View>
              </View>
              <Text style={styles.savedButtonArrow}>›</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color={colors.dark.primary} />
            <Text style={styles.sectionTitle}>Badges</Text>
          </View>
          <View style={styles.badgesGrid}>
            {USER_PROFILE.badges.map((badge) => (
              <BadgeCard key={badge.id} badge={{ ...badge, earned: false }} earned={false} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Star size={20} color={colors.dark.accent} />
            <Text style={styles.sectionTitle}>Adventure Stats</Text>
          </View>
          <View style={styles.statsListContainer}>
            <StatRow
              icon={<MapPin size={18} color={colors.dark.primary} />}
              label="Total Experiences Booked"
              value="0"
            />
            <StatRow
              icon={<TrendingUp size={18} color={colors.dark.primary} />}
              label="Experiences Completed"
              value="0"
            />
            <StatRow
              icon={<Award size={18} color={colors.dark.primary} />}
              label="Current Level"
              value={level.toString()}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
}

function BadgeCard({ badge, earned }: BadgeCardProps) {
  const isEarned = badge.earned; // Use badge's earned status instead of prop
  
  return (
    <View style={[
      styles.badgeCard, 
      !isEarned && styles.badgeCardLocked,
      isEarned && { borderColor: colors.dark.primary, borderWidth: 2 }
    ]}>
      <Text style={[styles.badgeIcon, !isEarned && styles.badgeIconLocked]}>
        {badge.icon}
      </Text>
      <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]}>
        {badge.name}
      </Text>
      <Text
        style={[styles.badgeDescription, !isEarned && styles.badgeDescriptionLocked]}
        numberOfLines={2}
      >
        {badge.description}
      </Text>
      {isEarned && badge.earnedDate && (
        <Text style={styles.badgeDate}>
          {new Date(badge.earnedDate).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      )}
      {!isEarned && (
        <Text style={styles.lockedText}>🔒 Locked</Text>
      )}
    </View>
  );
}

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatRow({ icon, label, value }: StatRowProps) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statRowLeft}>
        <View>{icon}</View>
        <Text style={styles.statRowLabel}>{label}</Text>
      </View>
      <Text style={styles.statRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.primary,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: colors.dark.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.error,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: colors.dark.error,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.dark.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.dark.primary,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '900' as const,
    color: colors.dark.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 16,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 140, 0.15)',
    borderWidth: 1,
    borderColor: colors.dark.primary,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: colors.dark.primary,
  },
  title: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: colors.dark.accent,
  },
  progressContainer: {
    width: '100%',
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.dark.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.dark.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: colors.dark.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.dark.textSecondary,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: colors.dark.text,
  },
  sectionCount: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    marginLeft: 8,
  },
  savedInfo: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
    padding: 16,
  },
  savedButton: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  savedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  savedIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 204, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedButtonTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginBottom: 4,
  },
  savedButtonSubtitle: {
    fontSize: 13,
    color: colors.dark.textSecondary,
  },
  savedButtonArrow: {
    fontSize: 32,
    color: colors.dark.textSecondary,
    fontWeight: '300' as const,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  badgeCardLocked: {
    backgroundColor: colors.dark.backgroundTertiary,
    borderColor: colors.dark.border,
    opacity: 0.6,
  },
  badgeIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginBottom: 4,
    textAlign: 'center' as const,
  },
  badgeNameLocked: {
    color: colors.dark.textSecondary,
  },
  badgeDescription: {
    fontSize: 11,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 14,
  },
  badgeDescriptionLocked: {
    color: colors.dark.textTertiary,
  },
  badgeDate: {
    fontSize: 10,
    color: colors.dark.primary,
    marginTop: 4,
    fontWeight: '900' as const,
  },
  lockedText: {
    fontSize: 10,
    color: colors.dark.textTertiary,
    marginTop: 4,
  },
  statsListContainer: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statRowLabel: {
    fontSize: 14,
    color: colors.dark.text,
  },
  statRowValue: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: colors.dark.primary,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: colors.dark.text,
  },
  guestContainer: {
    flex: 1,
    padding: 16,
  },
  guestContent: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginBottom: 12,
  },
  guestDescription: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  guestButton: {
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  guestSettingsSection: {
    marginBottom: 24,
  },
  guestSectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 12,
  },
  guestSettingItem: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestSettingLabel: {
    fontSize: 14,
    color: colors.dark.text,
  },
  guestSettingValue: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
});
