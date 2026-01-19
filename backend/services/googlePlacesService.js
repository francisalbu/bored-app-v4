const axios = require('axios');

class GooglePlacesService {
  constructor() {
    this.apiKey = null; // Will be set when needed
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
  }

  getApiKey() {
    if (!this.apiKey) {
      this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!this.apiKey) {
        throw new Error('GOOGLE_PLACES_API_KEY not set in environment variables');
      }
    }
    return this.apiKey;
  }

  /**
   * Search for a place and get its details
   * @param {string} query - Place name (e.g., "Trevi Fountain, Rome, Italy")
   * @returns {Object} Place details with coordinates, photos, rating, etc.
   */
  async searchPlace(query) {
    try {
      const apiKey = this.getApiKey();
      console.log(`🔍 Searching Google Places for: "${query}"`);
      
      // Step 1: Find Place to get place_id
      const searchResponse = await axios.get(`${this.baseUrl}/findplacefromtext/json`, {
        params: {
          input: query,
          inputtype: 'textquery',
          fields: 'place_id,name,formatted_address',
          key: apiKey
        }
      });

      if (!searchResponse.data.candidates || searchResponse.data.candidates.length === 0) {
        console.log(`❌ No place found for: ${query}`);
        return null;
      }

      const placeId = searchResponse.data.candidates[0].place_id;
      console.log(`✅ Found place_id: ${placeId}`);

      // Step 2: Get Place Details
      const detailsResponse = await axios.get(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          fields: 'place_id,name,formatted_address,geometry,rating,user_ratings_total,photos,opening_hours,website,formatted_phone_number,editorial_summary,types',
          key: apiKey
        }
      });

      const place = detailsResponse.data.result;
      
      // Build photo URL using NEW Place Photos API
      // Format: https://places.googleapis.com/v1/{NAME}/media?key=API_KEY&maxWidthPx=800
      let photoUrl = null;
      if (place.photos && place.photos.length > 0) {
        const photoName = place.photos[0].name;
        if (photoName) {
          // Use the NEW Place Photos API format
          photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=800`;
          console.log(`📸 Photo URL generated: ${photoUrl.substring(0, 80)}...`);
        }
      }

      return {
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating || null,
        user_ratings_total: place.user_ratings_total || 0,
        photo_url: photoUrl,
        website: place.website || null,
        phone: place.formatted_phone_number || null,
        description: place.editorial_summary?.overview || null,
        types: place.types || [],
        opening_hours: place.opening_hours || null
      };
    } catch (error) {
      console.error(`❌ Error searching place "${query}":`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Enrich multiple POI names with Google Places data
   * @param {Array<string>} poiNames - Array of POI names
   * @param {string} cityContext - City context (e.g., "Rome, Italy")
   * @returns {Array<Object>} Array of enriched POI objects
   */
  async enrichPOIs(poiNames, cityContext) {
    console.log(`\n📍 Enriching ${poiNames.length} POIs with Google Places data...`);
    
    const enrichedPOIs = [];
    
    for (const poiName of poiNames) {
      const query = `${poiName}, ${cityContext}`;
      const placeData = await this.searchPlace(query);
      
      if (placeData) {
        enrichedPOIs.push({
          poi_name: poiName,
          ...placeData,
          query: query
        });
        console.log(`✅ ${poiName}: ${placeData.rating}⭐ (${placeData.user_ratings_total} reviews)`);
      } else {
        console.log(`⚠️ ${poiName}: No data found`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✅ Enriched ${enrichedPOIs.length}/${poiNames.length} POIs`);
    return enrichedPOIs;
  }
}

module.exports = new GooglePlacesService();
