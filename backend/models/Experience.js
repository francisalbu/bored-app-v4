/**
 * Experience Model
 * 
 * Handles experience database operations using Supabase
 * Matches the PostgreSQL schema with operator_id, video_url, image_url, etc.
 */

const { from } = require('../config/database');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Get all experiences (for feed)
 * Includes all media URLs for video display
 * Calculates real-time rating and review count from reviews table
 */
async function getAllExperiences(limit = 50, offset = 0) {
  const { data: experiences, error } = await from('experiences')
    .select(`
      *,
      operators(company_name, logo_url),
      reviews(rating, id)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  
  // Process and format experiences
  return experiences.map(exp => {
    // Calculate rating and review count from reviews array
    const reviews = exp.reviews || [];
    const rating = reviews.length > 0 
      ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length * 10) / 10
      : 0;
    
    return {
      id: exp.id,
      title: exp.title,
      description: exp.description,
      short_description: exp.short_description,
      location: exp.location,
      address: exp.address,
      meeting_point: exp.meeting_point,
      latitude: exp.latitude,
      longitude: exp.longitude,
      distance: exp.distance,
      price: exp.price,
      currency: exp.currency,
      duration: exp.duration,
      max_group_size: exp.max_group_size,
      category: exp.category,
      tags: exp.tags || [],
      video_url: exp.video_url,
      image_url: exp.image_url,
      images: exp.images || [],
      provider_logo: exp.provider_logo,
      highlights: exp.highlights || [],
      included: exp.included || [],
      what_to_bring: exp.what_to_bring || [],
      languages: exp.languages || [],
      cancellation_policy: exp.cancellation_policy,
      important_info: exp.important_info,
      instant_booking: exp.instant_booking,
      available_today: exp.available_today,
      verified: exp.verified,
      created_at: exp.created_at,
      operator_name: exp.operators?.company_name,
      operator_logo: exp.operators?.logo_url,
      rating,
      review_count: reviews.length
    };
  });
}

/**
 * Get single experience by ID
 * Returns all details including media URLs
 * Calculates real-time rating and review count from reviews table
 */
async function getExperienceById(id) {
  const { data: experience, error } = await from('experiences')
    .select(`
      *,
      operators(company_name, logo_url, phone),
      reviews(rating, id)
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single();
  
  if (error || !experience) {
    return null;
  }
  
  // Calculate rating and review count from reviews array
  const reviews = experience.reviews || [];
  const rating = reviews.length > 0 
    ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length * 10) / 10
    : 0;
  
  // Return formatted experience
  return {
    ...experience,
    operator_name: experience.operators?.company_name,
    operator_logo: experience.operators?.logo_url,
    operator_phone: experience.operators?.phone,
    rating,
    review_count: reviews.length,
    images: experience.images || [],
    tags: experience.tags || [],
    highlights: experience.highlights || [],
    included: experience.included || [],
    what_to_bring: experience.what_to_bring || [],
    languages: experience.languages || []
  };
}

/**
 * Search experiences by query
 */
async function searchExperiences(searchQuery, limit = 50) {
  const { data: experiences, error } = await from('experiences')
    .select(`
      id, title, description, short_description, location, price, duration,
      video_url, image_url, images, category,
      latitude, longitude, created_at,
      operators(company_name),
      reviews(rating, id)
    `)
    .eq('is_active', true)
    .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
    .limit(limit);
  
  if (error) throw error;
  
  // Calculate ratings and sort
  return experiences
    .map(exp => {
      const reviews = exp.reviews || [];
      const rating = reviews.length > 0 
        ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length * 10) / 10
        : 0;
      
      return {
        ...exp,
        operator_name: exp.operators?.company_name,
        rating,
        review_count: reviews.length,
        images: exp.images || [],
        tags: exp.tags || []
      };
    })
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.review_count - a.review_count;
    });
}

/**
 * Get experiences by category
 */
