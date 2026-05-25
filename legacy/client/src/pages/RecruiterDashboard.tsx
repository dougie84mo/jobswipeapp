import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  CardHeader,
  Button, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  useTheme,
  AvatarGroup,
  Alert,
  Tooltip,
  Container,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import WorkIcon from '@mui/icons-material/Work';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StarIcon from '@mui/icons-material/Star';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AddIcon from '@mui/icons-material/Add';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PercentIcon from '@mui/icons-material/Percent';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import JobService from '../services/jobs';
import CompanyService from '../services/companies';

// Styled components for a militant, efficient interface
const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.2s ease',
  position: 'relative',
  borderLeft: `4px solid ${theme.palette.primary.main}`,
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: theme.shadows[3],
  }
}));

const CandidateCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  position: 'relative',
  border: '1px solid rgba(0, 0, 0, 0.12)',
  '&:hover': {
    boxShadow: theme.shadows[3],
  },
}));

const ActivityPaper = styled(Paper)(({ theme }) => ({
  height: '100%',
  position: 'relative',
  padding: theme.spacing(2),
  border: '1px solid rgba(0, 0, 0, 0.12)',
}));

const SectionHeading = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  '& svg': {
    marginRight: theme.spacing(1),
  }
}));

const RecruitmentProgress = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  border: '1px solid rgba(0, 0, 0, 0.12)',
  borderRadius: theme.shape.borderRadius,
}));

const ActionAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

// Mock data for recruitment metrics
const recentCandidates = [
  {
    id: 1,
    name: 'Jennifer Wilson',
    position: 'Senior Frontend Developer',
    jobId: 'job-1',
    matchScore: 94,
    appliedDate: '2023-08-01',
    skills: ['React', 'TypeScript', 'Node.js'],
    experience: '7 years',
    location: 'Remote',
    avatar: 'https://via.placeholder.com/40',
    status: 'screening'
  },
  {
    id: 2,
    name: 'Michael Chen',
    position: 'UX/UI Designer',
    jobId: 'job-2',
    matchScore: 89,
    appliedDate: '2023-07-30',
    skills: ['Figma', 'User Research', 'Adobe Creative Suite'],
    experience: '5 years',
    location: 'New York, NY',
    avatar: 'https://via.placeholder.com/40',
    status: 'interview'
  },
  {
    id: 3,
    name: 'David Rodriguez',
    position: 'Full Stack Developer',
    jobId: 'job-3',
    matchScore: 86,
    appliedDate: '2023-07-28',
    skills: ['JavaScript', 'React', 'MongoDB', 'Express'],
    experience: '4 years',
    location: 'Chicago, IL',
    avatar: 'https://via.placeholder.com/40',
    status: 'assessment'
  }
];

const upcomingInterviews = [
  {
    id: 1,
    candidate: 'Jennifer Wilson',
    position: 'Senior Frontend Developer',
    jobId: 'job-1',
    date: '2023-08-10T14:00:00',
    type: 'Technical',
    round: 2,
    interviewers: [
      { name: 'Robert Smith', title: 'Senior Developer' },
      { name: 'Alice Johnson', title: 'Engineering Manager' }
    ],
    location: 'Virtual - Zoom Meeting'
  },
  {
    id: 2,
    candidate: 'Michael Chen',
    position: 'UX/UI Designer',
    jobId: 'job-2',
    date: '2023-08-12T11:00:00',
    type: 'Portfolio Review',
    round: 1,
    interviewers: [
      { name: 'Emily Davis', title: 'Design Lead' }
    ],
    location: 'Virtual - Google Meet'
  }
];

const jobMetrics = [
  {
    id: 'job-1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp Inc.',
    views: 245,
    applications: 32,
    matchRate: 22,
    timeToHire: 18, // days
    status: 'active',
    daysActive: 12,
    topSkills: ['React', 'TypeScript', 'Next.js']
  },
  {
    id: 'job-2',
    title: 'UX/UI Designer',
    company: 'DesignLabs',
    views: 187,
    applications: 28,
    matchRate: 18,
    timeToHire: null, // still open
    status: 'active',
    daysActive: 8,
    topSkills: ['Figma', 'UI Design', 'User Research']
  },
  {
    id: 'job-3',
    title: 'Full Stack Developer',
    company: 'WebTech Solutions',
    views: 312,
    applications: 45,
    matchRate: 24,
    timeToHire: 15, // days
    status: 'filled',
    daysActive: 15,
    topSkills: ['JavaScript', 'Node.js', 'React', 'MongoDB']
  }
];

