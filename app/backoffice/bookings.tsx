import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { api } from '@/services/api';
import { useBackofficeContext } from '@/contexts/BackofficeContext';
import Pagination from '@/components/backoffice/Pagination';

interface Booking {
  id: number;
  booking_reference: string;
  booking_date: string;
  booking_time: string;
  participants: number;
  total_amount: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  created_at: string;
  experiences?: {
    id: number;
    title: string;
    location: string;
    price: number;
    operator_id: number;
    operators?: {
      id: number;
      company_name: string;
      commission?: number;
    } | null;
  } | null;
  users?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
type PaymentFilter = 'all' | 'pending' | 'paid' | 'refunded' | 'failed';
type DatePreset = 'all' | 'today' | 'week' | 'month' | 'last30';
type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'created_desc';

interface ExperienceOption {
  id: number;
  title: string;
}

interface OperatorOption {
  id: number;
  company_name: string;
}

// Helper to get date range from preset
const getDateRangeFromPreset = (preset: DatePreset): { from: string; to: string } => {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  switch (preset) {
    case 'today':
      return { from: formatDate(today), to: formatDate(today) };
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return { from: formatDate(weekAgo), to: formatDate(today) };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: formatDate(monthStart), to: formatDate(today) };
    }
    case 'last30': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return { from: formatDate(thirtyDaysAgo), to: formatDate(today) };
    }
    default:
      return { from: '', to: '' };
  }
};

