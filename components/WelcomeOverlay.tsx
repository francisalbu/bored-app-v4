import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';

interface WelcomeOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  step: 'swipe' | 'tap';
}

export default function WelcomeOverlay({ visible, onDismiss, step }: WelcomeOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const handAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      handAnim.setValue(step === 'swipe' ? 0 : 1);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        startAnimation();
      });
    }

    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
      }
    };
  }, [visible, step]);

  const startAnimation = () => {
    if (step === 'swipe') {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(handAnim, {
            toValue: -50,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(handAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
    } else {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(handAnim, {
            toValue: 0.85,
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
    loopRef.current.start();
  };

  const handleDismiss = () => {
    if (loopRef.current) {
      loopRef.current.stop();
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Pressable style={styles.pressArea} onPress={handleDismiss}>
        <View style={styles.content}>
          <Animated.Text 
            style={[
              styles.handEmoji,
              step === 'swipe' 
                ? { transform: [{ translateY: handAnim }] }
                : { transform: [{ scale: handAnim }] }
            ]}
          >
            {step === 'swipe' ? '☝️' : '👆'}
          </Animated.Text>

          <Text style={styles.mainText}>
            {step === 'swipe' 
              ? 'Swipe up to see\nmore experiences' 
              : 'Tap on the video to\nsee details & book!'}
          </Text>

          <Text style={styles.tapText}>Tap anywhere to continue</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  pressArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  handEmoji: {
    fontSize: 80,
    marginBottom: 30,
  },
  mainText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 40,
  },
  tapText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