const recentActivity = [
  {
    id: 1,
    type: 'application',
    candidate: 'Sarah Williams',
    job: 'Senior Frontend Developer',
    company: 'TechCorp Inc.',
    time: '2 hours ago',
    matchScore: 87
  },
  {
    id: 2,
    type: 'interview-scheduled',
    candidate: 'Michael Chen',
    job: 'UX/UI Designer',
    company: 'DesignLabs',
    time: '1 day ago',
    interviewTime: '2023-08-12T11:00:00'
  },
  {
    id: 3,
    type: 'candidate-hired',
    candidate: 'John Smith',
    job: 'Full Stack Developer',
    company: 'WebTech Solutions',
    time: '2 days ago'
  },
  {
    id: 4,
    type: 'job-views',
    job: 'Senior Frontend Developer',
    company: 'TechCorp Inc.',
    time: '3 days ago',
    viewCount: 50
  }
];

const actionItems = [
  {
    id: 1,
    type: 'critical',
    message: 'Your "UX/UI Designer" job has 5 unreviewed applications',
    action: 'Review Now',
    link: '/jobs/manage'
  },
  {
    id: 2,
    type: 'important',
    message: 'Schedule final interview for Jennifer Wilson (94% match)',
    action: 'Schedule',
    link: '/matches'
  },
  {
    id: 3,
    type: 'reminder',
    message: 'Your "Senior Frontend Developer" job posting expires in 3 days',
    action: 'Extend',
    link: '/jobs/manage'
  }
];

