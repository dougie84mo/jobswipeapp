const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET api/location/suggestions
// @desc    Get location suggestions based on input text (mock data)
// @access  Private
router.get('/suggestions', auth, async (req, res) => {
  try {
    const { input } = req.query;
    
    if (!input) {
      return res.status(400).json({ msg: 'Input parameter is required' });
    }
    
    // Return mock suggestions instead of calling Google API
    const suggestions = [
      {
        placeId: 'place1',
        description: `${input}, New York, USA`,
        mainText: input,
        secondaryText: 'New York, USA'
      },
      {
        placeId: 'place2',
        description: `${input}, Los Angeles, USA`,
        mainText: input,
        secondaryText: 'Los Angeles, USA'
      },
      {
        placeId: 'place3',
        description: `${input}, London, UK`,
        mainText: input,
        secondaryText: 'London, UK'
      }
    ];
    
    res.json({ suggestions });
  } catch (err) {
    console.error('Location suggestions error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/location/geocode
// @desc    Get geocoding information for a place or address (mock data)
// @access  Private
router.get('/geocode', auth, async (req, res) => {
  try {
    const { placeId, address } = req.query;
    
    if (!placeId && !address) {
      return res.status(400).json({ msg: 'Either placeId or address parameter is required' });
    }
    
    // Return mock geocoding data
    const formattedResult = {
      address: address || 'Mock Address',
      latitude: 40.7128,
      longitude: -74.0060,
      placeId: placeId || 'mock-place-id'
    };
    
    res.json({ result: formattedResult });
  } catch (err) {
    console.error('Geocoding error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/location/distance
// @desc    Calculate distance between two locations (mock data)
// @access  Private
router.get('/distance', auth, async (req, res) => {
  try {
    const { origin, destination } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({ msg: 'Both origin and destination parameters are required' });
    }
    
    // Return mock distance data (10 kilometers in meters)
    const distance = 10000;
    
    res.json({ distance });
  } catch (err) {
    console.error('Distance calculation error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router; 