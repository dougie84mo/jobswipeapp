const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = null;

// Configure axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for debugging
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    return Promise.reject(error);
  }
);

// Test functions
const tests = {
  async login(email = 'recruiter@jobactual.com', password = 'password123') {
    console.log(`\nLogging in as ${email}...`);
    try {
      console.log('Making login request...');
      const response = await api.post('/auth/login', { email, password });
      console.log('Got response:', response.data);
      token = response.data.token;
      if (token) {
        api.defaults.headers.common['x-auth-token'] = token;
        console.log('✓ Login successful');
        console.log('Token:', token);
        return token;
      } else {
        throw new Error('No token in response');
      }
    } catch (error) {
      console.error('✗ Login failed:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      throw error;
    }
  },

  async createCompany() {
    console.log('\nCreating company...');
    try {
      const companyData = {
        name: `Test Company ${Date.now()}`,
        website: 'https://testcompany.com',
        industry: 'Technology',
        location: 'New York',
        description: 'A test company'
      };
      
      console.log('Company data:', companyData);
      const response = await api.post('/companies', companyData);
      console.log('✓ Company created:');
      console.log(JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('✗ Failed to create company:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      throw error;
    }
  }
};

// Parse command line arguments
const [,, command, ...args] = process.argv;

// Show usage if no command provided
if (!command) {
  console.log(`
Usage: node test-api.js <command> [args]

Commands:
  login <email> <password>  - Login and get token
  create-company           - Create a new company (requires login first)

Examples:
  node test-api.js login recruiter@jobactual.com password123
  node test-api.js create-company
`);
  process.exit(0);
}

// Execute the requested command
async function runCommand() {
  try {
    switch (command) {
      case 'login':
        await tests.login(args[0], args[1]);
        break;
      
      case 'create-company':
        await tests.login();
        await tests.createCompany();
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Test failed');
    process.exit(1);
  }
}

runCommand();
