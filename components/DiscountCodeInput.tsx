import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import colors from '../constants/colors';
import { api } from '../services/api';

interface DiscountCodeInputProps {
  onCodeApplied?: (code: string, discount_percentage: number) => void;
  onCodeRemoved?: () => void;
}

export function DiscountCodeInput({ onCodeApplied, onCodeRemoved }: DiscountCodeInputProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCode, setAppliedCode] = useState<{
    code: string;
    discount_percentage: number;
    description?: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleValidateCode = async () => {
    if (!code.trim()) {
      setError('Please enter a discount code');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const response = await api.validateDiscountCode(code.trim());

      if (response.success && response.data) {
        console.log('✅ Discount code validated:', response.data);
        setAppliedCode(response.data);
        console.log('🔵 Calling onCodeApplied with:', response.data.code, response.data.discount_percentage);
        onCodeApplied?.(response.data.code, response.data.discount_percentage);
        Alert.alert(
          'Success! 🎉',
          `${response.data.discount_percentage}% discount applied!`,
          [{ text: 'OK' }]
        );
      } else {
        setError(response.message || 'Invalid discount code');
      }
    } catch (error: any) {
      console.error('Error validating discount code:', error);
      setError(error.message || 'Failed to validate discount code');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCode = () => {
    setAppliedCode(null);
    setCode('');
    setError('');
    onCodeRemoved?.();
  };

  if (appliedCode) {
    return (
      <View style={styles.appliedContainer}>
        <View style={styles.appliedContent}>
          <View style={styles.checkIconContainer}>
            <Check size={16} color={colors.success} />
          </View>
          <View style={styles.appliedTextContainer}>
            <Text style={styles.appliedCode}>{appliedCode.code}</Text>
            <Text style={styles.appliedDescription}>
              {appliedCode.discount_percentage}% off applied
            </Text>
          </View>
        </View>
        <Pressable onPress={handleRemoveCode} style={styles.removeButton}>
          <X size={20} color={colors.dark.textSecondary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter the code"
          placeholderTextColor={colors.dark.textSecondary}
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setError('');
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!isValidating}
        />
        <Pressable
          style={[styles.applyButton, isValidating && styles.applyButtonDisabled]}
          onPress={handleValidateCode}
          disabled={isValidating || !code.trim()}
        >
          {isValidating ? (
            <ActivityIndicator size="small" color={colors.dark.text} />
          ) : (
            <Text style={styles.applyButtonText}>Apply</Text>
          )}
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.dark.text,
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
  appliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  appliedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appliedTextContainer: {
    flex: 1,
  },
  appliedCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 2,
  },
  appliedDescription: {
    fontSize: 14,
    color: colors.success,
  },
  removeButton: {
    padding: 8,
  },
});
