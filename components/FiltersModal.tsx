import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import colors from '@/constants/colors';

export const PRICE_RANGES = [
  { label: 'Free', min: 0, max: 0 },
  { label: '€1-25', min: 1, max: 25 },
  { label: '€25-50', min: 25, max: 50 },
  { label: '€50-100', min: 50, max: 100 },
  { label: '€100+', min: 100, max: 10000 },
];

export const CATEGORIES = [
  'All',
  'Outdoors',
  'Sports',
  'Culture Dive',
  'Local Cooking',
  'Time Stories',
  'Micro Adventures',
];

export interface FilterOptions {
  priceRange: { min: number; max: number } | null;
  category: string | null;
  instantBooking: boolean;
  availableToday: boolean;
}

interface FiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters?: FilterOptions;
}

export const FiltersModal: React.FC<FiltersModalProps> = ({
  visible,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [selectedPrice, setSelectedPrice] = useState<{ min: number; max: number } | null>(
    currentFilters?.priceRange || null
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    currentFilters?.category || null
  );
  const [instantBooking, setInstantBooking] = useState(
    currentFilters?.instantBooking || false
  );
  const [availableToday, setAvailableToday] = useState(
    currentFilters?.availableToday || false
  );

  useEffect(() => {
    if (currentFilters) {
      setSelectedPrice(currentFilters.priceRange);
      setSelectedCategory(currentFilters.category);
      setInstantBooking(currentFilters.instantBooking);
      setAvailableToday(currentFilters.availableToday);
    }
  }, [currentFilters]);

  const handleApply = () => {
    onApply({
      priceRange: selectedPrice,
      category: selectedCategory,
      instantBooking,
      availableToday,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedPrice(null);
    setSelectedCategory(null);
    setInstantBooking(false);
    setAvailableToday(false);
  };

  const hasActiveFilters = selectedPrice || selectedCategory || instantBooking || availableToday;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#333" />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Range</Text>
            <View style={styles.optionsRow}>
              {PRICE_RANGES.map((range) => {
                const isSelected =
                  selectedPrice?.min === range.min && selectedPrice?.max === range.max;
                return (
                  <Pressable
                    key={range.label}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() =>
                      setSelectedPrice(isSelected ? null : { min: range.min, max: range.max })
                    }
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {range.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.optionsRow}>
              {CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category || (category === 'All' && !selectedCategory);
                return (
                  <Pressable
                    key={category}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() =>
                      setSelectedCategory(category === 'All' ? null : (isSelected ? null : category))
                    }
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Toggle Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            
            <Pressable
              style={styles.toggleRow}
              onPress={() => setInstantBooking(!instantBooking)}
            >
              <Text style={styles.toggleLabel}>Instant Booking</Text>
              <View style={[styles.checkbox, instantBooking && styles.checkboxSelected]}>
                {instantBooking && <Check size={16} color="#fff" />}
              </View>
            </Pressable>

            <Pressable
              style={styles.toggleRow}
              onPress={() => setAvailableToday(!availableToday)}
            >
              <Text style={styles.toggleLabel}>Available Today</Text>
              <View style={[styles.checkbox, availableToday && styles.checkboxSelected]}>
                {availableToday && <Check size={16} color="#fff" />}
              </View>
            </Pressable>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {hasActiveFilters && (
            <Pressable style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
          )}
          <Pressable style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipSelected: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#333',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  resetButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.coral,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default FiltersModal;
