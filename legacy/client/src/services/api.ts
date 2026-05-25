import axios from 'axios';

// Get the API URL from environment variables or use a default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

console.log('API configuration:');
console.log('- API URL:', API_URL);

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token in requests
api.interceptors.request.use(
  (config) => {
    // Log the request details
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    if (config.data) {
      const logData = { ...config.data };
      if (logData.password) {
        logData.password = '********';
      }
      console.log('Request data:', logData);
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Adding authorization token to request');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log('No token found in localStorage');
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error.message);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.statusText} from ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Error:', error.message);
    
    if (error.response) {
      console.error(`API Error Response: ${error.response.status} ${error.response.statusText} from ${error.config.url}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('API Error: No response received', error.request);
    }
    
    // Handle unauthorized errors (token expired, etc.)
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized error detected');
      
      // Check if we're on the test page - don't redirect if we are
      if (window.location.pathname.includes('/test-auth')) {
        console.log('On test page, not redirecting');
      } 
      // Only redirect if not on login or test page
      else if (!window.location.pathname.includes('/login')) {
        console.log('Redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 