/**
 * Experience Model
 * 
 * Handles experience database operations
 * Matches the actual database schema with operator_id, video_url, image_url, etc.
 */

// Helper to get database functions (lazy load to avoid circular dependency)
function getDB() {
  return require('../config/database');
}

/**
 * Parse JSON fields safely
 */
function parseJSON(field) {
  if (!field) return [];
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch (e) {
    return [];
  }
}

/**
 * Get all experiences (for feed)
 * Includes all media URLs for video display
 */
async function getAllExperiences(limit = 50, offset = 0) {
  const { query } = getDB();
  const experiences = await query(`
    SELECT 
      e.id, e.title, e.description, e.location, e.address,
      e.meeting_point, e.latitude, e.longitude, e.distance,
      e.price, e.currency, e.duration, e.max_group_size,
      e.category, e.tags, e.video_url, e.image_url, e.images,
      e.provider_logo, e.highlights, e.included, e.what_to_bring,
      e.languages, e.cancellation_policy, e.important_info,
      e.instant_booking, e.available_today, e.verified,
      e.rating, e.review_count, e.created_at,
      o.company_name as operator_name, o.logo_url as operator_logo
    FROM experiences e
    LEFT JOIN operators o ON e.operator_id = o.id
    WHERE e.is_active = 1
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
  
  // Parse JSON fields
  return experiences.map(exp => ({
    ...exp,
    images: parseJSON(exp.images),
    tags: parseJSON(exp.tags),
    highlights: parseJSON(exp.highlights),
    included: parseJSON(exp.included),
    what_to_bring: parseJSON(exp.what_to_bring),
    languages: parseJSON(exp.languages)
  }));
}

/**
 * Get single experience by ID
 * Returns all details including media URLs
 */
async function getExperienceById(id) {
  const { get } = getDB();
  const experience = await get(`
    SELECT 
      e.*, o.company_name as operator_name, o.logo_url as operator_logo,
      o.phone as operator_phone
    FROM experiences e
    LEFT JOIN operators o ON e.operator_id = o.id
    WHERE e.id = ? AND e.is_active = 1
  `, [id]);
  
  if (!experience) {
    return null;
  }
  
  // Parse JSON fields
  return {
    ...experience,
    images: parseJSON(experience.images),
    tags: parseJSON(experience.tags),
    highlights: parseJSON(experience.highlights),
    included: parseJSON(experience.included),
    what_to_bring: parseJSON(experience.what_to_bring),
    languages: parseJSON(experience.languages)
  };
}

/**
 * Search experiences by query
 */
async function searchExperiences(searchQuery, limit = 50) {
  const { query } = getDB();
  const searchTerm = `%${searchQuery}%`;
  
  const experiences = await query(`
    SELECT 
      e.id, e.title, e.description, e.location, e.price, e.duration,
      e.video_url, e.image_url, e.images, e.category,
      e.rating, e.review_count, e.latitude, e.longitude, e.created_at,
      o.company_name as operator_name
    FROM experiences e
    LEFT JOIN operators o ON e.operator_id = o.id
    WHERE e.is_active = 1 AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)
    ORDER BY e.rating DESC, e.review_count DESC
    LIMIT ?
  `, [searchTerm, searchTerm, searchTerm, limit]);
  
  return experiences.map(exp => ({
    ...exp,
    images: parseJSON(exp.images),
    tags: parseJSON(exp.tags)
  }));
}

/**
 * Get experiences by category
 */
async function getExperiencesByCategory(category, limit = 50) {
  const { query } = getDB();
  const experiences = await query(`
    SELECT 
      e.id, e.title, e.description, e.location, e.price, e.duration,
      e.video_url, e.image_url, e.images, e.category,
      e.rating, e.review_count, e.latitude, e.longitude, e.created_at,
      o.company_name as operator_name
    FROM experiences e
    LEFT JOIN operators o ON e.operator_id = o.id
    WHERE e.is_active = 1 AND e.category = ?
    ORDER BY e.rating DESC
    LIMIT ?
  `, [category, limit]);
  
  return experiences.map(exp => ({
    ...exp,
    images: parseJSON(exp.images),
    tags: parseJSON(exp.tags)
  }));
}

/**
 * Get trending experiences (most reviewed/rated)
 */
async function getTrendingExperiences(limit = 20) {
  const { query } = getDB();
  const experiences = await query(`
    SELECT 
      e.id, e.title, e.description, e.location, e.price, e.duration,
      e.video_url, e.image_url, e.images, e.category,
      e.rating, e.review_count, e.latitude, e.longitude, e.created_at,
      o.company_name as operator_name
    FROM experiences e
    LEFT JOIN operators o ON e.operator_id = o.id
    WHERE e.is_active = 1
    ORDER BY e.review_count DESC, e.rating DESC
    LIMIT ?
  `, [limit]);
  
  return experiences.map(exp => ({
    ...exp,
    images: parseJSON(exp.images),
    tags: parseJSON(exp.tags)
  }));
}

/**
 * Get experiences by proximity to user location
 */
async function getExperiencesByProximity(userLat, userLon, radiusKm = 50, limit = 50) {
  const { query } = getDB();
  const experiences = await query(`
    SELECT 
      e.id, e.title, e.description, e.location, e.price, e.duration,
      e.video_url, e.image_url, e.images, e.category,
      e.rating, e.review_count, e.latitude, e.longitude, e.created_at,
      o.company_name as operator_name
    FROM experiences e
    LEFT JOIN operators o ON e.operator_id = o.id
    WHERE e.is_active = 1 AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
    ORDER BY e.rating DESC
    LIMIT ?
  `, [limit * 3]); // Get more than needed to filter by distance

  // Calculate distance using Haversine formula
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Add distance to each experience and filter by radius
  const experiencesWithDistance = experiences
    .map(exp => ({
      ...exp,
      images: parseJSON(exp.images),
      tags: parseJSON(exp.tags),
      distance: calculateDistance(userLat, userLon, exp.latitude, exp.longitude)
    }))
    .filter(exp => exp.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return experiencesWithDistance;
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
  getExperiencesByProximity,
  incrementViews
};
