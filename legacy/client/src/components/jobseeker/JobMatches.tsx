import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  Divider,
  Stack,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
  Tab,
  Tabs,
  LinearProgress,
  Paper,
  Badge,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import WorkIcon from '@mui/icons-material/Work';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PaidIcon from '@mui/icons-material/Paid';
import FilterListIcon from '@mui/icons-material/FilterList';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TuneIcon from '@mui/icons-material/Tune';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Styled components
const JobCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const MatchBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: -15,
    top: 10,
    padding: '0 6px',
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
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
      id={`job-matches-tabpanel-${index}`}
      aria-labelledby={`job-matches-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Mock data
const mockJobMatches = [
  {
    id: 1,
    title: 'Senior Frontend Developer',
    company: 'TechCorp Inc.',
    location: 'San Francisco, CA',
    salary: '$120,000 - $150,000',
    postedAt: '2 days ago',
    matchScore: 92,
    matchedProfile: 'Frontend Developer Profile',
    matchDetails: {
      skills: 86,
      experience: 95,
      education: 90,
      overall: 92
    },
    description: 'We are looking for a skilled Frontend Developer to join our dynamic team. You will be responsible for building user interfaces and implementing responsive designs.',
    skills: ['React', 'TypeScript', 'CSS', 'HTML', 'RESTful APIs'],
    isSaved: true
  },
  {
    id: 2,
    title: 'UX/UI Designer',
    company: 'DesignHub',
    location: 'Remote',
    salary: '$90,000 - $120,000',
    postedAt: '5 days ago',
    matchScore: 87,
    matchedProfile: 'UI/UX Design Profile',
    matchDetails: {
      skills: 90,
      experience: 82,
      education: 85,
      overall: 87
    },
    description: "Join our growing design team to create beautiful, intuitive user experiences across our product line. You'll collaborate closely with developers and product managers.",
    skills: ['Figma', 'User Research', 'Adobe Creative Suite', 'Prototyping', 'UI Design'],
    isSaved: false
  },
  {
    id: 3,
    title: 'Full Stack Developer',
    company: 'WebSolutions Inc.',
    location: 'New York, NY',
    salary: '$110,000 - $140,000',
    postedAt: '1 week ago',
    matchScore: 79,
    matchedProfile: 'Full Stack Profile',
    matchDetails: {
      skills: 82,
      experience: 75,
      education: 80,
      overall: 79
    },
    description: "We're seeking a Full Stack Developer to help build and maintain our web applications. You should have experience with both frontend and backend technologies.",
    skills: ['JavaScript', 'Node.js', 'React', 'MongoDB', 'Express'],
    isSaved: true
  },
  {
    id: 4,
    title: 'Product Manager',
    company: 'InnovateTech',
    location: 'Boston, MA',
    salary: '$130,000 - $160,000',
    postedAt: '3 days ago',
    matchScore: 64,
    matchedProfile: 'Frontend Developer Profile',
    matchDetails: {
      skills: 60,
      experience: 68,
      education: 70,
      overall: 64
    },
    description: 'Looking for a Product Manager to lead our development team and oversee product strategy, roadmap planning, and feature requirements.',
    skills: ['Product Strategy', 'Agile', 'User Stories', 'Market Analysis', 'Roadmapping'],
    isSaved: false
  }
];

const JobMatches: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileFilter, setProfileFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('match');
  
  useEffect(() => {
    // In a real app, this would be an API call
    setJobs(mockJobMatches);
  }, []);
  
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    // In a real app, this would trigger a search API call
  };
  
  const handleProfileFilterChange = (event: SelectChangeEvent) => {
    setProfileFilter(event.target.value as string);
  };
  
  const handleSortOrderChange = (event: SelectChangeEvent) => {
    setSortOrder(event.target.value as string);
  };
  
  const handleToggleSave = (jobId: number) => {
    setJobs(
      jobs.map(job => 
        job.id === jobId 
          ? { ...job, isSaved: !job.isSaved }
          : job
      )
    );
  };
  
  const getFilteredJobs = () => {
    // Filter by search query and profile
    return jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.skills.some((skill: string) => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesProfile = profileFilter === 'all' || job.matchedProfile === profileFilter;
      
      return matchesSearch && matchesProfile;
    }).sort((a, b) => {
      // Sort by selected criteria
      if (sortOrder === 'match') {
        return b.matchScore - a.matchScore;
      } else if (sortOrder === 'recent') {
        return a.postedAt.localeCompare(b.postedAt);
      } else {
        return 0;
      }
    });
  };
  
  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'primary';
    return 'warning';
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Job Matches
        </Typography>
      </Box>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Discover job opportunities tailored to your profiles and skills. Our matching algorithm helps you find the perfect fit.
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search jobs, companies, or skills..."
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
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth variant="outlined">
              <Select
                value={profileFilter}
                onChange={handleProfileFilterChange}
                displayEmpty
                startAdornment={
                  <InputAdornment position="start">
                    <TuneIcon fontSize="small" />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">All Profiles</MenuItem>
                <MenuItem value="Frontend Developer Profile">Frontend Developer</MenuItem>
                <MenuItem value="Full Stack Profile">Full Stack Developer</MenuItem>
                <MenuItem value="UI/UX Design Profile">UI/UX Designer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth variant="outlined">
              <Select
                value={sortOrder}
                onChange={handleSortOrderChange}
                displayEmpty
                startAdornment={
                  <InputAdornment position="start">
                    <FilterListIcon fontSize="small" />
                  </InputAdornment>
                }
              >
                <MenuItem value="match">Best Match</MenuItem>
                <MenuItem value="recent">Most Recent</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleChangeTab} aria-label="job matches tabs">
          <Tab label="All Matches" />
          <Tab label="Saved Jobs" />
          <Tab label="Applied Jobs" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {getFilteredJobs().map((job) => (
            <Grid item key={job.id} xs={12} md={6}>
              <MatchBadge 
                badgeContent={`${job.matchScore}%`} 
                color={getMatchScoreColor(job.matchScore) as 'success' | 'primary' | 'warning'}
              >
                <JobCard>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                          <WorkIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {job.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <BusinessIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                            {job.company}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <LocationOnIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                            {job.location}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton 
                        onClick={() => handleToggleSave(job.id)}
                        color={job.isSaved ? 'primary' : 'default'}
                      >
                        {job.isSaved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        <PaidIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                        {job.salary}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                        Posted {job.postedAt}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" gutterBottom>
                      {job.description}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Skills:
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {job.skills.map((skill: string, index: number) => (
                          <Chip 
                            key={index} 
                            label={skill} 
                            size="small" 
                            icon={<LocalOfferIcon />}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Match Details:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" sx={{ width: 100 }}>
                          Skills:
                        </Typography>
                        <Box sx={{ flexGrow: 1, mx: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={job.matchDetails.skills} 
                            color={getMatchScoreColor(job.matchDetails.skills) as 'success' | 'primary' | 'warning'}
                            sx={{ height: 8, borderRadius: 2 }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {job.matchDetails.skills}%
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" sx={{ width: 100 }}>
                          Experience:
                        </Typography>
                        <Box sx={{ flexGrow: 1, mx: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={job.matchDetails.experience} 
                            color={getMatchScoreColor(job.matchDetails.experience) as 'success' | 'primary' | 'warning'}
                            sx={{ height: 8, borderRadius: 2 }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {job.matchDetails.experience}%
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" sx={{ width: 100 }}>
                          Education:
                        </Typography>
                        <Box sx={{ flexGrow: 1, mx: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={job.matchDetails.education} 
                            color={getMatchScoreColor(job.matchDetails.education) as 'success' | 'primary' | 'warning'}
                            sx={{ height: 8, borderRadius: 2 }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {job.matchDetails.education}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Matched with your <strong>{job.matchedProfile}</strong>
                      </Typography>
                    </Box>
                  </CardContent>
                  
                  <Divider />
                  
                  <CardActions>
                    <Button 
                      variant="contained" 
                      color="primary"
                    >
                      Apply Now
                    </Button>
                    <Button>
                      View Details
                    </Button>
                  </CardActions>
                </JobCard>
              </MatchBadge>
            </Grid>
          ))}
        </Grid>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {getFilteredJobs().filter(job => job.isSaved).map((job) => (
            <Grid item key={job.id} xs={12} md={6}>
              <MatchBadge 
                badgeContent={`${job.matchScore}%`} 
                color={getMatchScoreColor(job.matchScore) as 'success' | 'primary' | 'warning'}
              >
                <JobCard>
                  {/* Same card content as above */}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                          <WorkIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {job.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <BusinessIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                            {job.company}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <LocationOnIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                            {job.location}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton 
                        onClick={() => handleToggleSave(job.id)}
                        color={job.isSaved ? 'primary' : 'default'}
                      >
                        {job.isSaved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        <PaidIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                        {job.salary}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                        Posted {job.postedAt}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" gutterBottom>
                      {job.description}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Skills:
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {job.skills.map((skill: string, index: number) => (
                          <Chip 
                            key={index} 
                            label={skill} 
                            size="small" 
                            icon={<LocalOfferIcon />}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                  </CardContent>
                  
                  <Divider />
                  
                  <CardActions>
                    <Button 
                      variant="contained" 
                      color="primary"
                    >
                      Apply Now
                    </Button>
                    <Button>
                      View Details
                    </Button>
                  </CardActions>
                </JobCard>
              </MatchBadge>
            </Grid>
          ))}
          
          {getFilteredJobs().filter(job => job.isSaved).length === 0 && (
            <Box sx={{ py: 5, textAlign: 'center', width: '100%' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No saved jobs yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                When you save jobs, they will appear here for easy access
              </Typography>
            </Box>
          )}
        </Grid>
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ py: 5, textAlign: 'center', width: '100%' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No applied jobs yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            When you apply for jobs, they will appear here for tracking
          </Typography>
          <Button variant="contained" color="primary" onClick={() => setTabValue(0)}>
            Browse Jobs
          </Button>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default JobMatches; 