const RecruiterDashboard: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalCompanies: 0,
    totalMatches: 0,
    interviewsScheduled: 0,
    candidatesHired: 0,
    remainingPosts: 0
  });
  
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [recruitmentProgress, setRecruitmentProgress] = useState({
    candidateAcquisition: 78,
    interviewCompletion: 65,
    offerAcceptance: 90,
    overallEfficiency: 76
  });
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Check if user exists and is a recruiter
        if (!user) {
          console.log('User data not loaded yet');
          return; // Wait for user data to load
        }
        
        if (user.userType !== 'recruiter') {
          setError('Access denied. This dashboard is for recruiters only.');
          setLoading(false);
          return;
        }
        
        // Fetch jobs
        const jobsData = await JobService.getRecruiterJobs();
        
        // Fetch companies (simplified for now)
        const companiesData = await CompanyService.getCompanies();
        
        // In a real app, we would fetch all these metrics from the backend
        // For now, use mock data and some real data where available
        setStats({
          totalJobs: jobsData.length,
          activeJobs: jobsData.filter(job => job.isActive).length,
          totalCompanies: companiesData.length,
          totalMatches: 24, // Mock data
          interviewsScheduled: 8, // Mock data
          candidatesHired: 3, // Mock data
          remainingPosts: 5 // Placeholder, will be fetched from user subscription
        });
        
        // Set recent jobs
        setRecentJobs(jobsData.slice(0, 5));
        
        // Set recent matches (placeholder)
        setRecentMatches(recentCandidates); // Using mock data for now
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);
  
  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return theme.palette.success.main;
    if (score >= 75) return theme.palette.info.main;
    return theme.palette.warning.main;
  };
  
  const getActionItemSeverity = (type: string) => {
    switch(type) {
      case 'critical': return 'error';
      case 'important': return 'warning';
      case 'reminder': return 'info';
      default: return 'info';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  const daysUntil = (dateString: string) => {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading dashboard...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Recruiter Dashboard
        </Typography>
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

      {/* Action Items Alert Section */}
      <Grid item xs={12}>
        <Box mb={2}>
          {actionItems.map((item) => (
            <ActionAlert
              key={item.id}
              severity={getActionItemSeverity(item.type) as "error" | "warning" | "info" | "success"}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  component={Link} 
                  to={item.link}
                >
                  {item.action}
                </Button>
              }
            >
              {item.message}
            </ActionAlert>
          ))}
        </Box>
      </Grid>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'primary.light',
              color: 'white'
            }}
          >
            <Typography component="h2" variant="h6" color="inherit" gutterBottom>
              Total Jobs
            </Typography>
            <Typography component="p" variant="h4">
              {stats.totalJobs}
            </Typography>
            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
              <WorkIcon />
              <Typography variant="body2" sx={{ ml: 1 }}>
                {stats.activeJobs} active
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'secondary.light',
              color: 'white'
            }}
          >
            <Typography component="h2" variant="h6" color="inherit" gutterBottom>
              Companies
            </Typography>
            <Typography component="p" variant="h4">
              {stats.totalCompanies}
            </Typography>
            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
              <BusinessIcon />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Manage your companies
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'success.light',
              color: 'white'
            }}
          >
            <Typography component="h2" variant="h6" color="inherit" gutterBottom>
              Matches
            </Typography>
            <Typography component="p" variant="h4">
              {stats.totalMatches}
            </Typography>
            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
              <PeopleIcon />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Potential candidates
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'info.light',
              color: 'white'
            }}
          >
            <Typography component="h2" variant="h6" color="inherit" gutterBottom>
              Job Posts Remaining
            </Typography>
            <Typography component="p" variant="h4">
              {stats.remainingPosts}
            </Typography>
            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon />
              <Typography variant="body2" sx={{ ml: 1 }}>
                This month
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recruitment Progress */}
      <Grid item xs={12}>
        <SectionHeading variant="h5">
          <AssessmentIcon />
          Recruitment Progress
        </SectionHeading>
        <RecruitmentProgress>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Candidate Acquisition</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {recruitmentProgress.candidateAcquisition}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={recruitmentProgress.candidateAcquisition} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
              
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Interview Completion</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {recruitmentProgress.interviewCompletion}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={recruitmentProgress.interviewCompletion} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Offer Acceptance Rate</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {recruitmentProgress.offerAcceptance}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={recruitmentProgress.offerAcceptance} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
              
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Overall Recruitment Efficiency</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {recruitmentProgress.overallEfficiency}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={recruitmentProgress.overallEfficiency} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
            </Grid>
          </Grid>
        </RecruitmentProgress>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Recent Jobs" 
              action={
                <Button 
                  component={Link} 
                  to="/jobs/manage" 
                  size="small"
                >
                  View All
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {recentJobs.length > 0 ? (
                <List>
                  {recentJobs.map((job) => (
                    <React.Fragment key={job.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <WorkIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={job.title}
                          secondary={`${job.company?.name || 'Unknown Company'} • ${new Date(job.createdAt).toLocaleDateString()}`}
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No jobs created yet
                  </Typography>
                  <Button 
                    component={Link} 
                    to="/jobs/manage" 
                    variant="contained" 
                    sx={{ mt: 2 }}
                  >
                    Create Job
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Recent Matches" 
              action={
                <Box>
                  <Button 
                    component={Link} 
                    to="/matches" 
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    View All
                  </Button>
                  <Button 
                    component={Link} 
                    to="/match" 
                    size="small"
                    variant="contained"
                    color="primary"
                  >
                    Find Matches
                  </Button>
                </Box>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {recentMatches.length > 0 ? (
                <List>
                  {recentMatches.map((match) => (
                    <React.Fragment key={match.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar src={match.jobSeeker?.profilePicture}>
                            <PeopleIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${match.jobSeeker?.firstName} ${match.jobSeeker?.lastName}`}
                          secondary={`Matched for ${match.job?.title} • ${new Date(match.matchDate).toLocaleDateString()}`}
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No matches yet
                  </Typography>
                  <Button 
                    component={Link} 
                    to="/jobs/manage" 
                    variant="contained" 
                    sx={{ mt: 2 }}
                  >
                    Post More Jobs
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Networking Section */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Grow Your Professional Network" 
              subheader="Connect with other recruiters in your industry"
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="body1" paragraph>
                    Find and follow other recruiters to build your network, share job opportunities, 
                    and stay updated with industry trends. Expand your reach and collaborate with 
                    professionals in your field.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      component={Link}
                      to="/recruiters"
                      variant="contained"
                      color="primary"
                      startIcon={<GroupAddIcon />}
                    >
                      Find Recruiters
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Avatar 
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      bgcolor: 'primary.light',
                      display: { xs: 'none', md: 'flex' }
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 50 }} />
                  </Avatar>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upcoming Interviews */}
      <Grid item xs={12} md={6}>
        <SectionHeading variant="h5">
          <ScheduleIcon />
          Upcoming Interviews
        </SectionHeading>
        {upcomingInterviews.length > 0 ? (
          <List>
            {upcomingInterviews.map((interview) => (
              <Paper key={interview.id} sx={{ mb: 2, p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6">{interview.candidate}</Typography>
                    <Typography variant="body2">
                      <WorkIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {interview.position}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>{formatDate(interview.date)}</strong> • {interview.type} (Round {interview.round})
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {interview.location}
                    </Typography>
                  </Box>
                  <Chip 
                    label={`${daysUntil(interview.date)} days`} 
                    color="primary" 
                    size="small" 
                  />
                </Box>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Typography variant="body2">
                  Interviewers:
                </Typography>
                <AvatarGroup max={3} sx={{ mt: 1 }}>
                  {interview.interviewers.map((interviewer, idx) => (
                    <Tooltip key={idx} title={`${interviewer.name} (${interviewer.title})`}>
                      <Avatar alt={interviewer.name} sx={{ width: 30, height: 30 }}>
                        {interviewer.name.charAt(0)}
                      </Avatar>
                    </Tooltip>
                  ))}
                </AvatarGroup>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button size="small" variant="outlined">
                    Reschedule
                  </Button>
                  <Button size="small" variant="contained" sx={{ ml: 1 }}>
                    Join
                  </Button>
                </Box>
              </Paper>
            ))}
          </List>
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No upcoming interviews scheduled
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              sx={{ mt: 2 }}
              component={Link}
              to="/matches"
            >
              Find Candidates
            </Button>
          </Paper>
        )}
      </Grid>

      {/* Top Candidates */}
      <Grid item xs={12} md={6}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionHeading variant="h5">
            <StarIcon />
            Top Candidates
          </SectionHeading>
          <Button 
            variant="text" 
            endIcon={<ArrowForwardIcon />}
            component={Link}
            to="/matches"
          >
            View All
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          {recentCandidates.map((candidate) => (
            <Grid item xs={12} key={candidate.id}>
              <CandidateCard>
                <CardContent>
                  <Box display="flex" justifyContent="space-between">
                    <Box display="flex">
                      <Avatar src={candidate.avatar} sx={{ mr: 2 }}>
                        {candidate.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{candidate.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          <WorkIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                          {candidate.position}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {candidate.location} • {candidate.experience}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={`${candidate.matchScore}%`} 
                      sx={{ 
                        backgroundColor: getMatchScoreColor(candidate.matchScore),
                        color: '#fff',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Applied:</strong> {new Date(candidate.appliedDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                    </Typography>
                  </Box>
                  
                  <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                    {candidate.skills.map((skill, index) => (
                      <Chip key={index} label={skill} size="small" variant="outlined" />
                    ))}
                  </Stack>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                      Review
                    </Button>
                    <Button size="small" variant="contained" color="primary">
                      Schedule Interview
                    </Button>
                  </Box>
                </CardContent>
              </CandidateCard>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Job Metrics */}
      <Grid item xs={12}>
        <SectionHeading variant="h5">
          <TrendingUpIcon />
          Job Performance
        </SectionHeading>
        <Grid container spacing={2}>
          {jobMetrics.map((job) => (
            <Grid item xs={12} md={4} key={job.id}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6">{job.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    <BusinessIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    {job.company}
                  </Typography>
                  <Chip 
                    label={job.status.toUpperCase()} 
                    color={job.status === 'active' ? 'success' : job.status === 'filled' ? 'primary' : 'default'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Views</Typography>
                  <Typography variant="body2" fontWeight="bold">{job.views}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Applications</Typography>
                  <Typography variant="body2" fontWeight="bold">{job.applications}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Match Rate</Typography>
                  <Typography variant="body2" fontWeight="bold">{job.matchRate}%</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {job.status === 'filled' ? 'Time to Hire' : 'Days Active'}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {job.status === 'filled' ? `${job.timeToHire} days` : `${job.daysActive} days`}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Typography variant="body2" sx={{ mb: 1 }}>Top Skills Required:</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {job.topSkills.map((skill, index) => (
                    <Chip key={index} label={skill} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Grid>
      
      {/* Recent Activity */}
      <Grid item xs={12}>
        <SectionHeading variant="h5">
          <NotificationsIcon />
          Recent Activity
        </SectionHeading>
        <ActivityPaper>
          <List>
            {recentActivity.map((activity) => (
              <React.Fragment key={activity.id}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar>
                      {activity.type === 'application' && <PersonSearchIcon />}
                      {activity.type === 'interview-scheduled' && <EventAvailableIcon />}
                      {activity.type === 'candidate-hired' && <CheckCircleIcon />}
                      {activity.type === 'job-views' && <VisibilityIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2">
                        {activity.type === 'application' && activity.candidate && activity.job && `New application from ${activity.candidate} for ${activity.job} (${activity.matchScore}% match)`}
                        {activity.type === 'interview-scheduled' && activity.interviewTime && activity.candidate && activity.job && `Interview scheduled with ${activity.candidate} for ${activity.job} on ${formatDate(activity.interviewTime)}`}
                        {activity.type === 'candidate-hired' && activity.candidate && activity.job && `${activity.candidate} was hired for ${activity.job} position`}
                        {activity.type === 'job-views' && activity.job && `Your ${activity.job} job posting received ${activity.viewCount} new views`}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {activity.time}
                      </Typography>
                    }
                  />
                  <Button size="small" variant="text">
                    Action
                  </Button>
                </ListItem>
                {activity.id !== recentActivity.length && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        </ActivityPaper>
      </Grid>
    </Container>
  );
};

export default RecruiterDashboard; 