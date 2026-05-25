// Test script for email service
require('dotenv').config();
const EmailService = require('../services/EmailService');

async function testEmailService() {
  console.log('Testing email service...');
  
  try {
    // Wait for the email service to be ready
    console.log('Waiting for email service to initialize...');
    await EmailService.initPromise;
    
    // Test sending a password reset email
    console.log('Sending test password reset email...');
    const testToken = 'test-token-' + Date.now();
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
    await EmailService.sendPasswordResetEmail(testEmail, testToken);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testEmailService(); 