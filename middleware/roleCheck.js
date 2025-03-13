/**
 * Middleware to check if user has the required role
 * @param {string[]} roles - Array of allowed roles
 * @returns {function} Middleware function
 */
module.exports = function(roles) {
  return function(req, res, next) {
    // Check if user exists (auth middleware should run first)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user has one of the required roles
    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have the required role to perform this action.' 
      });
    }

    // User has required role, proceed
    next();
  };
}; 