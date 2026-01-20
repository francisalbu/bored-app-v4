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
import { X, MapPin, Star, Check, CheckCircle, Circle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';
import colors from '@/constants/colors';
import api from '@/services/api';

interface POI {
  place_id: string;
  spot_name: string;
  location_full: string;
  city: string;
  country: string;
  coordinates: { latitude: number; longitude: number };
  rating?: number;
  user_ratings_total?: number;
  photo_url?: string; // Google Places photo
  thumbnail?: string;
  website?: string;
  phone?: string;
  description?: string;
  types?: string[]; // Google Places types
  opening_hours?: any;
  instagram_url: string;
  activity: string;
  isActivity?: boolean; // NEW: activity vs place classification
}

export default function SpotResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  // Parse the data from params
  const location = params.location as string;
  const activity = params.activity as string;
  const confidence = parseFloat(params.confidence as string);
  const instagramUrl = params.instagramUrl as string;
  const thumbnailUrl = params.thumbnailUrl as string;
  const poisJson = params.pois as string;
  
  const allPOIs: POI[] = poisJson ? JSON.parse(poisJson) : [];
  
  console.log('📍 Received POIs:', allPOIs.length);
  
  const [selectedPOIs, setSelectedPOIs] = useState<Set<string>>(new Set(allPOIs.map(p => p.place_id)));
  const [isSaving, setIsSaving] = useState(false);
  
  const togglePOI = (placeId: string) => {
    setSelectedPOIs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };

  const handleSaveSpots = async () => {
    const selectedPOIsList = allPOIs.filter(poi => selectedPOIs.has(poi.place_id));
    
    if (selectedPOIsList.length === 0) {
      Alert.alert('No POIs Selected', 'Please select at least one location to save');
      return;
    }
    
    try {
      setIsSaving(true);
      
      console.log(`💾 Saving ${selectedPOIsList.length} spots...`);
      
      const savePromises = selectedPOIsList.map(poi => {
        const spotData = {
          user_id: user?.id,
          spot_name: poi.spot_name,
          activity: poi.activity || 'sightseeing',
          location_full: poi.location_full,
          country: poi.country,
          city: poi.city,
          latitude: poi.coordinates.latitude,
          longitude: poi.coordinates.longitude,
          confidence_score: confidence,
          instagram_url: instagramUrl || null,
          thumbnail_url: thumbnailUrl || null,
          google_photo_url: poi.photo_url, // Google Places photo
          // Google Places metadata
          place_id: poi.place_id,
          rating: poi.rating,
          user_ratings_total: poi.user_ratings_total,
          website: poi.website,
          phone: poi.phone,
          description: poi.description,
          google_types: poi.types,
          opening_hours: poi.opening_hours,
          activities: [{
            title: `Visit ${poi.spot_name}`,
            description: poi.description || `Explore ${poi.spot_name}`,
            category: 'sightseeing',
            difficulty: 'easy',
            duration: '1-2 hours',
            why_not_boring: `${poi.spot_name} is a must-see attraction!`
          }]
        };
        return api.saveSpot(spotData);
      });

      const results = await Promise.all(savePromises);
      
      const successCount = results.filter(r => r.success).length;
      
      if (successCount > 0) {
        Alert.alert(
          'Success!', 
          `${successCount} location${successCount > 1 ? 's' : ''} added to your map`,
          [{
            text: 'View on Map',
            onPress: () => router.replace('/(tabs)/map'),
          }]
        );
      } else {
        Alert.alert('Error', 'Failed to save spots');
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error saving spots:', error);
      Alert.alert('Error', `Failed to save spots: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        {thumbnailUrl ? (
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
          <Text style={styles.sourceTitle} numberOfLines={2}>{location}</Text>
          <View style={styles.instagramBadge}>
            <Text style={styles.instagramText}>📷 Saved from Instagram</Text>
          </View>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Select locations to add ({selectedPOIs.size} of {allPOIs.length})
      </Text>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {allPOIs.map((poi, index) => {
          const isSelected = selectedPOIs.has(poi.place_id);
          
          return (
            <Pressable
              key={poi.place_id}
              style={[styles.poiCard, isSelected && styles.poiCardSelected]}
              onPress={() => togglePOI(poi.place_id)}
            >
              {/* Checkbox */}
              <View style={styles.checkbox}>
                {isSelected ? (
                  <CheckCircle size={24} color="#000" fill="#000" />
                ) : (
                  <Circle size={24} color="#ccc" />
                )}
              </View>
              
              {/* Google Places Photo Thumbnail */}
              {poi.photo_url ? (
                <Image
                  source={{ uri: poi.photo_url }}
                  style={styles.poiThumbnail}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.poiThumbnail, styles.poiThumbnailPlaceholder]}>
                  <MapPin size={24} color="#999" />
                </View>
              )}
              
              {/* POI Info */}
              <View style={styles.poiInfo}>
                <Text style={styles.poiName}>{poi.spot_name}</Text>
                
                {/* Description */}
                {poi.description && (
                  <Text style={styles.poiDescription} numberOfLines={3}>
                    {poi.description}
                  </Text>
                )}
                
                {/* Activity Detection - if this is an experience/activity */}
                {poi.isActivity && (
                  <View style={styles.activitySection}>
                    <Text style={styles.activityDetectedText}>
                      We detected <Text style={styles.activityName}>{poi.activity}</Text> in this reel!
                    </Text>
                    <Pressable 
                      style={styles.activityButton}
                      onPress={(e) => {
                        e.stopPropagation(); // Prevent card selection
                        router.push(`/find-activity?activity=${encodeURIComponent(poi.activity)}`);
                      }}
                    >
                      <Text style={styles.activityButtonText}>🔍 Find this activity in my city</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.saveButtonContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          style={[styles.saveButton, (isSaving || selectedPOIs.size === 0) && styles.saveButtonDisabled]}
          onPress={handleSaveSpots}
          disabled={isSaving || selectedPOIs.size === 0}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              Save {selectedPOIs.size} Location{selectedPOIs.size !== 1 ? 's' : ''} to Map
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
  subtitle: {
    fontSize: 14,
    color: '#888',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  poiCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 2,
    alignItems: 'flex-start',
  },
  poiCardSelected: {
    backgroundColor: '#F8F8F8',
  },
  checkbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  poiThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  poiThumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiInfo: {
    flex: 1,
  },
  poiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  poiDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  activitySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  activityDetectedText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  activityName: {
    fontWeight: '700',
    color: '#000',
  },
  activityButton: {
    marginTop: 0,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.dark.primary, // Yellow/lime for attention (#CFFF04)
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  activityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000', // Black text on yellow
    textAlign: 'center',
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
