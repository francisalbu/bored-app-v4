import { X, Check } from 'lucide-react-native';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORIES as APP_CATEGORIES, type Experience } from '@/constants/experiences';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.75;

// All possible categories from the app (excluding "all")
const ALL_CATEGORIES = APP_CATEGORIES
  .filter(cat => cat.id !== 'all')
  .map(cat => ({
    id: cat.id,
    label: cat.name,
    emoji: cat.icon,
  }));

// Price ranges
const PRICE_RANGES = [
  { id: 'free', label: 'Free', min: 0, max: 0 },
  { id: 'budget', label: '€1 - €30', min: 1, max: 30 },
  { id: 'mid', label: '€31 - €60', min: 31, max: 60 },
  { id: 'premium', label: '€61 - €100', min: 61, max: 100 },
  { id: 'luxury', label: '€100+', min: 100, max: 9999 },
];

export interface FilterOptions {
  categories: string[];
  priceRange: string | null;
}

interface FiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
  experiences: Experience[];
}

export function FiltersModal({ visible, onClose, onApply, currentFilters, experiences }: FiltersModalProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentFilters.categories);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(currentFilters.priceRange);
  
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Filter categories to only show those with at least 1 experience (same logic as explore.tsx)
  const availableCategories = useMemo(() => {
    return ALL_CATEGORIES.filter(category => {
      const normalizedCategoryName = category.label.toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
      
      return experiences.some(exp => {
        // Check if experience category matches
        const expCategory = (exp.category || '').toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
        if (expCategory === normalizedCategoryName || expCategory.includes(category.id)) {
          return true;
        }
        
        // Check if any tag matches the category name
        return (exp.tags || []).some(tag => {
          const normalizedTag = tag.toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
          return normalizedTag === normalizedCategoryName || tag.toLowerCase().includes(category.label.toLowerCase());
        });
      });
    });
  }, [experiences]);

  // Sync with current filters when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedCategories(currentFilters.categories);
      setSelectedPriceRange(currentFilters.priceRange);
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation values
      slideAnim.setValue(PANEL_WIDTH);
      fadeAnim.setValue(0);
    }
  }, [visible, currentFilters]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: PANEL_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleApply = () => {
    console.log('🎯 Applying filters:', {
      categories: selectedCategories,
      priceRange: selectedPriceRange,
    });
    onApply({
      categories: selectedCategories,
      priceRange: selectedPriceRange,
    });
    handleClose();
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedPriceRange(null);
  };

  const hasFilters = selectedCategories.length > 0 || selectedPriceRange !== null;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Side Panel */}
        <Animated.View 
          style={[
            styles.sidePanel,
            { 
              transform: [{ translateX: slideAnim }],
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Categories Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              {availableCategories.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.menuItem}
                    onPress={() => {
                      console.log('Category pressed:', category.id);
                      toggleCategory(category.id);
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={styles.menuItemLeft}>
                      <Text style={styles.menuItemEmoji}>{category.emoji}</Text>
                      <Text style={styles.menuItemLabel}>{category.label}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Check size={18} color="#1C1C1E" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Price Range Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>
              {PRICE_RANGES.map((range) => {
                const isSelected = selectedPriceRange === range.id;
                return (
                  <TouchableOpacity
                    key={range.id}
                    style={styles.menuItem}
                    onPress={() => {
                      console.log('Price pressed:', range.id);
                      setSelectedPriceRange(isSelected ? null : range.id);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.menuItemLabel}>{range.label}</Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Check size={18} color="#1C1C1E" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Actions */}
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleReset}
                disabled={!hasFilters}
                activeOpacity={0.6}
              >
                <Text style={[styles.menuItemLabel, !hasFilters && styles.menuItemLabelDisabled]}>
                  Reset Filters
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.8}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Export price ranges and categories for use in filtering
export { PRICE_RANGES, ALL_CATEGORIES as CATEGORIES };

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sidePanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemEmoji: {
    fontSize: 20,
    width: 28,
  },
  menuItemLabel: {
    fontSize: 17,
    color: '#1C1C1E',
    fontWeight: '400' as const,
  },
  menuItemLabelDisabled: {
    color: '#C7C7CC',
  },
  checkmark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  applyButton: {
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
});

