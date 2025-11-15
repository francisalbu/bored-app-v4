import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import colors from '@/constants/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!', headerStyle: { backgroundColor: colors.dark.background }, headerTintColor: colors.dark.text }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🧭</Text>
        <Text style={styles.title}>Lost in the adventure?</Text>
        <Text style={styles.subtitle}>This page doesn&apos;t exist</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Feed</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.dark.background,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    marginBottom: 32,
  },
  link: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
});
