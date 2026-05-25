import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
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
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StarIcon from '@mui/icons-material/Star';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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

const JobCard = styled(Card)(({ theme }) => ({
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

const JobSeekingProgress = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  border: '1px solid rgba(0, 0, 0, 0.12)',
  borderRadius: theme.shape.borderRadius,
}));

const ActionAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

// Mock data with more emphasis on practical, direct opportunities
const recentJobs = [
  {
    id: 1,
    title: 'Senior Frontend Developer',
    company: 'TechVision Inc.',
    location: 'San Francisco, CA (Remote)',
    matchScore: 92,
    postedDays: 2,
    logo: 'https://via.placeholder.com/40',
    skills: ['React', 'TypeScript', 'CSS3'],
    salary: '$120k - $150k',
    applicationDeadline: '2023-08-15',
    interviewRounds: 2
  },
  {
    id: 2,
    title: 'UI/UX Designer',
    company: 'DesignHub Studio',
    location: 'New York, NY (Hybrid)',
    matchScore: 88,
    postedDays: 1,
    logo: 'https://via.placeholder.com/40',
    skills: ['Figma', 'UI Design', 'User Research'],
    salary: '$100k - $130k',
    applicationDeadline: '2023-08-10',
    interviewRounds: 3
  },
  {
    id: 3,
    title: 'Full Stack Developer',
    company: 'GrowthLabs',
    location: 'Austin, TX (On-site)',
    matchScore: 85,
    postedDays: 3,
    logo: 'https://via.placeholder.com/40',
    skills: ['Node.js', 'React', 'MongoDB'],
    salary: '$110k - $140k',
    applicationDeadline: '2023-08-20',
    interviewRounds: 2
  }
];

const recentActivity = [
  {
    id: 1,
    type: 'profile-view',
    company: 'TechVision Inc.',
    time: '2 hours ago',
    message: 'Your profile was viewed by a recruiter at TechVision Inc.'
  },
  {
    id: 2,
    type: 'job-match',
    job: 'Senior Frontend Developer',
    company: 'InnovateTech',
    time: '1 day ago',
    message: 'New job match: Senior Frontend Developer at InnovateTech (95% match)'
  },
  {
    id: 3,
    type: 'application-status',
    job: 'UX Researcher',
    company: 'UserFirst Design',
    time: '2 days ago',
    message: 'Your application for UX Researcher at UserFirst Design is under review'
  },
  {
    id: 4,
    type: 'skill-recommendation',
    skill: 'GraphQL',
    time: '3 days ago',
    message: 'Adding GraphQL to your skills could improve your match rate by 15%'
  }
];

const upcomingInterviews = [
  {
    id: 1,
    company: 'DataSync Technologies',
    position: 'Frontend Developer',
    date: '2023-08-10T14:00:00',
    type: 'Technical',
    round: 2,
    interviewers: [
      { name: 'John Smith', title: 'Senior Developer' },
      { name: 'Sarah Johnson', title: 'Engineering Manager' }
    ],
    location: 'Virtual - Zoom Meeting'
  },
  {
    id: 2,
    company: 'CloudScale Solutions',
    position: 'UX Designer',
    date: '2023-08-12T11:00:00',
    type: 'Portfolio Review',
    round: 1,
    interviewers: [
      { name: 'Michael Brown', title: 'Design Lead' }
    ],
    location: 'Virtual - Google Meet'
  }
];

