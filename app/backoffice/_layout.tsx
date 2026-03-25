import React, { useMemo, useState } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { BackofficeProvider, useBackofficeContext } from '@/contexts/BackofficeContext';
import { useAuth } from '@/contexts/AuthContext';

function BackofficeLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = authLoading || isSubmitting;

  return (
    <View style={styles.loginRoot}>
      <LinearGradient
        colors={[colors.dark.background, colors.dark.backgroundSecondary, colors.dark.background]}
        style={styles.backgroundGlow}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.loginContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.loginScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginCard}>
            <View style={styles.loginHeader}>
              <Text style={styles.loginBrandTitle}>Bored Tourist</Text>
              <Text style={styles.loginBrandSubtitle}>Backoffice</Text>
            </View>
            
            <Text style={styles.loginTitle}>Sign in</Text>
            <Text style={styles.loginSubtitle}>
              Access the backoffice with your operator or admin account
            </Text>

            <View style={styles.loginForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.dark.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.dark.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                  onSubmitEditing={handleLogin}
                />
              </View>

              {error && (
                <View style={styles.loginErrorBox}>
                  <Text style={styles.loginErrorText}>{error}</Text>
                </View>
              )}

              <Pressable 
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.dark.background} />
                ) : (
                  <Text style={styles.loginButtonText}>Sign in</Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.loginFooter}>
              Only operators and admins can access the backoffice.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function BackofficeShell() {
  const { profile, loading, error, refresh } = useBackofficeContext();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isWide = width >= 1024;

  const navItems = useMemo(() => {
    const items = [
      { label: 'Dashboard', path: '/backoffice' },
      { label: 'Experiences', path: '/backoffice/experiences' },
      { label: 'Bookings', path: '/backoffice/bookings' },
      { label: 'Calendar', path: '/backoffice/calendar' },
      { label: 'Analytics', path: '/backoffice/analytics' },
      { label: 'Reviews', path: '/backoffice/reviews' }
    ];

    if (profile?.user.role === 'admin') {
      items.push({ label: 'Operators', path: '/backoffice/operators' });
    }

    return items;
  }, [profile?.user.role]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <BackofficeLogin onLoginSuccess={refresh} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
        <Text style={styles.loadingText}>Loading backoffice...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.errorTitle}>Backoffice unavailable</Text>
        <Text style={styles.errorMessage}>{error || 'Unable to load profile.'}</Text>
        <View style={styles.buttonRow}>
          <Pressable style={styles.primaryButton} onPress={refresh}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={logout}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hasAccess = profile.user.role === 'admin' || profile.user.role === 'operator';

  if (!hasAccess) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.errorTitle}>Access restricted</Text>
        <Text style={styles.errorMessage}>This area is available to operators and admins only.</Text>
        <View style={styles.buttonRow}>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/') }>
            <Text style={styles.primaryButtonText}>Return to app</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={logout}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (profile.user.role === 'operator' && !profile.operator) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.errorTitle}>Operator profile missing</Text>
        <Text style={styles.errorMessage}>Ask an admin to link your account to an operator profile.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/') }>
          <Text style={styles.primaryButtonText}>Return to app</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.dark.background, colors.dark.backgroundSecondary, colors.dark.background]}
        style={styles.backgroundGlow}
      />
      <View style={[styles.shell, isWide ? styles.shellWide : styles.shellStack]}>
        <View style={[styles.nav, isWide ? styles.navWide : styles.navStack]}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandTitle}>Bored Tourist</Text>
            <Text style={styles.brandSubtitle}>Backoffice</Text>
          </View>
          <View style={[styles.navItems, isWide ? styles.navItemsColumn : styles.navItemsRow]}>
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Pressable
                  key={item.path}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => router.push(item.path)}
                >
                  <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>{profile.user.name}</Text>
            <Text style={styles.profileRole}>{profile.user.role}</Text>
            <Pressable style={styles.signOutButton} onPress={logout}>
              <Text style={styles.signOutButtonText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

export default function BackofficeLayout() {
  return (
    <BackofficeProvider>
      <BackofficeShell />
    </BackofficeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.background
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240
  },
  shell: {
    flex: 1
  },
  shellWide: {
    flexDirection: 'row'
  },
  shellStack: {
    flexDirection: 'column'
  },
  nav: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderColor: colors.dark.border
  },
  navWide: {
    width: 280,
    borderRightWidth: 1
  },
  navStack: {
    borderBottomWidth: 1
  },
  brandBlock: {
    marginBottom: 24
  },
  brandTitle: {
    ...typography.styles.h3,
    color: colors.dark.text
  },
  brandSubtitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2
  },
  navItems: {
    marginBottom: 24
  },
  navItemsColumn: {
    gap: 12
  },
  navItemsRow: {
    flexDirection: 'row',
    gap: 12
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.backgroundSecondary
  },
  navItemActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary
  },
  navItemText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  navItemTextActive: {
    color: colors.dark.background
  },
  profileCard: {
    marginTop: 'auto',
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  profileName: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  profileRole: {
    marginTop: 4,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    textTransform: 'uppercase'
  },
  signOutButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center'
  },
  signOutButtonText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 28
  },
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.dark.background
  },
  loadingText: {
    marginTop: 16,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary
  },
  errorTitle: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes['2xl'],
    color: colors.dark.text,
    textAlign: 'center'
  },
  errorMessage: {
    marginTop: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary,
    textAlign: 'center'
  },
  primaryButton: {
    marginTop: 20,
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
  },
  secondaryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  secondaryButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  // Login styles
  loginRoot: {
    flex: 1,
    backgroundColor: colors.dark.background
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 24,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  loginHeader: {
    marginBottom: 32,
    alignItems: 'center'
  },
  loginBrandTitle: {
    ...typography.styles.h2,
    color: colors.dark.text
  },
  loginBrandSubtitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2
  },
  loginTitle: {
    ...typography.styles.h3,
    color: colors.dark.text,
    textAlign: 'center'
  },
  loginSubtitle: {
    marginTop: 8,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    textAlign: 'center'
  },
  loginForm: {
    marginTop: 24,
    gap: 16
  },
  inputGroup: {
    gap: 8
  },
  inputLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.dark.border,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  loginErrorBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  loginErrorText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: '#ef4444',
    textAlign: 'center'
  },
  loginButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginButtonDisabled: {
    opacity: 0.6
  },
  loginButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.background,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  loginFooter: {
    marginTop: 24,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary,
    textAlign: 'center'
  }
});
