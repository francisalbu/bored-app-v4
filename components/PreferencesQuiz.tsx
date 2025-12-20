import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Image,
  Alert,
  PanResponder,
} from 'react-native';
import { ArrowLeft, ArrowRight, X } from 'lucide-react-native';
import colors from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

const QUIZ_ACTIVITIES = [
  {
    id: 'shepherd',
    title: 'Back to Nature Experience',
    description: 'Disconnect from city life and connect with animals, farms and slow living',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/shepard.avif',
    tag: 'roots',
  },
  {
    id: 'water',
    title: 'Water Sports Adventure',
    description: 'Get on the water - surf, paddleboard, kayak or sail through waves and coastlines',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/water.jpg',
    tag: 'water_sports',
  },
  {
    id: 'dinner',
    title: 'Secret Dinner with Strangers',
    description: 'Share stories and authentic meals with locals and travelers in unique hidden spots',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/timelet.jpeg',
    tag: 'foodie_underground',
  },
  {
    id: 'tile',
    title: 'Creative DIY Workshop',
    description: 'Make something with your hands - from pottery to painting, woodwork to crafts',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/tile.webp',
    tag: 'skill_craft',
  },
  {
    id: 'sunset',
    title: 'Sunset & Wine Tasting',
    description: 'Sip wine and watch golden hour paint the sky from scenic viewpoints and vineyards',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/sunset.jpg',
    tag: 'aesthetic',
  },
  {
    id: 'cliff',
    title: 'Cliff Jumping Thrill',
    description: 'Leap from cliffs and rocks into deep water - adrenaline rush and natural pools',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/cliff%20jumping.jpg',
    tag: 'adrenaline',
  },
  {
    id: 'caves',
    title: 'Underground Cave Exploration',
    description: 'Discover hidden caverns, ancient formations and underground mysteries',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/caves.avif',
    tag: 'dark_mystery',
  },
  {
    id: 'street_art',
    title: 'Urban Culture & Street Vibes',
    description: 'Explore underground art scenes, graffiti spots and the citys raw creative side',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/arttour.jpg',
    tag: 'urban_cool',
  },
  {
    id: 'local_food',
    title: 'Hidden Food Gems',
    description: 'Discover authentic street food and hole-in-the-wall spots locals actually eat at',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/alfredo.jpg',
    tag: 'foodie_underground',
  },
  {
    id: 'exploration',
    title: 'Multi-Day Wild Exploration',
    description: 'Off-grid camping adventures, backcountry hiking and discovering hidden wilderness',
    image: 'https://storage.googleapis.com/bored_tourist_media/images/Quizz/WFJBpzs4J5x3uvbeKdnm3i.jpg',
    tag: 'adrenaline',
  },
];

const CATEGORIES = [
  { id: 'local_cooking', label: 'Local Cooking', emoji: '🔍' },
  { id: 'culture_dive', label: 'Culture Dive', emoji: '🎭' },
  { id: 'outdoors', label: 'Outdoors', emoji: '🏔️' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'micro_adventures', label: 'Micro Adventures', emoji: '🗺️' },
  { id: 'night_explorer', label: 'Night Explorer', emoji: '🌙' },
  { id: 'mind_body', label: 'Mind & Body', emoji: '🧘' },
  { id: 'learn_create', label: 'Learn & Create', emoji: '🎨' },
  { id: 'time_stories', label: 'Time Stories', emoji: '📖' },
];

interface PreferencesQuizProps {
  onComplete: (data: { favorite_categories: string[]; preferences: Record<string, boolean> }) => void;
  onClose: () => void;
}

