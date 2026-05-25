import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Paper,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import JobService, { Job } from '../services/jobs';
import SwipeableJobCard from '../components/jobs/SwipeableJobCard';

const JobBrowse: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swiping, setSwiping] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedJobs = await JobService.getJobs();
      setJobs(fetchedJobs);
      setCurrentJobIndex(0);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.response?.data?.message || 'Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (jobId: string, direction: 'right' | 'left') => {
    if (swiping) return;
    
    setSwiping(true);
    try {
      await JobService.swipeJob(jobId, direction);
      console.log(`Swiped ${direction} on job ${jobId}`);
    } catch (err: any) {
      console.error('Error swiping on job:', err);
      // We don't show an error to the user here to not interrupt the flow
    }
  };

  const handleSwipeComplete = () => {
    setSwiping(false);
    // Move to the next job
    setCurrentJobIndex(prevIndex => prevIndex + 1);
  };

  const currentJob = jobs[currentJobIndex];
  const noMoreJobs = currentJobIndex >= jobs.length;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading jobs...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchJobs}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (jobs.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            No jobs available
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            There are currently no jobs matching your profile. Check back later for new opportunities.
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={fetchJobs}
          >
            Refresh
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Discover Jobs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Swipe right on jobs you're interested in, or left to pass.
        </Typography>
      </Box>

      {noMoreJobs ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            You've seen all available jobs
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Check back later for new opportunities or refresh to see the jobs again.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={fetchJobs}
          >
            Refresh Jobs
          </Button>
        </Paper>
      ) : (
        <SwipeableJobCard 
          job={currentJob} 
          onSwipe={handleSwipe}
          onSwipeComplete={handleSwipeComplete}
        />
      )}
    </Container>
  );
};

export default JobBrowse; 