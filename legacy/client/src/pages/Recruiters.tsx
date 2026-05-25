import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  TextField, 
  Box, 
  Divider,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Pagination,
  Paper,
  SelectChangeEvent,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VerifiedIcon from '@mui/icons-material/Verified';
import RecruiterCard from '../components/recruiters/RecruiterCard';
import { 
  searchRecruiters, 
  Recruiter, 
  RecruiterSearchParams,
  getFollowedRecruiters,
  getSuggestedRecruiters
} from '../services/recruiters';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Common industries for filter options
const COMMON_INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Marketing',
  'Consulting',
  'Real Estate',
  'Hospitality'
];

// Common specialties for filter options
const COMMON_SPECIALTIES = [
  'Software Engineering',
  'Data Science',
  'Product Management',
  'UX/UI Design',
  'Marketing',
  'Sales',
  'Finance',
  'Human Resources',
  'Healthcare',
  'Legal',
  'Executive'
];

const RecruitersPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'followers' | 'recent'>('followers');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [followedRecruiters, setFollowedRecruiters] = useState<Recruiter[]>([]);
  const [suggestedRecruiters, setSuggestedRecruiters] = useState<Recruiter[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterExpanded, setFilterExpanded] = useState(!isMobile);
  
  // Load recruiters on page load and when search params change
  useEffect(() => {
    const loadRecruiters = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params: RecruiterSearchParams = {
          query: searchQuery,
          specialties: selectedSpecialties.length > 0 ? selectedSpecialties : undefined,
          companies: selectedIndustries.length > 0 ? selectedIndustries : undefined,
          isVerified: verifiedOnly || undefined,
          page,
          limit,
          sortBy
        };
        
        const data = await searchRecruiters(params);
        setRecruiters(data.recruiters);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        console.error('Error loading recruiters:', err);
        setError('Failed to load recruiters. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadRecruiters();
  }, [searchQuery, selectedIndustries, selectedSpecialties, verifiedOnly, sortBy, page, limit]);
  
  // Load followed and suggested recruiters
  useEffect(() => {
    const loadAdditionalData = async () => {
      try {
        const [followed, suggested] = await Promise.all([
          getFollowedRecruiters(),
          getSuggestedRecruiters(5)
        ]);
        
        setFollowedRecruiters(followed);
        setSuggestedRecruiters(suggested);
      } catch (err) {
        console.error('Error loading additional recruiter data:', err);
      }
    };
    
    loadAdditionalData();
  }, []);
  
  // Handle industry selection
  const handleIndustryChange = (event: SelectChangeEvent<typeof selectedIndustries>) => {
    const { target: { value } } = event;
    setSelectedIndustries(typeof value === 'string' ? value.split(',') : value);
    setPage(1); // Reset to first page on filter change
  };
  
  // Handle specialty selection
  const handleSpecialtyChange = (event: SelectChangeEvent<typeof selectedSpecialties>) => {
    const { target: { value } } = event;
    setSelectedSpecialties(typeof value === 'string' ? value.split(',') : value);
    setPage(1); // Reset to first page on filter change
  };
  
  // Handle follower status change
  const handleFollowStatusChange = (recruiterId: string, isFollowing: boolean) => {
    // Update recruiters list
    setRecruiters(prev => 
      prev.map(r => r.id === recruiterId ? { ...r, isFollowing } : r)
    );
    
    // Update followed recruiters list
    if (isFollowing) {
      const recruiter = recruiters.find(r => r.id === recruiterId);
      if (recruiter) {
        setFollowedRecruiters(prev => [...prev, { ...recruiter, isFollowing: true }]);
      }
    } else {
      setFollowedRecruiters(prev => prev.filter(r => r.id !== recruiterId));
    }
  };
  
  // Handle search query submit
  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1); // Reset to first page on search
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedIndustries([]);
    setSelectedSpecialties([]);
    setVerifiedOnly(false);
    setSortBy('followers');
    setPage(1);
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Find and Follow Recruiters
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Follow top recruiters in your industry to stay updated on job opportunities and build your professional network.
      </Typography>
      
      {/* Search bar */}
      <Paper component="form" onSubmit={handleSearchSubmit} sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search recruiters by name, company, or specialty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  aria-label="toggle filters" 
                  onClick={() => setFilterExpanded(!filterExpanded)}
                  size="small"
                >
                  <FilterListIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        <Accordion 
          expanded={filterExpanded} 
          onChange={() => setFilterExpanded(!filterExpanded)}
          disableGutters
          elevation={0}
          sx={{ 
            '&:before': { display: 'none' },
            mt: 2
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="filters-content"
            id="filters-header"
            sx={{ display: { sm: 'none' } }}
          >
            <Typography>Filters</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: { xs: 0, sm: 2 } }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="industries-label">Industries</InputLabel>
                  <Select
                    labelId="industries-label"
                    multiple
                    value={selectedIndustries}
                    onChange={handleIndustryChange}
                    input={<OutlinedInput label="Industries" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {COMMON_INDUSTRIES.map((industry) => (
                      <MenuItem key={industry} value={industry}>
                        {industry}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="specialties-label">Specialties</InputLabel>
                  <Select
                    labelId="specialties-label"
                    multiple
                    value={selectedSpecialties}
                    onChange={handleSpecialtyChange}
                    input={<OutlinedInput label="Specialties" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {COMMON_SPECIALTIES.map((specialty) => (
                      <MenuItem key={specialty} value={specialty}>
                        {specialty}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="sort-label">Sort By</InputLabel>
                  <Select
                    labelId="sort-label"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    label="Sort By"
                  >
                    <MenuItem value="followers">Most Followers</MenuItem>
                    <MenuItem value="name">Name (A-Z)</MenuItem>
                    <MenuItem value="recent">Recently Active</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  color={verifiedOnly ? "primary" : "inherit"}
                  sx={{ mr: 1, flexGrow: 1 }}
                  startIcon={verifiedOnly ? <VerifiedIcon /> : null}
                >
                  {verifiedOnly ? "Verified Only" : "All Recruiters"}
                </Button>
                <Button
                  variant="text"
                  onClick={clearFilters}
                  disabled={!searchQuery && !selectedIndustries.length && !selectedSpecialties.length && !verifiedOnly}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>
      
      {/* Followed Recruiters Section */}
      {followedRecruiters.length > 0 && (
        <Box mb={4}>
          <Typography variant="h5" component="h2" gutterBottom>
            Recruiters You Follow
          </Typography>
          <Grid container spacing={3}>
            {followedRecruiters.slice(0, isTablet ? 2 : 4).map((recruiter) => (
              <Grid item xs={12} sm={6} md={3} key={recruiter.id}>
                <RecruiterCard 
                  recruiter={recruiter} 
                  onFollowStatusChange={handleFollowStatusChange}
                />
              </Grid>
            ))}
          </Grid>
          {followedRecruiters.length > (isTablet ? 2 : 4) && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button variant="text">View All Followed Recruiters</Button>
            </Box>
          )}
        </Box>
      )}
      
      {/* Suggested Recruiters Section */}
      {suggestedRecruiters.length > 0 && (
        <Box mb={4}>
          <Typography variant="h5" component="h2" gutterBottom>
            Suggested Recruiters
          </Typography>
          <Grid container spacing={3}>
            {suggestedRecruiters.map((recruiter) => (
              <Grid item xs={12} sm={6} md={3} key={recruiter.id}>
                <RecruiterCard 
                  recruiter={recruiter} 
                  onFollowStatusChange={handleFollowStatusChange}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      <Divider sx={{ my: 4 }} />
      
      {/* Search Results */}
      <Typography variant="h5" component="h2" gutterBottom>
        {searchQuery ? `Search Results for "${searchQuery}"` : "Browse Recruiters"}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : recruiters.length > 0 ? (
        <>
          <Grid container spacing={3}>
            {recruiters.map((recruiter) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={recruiter.id}>
                <RecruiterCard 
                  recruiter={recruiter} 
                  onFollowStatusChange={handleFollowStatusChange}
                />
              </Grid>
            ))}
          </Grid>
          
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination 
                count={totalPages} 
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="body1" color="text.secondary">
            No recruiters found matching your criteria.
          </Typography>
          {(searchQuery || selectedIndustries.length > 0 || selectedSpecialties.length > 0 || verifiedOnly) && (
            <Button 
              variant="outlined" 
              onClick={clearFilters}
              sx={{ mt: 2 }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      )}
    </Container>
  );
};

export default RecruitersPage; 