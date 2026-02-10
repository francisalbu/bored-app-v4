import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, MessageCircle, Phone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleContact = (type: 'email' | 'phone') => {
    if (type === 'email') {
      Linking.openURL('mailto:support@boredtourist.com');
    } else {
      Linking.openURL('tel:+351123456789');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerSection}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Help Center</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.title}>How can we help you?</Text>
          <Text style={styles.paragraph}>
            We're here to make your experience smooth and enjoyable. Find answers to 
            common questions or reach out to our support team.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Contact Us</Text>
          
          <Pressable style={styles.contactCard} onPress={() => handleContact('email')}>
            <View style={styles.contactIconContainer}>
              <Mail size={24} color={colors.dark.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactDetail}>support@boredtourist.com</Text>
            </View>
          </Pressable>

          <Pressable style={styles.contactCard} onPress={() => handleContact('phone')}>
            <View style={styles.contactIconContainer}>
              <Phone size={24} color={colors.dark.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Phone Support</Text>
              <Text style={styles.contactDetail}>+351 123 456 789</Text>
            </View>
          </Pressable>

          <View style={styles.contactCard}>
            <View style={styles.contactIconContainer}>
              <MessageCircle size={24} color={colors.dark.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Live Chat</Text>
              <Text style={styles.contactDetail}>Available 9 AM - 6 PM (CET)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>How do I book an experience?</Text>
            <Text style={styles.faqAnswer}>
              Browse experiences on the Explore tab, select your preferred date and time, 
              and complete the booking with secure payment.
            </Text>
          </View>

          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>What is the cancellation policy?</Text>
            <Text style={styles.faqAnswer}>
              Most experiences offer free cancellation up to 24 hours before the activity. 
              Check specific details on each experience page.
            </Text>
          </View>

          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>How do I contact the experience provider?</Text>
            <Text style={styles.faqAnswer}>
              After booking, you'll find provider contact details in your booking confirmation 
              and in the Bookings tab.
            </Text>
          </View>

          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>Can I reschedule my booking?</Text>
            <Text style={styles.faqAnswer}>
              Rescheduling options depend on the experience provider. Contact them directly 
              or reach out to our support team for assistance.
            </Text>
          </View>
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
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 255, 140, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  faqCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark.textSecondary,
  },
});
