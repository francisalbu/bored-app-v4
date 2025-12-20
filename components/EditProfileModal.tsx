import React, { useState, useEffect, useRef } from 'react';
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
import { X } from 'lucide-react-native';
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
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setBirthdate(currentBirthdate || '');
      setLocation(currentLocation || '');
      setSelectedIcon(currentAvatarIcon);
    }
  }, [visible, currentName, currentBirthdate, currentLocation, currentAvatarIcon]);

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
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <X size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content - ScrollView para funcionar com keyboard */}
        <ScrollView 
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <Text style={styles.label}>AVATAR</Text>
          <View style={styles.avatarRow}>
            {AVATAR_ICONS.map((icon) => (
              <Pressable
                key={icon}
                style={[styles.avatarBtn, selectedIcon === icon && styles.avatarBtnActive]}
                onPress={() => setSelectedIcon(icon)}
              >
                <Text style={styles.avatarEmoji}>{icon}</Text>
              </Pressable>
            ))}
          </View>

          {/* Name */}
          <Text style={styles.label}>NAME *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#666"
            autoCorrect={false}
          />

          {/* Birthdate */}
          <Text style={styles.label}>DATE OF BIRTH</Text>
          <TextInput
            style={styles.input}
            value={birthdate}
            onChangeText={setBirthdate}
            placeholder="DD/MM/YYYY (16+ years)"
            placeholderTextColor="#666"
            keyboardType="numbers-and-punctuation"
          />

          {/* Location */}
          <Text style={styles.label}>LOCATION</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="City, Country"
            placeholderTextColor="#666"
            autoCorrect={false}
            onFocus={() => {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
            }}
          />

          {/* Save */}
          <Pressable 
            style={[styles.saveBtn, saving && { opacity: 0.6 }]} 
            onPress={handleSave} 
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    marginTop: 24,
    marginBottom: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarBtnActive: {
    borderColor: colors.dark.primary,
  },
  avatarEmoji: {
    fontSize: 28,
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
  saveBtn: {
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.background,
  },
});