export default function BackofficeBookings() {
  const { profile } = useBackofficeContext();
  const { width } = useWindowDimensions();
  const isWide = width >= 1200;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [experiences, setExperiences] = useState<ExperienceOption[]>([]);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [experienceFilter, setExperienceFilter] = useState<number | 'all'>('all');
  const [operatorFilter, setOperatorFilter] = useState<number | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(10)).current;

  const isAdmin = profile?.user.role === 'admin';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  }, [fadeAnim, translateAnim]);

  // Load experiences and operators for filter dropdowns
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const expResponse = await api.getBackofficeExperiences();
        if (expResponse.success && expResponse.data) {
          setExperiences((expResponse.data as any[]).map(e => ({ id: e.id, title: e.title })));
        }
        
        if (isAdmin) {
          const opResponse = await api.getBackofficeOperators();
          if (opResponse.success && opResponse.data) {
            setOperators((opResponse.data as any[]).map(o => ({ id: o.id, company_name: o.company_name })));
          }
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    loadFilterOptions();
  }, [isAdmin]);

  // Handle date preset changes
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const { from, to } = getDateRangeFromPreset(preset);
    setDateFrom(from);
    setDateTo(to);
  };

  // Clear custom dates when preset is selected
  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    setDatePreset('all');
    if (field === 'from') {
      setDateFrom(value);
    } else {
      setDateTo(value);
    }
  };

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (paymentFilter !== 'all') filters.payment_status = paymentFilter;
      if (dateFrom) filters.from_date = dateFrom;
      if (dateTo) filters.to_date = dateTo;
      if (experienceFilter !== 'all') filters.experience_id = experienceFilter;
      if (operatorFilter !== 'all') filters.operator_id = operatorFilter;

      const response = await api.getBackofficeBookings(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load bookings');
      }
      setBookings(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, dateFrom, dateTo, experienceFilter, operatorFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (paymentFilter !== 'all') count++;
    if (dateFrom || dateTo) count++;
    if (experienceFilter !== 'all') count++;
    if (operatorFilter !== 'all') count++;
    return count;
  }, [statusFilter, paymentFilter, dateFrom, dateTo, experienceFilter, operatorFilter]);

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setExperienceFilter('all');
    setOperatorFilter('all');
    setSearchQuery('');
  };

  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) =>
        [b.booking_reference, b.customer_name, b.customer_email, b.experiences?.title || ''].some((field) =>
          field.toLowerCase().includes(q)
        )
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'date_asc':
          return new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
        case 'date_desc':
          return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
        case 'amount_asc':
          return a.total_amount - b.total_amount;
        case 'amount_desc':
          return b.total_amount - a.total_amount;
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
    
    return result;
  }, [bookings, searchQuery, sortOption]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, paymentFilter, dateFrom, dateTo, experienceFilter, operatorFilter]);

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleStatusUpdate = async (bookingId: number, newStatus: string) => {
    const statusLabels: Record<string, string> = {
      confirmed: 'confirm',
      completed: 'mark as completed',
      cancelled: 'cancel'
    };
    
    const confirmMessage = `Are you sure you want to ${statusLabels[newStatus] || 'update'} this booking?`;
    
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    } else {
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Update Booking Status',
          confirmMessage,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            { 
              text: 'Yes', 
              onPress: async () => {
                await performStatusUpdate(bookingId, newStatus);
                resolve();
              }
            }
          ]
        );
      });
    }
    
    await performStatusUpdate(bookingId, newStatus);
  };

  const performStatusUpdate = async (bookingId: number, newStatus: string) => {
    try {
      setUpdating(true);
      const response = await api.updateBackofficeBookingStatus(bookingId, newStatus);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update status');
      }
      await loadBookings();
      setShowDetailsModal(false);
      setSelectedBooking(null);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const openDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.dark.success;
      case 'completed': return colors.dark.primary;
      case 'cancelled': return colors.dark.error;
      default: return colors.dark.warning;
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.dark.success;
      case 'refunded': return colors.dark.warning;
      case 'failed': return colors.dark.error;
      default: return colors.dark.textSecondary;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-EU', { style: 'currency', currency }).format(amount);
  };

  const renderFilterPill = (label: string, value: string, current: string, onPress: () => void) => (
    <Pressable
      key={value}
      style={[styles.filterPill, current === value && styles.filterPillActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterPillText, current === value && styles.filterPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );

  const renderBookingCard = (booking: Booking) => (
    <Pressable key={booking.id} style={styles.bookingCard} onPress={() => openDetails(booking)}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingRef}>#{booking.booking_reference}</Text>
          <Text style={styles.bookingExp}>{booking.experiences?.title || 'Unknown Experience'}</Text>
          <Text style={styles.bookingCustomer}>{booking.customer_name}</Text>
        </View>
        <View style={styles.bookingMeta}>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.bookingAmount}>{formatCurrency(booking.total_amount, booking.currency)}</Text>
        </View>
      </View>
      <View style={styles.bookingFooter}>
        <Text style={styles.bookingDate}>
          {formatDate(booking.booking_date)} at {booking.booking_time}
        </Text>
        <Text style={styles.bookingParticipants}>{booking.participants} participant{booking.participants !== 1 ? 's' : ''}</Text>
        <View style={[styles.paymentPill, { backgroundColor: getPaymentColor(booking.payment_status) + '20' }]}>
          <Text style={[styles.paymentText, { color: getPaymentColor(booking.payment_status) }]}>
            {booking.payment_status}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderDetailsModal = () => {
    if (!selectedBooking) return null;
    const b = selectedBooking;

    return (
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isWide && styles.modalContentWide]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Booking Details</Text>
                <Pressable style={styles.modalClose} onPress={() => setShowDetailsModal(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Reference</Text>
                <Text style={styles.detailValue}>#{b.booking_reference}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{b.experiences?.title || 'Unknown'}</Text>
                {isAdmin && b.experiences?.operators && (
                  <Text style={styles.detailSub}>by {b.experiences.operators.company_name}</Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(b.booking_date)}</Text>
                </View>
                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{b.booking_time}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>Participants</Text>
                  <Text style={styles.detailValue}>{b.participants}</Text>
                </View>
                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>Total Amount</Text>
                  <Text style={styles.detailValue}>{formatCurrency(b.total_amount, b.currency)}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Customer</Text>
                <Text style={styles.detailValue}>{b.customer_name}</Text>
                <Text style={styles.detailSub}>{b.customer_email}</Text>
                <Text style={styles.detailSub}>{b.customer_phone}</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusPill, { backgroundColor: getStatusColor(b.status) + '20', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(b.status) }]}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>Payment</Text>
                  <View style={[styles.paymentPill, { backgroundColor: getPaymentColor(b.payment_status) + '20', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.paymentText, { color: getPaymentColor(b.payment_status) }]}>
                      {b.payment_status}
                    </Text>
                  </View>
                </View>
              </View>

              {b.status !== 'cancelled' && b.status !== 'completed' && (
                <View style={styles.actionSection}>
                  <Text style={styles.detailLabel}>Actions</Text>
                  <View style={styles.actionButtons}>
                    {b.status === 'pending' && (
                      <Pressable
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={() => handleStatusUpdate(b.id, 'confirmed')}
                        disabled={updating}
                      >
                        <Text style={styles.actionButtonText}>{updating ? 'Updating...' : 'Confirm'}</Text>
                      </Pressable>
                    )}
                    {b.status === 'confirmed' && (
                      <Pressable
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={() => handleStatusUpdate(b.id, 'completed')}
                        disabled={updating}
                      >
                        <Text style={styles.actionButtonText}>{updating ? 'Updating...' : 'Mark Completed'}</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleStatusUpdate(b.id, 'cancelled')}
                      disabled={updating}
                    >
                      <Text style={styles.cancelButtonText}>{updating ? 'Updating...' : 'Cancel Booking'}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && bookings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.subtitle}>{filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { flex: 1 }]}
          placeholder="Search by reference, customer, experience..."
          placeholderTextColor={colors.dark.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable 
          style={[styles.filterToggleButton, showFiltersPanel && styles.filterToggleButtonActive]}
          onPress={() => setShowFiltersPanel(!showFiltersPanel)}
        >
          <Text style={styles.filterToggleText}>
            {showFiltersPanel ? '▲ Hide Filters' : '▼ Filters'}
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Text>
        </Pressable>
        {activeFilterCount > 0 && (
          <Pressable style={styles.clearAllButton} onPress={clearAllFilters}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </Pressable>
        )}
      </View>

      {showFiltersPanel && (
        <View style={styles.filtersPanel}>
          {/* Date Presets */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>Date Range</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              {renderFilterPill('All Time', 'all', datePreset, () => handleDatePresetChange('all'))}
              {renderFilterPill('Today', 'today', datePreset, () => handleDatePresetChange('today'))}
              {renderFilterPill('This Week', 'week', datePreset, () => handleDatePresetChange('week'))}
              {renderFilterPill('This Month', 'month', datePreset, () => handleDatePresetChange('month'))}
              {renderFilterPill('Last 30 Days', 'last30', datePreset, () => handleDatePresetChange('last30'))}
            </ScrollView>
            <View style={styles.customDateRow}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.filterLabelSmall}>From:</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.dark.textSecondary}
                  value={dateFrom}
                  onChangeText={(v) => handleCustomDateChange('from', v)}
                  maxLength={10}
                />
              </View>
              <View style={styles.dateInputContainer}>
                <Text style={styles.filterLabelSmall}>To:</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.dark.textSecondary}
                  value={dateTo}
                  onChangeText={(v) => handleCustomDateChange('to', v)}
                  maxLength={10}
                />
              </View>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              {renderFilterPill('All', 'all', statusFilter, () => setStatusFilter('all'))}
              {renderFilterPill('Pending', 'pending', statusFilter, () => setStatusFilter('pending'))}
              {renderFilterPill('Confirmed', 'confirmed', statusFilter, () => setStatusFilter('confirmed'))}
              {renderFilterPill('Completed', 'completed', statusFilter, () => setStatusFilter('completed'))}
              {renderFilterPill('Cancelled', 'cancelled', statusFilter, () => setStatusFilter('cancelled'))}
            </ScrollView>
          </View>

          {/* Payment Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>Payment Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              {renderFilterPill('All', 'all', paymentFilter, () => setPaymentFilter('all'))}
              {renderFilterPill('Pending', 'pending', paymentFilter, () => setPaymentFilter('pending'))}
              {renderFilterPill('Paid', 'paid', paymentFilter, () => setPaymentFilter('paid'))}
              {renderFilterPill('Refunded', 'refunded', paymentFilter, () => setPaymentFilter('refunded'))}
              {renderFilterPill('Failed', 'failed', paymentFilter, () => setPaymentFilter('failed'))}
            </ScrollView>
          </View>

          {/* Experience Filter */}
          {experiences.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Experience</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                {renderFilterPill('All', 'all', String(experienceFilter), () => setExperienceFilter('all'))}
                {experiences.map((exp) => (
                  renderFilterPill(
                    exp.title.length > 20 ? exp.title.substring(0, 20) + '...' : exp.title,
                    String(exp.id),
                    String(experienceFilter),
                    () => setExperienceFilter(exp.id)
                  )
                ))}
              </ScrollView>
            </View>
          )}

          {/* Operator Filter (Admin only) */}
          {isAdmin && operators.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Operator</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                {renderFilterPill('All', 'all', String(operatorFilter), () => setOperatorFilter('all'))}
                {operators.map((op) => (
                  renderFilterPill(op.company_name, String(op.id), String(operatorFilter), () => setOperatorFilter(op.id))
                ))}
              </ScrollView>
            </View>
          )}

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>Sort By</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              {renderFilterPill('Date ↓', 'date_desc', sortOption, () => setSortOption('date_desc'))}
              {renderFilterPill('Date ↑', 'date_asc', sortOption, () => setSortOption('date_asc'))}
              {renderFilterPill('Amount ↓', 'amount_desc', sortOption, () => setSortOption('amount_desc'))}
              {renderFilterPill('Amount ↑', 'amount_asc', sortOption, () => setSortOption('amount_asc'))}
              {renderFilterPill('Newest First', 'created_desc', sortOption, () => setSortOption('created_desc'))}
            </ScrollView>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.grid, isWide && styles.gridWide]}>
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No bookings found</Text>
              {activeFilterCount > 0 && (
                <Pressable style={styles.clearFiltersButton} onPress={clearAllFilters}>
                  <Text style={styles.clearFiltersText}>Clear filters to see all bookings</Text>
                </Pressable>
              )}
            </View>
          ) : (
            paginatedBookings.map(renderBookingCard)
          )}
        </View>
        
        {filteredBookings.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={filteredBookings.length}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </ScrollView>

      {renderDetailsModal()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['2xl'],
    color: colors.dark.text
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  searchInput: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.text,
    minWidth: 200
  },
  filterToggleButton: {
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  filterToggleButtonActive: {
    borderColor: colors.dark.primary,
    backgroundColor: `${colors.dark.primary}15`
  },
  filterToggleText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  clearAllText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.error
  },
  filtersPanel: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 16,
    marginBottom: 12,
    gap: 16
  },
  filterSection: {
    gap: 8
  },
  filterSectionLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8
  },
  filterLabelSmall: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },
  filtersRow: {
    marginBottom: 8
  },
  filtersScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dateFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dateInput: {
    backgroundColor: colors.dark.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.text,
    width: 120
  },
  clearDateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.dark.error + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.error
  },
  clearDateText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.dark.error
  },
  filterLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    marginRight: 4
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  filterPillActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary
  },
  filterPillText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },
  filterPillTextActive: {
    color: colors.dark.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary
  },
  errorBox: {
    backgroundColor: colors.dark.error + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  errorText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.error,
    flex: 1
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.dark.error,
    borderRadius: 8
  },
  retryButtonText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  listContainer: {
    flex: 1,
    marginTop: 8
  },
  grid: {
    gap: 12
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  bookingCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 16,
    minWidth: 320
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  bookingInfo: {
    flex: 1
  },
  bookingRef: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.primary
  },
  bookingExp: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.base,
    color: colors.dark.text,
    marginTop: 4
  },
  bookingCustomer: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    marginTop: 2
  },
  bookingMeta: {
    alignItems: 'flex-end'
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    textTransform: 'capitalize'
  },
  bookingAmount: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    color: colors.dark.text,
    marginTop: 8
  },
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    paddingTop: 12
  },
  bookingDate: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  bookingParticipants: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  paymentPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  paymentText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 12
  },
  emptyText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary
  },
  clearFiltersButton: {
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  clearFiltersText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.primary
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: colors.dark.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%'
  },
  modalContentWide: {
    maxWidth: 600
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xl,
    color: colors.dark.text
  },
  modalClose: {
    padding: 8
  },
  modalCloseText: {
    fontSize: 20,
    color: colors.dark.textSecondary
  },
  detailSection: {
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  detailHalf: {
    flex: 1
  },
  detailLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  detailValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  detailSub: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    marginTop: 2
  },
  actionSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmButton: {
    backgroundColor: colors.dark.success
  },
  completeButton: {
    backgroundColor: colors.dark.primary
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.dark.error
  },
  actionButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  cancelButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.error
  }
});
