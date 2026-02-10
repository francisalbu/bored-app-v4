import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationOption {
  id: string;
  name: string;
  country?: string;
  emoji?: string;
  popular?: boolean;
}

const POPULAR_LOCATIONS: LocationOption[] = [
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', popular: true },
  { id: 'porto', name: 'Porto', country: 'Portugal', popular: true },
  { id: 'faro', name: 'Faro', country: 'Portugal', popular: true },
  { id: 'madrid', name: 'Madrid', country: 'Spain', popular: true },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain', popular: true },
  { id: 'paris', name: 'Paris', country: 'France', popular: true },
  { id: 'london', name: 'London', country: 'United Kingdom', popular: true },
  { id: 'rome', name: 'Rome', country: 'Italy', popular: true },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', popular: true },
  { id: 'berlin', name: 'Berlin', country: 'Germany', popular: true },
];

const WORLD_CITIES: LocationOption[] = [
  // Europe
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal' },
  { id: 'porto', name: 'Porto', country: 'Portugal' },
  { id: 'faro', name: 'Faro', country: 'Portugal' },
  { id: 'coimbra', name: 'Coimbra', country: 'Portugal' },
  { id: 'braga', name: 'Braga', country: 'Portugal' },
  { id: 'madrid', name: 'Madrid', country: 'Spain' },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain' },
  { id: 'seville', name: 'Seville', country: 'Spain' },
  { id: 'valencia', name: 'Valencia', country: 'Spain' },
  { id: 'paris', name: 'Paris', country: 'France' },
  { id: 'lyon', name: 'Lyon', country: 'France' },
  { id: 'marseille', name: 'Marseille', country: 'France' },
  { id: 'nice', name: 'Nice', country: 'France' },
  { id: 'london', name: 'London', country: 'United Kingdom' },
  { id: 'edinburgh', name: 'Edinburgh', country: 'United Kingdom' },
  { id: 'manchester', name: 'Manchester', country: 'United Kingdom' },
  { id: 'rome', name: 'Rome', country: 'Italy' },
  { id: 'milan', name: 'Milan', country: 'Italy' },
  { id: 'venice', name: 'Venice', country: 'Italy' },
  { id: 'florence', name: 'Florence', country: 'Italy' },
  { id: 'berlin', name: 'Berlin', country: 'Germany' },
  { id: 'munich', name: 'Munich', country: 'Germany' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands' },
  { id: 'brussels', name: 'Brussels', country: 'Belgium' },
  { id: 'vienna', name: 'Vienna', country: 'Austria' },
  { id: 'prague', name: 'Prague', country: 'Czech Republic' },
  { id: 'budapest', name: 'Budapest', country: 'Hungary' },
  { id: 'athens', name: 'Athens', country: 'Greece' },
  { id: 'dublin', name: 'Dublin', country: 'Ireland' },
  { id: 'copenhagen', name: 'Copenhagen', country: 'Denmark' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden' },
  { id: 'oslo', name: 'Oslo', country: 'Norway' },
  { id: 'helsinki', name: 'Helsinki', country: 'Finland' },
  { id: 'zurich', name: 'Zurich', country: 'Switzerland' },
  { id: 'warsaw', name: 'Warsaw', country: 'Poland' },
  
  // Americas
  { id: 'new-york', name: 'New York', country: 'USA' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'USA' },
  { id: 'san-francisco', name: 'San Francisco', country: 'USA' },
  { id: 'miami', name: 'Miami', country: 'USA' },
  { id: 'las-vegas', name: 'Las Vegas', country: 'USA' },
  { id: 'chicago', name: 'Chicago', country: 'USA' },
  { id: 'toronto', name: 'Toronto', country: 'Canada' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico' },
  { id: 'cancun', name: 'Cancun', country: 'Mexico' },
  { id: 'rio', name: 'Rio de Janeiro', country: 'Brazil' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina' },
  
  // Asia
  { id: 'tokyo', name: 'Tokyo', country: 'Japan' },
  { id: 'osaka', name: 'Osaka', country: 'Japan' },
  { id: 'kyoto', name: 'Kyoto', country: 'Japan' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong' },
  { id: 'dubai', name: 'Dubai', country: 'UAE' },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea' },
  { id: 'bali', name: 'Bali', country: 'Indonesia' },
  
  // Oceania
  { id: 'sydney', name: 'Sydney', country: 'Australia' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand' },
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCities = searchQuery.trim() 
    ? WORLD_CITIES.filter(city => 
        city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (city.country && city.country.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const showPopular = searchQuery.trim() === '';

  const handleSelectLocation = (location: LocationOption) => {
    onSelectLocation(location.name);
    setSearchQuery('');
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

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search any city..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          {/* Location List */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {showPopular && (
              <Text style={styles.sectionTitle}>POPULAR DESTINATIONS</Text>
            )}
            
            {showPopular ? (
              POPULAR_LOCATIONS.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationItem,
                    selectedLocation === location.name && styles.locationItemSelected,
                  ]}
                  onPress={() => handleSelectLocation(location)}
                  activeOpacity={0.7}
                >
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    {location.country && (
                      <Text style={styles.locationCountry}>{location.country}</Text>
                    )}
                  </View>
                  {selectedLocation === location.name && (
                    <Ionicons name="checkmark-circle" size={24} color="#BFFF00" />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <>
                {filteredCities.length > 0 ? (
                  filteredCities.map((location) => (
                    <TouchableOpacity
                      key={location.id}
                      style={[
                        styles.locationItem,
                        selectedLocation === location.name && styles.locationItemSelected,
                      ]}
                      onPress={() => handleSelectLocation(location)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationName}>{location.name}</Text>
                        {location.country && (
                          <Text style={styles.locationCountry}>{location.country}</Text>
                        )}
                      </View>
                      {selectedLocation === location.name && (
                        <Ionicons name="checkmark-circle" size={24} color="#BFFF00" />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResults}>
                    <Ionicons name="location-outline" size={48} color="#8E8E93" />
                    <Text style={styles.noResultsText}>No cities found</Text>
                    <Text style={styles.noResultsSubtext}>Try searching for a different city</Text>
                  </View>
                )}
              </>
            )}
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
    maxHeight: '80%',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationItemSelected: {
    backgroundColor: 'rgba(191, 255, 0, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  locationCountry: {
    fontSize: 14,
    color: '#8E8E93',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
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
