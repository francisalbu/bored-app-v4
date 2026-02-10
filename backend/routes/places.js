const express = require('express');
const router = express.Router();
const googlePlacesService = require('../services/googlePlacesService');

// Autocomplete endpoint for city search
router.get('/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    
    if (!input || input.length < 2) {
      return res.status(400).json({ error: 'Input must be at least 2 characters' });
    }

    const results = await googlePlacesService.autocompleteCity(input);
    res.json(results);
  } catch (error) {
    console.error('Error in places autocomplete:', error);
    res.status(500).json({ error: 'Failed to search cities' });
  }
});

module.exports = router;
