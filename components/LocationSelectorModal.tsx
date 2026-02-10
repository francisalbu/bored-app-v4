import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationOption {
  id: string;
  name: string;
  emoji?: string;
  enabled: boolean;
}

const LOCATIONS: LocationOption[] = [
  { id: 'lisbon', name: 'Lisbon', enabled: true },
  { id: 'porto', name: 'Porto', enabled: false },
  { id: 'faro', name: 'Faro', enabled: false },
  { id: 'coimbra', name: 'Coimbra', enabled: false },
  { id: 'braga', name: 'Braga', enabled: false },
  { id: 'aveiro', name: 'Aveiro', enabled: false },
];

interface LocationSelectorModalProps {
  visible: boolean;
  selectedLocation: string;
  onClose: () => void;
  onSelectLocation: (location: string) => void;
}

export default function LocationSelectorModal({
  visible,
  selectedLocation,
  onClose,
  onSelectLocation,
}: LocationSelectorModalProps) {
  const handleSelectLocation = (location: LocationOption) => {
    if (!location.enabled) return;
    onSelectLocation(location.name);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Location List */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {LOCATIONS.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationItem,
                  selectedLocation === location.name && location.enabled && styles.locationItemSelected,
                  !location.enabled && styles.locationItemDisabled,
                ]}
                onPress={() => handleSelectLocation(location)}
                disabled={!location.enabled}
                activeOpacity={location.enabled ? 0.7 : 1}
              >
                <View style={styles.locationInfo}>
                  <Text style={[
                    styles.locationName,
                    !location.enabled && styles.locationNameDisabled,
                  ]}>
                    {location.name}
                  </Text>
                  {!location.enabled && (
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  )}
                </View>
                {selectedLocation === location.name && location.enabled && (
                  <Ionicons name="checkmark-circle" size={24} color="#BFFF00" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationItemSelected: {
    backgroundColor: 'rgba(191, 255, 0, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    borderBottomWidth: 0,
  },
  locationItemDisabled: {
    opacity: 0.4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationName: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  locationNameDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  comingSoonText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
    marginLeft: 8,
  },
});
