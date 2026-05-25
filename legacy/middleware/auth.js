const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');

/**
 * Middleware to authenticate JWT token
 * Adds user object to request if token is valid
 */
module.exports = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log('Decoded token:', decoded);
    
    // Extract user ID from token payload
    const userId = decoded.user?.id || decoded.id;
    
    if (!userId) {
      console.error('No user ID found in token payload:', decoded);
      return res.status(401).json({ message: 'Invalid token structure' });
    }
    
    console.log('Looking for user with ID:', userId);
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.error('User not found with ID:', userId);
      return res.status(401).json({ message: 'User not found' });
    }
    
    console.log('User found:', user.id, user.email);
    
    if (!user.isActive) {
      console.error('User account is inactive:', user.id);
      return res.status(401).json({ message: 'User account is inactive' });
    }
    
    // Add user to request
    req.user = {
      id: user.id,
      email: user.email,
      userType: user.userType
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
}; 