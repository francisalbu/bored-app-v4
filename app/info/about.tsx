import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerSection}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>About Bored Tourist</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.paragraph}>
            We believe travel is more than just destinations — it's about the stories we 
            create, the unexpected moments, and the connections that change us.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            We reject the ordinary, the pre-packaged tours, and the tired itineraries that 
            drain the thrill from discovery. Instead, we celebrate curiosity — the restless 
            spirit that refuses to be bored.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            We live for the thrill of the unknown, the joy of stepping off the beaten path, 
            and the wonders waiting in narrow alleys, vibrant kitchens, and whispered local 
            secrets.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            We believe every traveler deserves more than just a check-list; they deserve 
            stories so vivid they live forever, and experiences that spark wonder, laughter, 
            and awe.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            We empower explorers to break free with journeys that feel alive, rich, and 
            shared through moments captured in bursts of irresistible video.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            We are the platform for the playful, the seekers, the dreamers who crave 
            authentic, raw, and vibrant adventures in every corner of the world.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Because boredom is the ultimate traveler's enemy— and adventure is our call 
            to arms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.tagline}>This is Bored Tourist. Rediscover wonder.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  headerSection: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.dark.textSecondary,
  },
  tagline: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '900',
    color: colors.dark.primary,
    textAlign: 'center',
  },
});
