import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import colors from '../constants/colors';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface SuggestActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SuggestActivityModal({
  visible,
  onClose,
  onSuccess,
}: SuggestActivityModalProps) {
  const { isAuthenticated } = useAuth();
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    if (!contact.trim()) {
      Alert.alert('Error', 'Please provide Instagram handle or website');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Error', 'You must be logged in to suggest activities');
      return;
    }

    setIsSubmitting(true);

    // Determine if it's Instagram or website
    const isInstagram = contact.trim().includes('@') || !contact.trim().includes('.');

    try {
      const response = await api.submitActivitySuggestion({
        instagram_handle: isInstagram ? contact.trim() : '',
        website: !isInstagram ? contact.trim() : '',
        description: description.trim(),
      });

      if (response.success) {
        Alert.alert(
          'Success! 🎉',
          'Thank you for your suggestion! We will review it soon.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setContact('');
                setDescription('');
                onClose();
                onSuccess?.();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit suggestion');
      }
    } catch (error: any) {
      console.error('Error submitting suggestion:', error);
      Alert.alert('Error', error.message || 'Failed to submit suggestion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContact('');
      setDescription('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Pressable style={styles.overlay} onPress={handleClose} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Suggest a New Activity</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.dark.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              Know an amazing activity we should feature? Share it with us!
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Instagram Handle or Website <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="@example or https://example.com"
                placeholderTextColor={colors.dark.textSecondary}
                value={contact}
                onChangeText={setContact}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about this activity... What makes it special? What should we know?"
                placeholderTextColor={colors.dark.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
                editable={!isSubmitting}
              />
              <Text style={styles.charCount}>
                {description.length}/1000 characters
              </Text>
            </View>

            <Pressable
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.dark.background} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Suggestion</Text>
              )}
            </Pressable>

            <Text style={styles.disclaimer}>
              By submitting, you agree that we may contact you about your
              suggestion. We review all submissions and will reach out if we
              decide to feature this activity.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark.text,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 8,
  },
  required: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.dark.text,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dark.border,
  },
  dividerText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginHorizontal: 12,
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark.background,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
});