export default function PreferencesQuiz({ onComplete, onClose }: PreferencesQuizProps) {
  const [step, setStep] = useState<'categories' | 'activities'>('categories');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [swipedActivities, setSwipedActivities] = useState<Record<string, boolean>>({});
  const [position] = useState(new Animated.ValueXY());
  const [opacity] = useState(new Animated.Value(1));
  const [rotation] = useState(new Animated.Value(0));
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentActivity = QUIZ_ACTIVITIES[currentActivityIndex];
  const isLastActivity = currentActivityIndex === QUIZ_ACTIVITIES.length - 1;
  const progress = ((currentActivityIndex + 1) / QUIZ_ACTIVITIES.length) * 100;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isTransitioning,
    onPanResponderMove: (_, gesture) => {
      if (isTransitioning) return;
      position.setValue({ x: gesture.dx, y: gesture.dy });
      rotation.setValue(gesture.dx / 10);
    },
    onPanResponderRelease: (_, gesture) => {
      if (isTransitioning) return;
      if (gesture.dx > SWIPE_THRESHOLD) {
        handleSwipe('right');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        handleSwipe('left');
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
        Animated.spring(rotation, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleBack = () => {
    if (currentActivityIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      
      // Fade out current card
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          // Go back
          setCurrentActivityIndex((prev) => prev - 1);
          
          // Reset transforms
          position.setValue({ x: 0, y: 0 });
          rotation.setValue(0);
          opacity.setValue(0);
          
          setTimeout(() => {
            // Fade in
            Animated.timing(opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start(() => {
              setIsTransitioning(false);
            });
          }, 50);
        }, 100);
      });
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    const toValue = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    
    // Animate card out
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: toValue, y: 0 },
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Save the preference
      const newPreference = { [currentActivity.tag]: direction === 'right' };
      console.log(`💾 Saving preference: ${currentActivity.tag} = ${direction === 'right' ? '✅ YES' : '❌ NO'}`);
      
      const updatedActivities = {
        ...swipedActivities,
        ...newPreference,
      };
      
      setSwipedActivities(updatedActivities);

      if (isLastActivity) {
        console.log('🎉 LAST ACTIVITY! Activity index:', currentActivityIndex, '- Finishing quiz...');
        console.log('📦 Final swiped activities:', updatedActivities);
        // Pass the updated activities directly to avoid state timing issues
        setTimeout(() => {
          handleFinish(updatedActivities);
        }, 100);
        setIsTransitioning(false);
      } else {
        // Wait a bit, then change index (key will force remount with fresh animations)
        setTimeout(() => {
          setCurrentActivityIndex((prev) => prev + 1);
          // Reset values for new card
          position.setValue({ x: 0, y: 0 });
          rotation.setValue(0);
          opacity.setValue(0);
          
          // Short delay then fade in
          setTimeout(() => {
            Animated.timing(opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start(() => {
              setIsTransitioning(false);
            });
          }, 50);
        }, 100);
      }
    });
  };

  const handleFinish = (finalSwipedActivities?: Record<string, boolean>) => {
    console.log('🏁 Quiz finished! Processing results...');
    
    if (selectedCategories.length === 0) {
      console.log('⚠️ No categories selected!');
      Alert.alert('Almost there!', 'Please select at least one category');
      return;
    }

    // Use the passed activities if provided, otherwise use state
    const activitiesToSave = finalSwipedActivities || swipedActivities;

    const preferences: Record<string, boolean> = {};
    QUIZ_ACTIVITIES.forEach((activity) => {
      preferences[activity.tag] = activitiesToSave[activity.tag] || false;
    });

    const quizData = {
      favorite_categories: selectedCategories,
      preferences,
    };

    console.log('📊 Quiz Results:');
    console.log('  Selected Categories:', selectedCategories);
    console.log('  Preferences:', preferences);
    console.log('  Total activities swiped:', Object.keys(activitiesToSave).length);
    console.log('🚀 Calling onComplete with data:', JSON.stringify(quizData, null, 2));

    onComplete(quizData);
  };

  if (step === 'categories') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBackButton}>
            <ArrowLeft size={24} color={colors.dark.text} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>What are you into?</Text>
            <Text style={styles.subtitle}>
              This helps us get to know your style. We'll focus on these interests, but you'll still see a mix of everything else.
            </Text>
          </View>
        </View>

        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategories.includes(category.id) && styles.categoryCardSelected,
              ]}
              onPress={() => toggleCategory(category.id)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  selectedCategories.includes(category.id) && styles.categoryLabelSelected,
                ]}
              >
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.nextButton,
              selectedCategories.length === 0 && styles.nextButtonDisabled,
            ]}
            onPress={() => setStep('activities')}
            disabled={selectedCategories.length === 0}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <ArrowRight size={20} color={colors.dark.background} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.swipeHeader}>
        {currentActivityIndex > 0 && (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.dark.text} />
          </Pressable>
        )}
        <View style={styles.progressContainer}>
          <Text style={styles.swipeProgress}>
            {currentActivityIndex + 1} / {QUIZ_ACTIVITIES.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.dark.text} />
        </Pressable>
      </View>

      <View style={styles.swipeTitleContainer}>
        <Text style={styles.swipeTitle}>Like it or leave it?</Text>
        <Text style={styles.swipeSubtitle}>Swipe right for Yes, left for No</Text>
      </View>

      <View style={styles.cardContainer}>
        <Animated.View
          key={currentActivityIndex}
          {...panResponder.panHandlers}
          style={[
            styles.card,
            {
              transform: [
                ...position.getTranslateTransform(),
                {
                  rotate: rotation.interpolate({
                    inputRange: [-200, 0, 200],
                    outputRange: ['-30deg', '0deg', '30deg'],
                  }),
                },
              ],
              opacity,
            },
          ]}
        >
          <Image source={{ uri: currentActivity.image }} style={styles.cardImage} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{currentActivity.title}</Text>
            <Text style={styles.cardDescription}>{currentActivity.description}</Text>
          </View>
        </Animated.View>
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
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerBackButton: {
    padding: 4,
    marginTop: 6,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark.textSecondary,
  },
  categoriesGrid: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
    gap: 8,
  },
  categoryCard: {
    width: '47%',
    height: 80,
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardSelected: {
    borderColor: colors.dark.primary,
    backgroundColor: `${colors.dark.primary}15`,
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.text,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: colors.dark.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.background,
  },
  swipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
  },
  swipeProgress: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.text,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.dark.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.dark.primary,
  },
  closeButton: {
    padding: 8,
  },
  swipeTitleContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  swipeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.dark.text,
    marginBottom: 4,
  },
  swipeSubtitle: {
    fontSize: 13,
    color: colors.dark.textSecondary,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.68,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.dark.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  cardImage: {
    width: '100%',
    height: '75%',
    backgroundColor: colors.dark.backgroundSecondary,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark.text,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.dark.textSecondary,
  },
});
