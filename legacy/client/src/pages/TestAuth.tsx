import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Container, Alert } from '@mui/material';
import AuthService from '../services/auth';
import api from '../services/api';

// Function to decode JWT token
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return { error: 'Invalid token format' };
  }
};

const TestAuth: React.FC = () => {
  const [email, setEmail] = useState('recruiter1@example.com');
  const [password, setPassword] = useState('password123');
  const [token, setToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [tokenTestResult, setTokenTestResult] = useState<any>(null);

  // Add a log function that will display logs on the page
  const addLog = (message: string) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };

  // Check initial token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    addLog(`Initial token: ${storedToken ? 'exists' : 'none'}`);
    
    if (storedToken) {
      const decoded = decodeJWT(storedToken);
      addLog(`Token payload: ${JSON.stringify(decoded)}`);
    }
  }, []);

  // Direct login without using AuthContext
  const handleDirectLogin = async () => {
    try {
      addLog('Attempting direct login...');
      
      // Clear any existing token
      localStorage.removeItem('token');
      setToken(null);
      setUserData(null);
      setError(null);
      
      // Make the login request
      const response = await api.post('/api/auth/login', { email, password });
      addLog(`Login response received: ${response.status}`);
      
      // Check if token exists in response
      if (response.data && response.data.token) {
        addLog(`Token received: ${response.data.token.substring(0, 20)}...`);
        
        // Decode and log token payload
        const decoded = decodeJWT(response.data.token);
        addLog(`Token payload: ${JSON.stringify(decoded)}`);
        
        // Store token in localStorage
        localStorage.setItem('token', response.data.token);
        
        // Verify token was stored
        const storedToken = localStorage.getItem('token');
        addLog(`Token stored in localStorage: ${storedToken ? 'yes' : 'no'}`);
        
        // Update state
        setToken(storedToken);
        setUserData(response.data.user);
      } else {
        addLog('No token received in response');
        setError('No token received in response');
      }
    } catch (err: any) {
      addLog(`Login error: ${err.message}`);
      setError(err.response?.data?.message || err.message);
    }
  };

  // Fetch user data directly
  const handleFetchUserData = async () => {
    try {
      addLog('Fetching user data...');
      
      // Check if token exists
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        addLog('No token found in localStorage');
        setError('No token found in localStorage');
        return;
      }
      
      addLog(`Using token: ${currentToken.substring(0, 20)}...`);
      
      // Make the request with error handling
      try {
        const response = await api.get('/api/auth/me');
        addLog(`User data response received: ${response.status}`);
        
        // Update state
        setUserData(response.data);
      } catch (apiErr: any) {
        addLog(`API Error: ${apiErr.message}`);
        
        if (apiErr.response) {
          addLog(`Status: ${apiErr.response.status}`);
          addLog(`Status Text: ${apiErr.response.statusText}`);
          
          if (apiErr.response.data) {
            addLog(`Error Data: ${JSON.stringify(apiErr.response.data)}`);
          }
        }
        
        throw apiErr;
      }
    } catch (err: any) {
      addLog(`Fetch user data error: ${err.message}`);
      setError(err.response?.data?.message || err.message);
    }
  };

  // Test token directly with server
  const handleTestToken = async () => {
    try {
      addLog('Testing token directly with server...');
      
      // Check if token exists
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        addLog('No token found in localStorage');
        setError('No token found in localStorage');
        return;
      }
      
      addLog(`Using token: ${currentToken.substring(0, 20)}...`);
      
      // Create a test request with the token
      const headers = {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      };
      
      try {
        // Make a direct fetch request to avoid interceptors
        addLog('Making direct fetch request to /api/auth/me');
        const response = await fetch('http://localhost:5000/api/auth/me', {
          method: 'GET',
          headers
        });
        
        addLog(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          addLog(`Response data received: ${JSON.stringify(data)}`);
          setTokenTestResult(data);
        } else {
          const errorData = await response.text();
          addLog(`Error response: ${errorData}`);
          setTokenTestResult({ error: errorData });
        }
      } catch (fetchErr: any) {
        addLog(`Fetch error: ${fetchErr.message}`);
        setTokenTestResult({ error: fetchErr.message });
      }
    } catch (err: any) {
      addLog(`Test token error: ${err.message}`);
      setError(err.message);
    }
  };

  // Clear token
  const handleClearToken = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUserData(null);
    addLog('Token cleared from localStorage');
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>Authentication Test Page</Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Login Credentials</Typography>
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={handleDirectLogin}
          >
            Direct Login (Bypass Context)
          </Button>
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Token Status</Typography>
          <Typography>
            Token in localStorage: {token ? 'Exists' : 'None'}
          </Typography>
          {token && (
            <>
              <Typography sx={{ wordBreak: 'break-all' }}>
                Token: {token}
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Decoded Token:</Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: '#f8f8f8' }}>
                <pre>{JSON.stringify(decodeJWT(token), null, 2)}</pre>
              </Paper>
            </>
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              color="secondary"
              onClick={handleFetchUserData}
              disabled={!token}
            >
              Fetch User Data
            </Button>
            <Button 
              variant="contained" 
              color="info"
              onClick={handleTestToken}
              disabled={!token}
            >
              Test Token Directly
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              onClick={handleClearToken}
              disabled={!token}
            >
              Clear Token
            </Button>
          </Box>
        </Box>
        
        {userData && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>User Data</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <pre>{JSON.stringify(userData, null, 2)}</pre>
            </Paper>
          </Box>
        )}
        
        {tokenTestResult && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>Token Test Result</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <pre>{JSON.stringify(tokenTestResult, null, 2)}</pre>
            </Paper>
          </Box>
        )}
        
        <Box>
          <Typography variant="h6" gutterBottom>Debug Logs</Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              maxHeight: '300px', 
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              bgcolor: '#f5f5f5'
            }}
          >
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </Paper>
        </Box>
      </Paper>
    </Container>
  );
};

export default TestAuth; 