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
 * Find experiences similar to a given activity using AI semantic matching
 * @param {string} activity - Activity name (e.g., "surf", "cooking", "yoga")
 * @param {string} city - Optional city filter
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of matching experiences
 */
async function findSimilarActivities(activity, city = null, limit = 3) {
  try {
    // Get all active experiences (with optional city filter)
    let query = from('experiences')
      .select(`
        *,
        operators(company_name, logo_url),
        reviews(rating, id)
      `)
      .eq('is_active', true);
    
    // Apply city filter if provided (but more flexible - check if city is in location)
    if (city) {
      // Get all experiences near the city area (Lisboa includes Cascais, Carcavelos, etc.)
      // For now, get all and we'll filter with AI
      const regionKeywords = city.toLowerCase() === 'lisboa' 
        ? ['lisboa', 'lisbon', 'cascais', 'carcavelos', 'ericeira', 'sintra']
        : [city.toLowerCase()];
      
      // Build OR query for location matching
      const locationQuery = regionKeywords
        .map(keyword => `location.ilike.%${keyword}%`)
        .join(',');
      
      query = query.or(locationQuery);
    }
    
    const { data: allExperiences, error } = await query;
    
    if (error) throw error;
    
    if (!allExperiences || allExperiences.length === 0) {
      return [];
    }
    
    // Use OpenAI to find the best matches
    const experiencesForAI = allExperiences.map(exp => ({
      id: exp.id,
      title: exp.title,
      description: exp.description,
      category: exp.category,
      tags: exp.tags || []
    }));
    
    const prompt = `You are helping match a detected activity "${activity}" with available experiences.

Here are the available experiences:
${JSON.stringify(experiencesForAI, null, 2)}

Task: Return the IDs of the top ${limit} experiences that best match the activity "${activity}".
Consider:
- Title relevance
- Description content
- Category match
- Tags

Respond with ONLY a JSON array of experience IDs in order of relevance, like: [1, 5, 3]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 100
    });
    
    const responseText = completion.choices[0].message.content.trim();
    const matchedIds = JSON.parse(responseText);
    
    // Get experiences in the order returned by AI
    const sortedExperiences = matchedIds
      .map(id => allExperiences.find(exp => exp.id === id))
      .filter(exp => exp !== undefined);
    
    // Format experiences
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
        image_url: exp.image_url,
        video_url: exp.video_url,
        rating: rating,
        review_count: reviews.length,
        max_group_size: exp.max_group_size,
        instant_booking: exp.instant_booking,
        latitude: exp.latitude,
        longitude: exp.longitude,
        operator: exp.operators
      };
    });
  } catch (error) {
    console.error('Error in findSimilarActivities:', error);
    
    // Fallback to simple text search if AI fails
    let query = from('experiences')
      .select(`
        *,
        operators(company_name, logo_url),
        reviews(rating, id)
      `)
      .eq('is_active', true);
    
    const searchPattern = `%${activity}%`;
    query = query.or(
      `title.ilike.${searchPattern},description.ilike.${searchPattern},category.ilike.${searchPattern}`
    );
    
    if (city) {
      query = query.ilike('location', `%${city}%`);
    }
    
    query = query.order('rating', { ascending: false }).limit(limit);
    
    const { data: experiences, error: fallbackError } = await query;
    
    if (fallbackError) throw fallbackError;
    
    return (experiences || []).map(exp => {
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
        image_url: exp.image_url,
        video_url: exp.video_url,
        rating: rating,
        review_count: reviews.length,
        max_group_size: exp.max_group_size,
        instant_booking: exp.instant_booking,
        latitude: exp.latitude,
        longitude: exp.longitude,
        operator: exp.operators
      };
    });
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
