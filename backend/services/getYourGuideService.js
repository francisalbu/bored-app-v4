const axios = require('axios');

class GetYourGuideService {
  constructor() {
    // GetYourGuide API credentials (add to .env)
    this.apiKey = process.env.GETYOURGUIDE_API_KEY;
    this.affiliateId = process.env.GETYOURGUIDE_AFFILIATE_ID;
    this.baseUrl = 'https://api.getyourguide.com/1';
    
    // Fallback to mock data if no API key
    this.useMockData = !this.apiKey;
    
    if (this.useMockData) {
      console.log('⚠️ GetYourGuide API key not found, using mock data');
    }
  }

  /**
   * Search experiences based on activity and location
   */
  async searchExperiences({ activity, location, limit = 5 }) {
    console.log(`🔎 Searching GetYourGuide for: ${activity} in ${location}`);
    
    // Use mock data if no API key
    if (this.useMockData) {
      return this.getMockExperiences(activity, location, limit);
    }

    try {
      const searchQuery = `${activity} ${location}`;
      
      const response = await axios.get(`${this.baseUrl}/activities`, {
        params: {
          q: searchQuery,
          limit: limit,
          currency: 'EUR',
          language: 'en'
        },
        headers: {
          'X-API-Key': this.apiKey
        },
        timeout: 15000
      });

      const activities = response.data?.activities || [];

      return activities.map(activity => ({
        id: activity.activity_id || `gyg_${Date.now()}_${Math.random()}`,
        title: activity.title || `${activity} Experience`,
        description: activity.short_description || `Amazing ${activity} adventure in ${location}`,
        price: {
          amount: activity.price?.values?.amount || 50,
          currency: activity.price?.values?.currency || 'EUR'
        },
        rating: activity.rating?.average || 4.5,
        reviewCount: activity.rating?.count || 100,
        image: activity.pictures?.[0]?.url || `https://picsum.photos/400/300?random=${Date.now()}`,
        duration: activity.duration || '2-3 hours',
        location: activity.location?.name || location,
        url: activity.url 
          ? `https://www.getyourguide.com${activity.url}?partner_id=${this.affiliateId}`
          : `https://www.getyourguide.com/search?q=${encodeURIComponent(searchQuery)}`,
        source: 'getyourguide'
      }));
    } catch (error) {
      console.error('❌ GetYourGuide API error:', error.message);
      
      // Fallback to mock data on error
      console.log('⚠️ Falling back to mock experiences');
      return this.getMockExperiences(activity, location, limit);
    }
  }

  /**
   * Mock data for development/testing or fallback
   */
  getMockExperiences(activity, location, limit) {
    console.log(`🎭 Generating mock experiences for: ${activity} in ${location}`);
    
    const activityTypes = {
      'surf': {
        title: 'Surfing',
        descriptions: [
          'Learn to surf with professional instructors',
          'Beginner-friendly surf lessons with equipment',
          'Advanced surf coaching on the best waves',
          'Group surf experience with all gear included',
          'Private surf lesson for all skill levels'
        ],
        durations: ['2 hours', '3 hours', 'Half day', 'Full day']
      },
      'dive': {
        title: 'Diving',
        descriptions: [
          'Discover scuba diving for beginners',
          'Advanced diving with underwater photography',
          'Wreck diving adventure',
          'Reef exploration dive',
          'PADI certification course'
        ],
        durations: ['3 hours', '4 hours', 'Half day', 'Full day']
      },
      'hike': {
        title: 'Hiking',
        descriptions: [
          'Guided mountain hike with scenic views',
          'Trekking adventure through nature',
          'Sunrise hiking tour',
          'Full-day hiking expedition',
          'Easy nature walk with local guide'
        ],
        durations: ['3 hours', '4 hours', 'Half day', 'Full day']
      },
      'food': {
        title: 'Food Tour',
        descriptions: [
          'Culinary walking tour of local specialties',
          'Street food tasting experience',
          'Gourmet food and wine pairing',
          'Traditional cooking class',
          'Market tour with tastings'
        ],
        durations: ['2 hours', '3 hours', 'Half day']
      }
    };

    // Find matching activity type or use generic
    const activityKey = Object.keys(activityTypes).find(key => 
      activity.toLowerCase().includes(key)
    );
    
    const activityData = activityTypes[activityKey] || {
      title: activity,
      descriptions: [
        `Amazing ${activity} experience`,
        `Guided ${activity} tour`,
        `Private ${activity} adventure`,
        `Group ${activity} activity`,
        `Expert-led ${activity} experience`
      ],
      durations: ['2 hours', '3 hours', 'Half day']
    };

    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `mock_${activity}_${location}_${i}`,
      title: `${activityData.descriptions[i]} in ${location}`,
      description: `Experience the best ${activity} that ${location} has to offer with expert guides and quality equipment.`,
      price: {
        amount: 40 + (i * 15) + Math.floor(Math.random() * 20),
        currency: 'EUR'
      },
      rating: 4.3 + (Math.random() * 0.7),
      reviewCount: 50 + Math.floor(Math.random() * 500),
      image: `https://picsum.photos/400/300?random=${Date.now()}_${i}`,
      duration: activityData.durations[Math.floor(Math.random() * activityData.durations.length)],
      location: location,
      url: `https://www.getyourguide.com/search?q=${encodeURIComponent(`${activity} ${location}`)}`,
      source: 'getyourguide_mock'
    }));
  }

  /**
   * Get popular activities in a location
   */
  async getPopularInLocation(location, limit = 10) {
    if (this.useMockData) {
      return this.getMockExperiences('tours', location, limit);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/activities`, {
        params: {
          location: location,
          sort: 'popularity',
          limit: limit,
          currency: 'EUR'
        },
        headers: {
          'X-API-Key': this.apiKey
        },
        timeout: 15000
      });

      return response.data?.activities || [];
    } catch (error) {
      console.error('GetYourGuide popular activities error:', error);
      return this.getMockExperiences('tours', location, limit);
    }
  }
}

module.exports = new GetYourGuideService();
