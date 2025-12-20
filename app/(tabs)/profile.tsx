import { MoreVertical, Star, MessageCircle, Mail, Shield, BookOpen, LogOut, Trash2, Info, ChevronRight, Edit2 } from 'lucide-react-native';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import AuthBottomSheet from '@/components/AuthBottomSheet';
import PreferencesQuiz from '@/components/PreferencesQuiz';
import QuizSuggestionModal from '@/components/QuizSuggestionModal';
import { api } from '@/services/api';
import { useExperiences } from '@/hooks/useExperiences';
import EditProfileModal from '../../components/EditProfileModal';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, isNewSignup, clearNewSignupFlag, logout, deleteAccount, refreshUser } = useAuth();
  const { savedExperiences: savedExperienceIds } = useFavorites();
  const { hasCompletedQuiz, savePreferences, refreshPreferences } = usePreferences();
  const { experiences } = useExperiences();
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showQuizSuggestion, setShowQuizSuggestion] = useState(false);
  
  // Show quiz suggestion for new signups
  useEffect(() => {
    if (isNewSignup && isAuthenticated && !hasCompletedQuiz) {
      // Small delay to ensure the UI has loaded
      const timer = setTimeout(() => {
        setShowQuizSuggestion(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isNewSignup, isAuthenticated, hasCompletedQuiz]);
  
  // Edit profile states
  const [editName, setEditName] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAvatarIcon, setEditAvatarIcon] = useState('🧑‍🚀');

  // Auto-format birthdate as user types
  const handleBirthdateChange = (text: string) => {
    // Remove all non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY
    let formatted = numbers;
    if (numbers.length >= 3) {
      formatted = numbers.slice(0, 2) + '/' + numbers.slice(2);
    }
    if (numbers.length >= 5) {
      formatted = numbers.slice(0, 2) + '/' + numbers.slice(2, 4) + '/' + numbers.slice(4, 8);
    }
    
    setEditBirthdate(formatted);
  };
  
  // Get full experience data for saved experiences from API
  const savedExperiences = experiences.filter(exp => savedExperienceIds.includes(exp.id));
  
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
  
  // Initialize edit states when modal opens
  useEffect(() => {
    if (showEditProfile && user) {
      setEditName(user.name || '');
      
      // Convert birthdate from YYYY-MM-DD to DD/MM/YYYY
      if (user.birthdate) {
        const [year, month, day] = user.birthdate.split('-');
        setEditBirthdate(`${day}/${month}/${year}`);
      } else {
        setEditBirthdate('');
      }
      
      setEditLocation(user.location || '');
      setEditAvatarIcon(user.avatarIcon || '🧑‍🚀');
    }
  }, [showEditProfile, user]);
  
  // Extract stats for display
  const { experiencesCompleted, citiesVisited, reviewsWritten } = userStats;
  
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

  // Handle quiz completion
  const handleQuizComplete = async (quizData: {
    favorite_categories: string[];
    preferences: Record<string, boolean>;
  }) => {
    try {
      console.log('📝 Starting to save quiz data...');
      console.log('📊 Quiz Data to save:', JSON.stringify(quizData, null, 2));
      console.log('📦 Categories:', quizData.favorite_categories);
      console.log('📦 Preferences count:', Object.keys(quizData.preferences).length);

      const result = await savePreferences(quizData);
      console.log('✅ Save response received:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('🎉 Successfully saved preferences to database!');
        await refreshPreferences(); // Refresh preferences in context
        setShowQuiz(false);
        Alert.alert(
          '🎉 Success!', 
          'Your preferences have been saved! We\'ll use them to personalize your experience.',
          [{ text: 'OK' }]
        );
      } else {
        console.error('❌ Save failed with error:', result.error);
        Alert.alert(
          '⚠️ Error', 
          `Failed to save preferences: ${result.error || 'Unknown error'}. Please try again.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('💥 Exception while saving quiz:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      Alert.alert(
        '💥 Error', 
        'Something went wrong while saving. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeleteAccount = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteAccount();
              if (result.success) {
                Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete account. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
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

  const handleSaveProfile = async (data: {
    name: string;
    birthdate?: string;
    location?: string;
    avatarIcon: string;
  }) => {
    try {
      // Validate name
      if (!data.name.trim()) {
        Alert.alert('Error', 'Name cannot be empty');
        return;
      }

      // Validate birthdate if provided
      if (data.birthdate) {
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = data.birthdate.match(dateRegex);
        
        if (!match) {
          Alert.alert('Error', 'Invalid date format. Please use DD/MM/YYYY');
          return;
        }

        const [, day, month, year] = match;
        const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Check if date is valid
        if (
          birthDate.getDate() !== parseInt(day) ||
          birthDate.getMonth() !== parseInt(month) - 1 ||
          birthDate.getFullYear() !== parseInt(year)
        ) {
          Alert.alert('Error', 'Invalid date');
          return;
        }

        // Check if user is at least 16 years old
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age < 16) {
          Alert.alert('Error', 'You must be at least 16 years old');
          return;
        }
      }

      const response = await api.updateProfile({
        name: data.name,
        birthdate: data.birthdate,
        location: data.location,
        avatarIcon: data.avatarIcon,
      });

      if (response.success) {
        // Refresh user data
        if (refreshUser) {
          await refreshUser();
        }
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  // Show login prompt when not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerLeft} />
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
          <View style={styles.headerLeft} />
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
            <Pressable style={styles.avatarContainer} onPress={() => setShowEditProfile(true)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>{user?.avatarIcon || '🧑‍🚀'}</Text>
              </View>
              <View style={styles.editIconBadge}>
                <Edit2 size={14} color={colors.dark.background} />
              </View>
            </Pressable>
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
                        source={{ uri: exp.images && exp.images.length > 0 ? exp.images[0] : exp.image }}
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

          {/* Preferences Quiz Card */}
          {!hasCompletedQuiz && (
            <Pressable 
              style={styles.quizCard}
              onPress={() => setShowQuiz(true)}
            >
              <Text style={styles.quizEmoji}>🎯</Text>
              <View style={styles.quizContent}>
                <Text style={styles.quizTitle}>Help us know you better</Text>
                <Text style={styles.quizSubtitle}>Take a quick quiz to personalize your feed</Text>
              </View>
            </Pressable>
          )}

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

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <KeyboardAvoidingView 
          style={[styles.editModalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.editModalHeader}>
            <Pressable onPress={() => setShowEditProfile(false)} style={styles.editCloseButton}>
              <Text style={styles.editCloseText}>✕</Text>
            </Pressable>
            <Text style={styles.editModalTitle}>Edit Profile</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView 
            style={styles.editScrollView}
            contentContainerStyle={[styles.editScrollContent, { paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          >
            {/* Avatar Selection */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionLabel}>Avatar</Text>
              <View style={styles.editIconGrid}>
                {['🧑‍🚀', '🏄‍♂️', '🧗‍♀️', '🚴‍♂️', '🏃‍♀️'].map((icon) => (
                  <Pressable
                    key={icon}
                    style={[
                      styles.editIconOption,
                      editAvatarIcon === icon && styles.editIconSelected,
                    ]}
                    onPress={() => setEditAvatarIcon(icon)}
                  >
                    <Text style={styles.editIconEmoji}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Form Fields */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionLabel}>Name *</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor={colors.dark.textSecondary}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editSectionLabel}>Date of Birth</Text>
              <TextInput
                style={styles.editInput}
                value={editBirthdate}
                onChangeText={handleBirthdateChange}
                placeholder="DD/MM/YYYY (16+ years)"
                placeholderTextColor={colors.dark.textSecondary}
                keyboardType="numeric"
                maxLength={10}
                returnKeyType="next"
              />
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editSectionLabel}>Location</Text>
              <TextInput
                style={styles.editInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="City, Country"
                placeholderTextColor={colors.dark.textSecondary}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>

            {/* Save Button */}
            <Pressable 
              style={styles.editSaveButton}
              onPress={async () => {
                try {
                  await handleSaveProfile({
                    name: editName,
                    avatarIcon: editAvatarIcon,
                    birthdate: editBirthdate,
                    location: editLocation,
                  });
                  setShowEditProfile(false);
                } catch (error) {
                  // Error is handled in handleSaveProfile
                }
              }}
            >
              <Text style={styles.editSaveButtonText}>Save Changes</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Preferences Quiz Modal */}
      <Modal
        visible={showQuiz}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PreferencesQuiz
          onComplete={handleQuizComplete}
          onClose={() => setShowQuiz(false)}
        />
      </Modal>

      {/* Quiz Suggestion Modal (for new signups) */}
      <QuizSuggestionModal
        visible={showQuizSuggestion}
        onClose={() => {
          setShowQuizSuggestion(false);
          clearNewSignupFlag();
        }}
        onStartQuiz={() => {
          setShowQuizSuggestion(false);
          clearNewSignupFlag();
          setShowQuiz(true);
        }}
        userName={user?.name}
      />

      {/* TODO: Fix EditProfileModal import issue */}
      {/* <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        currentName={user?.name || ''}
        currentAvatarIcon={user?.avatarIcon || '🧑‍🚀'}
        currentBirthdate={user?.birthdate}
        currentLocation={user?.location}
        onSave={handleSaveProfile}
      /> */}
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
  headerLeft: {
    width: 44,
    height: 44,
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
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.dark.background,
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
  // Quiz Card
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quizEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  quizContent: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 3,
  },
  quizSubtitle: {
    fontSize: 13,
    color: '#666666',
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
  // Edit Profile Modal
  editModalContainer: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContent: {
    backgroundColor: colors.dark.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark.text,
  },
  editCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCloseText: {
    fontSize: 18,
    color: colors.dark.textSecondary,
    fontWeight: '600',
  },
  editScrollView: {
    flex: 1,
  },
  editScrollContent: {
    padding: 20,
  },
  editSection: {
    marginBottom: 24,
  },
  editSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editIconGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  editIconOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dark.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  editIconSelected: {
    borderColor: colors.dark.primary,
    backgroundColor: `${colors.dark.primary}15`,
  },
  editIconEmoji: {
    fontSize: 28,
  },
  editInput: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
    minHeight: 52,
  },
  editSaveButton: {
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  editSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.background,
  },
});
