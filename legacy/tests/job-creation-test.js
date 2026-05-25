/**
 * Job Creation Test Script
 * 
 * This script tests the job creation functionality by making a POST request to the /api/jobs endpoint.
 * It requires a valid JWT token for a recruiter user.
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const TOKEN = process.env.TEST_RECRUITER_TOKEN; // Set this in your .env file or pass as environment variable

// Test job data
const testJob = {
  title: 'Test Job Position',
  description: 'This is a test job description created by the test script.',
  jobType: 'full-time',
  location: 'Remote',
  skills: ['JavaScript', 'Node.js', 'React'],
  requirements: ['3+ years of experience', 'Bachelor\'s degree'],
  salaryMin: 80000,
  salaryMax: 120000,
  salaryCurrency: 'USD',
  isRemote: true,
  experienceLevel: 'mid',
  industry: 'Technology',
  educationLevel: 'Bachelor\'s degree',
  benefits: ['Health insurance', '401k', 'Remote work'],
  isHybrid: false
};

// Function to test job creation
async function testJobCreation() {
  if (!TOKEN) {
    console.error('Error: No test recruiter token provided. Set TEST_RECRUITER_TOKEN in your .env file.');
    process.exit(1);
  }

  try {
    console.log('Testing job creation...');
    console.log('Job data:', testJob);
    
    const response = await axios.post(`${API_URL}/jobs`, testJob, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': TOKEN
      }
    });

    console.log('Job created successfully!');
    console.log('Response status:', response.status);
    console.log('Created job:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating job:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    throw error;
  }
}

// Run the test
testJobCreation()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(() => {
    console.error('Test failed');
    process.exit(1);
  }); 