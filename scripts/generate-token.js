/**
 * Script to generate a JWT token for a user
 * 
 * Run with: node scripts/generate-token.js <email>
 * Example: node scripts/generate-token.js recruiter@jobactual.com
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function generateToken() {
  try {
    // Get email from command line arguments
    const email = process.argv[2];
    
    if (!email) {
      console.error('Please provide an email address');
      console.error('Usage: node scripts/generate-token.js <email>');
      process.exit(1);
    }
    
    console.log(`Generating token for user with email: ${email}`);
    
    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }
    
    console.log(`User found: ${user.firstName} ${user.lastName} (${user.userType})`);
    
    // Create JWT payload
    const payload = {
      user: {
        id: user.id
      }
    };
    
    // Generate token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '30d' },
      (err, token) => {
        if (err) {
          console.error('Error generating token:', err);
          process.exit(1);
        }
        
        console.log('\n=== JWT TOKEN ===');
        console.log(token);
        console.log('\nThis token will expire in 30 days');
        console.log('\nTo use this token:');
        console.log('1. In Postman: Add header "x-auth-token" with the token value');
        console.log('2. In browser: Store in localStorage.setItem("token", "' + token + '")');
        
        process.exit(0);
      }
    );
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Connect to database and run the function
const { sequelize } = require('../models');
sequelize.authenticate()
  .then(() => {
    console.log('Database connection established');
    generateToken();
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  }); 