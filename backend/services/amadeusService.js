const axios = require('axios');

class AmadeusService {
  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY;
    this.apiSecret = process.env.AMADEUS_API_SECRET;
    this.baseUrl = 'https://test.api.amadeus.com/v1'; // Use 'https://api.amadeus.com/v1' for production
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token from Amadeus
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting Amadeus access token...');
      
      const response = await axios.post(
        'https://test.api.amadeus.com/v1/security/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Token expires in seconds, cache it (subtract 60s for safety)
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
      
      console.log('✅ Amadeus token obtained');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Amadeus authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Search activities by location with smart categorization
   * Returns diverse activities instead of just one type
   */
  async searchActivities({ location, latitude, longitude, radius = 30 }) {
    try {
      const token = await this.getAccessToken();
      
      let lat = latitude;
      let lon = longitude;

      // Geocode if we don't have coordinates
      if (!lat || !lon) {
        console.log(`🌍 Geocoding: ${location}`);
        const coords = await this.geocodeLocation(location);
        if (!coords) {
          console.log('❌ Could not geocode location');
          return [];
        }
        lat = coords.latitude;
        lon = coords.longitude;
      }

      console.log(`🔍 Searching Amadeus activities within ${radius}km of (${lat}, ${lon})`);

      const response = await axios.get(`${this.baseUrl}/shopping/activities`, {
        params: {
          latitude: lat,
          longitude: lon,
          radius: radius
        },
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 15000
      });

      const activities = response.data?.data || [];
      
      console.log(`✅ Found ${activities.length} activities from Amadeus`);
      
      // Categorize activities for diversity
      const categorized = this.categorizeActivities(activities);
      
      return activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        shortDescription: activity.shortDescription,
        description: activity.description,
        price: {
          amount: activity.price?.amount || 'N/A',
          currency: activity.price?.currencyCode || 'EUR'
        },
        rating: activity.rating || 4.5,
        pictures: activity.pictures || [],
        location: {
          name: activity.geoCode?.name || location,
          latitude: activity.geoCode?.latitude,
          longitude: activity.geoCode?.longitude
        },
        bookingLink: activity.bookingLink,
        supplier: activity.supplier?.name || 'GetYourGuide',
        category: this.detectCategory(activity.name, activity.description) // Add category
      }));

    } catch (error) {
      console.error('❌ Amadeus API error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Detect activity category for diversification
   */
  detectCategory(name, description) {
    const text = `${name} ${description}`.toLowerCase();
    
    if (text.match(/surf|wave|board/)) return 'watersports';
    if (text.match(/dive|snorkel|underwater|reef/)) return 'diving';
    if (text.match(/food|culinary|taste|restaurant|cuisine|cooking/)) return 'food';
    if (text.match(/hike|trek|nature|waterfall|mountain|jungle|forest/)) return 'nature';
    if (text.match(/museum|temple|church|historical|culture|art|tradition/)) return 'culture';
    if (text.match(/spa|massage|relax|wellness|yoga/)) return 'wellness';
    if (text.match(/nightlife|bar|club|party|evening/)) return 'nightlife';
    if (text.match(/tour|sightseeing|city|walk/)) return 'sightseeing';
    
    return 'other';
  }

  /**
   * Categorize and filter activities for diversity
   */
  categorizeActivities(activities) {
    const categories = {
      watersports: [],
      diving: [],
      food: [],
      nature: [],
      culture: [],
      wellness: [],
      nightlife: [],
      sightseeing: [],
      other: []
    };

    activities.forEach(activity => {
      const category = this.detectCategory(activity.name, activity.description || '');
      if (categories[category]) {
        categories[category].push(activity);
      }
    });

    return categories;
  }

  /**
   * Simple geocoding using OpenStreetMap Nominatim (free)
   */
  async geocodeLocation(location) {
    try {
      console.log(`🌍 Geocoding: ${location}`);
      
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: location,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'BoredTouristApp/1.0'
        },
        timeout: 5000
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        console.log(`✅ Geocoded to: (${result.lat}, ${result.lon})`);
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Geocoding failed:', error.message);
      return null;
    }
  }
}

module.exports = new AmadeusService();
