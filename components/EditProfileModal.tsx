import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentBirthdate?: string;
  currentLocation?: string;
  currentAvatarIcon: string;
  onSave: (data: {
    name: string;
    birthdate?: string;
    location?: string;
    avatarIcon: string;
  }) => Promise<void>;
}

const AVATAR_ICONS = ['🧑‍🚀', '🏄‍♂️', '🧗‍♀️', '🚴‍♂️', '🏃‍♀️'];

export default function EditProfileModal({
  visible,
  onClose,
  currentName,
  currentBirthdate,
  currentLocation,
  currentAvatarIcon,
  onSave,
}: EditProfileModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(currentName);
  const [birthdate, setBirthdate] = useState(currentBirthdate || '');
  const [location, setLocation] = useState(currentLocation || '');
  const [selectedIcon, setSelectedIcon] = useState(currentAvatarIcon);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        birthdate: birthdate || undefined,
        location: location || undefined,
        avatarIcon: selectedIcon,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.dark.text} />
            </Pressable>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Pressable onPress={handleSave} style={styles.saveButton} disabled={saving}>
              <Check size={24} color={colors.dark.primary} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.modalScroll} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar Icon Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Choose Avatar</Text>
              <View style={styles.iconGrid}>
                {AVATAR_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    style={[
                      styles.iconOption,
                      selectedIcon === icon && styles.iconOptionSelected,
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Text style={styles.iconEmoji}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Name */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.dark.textSecondary}
                autoCapitalize="words"
              />
            </View>

            {/* Birthdate */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={colors.dark.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.hint}>Optional</Text>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="City, Country"
                placeholderTextColor={colors.dark.textSecondary}
                autoCapitalize="words"
              />
              <Text style={styles.hint}>Optional</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '75%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark.text,
  },
  saveButton: {
    padding: 8,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: colors.dark.primary,
    backgroundColor: `${colors.dark.primary}20`,
  },
  iconEmoji: {
    fontSize: 32,
  },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  hint: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginTop: 6,
  },
});
