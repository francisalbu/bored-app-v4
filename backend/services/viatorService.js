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
      return this.transformViatorProducts(products, activity);

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

      return this.transformViatorProducts(response.data.products, activity);

    } catch (error) {
      logger.error('Viator searchByDestinationId error:', error.message);
      return [];
    }
  }

  /**
   * Transform Viator product format to our experience format
   */
  transformViatorProducts(viatorProducts, activity) {
    return viatorProducts
      .filter(product => {
        // Filter by activity relevance in title/description
        const searchText = `${product.title} ${product.description || ''}`.toLowerCase();
        return searchText.includes(activity.toLowerCase());
      })
      .map(product => ({
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
        
        // Location
        location: this.extractLocation(product),
        
        // Media
        image: product.images?.[0]?.variants?.[0]?.url || null,
        images: product.images?.map(img => img.variants?.[0]?.url).filter(Boolean) || [],
        
        // Rating
        rating: product.reviews?.combinedAverageRating || 0,
        reviewCount: product.reviews?.totalReviews || 0,
        
        // Booking
        productUrl: product.productUrl || null,
        
        // Additional metadata
        tags: product.tags || [],
        flags: product.flags || []
      }));
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
   * Extract location from Viator product
   */
  extractLocation(product) {
    // Try logistics redemption location first
    if (product.logistics?.redemption?.[0]?.location?.name) {
      return product.logistics.redemption[0].location.name;
    }
    
    // Try traveler pickup
    if (product.logistics?.travelerPickup?.locations?.[0]?.name) {
      return product.logistics.travelerPickup.locations[0].name;
    }
    
    // Try destination
    if (product.destinations?.[0]?.destinationName) {
      return product.destinations[0].destinationName;
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
   * Search with smart fallback - use free text search instead
   */
  async smartSearch(activity, location, currency = 'EUR', maxResults = 5) {
    if (!this.apiKey) {
      logger.warn('Viator API key not configured');
      return [];
    }

    try {
      // Use /search/freetext endpoint - more flexible
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
      logger.info(`Viator found ${products.length} products for "${searchTerm}"`);

      return this.transformViatorProducts(products, activity);

    } catch (error) {
      if (error.response) {
        logger.error('Viator free text search error:', {
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
