import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MatchService, { Match } from '../services/matches';
import { useAuth } from '../contexts/AuthContext';
import MessageIcon from '@mui/icons-material/Message';
import WorkIcon from '@mui/icons-material/Work';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';

const Matches: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching matches...');
      const fetchedMatches = await MatchService.getMatches();
      console.log('Matches fetched:', fetchedMatches);
      setMatches(Array.isArray(fetchedMatches) ? fetchedMatches : []);
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setError(err.response?.data?.message || 'Failed to load matches. Please try again.');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (matchId: string, status: 'accepted' | 'rejected') => {
    try {
      const updatedMatch = await MatchService.updateMatchStatus(matchId, status);
      setMatches(matches.map(match => match.id === matchId ? updatedMatch : match));
    } catch (err: any) {
      console.error('Error updating match status:', err);
      setError(err.response?.data?.message || 'Failed to update match status. Please try again.');
    }
  };

  const handleViewMessages = (matchId: string) => {
    navigate(`/messages/${matchId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading matches...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Your Matches
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/match')}
          startIcon={<PersonIcon />}
        >
          Find Matches
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

      {!matches || matches.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No matches yet
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {user?.userType === 'jobseeker' 
              ? 'Start swiping on jobs to get matches with recruiters.'
              : 'Wait for job seekers to match with your job listings.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {matches.map((match) => (
            <Grid item xs={12} md={6} lg={4} key={match.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  {user?.userType === 'jobseeker' ? (
                    // Job seeker view - show job and company
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar 
                          sx={{ mr: 2, bgcolor: 'primary.main' }}
                          src={match.job?.company?.logo}
                        >
                          <BusinessIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="h2">
                            {match.job?.title || 'Unknown Job'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {match.job?.company?.name || 'Unknown Company'}
                          </Typography>
                        </Box>
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Location:</strong> {match.job?.location || 'Not specified'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Salary:</strong> {match.job?.salary || 'Not specified'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        {match.job?.description?.substring(0, 100) || 'No description available'}
                        {match.job?.description && match.job.description.length > 100 ? '...' : ''}
                      </Typography>
                    </>
                  ) : (
                    // Recruiter view - show job seeker
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar 
                          sx={{ mr: 2, bgcolor: 'primary.main' }}
                          src={match.jobseeker?.profilePicture}
                        >
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="h2">
                            {match.jobseeker ? `${match.jobseeker.firstName} ${match.jobseeker.lastName}` : 'Unknown User'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {match.jobseeker?.location || 'No location provided'}
                          </Typography>
                        </Box>
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Applied for:</strong> {match.job?.title || 'Unknown Job'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        {match.jobseeker?.bio?.substring(0, 100) || 'No bio available'}
                        {match.jobseeker?.bio && match.jobseeker.bio.length > 100 ? '...' : ''}
                      </Typography>
                    </>
                  )}
                  
                  <Box sx={{ mt: 'auto' }}>
                    <Chip 
                      label={match.status === 'pending' ? 'Pending' : match.status === 'accepted' ? 'Accepted' : 'Rejected'} 
                      color={match.status === 'accepted' ? 'success' : match.status === 'pending' ? 'primary' : 'default'} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  {match.status === 'accepted' && (
                    <Button 
                      startIcon={<MessageIcon />}
                      onClick={() => handleViewMessages(match.id)}
                      size="small"
                    >
                      Messages
                    </Button>
                  )}
                  
                  {user?.userType === 'recruiter' && match.status === 'pending' && (
                    <>
                      <Button 
                        color="success" 
                        size="small"
                        onClick={() => handleUpdateStatus(match.id, 'accepted')}
                      >
                        Accept
                      </Button>
                      <Button 
                        color="error" 
                        size="small"
                        onClick={() => handleUpdateStatus(match.id, 'rejected')}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Matches; 