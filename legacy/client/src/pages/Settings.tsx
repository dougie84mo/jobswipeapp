import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Divider
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Determine which content to show based on the current path
  const renderContent = () => {
    const path = location.pathname;
    
    if (path.includes('/notifications')) {
      return (
        <>
          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>
          <Typography paragraph>
            Control how and when you receive notifications.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            This section will contain notification settings.
          </Typography>
        </>
      );
    } else if (path.includes('/security')) {
      return (
        <>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>
          <Typography paragraph>
            Manage your password, two-factor authentication, and other security settings.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            This section will contain security settings.
          </Typography>
        </>
      );
    } else if (path.includes('/payment')) {
      return (
        <>
          <Typography variant="h6" gutterBottom>
            Payment Methods
          </Typography>
          <Typography paragraph>
            Manage your payment methods for subscriptions and services.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            This section will contain payment method settings.
          </Typography>
        </>
      );
    } else if (path.includes('/subscriptions')) {
      return (
        <>
          <Typography variant="h6" gutterBottom>
            Subscription Management
          </Typography>
          <Typography paragraph>
            View and manage your current subscriptions.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            This section will contain subscription management.
          </Typography>
        </>
      );
    } else {
      // Default to account settings
      return (
        <>
          <Typography variant="h6" gutterBottom>
            Account Settings
          </Typography>
          <Typography paragraph>
            Manage your account settings and preferences.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            This section will contain account settings.
          </Typography>
        </>
      );
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        {renderContent()}
      </Paper>
    </Container>
  );
};

export default Settings; 