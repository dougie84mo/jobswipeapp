import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Divider,
  Chip,
  Avatar,
  AvatarGroup,
  Stack,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  ListItemSecondaryAction,
  Paper,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Tooltip,
  DialogActions
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import MessageIcon from '@mui/icons-material/Message';
import ShareIcon from '@mui/icons-material/Share';
import GroupIcon from '@mui/icons-material/Group';
import WorkIcon from '@mui/icons-material/Work';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

// Styled components
const CommunityCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  }
}));

const ProfileViewCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginTop: theme.spacing(3),
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '80px',
    background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
    zIndex: 0
  }
}));

const ConnectionBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
  },
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Mock data
const mockConnections = [
  {
    id: 1,
    name: 'David Chen',
    title: 'Front-end Developer',
    avatar: '',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    connected: true,
    skills: ['React', 'TypeScript', 'UI/UX'],
    mutualConnections: 12,
    verified: true,
    profileViews: 143
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    title: 'UX Designer',
    avatar: '',
    company: 'DesignWorks',
    location: 'New York, NY',
    connected: true,
    skills: ['UI Design', 'User Research', 'Figma'],
    mutualConnections: 8,
    verified: true,
    profileViews: 98
  },
  {
    id: 3,
    name: 'Michael Rodriguez',
    title: 'Full Stack Developer',
    avatar: '',
    company: 'WebSolutions Inc.',
    location: 'Austin, TX',
    connected: true,
    skills: ['Node.js', 'React', 'MongoDB'],
    mutualConnections: 5,
    verified: false,
    profileViews: 76
  }
];

const mockSuggestions = [
  {
    id: 4,
    name: 'Emily Zhang',
    title: 'Product Manager',
    avatar: '',
    company: 'ProductLab',
    location: 'Seattle, WA',
    connected: false,
    skills: ['Product Strategy', 'Agile', 'Market Research'],
    mutualConnections: 3,
    verified: true,
    profileViews: 112
  },
  {
    id: 5,
    name: 'Robert Kim',
    title: 'Backend Developer',
    avatar: '',
    company: 'DataSystems',
    location: 'Boston, MA',
    connected: false,
    skills: ['Java', 'Spring', 'SQL'],
    mutualConnections: 2,
    verified: false,
    profileViews: 64
  },
  {
    id: 6,
    name: 'Lisa Thompson',
    title: 'DevOps Engineer',
    avatar: '',
    company: 'CloudTech',
    location: 'Denver, CO',
    connected: false,
    skills: ['Kubernetes', 'AWS', 'Docker'],
    mutualConnections: 4,
    verified: true,
    profileViews: 89
  },
  {
    id: 7,
    name: 'James Wilson',
    title: 'Mobile Developer',
    avatar: '',
    company: 'AppFactory',
    location: 'Chicago, IL',
    connected: false,
    skills: ['React Native', 'iOS', 'Android'],
    mutualConnections: 1,
    verified: false,
    profileViews: 42
  }
];

const mockCommunities = [
  {
    id: 1,
    name: 'React Developers Network',
    members: 3452,
    description: 'A community for React developers to share knowledge, resources, and job opportunities.',
    avatar: '',
    joined: true,
    recentActivity: 'New job posting: Senior React Developer at TechGiant'
  },
  {
    id: 2,
    name: 'UX/UI Design Professionals',
    members: 2874,
    description: 'Connect with UX/UI designers to discuss design trends, user research, and career growth.',
    avatar: '',
    joined: false,
    recentActivity: 'Upcoming workshop: Design Systems in 2023'
  },
  {
    id: 3,
    name: 'JavaScript Enthusiasts',
    members: 5241,
    description: 'For those passionate about JavaScript and its ecosystem of libraries and frameworks.',
    avatar: '',
    joined: true,
    recentActivity: 'Hot discussion: TypeScript vs JavaScript in 2023'
  },
  {
    id: 4,
    name: 'Women in Tech',
    members: 4120,
    description: 'Supporting and empowering women in technology careers through mentorship and networking.',
    avatar: '',
    joined: false,
    recentActivity: 'New event: Virtual networking for female tech professionals'
  }
];

