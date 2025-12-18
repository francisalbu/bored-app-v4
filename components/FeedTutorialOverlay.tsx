import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeedTutorialOverlayProps {
  visible: boolean;
  onSkip: () => void;
}

export default function FeedTutorialOverlay({ visible, onSkip }: FeedTutorialOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Full black overlay */}
      <View style={styles.overlay} />

      {/* Spotlight cutout for import button (top right area) */}
      <View style={styles.spotlightContainer}>
        {/* Circle highlight where the import button is */}
        <View style={styles.spotlight} />
      </View>

      {/* Bottom button */}
      <TouchableOpacity 
        style={styles.skipButton}
        onPress={onSkip}
        activeOpacity={0.9}
      >
        <Text style={styles.skipButtonText}>Start Exploring</Text>
      </TouchableOpacity>
    </View>
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  spotlightContainer: {
    position: 'absolute',
    top: 60,
    right: 60,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlight: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#BFFF00',
    shadowColor: '#BFFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  skipButton: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: '#BFFF00',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#BFFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  skipButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
});

