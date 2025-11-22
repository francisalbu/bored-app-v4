import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerSection}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.subtitle}>1. Introduction and Scope</Text>
          <Text style={styles.paragraph}>
            Bored Tourist is a digital marketplace that connects travellers with hosts and 
            local experience providers. By using our platform, users agree to abide by 
            these Terms & Conditions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>2. Role of Bored Tourist</Text>
          <Text style={styles.paragraph}>
            Bored Tourist acts solely as a marketplace and technology facilitator. We do 
            not operate or manage any experiences directly, unless explicitly stated 
            otherwise, nor do we accept responsibility or liability for the actions of 
            hosts or the nature/quality of the experiences provided.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>3. Booking and Payments</Text>
          <Text style={styles.paragraph}>
            When booking an activity, the user enters into an agreement directly with the 
            experience provider (host/partner). Payment is processed via our platform, and 
            confirmation is provided upon completion of payment.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>4. User Responsibilities</Text>
          <Text style={styles.paragraph}>
            Users are responsible for providing accurate information during booking and for 
            respecting the host's activity requirements (e.g., arrival time, dress code). 
            Any breach may result in denied access or cancellation without refund.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>5. Hosts'/Partners' Responsibilities</Text>
          <Text style={styles.paragraph}>
            Hosts are responsible for delivering the experience as described, unless a 
            legitimate reason for cancellation arises. Hosts reserve the right to cancel 
            activities and are responsible for informing Bored Tourist and affected users 
            in a timely manner.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>6. Cancellation and Refund Policy</Text>
          <Text style={styles.paragraph}>
            See the full Cancellation & Refund Policy for detailed information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>7. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            Bored Tourist does not assume liability for injuries, losses, or damages 
            sustained during any experience, nor for expenses related to travel, 
            accommodation, or other bookings made in connection with an activity.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>8. Changes and Force Majeure</Text>
          <Text style={styles.paragraph}>
            Bored Tourist and its partners reserve the right to alter, reschedule, or 
            cancel activities due to unforeseen circumstances or force majeure. Where 
            possible, alternatives or full refunds will be offered for affected bookings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>9. Data Protection</Text>
          <Text style={styles.paragraph}>
            Personal information will be processed according to our Privacy Policy, 
            compliant with the applicable GDPR standards.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>10. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms & Conditions are governed by the laws of Portugal, except where 
            superseded by EU statutory regulations.
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
