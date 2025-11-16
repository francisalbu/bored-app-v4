/**
 * Supabase Test Screen
 * 
 * Use this screen to test Supabase authentication
 * Navigate to /test-supabase to access it
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SupabaseAuthProvider, useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import colors from '@/constants/colors';

function TestContent() {
  const { user, isLoading, isAuthenticated, login, register, logout } = useSupabaseAuth();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Test User');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogin = async () => {
    setIsProcessing(true);
    setMessage('');
    const result = await login(email, password);
    setIsProcessing(false);
    if (result.success) {
      setMessage('✅ Login successful!');
    } else {
      setMessage(`❌ Login failed: ${result.error}`);
    }
  };

  const handleRegister = async () => {
    setIsProcessing(true);
    setMessage('');
    const result = await register(name, email, password);
    setIsProcessing(false);
    if (result.success) {
      setMessage('✅ Registration successful!');
    } else {
      setMessage(`❌ Registration failed: ${result.error}`);
    }
  };

  const handleLogout = async () => {
    setIsProcessing(true);
    await logout();
    setIsProcessing(false);
    setMessage('✅ Logged out');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
        <Text style={styles.text}>Loading Supabase...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🧪 Supabase Auth Test</Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={[styles.statusValue, isAuthenticated && styles.statusSuccess]}>
          {isAuthenticated ? '✅ Authenticated' : '⭕ Not authenticated'}
        </Text>
      </View>

      {isAuthenticated && user && (
        <View style={styles.userCard}>
          <Text style={styles.userLabel}>User Info:</Text>
          <Text style={styles.userText}>ID: {user.id}</Text>
          <Text style={styles.userText}>Email: {user.email}</Text>
          <Text style={styles.userText}>Name: {user.name}</Text>
        </View>
      )}

      {!isAuthenticated && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Login/Register</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.dark.textTertiary}
              value={name}
              onChangeText={setName}
              editable={!isProcessing}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.dark.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isProcessing}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.dark.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isProcessing}
            />

            <Pressable
              style={[styles.button, isProcessing && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.dark.background} />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonSecondary, isProcessing && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.dark.text} />
              ) : (
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Register</Text>
              )}
            </Pressable>
          </View>
        </>
      )}

      {isAuthenticated && (
        <Pressable
          style={[styles.button, styles.buttonDanger]}
          onPress={handleLogout}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      )}

      {message && (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Instructions:</Text>
        <Text style={styles.infoText}>1. Try registering a new user</Text>
        <Text style={styles.infoText}>2. Check Supabase dashboard for the new user</Text>
        <Text style={styles.infoText}>3. Try logging in with the same credentials</Text>
        <Text style={styles.infoText}>4. Verify user info is displayed</Text>
        <Text style={styles.infoText}>5. Test logout</Text>
      </View>
    </ScrollView>
  );
}

export default function TestSupabaseScreen() {
  return (
    <SupabaseAuthProvider>
      <TestContent />
    </SupabaseAuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: colors.dark.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark.text,
  },
  statusSuccess: {
    color: colors.dark.primary,
  },
  userCard: {
    backgroundColor: colors.dark.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  userLabel: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 8,
  },
  userText: {
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.dark.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  button: {
    backgroundColor: colors.dark.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.dark.primary,
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.background,
  },
  buttonTextSecondary: {
    color: colors.dark.text,
  },
  messageCard: {
    backgroundColor: colors.dark.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: colors.dark.text,
  },
  infoCard: {
    backgroundColor: colors.dark.backgroundTertiary,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    color: colors.dark.text,
    marginTop: 16,
  },
});