async function getExperiencesByCategory(category, limit = 50) {
  const { data: experiences, error } = await from('experiences')
    .select(`
      id, title, description, short_description, location, price, duration,
      video_url, image_url, images, category,
      latitude, longitude, created_at,
      operators(company_name),
      reviews(rating, id)
    `)
    .eq('is_active', true)
    .eq('category', category)
    .limit(limit);
  
  if (error) throw error;
  
  // Calculate ratings and sort by rating
  return experiences
    .map(exp => {
      const reviews = exp.reviews || [];
      const rating = reviews.length > 0 
        ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length * 10) / 10
        : 0;
      
      return {
        ...exp,
        operator_name: exp.operators?.company_name,
        rating,
        review_count: reviews.length,
        images: exp.images || [],
        tags: exp.tags || []
      };
    })
    .sort((a, b) => b.rating - a.rating);
}

/**
 * Get trending experiences (most reviewed/rated)
 */
async function getTrendingExperiences(limit = 20) {
  const { data: experiences, error } = await from('experiences')
    .select(`
      id, title, description, short_description, location, price, duration,
      video_url, image_url, images, category,
      latitude, longitude, created_at,
      operators(company_name),
      reviews(rating, id)
    `)
    .eq('is_active', true)
    .limit(limit);
  
  if (error) throw error;
  
  // Calculate ratings and sort by review count, then rating
  return experiences
    .map(exp => {
      const reviews = exp.reviews || [];
      const rating = reviews.length > 0 
        ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length * 10) / 10
        : 0;
      
      return {
        ...exp,
        operator_name: exp.operators?.company_name,
        rating,
        review_count: reviews.length,
        images: exp.images || [],
        tags: exp.tags || []
      };
    })
    .sort((a, b) => {
      if (b.review_count !== a.review_count) return b.review_count - a.review_count;
      return b.rating - a.rating;
    });
}

/**
 * Increment view/review count (not used in current schema but kept for compatibility)
 */
async function incrementViews(id) {
  // The current schema uses review_count, not views
  // This is a no-op but kept for API compatibility
  return;
}

/**
 * Get reviews for an experience
 * Returns mix of Google reviews + app reviews
 */
async function getExperienceReviews(experienceId) {
  const { data: reviews, error } = await from('reviews')
    .select(`
      *,
      users(name, email, created_at)
    `)
    .eq('experience_id', experienceId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Format reviews - prioritize full name over username
  return reviews.map(review => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
    source: review.source, // 'google' or 'app'
    verified_purchase: review.verified_purchase,
    author: {
      name: review.author_name || review.users?.name || review.users?.email?.split('@')[0] || 'Anonymous',
      email: review.users?.email,
      photo: review.author_photo
    }
  }));
}

/**
 * Check if user has already reviewed a booking
 */
