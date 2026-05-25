import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  IconButton, 
  Typography, 
  Menu, 
  Container, 
  Avatar, 
  Button, 
  Tooltip, 
  MenuItem, 
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Divider,
  useMediaQuery,
  Badge,
  Popover,
  ListItemButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import WorkIcon from '@mui/icons-material/Work';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import MessageIcon from '@mui/icons-material/Message';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import PaymentIcon from '@mui/icons-material/Payment';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import DescriptionIcon from '@mui/icons-material/Description';
import GroupsIcon from '@mui/icons-material/Groups';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElMessages, setAnchorElMessages] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);

  // Mock data for message previews
  const messagesPreviews = [
    { id: 1, sender: 'John Doe', content: 'Hello, I saw your job posting...', time: '10:30 AM', avatar: '' },
    { id: 2, sender: 'Jane Smith', content: 'Thanks for the interview opportunity!', time: 'Yesterday', avatar: '' },
    { id: 3, sender: 'Mike Johnson', content: 'When can we schedule a call?', time: 'Jul 10', avatar: '' },
    { id: 4, sender: 'Sarah Williams', content: 'I have updated my resume as requested', time: 'Jul 8', avatar: '' },
    { id: 5, sender: 'David Brown', content: 'Looking forward to hearing from you', time: 'Jul 5', avatar: '' },
  ];

  // Mock data for notifications
  const notificationPreviews = [
    { id: 1, content: 'New match for Frontend Developer position', time: '2 hours ago' },
    { id: 2, content: 'Your job posting has 5 new applicants', time: '1 day ago' },
    { id: 3, content: 'Subscription will expire in 7 days', time: '2 days ago' },
  ];

  // Function to determine if sidebar should be shown
  const shouldShowSidebar = () => {
    // Routes that should not have a sidebar
    const noSidebarRoutes = ['/match', '/messages', '/profile'];
    
    // Check if the current path starts with any of the no-sidebar routes
    for (const route of noSidebarRoutes) {
      if (location.pathname === route || location.pathname.startsWith(`${route}/`)) {
        return false;
      }
    }
    
    return true;
  };

  // Function to determine which sidebar to show
  const getSidebarContent = () => {
    // Settings page has its own sidebar
    if (location.pathname.startsWith('/settings')) {
      return (
        <div>
          <Toolbar sx={{ justifyContent: 'center' }}>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
              Settings
            </Typography>
          </Toolbar>
          <Divider />
          <List>
            <ListItemButton 
              onClick={() => navigate('/settings')} 
              selected={location.pathname === '/settings'}
            >
              <ListItemIcon>
                <AccountCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Account" />
            </ListItemButton>
            <ListItemButton 
              onClick={() => navigate('/settings/notifications')} 
              selected={location.pathname === '/settings/notifications'}
            >
              <ListItemIcon>
                <NotificationsIcon />
              </ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItemButton>
            <ListItemButton 
              onClick={() => navigate('/settings/security')} 
              selected={location.pathname === '/settings/security'}
            >
              <ListItemIcon>
                <SecurityIcon />
              </ListItemIcon>
              <ListItemText primary="Security" />
            </ListItemButton>
            <ListItemButton 
              onClick={() => navigate('/settings/payment')} 
              selected={location.pathname === '/settings/payment'}
            >
              <ListItemIcon>
                <PaymentIcon />
              </ListItemIcon>
              <ListItemText primary="Payment Methods" />
            </ListItemButton>
            <ListItemButton 
              onClick={() => navigate('/settings/subscriptions')} 
              selected={location.pathname === '/settings/subscriptions'}
            >
              <ListItemIcon>
                <SubscriptionsIcon />
              </ListItemIcon>
              <ListItemText primary="Subscriptions" />
            </ListItemButton>
          </List>
        </div>
      );
    }

    // Default sidebar for other pages
    return (
      <div>
        <Toolbar sx={{ justifyContent: 'center' }}>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
            JobActual
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          {user?.userType === 'recruiter' && (
            <>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <DashboardIcon />
                  </ListItemIcon>
                  <ListItemText primary="Dashboard" />
                </Link>
              </ListItem>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/companies/manage" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <BusinessIcon />
                  </ListItemIcon>
                  <ListItemText primary="Companies" />
                </Link>
              </ListItem>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/jobs/manage" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <WorkIcon />
                  </ListItemIcon>
                  <ListItemText primary="Jobs" />
                </Link>
              </ListItem>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/recruiters" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <PeopleIcon />
                  </ListItemIcon>
                  <ListItemText primary="Find Recruiters" />
                </Link>
              </ListItem>
            </>
          )}
          {user?.userType === 'jobseeker' && (
            <>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <DashboardIcon />
                  </ListItemIcon>
                  <ListItemText primary="Dashboard" />
                </Link>
              </ListItem>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/jobs" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <WorkIcon />
                  </ListItemIcon>
                  <ListItemText primary="Jobs" />
                </Link>
              </ListItem>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/job-matches" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <WorkIcon />
                  </ListItemIcon>
                  <ListItemText primary="Job Matches" />
                </Link>
              </ListItem>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/profiles" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <AccountCircleIcon />
                  </ListItemIcon>
                  <ListItemText primary="My Profiles" />
                </Link>
              </ListItem>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/resumes" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText primary="Resumes" />
                </Link>
              </ListItem>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/skills" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <PeopleIcon />
                  </ListItemIcon>
                  <ListItemText primary="Skill Growth" />
                </Link>
              </ListItem>
              <ListItem onClick={() => setMobileOpen(false)}>
                <Link to="/community" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                  <ListItemIcon>
                    <GroupsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Community" />
                </Link>
              </ListItem>
            </>
          )}
          <ListItem onClick={() => setMobileOpen(false)}>
            <Link to="/matches" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
              <ListItemIcon>
                <PeopleIcon />
              </ListItemIcon>
              <ListItemText primary="Matches" />
            </Link>
          </ListItem>
        </List>
      </div>
    );
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenMessagesMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElMessages(event.currentTarget);
  };

  const handleCloseMessagesMenu = () => {
    setAnchorElMessages(null);
  };

  const handleOpenNotificationsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotifications(event.currentTarget);
  };

  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleCloseUserMenu();
  };

  // Update document title based on user type
  useEffect(() => {
    if (user) {
      if (user.userType === 'recruiter') {
        document.title = 'Recruiter App';
      } else if (user.userType === 'jobseeker') {
        document.title = 'JobSeeker App';
      }
    } else {
      document.title = 'JobActual';
    }
  }, [user]);

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {isAuthenticated && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              sx={{
                mr: 2,
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              JobActual
            </Typography>

            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/match"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              JobActual
            </Typography>
            
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/match"
              sx={{
                mr: 2,
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              JobActual
            </Typography>
            
            <Box sx={{ flexGrow: 1 }} />

            {isAuthenticated && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {/* Messages Icon */}
                <Tooltip title="Messages">
                  <IconButton 
                    color="inherit" 
                    onClick={handleOpenMessagesMenu}
                    sx={{ mr: 2 }}
                  >
                    <Badge badgeContent={messagesPreviews.length} color="error">
                      <MessageIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                
                {/* Notifications Icon */}
                <Tooltip title="Notifications">
                  <IconButton 
                    color="inherit" 
                    onClick={handleOpenNotificationsMenu}
                    sx={{ mr: 2 }}
                  >
                    <Badge badgeContent={notificationPreviews.length} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                
                {/* User Menu */}
                <Tooltip title="Open settings">
                  <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                    <Avatar 
                      alt={`${user?.firstName} ${user?.lastName}`} 
                      src={user?.profilePicture || undefined}
                    />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Messages Popover */}
            <Popover
              open={Boolean(anchorElMessages)}
              anchorEl={anchorElMessages}
              onClose={handleCloseMessagesMenu}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              sx={{ mt: 1 }}
            >
              <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto' }}>

                <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                  <Typography 
                    variant="h6" 
                    component={Link} 
                    to="/messages" 
                    sx={{ 
                      textDecoration: 'none', 
                      color: 'inherit',
                      '&:hover': {
                        color: 'primary.main',
                        cursor: 'pointer'
                      }
                    }}
                    onClick={handleCloseMessagesMenu}
                  >
                    Messages
                  </Typography>
                </Box>
                <List sx={{ p: 0 }}>
                  {messagesPreviews.map((message) => (
                    <ListItemButton 
                      key={message.id}
                      component={Link}
                      to={`/messages/${message.id}`}
                      onClick={handleCloseMessagesMenu}
                      sx={{ borderBottom: '1px solid #f5f5f5' }}
                    >
                      <ListItemAvatar>
                        <Avatar src={message.avatar}>{message.sender.charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={message.sender}
                        secondary={
                          <React.Fragment>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                              sx={{ display: 'inline', mr: 1 }}
                            >
                              {message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content}
                            </Typography>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {message.time}
                            </Typography>
                          </React.Fragment>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
                <Box sx={{ p: 2, borderTop: '1px solid #eee', textAlign: 'center' }}>
                  <Button 
                    component={Link} 
                    to="/messages" 
                    color="primary"
                    onClick={handleCloseMessagesMenu}
                  >
                    See All Messages
                  </Button>
                </Box>
              </Box>
            </Popover>

            {/* Notifications Popover */}
            <Popover
              open={Boolean(anchorElNotifications)}
              anchorEl={anchorElNotifications}
              onClose={handleCloseNotificationsMenu}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              sx={{ mt: 1 }}
            >
              <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                  <Typography variant="h6">Notifications</Typography>
                </Box>
                <List sx={{ p: 0 }}>
                  {notificationPreviews.map((notification) => (
                    <ListItemButton 
                      key={notification.id}
                      onClick={handleCloseNotificationsMenu}
                      sx={{ borderBottom: '1px solid #f5f5f5' }}
                    >
                      <ListItemText 
                        primary={notification.content}
                        secondary={notification.time}
                      />
                    </ListItemButton>
                  ))}
                </List>
                <Box sx={{ p: 2, borderTop: '1px solid #eee', textAlign: 'center' }}>
                  <Button 
                    component={Link} 
                    to="/settings" 
                    color="primary"
                    onClick={handleCloseNotificationsMenu}
                  >
                    See All Notifications
                  </Button>
                </Box>
              </Box>
            </Popover>

            {/* User Menu */}
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={() => { navigate('/dashboard'); handleCloseUserMenu(); }}>
                <ListItemIcon>
                  <DashboardIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Dashboard</Typography>
              </MenuItem>
              <MenuItem onClick={() => { navigate('/profile'); handleCloseUserMenu(); }}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Profile</Typography>
              </MenuItem>
              <MenuItem onClick={() => { navigate('/settings'); handleCloseUserMenu(); }}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Settings</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Logout</Typography>
              </MenuItem>
            </Menu>

            {!isAuthenticated && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button color="inherit" component={Link} to="/login">
                  Login
                </Button>
                <Button 
                  variant="contained" 
                  color="secondary" 
                  component={Link} 
                  to="/register"
                  sx={{ color: 'white' }}
                >
                  Register
                </Button>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      
      {isAuthenticated && shouldShowSidebar() && (
        <Box
          component="nav"
          sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant={isMobile ? "temporary" : "permanent"}
            open={isMobile ? mobileOpen : true}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', md: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                borderRight: '1px solid rgba(0, 0, 0, 0.12)'
              },
            }}
          >
            {getSidebarContent()}
          </Drawer>
        </Box>
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 