const actionItems = [
  {
    id: 1,
    type: 'critical',
    message: 'Update your resume - your profile is missing recent work experience',
    action: 'Update Now',
    link: '/resumes'
  },
  {
    id: 2,
    type: 'important',
    message: 'Complete skill assessment to improve match quality',
    action: 'Take Assessment',
    link: '/skills'
  },
  {
    id: 3,
    type: 'reminder',
    message: 'Follow up on your application to WebTech Solutions',
    action: 'Send Message',
    link: '/messages'
  }
];

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    profileViews: 24,
    appliedJobs: 8,
    interviews: 2,
    savedJobs: 15
  });
  
  const [jobSeekingProgress, setJobSeekingProgress] = useState({
    profileCompletion: 85,
    applicationsTarget: 75,
    skillsMatch: 90,
    overallProgress: 82
  });
  
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
  
  return (
    <Box>
      <Grid container spacing={3}>
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
        <Grid item xs={12} md={3}>
          <StatsCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Avatar sx={{ bgcolor: 'primary.light', mr: 1 }}>
                  <VisibilityIcon />
                </Avatar>
                <Typography variant="h5" component="div">
                  {stats.profileViews}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Profile Views
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <StatsCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Avatar sx={{ bgcolor: 'primary.light', mr: 1 }}>
                  <WorkIcon />
                </Avatar>
                <Typography variant="h5" component="div">
                  {stats.appliedJobs}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Applied Jobs
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <StatsCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Avatar sx={{ bgcolor: 'primary.light', mr: 1 }}>
                  <PeopleIcon />
                </Avatar>
                <Typography variant="h5" component="div">
                  {stats.interviews}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Upcoming Interviews
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <StatsCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Avatar sx={{ bgcolor: 'primary.light', mr: 1 }}>
                  <NotificationsIcon />
                </Avatar>
                <Typography variant="h5" component="div">
                  {stats.savedJobs}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Saved Jobs
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        
        {/* Job Seeking Progress */}
        <Grid item xs={12}>
          <SectionHeading variant="h5">
            <AssessmentIcon />
            Job Search Progress
          </SectionHeading>
          <JobSeekingProgress>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Profile Completion</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {jobSeekingProgress.profileCompletion}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={jobSeekingProgress.profileCompletion} 
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
                
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Applications Target (10)</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {jobSeekingProgress.applicationsTarget}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={jobSeekingProgress.applicationsTarget} 
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Skills Match Rate</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {jobSeekingProgress.skillsMatch}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={jobSeekingProgress.skillsMatch} 
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
                
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Overall Progress</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {jobSeekingProgress.overallProgress}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={jobSeekingProgress.overallProgress} 
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              </Grid>
            </Grid>
          </JobSeekingProgress>
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
                      <Typography variant="h6">{interview.position}</Typography>
                      <Typography variant="body2">
                        <BusinessIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {interview.company}
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
                      Prepare
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
                to="/jobs"
              >
                Find Jobs to Apply
              </Button>
            </Paper>
          )}
        </Grid>
        
        {/* Best Job Matches */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionHeading variant="h5">
              <StarIcon />
              Best Job Matches
            </SectionHeading>
            <Button 
              variant="text" 
              endIcon={<ArrowForwardIcon />}
              component={Link}
              to="/job-matches"
            >
              View All
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            {recentJobs.slice(0, 3).map((job) => (
              <Grid item xs={12} key={job.id}>
                <JobCard>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between">
                      <Box display="flex">
                        <Avatar src={job.logo} sx={{ mr: 2 }}>
                          <WorkIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">{job.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            <BusinessIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            {job.company}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {job.location}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        label={`${job.matchScore}%`} 
                        sx={{ 
                          backgroundColor: getMatchScoreColor(job.matchScore),
                          color: '#fff',
                          fontWeight: 'bold'
                        }} 
                      />
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Salary:</strong> {job.salary}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Posted:</strong> {job.postedDays} days ago
                      </Typography>
                      <Typography variant="body2" color={daysUntil(job.applicationDeadline) < 3 ? 'error.main' : 'text.primary'}>
                        <strong>Deadline:</strong> {new Date(job.applicationDeadline).toLocaleDateString()} ({daysUntil(job.applicationDeadline)} days left)
                      </Typography>
                    </Box>
                    
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      {job.skills.map((skill, index) => (
                        <Chip key={index} label={skill} size="small" variant="outlined" />
                      ))}
                    </Stack>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                        Save
                      </Button>
                      <Button size="small" variant="contained" color="primary">
                        Apply Now
                      </Button>
                    </Box>
                  </CardContent>
                </JobCard>
              </Grid>
            ))}
          </Grid>
        </Grid>
        
        {/* Recent Activity */}
        <Grid item xs={12}>
          <SectionHeading variant="h5">
            <TrendingUpIcon />
            Recent Activity
          </SectionHeading>
          <ActivityPaper>
            <List>
              {recentActivity.map((activity) => (
                <React.Fragment key={activity.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>
                        {activity.type === 'profile-view' && <VisibilityIcon />}
                        {activity.type === 'job-match' && <WorkIcon />}
                        {activity.type === 'application-status' && <NotificationsIcon />}
                        {activity.type === 'skill-recommendation' && <ErrorIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2">
                          {activity.message}
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
      </Grid>
    </Box>
  );
};

export default Dashboard; 