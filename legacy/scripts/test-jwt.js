const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Function to test JWT token generation and validation
function testJWT() {
  console.log('=== JWT TOKEN TEST ===');
  
  // Log the JWT secret being used
  console.log('JWT Secret:', config.jwt.secret ? 'Secret exists (first 10 chars): ' + config.jwt.secret.substring(0, 10) + '...' : 'No secret found');
  console.log('JWT Expiration:', config.jwt.expiresIn);
  
  try {
    // Create a test payload
    const payload = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        userType: 'jobseeker'
      }
    };
    
    console.log('\nGenerating test token with payload:', payload);
    
    // Generate a token
    const token = jwt.sign(
      payload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    console.log('Generated token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Verify the token
    console.log('\nVerifying the token...');
    const decoded = jwt.verify(token, config.jwt.secret);
    
    console.log('Token verification successful!');
    console.log('Decoded payload:', decoded);
    
    return {
      success: true,
      token,
      decoded
    };
  } catch (error) {
    console.error('JWT Test Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
const result = testJWT();
console.log('\nTest Result:', result.success ? 'SUCCESS' : 'FAILURE');

// Export the function for potential reuse
module.exports = testJWT; 