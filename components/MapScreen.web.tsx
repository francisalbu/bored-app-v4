import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import colors from '@/constants/colors';
import typography from '@/constants/typography';

/**
 * Web fallback for MapScreen.
 * react-native-maps is not supported on web.
 */
export default function MapScreenWeb() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Map is mobile-only</Text>
        <Text style={styles.body}>
          The interactive map uses native map APIs and is not available in the web preview.
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/')}>
            <Text style={styles.primaryButtonText}>Back to feed</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff'
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: '#fff'
  },
  title: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes.xl,
    color: colors.dark.text
  },
  body: {
    marginTop: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row'
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.dark.primary
  },
  primaryButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.background,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  }
});
