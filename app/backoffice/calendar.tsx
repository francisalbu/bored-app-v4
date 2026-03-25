import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface CalendarBooking {
  id: number;
  reference: string;
  time: string;
  customer: string;
  experience: string;
  participants: number;
  amount: number;
  currency: string;
  status: string;
}

interface CalendarDay {
  date: string;
  bookings: CalendarBooking[];
  isBlocked: boolean;
  blockedReason?: string;
  totalRevenue: number;
  totalParticipants: number;
}

interface BlockedDate {
  id: number;
  date: string;
  reason: string;
  experience_id?: number;
}

interface Experience {
  id: number;
  title: string;
}

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [summary, setSummary] = useState({ totalBookings: 0, totalRevenue: 0, blockedDays: 0 });
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Modals
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);

  // Block date form
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Reschedule form
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    console.log('📅 Calendar useEffect - isAuthenticated:', isAuthenticated, 'user:', user?.email);
    if (isAuthenticated && user) {
      loadExperiences();
      loadCalendar();
      setInitialized(true);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && initialized) {
      loadCalendar();
    }
  }, [currentDate, viewMode, selectedExperience]);

  const loadExperiences = async () => {
    try {
      const res = await api.getBackofficeExperiences();
      if (res.success && res.data) {
        setExperiences(res.data.map((e: any) => ({ id: e.id, title: e.title })));
      }
    } catch (error) {
      console.error('Error loading experiences:', error);
    }
  };

  const loadCalendar = async () => {
    console.log('📅 loadCalendar called');
    setLoading(true);
    try {
      const { fromDate, toDate } = getDateRange();
      console.log('📅 Fetching calendar:', fromDate, toDate);
      const res = await api.getCalendar({
        from_date: fromDate,
        to_date: toDate,
        experience_id: selectedExperience || undefined,
      });
      console.log('📅 Calendar response:', res);

      if (res.success && res.data) {
        setCalendarDays(res.data.days || []);
        setSummary(res.data.summary || { totalBookings: 0, totalRevenue: 0, blockedDays: 0 });
      } else {
        // No data or error - set empty state
        setCalendarDays([]);
        setSummary({ totalBookings: 0, totalRevenue: 0, blockedDays: 0 });
      }
    } catch (error) {
      console.error('❌ Error loading calendar:', error);
      // On error, set empty state
      setCalendarDays([]);
      setSummary({ totalBookings: 0, totalRevenue: 0, blockedDays: 0 });
    } finally {
      console.log('📅 Calendar loading complete');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDateRange = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        fromDate: firstDay.toISOString().split('T')[0],
        toDate: lastDay.toISOString().split('T')[0],
      };
    } else if (viewMode === 'week') {
      const dayOfWeek = currentDate.getDay();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return {
        fromDate: startOfWeek.toISOString().split('T')[0],
        toDate: endOfWeek.toISOString().split('T')[0],
      };
    } else {
      const dateStr = currentDate.toISOString().split('T')[0];
      return { fromDate: dateStr, toDate: dateStr };
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCalendar();
  };

  const handleDayPress = (day: CalendarDay) => {
    setSelectedDay(day);
    setShowDayModal(true);
  };

  const handleBlockDate = async () => {
    if (!blockDate) {
      Alert.alert('Error', 'Please enter a date');
      return;
    }

    try {
      const res = await api.blockDate(blockDate, blockReason || 'Blocked', selectedExperience || undefined);
      if (res.success) {
        Alert.alert('Success', 'Date blocked successfully');
        setShowBlockModal(false);
        setBlockDate('');
        setBlockReason('');
        loadCalendar();
      } else {
        Alert.alert('Error', res.error || 'Failed to block date');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to block date');
    }
  };

  const handleUnblockDate = async (dayDate: string) => {
    // Find the blocked date entry
    const res = await api.getBlockedDates({ from_date: dayDate, to_date: dayDate });
    if (res.success && res.data?.length > 0) {
      const blockedEntry = res.data[0];
      const unblockRes = await api.unblockDate(blockedEntry.id);
      if (unblockRes.success) {
        Alert.alert('Success', 'Date unblocked');
        setShowDayModal(false);
        loadCalendar();
      }
    }
  };

  const handleReschedule = async () => {
    if (!selectedBooking || !newDate) {
      Alert.alert('Error', 'Please enter a new date');
      return;
    }

    try {
      const res = await api.rescheduleBooking(selectedBooking.id, newDate, newTime || undefined);
      if (res.success) {
        Alert.alert('Success', 'Booking rescheduled successfully');
        setShowRescheduleModal(false);
        setShowDayModal(false);
        setSelectedBooking(null);
        setNewDate('');
        setNewTime('');
        loadCalendar();
      } else {
        Alert.alert('Error', res.error || 'Failed to reschedule booking');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reschedule booking');
    }
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (string | null)[] = [];
    
    // Empty days before first day of month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push(dateStr);
    }

    return days;
  };

  const getWeekDays = () => {
    const days: string[] = [];
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day.toISOString().split('T')[0]);
    }

    return days;
  };

  const getDayData = (dateStr: string): CalendarDay | undefined => {
    return calendarDays.find(d => d.date === dateStr);
  };

  const formatMonthYear = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const formatWeekRange = () => {
    const days = getWeekDays();
    const start = new Date(days[0]);
    const end = new Date(days[6]);
    const format = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${format(start)} - ${format(end)}`;
  };

  const renderMonthView = () => {
    const days = getMonthDays();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().toISOString().split('T')[0];

    return (
      <View style={styles.monthGrid}>
        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {dayNames.map(name => (
            <View key={name} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{name}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.daysGrid}>
          {days.map((dateStr, idx) => {
            if (!dateStr) {
              return <View key={`empty-${idx}`} style={styles.dayCell} />;
            }

            const dayData = getDayData(dateStr);
            const isToday = dateStr === today;
            const hasBookings = dayData && dayData.bookings.length > 0;
            const isBlocked = dayData?.isBlocked;
            const dayNum = parseInt(dateStr.split('-')[2], 10);

            return (
              <TouchableOpacity
                key={dateStr}
                style={[
                  styles.dayCell,
                  isToday && styles.dayCellToday,
                  isBlocked && styles.dayCellBlocked,
                ]}
                onPress={() => dayData && handleDayPress(dayData)}
              >
                <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{dayNum}</Text>
                {hasBookings && (
                  <View style={styles.bookingDots}>
                    <View style={[styles.dot, styles.dotBlue]} />
                    <Text style={styles.bookingCount}>{dayData.bookings.length}</Text>
                  </View>
                )}
                {dayData && dayData.totalRevenue > 0 && (
                  <Text style={styles.dayRevenue}>€{Math.round(dayData.totalRevenue)}</Text>
                )}
                {isBlocked && (
                  <MaterialIcons name="block" size={14} color="#EF4444" style={styles.blockedIcon} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const days = getWeekDays();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().toISOString().split('T')[0];

    return (
      <View style={styles.weekView}>
        {days.map((dateStr, idx) => {
          const dayData = getDayData(dateStr);
          const isToday = dateStr === today;
          const dayNum = parseInt(dateStr.split('-')[2], 10);

          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.weekDay, isToday && styles.weekDayToday, dayData?.isBlocked && styles.weekDayBlocked]}
              onPress={() => dayData && handleDayPress(dayData)}
            >
              <View style={styles.weekDayHeader}>
                <Text style={styles.weekDayName}>{dayNames[idx]}</Text>
                <Text style={[styles.weekDayNum, isToday && styles.weekDayNumToday]}>{dayNum}</Text>
              </View>
              
              {dayData?.isBlocked && (
                <View style={styles.blockedBanner}>
                  <MaterialIcons name="block" size={14} color="#EF4444" />
                  <Text style={styles.blockedText}>{dayData.blockedReason || 'Blocked'}</Text>
                </View>
              )}

              <ScrollView style={styles.weekDayBookings}>
                {dayData?.bookings.map(booking => (
                  <View key={booking.id} style={styles.weekBooking}>
                    <Text style={styles.weekBookingTime}>{booking.time || '--:--'}</Text>
                    <View style={styles.weekBookingDetails}>
                      <Text style={styles.weekBookingExp} numberOfLines={1}>{booking.experience}</Text>
                      <Text style={styles.weekBookingCustomer}>{booking.customer}</Text>
                    </View>
                    <View style={[styles.statusBadge, getStatusStyle(booking.status)]}>
                      <Text style={styles.statusText}>{booking.status}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderDayView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayData = getDayData(dateStr);
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
      <View style={styles.dayView}>
        <Text style={styles.dayViewTitle}>{dayName}</Text>

        {dayData?.isBlocked && (
          <View style={styles.blockedBannerLarge}>
            <MaterialIcons name="block" size={20} color="#EF4444" />
            <Text style={styles.blockedTextLarge}>{dayData.blockedReason || 'This day is blocked'}</Text>
            <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblockDate(dateStr)}>
              <Text style={styles.unblockBtnText}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.daySummary}>
          <View style={styles.daySummaryItem}>
            <Text style={styles.daySummaryValue}>{dayData?.bookings.length || 0}</Text>
            <Text style={styles.daySummaryLabel}>Bookings</Text>
          </View>
          <View style={styles.daySummaryItem}>
            <Text style={styles.daySummaryValue}>{dayData?.totalParticipants || 0}</Text>
            <Text style={styles.daySummaryLabel}>Participants</Text>
          </View>
          <View style={styles.daySummaryItem}>
            <Text style={styles.daySummaryValue}>€{dayData?.totalRevenue?.toLocaleString() || 0}</Text>
            <Text style={styles.daySummaryLabel}>Revenue</Text>
          </View>
        </View>

        <ScrollView style={styles.dayBookingsList}>
          {dayData?.bookings.length === 0 && (
            <View style={styles.emptyDay}>
              <MaterialIcons name="event-available" size={48} color="#D1D5DB" />
              <Text style={styles.emptyDayText}>No bookings for this day</Text>
            </View>
          )}

          {dayData?.bookings.map(booking => (
            <View key={booking.id} style={styles.dayBookingCard}>
              <View style={styles.dayBookingHeader}>
                <View style={styles.dayBookingTime}>
                  <MaterialIcons name="access-time" size={16} color="#6366F1" />
                  <Text style={styles.dayBookingTimeText}>{booking.time || 'Time TBD'}</Text>
                </View>
                <View style={[styles.statusBadgeLarge, getStatusStyle(booking.status)]}>
                  <Text style={styles.statusTextLarge}>{booking.status}</Text>
                </View>
              </View>
              <Text style={styles.dayBookingExp}>{booking.experience}</Text>
              <View style={styles.dayBookingInfo}>
                <View style={styles.dayBookingInfoItem}>
                  <MaterialIcons name="person" size={14} color="#6B7280" />
                  <Text style={styles.dayBookingInfoText}>{booking.customer}</Text>
                </View>
                <View style={styles.dayBookingInfoItem}>
                  <MaterialIcons name="group" size={14} color="#6B7280" />
                  <Text style={styles.dayBookingInfoText}>{booking.participants} pax</Text>
                </View>
                <View style={styles.dayBookingInfoItem}>
                  <MaterialIcons name="euro" size={14} color="#6B7280" />
                  <Text style={styles.dayBookingInfoText}>{booking.amount}</Text>
                </View>
              </View>
              <View style={styles.dayBookingActions}>
                <TouchableOpacity 
                  style={styles.rescheduleBtn}
                  onPress={() => {
                    setSelectedBooking(booking);
                    setShowRescheduleModal(true);
                  }}
                >
                  <MaterialIcons name="edit-calendar" size={16} color="#6366F1" />
                  <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return { backgroundColor: '#D1FAE5' };
      case 'completed': return { backgroundColor: '#DBEAFE' };
      case 'pending': return { backgroundColor: '#FEF3C7' };
      case 'cancelled': return { backgroundColor: '#FEE2E2' };
      default: return { backgroundColor: '#F3F4F6' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.blockBtn} onPress={() => setShowBlockModal(true)}>
            <MaterialIcons name="block" size={18} color="#fff" />
            <Text style={styles.blockBtnText}>Block Date</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Toggle & Navigation */}
      <View style={styles.controls}>
        <View style={styles.viewModes}>
          {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.viewModeBtn, viewMode === mode && styles.viewModeBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.navigation}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigateDate('prev')}>
            <MaterialIcons name="chevron-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>
            {viewMode === 'month' ? formatMonthYear() : 
             viewMode === 'week' ? formatWeekRange() : 
             currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigateDate('next')}>
            <MaterialIcons name="chevron-right" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Experience Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.experienceFilter}>
        <TouchableOpacity
          style={[styles.expFilterBtn, !selectedExperience && styles.expFilterBtnActive]}
          onPress={() => setSelectedExperience(null)}
        >
          <Text style={[styles.expFilterText, !selectedExperience && styles.expFilterTextActive]}>All Experiences</Text>
        </TouchableOpacity>
        {experiences.map(exp => (
          <TouchableOpacity
            key={exp.id}
            style={[styles.expFilterBtn, selectedExperience === exp.id && styles.expFilterBtnActive]}
            onPress={() => setSelectedExperience(exp.id)}
          >
            <Text style={[styles.expFilterText, selectedExperience === exp.id && styles.expFilterTextActive]} numberOfLines={1}>
              {exp.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.totalBookings}</Text>
          <Text style={styles.summaryLabel}>Bookings</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>€{summary.totalRevenue.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{summary.blockedDays}</Text>
          <Text style={styles.summaryLabel}>Blocked</Text>
        </View>
      </View>

      {/* Calendar Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}
      </ScrollView>

      {/* Day Details Modal */}
      <Modal visible={showDayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDay?.date ? new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', month: 'long', day: 'numeric' 
                }) : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowDayModal(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedDay?.isBlocked && (
              <View style={styles.modalBlocked}>
                <MaterialIcons name="block" size={18} color="#EF4444" />
                <Text style={styles.modalBlockedText}>{selectedDay.blockedReason || 'Blocked'}</Text>
                <TouchableOpacity 
                  style={styles.modalUnblockBtn}
                  onPress={() => handleUnblockDate(selectedDay.date)}
                >
                  <Text style={styles.modalUnblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalSummary}>
              <View style={styles.modalSummaryItem}>
                <Text style={styles.modalSummaryValue}>{selectedDay?.bookings.length || 0}</Text>
                <Text style={styles.modalSummaryLabel}>Bookings</Text>
              </View>
              <View style={styles.modalSummaryItem}>
                <Text style={styles.modalSummaryValue}>{selectedDay?.totalParticipants || 0}</Text>
                <Text style={styles.modalSummaryLabel}>Participants</Text>
              </View>
              <View style={styles.modalSummaryItem}>
                <Text style={styles.modalSummaryValue}>€{selectedDay?.totalRevenue?.toLocaleString() || 0}</Text>
                <Text style={styles.modalSummaryLabel}>Revenue</Text>
              </View>
            </View>

            <ScrollView style={styles.modalBookingsList}>
              {selectedDay?.bookings.map(booking => (
                <View key={booking.id} style={styles.modalBooking}>
                  <View style={styles.modalBookingLeft}>
                    <Text style={styles.modalBookingTime}>{booking.time || '--:--'}</Text>
                  </View>
                  <View style={styles.modalBookingCenter}>
                    <Text style={styles.modalBookingExp}>{booking.experience}</Text>
                    <Text style={styles.modalBookingCustomer}>{booking.customer}</Text>
                    <Text style={styles.modalBookingDetails}>{booking.participants} pax • €{booking.amount}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalRescheduleBtn}
                    onPress={() => {
                      setSelectedBooking(booking);
                      setShowRescheduleModal(true);
                    }}
                  >
                    <MaterialIcons name="edit-calendar" size={18} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Block Date Modal */}
      <Modal visible={showBlockModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Block Date</Text>
              <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2024-12-25"
                value={blockDate}
                onChangeText={setBlockDate}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Reason (optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Holiday, Maintenance"
                value={blockReason}
                onChangeText={setBlockReason}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBlockModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleBlockDate}>
                <Text style={styles.confirmBtnText}>Block Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={showRescheduleModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Booking</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <View style={styles.rescheduleInfo}>
                <Text style={styles.rescheduleExp}>{selectedBooking.experience}</Text>
                <Text style={styles.rescheduleCustomer}>{selectedBooking.customer}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>New Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2024-12-20"
                value={newDate}
                onChangeText={setNewDate}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>New Time (optional, HH:MM)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="14:00"
                value={newTime}
                onChangeText={setNewTime}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRescheduleModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleReschedule}>
                <Text style={styles.confirmBtnText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CFFF04',
  },
  todayBtnText: {
    color: '#CFFF04',
    fontWeight: '600',
  },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  blockBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#000000',
  },
  viewModes: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 2,
  },
  viewModeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewModeBtnActive: {
    backgroundColor: '#CFFF04',
  },
  viewModeText: {
    fontSize: 13,
    color: '#6B7280',
  },
  viewModeTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    minWidth: 150,
    textAlign: 'center',
  },
  experienceFilter: {
    backgroundColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    maxHeight: 44,
  },
  expFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
  },
  expFilterBtnActive: {
    backgroundColor: '#CFFF04',
  },
  expFilterText: {
    fontSize: 12,
    color: '#6B7280',
    maxWidth: 100,
  },
  expFilterTextActive: {
    color: '#000000',
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#CFFF04',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  monthGrid: {
    padding: 8,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  dayCellToday: {
    borderColor: '#CFFF04',
    borderWidth: 2,
    backgroundColor: '#422006',
  },
  dayCellBlocked: {
    backgroundColor: '#450a0a',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dayNumToday: {
    color: '#CFFF04',
    fontWeight: 'bold',
  },
  bookingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 3,
  },
  dotBlue: {
    backgroundColor: '#CFFF04',
  },
  bookingCount: {
    fontSize: 9,
    color: '#CFFF04',
    fontWeight: '600',
  },
  dayRevenue: {
    fontSize: 8,
    color: '#CFFF04',
    marginTop: 2,
  },
  blockedIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  weekView: {
    padding: 8,
    flexDirection: 'row',
    gap: 6,
  },
  weekDay: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 280,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  weekDayToday: {
    borderWidth: 2,
    borderColor: '#CFFF04',
  },
  weekDayBlocked: {
    backgroundColor: '#450a0a',
  },
  weekDayHeader: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  weekDayName: {
    fontSize: 10,
    color: '#6B7280',
  },
  weekDayNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  weekDayNumToday: {
    color: '#CFFF04',
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    backgroundColor: '#450a0a',
  },
  blockedText: {
    fontSize: 9,
    color: '#FCA5A5',
  },
  weekDayBookings: {
    flex: 1,
    padding: 4,
  },
  weekBooking: {
    padding: 5,
    marginBottom: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#CFFF04',
  },
  weekBookingTime: {
    fontSize: 9,
    fontWeight: '600',
    color: '#CFFF04',
  },
  weekBookingDetails: {
    marginTop: 2,
  },
  weekBookingExp: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  weekBookingCustomer: {
    fontSize: 9,
    color: '#6B7280',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dayView: {
    padding: 12,
  },
  dayViewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  blockedBannerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#450a0a',
    borderRadius: 8,
    marginBottom: 16,
  },
  blockedTextLarge: {
    flex: 1,
    fontSize: 14,
    color: '#FCA5A5',
  },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0a0a0a',
    borderRadius: 4,
  },
  unblockBtnText: {
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '600',
  },
  daySummary: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  daySummaryItem: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  daySummaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#CFFF04',
  },
  daySummaryLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  dayBookingsList: {
    flex: 1,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyDayText: {
    marginTop: 12,
    color: '#6B7280',
  },
  dayBookingCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  dayBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayBookingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayBookingTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CFFF04',
  },
  statusBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextLarge: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dayBookingExp: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  dayBookingInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  dayBookingInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayBookingInfoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  dayBookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CFFF04',
  },
  rescheduleBtnText: {
    fontSize: 13,
    color: '#CFFF04',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalContentSmall: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    margin: 20,
    marginTop: 'auto',
    marginBottom: 'auto',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBlocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    padding: 12,
    backgroundColor: '#450a0a',
    borderRadius: 8,
  },
  modalBlockedText: {
    flex: 1,
    color: '#FCA5A5',
  },
  modalUnblockBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#000000',
    borderRadius: 4,
  },
  modalUnblockText: {
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '600',
  },
  modalSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalSummaryItem: {
    alignItems: 'center',
  },
  modalSummaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CFFF04',
  },
  modalSummaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalBookingsList: {
    maxHeight: 300,
    padding: 16,
  },
  modalBooking: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalBookingLeft: {
    width: 60,
  },
  modalBookingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CFFF04',
  },
  modalBookingCenter: {
    flex: 1,
  },
  modalBookingExp: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalBookingCustomer: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalBookingDetails: {
    fontSize: 12,
    color: '#4B5563',
  },
  modalRescheduleBtn: {
    padding: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#000000',
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#CFFF04',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  rescheduleInfo: {
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 16,
  },
  rescheduleExp: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rescheduleCustomer: {
    fontSize: 13,
    color: '#6B7280',
  },
});
