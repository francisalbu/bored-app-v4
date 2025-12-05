import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerSection}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.date}>Last updated: November 22, 2025</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information that you provide directly to us, including:{'\n\n'}
            • Name and contact information{'\n'}
            • Email address{'\n'}
            • Payment information{'\n'}
            • Booking history{'\n'}
            • Reviews and ratings{'\n'}
            • Location data (with your permission)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to:{'\n\n'}
            • Process your bookings and payments{'\n'}
            • Send booking confirmations and updates{'\n'}
            • Provide customer support{'\n'}
            • Personalize your experience{'\n'}
            • Send marketing communications (with your consent){'\n'}
            • Improve our services
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>3. Information Sharing</Text>
          <Text style={styles.paragraph}>
            We share your information with:{'\n\n'}
            • Experience providers to facilitate your bookings{'\n'}
            • Payment processors to handle transactions{'\n'}
            • Service providers who assist in operating our platform{'\n'}
            • Law enforcement when required by law
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>4. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate security measures to protect your personal information. 
            However, no method of transmission over the internet is 100% secure.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>5. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:{'\n\n'}
            • Access your personal information{'\n'}
            • Correct inaccurate data{'\n'}
            • Request deletion of your data{'\n'}
            • Object to processing of your data{'\n'}
            • Withdraw consent at any time
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>6. Cookies and Tracking</Text>
          <Text style={styles.paragraph}>
            We use cookies and similar technologies to enhance your experience, 
            analyze usage patterns, and deliver personalized content.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>7. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our Service is not intended for children under 16. We do not knowingly 
            collect personal information from children under 16.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>8. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you 
            of any changes by posting the new policy on this page.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>9. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy, please contact us at:{'\n'}
            bookings@boredtourist.com
          </Text>
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
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: colors.dark.textSecondary,
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
});
