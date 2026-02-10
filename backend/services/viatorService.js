const axios = require('axios');
const logger = require('../utils/logger');

// Load environment variables if not already loaded
if (!process.env.VIATOR_API_KEY) {
  require('dotenv').config();
}

class ViatorService {
  constructor() {
    this.apiKey = process.env.VIATOR_API_KEY;
    this.apiUrl = 'https://api.viator.com/partner';
    
    logger.info(`ViatorService initialized - API Key: ${this.apiKey ? '✓' : '✗'}`);
  }

  /**
   * Search for products on Viator by activity and location
   * @param {string} activity - Activity type (e.g., 'surfing', 'yoga', 'cooking')
   * @param {string} location - Location (city, country, or coordinates)
   * @param {string} currency - Currency code (default: 'EUR')
   * @param {number} maxResults - Maximum number of results (default: 5)
   * @returns {Promise<Array>} Array of Viator experiences
   */
  async searchProducts(activity, location, currency = 'EUR', maxResults = 5) {
    if (!this.apiKey) {
      logger.warn('Viator API key not configured - skipping Viator search');
      return [];
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/products/search`,
        {
          filtering: {
            destination: location, // Can be destination ID or name
            // Optional: add more filters
            // startDate: new Date().toISOString().split('T')[0],
            // endDate: future date
          },
          sorting: {
            sort: 'TRAVELER_RATING', // Sort by rating
            order: 'DESCENDING'
          },
          pagination: {
            start: 1,
            count: maxResults
          },
          currency: currency
        },
        {
          headers: {
            'exp-api-key': this.apiKey,
            'Accept': 'application/json;version=2.0',
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json;version=2.0'
          },
          timeout: 10000 // 10s timeout
        }
      );

      if (!response.data || !response.data.products) {
        logger.warn('Viator API returned no products');
        return [];
      }

      const products = response.data.products;
      logger.info(`Viator API returned ${products.length} products for activity "${activity}" in "${location}"`);

      // Transform Viator products to our format
      return this.transformViatorProducts(products, activity, location);

    } catch (error) {
      if (error.response) {
        logger.error('Viator API error:', {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          activity,
          location
        });
      } else if (error.request) {
        logger.error('Viator API timeout or network error:', {
          message: error.message,
          activity,
          location
        });
      } else {
        logger.error('Viator API request setup error:', {
          message: error.message,
          activity,
          location
        });
      }
      
      // Don't throw - return empty array so we can fallback gracefully
      return [];
    }
  }

  /**
   * Search by destination ID (more reliable than free text)
   * Use /destinations endpoint to get destination IDs first
   */
  async searchByDestinationId(destinationId, activity, currency = 'EUR', maxResults = 5) {
    if (!this.apiKey) {
      logger.warn('Viator API key not configured');
      return [];
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/products/search`,
        {
          filtering: {
            destination: destinationId.toString(),
            // Filter by tags if we can map activity to Viator tags
            // tags: this.getViatorTagsForActivity(activity)
          },
          sorting: {
            sort: 'TRAVELER_RATING',
            order: 'DESCENDING'
          },
          pagination: {
            start: 1,
            count: maxResults
          },
          currency: currency
        },
        {
          headers: {
            'exp-api-key': this.apiKey,
            'Accept': 'application/json;version=2.0',
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json;version=2.0'
          },
          timeout: 10000
        }
      );

      if (!response.data || !response.data.products) {
        return [];
      }

      return this.transformViatorProducts(response.data.products, activity, destinationId);

    } catch (error) {
      logger.error('Viator searchByDestinationId error:', error.message);
      return [];
    }
  }

  /**
   * Transform Viator product format to our experience format
   */
  transformViatorProducts(viatorProducts, activity, searchLocation = null) {
    // CRITICAL: Define boring/unwanted categories that we NEVER recommend
    const BORING_CATEGORIES = [
      // Transportation & Logistics (boring, not experiences)
      'transfer', 'airport transfer', 'car rental', 'bike rental', 
      'bicycle rental', 'scooter rental', 'segway rental', 'motorcycle rental',
      'bus tour', 'coach tour',
      
      // Accommodation (we don't book hotels)
      'hotel', 'resort', 'luxury stay', 'accommodation',
      
      // Shopping (boring tourist trap)
      'shopping tour', 'souvenir shopping', 'outlet shopping',
      
      // Nightlife (not family-friendly, can be sketchy)
      'night club', 'bar tour', 'pub tour', 'bar crawl', 'nightclub',
      'casino', 'gambling',
      
      // Generic/Boring Tours
      'tuk tuk tour', 'tuktuk', 'hop-on hop-off', 'sightseeing bus',
      'city tour bus', 'panoramic bus',
      
      // DAY TOURS - We don't want generic sightseeing day tours!
      'day tour', 'day trip', 'full day tour', 'half day tour',
      'full-day tour', 'half-day tour', 'guided tour', 'sightseeing tour',
      'city sightseeing', 'city highlights', 'highlights tour',
      'best of', 'must see', 'must-see', 'top attractions',
      'walking tour', 'private tour', 'group tour',
      
      // Miscellaneous Boring
      'karaoke', 'comic con', 'geek culture', 'paranormal tour',
      'astrology', 'tarot reading', 'fortune telling'
    ];
    
    // Maximum price constraint - never show experiences over 1000€
    const MAX_PRICE_EUR = 1000;

    // Filter out boring categories AND expensive experiences BEFORE transformation
    const filteredProducts = viatorProducts.filter(product => {
      const title = (product.title || '').toLowerCase();
      const description = (product.description || '').toLowerCase();
      const price = product.pricing?.summary?.fromPrice || 0;
      
      // Check price constraint - never show experiences over 1000€
      if (price > MAX_PRICE_EUR) {
        logger.info(`💰 Filtered out expensive experience: "${product.title}" (${price}€ > ${MAX_PRICE_EUR}€)`);
        return false;
      }
      
      // Check if product matches any boring category
      const isBoring = BORING_CATEGORIES.some(category => {
        return title.includes(category) || description.includes(category);
      });
      
      if (isBoring) {
        logger.info(`🚫 Filtered out boring experience: "${product.title}" (matches boring category)`);
        return false;
      }
      
      return true;
    });

    logger.info(`✅ Filtered ${viatorProducts.length - filteredProducts.length} boring experiences. ${filteredProducts.length} remain.`);

    // Transform filtered products
    const transformed = filteredProducts.map(product => ({
        // Mark as external source
        id: `viator_${product.productCode}`,
        source: 'viator',
        productCode: product.productCode,
        
        // Basic info
        title: product.title,
        description: product.description || product.title,
        
        // Pricing
        price: product.pricing?.summary?.fromPrice || 0,
        currency: product.pricing?.currency || 'EUR',
        
        // Duration
        duration: this.formatDuration(product.duration),
        
        // Location - use extracted location or fallback to search location
        location: this.extractLocation(product, searchLocation),
        
        // Media - use imageUrl for consistency with frontend
        imageUrl: product.images?.[0]?.variants?.[0]?.url || null,
        images: product.images?.map(img => img.variants?.[0]?.url).filter(Boolean) || [],
        
        // Rating
        rating: product.reviews?.combinedAverageRating || 0,
        reviewCount: product.reviews?.totalReviews || 0,
        
        // Booking - add affiliate tracking parameters
        productUrl: this.addAffiliateParams(product.productUrl),
        
        // Additional metadata
        tags: product.tags || [],
        flags: product.flags || []
      }));
    
    // Sort results to prioritize best matches for the activity
    // 1. Activity in title START (most relevant)
    // 2. Activity in title ANYWHERE
    // 3. More reviews (more popular/trustworthy)
    // 4. Better rating
    const activityLower = (activity || '').toLowerCase();
    const activityBase = activityLower.replace(/ing$/, ''); // "sandboarding" → "sandboard"
    
    return transformed.sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      
      // Check if activity is at the START of title (most relevant)
      const aStartsWithActivity = titleA.startsWith(activityBase) || titleA.startsWith(activityLower);
      const bStartsWithActivity = titleB.startsWith(activityBase) || titleB.startsWith(activityLower);
      
      if (aStartsWithActivity && !bStartsWithActivity) return -1;
      if (bStartsWithActivity && !aStartsWithActivity) return 1;
      
      // Check if activity appears early in title (first 30 chars)
      const aEarlyMatch = titleA.substring(0, 30).includes(activityBase);
      const bEarlyMatch = titleB.substring(0, 30).includes(activityBase);
      
      if (aEarlyMatch && !bEarlyMatch) return -1;
      if (bEarlyMatch && !aEarlyMatch) return 1;
      
      // Both have similar relevance - sort by popularity (reviews count)
      if (a.reviewCount !== b.reviewCount) {
        return b.reviewCount - a.reviewCount; // More reviews first
      }
      
      // Same review count - sort by rating
      return b.rating - a.rating;
    });
  }

  /**
   * Add affiliate tracking parameters to Viator product URLs
   * Partner ID: P00285354
   * Marketing Campaign ID: 42383
   */
  addAffiliateParams(productUrl) {
    if (!productUrl) return null;
    
    try {
      const url = new URL(productUrl);
      
      // Add affiliate parameters
      url.searchParams.set('pid', 'P00285354');
      url.searchParams.set('mcid', '42383');
      url.searchParams.set('medium', 'link');
      
      return url.toString();
    } catch (error) {
      logger.warn('Failed to add affiliate params to URL:', productUrl);
      return productUrl; // Return original if parsing fails
    }
  }

  /**
   * Format duration from Viator format to human-readable
   */
  formatDuration(duration) {
    if (!duration) return 'Duration varies';
    
    if (duration.fixedDurationInMinutes) {
      const hours = Math.floor(duration.fixedDurationInMinutes / 60);
      const minutes = duration.fixedDurationInMinutes % 60;
      
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${minutes}m`;
      }
    }
    
    if (duration.variableDurationFromMinutes && duration.variableDurationToMinutes) {
      const fromHours = Math.floor(duration.variableDurationFromMinutes / 60);
      const toHours = Math.floor(duration.variableDurationToMinutes / 60);
      return `${fromHours}-${toHours}h`;
    }
    
    return 'Duration varies';
  }

  /**
   * Extract location from Viator product in format "City, Country"
   * @param {object} product - Viator product object
   * @param {string} searchLocation - Fallback location used in search
   */
  extractLocation(product, searchLocation = null) {
    // Try to build "City, Country" format
    let city = null;
    let country = null;
    
    // Try logistics redemption location first
    if (product.logistics?.redemption?.[0]?.location?.name) {
      city = product.logistics.redemption[0].location.name;
    }
    
    // Try traveler pickup as fallback
    if (!city && product.logistics?.travelerPickup?.locations?.[0]?.name) {
      city = product.logistics.travelerPickup.locations[0].name;
    }
    
    // Try destination for city/country info
    if (product.destinations?.[0]) {
      const dest = product.destinations[0];
      if (!city && dest.destinationName) {
        city = dest.destinationName;
      }
      // Try to get country from parent destination
      if (dest.parentDestinationName) {
        country = dest.parentDestinationName;
      }
    }
    
    // Format as "City, Country" if we have both
    if (city && country) {
      return `${city}, ${country}`;
    } else if (city) {
      return city;
    }
    
    // FALLBACK: Use the search location if provided
    if (searchLocation) {
      return searchLocation;
    }
    
    return 'Location varies';
  }

  /**
   * Get destination ID from location name (city/country)
   * This requires calling /destinations endpoint first
   */
  async getDestinationId(locationName) {
    if (!this.apiKey) return null;

    try {
      const response = await axios.get(
        `${this.apiUrl}/destinations`,
        {
          headers: {
            'exp-api-key': this.apiKey,
            'Accept': 'application/json;version=2.0',
            'Accept-Language': 'en-US'
          },
          timeout: 10000
        }
      );

      if (!response.data || !response.data.destinations) {
        return null;
      }

      // Search for destination by name (case-insensitive)
      const destination = response.data.destinations.find(dest =>
        dest.destinationName.toLowerCase().includes(locationName.toLowerCase()) ||
        locationName.toLowerCase().includes(dest.destinationName.toLowerCase())
      );

      return destination?.destinationId || null;

    } catch (error) {
      logger.error('Viator getDestinationId error:', error.message);
      return null;
    }
  }

  /**
   * Search with smart fallback - PRIORITY: Destination ID first, then free text
   * This ensures location-accurate results
   */
  async smartSearch(activity, location, currency = 'EUR', maxResults = 5) {
    if (!this.apiKey) {
      logger.warn('Viator API key not configured');
      return [];
    }

    try {
      // STEP 1: Try to get destination ID for the location
      logger.info(`🔍 Smart search for "${activity}" in "${location}"`);
      
      const destinationId = await this.getDestinationId(location);
      
      if (destinationId) {
        logger.info(`✅ Found destination ID ${destinationId} for "${location}"`);
        
        // STEP 2: Search by destination ID (most accurate)
        const results = await this.searchByDestinationId(destinationId, activity, currency, maxResults);
        
        if (results && results.length > 0) {
          logger.info(`📦 Destination search returned ${results.length} products`);
          return results;
        }
        
        logger.info(`⚠️ Destination search returned 0 results, trying freetext...`);
      } else {
        logger.info(`⚠️ No destination ID found for "${location}", using freetext search`);
      }
      
      // STEP 3: Fallback to freetext search
      const searchTerm = location ? `${activity} ${location}` : activity;
      
      const response = await axios.post(
        `${this.apiUrl}/search/freetext`,
        {
          searchTerm: searchTerm,
          searchTypes: [
            {
              searchType: 'PRODUCTS',
              pagination: {
                start: 1,
                count: maxResults
              }
            }
          ],
          productFiltering: {
            includeAutomaticTranslations: true
          },
          currency: currency
        },
        {
          headers: {
            'exp-api-key': this.apiKey,
            'Accept': 'application/json;version=2.0',
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (!response.data?.products?.results) {
        logger.info('Viator free text search returned no products');
        return [];
      }

      const products = response.data.products.results;
      logger.info(`📦 Freetext found ${products.length} products for "${searchTerm}"`);

      return this.transformViatorProducts(products, activity, location);

    } catch (error) {
      if (error.response) {
        logger.error('Viator smart search error:', {
          status: error.response.status,
          message: error.response.data?.message || error.message
        });
      } else {
        logger.error('Viator search error:', error.message);
      }
      return [];
    }
  }
}

module.exports = new ViatorService();
