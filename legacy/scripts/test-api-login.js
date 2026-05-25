const axios = require('axios');
const { sequelize, User } = require('../models');
const bcrypt = require('bcryptjs');

async function testApiLogin() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Find a user to test with
    const user = await User.findOne({ 
      where: { email: 'jobseeker1@example.com' } 
    });
    
    if (!user) {
      console.error('User not found!');
      return;
    }
    
    console.log(`Found user: ${user.email}`);
    console.log(`Password hash: ${user.password}`);
    
    // Test direct password comparison
    const testPassword = 'password123';
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Direct password comparison: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
    
    // Update the password with a known working hash
    console.log('\nUpdating password with a known working hash...');
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(testPassword, salt);
    
    // Verify the new hash works
    const isNewMatch = await bcrypt.compare(testPassword, newHash);
    console.log(`New hash verification: ${isNewMatch ? 'SUCCESS' : 'FAILED'}`);
    
    // Update the user's password
    await user.update({ password: newHash });
    console.log(`Updated password hash: ${newHash}`);
    
    // Test the login API
    console.log('\nTesting login API...');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: user.email,
        password: testPassword
      });
      
      console.log('Login successful!');
      console.log(`Token: ${response.data.token.substring(0, 20)}...`);
      console.log(`User ID: ${response.data.user.id}`);
      console.log(`User Type: ${response.data.user.userType}`);
    } catch (error) {
      console.error('Login API error:');
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Error message: ${error.response.data.message}`);
        console.error(`Full error response:`, error.response.data);
      } else {
        console.error(error.message);
      }
    }
  } catch (error) {
    console.error('Error testing API login:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the function
testApiLogin(); 