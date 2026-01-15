import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Star, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';
import colors from '@/constants/colors';
import api from '@/services/api';

interface Activity {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  why_not_boring: string;
}

export default function SpotResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  // Parse the data from params
  const spotName = params.spotName as string;
  const activity = params.activity as string;
  const location = params.location as string;
  const country = params.country as string;
  const confidence = parseFloat(params.confidence as string);
  const latitude = parseFloat(params.latitude as string);
  const longitude = parseFloat(params.longitude as string);
  const instagramUrl = params.instagramUrl as string;
  const thumbnailUrl = params.thumbnailUrl as string;
  const activitiesJson = params.activities as string;
  
  const activities: Activity[] = activitiesJson ? JSON.parse(activitiesJson) : [];
  
  // Debug: Log the thumbnail URL received
  console.log('📸 Thumbnail URL received in spot-result:', thumbnailUrl);
  console.log('📸 Instagram URL:', instagramUrl);
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSpot = async () => {
    try {
      setIsSaving(true);
      
      const spotData = {
        user_id: user?.id,
        spot_name: spotName,
        activity: activity,
        location_full: location,
        country: country,
        region: location?.split(',')[0]?.trim() || null,
        latitude: latitude,
        longitude: longitude,
        activities: activities.map((act) => ({
          title: act.title,
          description: act.description,
          category: act.category || 'experience',
          difficulty: act.difficulty || '',
          duration: act.duration || '',
          why_not_boring: act.why_not_boring || ''
        })),
        confidence_score: confidence,
        instagram_url: instagramUrl,
        thumbnail_url: thumbnailUrl || null,
      };

      console.log('💾 Saving spot:', spotData);

      const result = await api.saveSpot(spotData);

      if (result.success) {
        Alert.alert('Success!', `${spotName} added to your map`, [
          {
            text: 'View on Map',
            onPress: () => router.replace('/(tabs)/map'),
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to save spot');
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error saving spot:', error);
      Alert.alert('Error', `Failed to save spot: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSaving(false);
    }
  };

  const getCategoryEmoji = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('food') || categoryLower.includes('restaurant')) return '🍽️';
    if (categoryLower.includes('hike') || categoryLower.includes('trail')) return '🥾';
    if (categoryLower.includes('surf')) return '🏄';
    if (categoryLower.includes('dive') || categoryLower.includes('snorkel')) return '🤿';
    if (categoryLower.includes('museum') || categoryLower.includes('culture')) return '🏛️';
    if (categoryLower.includes('beach')) return '🏖️';
    if (categoryLower.includes('view') || categoryLower.includes('viewpoint')) return '🌅';
    return '✨';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Import Locations</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#000" />
        </Pressable>
      </View>

      {/* Instagram Source */}
      <View style={styles.instagramSource}>
        {thumbnailUrl && thumbnailUrl !== 'https://via.placeholder.com/800x400' ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnailImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailPlaceholderText}>📸</Text>
          </View>
        )}
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceTitle} numberOfLines={2}>{spotName}</Text>
          <View style={styles.instagramBadge}>
            <Text style={styles.instagramText}>📷 Saved from Instagram →</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Only 3 Activities */}
        {activities.slice(0, 3).map((activity, index) => {
          console.log(`🎨 Activity ${index + 1}:`, activity.title);
          console.log(`🖼️ Image URL:`, activity.image);
          console.log(`📦 Has image:`, !!activity.image);
          console.log(`🚫 Is placeholder:`, activity.image?.includes('placeholder'));
          
          const hasValidImage = activity.image && 
                               typeof activity.image === 'string' && 
                               activity.image.length > 0 &&
                               !activity.image.includes('placeholder');
          
          return (
            <View key={index} style={styles.activityCard}>
              <View style={styles.activityNumber}>
                <Text style={styles.activityNumberText}>{index + 1}.</Text>
              </View>
              {hasValidImage ? (
                <Image
                  source={{ uri: activity.image }}
                  style={[styles.activityThumbnail, { backgroundColor: '#f0f0f0' }]}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.activityThumbnail}>
                  <Text style={styles.activityEmoji}>{getCategoryEmoji(activity.category)}</Text>
                </View>
              )}
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDescription} numberOfLines={2}>
                  {activity.description}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button - ALWAYS VISIBLE */}
      <View style={[styles.saveButtonContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveSpot}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              💾 Save Spot
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instagramSource: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 2,
    alignItems: 'center',
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 32,
  },
  sourceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  instagramBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instagramText: {
    fontSize: 13,
    color: '#888',
  },
  scrollView: {
    flex: 1,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 2,
  },
  locationNumber: {
    width: 32,
    marginRight: 8,
  },
  locationNumberText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  locationPin: {
    width: 56,
    height: 56,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  locationSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  checkmarkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 2,
  },
  activityNumber: {
    width: 32,
    marginRight: 8,
  },
  activityNumberText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  activityThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 28,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
