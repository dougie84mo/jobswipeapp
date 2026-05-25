import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Paper,
  Stack
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WorkIcon from '@mui/icons-material/Work';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import SwipeIcon from '@mui/icons-material/SwipeRight';

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const AuthenticatedHome = () => (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {user?.userType === 'jobseeker' 
            ? 'Find your dream job by swiping right on opportunities that match your skills and interests.'
            : 'Find the perfect candidates by posting jobs and reviewing matches with qualified job seekers.'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {user?.userType === 'jobseeker' ? (
          <>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WorkIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                    <Typography variant="h6">Discover Jobs</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Browse and swipe through job listings that match your skills and preferences.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button component={Link} to="/jobs" size="small" color="primary">
                    Browse Jobs
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </>
        ) : (
          <>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WorkIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                    <Typography variant="h6">Manage Jobs</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Create, edit, and manage your job listings to attract the right candidates.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button component={Link} to="/jobs/manage" size="small" color="primary">
                    Manage Jobs
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </>
        )}

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6">Your Matches</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                View and interact with your matches to take the next step in your {user?.userType === 'jobseeker' ? 'job search' : 'hiring process'}.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to="/matches" size="small" color="primary">
                View Matches
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {user?.userType === 'recruiter' && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BusinessIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                  <Typography variant="h6">Company Profile</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Manage your company profile to attract top talent and showcase your brand.
                </Typography>
              </CardContent>
              <CardActions>
                <Button component={Link} to="/companies" size="small" color="primary">
                  Manage Company
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );

  const UnauthenticatedHome = () => (
    <Box>
      <Paper 
        sx={{ 
          py: 8, 
          px: 4, 
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(https://source.unsplash.com/random?office)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          borderRadius: 0,
          mb: 6
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            Find Your Perfect Match in the Job Market
          </Typography>
          <Typography variant="h6" paragraph sx={{ mb: 4 }}>
            JobActual connects job seekers with recruiters using a swipe-based interface, making the job search process more efficient and engaging.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button 
              variant="contained" 
              size="large" 
              component={Link} 
              to="/register" 
              sx={{ py: 1.5, px: 4 }}
            >
              Get Started
            </Button>
            <Button 
              variant="outlined" 
              size="large" 
              component={Link} 
              to="/login" 
              sx={{ py: 1.5, px: 4, color: 'white', borderColor: 'white' }}
            >
              Sign In
            </Button>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="lg">
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom textAlign="center" sx={{ mb: 4 }}>
            How It Works
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <WorkIcon color="primary" sx={{ fontSize: 48 }} />
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom textAlign="center">
                    Create Your Profile
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sign up as a job seeker or recruiter and create a detailed profile showcasing your skills or company.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <SwipeIcon color="primary" sx={{ fontSize: 48 }} />
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom textAlign="center">
                    Swipe & Match
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Swipe right on jobs or candidates you're interested in. When both parties swipe right, it's a match!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <PeopleIcon color="primary" sx={{ fontSize: 48 }} />
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom textAlign="center">
                    Connect & Communicate
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Once matched, communicate directly with potential employers or candidates to take the next step.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );

  return isAuthenticated ? <AuthenticatedHome /> : <UnauthenticatedHome />;
};

export default Home; 