// API Configuration
// Use local server in dev, Render.com in production
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
);
const isDev = __DEV__ || process.env.NODE_ENV === 'development' || isLocalhost;

// FORCE LOCAL FOR TESTING - REMOVE AFTER DEBUG
const FORCE_LOCAL = true;

const API_BASE_URL = (isDev || FORCE_LOCAL)
  ? 'http://localhost:3000/api'
  : 'https://bored-tourist-api.onrender.com/api';

console.log('🔧 API Config - isDev:', isDev, 'isLocalhost:', isLocalhost, 'FORCE_LOCAL:', FORCE_LOCAL, 'URL:', API_BASE_URL);

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  clearAuthToken() {
    this.token = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      console.log('🔑 Auth token present:', this.token.substring(0, 20) + '...');
    } else {
      console.log('⚠️ No auth token set!');
    }

    const maxRetries = 3;
    const timeoutMs = 120000; // 120 seconds for Render cold starts

    try {
      console.log(`🌐 API Request (attempt ${retryCount + 1}/${maxRetries + 1}):`, `${this.baseURL}${endpoint}`, options.method || 'GET');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      console.log('API Response status:', response.status);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text.substring(0, 200));
        return {
          success: false,
          error: `Server error (${response.status}). The API may be starting up. Please try again in a moment.`,
        };
      }

      const data = await response.json();
      console.log('API Response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'An error occurred',
        };
      }

      // Backend already returns {success, data, ...}, so just return it directly
      return data;
    } catch (error) {
      console.error('API Error:', error);
      
      // Retry logic for timeouts (Render cold start)
      if (error instanceof Error && error.name === 'AbortError' && retryCount < maxRetries) {
        console.log(`⏳ Request timed out, retrying (${retryCount + 1}/${maxRetries})... Server may be waking up.`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
        return this.request<T>(endpoint, options, retryCount + 1);
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'The server is taking too long to respond. It may be starting up (this can take 1-2 minutes on first request). Please wait a moment and pull down to refresh.',
        };
      }
      
      // Retry for network errors
      if (error instanceof Error && error.message.includes('Network request failed') && retryCount < maxRetries) {
        console.log(`🔄 Network error, retrying (${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return this.request<T>(endpoint, options, retryCount + 1);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth APIs
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Experience APIs
  async getExperiences(params?: {
    category?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }) {
    const queryString = params 
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    return this.request(`/experiences${queryString}`);
  }

  async getExperience(id: string) {
    return this.request(`/experiences/${id}`);
  }

  async getExperienceAvailability(id: string, date: string) {
    return this.request(`/availability/${id}?date=${date}`);
  }

  /**
   * Get all experiences that have available slots for a date/period
   * Used for Today/Tomorrow/This Week filters
   */
  async getAvailableExperiences(params: {
    date?: string;      // For today or tomorrow (YYYY-MM-DD)
    from?: string;      // For this week range start
    to?: string;        // For this week range end
    minBuffer?: number; // Minimum minutes from now (default 120 = 2h)
  }) {
    const queryParams = new URLSearchParams();
    if (params.date) queryParams.append('date', params.date);
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.minBuffer) queryParams.append('minBuffer', params.minBuffer.toString());
    
    return this.request(`/experiences/available?${queryParams.toString()}`);
  }

  async getTrendingExperiences() {
    return this.request('/experiences/trending');
  }

  // Booking APIs
  async createBooking(bookingData: {
    experienceId: string;
    date: string;
    time: string;
    participants: number;
    totalAmount: number;
  }) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getMyBookings() {
    return this.request('/bookings');
  }

  async getBooking(id: string) {
    return this.request(`/bookings/${id}`);
  }

  async cancelBooking(id: string) {
    return this.request(`/bookings/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Review APIs
  async getExperienceReviews(experienceId: string) {
    return this.request(`/experiences/${experienceId}/reviews`);
  }

  async createReview(reviewData: {
    experienceId: string;
    bookingId: number;
    rating: number;
    comment: string;
  }) {
    return this.request(`/experiences/${reviewData.experienceId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        rating: reviewData.rating,
        comment: reviewData.comment,
        booking_id: reviewData.bookingId
      }),
    });
  }

  // Saved Experiences APIs
  async saveExperience(experienceId: string) {
    return this.request('/favorites', {
      method: 'POST',
      body: JSON.stringify({ experienceId }),
    });
  }

  async unsaveExperience(experienceId: string) {
    return this.request(`/favorites/${experienceId}`, {
      method: 'DELETE',
    });
  }

  async getSavedExperiences() {
    return this.request('/favorites');
  }

  async checkIfSaved(experienceId: string) {
    return this.request(`/favorites/check/${experienceId}`);
  }

  // Profile APIs
  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(userData: {
    name?: string;
    phone?: string;
    bio?: string;
    birthdate?: string;
    location?: string;
    avatarIcon?: string;
  }) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // User Stats
  async getUserStats() {
    return this.request('/users/stats');
  }

  // Delete Account
  async deleteAccount() {
    return this.request('/users/delete-account', {
      method: 'DELETE',
    });
  }

  // Preferences APIs
  async getPreferences() {
    return this.request('/preferences');
  }

  async savePreferences(data: {
    favorite_categories: string[];
    preferences: Record<string, boolean>;
  }) {
    return this.request('/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  // Activity Suggestions APIs
  async submitActivitySuggestion(data: {
    instagram_handle?: string;
    website?: string;
    description: string;
  }) {
    return this.request('/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async getUserSuggestions() {
    return this.request('/suggestions');
  }

  // Enhanced Activity Suggestions with AI Video Analysis
  async analyzeInstagramPost(data: {
    url: string;
    description?: string;
  }) {
    return this.request('/suggestions/analyze-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instagram_url: data.url,
        description: data.description || ''
      }),
    });
  }

  async analyzeTikTokPost(data: {
    url: string;
    description?: string;
  }) {
    return this.request('/suggestions/analyze-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tiktok_url: data.url,
        description: data.description || ''
      }),
    });
  }

  async getAnalyzedSuggestion(suggestionId: string) {
    return this.request(`/suggestions/analyzed/${suggestionId}`);
  }

  // Discount Codes APIs
  async validateDiscountCode(code: string) {
    return this.request('/discount-codes/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
  }

  async applyDiscountCode(code: string, booking_id?: number) {
    return this.request('/discount-codes/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, booking_id }),
    });
  }

  async getMyDiscountUsage() {
    return this.request('/discount-codes/my-usage');
  }

  // Spot Management APIs
  async saveSpot(spotData: {
    user_id: string;
    spot_name: string;
    activity: string;
    location_full: string;
    country: string;
    region: string | null;
    latitude: number;
    longitude: number;
    activities: Array<{
      title: string;
      description: string;
      category: string;
      difficulty: string;
      duration: string;
      why_not_boring: string;
    }>;
    confidence_score: number;
    instagram_url: string;
    thumbnail_url: string | null;
  }) {
    return this.request('/spots/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(spotData),
    });
  }

  async getSpots(userId: string) {
    return this.request(`/spots?user_id=${userId}`);
  }

  async deleteSpot(spotId: number) {
    return this.request(`/spots/${spotId}`, {
      method: 'DELETE',
    });
  }

  // Backoffice APIs
  async getBackofficeProfile() {
    return this.request('/backoffice/me');
  }

  async getBackofficeExperiences() {
    return this.request('/backoffice/experiences');
  }

  async createBackofficeExperience(data: any) {
    return this.request('/backoffice/experiences', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBackofficeExperience(id: number, data: any) {
    return this.request(`/backoffice/experiences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBackofficeExperience(id: number) {
    return this.request(`/backoffice/experiences/${id}`, {
      method: 'DELETE',
    });
  }

  async getBackofficeOperators() {
    return this.request('/backoffice/operators');
  }

  async createBackofficeOperator(data: any) {
    return this.request('/backoffice/operators', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBackofficeOperator(id: number, data: any) {
    return this.request(`/backoffice/operators/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBackofficeOperator(id: number) {
    return this.request(`/backoffice/operators/${id}`, {
      method: 'DELETE',
    });
  }

  // Backoffice Bookings
  async getBackofficeBookings(filters?: { 
    status?: string; 
    payment_status?: string; 
    from_date?: string; 
    to_date?: string; 
    experience_id?: number;
    operator_id?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.experience_id) params.append('experience_id', String(filters.experience_id));
    if (filters?.operator_id) params.append('operator_id', String(filters.operator_id));
    const query = params.toString();
    return this.request(`/backoffice/bookings${query ? `?${query}` : ''}`);
  }

  async updateBackofficeBookingStatus(id: number, status: string) {
    return this.request(`/backoffice/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Backoffice Analytics
  async getBackofficeRevenueAnalytics(filters?: { from_date?: string; to_date?: string }) {
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const query = params.toString();
    return this.request(`/backoffice/analytics/revenue${query ? `?${query}` : ''}`);
  }

  async getBackofficeRevenueChart(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.request(`/backoffice/analytics/revenue-chart?period=${period}`);
  }

  async getBackofficeBookingsSummary() {
    return this.request('/backoffice/analytics/bookings-summary');
  }

  // Backoffice Reviews
  async getBackofficeReviews(filters?: { experience_id?: number; rating?: number; has_response?: boolean; flagged?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.experience_id) params.append('experience_id', String(filters.experience_id));
    if (filters?.rating) params.append('rating', String(filters.rating));
    if (filters?.has_response !== undefined) params.append('has_response', String(filters.has_response));
    if (filters?.flagged !== undefined) params.append('flagged', String(filters.flagged));
    const query = params.toString();
    return this.request(`/backoffice/reviews${query ? `?${query}` : ''}`);
  }

  async respondToBackofficeReview(id: number, response: string) {
    return this.request(`/backoffice/reviews/${id}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ response }),
    });
  }

  async flagBackofficeReview(id: number, flagged: boolean, flag_reason?: string) {
    return this.request(`/backoffice/reviews/${id}/flag`, {
      method: 'PUT',
      body: JSON.stringify({ flagged, flag_reason }),
    });
  }

  async deleteBackofficeReview(id: number) {
    return this.request(`/backoffice/reviews/${id}`, {
      method: 'DELETE',
    });
  }

  async getBackofficeReviewsStatsByExperience() {
    return this.request('/backoffice/reviews/stats-by-experience');
  }

  // Image Upload
  async uploadBackofficeImage(base64: string, filename: string, contentType: string, folder: string = 'experiences') {
    return this.request('/backoffice/upload-image', {
      method: 'POST',
      body: JSON.stringify({ base64, filename, contentType, folder }),
    });
  }

  async deleteBackofficeImage(path: string) {
    return this.request('/backoffice/delete-image', {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    });
  }

  // Enhanced Analytics
  async getAnalyticsConversions(filters?: { from_date?: string; to_date?: string }) {
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const query = params.toString();
    return this.request(`/backoffice/analytics/conversions${query ? `?${query}` : ''}`);
  }

  async getAnalyticsDemographics() {
    return this.request('/backoffice/analytics/demographics');
  }

  async getAnalyticsHeatmap() {
    return this.request('/backoffice/analytics/heatmap');
  }

  async getAnalyticsForecast() {
    return this.request('/backoffice/analytics/forecast');
  }

  async getAnalyticsCompare(filters?: { from_date?: string; to_date?: string }) {
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const query = params.toString();
    return this.request(`/backoffice/analytics/compare${query ? `?${query}` : ''}`);
  }

  async exportAnalytics(type: 'bookings' | 'revenue' | 'experiences', filters?: { from_date?: string; to_date?: string }) {
    const params = new URLSearchParams();
    params.append('type', type);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    
    // Return URL for download
    return `${this.baseURL}/backoffice/analytics/export?${params.toString()}`;
  }

  // Calendar & Availability
  async getCalendar(filters?: { from_date?: string; to_date?: string; experience_id?: number }) {
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.experience_id) params.append('experience_id', String(filters.experience_id));
    const query = params.toString();
    return this.request(`/backoffice/calendar${query ? `?${query}` : ''}`);
  }

  async rescheduleBooking(bookingId: number, newDate: string, newTime?: string) {
    return this.request(`/backoffice/bookings/${bookingId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ new_date: newDate, new_time: newTime }),
    });
  }

  async getBlockedDates(filters?: { from_date?: string; to_date?: string; experience_id?: number }) {
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.experience_id) params.append('experience_id', String(filters.experience_id));
    const query = params.toString();
    return this.request(`/backoffice/blocked-dates${query ? `?${query}` : ''}`);
  }

  async blockDate(date: string, reason?: string, experienceId?: number) {
    return this.request('/backoffice/blocked-dates', {
      method: 'POST',
      body: JSON.stringify({ date, reason, experience_id: experienceId }),
    });
  }

  async unblockDate(id: number) {
    return this.request(`/backoffice/blocked-dates/${id}`, {
      method: 'DELETE',
    });
  }

  async getAvailability(experienceId?: number) {
    const params = new URLSearchParams();
    if (experienceId) params.append('experience_id', String(experienceId));
    const query = params.toString();
    return this.request(`/backoffice/availability${query ? `?${query}` : ''}`);
  }

  async updateAvailability(experienceId: number, settings: { time_slots?: string[]; days_of_week?: number[]; max_per_slot?: number }) {
    return this.request(`/backoffice/availability/${experienceId}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

export const api = new ApiService();
export default api;
