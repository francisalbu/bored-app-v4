/**
 * User Search History Service
 * Manages user search history in Supabase database
 */

const { from } = require('../config/database');

/**
 * Save or update search history for a user/device
 */
async function saveSearchHistory({
  userId = null,
  deviceId,
  activity,
  fullActivity,
  location,
  instagramUrl,
  thumbnailUrl,
  analysisType,
  confidence,
  experiences,
  analysis
}) {
  try {
    // Check if entry already exists for this device + activity
    const { data: existing } = await from('user_search_history')
      .select('*')
      .eq('device_id', deviceId)
      .eq('activity', activity)
      .single();
    
    if (existing) {
      // Update existing entry: increment search count, update timestamp
      const { data, error } = await from('user_search_history')
        .update({
          user_id: userId, // Update user_id if user logged in
          full_activity: fullActivity,
          location,
          instagram_url: instagramUrl,
          thumbnail_url: thumbnailUrl,
          analysis_type: analysisType,
          confidence,
          experiences,
          analysis,
          search_count: (existing.search_count || 0) + 1,
          last_searched_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Updated search history:', activity, '(count:', data.search_count, ')');
      return data;
    } else {
      // Insert new entry
      const { data, error } = await from('user_search_history')
        .insert({
          user_id: userId,
          device_id: deviceId,
          activity,
          full_activity: fullActivity,
          location,
          instagram_url: instagramUrl,
          thumbnail_url: thumbnailUrl,
          analysis_type: analysisType,
          confidence,
          experiences,
          analysis,
          search_count: 1,
          last_searched_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      console.log('✅ Created search history:', activity);
      return data;
    }
  } catch (error) {
    console.error('❌ Error saving search history:', error);
    throw error;
  }
}

/**
 * Get search history for a user/device
 */
async function getSearchHistory({ userId = null, deviceId, limit = 50 }) {
  try {
    let query = from('user_search_history')
      .select('*')
      .order('last_searched_at', { ascending: false })
      .limit(limit);
    
    // Filter by user_id if available, otherwise by device_id
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error loading search history:', error);
    throw error;
  }
}

/**
 * Delete a search history item
 */
async function deleteSearchHistory(id) {
  try {
    const { error } = await from('user_search_history')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    console.log('✅ Deleted search history item:', id);
    return true;
  } catch (error) {
    console.error('❌ Error deleting search history:', error);
    throw error;
  }
}

/**
 * Clear all search history for a user/device
 */
async function clearSearchHistory({ userId = null, deviceId }) {
  try {
    let query = from('user_search_history').delete();
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }
    
    const { error } = await query;
    
    if (error) throw error;
    console.log('✅ Cleared search history');
    return true;
  } catch (error) {
    console.error('❌ Error clearing search history:', error);
    throw error;
  }
}

/**
 * Get popular activities (analytics)
 */
async function getPopularActivities(limit = 10) {
  try {
    const { data, error } = await from('user_search_history')
      .select('activity, full_activity, count(*) as total_searches, sum(search_count) as total_count')
      .group('activity, full_activity')
      .order('total_count', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error getting popular activities:', error);
    throw error;
  }
}

module.exports = {
  saveSearchHistory,
  getSearchHistory,
  deleteSearchHistory,
  clearSearchHistory,
  getPopularActivities
};
