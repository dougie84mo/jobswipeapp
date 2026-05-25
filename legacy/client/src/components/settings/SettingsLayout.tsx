import React from 'react';
import { Box, Container, Paper, Typography, List, ListItem, ListItemIcon, ListItemText, ListItemButton } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import PaymentIcon from '@mui/icons-material/Payment';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const settingsMenuItems = [
  { path: '/settings', label: 'Account', icon: <AccountCircleIcon /> },
  { path: '/settings/notifications', label: 'Notifications', icon: <NotificationsIcon /> },
  { path: '/settings/security', label: 'Security', icon: <SecurityIcon /> },
  { path: '/settings/payment', label: 'Payment', icon: <PaymentIcon /> },
  { path: '/settings/subscriptions', label: 'Subscriptions', icon: <SubscriptionsIcon /> },
];

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Settings Navigation Sidebar */}
        <Paper sx={{ width: 280, flexShrink: 0 }}>
          <List>
            {settingsMenuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Settings Content */}
        <Paper sx={{ flex: 1, p: 3 }}>
          {children}
        </Paper>
      </Box>
    </Container>
  );
};

export default SettingsLayout; 