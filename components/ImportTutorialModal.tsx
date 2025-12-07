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
  Share,
  ActivityIndicator,
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
    title: 'Turn reels and tiktoks\ninto experiences',
    subtitle: '',
    videoUrl: 'https://storage.googleapis.com/bored_tourist_media/Tutorials/example1.mov',
    buttonText: "Let's set it up",
  },
  {
    id: '2',
    type: 'setup',
    title: 'Set it up',
    subtitle: 'Add Bored Tourist to your share options',
    instruction: 'When you find a reel or tiktok about a place you want to visit, tap the share button',
    videoUrl: 'https://storage.googleapis.com/bored_tourist_media/Tutorials/example3.mp4',
    buttonText: 'Start',
  },
  {
    id: '3',
    type: 'success',
    emoji: '🎉',
    title: 'You are ready to go!',
    buttonText: 'Start exploring',
  },
];

export default function ImportTutorialModal({ visible, onClose }: ImportTutorialModalProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showTryAgain, setShowTryAgain] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const videoSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setVideoLoaded(false);
      setShareModalOpen(false);
      setShowTryAgain(false);
      videoSlideAnim.setValue(0);
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

  const openNativeShareSheet = async () => {
    try {
      // Animate video up first
      setShareModalOpen(true);
      setShowTryAgain(false);
      Animated.timing(videoSlideAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Open native iOS share sheet
      const result = await Share.share({
        message: 'Check out this place!',
        url: 'https://instagram.com/p/example',
      });

      if (result.action === Share.dismissedAction) {
        // User dismissed the share sheet - show continue and try again buttons
        setShowTryAgain(true);
        // Keep video up, don't animate down
      } else if (result.action === Share.sharedAction) {
        // User shared - go to final slide (success)
        setShareModalOpen(false);
        setShowTryAgain(false);
        videoSlideAnim.setValue(0);
        // Go to the last slide (success - id '4')
        flatListRef.current?.scrollToIndex({ index: slides.length - 1, animated: true });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleNext = () => {
    const slide = slides[currentIndex];
    
    if (currentIndex === slides.length - 1) {
      // Last slide - close modal
      onClose();
    } else if (slide.id === '2' && !shareModalOpen && !showTryAgain) {
      // On setup slide - open native share sheet
      openNativeShareSheet();
    } else if (slide.id === '2' && showTryAgain) {
      // User dismissed share and clicked continue - go to final slide
      setShareModalOpen(false);
      setShowTryAgain(false);
      videoSlideAnim.setValue(0);
      flatListRef.current?.scrollToIndex({ index: slides.length - 1, animated: true });
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleShareModalClose = () => {
    // When X is clicked on share modal, show try again
    setShowTryAgain(true);
    Animated.timing(videoSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShareModalOpen(false);
    });
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
        {item.id === '1' && item.videoUrl ? (
          <>
            <Text style={styles.introTitle}>{item.title}</Text>
            <View style={styles.videoContainer}>
              <Video
                source={{ uri: item.videoUrl }}
                style={styles.tutorialVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
                onLoad={() => setVideoLoaded(true)}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.introEmoji}>{item.emoji}</Text>
            <Text style={styles.introTitle}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.introSubtitle}>{item.subtitle}</Text> : null}
          </>
        )}
      </View>
    </View>
  );

  const renderSetupSlide = (item: typeof slides[0]) => {
    const videoTranslateY = videoSlideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -200],
    });

    return (
      <View style={styles.slide}>
        <View style={styles.setupContent}>
          <Text style={styles.setupTitle}>{item.title}</Text>
          
          {/* Video showing share sheet */}
          {item.videoUrl && (
            <Animated.View style={[
              styles.setupVideoContainer,
              { transform: [{ translateY: videoTranslateY }] }
            ]}>
              <Video
                source={{ uri: item.videoUrl }}
                style={styles.setupVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
              />
              {/* X button on share modal */}
              {shareModalOpen && (
                <Pressable 
                  style={styles.shareModalCloseButton}
                  onPress={handleShareModalClose}
                >
                  <X size={20} color="#999" />
                </Pressable>
              )}
              {/* Subtitle moves with video */}
              <Text style={styles.setupSubtitle}>{item.subtitle}</Text>
            </Animated.View>
          )}
        </View>
      </View>
    );
  };

  const renderSuccessSlide = (item: typeof slides[0]) => (
    <View style={styles.slide}>
      <View style={styles.successContent}>
        <Text style={styles.successEmoji}>{item.emoji}</Text>
        <Text style={styles.successTitle}>{item.title}</Text>
        <Text style={styles.successSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const renderSlide = ({ item, index }: { item: typeof slides[0]; index: number }) => {
    switch (item.type) {
      case 'intro':
        return renderIntroSlide(item);
      case 'setup':
        return renderSetupSlide(item);
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
        
        {/* Loading overlay - shows until video is loaded */}
        {!videoLoaded && currentIndex === 0 && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1a1a2e" />
          </View>
        )}
        
        {/* Close button */}
        <Pressable 
          style={[styles.closeButton, { top: insets.top + 8 }]} 
          onPress={handleClose}
        >
          <X size={24} color="#333" />
        </Pressable>
        
        {/* Content */}
        <View style={[styles.content, { paddingTop: 40, opacity: videoLoaded || currentIndex !== 0 ? 1 : 0 }]}>
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
            scrollEnabled={false}
          />
          
          {/* Bottom section */}
          <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 0 }]}>
            
            {/* Button */}
            <Pressable style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>
                {slides[currentIndex].id === '2' && showTryAgain 
                  ? 'continue' 
                  : slides[currentIndex].buttonText}
              </Text>
            </Pressable>
            
            {/* Try Again button - shows when user dismissed share sheet */}
            {slides[currentIndex].id === '2' && showTryAgain && (
              <Pressable 
                style={styles.tryAgainButton} 
                onPress={() => {
                  openNativeShareSheet();
                }}
              >
                <Text style={styles.tryAgainText}>try again</Text>
              </Pressable>
            )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 40,
    height: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  
  // Intro slide styles
  introContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  socialIcons: {
    width: 150,
    height: 150,
    marginBottom: 32,
  },
  videoContainer: {
    width: SCREEN_WIDTH - 65,
    height: SCREEN_HEIGHT * 0.66,
    borderRadius: 10,
    overflow: 'visible',
    marginTop: 18,
    marginBottom: -20,
    
  },
  tutorialVideo: {
    width: '100%',
    height: '105%',
    position: 'absolute',
    bottom: -15,
    borderRadius: 5,
  },
  introEmoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  introTitle: {
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
    marginTop: 0,
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
    marginBottom: -30,
  },
  setupSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  setupVideoContainer: {
    borderRadius: 4,
    overflow: 'visible',
    alignItems: 'center',
  },
  setupVideo: {
    width: 350,
    height: 350,
    borderRadius: 10,
    marginTop: 150
  },
  shareModalCloseButton: {
    position: 'absolute',
    top: 160,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 16,
  },
  successSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
  },
  
  // Bottom section
  bottomSection: {
    paddingHorizontal: 32,
    marginTop: 'auto',
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
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tryAgainButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  tryAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
});
