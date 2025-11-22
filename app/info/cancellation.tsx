import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

export default function CancellationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerSection}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Cancellation & Refund</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.subtitle}>A. Cancellations by Users</Text>
          <Text style={styles.paragraph}>
            • Users are entitled to a 100% refund for cancellations communicated, via app, 
            at least 24 hours before the scheduled start date and time of the activity.{'\n\n'}
            • For cancellations submitted less than 24 hours prior to the activity, no 
            refunds will be given. Exceptions may be considered for extreme circumstances 
            at Bored Tourist's discretion.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>B. Cancellations by Hosts/Partners</Text>
          <Text style={styles.paragraph}>
            • Hosts may cancel activities at any time for operational, personal, or 
            external reasons.{'\n\n'}
            • If a host cancels, Bored Tourist will refund 100% of the booking fee paid 
            by the user for that activity.{'\n\n'}
            • No compensation, refund, or reimbursement will be provided for travel, 
            accommodation, or other related expenses incurred by the user to attend the 
            activity site.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>C. Force Majeure/Exceptional Circumstances</Text>
          <Text style={styles.paragraph}>
            • Full refund of the activity price will be issued if events are cancelled 
            due to force majeure (such as natural disaster, regulatory issues, etc.).{'\n\n'}
            • No further liability or compensation is assumed for indirect expenses.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>D. Case-by-Case Considerations</Text>
          <Text style={styles.paragraph}>
            Users with exceptional circumstances (documented illness, travel disruption, 
            etc.) may request special consideration by contacting support. Resolution is 
            assessed at the sole discretion of Bored Tourist management, via 
            bookings@boredtourist.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>How to Cancel</Text>
          <Text style={styles.paragraph}>
            1. Go to the Bookings tab{'\n'}
            2. Select the booking you want to cancel{'\n'}
            3. Tap "Cancel Booking"{'\n'}
            4. Confirm your cancellation{'\n'}
            5. You'll receive a confirmation email
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
  bold: {
    fontWeight: '900',
    color: colors.dark.text,
  },
});
