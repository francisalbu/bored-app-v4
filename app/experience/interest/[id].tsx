import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Check } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import apiService from '@/services/api';
import { type Experience } from '@/constants/experiences';

export default function InterestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch experience from API
  React.useEffect(() => {
    const fetchExperience = async () => {
      try {
        setLoading(true);
        const response = await apiService.getExperience(id);
        
        if (response.success && response.data) {
          const exp = response.data as any;
          const transformedExperience: Experience = {
            id: exp.id.toString(),
            title: exp.title,
            provider: exp.operator_name || 'Local Provider',
            providerLogo: exp.provider_logo || exp.operator_logo,
            rating: exp.rating || 0,
            reviewCount: exp.review_count || 0,
            location: exp.location,
            distance: exp.distance || '0km away',
            price: exp.price,
            currency: exp.currency || 'EUR',
            duration: exp.duration,
            category: exp.category || 'Experience',
            verified: exp.verified === 1 || exp.verified === true,
            instantBooking: exp.instant_booking === 1 || exp.instant_booking === true,
            availableToday: exp.available_today === 1 || exp.available_today === true,
            video: exp.video_url,
            image: exp.image_url,
            images: Array.isArray(exp.images) ? exp.images : (exp.images ? JSON.parse(exp.images) : []),
            highlights: Array.isArray(exp.highlights) ? exp.highlights : (exp.highlights ? JSON.parse(exp.highlights) : []),
            description: exp.description,
            included: Array.isArray(exp.included) ? exp.included : (exp.included ? JSON.parse(exp.included) : []),
            whatToBring: Array.isArray(exp.what_to_bring) ? exp.what_to_bring : (exp.what_to_bring ? JSON.parse(exp.what_to_bring) : []),
            meetingPoint: exp.meeting_point || exp.location,
            languages: Array.isArray(exp.languages) ? exp.languages : (exp.languages ? JSON.parse(exp.languages) : ['Portuguese', 'English']),
            cancellationPolicy: exp.cancellation_policy || 'Free cancellation',
            importantInfo: exp.important_info || '',
            tags: Array.isArray(exp.tags) ? exp.tags : (exp.tags ? JSON.parse(exp.tags) : []),
            maxGroupSize: exp.max_group_size,
            latitude: exp.latitude,
            longitude: exp.longitude,
          };
          
          setExperience(transformedExperience);
        }
      } catch (error) {
        console.error('❌ Error fetching experience:', error);
        Alert.alert('Error', 'Failed to load experience details');
      } finally {
        setLoading(false);
      }
    };

    fetchExperience();
  }, [id]);

  const handleSubmitInterest = async () => {
    // Validate name
    if (!name || name.trim().length === 0) {
      Alert.alert('Missing Information', 'Please enter your full name');
      return;
    }

    // Validate email
    if (!email || email.trim().length === 0) {
      Alert.alert('Missing Information', 'Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., name@example.com)');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await api.post('/interest', {
        experience_id: parseInt(id),
        name,
        email,
        phone,
        notes,
        user_id: user?.id || null,
      });

      if (response.success) {
        setSubmitted(true);
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to submit interest');
      }
    } catch (error) {
      console.error('❌ Error submitting interest:', error);
      Alert.alert(
        'Error',
        'Failed to submit your interest. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
      </View>
    );
  }

  if (!experience) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Experience not found</Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
        <View style={styles.successIcon}>
          <Check size={48} color="white" />
        </View>
        <Text style={styles.successTitle}>Interest Registered!</Text>
        <Text style={styles.successText}>
          We'll notify you as soon as this experience becomes available for booking.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Show Interest</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Experience Card */}
        <View style={styles.card}>
          <View style={styles.experienceHeader}>
            <Image
              source={
                experience.images && experience.images.length > 0
                  ? experience.images[0]
                  : { uri: experience.image }
              }
              style={styles.experienceImage}
              contentFit="cover"
            />
            <View style={styles.experienceInfo}>
              <Text style={styles.experienceTitle} numberOfLines={2}>
                {experience.title}
              </Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={colors.dark.primary} fill={colors.dark.primary} />
                <Text style={styles.ratingText}>
                  {experience.rating} ({experience.reviewCount})
                </Text>
              </View>
            </View>
          </View>

          {/* Coming Soon Box */}
          <View style={styles.comingSoonBox}>
            <Text style={styles.comingSoonTitle}>🎉 Coming Soon!</Text>
            <Text style={styles.comingSoonText}>
              This experience will be available for booking soon. Leave your details and we'll notify you when it's ready!
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Contact Information</Text>
          
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={colors.dark.textSecondary}
          />

          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.dark.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Phone (Optional)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+351 123 456 789"
            placeholderTextColor={colors.dark.textSecondary}
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any questions or special requests?"
            placeholderTextColor={colors.dark.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✨ By showing interest, you'll be among the first to know when this experience becomes available. We'll send you a notification via email.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.priceSection}>
          <Text style={styles.price}>
            {experience.currency}
            {experience.price}
          </Text>
          <Text style={styles.priceLabel}>estimated price</Text>
        </View>
        <Pressable 
          style={[
            styles.submitButton, 
            (submitting || !name.trim() || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitInterest}
          disabled={submitting || !name.trim() || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
        >
          {submitting ? (
            <ActivityIndicator color={colors.dark.background} />
          ) : (
            <Text style={styles.submitButtonText}>NOTIFY ME!</Text>
          )}
        </Pressable>
      </View>
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fonts.semibold,
    color: colors.dark.text,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 20,
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  experienceHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  experienceImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  experienceInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  experienceTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.semibold,
    color: colors.dark.text,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  comingSoonBox: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    marginTop: 8,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.extrabold,
    color: 'white',
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.fonts.semibold,
    color: colors.dark.text,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: typography.fonts.medium,
    color: colors.dark.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.dark.text,
    fontFamily: typography.fonts.regular,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  infoBox: {
    margin: 20,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  infoText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.dark.card,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  priceSection: {
    flex: 1,
  },
  price: {
    fontSize: 28,
    fontFamily: typography.fonts.extrabold,
    color: colors.dark.primary,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: typography.fonts.regular,
    color: colors.dark.textSecondary,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
  },
  submitButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#6B7280',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontFamily: typography.fonts.extrabold,
    letterSpacing: 0.5,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: typography.fonts.extrabold,
    color: colors.dark.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
  },
});
