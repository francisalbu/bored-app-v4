import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  Pressable,
  ViewToken,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Background video URL (using a sample video)
const BACKGROUND_VIDEO = 'https://xjwlmofgfwlrwwlrudda.supabase.co/storage/v1/object/public/experience-videos/lisbon-tuk-tuk-tour.mp4';

interface OnboardingScreenProps {
  onComplete: () => void;
  onShowImportTutorial?: () => void;
}

const slides = [
  {
    id: '1',
    emoji: '☝️',
    title: 'Swipe up to see\nmore experiences',
    subtitle: 'Discover amazing activities near you',
  },
  {
    id: '2',
    emoji: '👆',
    title: 'Tap to see details\n& book instantly',
    subtitle: 'Quick and easy booking process',
  },
  {
    id: '3',
    emoji: '🔗',
    title: 'Paste Instagram or\nTikTok links',
    subtitle: 'Transform social media into real experiences',
  },
];

export default function OnboardingScreen({ onComplete, onShowImportTutorial }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const handAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    startAnimation();
    return () => {
      if (animRef.current) {
        animRef.current.stop();
      }
    };
  }, [currentIndex]);

  const startAnimation = () => {
    if (animRef.current) {
      animRef.current.stop();
    }
    handAnim.setValue(0);
    
    if (currentIndex === 0) {
      // Swipe animation - move up
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(handAnim, {
            toValue: -40,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(handAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    } else if (currentIndex === 1) {
      // Tap animation - scale
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(handAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(handAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    } else {
      // Link/Pulse animation - scale pulse
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(handAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(handAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
    }
    animRef.current.start();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      onComplete();
    }
  };

  const renderSlide = ({ item, index }: { item: typeof slides[0]; index: number }) => {
    const isSwipe = index === 0;
    const isTap = index === 1;
    const isLink = index === 2;
    
    // Determine animation style based on slide type
    const getAnimationStyle = () => {
      if (currentIndex !== index) {
        return {};
      }
      
      if (isSwipe) {
        return { transform: [{ translateY: handAnim }] };
      } else if (isTap) {
        return { 
          transform: [{ 
            scale: handAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.85],
            })
          }] 
        };
      } else if (isLink) {
        return { 
          transform: [{ 
            scale: handAnim.interpolate({
              inputRange: [1, 1.2],
              outputRange: [1, 1.15],
            })
          }] 
        };
      }
      return {};
    };
    
    return (
      <View style={styles.slide}>
        <View style={styles.emojiContainer}>
          {isLink ? (
            <Animated.View style={[styles.iconContainer, getAnimationStyle()]}>
              <Image 
                source={require('@/assets/images/icons.png')} 
                style={styles.importIcon}
                resizeMode="contain"
              />
            </Animated.View>
          ) : (
            <Animated.Text 
              style={[
                styles.emoji,
                getAnimationStyle(),
              ]}
            >
              {item.emoji}
            </Animated.Text>
          )}
        </View>
        
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        
        {/* Show "See How" button only on the third slide */}
        {isLink && onShowImportTutorial && (
          <Pressable style={styles.seeHowButton} onPress={onShowImportTutorial}>
            <Text style={styles.seeHowButtonText}>See How</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Video */}
      <Video
        source={{ uri: BACKGROUND_VIDEO }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      
      {/* Blur overlay */}
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Dark overlay for better text visibility */}
      <View style={styles.darkOverlay} />
      
      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
        />
        
        {/* Bottom section */}
        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
          {/* Dots */}
          <View style={styles.dotsContainer}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index && styles.dotActive,
                ]}
              />
            ))}
          </View>
          
          {/* Button */}
          <Pressable style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>
              {currentIndex === slides.length - 1 ? 'Explore Experiences' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emojiContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importIcon: {
    width: 120,
    height: 120,
  },
  emoji: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  seeHowButton: {
    marginTop: 30,
    backgroundColor: 'rgba(191, 255, 0, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#BFFF00',
  },
  seeHowButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#BFFF00',
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
  },
});
