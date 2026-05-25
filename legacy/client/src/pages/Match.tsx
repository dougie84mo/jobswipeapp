import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  Divider,
  Grid,
  IconButton,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import SchoolIcon from '@mui/icons-material/School';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';

// Mock data for potential matches
const MOCK_POTENTIAL_MATCHES = [
  {
    id: '1',
    name: 'John Smith',
    title: 'Senior Frontend Developer',
    company: 'Tech Innovations Inc.',
    location: 'San Francisco, CA',
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    experience: '8 years',
    education: 'BS Computer Science, Stanford University',
    bio: 'Passionate developer with experience in building scalable web applications. Looking for new opportunities in the tech industry.',
    avatar: '',
    matchPercentage: 92
  },
  {
    id: '2',
    name: 'Emily Johnson',
    title: 'UX/UI Designer',
    company: 'Creative Solutions',
    location: 'New York, NY',
    skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping'],
    experience: '5 years',
    education: 'MFA Design, Rhode Island School of Design',
    bio: 'Creative designer focused on creating intuitive and beautiful user experiences. Passionate about accessibility and inclusive design.',
    avatar: '',
    matchPercentage: 85
  },
  {
    id: '3',
    name: 'Michael Chen',
    title: 'Full Stack Developer',
    company: 'Global Tech',
    location: 'Austin, TX',
    skills: ['JavaScript', 'Python', 'React', 'Django'],
    experience: '6 years',
    education: 'MS Computer Engineering, UT Austin',
    bio: 'Full stack developer with a passion for building robust applications. Experienced in both frontend and backend technologies.',
    avatar: '',
    matchPercentage: 78
  }
];

// Interface for filter state
interface FilterState {
  location: string;
  skills: string[];
  experienceLevel: string;
  distance: number;
  remoteOnly: boolean;
}

const Match: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [potentialMatches, setPotentialMatches] = useState(MOCK_POTENTIAL_MATCHES);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    location: '',
    skills: [],
    experienceLevel: 'any',
    distance: 50,
    remoteOnly: false
  });
  
  // For skill input
  const [skillInput, setSkillInput] = useState('');
  
  const isRecruiter = user?.userType === 'recruiter';
  
  useEffect(() => {
    // In a real app, this would fetch potential matches from the API
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);
  
  const handleLike = () => {
    // In a real app, this would send a like to the API
    console.log(`Liked ${potentialMatches[currentIndex].name}`);
    if (currentIndex < potentialMatches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // No more matches to show
      setPotentialMatches([]);
    }
  };
  
  const handleDislike = () => {
    // In a real app, this would send a dislike to the API
    console.log(`Disliked ${potentialMatches[currentIndex].name}`);
    if (currentIndex < potentialMatches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // No more matches to show
      setPotentialMatches([]);
    }
  };
  
  const handleFilterChange = (event: SelectChangeEvent | React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = event.target.name as keyof FilterState;
    const value = event.target.value;
    
    setFilters({
      ...filters,
      [name]: value
    });
  };
  
  const handleRemoteToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      remoteOnly: event.target.checked
    });
  };
  
  const handleAddSkill = () => {
    if (skillInput && !filters.skills.includes(skillInput)) {
      setFilters({
        ...filters,
        skills: [...filters.skills, skillInput]
      });
      setSkillInput('');
    }
  };
  
  const handleRemoveSkill = (skill: string) => {
    setFilters({
      ...filters,
      skills: filters.skills.filter(s => s !== skill)
    });
  };
  
  const handleApplyFilters = () => {
    // In a real app, this would fetch filtered matches from the API
    setLoading(true);
    setShowFilters(false);
    
    // Simulate API call
    setTimeout(() => {
      // For demo purposes, just reset to the beginning
      setCurrentIndex(0);
      setLoading(false);
    }, 1000);
  };
  
  const renderCurrentMatch = () => {
    if (potentialMatches.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" gutterBottom>
            No more matches available
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            We've run out of potential matches based on your criteria.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setShowFilters(true)}
            startIcon={<FilterListIcon />}
          >
            Adjust Filters
          </Button>
        </Box>
      );
    }
    
    const match = potentialMatches[currentIndex];
    
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar 
            sx={{ 
              width: '100%', 
              height: 300, 
              borderRadius: 0,
              bgcolor: 'primary.light'
            }}
          >
            {match.name.charAt(0)}
          </Avatar>
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              bgcolor: 'rgba(0,0,0,0.6)', 
              color: 'white',
              p: 2
            }}
          >
            <Typography variant="h5">{match.name}</Typography>
            <Typography variant="subtitle1">{match.title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">{match.location}</Typography>
            </Box>
          </Box>
          <Chip 
            label={`${match.matchPercentage}% Match`} 
            color="primary" 
            sx={{ 
              position: 'absolute', 
              top: 16, 
              right: 16,
              fontWeight: 'bold'
            }} 
          />
        </Box>
        
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" paragraph>
              {match.bio}
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WorkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Experience: {match.experience}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Company: {match.company}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SchoolIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Education: {match.education}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Skills:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {match.skills.map((skill) => (
                  <Chip key={skill} label={skill} size="small" />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
        
        <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
          <IconButton 
            onClick={handleDislike}
            sx={{ 
              bgcolor: 'error.light', 
              color: 'white',
              '&:hover': { bgcolor: 'error.main' },
              mx: 2
            }}
          >
            <CloseIcon fontSize="large" />
          </IconButton>
          <IconButton 
            onClick={handleLike}
            sx={{ 
              bgcolor: 'success.light', 
              color: 'white',
              '&:hover': { bgcolor: 'success.main' },
              mx: 2
            }}
          >
            <ThumbUpIcon fontSize="large" />
          </IconButton>
        </CardActions>
      </Card>
    );
  };
  
  const renderFilters = () => {
    return (
      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Filters</Typography>
          <IconButton onClick={() => setShowFilters(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Location"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Enter city, state, or zip code"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography gutterBottom>Distance (miles)</Typography>
            <Slider
              value={filters.distance}
              onChange={(_, value) => setFilters({...filters, distance: value as number})}
              valueLabelDisplay="auto"
              min={5}
              max={100}
              step={5}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch 
                  checked={filters.remoteOnly} 
                  onChange={handleRemoteToggle}
                  name="remoteOnly"
                />
              }
              label="Remote positions only"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Experience Level</InputLabel>
              <Select
                name="experienceLevel"
                value={filters.experienceLevel}
                label="Experience Level"
                onChange={handleFilterChange}
              >
                <MenuItem value="any">Any Experience</MenuItem>
                <MenuItem value="entry">Entry Level</MenuItem>
                <MenuItem value="mid">Mid Level</MenuItem>
                <MenuItem value="senior">Senior Level</MenuItem>
                <MenuItem value="executive">Executive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Typography gutterBottom>Skills</Typography>
            <Box sx={{ display: 'flex', mb: 2 }}>
              <TextField
                fullWidth
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add a skill"
                size="small"
              />
              <Button 
                variant="contained" 
                onClick={handleAddSkill}
                sx={{ ml: 1 }}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {filters.skills.map((skill) => (
                <Chip 
                  key={skill} 
                  label={skill} 
                  onDelete={() => handleRemoveSkill(skill)}
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              fullWidth 
              size="large"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>
    );
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Finding potential matches...
        </Typography>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {isRecruiter ? 'Find Candidates' : 'Find Jobs'}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<FilterListIcon />}
          onClick={() => setShowFilters(true)}
        >
          Filters
        </Button>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {showFilters ? renderFilters() : renderCurrentMatch()}
    </Container>
  );
};

export default Match; 