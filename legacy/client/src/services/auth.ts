import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: 'jobseeker' | 'recruiter';
  location?: string;
  bio?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
    location?: string;
    bio?: string;
    profilePicture?: string;
    skills?: string[];
    industries?: string[];
    emailNotifications?: boolean;
    profileVisibility?: 'public' | 'private';
    language?: string;
    timezone?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

const AuthService = {
  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    console.log('AuthService: Attempting login with credentials:', { email: credentials.email, passwordLength: credentials.password?.length });
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', credentials);
      console.log('AuthService: Login response:', response.data);
      
      if (response.data.token) {
        console.log('AuthService: Storing token in localStorage');
        
        // Clear any existing token first
        localStorage.removeItem('token');
        
        // Store the new token
        localStorage.setItem('token', response.data.token);
        
        // Verify the token was stored
        const storedToken = localStorage.getItem('token');
        console.log('AuthService: Verified stored token:', storedToken ? `${storedToken.substring(0, 20)}...` : 'No token stored');
        
        if (!storedToken) {
          console.error('AuthService: Failed to store token in localStorage');
        } else if (storedToken !== response.data.token) {
          console.error('AuthService: Stored token does not match received token');
        }
      } else {
        console.warn('AuthService: No token received in login response');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('AuthService: Login error:', error.message);
      if (error.response) {
        console.error('AuthService: Error response status:', error.response.status);
        console.error('AuthService: Error response data:', error.response.data);
      }
      throw error;
    }
  },

  // Register user
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<AuthResponse['user']> => {
    console.log('AuthService: Calling getCurrentUser API');
    try {
      // Log the token being used for the request
      const token = localStorage.getItem('token');
      console.log('AuthService: Token for getCurrentUser request:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      // Add a delay to ensure the token is properly set in localStorage
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check again after delay
      const tokenAfterDelay = localStorage.getItem('token');
      console.log('AuthService: Token after delay:', tokenAfterDelay ? `${tokenAfterDelay.substring(0, 20)}...` : 'No token');
      
      if (!tokenAfterDelay) {
        console.error('AuthService: No token found in localStorage after delay');
        throw new Error('No authentication token found');
      }
      
      const response = await api.get<any>('/api/auth/me');
      console.log('AuthService: getCurrentUser raw response', response);
      console.log('AuthService: getCurrentUser response data', response.data);

      // The server returns the user object directly, not wrapped in a 'user' property
      const userData = response.data;

      // Ensure we have a valid user object with the required properties
      if (userData && userData.id && userData.userType) {
        console.log('AuthService: Valid user data found', userData);
        return userData;
      } else {
        console.error('AuthService: Invalid user data structure', userData);
        throw new Error('Invalid user data structure');
      }
    } catch (error: any) {
      console.error('AuthService: getCurrentUser error', error.message);
      if (error.response) {
        console.error('AuthService: Error response status:', error.response.status);
        console.error('AuthService: Error response data:', error.response.data);
      }
      throw error;
    }
  },

  // Logout user
  logout: (): void => {
    console.log('AuthService: Logging out user');
    localStorage.removeItem('token');
  },

  // Check if user is logged in
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    console.log('AuthService: Checking authentication, token exists:', !!token);
    return !!token;
  }
};

export default AuthService; 