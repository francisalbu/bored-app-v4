/**
 * User Search History Routes
 * API endpoints for managing user search history
 */

const express = require('express');
const router = express.Router();
const searchHistoryService = require('../services/searchHistoryService');

/**
 * POST /api/search-history
 * Save search history entry
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
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
    } = req.body;
    
    if (!deviceId || !activity || !fullActivity) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, activity, and fullActivity are required'
      });
    }
    
    const result = await searchHistoryService.saveSearchHistory({
      userId,
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
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error saving search history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save search history',
      error: error.message
    });
  }
});

/**
 * GET /api/search-history
 * Get search history for user/device
 */
router.get('/', async (req, res) => {
  try {
    const { userId, deviceId, limit } = req.query;
    
    if (!deviceId && !userId) {
      return res.status(400).json({
        success: false,
        message: 'Either deviceId or userId is required'
      });
    }
    
    const history = await searchHistoryService.getSearchHistory({
      userId,
      deviceId,
      limit: limit ? parseInt(limit) : 50
    });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error loading search history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load search history',
      error: error.message
    });
  }
});

/**
 * DELETE /api/search-history/:id
 * Delete a search history item
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await searchHistoryService.deleteSearchHistory(id);
    
    res.json({
      success: true,
      message: 'Search history item deleted'
    });
  } catch (error) {
    console.error('Error deleting search history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete search history',
      error: error.message
    });
  }
});

/**
 * DELETE /api/search-history
 * Clear all search history for user/device
 */
router.delete('/', async (req, res) => {
  try {
    const { userId, deviceId } = req.query;
    
    if (!deviceId && !userId) {
      return res.status(400).json({
        success: false,
        message: 'Either deviceId or userId is required'
      });
    }
    
    await searchHistoryService.clearSearchHistory({ userId, deviceId });
    
    res.json({
      success: true,
      message: 'Search history cleared'
    });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear search history',
      error: error.message
    });
  }
});

/**
 * GET /api/search-history/popular
 * Get popular activities (analytics)
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit } = req.query;
    
    const popular = await searchHistoryService.getPopularActivities(
      limit ? parseInt(limit) : 10
    );
    
    res.json({
      success: true,
      data: popular
    });
  } catch (error) {
    console.error('Error getting popular activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular activities',
      error: error.message
    });
  }
});

module.exports = router;
