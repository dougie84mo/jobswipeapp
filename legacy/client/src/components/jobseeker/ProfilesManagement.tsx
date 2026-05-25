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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Autocomplete,
  Divider,
  Avatar,
  Paper,
  useTheme,
  Tab,
  Tabs,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../contexts/AuthContext';

// Mock data for available skills
const availableSkills = [
  'JavaScript', 'React', 'Node.js', 'TypeScript', 'HTML/CSS',
  'GraphQL', 'REST APIs', 'Redux', 'MongoDB', 'PostgreSQL',
  'Python', 'Django', 'Flask', 'AWS', 'Docker',
  'Kubernetes', 'CI/CD', 'Git', 'Agile', 'Scrum',
  'UI/UX Design', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator'
];

// Mock job categories
const jobCategories = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'UI/UX Designer', 'Product Manager', 'DevOps Engineer',
  'Data Scientist', 'Machine Learning Engineer', 'Mobile Developer',
  'QA Engineer', 'Project Manager'
];

// Mock industry list
const industries = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce',
  'Entertainment', 'Gaming', 'Automotive', 'Travel', 'Retail'
];

// Styled components
const ProfileCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
}));

const ActiveProfileMark = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 10,
  right: 10,
  color: theme.palette.success.main,
}));

const ProfilesManagement: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [profileName, setProfileName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [preferredCategory, setPreferredCategory] = useState<string | null>(null);
  const [preferredIndustry, setPreferredIndustry] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentMenuProfile, setCurrentMenuProfile] = useState<number | null>(null);
  
  // Mock effect to load profiles
  useEffect(() => {
    // In a real app, this would be an API call
    const mockProfiles = [
      {
        id: 1,
        name: 'Frontend Developer Profile',
        active: true,
        jobTitle: 'Senior Frontend Developer',
        skills: ['JavaScript', 'React', 'TypeScript', 'HTML/CSS', 'Redux'],
        preferredCategory: 'Frontend Developer',
        preferredIndustry: 'Technology',
        lastUpdated: '2023-07-15',
        jobMatches: 12
      },
      {
        id: 2,
        name: 'Full Stack Profile',
        active: false,
        jobTitle: 'Full Stack Developer',
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
        preferredCategory: 'Full Stack Developer',
        preferredIndustry: 'E-commerce',
        lastUpdated: '2023-06-20',
        jobMatches: 8
      },
      {
        id: 3,
        name: 'UI/UX Design Profile',
        active: false,
        jobTitle: 'UI/UX Designer',
        skills: ['Figma', 'Adobe XD', 'UI/UX Design', 'Wireframing', 'User Research'],
        preferredCategory: 'UI/UX Designer',
        preferredIndustry: 'Entertainment',
        lastUpdated: '2023-05-10',
        jobMatches: 5
      }
    ];
    
    setProfiles(mockProfiles);
  }, []);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, profileId: number) => {
    setAnchorEl(event.currentTarget);
    setCurrentMenuProfile(profileId);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setCurrentMenuProfile(null);
  };
  
  const handleAddProfile = () => {
    setDialogMode('create');
    setCurrentProfile(null);
    setProfileName('');
    setJobTitle('');
    setSelectedSkills([]);
    setPreferredCategory(null);
    setPreferredIndustry(null);
    setOpenDialog(true);
  };
  
  const handleEditProfile = (profile: any) => {
    setDialogMode('edit');
    setCurrentProfile(profile);
    setProfileName(profile.name);
    setJobTitle(profile.jobTitle);
    setSelectedSkills(profile.skills);
    setPreferredCategory(profile.preferredCategory);
    setPreferredIndustry(profile.preferredIndustry);
    setOpenDialog(true);
    handleCloseMenu();
  };
  
  const handleDeleteProfile = (profileId: number) => {
    setProfiles(profiles.filter(profile => profile.id !== profileId));
    handleCloseMenu();
  };
  
  const handleDuplicateProfile = (profile: any) => {
    const newProfile = {
      ...profile,
      id: Math.max(...profiles.map(p => p.id)) + 1,
      name: `${profile.name} (Copy)`,
      active: false,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    setProfiles([...profiles, newProfile]);
    handleCloseMenu();
  };
  
  const handleSetActiveProfile = (profileId: number) => {
    setProfiles(
      profiles.map(profile => ({
        ...profile,
        active: profile.id === profileId
      }))
    );
    handleCloseMenu();
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleSaveProfile = () => {
    if (dialogMode === 'create') {
      const newProfile = {
        id: Math.max(...profiles.map(p => p.id), 0) + 1,
        name: profileName,
        active: profiles.length === 0, // First profile is active by default
        jobTitle,
        skills: selectedSkills,
        preferredCategory,
        preferredIndustry,
        lastUpdated: new Date().toISOString().split('T')[0],
        jobMatches: 0
      };
      
      setProfiles([...profiles, newProfile]);
    } else {
      setProfiles(
        profiles.map(profile => 
          profile.id === currentProfile.id
            ? {
                ...profile,
                name: profileName,
                jobTitle,
                skills: selectedSkills,
                preferredCategory,
                preferredIndustry,
                lastUpdated: new Date().toISOString().split('T')[0]
              }
            : profile
        )
      );
    }
    
    handleCloseDialog();
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          My Career Profiles
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddProfile}
        >
          Create New Profile
        </Button>
      </Box>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Create multiple tailored profiles to match different job descriptions and increase your chances of getting noticed by recruiters.
      </Typography>
      
      <Grid container spacing={3}>
        {profiles.map((profile) => (
          <Grid item key={profile.id} xs={12} sm={6} md={4}>
            <ProfileCard>
              {profile.active && (
                <ActiveProfileMark>
                  <Tooltip title="Active Profile">
                    <CheckCircleIcon />
                  </Tooltip>
                </ActiveProfileMark>
              )}
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {profile.name}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleOpenMenu(e, profile.id)}
                    sx={{ ml: 1 }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  {profile.jobTitle}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Preferred Category:
                  </Typography>
                  <Chip 
                    label={profile.preferredCategory} 
                    size="small" 
                    sx={{ mb: 1 }}
                  />
                </Box>
                
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Key Skills:
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {profile.skills.slice(0, 4).map((skill: string) => (
                      <Chip 
                        key={skill} 
                        label={skill} 
                        size="small" 
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                    {profile.skills.length > 4 && (
                      <Chip 
                        label={`+${profile.skills.length - 4} more`} 
                        size="small" 
                        variant="outlined" 
                        sx={{ mb: 0.5 }}
                      />
                    )}
                  </Stack>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated: {profile.lastUpdated}
                  </Typography>
                  <Typography variant="body2" color="primary">
                    {profile.jobMatches} Job Matches
                  </Typography>
                </Box>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
                <Button 
                  size="small" 
                  onClick={() => handleEditProfile(profile)}
                >
                  Edit Profile
                </Button>
                {!profile.active && (
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="primary"
                    onClick={() => handleSetActiveProfile(profile.id)}
                  >
                    Set as Active
                  </Button>
                )}
              </CardActions>
            </ProfileCard>
          </Grid>
        ))}
      </Grid>
      
      {/* Create/Edit Profile Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Profile' : 'Edit Profile'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Customize your profile to match specific job types and increase your chances of being discovered.
          </DialogContentText>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Profile Name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                variant="outlined"
                margin="normal"
                helperText="Give your profile a descriptive name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
                variant="outlined"
                margin="normal"
                helperText="Your desired job title"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                value={preferredCategory}
                onChange={(event, newValue) => {
                  setPreferredCategory(newValue);
                }}
                id="job-category"
                options={jobCategories}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Preferred Job Category"
                    variant="outlined"
                    margin="normal"
                    helperText="Select a job category for this profile"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                value={preferredIndustry}
                onChange={(event, newValue) => {
                  setPreferredIndustry(newValue);
                }}
                id="industry"
                options={industries}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Preferred Industry"
                    variant="outlined"
                    margin="normal"
                    helperText="Select your preferred industry"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                id="skills-tags"
                options={availableSkills}
                value={selectedSkills}
                onChange={(event, newValue) => {
                  setSelectedSkills(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Skills"
                    margin="normal"
                    helperText="Select skills relevant to this profile"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      key={option}
                    />
                  ))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveProfile} 
            variant="contained" 
            color="primary"
            disabled={!profileName || !jobTitle || selectedSkills.length === 0}
          >
            {dialogMode === 'create' ? 'Create Profile' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Profile Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {currentMenuProfile && (
          <>
            <MenuItem 
              onClick={() => handleEditProfile(profiles.find(p => p.id === currentMenuProfile))}
            >
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              Edit Profile
            </MenuItem>
            <MenuItem 
              onClick={() => handleDuplicateProfile(profiles.find(p => p.id === currentMenuProfile))}
            >
              <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
              Duplicate Profile
            </MenuItem>
            {!profiles.find(p => p.id === currentMenuProfile)?.active && (
              <MenuItem onClick={() => handleSetActiveProfile(currentMenuProfile)}>
                <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                Set as Active
              </MenuItem>
            )}
            <Divider />
            <MenuItem 
              onClick={() => handleDeleteProfile(currentMenuProfile)}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              Delete Profile
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default ProfilesManagement; 