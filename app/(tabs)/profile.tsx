import { ChevronLeft, MoreVertical, Star, MessageCircle, Mail, Shield, BookOpen, LogOut, Trash2, Info, ChevronRight } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import AuthBottomSheet from '@/components/AuthBottomSheet';
import api from '@/services/api';
import { EXPERIENCES } from '@/constants/experiences';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { savedExperiences: savedExperienceIds } = useFavorites();
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Get full experience data for saved experiences
  const savedExperiences = EXPERIENCES.filter(exp => savedExperienceIds.includes(exp.id));
  
  // User stats from backend
  const [userStats, setUserStats] = useState({
    experiencesCompleted: 0,
    citiesVisited: 0,
    reviewsWritten: 0
  });

  // Fetch user stats when authenticated
  useEffect(() => {
    const fetchStats = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await api.getUserStats();
        if (response.success && response.data) {
          const data = response.data as {
            experiencesCompleted?: number;
            citiesVisited?: number;
            reviewsWritten?: number;
          };
          setUserStats({
            experiencesCompleted: data.experiencesCompleted || 0,
            citiesVisited: data.citiesVisited || 0,
            reviewsWritten: data.reviewsWritten || 0
          });
        }
      } catch (error) {
        console.log('Failed to fetch user stats:', error);
      }
    };

    fetchStats();
  }, [isAuthenticated]);
  
  // XP/Level system based on real stats
  const { experiencesCompleted, citiesVisited, reviewsWritten } = userStats;
  
  // Level calculation: Each level requires more XP
  const level = Math.floor(experiencesCompleted / 5) + 1;
  const currentLevelXP = experiencesCompleted % 5;
  const xpForNextLevel = 5;
  const progressPercentage = (currentLevelXP / xpForNextLevel) * 100;
  
  const getLevelTitle = (lvl: number) => {
    if (lvl <= 1) return 'Explorer';
    if (lvl <= 3) return 'Adventurer';
    if (lvl <= 5) return 'Traveler';
    if (lvl <= 10) return 'Globetrotter';
    return 'Legend';
  };
  
  const handleLogout = () => {
    setShowMenu(false);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Contact Support', 'Please email support@boredtourist.com to delete your account.');
          },
        },
      ]
    );
  };

  const handleLogin = () => {
    setShowAuthSheet(true);
  };

  const handleTextFounder = () => {
    Linking.openURL('https://wa.me/351967407859?text=Hi%20Francis!');
  };

  const handleEmailUs = () => {
    Linking.openURL('mailto:francisco.albuquerque@boredtourist.com');
  };

  // Show login prompt when not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ChevronLeft size={28} color={colors.dark.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Login Card */}
            <View style={styles.loginCard}>
              <View style={styles.loginIconContainer}>
                <Text style={styles.loginIcon}>👋</Text>
              </View>
              <Text style={styles.loginTitle}>Welcome to Bored Tourist</Text>
              <Text style={styles.loginDescription}>
                Sign in to sync your bookings, save your favorite experiences, and track your adventures.
              </Text>
              <Pressable style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Sign in or create account</Text>
              </Pressable>
            </View>

            {/* Contact Section */}
            <View style={styles.sectionCard}>
              <Pressable style={styles.menuItem} onPress={handleTextFounder}>
                <MessageCircle size={22} color={colors.dark.textSecondary} />
                <Text style={styles.menuItemText}>Text the Founder</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable style={styles.menuItem} onPress={handleEmailUs}>
                <Mail size={22} color={colors.dark.textSecondary} />
                <Text style={styles.menuItemText}>Email Us</Text>
              </Pressable>
            </View>

            {/* Legal Section */}
            <View style={styles.sectionCard}>
              <Pressable style={styles.menuItem} onPress={() => router.push('/info/about' as any)}>
                <Info size={22} color={colors.dark.textSecondary} />
                <Text style={styles.menuItemText}>About Bored Tourist</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable style={styles.menuItem} onPress={() => router.push('/info/privacy' as any)}>
                <Shield size={22} color={colors.dark.textSecondary} />
                <Text style={styles.menuItemText}>Privacy Policy</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable style={styles.menuItem} onPress={() => router.push('/info/terms' as any)}>
                <BookOpen size={22} color={colors.dark.textSecondary} />
                <Text style={styles.menuItemText}>Terms of Use</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        <AuthBottomSheet
          visible={showAuthSheet}
          onClose={() => setShowAuthSheet(false)}
          onSuccess={() => {
            setShowAuthSheet(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={28} color={colors.dark.text} />
          </Pressable>
          <View style={styles.headerRight}>
            <Pressable style={styles.menuButton} onPress={() => setShowMenu(true)}>
              <MoreVertical size={24} color={colors.dark.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>🧑‍🚀</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Explorer'}</Text>
              <Text style={styles.profileUsername}>@{user?.email?.split('@')[0] || 'username'}</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{experiencesCompleted}</Text>
              <Text style={styles.statLabel}>Experiences</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{citiesVisited}</Text>
              <Text style={styles.statLabel}>Cities</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{reviewsWritten}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>

          {/* Level Progress */}
          <View style={styles.levelSection}>
            <View style={styles.levelProgressBar}>
              <View style={[styles.levelProgressFill, { width: `${Math.max(progressPercentage, 5)}%` }]} />
            </View>
            <View style={styles.levelLabels}>
              <Text style={styles.levelCurrent}>
                <Text style={styles.levelBold}>Level {level}</Text> {getLevelTitle(level)}
              </Text>
              <Text style={styles.levelNext}>Level {level + 1}</Text>
            </View>
          </View>

          {/* Saved Experiences Card with Thumbnails */}
          <Pressable 
            style={styles.savedCard}
            onPress={() => router.push('/saved-experiences' as any)}
          >
            <View style={styles.savedContent}>
              {savedExperiences.length > 0 ? (
                <View style={styles.savedThumbnails}>
                  {savedExperiences.slice(0, 3).map((exp, index) => (
                    <View 
                      key={exp.id} 
                      style={[
                        styles.savedThumbnail,
                        { marginLeft: index > 0 ? -15 : 0, zIndex: 3 - index }
                      ]}
                    >
                      <Image
                        source={{ uri: exp.image }}
                        style={styles.savedThumbnailImage}
                        contentFit="cover"
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.savedEmptyIcon}>
                  <Star size={32} color={colors.dark.textTertiary} />
                </View>
              )}
              <View style={styles.savedInfo}>
                <Text style={styles.savedTitle}>Saved Experiences</Text>
                <Text style={styles.savedCount}>
                  {savedExperiences.length > 0 
                    ? `${savedExperiences.length} saved`
                    : 'No experiences saved yet'}
                </Text>
              </View>
            </View>
            <ChevronRight size={24} color={colors.dark.textTertiary} />
          </Pressable>

          {/* Contact Section */}
          <View style={styles.sectionCard}>
            <Pressable style={styles.menuItem} onPress={handleTextFounder}>
              <MessageCircle size={22} color={colors.dark.textSecondary} />
              <Text style={styles.menuItemText}>Text the Founder</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={handleEmailUs}>
              <Mail size={22} color={colors.dark.textSecondary} />
              <Text style={styles.menuItemText}>Email Us</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuDropdown, { top: insets.top + 60 }]}>
            <Pressable 
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/info/about' as any);
              }}
            >
              <Info size={20} color={colors.dark.text} />
              <Text style={styles.menuDropdownText}>About Bored Tourist</Text>
            </Pressable>
            
            <View style={styles.menuDropdownDivider} />
            
            <Pressable 
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/info/privacy' as any);
              }}
            >
              <Shield size={20} color={colors.dark.text} />
              <Text style={styles.menuDropdownText}>Privacy Policy</Text>
            </Pressable>
            
            <View style={styles.menuDropdownDivider} />
            
            <Pressable 
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/info/terms' as any);
              }}
            >
              <BookOpen size={20} color={colors.dark.text} />
              <Text style={styles.menuDropdownText}>Terms of Use</Text>
            </Pressable>
            
            <View style={styles.menuDropdownDivider} />
            
            <Pressable 
              style={styles.menuDropdownItem}
              onPress={handleLogout}
            >
              <LogOut size={20} color={colors.dark.text} />
              <Text style={styles.menuDropdownText}>Sign Out</Text>
            </Pressable>
            
            <View style={styles.menuDropdownDivider} />
            
            <Pressable 
              style={styles.menuDropdownItem}
              onPress={handleDeleteAccount}
            >
              <Trash2 size={20} color={colors.dark.error} />
              <Text style={[styles.menuDropdownText, { color: colors.dark.error }]}>Delete Account</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <AuthBottomSheet
        visible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
        onSuccess={() => setShowAuthSheet(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  headerRight: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.dark.border,
  },
  avatarEmoji: {
    fontSize: 48,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.dark.text,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: colors.dark.textSecondary,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.dark.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.dark.border,
  },
  // Level Progress
  levelSection: {
    marginBottom: 24,
  },
  levelProgressBar: {
    height: 8,
    backgroundColor: colors.dark.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: colors.dark.text,
    borderRadius: 4,
  },
  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelCurrent: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  levelBold: {
    fontWeight: '800' as const,
    color: colors.dark.text,
  },
  levelNext: {
    fontSize: 14,
    color: colors.dark.textTertiary,
  },
  // Saved Card
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  savedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedThumbnails: {
    flexDirection: 'row',
    marginRight: 12,
  },
  savedThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.dark.card,
  },
  savedThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  savedImagesRow: {
    flexDirection: 'row',
    marginRight: 12,
  },
  savedImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.dark.card,
  },
  savedEmptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.dark.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedInfo: {
    flex: 1,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 2,
  },
  savedCount: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  // Section Card
  sectionCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.dark.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.dark.border,
    marginLeft: 50,
  },
  // Login Card
  loginCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.dark.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginIcon: {
    fontSize: 40,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginDescription: {
    fontSize: 15,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  // Menu Overlay
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuDropdown: {
    position: 'absolute',
    right: 16,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuDropdownText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.dark.text,
  },
  menuDropdownDivider: {
    height: 1,
    backgroundColor: colors.dark.border,
  },
});
