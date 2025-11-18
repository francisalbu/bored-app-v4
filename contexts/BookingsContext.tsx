/**
 * Bookings Context
 * 
 * Manages user bookings with automatic data clearing on logout
 * Features:
 * - Fetch user bookings on login
 * - Clear bookings on logout
 * - Real-time booking management (create, update, cancel, delete)
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

export interface Booking {
  id: number;
  booking_reference: string;
  user_id: number;
  experience_id: number;
  slot_id: number;
  booking_date: string;
  booking_time: string;
  participants: number;
  total_amount: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: string;
  created_at: string;
  updated_at: string;
  // Joined data
  experience_title?: string;
  experience_image?: string;
  experience_video?: string;
  experience_location?: string;
  experience_duration?: string;
  experience_price?: number;
  slot_date?: string;
  slot_start_time?: string;
  slot_end_time?: string;
}

export interface AvailabilitySlot {
  id: number;
  experience_id: number;
  date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  booked_participants: number;
  available_spots: number;
  is_available: boolean;
}

interface BookingsContextType {
  bookings: Booking[];
  upcomingBookings: Booking[];
  pastBookings: Booking[];
  isLoading: boolean;
  error: string | null;
  refreshBookings: () => Promise<void>;
  createBooking: (
    bookingData: {
      experience_id: number;
      slot_id: number;
      participants: number;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
    }
  ) => Promise<{ success: boolean; data?: Booking; error?: string }>;
  updateBooking: (
    bookingId: number,
    updates: {
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
    }
  ) => Promise<{ success: boolean; data?: Booking; error?: string }>;
  cancelBooking: (bookingId: number) => Promise<{ success: boolean; error?: string }>;
  deleteBooking: (bookingId: number) => Promise<{ success: boolean; error?: string }>;
  getAvailabilitySlots: (experienceId: number, date?: string) => Promise<AvailabilitySlot[]>;
}

const BookingsContext = createContext<BookingsContextType | undefined>(undefined);

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically fetch bookings when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshBookings();
    } else {
      // Clear bookings when user logs out
      setBookings([]);
      setError(null);
    }
  }, [isAuthenticated, user]);

  const refreshBookings = async () => {
    if (!isAuthenticated) {
      console.log('🚫 Not authenticated, clearing bookings');
      setBookings([]);
      return;
    }

    try {
      console.log('🔄 Refreshing bookings for user:', user?.email);
      setIsLoading(true);
      setError(null);
      const response = await api.get<Booking[]>('/bookings');

      console.log('📦 Bookings API Response:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
        fullResponse: response
      });

      if (response.success && response.data) {
        // Response.data is already the array of bookings
        const bookingsData = Array.isArray(response.data) ? response.data : [];
        console.log(`✅ Setting ${bookingsData.length} bookings in state`);
        setBookings(bookingsData);
      } else {
        throw new Error(response.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bookings';
      
      // Don't show error if it's just an auth issue - user might not be logged in
      if (!errorMessage.includes('Invalid or expired token')) {
        console.error('❌ Error fetching bookings:', err);
        setError(errorMessage);
      } else {
        console.log('ℹ️ Auth token invalid, user needs to login');
      }
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createBooking = async (
    bookingData: {
      experience_id: number;
      slot_id: number;
      participants: number;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
    }
  ) => {
    try {
      setError(null);
      
      const response = await api.post<any>(
        '/bookings',
        bookingData
      );

      if (response.success && response.data) {
        // Add new booking to state
        // Backend returns { success, message, data: booking }
        const newBooking = response.data as Booking;
        
        // Ensure booking has required fields before adding to state
        if (newBooking && newBooking.id) {
          setBookings((prev) => [newBooking, ...prev]);
          return { success: true, data: newBooking };
        }
      }

      throw new Error(response.error || 'Failed to create booking');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create booking';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateBooking = async (
    bookingId: number,
    updates: {
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
    }
  ) => {
    try {
      setError(null);
      const response = await api.put<{ success: boolean; data: Booking; message: string }>(
        `/bookings/${bookingId}`,
        updates
      );

      if (response.success && response.data) {
        // Update booking in state
        const updatedBooking = response.data.data;
        setBookings((prev) =>
          prev.map((booking) => (booking.id === bookingId ? updatedBooking : booking))
        );
        return { success: true, data: updatedBooking };
      }

      throw new Error(response.error || 'Failed to update booking');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update booking';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const cancelBooking = async (bookingId: number) => {
    try {
      setError(null);
      const response = await api.put<{ success: boolean; data: Booking; message: string }>(
        `/bookings/${bookingId}/cancel`,
        {}
      );

      if (response.success && response.data) {
        // Update booking status in state
        const cancelledBooking = response.data.data;
        setBookings((prev) =>
          prev.map((booking) => (booking.id === bookingId ? cancelledBooking : booking))
        );
        return { success: true };
      }

      throw new Error(response.error || 'Failed to cancel booking');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel booking';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteBooking = async (bookingId: number) => {
    try {
      setError(null);
      const response = await api.delete<{ success: boolean; message: string }>(
        `/bookings/${bookingId}`
      );

      if (response.success) {
        // Remove booking from state
        setBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
        return { success: true };
      }

      throw new Error(response.error || 'Failed to delete booking');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete booking';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const getAvailabilitySlots = async (
    experienceId: number,
    date?: string
  ): Promise<AvailabilitySlot[]> => {
    try {
      const url = date
        ? `/availability/${experienceId}?date=${date}`
        : `/availability/${experienceId}`;

      const response = await api.get<{
        success: boolean;
        count: number;
        data: AvailabilitySlot[];
      }>(url);

      if (response.success && response.data) {
        return response.data.data || [];
      }

      throw new Error(response.error || 'Failed to fetch availability');
    } catch (err) {
      console.error('Error fetching availability:', err);
      return [];
    }
  };

  // Separate bookings into upcoming and past
  const now = new Date();
  const upcomingBookings = bookings.filter((booking) => {
    if (!booking) return false;
    if (booking.status === 'cancelled') return false;
    
    // Check if the activity end time has passed
    // An activity is "upcoming" if the end time hasn't been reached yet
    // Example: Activity ends at 12:00 → at 12:00:00 it's still upcoming, at 12:00:01 it's past
    const bookingDate = booking.slot_date || booking.booking_date;
    const endTime = booking.slot_end_time || '23:59:59';
    const activityEndDateTime = new Date(`${bookingDate}T${endTime}`);
    
    // Activity is upcoming if we haven't passed the end time yet
    return activityEndDateTime >= now;
  });

  const pastBookings = bookings.filter((booking) => {
    if (!booking) return false;
    if (booking.status === 'cancelled') return true;
    
    // Check if the activity end time has passed
    // An activity is "past" once the end time has been exceeded
    // Example: Activity ends at 12:00 → at 12:00:00 it's still upcoming, at 12:00:01 it's past
    const bookingDate = booking.slot_date || booking.booking_date;
    const endTime = booking.slot_end_time || '23:59:59';
    const activityEndDateTime = new Date(`${bookingDate}T${endTime}`);
    
    // Activity is past if the end time has been exceeded
    return activityEndDateTime < now;
  });

  return (
    <BookingsContext.Provider
      value={{
        bookings,
        upcomingBookings,
        pastBookings,
        isLoading,
        error,
        refreshBookings,
        createBooking,
        updateBooking,
        cancelBooking,
        deleteBooking,
        getAvailabilitySlots,
      }}
    >
      {children}
    </BookingsContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingsContext);
  if (context === undefined) {
    throw new Error('useBookings must be used within a BookingsProvider');
  }
  return context;
}