async function getUserReviewForBooking(experienceId, userId, bookingId) {
  const { data, error } = await from('reviews')
    .select('*')
    .eq('experience_id', experienceId)
    .eq('user_id', userId)
    .eq('booking_id', bookingId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  
  return data;
}

/**
 * Create a new review
 */
async function createReview({ experience_id, user_id, booking_id, rating, comment, source = 'app', verified_purchase = true }) {
  const { data, error } = await from('reviews')
    .insert({
      experience_id,
      user_id,
      booking_id,
      rating,
      comment,
      source,
      verified_purchase,
      created_at: new Date().toISOString()
    })
    .select(`
      *,
      users(name, email)
    `)
    .single();
  
  if (error) throw error;
  
  // Format review - use full name if available
  return {
    id: data.id,
    rating: data.rating,
    comment: data.comment,
    created_at: data.created_at,
    source: data.source,
    verified_purchase: data.verified_purchase,
    author: {
      name: data.users?.name || data.users?.email?.split('@')[0] || 'Anonymous',
      email: data.users?.email
    }
  };
}

/**
 * Find experiences similar to a given activity using AI
 * @param {string} activity - Activity name (e.g., "surf", "cooking", "yoga")
 * @param {string} city - Optional city filter  
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of matching experiences
 */
async function findSimilarActivities(activity, city = null, limit = 3) {
  try {
    console.log(`🔍 Finding experiences for: "${activity}" in ${city || 'any city'}`);
    
    // Get all active experiences - we'll filter by location in memory for flexibility
    let query = from('experiences')
      .select(`
        *,
        operators(company_name, logo_url),
        reviews(rating, id)
      `)
      .eq('is_active', true);
    
    const { data: allExperiences, error } = await query;
    
    if (error) throw error;
    
    if (!allExperiences || allExperiences.length === 0) {
      console.log('⚠️ No experiences found in database');
      return [];
    }
    
    console.log(`📊 Found ${allExperiences.length} total experiences in database`);
    
    // Filter by city/location if specified - ULTRA STRICT!
    let experiencesInCity = allExperiences;
    if (city) {
      const normalizedCity = city.toLowerCase().trim();
      // Also check common variations
      const cityVariations = [normalizedCity];
      if (normalizedCity === 'lisboa') cityVariations.push('lisbon');
      if (normalizedCity === 'lisbon') cityVariations.push('lisboa');
      
      console.log('   Filtering by city:', cityVariations);
      
      experiencesInCity = allExperiences.filter(exp => {
        const expCity = (exp.city || '').toLowerCase().trim();
        const expLocation = (exp.location || '').toLowerCase().trim();
        
        // STRICT: City must match exactly (not just "contains")
        const cityMatches = cityVariations.some(cv => 
          expCity === cv || 
          expLocation.startsWith(cv) || // "Lisboa, Portugal" is ok
          expLocation === cv
        );
        
        if (cityMatches) {
          console.log(`   ✅ City match: ${exp.title} (${exp.city || exp.location})`);
        }
        
        return cityMatches;
      });
      
      console.log(`📍 After STRICT city filter: ${experiencesInCity.length} experiences in ${city}`);
      
      // NO FALLBACK - if not in the city, don't show it!
    }
    
    if (experiencesInCity.length === 0) {
      console.log('⚠️ No experiences found in region');
      return [];
    }
    
    let sortedExperiences = [];
    
    // Try AI matching first
    try {
      if (process.env.OPENAI_API_KEY) {
        console.log('🤖 Using AI matching...');
        const experiencesForAI = experiencesInCity.map(exp => ({
          id: exp.id,
          title: exp.title,
          description: exp.description,
          category: exp.category
        }));
        
        const prompt = `Match activity "${activity}" with these experiences. Return ONLY a JSON array of the top ${limit} most relevant experience IDs, like [1,5,3]:

${JSON.stringify(experiencesForAI, null, 2)}`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 50
        });
        
        const matchedIds = JSON.parse(completion.choices[0].message.content.trim());
        console.log(`✅ AI matched IDs:`, matchedIds);
        
        sortedExperiences = matchedIds
          .map(id => experiencesInCity.find(exp => exp.id === id))
          .filter(exp => exp);
      } else {
        throw new Error('OpenAI API key not configured');
      }
    } catch (aiError) {
      // Fallback to STRICT text matching - curated experience!
      console.log('⚠️ AI matching failed, using strict text search:', aiError.message);
      
      const searchTerm = activity.toLowerCase().trim();
      // Get base word for matching (e.g., "surfing" -> "surf", "snorkeling" -> "snorkel")
      const searchBase = searchTerm.replace(/ing$/, '').replace(/s$/, '');
      
      console.log(`   Searching for: "${searchTerm}" (base: "${searchBase}")`);
      
      const scoredExperiences = experiencesInCity.map(exp => {
        let score = 0;
        const title = (exp.title || '').toLowerCase();
        const description = (exp.description || '').toLowerCase();
        const category = (exp.category || '').toLowerCase();
        const tags = (exp.tags || []).map(t => t.toLowerCase());
        
        // MORE PERMISSIVE MATCHING for Bored Tourist
        // Title exact match (most important)
        if (title.includes(searchTerm)) score += 100;
        if (title.includes(searchBase) && searchBase.length > 3) score += 90;
        
        // Category/Tag exact match (very important)
        if (category.includes(searchTerm) || category.includes(searchBase)) score += 80;
        if (tags.some(tag => tag.includes(searchTerm) || tag.includes(searchBase))) score += 70;
        
        // Similar water activities get bonus points (snorkeling ↔ diving)
        const waterActivities = [
          { search: 'snorkel', similar: ['dive', 'diving', 'scuba', 'underwater'] },
          { search: 'dive', similar: ['snorkel', 'snorkeling', 'scuba', 'underwater'] },
          { search: 'diving', similar: ['snorkel', 'snorkeling', 'scuba', 'underwater'] },
          { search: 'kayak', similar: ['paddle', 'canoe', 'rowing'] },
          { search: 'surf', similar: ['bodyboard', 'wave', 'beach'] },
          { search: 'quad', similar: ['buggy', 'atv', '4x4'] },
          { search: 'buggy', similar: ['quad', 'atv', '4x4'] }
        ];
        
        const activityMatch = waterActivities.find(wa => 
          searchTerm.includes(wa.search) || searchBase.includes(wa.search)
        );
        
        if (activityMatch) {
          // Check if experience contains similar activities
          const hasSimilar = activityMatch.similar.some(sim => 
            title.includes(sim) || category.includes(sim) || description.includes(sim)
          );
          if (hasSimilar) {
            score += 60; // Good bonus for similar activities
            console.log(`   ⭐ Similar activity bonus: ${exp.title} (${searchTerm} → similar)`);
          }
        }
        
        // Description match
        if (description.includes(searchTerm) || description.includes(searchBase)) {
          score += 15;
        }
        
        // Massive penalty for completely irrelevant experiences
        // If searching for water sport but exp is about castles, temples, tours, etc.
        const waterSports = ['surf', 'snorkel', 'dive', 'kayak', 'paddle', 'swim'];
        const isWaterSport = waterSports.some(ws => searchTerm.includes(ws) || searchBase.includes(ws));
        
        if (isWaterSport) {
          const irrelevantWords = ['castle', 'temple', 'museum', 'cathedral', 'palace', 'monument', 'church'];
          const hasIrrelevant = irrelevantWords.some(word => title.includes(word) || category.includes(word));
          if (hasIrrelevant) {
            score = 0; // Zero out completely irrelevant experiences
          }
        }
        
        // Additional penalty for generic "tour" or "visit" without the actual activity
        if ((title.includes('tour') || title.includes('visit')) && score < 50) {
          // If it's a tour but doesn't strongly match the activity, penalize
          score = Math.max(0, score - 40);
        }
        
        return { ...exp, matchScore: score };
      });
      
      // STRICT FILTER for Bored Tourist: ONLY show if there's a REAL match
      // Score >= 60 means it's truly related (same activity or very similar)
      // NO FALLBACKS - if we don't have it, don't show random experiences!
      const MINIMUM_SCORE = 60;
      let filtered = scoredExperiences.filter(exp => exp.matchScore >= MINIMUM_SCORE);
      
      // If no matches with score >= 60, return EMPTY array
      // Better to show NOTHING than to show irrelevant experiences
      if (filtered.length === 0) {
        console.log(`   ❌ No quality matches found (minimum score ${MINIMUM_SCORE} required)`);
        console.log(`   Top scores were: ${scoredExperiences.slice(0, 3).map(e => `${e.title}: ${e.matchScore}`).join(', ')}`);
        return []; // Return empty - Viator will handle it
      }
      
      sortedExperiences = filtered
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
      
      console.log(`✅ Strict search found ${sortedExperiences.length} HIGH-QUALITY matches (min score: ${MINIMUM_SCORE})`);
      if (sortedExperiences.length > 0) {
        console.log('   Top matches:', sortedExperiences.map(e => `${e.title} (score: ${e.matchScore})`));
      }
    }
    
    // Format and return
    return sortedExperiences.map(exp => {
      const reviews = exp.reviews || [];
      const rating = reviews.length > 0 
        ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length * 10) / 10
        : 0;
      
      return {
        id: exp.id,
        title: exp.title,
        description: exp.description,
        location: exp.location,
        price: parseFloat(exp.price),
        currency: exp.currency,
        duration: exp.duration,
        category: exp.category,
        images: Array.isArray(exp.images) ? exp.images : (exp.images ? JSON.parse(exp.images) : []), // Parse JSONB
        image_url: exp.image_url,
        video_url: exp.video_url,
        rating,
        review_count: reviews.length,
        max_group_size: exp.max_group_size,
        instant_booking: exp.instant_booking,
        latitude: exp.latitude,
        longitude: exp.longitude,
        operator: exp.operators
      };
    });
  } catch (error) {
    console.error('❌ Fatal error in findSimilarActivities:', error);
    return [];
  }
}

module.exports = {
  getAllExperiences,
  getExperienceById,
  searchExperiences,
  getExperiencesByCategory,
  getTrendingExperiences,
  incrementViews,
  getExperienceReviews,
  getUserReviewForBooking,
  createReview,
  findSimilarActivities
};
