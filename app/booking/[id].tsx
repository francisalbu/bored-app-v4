import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import colors from '@/constants/colors';
import { api } from '@/services/api';
import { useExperience } from '@/hooks/useApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TimeSlot {
  id: number;
  time: string;
  price: number;
  spotsAvailable: number;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  date: Date;
  dayName: string;
  slots: TimeSlot[];
}

// Format time from "10:00:00" to "10:00 AM"
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
};

// Format time range from start and end times
const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
};

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [adults, setAdults] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(true);
  const [availability, setAvailability] = useState<DaySchedule[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ schedule: DaySchedule; slot: TimeSlot } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  console.log('📅 Booking screen loaded with ID:', id, 'Type:', typeof id);

  // Always fetch from API
  const { experience, loading: isLoadingExperience, error } = useExperience(id || '');

  // Handle back navigation safely
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // If no history (came from share intent), go to home
      router.replace('/(tabs)');
    }
  };

  // Show loading or error as full screen with same background
  if (isLoadingExperience || !experience) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Select a time</Text>
          <View style={styles.closeButton} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {isLoadingExperience ? (
            <ActivityIndicator size="large" color={colors.dark.primary} />
          ) : (
            <>
              <Text style={styles.errorText}>Experience not found</Text>
              <Text style={[styles.errorText, { fontSize: 14, marginTop: 8 }]}>
                {error || `ID: ${id}`}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const handleCheckAvailability = async () => {
    if (!selectedDate) return;
    
    try {
      setIsLoading(true);
      
      const schedules: DaySchedule[] = [];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Load next 5 days starting from selected date
      for (let i = 0; i < 5; i++) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const response = await api.get<any>(
            `/availability/${parseInt(experience.id)}?date=${dateStr}`
          );
          
          console.log('📅 Availability for', dateStr, ':', response);
          
          if (response.success && response.data && response.data.length > 0) {
            const apiSlots = response.data;
            
            const slots: TimeSlot[] = apiSlots.map((slot: any) => ({
              id: slot.id,
              time: formatTimeRange(slot.start_time, slot.end_time),
              price: typeof experience.price === 'string' ? parseFloat(experience.price) : experience.price,
              spotsAvailable: slot.available_spots,
              startTime: slot.start_time,
              endTime: slot.end_time,
            }));
            
            schedules.push({
              date,
              dayName: dayNames[date.getDay()],
              slots,
            });
          }
        } catch (error) {
          console.error(`Error loading ${dateStr}:`, error);
        }
      }
      
      setAvailability(schedules);
      setShowCalendar(false);
      
      if (schedules.length === 0) {
        Alert.alert('No Availability', 'No time slots available for the next 5 days starting from selected date.');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      Alert.alert('Error', 'Failed to load availability. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isDateToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isPastDate = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return checkDate < today;
  };

  const handleDateSelect = (day: number) => {
    if (isPastDate(day)) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleSelectSlot = (schedule: DaySchedule, slot: TimeSlot) => {
    setSelectedSlot({ schedule, slot });
  };

  const handleBook = () => {
    if (selectedSlot) {
      // Validate that adults doesn't exceed available spots
      if (adults > selectedSlot.slot.spotsAvailable) {
        Alert.alert(
          'Not Enough Spots',
          `Sorry, only ${selectedSlot.slot.spotsAvailable} spot${selectedSlot.slot.spotsAvailable > 1 ? 's are' : ' is'} available for this time slot. Please select fewer guests or choose a different time.`
        );
        return;
      }

      router.push({
        pathname: '/booking/payment' as any,
        params: {
          experienceId: experience.id,
          slotId: selectedSlot.slot.id.toString(),
          date: selectedSlot.schedule.date.toISOString(),
          time: selectedSlot.slot.time,
          adults: adults.toString(),
          price: selectedSlot.slot.price.toString(),
        },
      });
    }
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            if (showCalendar) {
              router.back();
            } else {
              setShowCalendar(true);
              setAvailability([]);
              setSelectedSlot(null);
            }
          }} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Select a time</Text>
        {!showCalendar && (
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={colors.dark.text} />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {showCalendar ? (
          <>
            {/* Adults Counter */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <View>
                  <Text style={styles.adultsLabel}>{adults} adult{adults > 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.counter}>
                  <Pressable
                    onPress={() => setAdults(Math.max(1, adults - 1))}
                    style={styles.counterButton}
                  >
                    <Minus size={20} color={colors.dark.text} />
                  </Pressable>
                  <Text style={styles.counterValue}>{adults}</Text>
                  <Pressable
                    onPress={() => setAdults(Math.min(experience.maxGroupSize || 10, adults + 1))}
                    style={styles.counterButton}
                  >
                    <Plus size={20} color={colors.dark.text} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Calendar */}
            <View style={styles.section}>
              <View style={styles.calendarHeader}>
                <Text style={styles.monthLabel}>{formatMonth(currentMonth)}</Text>
                <Pressable style={styles.calendarIconButton}>
                  <CalendarIcon size={20} color={colors.dark.text} />
                </Pressable>
              </View>

              <View style={styles.calendarNavigation}>
                <Pressable onPress={handlePreviousMonth} style={styles.navButton}>
                  <ChevronLeft size={24} color={colors.dark.text} />
                </Pressable>
                <Text style={styles.monthText}>{formatMonth(currentMonth)}</Text>
                <Pressable onPress={handleNextMonth} style={styles.navButton}>
                  <ChevronRight size={24} color={colors.dark.text} />
                </Pressable>
              </View>

              <View style={styles.calendar}>
                <View style={styles.weekDays}>
                  {weekDays.map((day) => (
                    <Text key={day} style={styles.weekDay}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={styles.daysGrid}>
                  {days.map((day, index) => (
                    <Pressable
                      key={index}
                      style={[
                        styles.dayCell,
                        day === null && styles.dayCellEmpty,
                        day !== null && isDateSelected(day) && styles.dayCellSelected,
                        day !== null && isDateToday(day) && !isDateSelected(day) && styles.dayCellToday,
                        day !== null && isPastDate(day) && styles.dayCellPast,
                      ]}
                      onPress={() => day && handleDateSelect(day)}
                      disabled={!day || isPastDate(day)}
                    >
                      {day && (
                        <Text
                          style={[
                            styles.dayText,
                            isDateSelected(day) && styles.dayTextSelected,
                            isPastDate(day) && styles.dayTextPast,
                          ]}
                        >
                          {day}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Check Availability Button */}
            <Pressable
              style={[styles.checkButton, (!selectedDate || isLoading) && styles.checkButtonDisabled]}
              onPress={handleCheckAvailability}
              disabled={!selectedDate || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.dark.background} />
              ) : (
                <Text style={styles.checkButtonText}>Check availability</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {/* Selected Info */}
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedInfoText}>{adults} adult{adults > 1 ? 's' : ''}</Text>
            </View>

            {/* Availability List */}
            {availability.map((schedule, scheduleIndex) => (
              <View key={scheduleIndex} style={styles.daySection}>
                <Text style={styles.dayTitle}>
                  {schedule.dayName}, {schedule.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </Text>
                {schedule.slots.map((slot, slotIndex) => (
                  <Pressable
                    key={slotIndex}
                    style={[
                      styles.slotCard,
                      selectedSlot?.schedule === schedule &&
                        selectedSlot?.slot === slot &&
                        styles.slotCardSelected,
                    ]}
                    onPress={() => handleSelectSlot(schedule, slot)}
                  >
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotTime}>{slot.time}</Text>
                      <Text style={styles.slotPrice}>
                        €{slot.price} / guest
                      </Text>
                    </View>
                    <Text style={styles.slotSpots}>
                      {slot.spotsAvailable} spot{slot.spotsAvailable > 1 ? 's' : ''} available
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
            
            {/* Spacer for fixed button */}
            {selectedSlot && <View style={{ height: 100 }} />}
          </>
        )}
      </ScrollView>

      {/* Fixed Continue Button */}
      {!showCalendar && selectedSlot && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable style={styles.bookButton} onPress={handleBook}>
            <Text style={styles.bookButtonText}>Continue - €{selectedSlot.slot.price * adults}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.dark.text,
    flex: 1,
    textAlign: 'center' as const,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomColor: colors.dark.border,
    backgroundColor: colors.dark.backgroundTertiary,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adultsLabel: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.dark.text,
    marginBottom: 4,
  },
  addChildren: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textDecorationLine: 'underline' as const,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: colors.dark.text,
    minWidth: 40,
    textAlign: 'center' as const,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  calendarIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  calendar: {
    backgroundColor: colors.dark.backgroundTertiary,
    borderRadius: 12,
    padding: 16,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDay: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.dark.textSecondary,
    flex: 1,
    textAlign: 'center' as const,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayCellSelected: {
    backgroundColor: colors.dark.primary,
    borderRadius: 100,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.dark.primary,
    borderRadius: 100,
  },
  dayCellPast: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.dark.text,
  },
  dayTextSelected: {
    color: colors.dark.background,
    fontWeight: '700' as const,
  },
  dayTextPast: {
    color: colors.dark.textTertiary,
  },
  checkButton: {
    margin: 16,
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkButtonDisabled: {
    backgroundColor: colors.dark.backgroundTertiary,
    opacity: 0.5,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  selectedInfo: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  selectedInfoText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  daySection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginBottom: 16,
  },
  slotCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  slotCardSelected: {
    borderColor: colors.dark.primary,
    backgroundColor: '#2a2a2a',
  },
  slotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotTime: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: colors.dark.text,
    letterSpacing: 0.3,
  },
  slotPrice: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: colors.dark.primary,
  },
  slotSpots: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.dark.textSecondary,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  bookButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    marginTop: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
    marginTop: 32,
  },
});
