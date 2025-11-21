/**
 * Experience Model
 * 
 * Handles experience database operations using Supabase
 * Matches the PostgreSQL schema with operator_id, video_url, image_url, etc.
 */

const { from } = require('../config/database');

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
      id, title, description, location, price, duration,
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
      id, title, description, location, price, duration,
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
      id, title, description, location, price, duration,
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

module.exports = {
  getAllExperiences,
  getExperienceById,
  searchExperiences,
  getExperiencesByCategory,
  getTrendingExperiences,
  incrementViews
};
