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
   * Search for a place and get its details using NEW Google Places API (v1)
   * @param {string} query - Place name (e.g., "Trevi Fountain, Rome, Italy")
   * @returns {Object} Place details with coordinates, photos, rating, etc.
   */
  async searchPlace(query) {
    try {
      const apiKey = this.getApiKey();
      console.log(`🔍 Searching Google Places (NEW API) for: "${query}"`);
      
      // Use NEW Places API (v1) - Text Search
      const searchResponse = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        {
          textQuery: query,
          maxResultCount: 1
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.regularOpeningHours,places.websiteUri,places.nationalPhoneNumber,places.editorialSummary,places.types'
          }
        }
      );

      if (!searchResponse.data.places || searchResponse.data.places.length === 0) {
        console.log(`❌ No place found for: ${query}`);
        return null;
      }

      const place = searchResponse.data.places[0];
      console.log(`✅ Found place:`, place.displayName?.text || place.displayName);

      // Build photo URL using NEW Place Photos API
      // Format: https://places.googleapis.com/v1/{NAME}/media?key=API_KEY&maxWidthPx=800
      let photoUrl = null;
      if (place.photos && place.photos.length > 0) {
        const photoName = place.photos[0].name;
        if (photoName) {
          photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=800`;
          console.log(`📸 Photo URL: ${photoUrl.substring(0, 80)}...`);
        }
      }

      return {
        place_id: place.id,
        name: place.displayName?.text || place.displayName,
        address: place.formattedAddress,
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        rating: place.rating || null,
        user_ratings_total: place.userRatingCount || 0,
        photo_url: photoUrl,
        website: place.websiteUri || null,
        phone: place.nationalPhoneNumber || null,
        description: place.editorialSummary?.text || null,
        types: place.types || [],
        opening_hours: place.regularOpeningHours || null
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
