const axios = require('axios');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function testLogin() {
  try {
    console.log('Testing login functionality...');
    
    // Get the user from the database
    const user = await User.findOne({ 
      where: { email: 'jobseeker1@example.com' },
      attributes: ['id', 'email', 'password', 'firstName', 'lastName', 'userType']
    });
    
    if (!user) {
      console.error('User not found in the database');
      return;
    }
    
    console.log('User found in database:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Name: ${user.firstName} ${user.lastName}`);
    console.log(`- User Type: ${user.userType}`);
    console.log(`- Password Hash: ${user.password}`);
    
    // Test password validation
    console.log('\nTesting password validation...');
    const testPassword = 'password123';
    console.log(`Test password: ${testPassword}`);
    
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Password validation result: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
    
    // Test login API
    console.log('\nTesting login API...');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'jobseeker1@example.com',
        password: 'password123'
      });
      
      console.log('Login successful!');
      console.log('Response status:', response.status);
      console.log('Token received:', response.data.token ? 'Yes' : 'No');
      console.log('User data received:', response.data.user ? 'Yes' : 'No');
    } catch (error) {
      console.error('Login API error:');
      console.error('Status:', error.response?.status);
      console.error('Error message:', error.response?.data?.message || error.message);
      
      if (error.response?.data) {
        console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLogin(); 