const Community: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  useEffect(() => {
    // In a real app, these would be API calls
    setConnections(mockConnections);
    setSuggestions(mockSuggestions);
    setCommunities(mockCommunities);
  }, []);
  
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    // In a real app, this would trigger a search API call
  };
  
  const handleConnect = (id: number) => {
    const person = suggestions.find(s => s.id === id);
    if (person) {
      // Add to connections
      setConnections([...connections, {...person, connected: true}]);
      // Remove from suggestions
      setSuggestions(suggestions.filter(s => s.id !== id));
    }
  };
  
  const handleJoinCommunity = (id: number) => {
    setCommunities(
      communities.map(community => 
        community.id === id 
          ? {...community, joined: !community.joined}
          : community
      )
    );
  };
  
  const handleViewProfile = (person: any) => {
    setSelectedProfile(person);
    setProfileDialogOpen(true);
  };
  
  const handleCloseProfileDialog = () => {
    setProfileDialogOpen(false);
  };
  
  const handleShareProfile = (person: any) => {
    setSelectedProfile(person);
    setShareDialogOpen(true);
  };
  
  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Job Seeker Community
        </Typography>
      </Box>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Connect with other job seekers, join professional communities, and share resources to accelerate your career growth.
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search for people, communities, or skills..."
          variant="outlined"
          value={searchQuery}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleChangeTab} aria-label="community tabs">
          <Tab label="Your Connections" />
          <Tab label="Suggested Connections" />
          <Tab label="Communities" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        {connections.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              You don't have any connections yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Connect with other professionals in your field to grow your network
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => setTabValue(1)}
            >
              Find People to Connect With
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {connections.map((person) => (
              <Grid item key={person.id} xs={12} md={6}>
                <CommunityCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <ConnectionBadge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={<CheckIcon style={{ fontSize: 12 }} />}
                      >
                        <Avatar 
                          sx={{ width: 64, height: 64, mr: 2 }}
                        >
                          {person.name.charAt(0)}
                        </Avatar>
                      </ConnectionBadge>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="h6" gutterBottom>
                            {person.name}
                          </Typography>
                          {person.verified && (
                            <Tooltip title="Verified Profile">
                              <VerifiedIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
                            </Tooltip>
                          )}
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {person.title} at {person.company}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {person.location}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <PersonAddIcon fontSize="small" color="disabled" sx={{ mr: 0.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            {person.mutualConnections} mutual connections
                          </Typography>
                          
                          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                            <VisibilityIcon fontSize="small" color="disabled" sx={{ mr: 0.5 }} />
                            <Typography variant="body2" color="text.secondary">
                              {person.profileViews} profile views
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                    
                    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                      {person.skills.map((skill: string, index: number) => (
                        <Chip 
                          key={index}
                          label={skill}
                          size="small"
                          icon={<LocalOfferIcon />}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </CardContent>
                  
                  <Divider />
                  
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewProfile(person)}
                    >
                      View Profile
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<MessageIcon />}
                    >
                      Message
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<ShareIcon />}
                      onClick={() => handleShareProfile(person)}
                    >
                      Share
                    </Button>
                  </CardActions>
                </CommunityCard>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {suggestions.map((person) => (
            <Grid item key={person.id} xs={12} md={6}>
              <CommunityCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Avatar 
                      sx={{ width: 64, height: 64, mr: 2 }}
                    >
                      {person.name.charAt(0)}
                    </Avatar>
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6" gutterBottom>
                          {person.name}
                        </Typography>
                        {person.verified && (
                          <Tooltip title="Verified Profile">
                            <VerifiedIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
                          </Tooltip>
                        )}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {person.title} at {person.company}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {person.location}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <PersonAddIcon fontSize="small" color="disabled" sx={{ mr: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">
                          {person.mutualConnections} mutual connections
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                    {person.skills.map((skill: string, index: number) => (
                      <Chip 
                        key={index}
                        label={skill}
                        size="small"
                        icon={<LocalOfferIcon />}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </CardContent>
                
                <Divider />
                
                <CardActions>
                  <Button 
                    variant="contained" 
                    color="primary"
                    size="small" 
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleConnect(person.id)}
                  >
                    Connect
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleViewProfile(person)}
                  >
                    View Profile
                  </Button>
                </CardActions>
              </CommunityCard>
            </Grid>
          ))}
        </Grid>
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {communities.map((community) => (
            <Grid item key={community.id} xs={12} md={6}>
              <CommunityCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Avatar 
                      sx={{ width: 64, height: 64, mr: 2, bgcolor: 'primary.main' }}
                    >
                      <GroupIcon />
                    </Avatar>
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {community.name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {community.members.toLocaleString()} members
                      </Typography>
                      
                      <Typography variant="body2" gutterBottom>
                        {community.description}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {community.recentActivity && (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        Recent Activity:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {community.recentActivity}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                
                <Divider />
                
                <CardActions>
                  <Button 
                    variant={community.joined ? "outlined" : "contained"}
                    color="primary"
                    size="small" 
                    onClick={() => handleJoinCommunity(community.id)}
                  >
                    {community.joined ? "Joined" : "Join Community"}
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<VisibilityIcon />}
                  >
                    View Group
                  </Button>
                </CardActions>
              </CommunityCard>
            </Grid>
          ))}
        </Grid>
      </TabPanel>
      
      {/* Profile Dialog */}
      {selectedProfile && (
        <Dialog 
          open={profileDialogOpen} 
          onClose={handleCloseProfileDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogContent sx={{ p: 0 }}>
            <ProfileViewCard>
              <Box sx={{ position: 'relative', zIndex: 1, pt: 3 }}>
                <Box sx={{ display: 'flex', px: 3 }}>
                  <Avatar sx={{ width: 120, height: 120, border: '4px solid white' }}>
                    {selectedProfile.name.charAt(0)}
                  </Avatar>
                  
                  <Box sx={{ ml: 3, mt: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {selectedProfile.name}
                      </Typography>
                      {selectedProfile.verified && (
                        <Tooltip title="Verified Profile">
                          <VerifiedIcon sx={{ ml: 1, color: 'white' }} />
                        </Tooltip>
                      )}
                    </Box>
                    
                    <Typography variant="subtitle1" sx={{ color: 'white' }}>
                      {selectedProfile.title}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ p: 3, mt: 8 }}>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" gutterBottom>
                      Professional Information
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Current Position
                      </Typography>
                      <Typography variant="body1">
                        {selectedProfile.title} at {selectedProfile.company}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Location
                      </Typography>
                      <Typography variant="body1">
                        {selectedProfile.location}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Skills
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {selectedProfile.skills.map((skill: string, index: number) => (
                          <Chip 
                            key={index}
                            label={skill}
                            icon={<LocalOfferIcon />}
                          />
                        ))}
                      </Stack>
                    </Box>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        About
                      </Typography>
                      <Typography variant="body1">
                        Professional with experience in {selectedProfile.skills.join(', ')}. 
                        Currently working at {selectedProfile.company} and actively seeking 
                        new opportunities to grow professionally.
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Typography variant="h6" gutterBottom>
                      Network
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Mutual Connections
                      </Typography>
                      <Typography variant="body1">
                        {selectedProfile.mutualConnections} mutual connections
                      </Typography>
                    </Box>
                    
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                      Activity
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Profile Views
                      </Typography>
                      <Typography variant="body1">
                        {selectedProfile.profileViews} profile views
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </ProfileViewCard>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseProfileDialog}>Close</Button>
            {!selectedProfile.connected ? (
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<PersonAddIcon />}
                onClick={() => {
                  handleConnect(selectedProfile.id);
                  handleCloseProfileDialog();
                }}
              >
                Connect
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<MessageIcon />}
              >
                Message
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
      
      {/* Share Profile Dialog */}
      {selectedProfile && (
        <Dialog 
          open={shareDialogOpen} 
          onClose={handleCloseShareDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Share {selectedProfile.name}'s Profile</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Share this profile with your network or via the following methods:
            </DialogContentText>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-around', my: 3 }}>
              <Button variant="outlined" startIcon={<MessageIcon />}>
                Message
              </Button>
              <Button variant="outlined" startIcon={<ShareIcon />}>
                Email
              </Button>
              <Button variant="outlined">
                Copy Link
              </Button>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Share with your connections:
            </Typography>
            
            <List>
              {connections.filter(c => c.id !== selectedProfile.id).slice(0, 3).map((connection) => (
                <ListItem key={connection.id} disablePadding>
                  <ListItemButton>
                    <ListItemAvatar>
                      <Avatar>
                        {connection.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={connection.name} 
                      secondary={connection.title}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseShareDialog}>Cancel</Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleCloseShareDialog}
            >
              Share
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default Community; 