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
  Platform,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Linking from 'expo-linking';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImportTutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

// Tutorial slides with video demonstrations
const slides = [
  {
    id: '1',
    type: 'intro',
    emoji: '📱',
    title: 'save spots from\nreels and tiktoks',
    subtitle: 'Turn your social media discoveries into real experiences',
    buttonText: 'continue to setup',
  },
  {
    id: '2',
    type: 'setup',
    title: 'set up sharing',
    subtitle: 'Add Bored Tourist to your share options',
    instruction: 'When you find a reel or tiktok about a place you want to visit, tap the share button',
    buttonText: 'start setup',
  },
  {
    id: '3',
    type: 'add-app',
    title: 'add to share sheet',
    subtitle: 'Enable Bored Tourist in your share options',
    steps: [
      '1. Open Instagram or TikTok',
      '2. Find a post about a place',
      '3. Tap the share button',
      '4. Scroll right and tap "More"',
      '5. Enable "Bored Tourist"',
    ],
    buttonText: 'open instagram',
  },
  {
    id: '4',
    type: 'success',
    emoji: '📍',
    title: 'success!',
    subtitle: 'scroll. spot. save.\nright from your feed',
    buttonText: 'done',
  },
];

export default function ImportTutorialModal({ visible, onClose }: ImportTutorialModalProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    const slide = slides[currentIndex];
    
    if (currentIndex === slides.length - 1) {
      // Last slide - close modal
      onClose();
    } else if (slide.id === '3') {
      // Open Instagram when on the "add to share sheet" slide
      Linking.openURL('instagram://app').catch(() => {
        // If Instagram app is not installed, open App Store or web
        Linking.openURL('https://instagram.com');
      });
      // Move to success slide
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const renderIntroSlide = (item: typeof slides[0]) => (
    <View style={styles.slide}>
      <View style={styles.introContent}>
        {item.id === '1' ? (
          <Image 
            source={require('@/assets/images/icons.png')} 
            style={styles.socialIcons}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.introEmoji}>{item.emoji}</Text>
        )}
        <Text style={styles.introTitle}>{item.title}</Text>
        <Text style={styles.introSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const renderSetupSlide = (item: typeof slides[0]) => (
    <View style={styles.slide}>
      <View style={styles.setupContent}>
        <Text style={styles.setupTitle}>{item.title}</Text>
        
        {/* Mock Instagram share sheet preview */}
        <View style={styles.mockShareSheet}>
          <View style={styles.mockShareSheetHeader}>
            <View style={styles.mockPostPreview}>
              <View style={styles.mockPostImage} />
              <View style={styles.mockPostInfo}>
                <Text style={styles.mockPostTitle}>Reel from @thecornerapp</Text>
                <Text style={styles.mockPostSubtitle}>instagram.com</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.mockContactRow}>
            <View style={styles.mockContact}>
              <View style={[styles.mockContactAvatar, { backgroundColor: '#E4405F' }]} />
              <Text style={styles.mockContactName}>Eliza</Text>
            </View>
            <View style={styles.mockContact}>
              <View style={[styles.mockContactAvatar, { backgroundColor: '#1DA1F2' }]} />
              <Text style={styles.mockContactName}>Alex</Text>
            </View>
            <View style={styles.mockContact}>
              <View style={[styles.mockContactAvatar, { backgroundColor: '#25D366' }]} />
              <Text style={styles.mockContactName}>Martina</Text>
            </View>
            <View style={styles.mockContact}>
              <View style={[styles.mockContactAvatar, { backgroundColor: '#FF6B35' }]} />
              <Text style={styles.mockContactName}>Sreya</Text>
            </View>
          </View>
          
          <View style={styles.mockAppsRow}>
            <View style={styles.mockApp}>
              <View style={[styles.mockAppIcon, { backgroundColor: '#FFCD00' }]}>
                <Text style={styles.mockAppEmoji}>📝</Text>
              </View>
              <Text style={styles.mockAppName}>Notes</Text>
            </View>
            <View style={styles.mockApp}>
              <View style={[styles.mockAppIcon, { backgroundColor: '#4A90D9' }]}>
                <Text style={styles.mockAppEmoji}>📋</Text>
              </View>
              <Text style={styles.mockAppName}>Reminders</Text>
            </View>
            <View style={styles.mockApp}>
              <View style={[styles.mockAppIcon, { backgroundColor: '#FF2D55' }]}>
                <Text style={styles.mockAppEmoji}>📔</Text>
              </View>
              <Text style={styles.mockAppName}>Journal</Text>
            </View>
            <View style={[styles.mockApp, styles.mockAppHighlighted]}>
              <View style={[styles.mockAppIcon, { backgroundColor: '#FF6B35' }]}>
                <Text style={styles.mockAppEmoji}>🎉</Text>
              </View>
              <Text style={styles.mockAppName}>Bored</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.setupSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const renderAddAppSlide = (item: typeof slides[0]) => (
    <View style={styles.slide}>
      <View style={styles.addAppContent}>
        <Text style={styles.addAppTitle}>{item.title}</Text>
        
        <View style={styles.stepsContainer}>
          {item.steps?.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
        
        {/* Visual guide for iOS share sheet */}
        <View style={styles.iosShareGuide}>
          <View style={styles.iosShareGuideHeader}>
            <Text style={styles.iosShareGuideTitle}>Apps</Text>
            <Text style={styles.iosShareGuideDone}>Done</Text>
          </View>
          
          <View style={styles.iosSuggestionRow}>
            <View style={styles.iosSuggestionItem}>
              <View style={styles.iosAddButton}>
                <Text style={styles.iosAddButtonText}>+</Text>
              </View>
              <View style={[styles.iosSuggestionIcon, { backgroundColor: '#FF6B35' }]}>
                <Text style={styles.iosSuggestionEmoji}>🎉</Text>
              </View>
              <Text style={styles.iosSuggestionName}>Bored Tourist</Text>
              <View style={styles.iosToggle}>
                <View style={styles.iosToggleKnob} />
              </View>
            </View>
          </View>
        </View>
        
        <Text style={styles.addAppSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const renderSuccessSlide = (item: typeof slides[0]) => (
    <View style={styles.slide}>
      <View style={styles.successContent}>
        <Text style={styles.successTitle}>{item.title}</Text>
        <Text style={styles.successSubtitle}>{item.subtitle} {item.emoji}</Text>
      </View>
    </View>
  );

  const renderSlide = ({ item, index }: { item: typeof slides[0]; index: number }) => {
    switch (item.type) {
      case 'intro':
        return renderIntroSlide(item);
      case 'setup':
        return renderSetupSlide(item);
      case 'add-app':
        return renderAddAppSlide(item);
      case 'success':
        return renderSuccessSlide(item);
      default:
        return renderIntroSlide(item);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Background */}
        <View style={styles.background} />
        
        {/* Close button */}
        <Pressable 
          style={[styles.closeButton, { top: insets.top + 16 }]} 
          onPress={handleClose}
        >
          <X size={24} color="#333" />
        </Pressable>
        
        {/* Content */}
        <View style={[styles.content, { paddingTop: 60 }]}>
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
            scrollEnabled={true}
          />
          
          {/* Bottom section */}
          <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 40 }]}>
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
                {slides[currentIndex].buttonText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  
  // Intro slide styles
  introContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcons: {
    width: 150,
    height: 150,
    marginBottom: 32,
  },
  introEmoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  introTitle: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  introSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  
  // Setup slide styles
  setupContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 32,
  },
  setupSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
  },
  
  // Mock share sheet
  mockShareSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  mockShareSheetHeader: {
    marginBottom: 16,
  },
  mockPostPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
  },
  mockPostImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E4405F',
  },
  mockPostInfo: {
    marginLeft: 12,
    flex: 1,
  },
  mockPostTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  mockPostSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  mockContactRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  mockContact: {
    alignItems: 'center',
  },
  mockContactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
  },
  mockContactName: {
    fontSize: 11,
    color: '#666',
  },
  mockAppsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
  },
  mockApp: {
    alignItems: 'center',
  },
  mockAppHighlighted: {
    transform: [{ scale: 1.1 }],
  },
  mockAppIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mockAppEmoji: {
    fontSize: 24,
  },
  mockAppName: {
    fontSize: 11,
    color: '#666',
  },
  
  // Add app slide styles
  addAppContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  addAppTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 24,
  },
  addAppSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  stepText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  
  // iOS share guide
  iosShareGuide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iosShareGuideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iosShareGuideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  iosShareGuideDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  iosSuggestionRow: {
    paddingVertical: 8,
  },
  iosSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iosAddButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iosAddButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  iosSuggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iosSuggestionEmoji: {
    fontSize: 20,
  },
  iosSuggestionName: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
  },
  iosToggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  iosToggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    marginLeft: 'auto',
  },
  
  // Success slide styles
  successContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 36,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 24,
  },
  successSubtitle: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FF6B35',
    textAlign: 'center',
    lineHeight: 34,
  },
  
  // Bottom section
  bottomSection: {
    paddingHorizontal: 24,
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
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#1a1a2e',
    width: 24,
  },
  button: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
