import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AuthService, { AuthResponse } from '../services/auth';

interface AuthContextType {
  user: AuthResponse['user'] | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(AuthService.isAuthenticated());

  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated) {
        try {
          console.log('AuthContext: Loading user data...');
          
          // Add a delay to ensure the token is properly set in localStorage
          console.log('AuthContext: Waiting before loading user data...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if still authenticated after delay
          const tokenAfterDelay = localStorage.getItem('token');
          if (!tokenAfterDelay) {
            console.error('AuthContext: Token disappeared during delay');
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
          
          const userData = await AuthService.getCurrentUser();
          console.log('AuthContext: User data loaded:', userData);
          console.log('AuthContext: User type:', userData?.userType);

          // Format user data if needed
          if (userData) {
            // Ensure the user object has the expected structure
            const formattedUser = {
              ...userData,
              // Add any missing fields with default values
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              isActive: userData.isActive !== undefined ? userData.isActive : true
            };
            setUser(formattedUser);
          } else {
            setUser(null);
          }
        } catch (err: any) {
          console.error('AuthContext: Failed to load user:', err.message);
          
          // Only log out if it's an authentication error (401)
          if (err.response && err.response.status === 401) {
            console.log('AuthContext: Authentication error, logging out');
            AuthService.logout();
            setIsAuthenticated(false);
          } else {
            console.log('AuthContext: Non-authentication error, keeping user logged in');
            // For other errors, we'll keep the user logged in but set loading to false
          }
        }
      } else {
        console.log('AuthContext: Not authenticated, skipping user data load');
      }
      setLoading(false);
    };

    loadUser();
  }, [isAuthenticated]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('AuthContext: Attempting login...');
      const response = await AuthService.login({ email, password });
      
      console.log('AuthContext: Login successful, setting user data');
      setUser(response.user);
      
      // Ensure the token is in localStorage before setting isAuthenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('AuthContext: Token not found in localStorage after login');
        throw new Error('Authentication failed: Token not stored');
      }
      
      console.log('AuthContext: Setting isAuthenticated to true');
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('AuthContext: Login error:', err.message);
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await AuthService.register(userData);
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 