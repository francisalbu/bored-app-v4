// API Configuration
// Use your computer's IP address for iOS Simulator to connect to local backend
// Temporarily using production API for testing
const API_BASE_URL = 'https://bored-tourist-api.onrender.com/api';
// const API_BASE_URL = process.env.NODE_ENV === 'development' || __DEV__
//   ? 'http://192.168.1.131:3000/api' 
//   : 'https://bored-tourist-api.onrender.com/api';

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
    return this.request(`/experiences/${id}/availability?date=${date}`);
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
  }) {
    return this.request('/users/profile', {
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
}

export const api = new ApiService();
export default api;
