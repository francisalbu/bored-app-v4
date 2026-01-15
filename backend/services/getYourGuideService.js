const axios = require('axios');
const amadeusService = require('./amadeusService');

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
   * Uses GPT-4o to suggest REAL, COOL activities (Bored Tourist style)
   */
  async searchExperiences({ activity, location, limit = 3 }) {
    console.log(`🔎 Searching cool activities for: ${location}`);
    
    // Use OpenAI to suggest REAL activities that exist in this location
    return this.generateCoolActivitiesWithAI(activity, location, limit);
  }

  /**
   * Use GPT-4o to generate REAL, authentic activities
   * No boring stuff - only cool experiences!
   */
  async generateCoolActivitiesWithAI(activity, location, limit = 3) {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const prompt = `You are a LOCAL ADVENTURE EXPERT for "${location}".

🎯 MISSION: Make the world LESS BORING
We're "Bored Tourist" - suggesting UNIQUE, OFF-THE-BEATEN-PATH experiences that tourists don't know about.

STRICT RULES:
1. ❌ NO food/restaurant suggestions (unless EXTREMELY unique, like foraging or cooking with locals)
2. ✅ FOCUS: Adventure, nature, unique experiences, local secrets, adrenaline, exploration
3. ✅ Only suggest activities that ACTUALLY EXIST in ${location}
4. ✅ Use REAL place names (verified trails, known tours, actual locations)
5. ✅ Think OUTSIDE THE BOX - what would make someone say "WOW, I didn't know you could do that there!"

CONTEXT:
- Primary activity in video: ${activity}
- Location: ${location}

SUGGEST 3 ANTI-BORING ACTIVITIES:
1. Main activity - enhanced or alternative to ${activity}
2. Adventure/Nature - something adrenaline-pumping or mind-blowing (snowmobile, dog sledding, canyoning, paragliding, volcano trekking, ice climbing, cliff jumping, etc.)
3. Hidden gem - secret spot, local experience, or unique perspective most tourists miss

INSPIRATION (adapt to location):
- Winter: Snowmobile tours, dog sledding, ice climbing, northern lights hunting, ice cave exploration
- Mountains: Paragliding, via ferrata, canyoning, mountain biking extreme trails
- Coast: Cliff diving, coasteering, sea kayaking to hidden caves, snorkeling with wildlife
- Desert: Sandboarding, stargazing tours, 4x4 adventures, hot air balloon rides
- Urban: Rooftop climbing, underground tunnel tours, night photography missions
- Tropical: Waterfall rappelling, jungle canopy zip-lining, bioluminescent kayaking

For each activity:
- Use REAL names (e.g., "Snowmobile Safari to Svalbard Glacier", "Rappel down Fjallfoss Waterfall")
- Be SPECIFIC and EXCITING
- Explain WHY this makes life less boring

Return ONLY valid JSON:
{
  "activities": [
    {
      "title": "Specific Activity Name",
      "description": "Why this is epic and what you'll experience",
      "category": "adventure|nature|adrenaline|exploration|unique",
      "difficulty": "easy|moderate|hard|extreme",
      "duration": "estimated time",
      "why_not_boring": "what makes this ANTI-BORING"
    }
  ]
}`;

    try {
      console.log('🤖 Asking GPT-4o for cool activities...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: prompt
        }],
        temperature: 0.4,
        max_tokens: 800
      });
      
      const text = response.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(text);
      
      console.log(`✅ Generated ${result.activities.length} cool activities with AI`);
      
      // Convert to our format
      return result.activities.slice(0, limit).map((act, index) => ({
        id: `ai-${Date.now()}-${index}`,
        title: act.title,
        description: act.description,
        price: null,
        rating: null,
        reviewCount: `${act.difficulty} • ${act.duration}`,
        image: this.getActivityImage(act.category || activity),
        duration: act.duration,
        location: location,
        category: act.category,
        bookingLink: null, // No booking links - just suggestions
        source: 'ai_curated',
        cta: null,
        whyNotBoring: act.why_not_boring
      }));
      
    } catch (error) {
      console.error('❌ AI activity generation failed:', error.message);
      return this.buildNoDataResponse(activity, location);
    }
  }

  /**
   * Build "no data" response when no activities found
   */
  buildNoDataResponse(activity, location) {
    console.log('❌ No bookable activities found for this location');
    return [{
      id: 'no-data',
      title: `No activities available yet`,
      description: `We couldn't find bookable ${activity} activities in ${location}. Try a more popular destination or check back later!`,
      price: null,
      rating: null,
      reviewCount: null,
      image: this.getActivityImage(activity),
      duration: null,
      location: location,
      category: null,
      bookingLink: null,
      source: 'no_data',
      cta: null
    }];
  }

  /**
   * Diversify activities to show variety (CORE LOGIC!)
   * Priority order based on detected activity:
   * 1. Primary activity (e.g., surf if detected)
   * 2. Food/Culinary
   * 3. Nature/Adventure
   * 4. Culture/Wellness
   * 5. Nightlife/Other
   */
  diversifyActivities(activities, detectedActivity, limit = 5) {
    const activityLower = detectedActivity.toLowerCase();
    
    // Group by category
    const byCategory = {};
    activities.forEach(act => {
      const cat = act.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(act);
    });
    
    console.log('📊 Categories found:', Object.keys(byCategory).map(k => `${k}(${byCategory[k].length})`).join(', '));
    
    const selected = [];
    
    // 1. Primary activity (match what was detected in video)
    let primaryCategory = null;
    if (activityLower.includes('surf')) primaryCategory = 'watersports';
    else if (activityLower.includes('dive') || activityLower.includes('snorkel')) primaryCategory = 'diving';
    else if (activityLower.includes('ski') || activityLower.includes('snow')) primaryCategory = 'nature';
    else if (activityLower.includes('food')) primaryCategory = 'food';
    
    if (primaryCategory && byCategory[primaryCategory]?.length > 0) {
      selected.push(byCategory[primaryCategory][0]);
      console.log(`✅ 1. Primary: ${primaryCategory}`);
    }
    
    // 2. Food/Culinary (always popular!)
    if (byCategory.food?.length > 0 && !selected.find(a => a.category === 'food')) {
      selected.push(byCategory.food[0]);
      console.log(`✅ 2. Food experience`);
    }
    
    // 3. Nature/Adventure
    const natureCategories = ['nature', 'watersports', 'diving'];
    for (const cat of natureCategories) {
      if (byCategory[cat]?.length > 0 && !selected.find(a => a.category === cat)) {
        selected.push(byCategory[cat][0]);
        console.log(`✅ 3. Nature/Adventure: ${cat}`);
        break;
      }
    }
    
    // 4. Culture/Wellness
    const cultureCategories = ['culture', 'wellness', 'sightseeing'];
    for (const cat of cultureCategories) {
      if (byCategory[cat]?.length > 0 && !selected.find(a => a.category === cat)) {
        selected.push(byCategory[cat][0]);
        console.log(`✅ 4. Culture/Wellness: ${cat}`);
        break;
      }
    }
    
    // 5. Nightlife or other unique experiences
    if (byCategory.nightlife?.length > 0) {
      selected.push(byCategory.nightlife[0]);
      console.log(`✅ 5. Nightlife`);
    } else if (byCategory.other?.length > 0) {
      selected.push(byCategory.other[0]);
      console.log(`✅ 5. Other activity`);
    }
    
    // Fill remaining slots with best remaining activities
    while (selected.length < limit && activities.length > selected.length) {
      const remaining = activities.filter(a => !selected.includes(a));
      if (remaining.length === 0) break;
      selected.push(remaining[0]);
    }
    
    return selected.slice(0, limit);
  }

  /**
   * Build GetYourGuide search URL with affiliate params
   */
  buildSearchUrl(query) {
    const queryParams = new URLSearchParams({
      q: query,
      partner_id: this.affiliateId || 'BONZK5E',
      cmp: 'bored_tourist_app',
      utm_source: 'bored_tourist',
      utm_medium: 'app'
    });
    
    return `https://www.getyourguide.com/s/?${queryParams.toString()}`;
  }

  /**
   * Generate smart affiliate links based on activity + location
   * Now generates MULTIPLE diverse activities for the destination
   */
  generateSmartAffiliateLinks(activity, location, limit = 5) {
    console.log(`🔗 Generating diverse activities for: ${location} (detected from ${activity})`);
    
    // Parse and normalize location
    const normalizedLocation = this.normalizeLocation(location);
    console.log(`📍 Normalized location: ${normalizedLocation.city}, ${normalizedLocation.country}`);
    
    // Get diverse activities based on location type
    const suggestedActivities = this.getLocationActivities(normalizedLocation, activity);
    
    console.log(`✨ Suggesting ${suggestedActivities.length} activities:`, suggestedActivities.map(a => a.name).join(', '));
    
    // Generate affiliate link for each activity
    return suggestedActivities.slice(0, limit).map((activityInfo, index) => {
      const searchQuery = `${activityInfo.name} ${normalizedLocation.city}`;
      const queryParams = new URLSearchParams({
        q: searchQuery,
        partner_id: this.affiliateId || 'BONZK5E',
        cmp: 'bored_tourist_app',
        utm_source: 'bored_tourist',
        utm_medium: 'app',
        utm_campaign: activityInfo.name.toLowerCase().replace(/\s+/g, '_')
      });
      
      const url = `https://www.getyourguide.com/s/?${queryParams.toString()}`;
      
      return {
        id: `gyg_${normalizedLocation.city}_${index}`,
        title: activityInfo.title,
        description: activityInfo.description.replace('{city}', normalizedLocation.city),
        price: activityInfo.price,
        rating: activityInfo.rating,
        reviewCount: activityInfo.reviewCount,
        image: activityInfo.image,
        duration: activityInfo.duration,
        location: `${normalizedLocation.city}, ${normalizedLocation.country}`,
        url: url,
        source: 'getyourguide_affiliate',
        cta: `Book ${activityInfo.name}`
      };
    });
  }

  /**
   * Normalize location to extract main city + country
   * Ex: "Surftown La Union" → { city: "San Juan", region: "La Union", country: "Philippines" }
   */
  normalizeLocation(location) {
    const locationLower = location.toLowerCase();
    
    // Known locations mapping (expand this as needed)
    const locationMappings = {
      'surftown la union': { city: 'San Juan', region: 'La Union', country: 'Philippines' },
      'la union': { city: 'San Juan', region: 'La Union', country: 'Philippines' },
      "l'alpe-d'huez": { city: "L'Alpe-d'Huez", region: 'Auvergne-Rhône-Alpes', country: 'France' },
      'courchevel': { city: 'Courchevel', region: 'Savoie', country: 'France' },
      'bali': { city: 'Ubud', region: 'Bali', country: 'Indonesia' },
      'canggu': { city: 'Canggu', region: 'Bali', country: 'Indonesia' }
    };
    
    // Check if we have a mapping
    for (const [key, value] of Object.entries(locationMappings)) {
      if (locationLower.includes(key)) {
        return value;
      }
    }
    
    // Fallback: parse "City, Country" format
    const parts = location.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      return {
        city: parts[0],
        region: parts[1] || parts[0],
        country: parts[1] || 'Unknown'
      };
    }
    
    return {
      city: location,
      region: location,
      country: 'Unknown'
    };
  }

  /**
   * Get diverse activities based on location type and detected activity
   * This creates a VARIED list of things to do in that area
   */
  getLocationActivities(normalizedLocation, detectedActivity) {
    const activityLower = detectedActivity.toLowerCase();
    const locationKey = `${normalizedLocation.city.toLowerCase()}_${normalizedLocation.country.toLowerCase()}`;
    
    // Detect location type (beach, mountain, city, etc.)
    const isBeach = activityLower.includes('surf') || activityLower.includes('dive') || 
                    normalizedLocation.city.toLowerCase().includes('beach');
    const isMountain = activityLower.includes('ski') || activityLower.includes('hike') || 
                       normalizedLocation.region.toLowerCase().includes('alp');
    
    let activities = [];
    
    if (isBeach) {
      // Beach destination activities
      activities = [
        {
          name: 'Surfing Lessons',
          title: `Learn to Surf in ${normalizedLocation.city}`,
          description: `Master the waves with professional surf instructors in {city}. Perfect for beginners and intermediate surfers.`,
          price: { amount: 'From €40', currency: 'EUR' },
          rating: 4.8,
          reviewCount: '350+',
          image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600',
          duration: '2-3 hours'
        },
        {
          name: 'Snorkeling Tour',
          title: `Snorkeling & Marine Life in ${normalizedLocation.city}`,
          description: `Discover vibrant coral reefs and tropical fish in {city}. Equipment and guide included.`,
          price: { amount: 'From €35', currency: 'EUR' },
          rating: 4.7,
          reviewCount: '280+',
          image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600',
          duration: '3-4 hours'
        },
        {
          name: 'Island Hopping',
          title: `Island Hopping Adventure from ${normalizedLocation.city}`,
          description: `Explore hidden beaches and islands near {city}. Boat tour with lunch included.`,
          price: { amount: 'From €60', currency: 'EUR' },
          rating: 4.9,
          reviewCount: '420+',
          image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600',
          duration: 'Full day'
        },
        {
          name: 'Local Food Tour',
          title: `Food & Culture Tour in ${normalizedLocation.city}`,
          description: `Taste authentic local cuisine and explore the food scene of {city} with a local guide.`,
          price: { amount: 'From €45', currency: 'EUR' },
          rating: 4.6,
          reviewCount: '190+',
          image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
          duration: '3 hours'
        },
        {
          name: 'Sunset Cruise',
          title: `Sunset Boat Cruise in ${normalizedLocation.city}`,
          description: `Enjoy breathtaking sunset views on a relaxing boat cruise in {city}.`,
          price: { amount: 'From €50', currency: 'EUR' },
          rating: 4.8,
          reviewCount: '310+',
          image: 'https://images.unsplash.com/photo-1544551763-92080fe3c0bc?w=600',
          duration: '2 hours'
        }
      ];
    } else if (isMountain) {
      // Mountain destination activities
      activities = [
        {
          name: 'Skiing Lessons',
          title: `Ski Lessons in ${normalizedLocation.city}`,
          description: `Learn to ski or improve your technique with certified instructors in {city}.`,
          price: { amount: 'From €80', currency: 'EUR' },
          rating: 4.9,
          reviewCount: '450+',
          image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600',
          duration: 'Half day'
        },
        {
          name: 'Mountain Hiking',
          title: `Guided Hiking Tour in ${normalizedLocation.city}`,
          description: `Explore scenic mountain trails with an experienced guide in {city}.`,
          price: { amount: 'From €55', currency: 'EUR' },
          rating: 4.7,
          reviewCount: '320+',
          image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600',
          duration: '4-5 hours'
        },
        {
          name: 'Snowboarding',
          title: `Snowboard Experience in ${normalizedLocation.city}`,
          description: `Hit the slopes with snowboard rental and lessons in {city}.`,
          price: { amount: 'From €75', currency: 'EUR' },
          rating: 4.8,
          reviewCount: '280+',
          image: 'https://images.unsplash.com/photo-1519315901367-dd7d0c096b9e?w=600',
          duration: 'Half day'
        },
        {
          name: 'Après-Ski Experience',
          title: `Après-Ski & Local Cuisine in ${normalizedLocation.city}`,
          description: `Enjoy traditional mountain food and drinks after a day on the slopes in {city}.`,
          price: { amount: 'From €45', currency: 'EUR' },
          rating: 4.6,
          reviewCount: '210+',
          image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600',
          duration: '2-3 hours'
        },
        {
          name: 'Scenic Cable Car',
          title: `Mountain Cable Car Ride in ${normalizedLocation.city}`,
          description: `Take a breathtaking cable car ride to summit viewpoints in {city}.`,
          price: { amount: 'From €40', currency: 'EUR' },
          rating: 4.9,
          reviewCount: '560+',
          image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
          duration: '1-2 hours'
        }
      ];
    } else {
      // City/general destination activities
      activities = [
        {
          name: 'City Walking Tour',
          title: `Guided City Tour in ${normalizedLocation.city}`,
          description: `Explore the highlights and hidden gems of {city} with a local guide.`,
          price: { amount: 'From €30', currency: 'EUR' },
          rating: 4.7,
          reviewCount: '400+',
          image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
          duration: '3 hours'
        },
        {
          name: 'Food Tour',
          title: `Culinary Tour in ${normalizedLocation.city}`,
          description: `Taste local specialties and learn about the food culture of {city}.`,
          price: { amount: 'From €50', currency: 'EUR' },
          rating: 4.8,
          reviewCount: '350+',
          image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
          duration: '3-4 hours'
        },
        {
          name: 'Cultural Experience',
          title: `Cultural Activities in ${normalizedLocation.city}`,
          description: `Immerse yourself in local traditions and culture in {city}.`,
          price: { amount: 'From €40', currency: 'EUR' },
          rating: 4.6,
          reviewCount: '220+',
          image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600',
          duration: '2-3 hours'
        },
        {
          name: 'Day Trip',
          title: `Day Trip from ${normalizedLocation.city}`,
          description: `Discover nearby attractions on a full-day excursion from {city}.`,
          price: { amount: 'From €70', currency: 'EUR' },
          rating: 4.7,
          reviewCount: '310+',
          image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600',
          duration: 'Full day'
        },
        {
          name: 'Local Markets',
          title: `Market Tour in ${normalizedLocation.city}`,
          description: `Visit vibrant local markets and shop like a local in {city}.`,
          price: { amount: 'From €25', currency: 'EUR' },
          rating: 4.5,
          reviewCount: '180+',
          image: 'https://images.unsplash.com/photo-1555982105-d25af4182e4e?w=600',
          duration: '2 hours'
        }
      ];
    }
    
    return activities;
  }

  /**
   * Get relevant stock image for activity type
   */
  getActivityImage(activity) {
    const activityLower = activity.toLowerCase();
    
    const imageMap = {
      'surf': 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400',
      'dive': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
      'ski': 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400',
      'hike': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
      'food': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
      'wine': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400',
      'tour': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400'
    };
    
    const matchedKey = Object.keys(imageMap).find(key => activityLower.includes(key));
    return matchedKey ? imageMap[matchedKey] : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';
  }

  /**
   * OLD: Keep this for reference if you get API access later
   */
  async searchExperiencesWithAPI({ activity, location, limit = 5 }) {
    console.log(`🔎 [API MODE] Searching GetYourGuide for: ${activity} in ${location}`);
    
    // Use mock data if no API key
    if (this.useMockData) {
      return this.getMockExperiences(activity, location, limit);
    }

    try {
      // Build search query - prioritize location for better targeting
      const searchQuery = location ? `${activity} ${location}` : activity;
      
      // Extract country/city for better filtering
      const locationParts = location ? location.split(',').map(s => s.trim()) : [];
      const city = locationParts[0] || '';
      const country = locationParts[1] || locationParts[0] || '';
      
      console.log(`🌍 Searching: "${searchQuery}" | City: "${city}" | Country: "${country}"`);
      
      const response = await axios.get(`${this.baseUrl}/activities`, {
        params: {
          q: searchQuery,
          limit: limit * 2, // Get more to filter better
          currency: 'EUR',
          language: 'en',
          ...(country && { country: country }), // Filter by country if available
          sort: 'rating' // Sort by best rated
        },
        headers: {
          'X-API-Key': this.apiKey
        },
        timeout: 15000
      });

      const activities = response.data?.activities || [];
      
      // Filter and prioritize activities that match the city/location
      const filtered = activities
        .filter(act => {
          if (!city) return true;
          const actLocation = (act.location?.name || '').toLowerCase();
          return actLocation.includes(city.toLowerCase());
        })
        .slice(0, limit);

      console.log(`✅ Found ${filtered.length} activities in ${location}`);

      return filtered.map(activity => ({
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
        url: this.buildAffiliateUrl(activity.url, searchQuery),
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
   * Build affiliate URL with your partner ID
   */
  buildAffiliateUrl(activityPath, fallbackQuery) {
    if (activityPath && this.affiliateId) {
      // GetYourGuide activity URL with affiliate tracking
      return `https://www.getyourguide.com${activityPath}?partner_id=${this.affiliateId}&utm_medium=online_publisher&utm_source=bored_tourist_app`;
    } else if (activityPath) {
      return `https://www.getyourguide.com${activityPath}`;
    } else {
      // Fallback to search page
      return `https://www.getyourguide.com/search?q=${encodeURIComponent(fallbackQuery)}${this.affiliateId ? `&partner_id=${this.affiliateId}` : ''}`;
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
