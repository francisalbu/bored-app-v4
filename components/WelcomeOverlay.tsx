import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import colors from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function WelcomeOverlay({ visible, onDismiss }: WelcomeOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const phoneAnim = useRef(new Animated.Value(0)).current;
  const handTranslateY = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const swipeLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      // Sequence of animations
      Animated.sequence([
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Show phone
        Animated.timing(phoneAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Show text
        Animated.timing(textAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start swipe animation after intro
        startSwipeAnimation();
      });
    }

    return () => {
      if (swipeLoopRef.current) {
        swipeLoopRef.current.stop();
      }
    };
  }, [visible]);

  const startSwipeAnimation = () => {
    swipeLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(handTranslateY, {
          toValue: -60,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(handTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    swipeLoopRef.current.start();
  };

  const handleDismiss = () => {
    if (swipeLoopRef.current) {
      swipeLoopRef.current.stop();
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="dark" />
      
      <Pressable style={styles.dismissArea} onPress={handleDismiss}>
        <View style={styles.content}>
          {/* Phone Icon with Play Button */}
          <Animated.View 
            style={[
              styles.phoneContainer,
              {
                opacity: phoneAnim,
                transform: [{ scale: phoneAnim }],
              }
            ]}
          >
            <View style={styles.phone}>
              <View style={styles.playButton}>
                <View style={styles.playTriangle} />
              </View>
            </View>
            
            {/* Hand Icon - animated swipe */}
            <Animated.View 
              style={[
                styles.handContainer,
                {
                  transform: [{ translateY: handTranslateY }],
                }
              ]}
            >
              <Text style={styles.handEmoji}>☝️</Text>
            </Animated.View>
          </Animated.View>

          {/* Instructions Text */}
          <Animated.View style={[styles.textContainer, { opacity: textAnim }]}>
            <Text style={styles.mainText}>Swipe up to see</Text>
            <Text style={styles.mainText}>more experiences</Text>
          </Animated.View>

          {/* Tap to continue */}
          <Animated.View style={[styles.tapContainer, { opacity: textAnim }]}>
            <Text style={styles.tapText}>Tap anywhere to continue</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  dismissArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  phone: {
    width: 100,
    height: 160,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: 'rgba(255, 255, 255, 0.8)',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 5,
  },
  handContainer: {
    position: 'absolute',
    right: -40,
    top: '50%',
  },
  handEmoji: {
    fontSize: 60,
    transform: [{ rotate: '-15deg' }],
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  mainText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tapContainer: {
    position: 'absolute',
    bottom: -150,
  },
  tapText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
