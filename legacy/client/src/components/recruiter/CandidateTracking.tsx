import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Card,
  CardContent,
  Avatar,
  Button,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme,
  List
} from '@mui/material';
import { styled } from '@mui/material/styles';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonIcon from '@mui/icons-material/Person';
import FlagIcon from '@mui/icons-material/Flag';
import StarIcon from '@mui/icons-material/Star';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';

// Styled components
const SectionHeading = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  '& svg': {
    marginRight: theme.spacing(1),
  }
}));

const PriorityChip = styled(Chip)(({ theme }) => ({
  fontWeight: 'bold'
}));

const CandidateTracking: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  
  // Mock data
  const candidates = [
    {
      id: 1,
      name: 'Jennifer Wilson',
      avatar: '',
      currentStage: 'Technical Interview',
      job: 'Senior Frontend Developer',
      matchScore: 94,
      priority: 'high',
      progress: 70,
      jobId: 'job-1',
      lastActivity: '2 hours ago',
      nextAction: 'Schedule final interview',
      nextActionDue: '2023-08-15'
    },
    {
      id: 2,
      name: 'Michael Chen',
      avatar: '',
      currentStage: 'Portfolio Review',
      job: 'UX/UI Designer',
      matchScore: 89,
      priority: 'medium',
      progress: 40,
      jobId: 'job-2',
      lastActivity: '1 day ago',
      nextAction: 'Review design assessment',
      nextActionDue: '2023-08-14'
    },
    {
      id: 3,
      name: 'David Rodriguez',
      avatar: '',
      currentStage: 'Code Assessment',
      job: 'Full Stack Developer',
      matchScore: 86,
      priority: 'medium',
      progress: 60,
      jobId: 'job-3',
      lastActivity: '3 days ago',
      nextAction: 'Evaluate code submission',
      nextActionDue: '2023-08-12'
    },
    {
      id: 4,
      name: 'Sarah Williams',
      avatar: '',
      currentStage: 'Initial Screening',
      job: 'Senior Frontend Developer',
      matchScore: 85,
      priority: 'low',
      progress: 20,
      jobId: 'job-1',
      lastActivity: '1 week ago',
      nextAction: 'Schedule technical interview',
      nextActionDue: '2023-08-18'
    }
  ];
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };
  
  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return theme.palette.success.main;
    if (score >= 75) return theme.palette.info.main;
    return theme.palette.warning.main;
  };
  
  return (
    <Box>
      <SectionHeading variant="h5">
        <PersonIcon />
        Candidate Tracking
      </SectionHeading>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All Candidates" />
          <Tab label="Action Required" />
          <Tab label="High Priority" />
        </Tabs>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Candidate</TableCell>
                <TableCell>Job</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Next Action</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {candidates
                .filter(candidate => {
                  if (tabValue === 1) {
                    const dueDate = new Date(candidate.nextActionDue);
                    const today = new Date();
                    return dueDate <= today;
                  } else if (tabValue === 2) {
                    return candidate.priority === 'high';
                  }
                  return true;
                })
                .map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2 }}>
                          {candidate.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {candidate.name}
                          </Typography>
                          <Chip 
                            label={`${candidate.matchScore}%`} 
                            size="small"
                            sx={{ 
                              mt: 0.5,
                              backgroundColor: getMatchScoreColor(candidate.matchScore),
                              color: 'white',
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {candidate.job}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last activity: {candidate.lastActivity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {candidate.currentStage}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <PriorityChip 
                        label={candidate.priority.toUpperCase()} 
                        color={getPriorityColor(candidate.priority) as "error" | "warning" | "success" | "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={candidate.progress} 
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="body2" color="text.secondary">
                            {candidate.progress}%
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {candidate.nextAction}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color={
                          new Date(candidate.nextActionDue) < new Date() 
                            ? 'error.main' 
                            : 'text.secondary'
                        }
                      >
                        Due: {new Date(candidate.nextActionDue).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Profile">
                        <IconButton size="small" sx={{ mr: 1 }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Advance">
                        <IconButton 
                          size="small" 
                          color="primary"
                          sx={{ mr: 1 }}
                        >
                          <ArrowForwardIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button 
                        size="small" 
                        variant="contained"
                      >
                        Take Action
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <SectionHeading variant="h6">
                <FlagIcon />
                Candidate Pipeline Metrics
              </SectionHeading>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Stage</TableCell>
                      <TableCell align="right">Candidates</TableCell>
                      <TableCell align="right">Avg. Time (days)</TableCell>
                      <TableCell align="right">Completion Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Application</TableCell>
                      <TableCell align="right">87</TableCell>
                      <TableCell align="right">1.2</TableCell>
                      <TableCell align="right">100%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Initial Screening</TableCell>
                      <TableCell align="right">45</TableCell>
                      <TableCell align="right">3.5</TableCell>
                      <TableCell align="right">51.7%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Technical Assessment</TableCell>
                      <TableCell align="right">28</TableCell>
                      <TableCell align="right">5.2</TableCell>
                      <TableCell align="right">62.2%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Interview</TableCell>
                      <TableCell align="right">15</TableCell>
                      <TableCell align="right">4.8</TableCell>
                      <TableCell align="right">53.6%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Offer</TableCell>
                      <TableCell align="right">6</TableCell>
                      <TableCell align="right">3.1</TableCell>
                      <TableCell align="right">40.0%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Hired</TableCell>
                      <TableCell align="right">4</TableCell>
                      <TableCell align="right">2.5</TableCell>
                      <TableCell align="right">66.7%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <SectionHeading variant="h6">
                <ScheduleIcon />
                Upcoming Candidate Actions
              </SectionHeading>
              <List sx={{ p: 0 }}>
                {candidates.slice(0, 3).map((candidate) => (
                  <React.Fragment key={candidate.id}>
                    <Box sx={{ py: 1.5 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ width: 36, height: 36, mr: 2 }}>
                            {candidate.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {candidate.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {candidate.job}
                            </Typography>
                          </Box>
                        </Box>
                        <PriorityChip 
                          label={candidate.priority.toUpperCase()} 
                          color={getPriorityColor(candidate.priority) as "error" | "warning" | "success" | "default"}
                          size="small"
                        />
                      </Box>
                      <Box sx={{ pl: 7, pt: 1 }}>
                        <Typography variant="body2">
                          <strong>Action:</strong> {candidate.nextAction}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={
                            new Date(candidate.nextActionDue) < new Date() 
                              ? 'error.main' 
                              : 'text.secondary'
                          }
                        >
                          Due: {new Date(candidate.nextActionDue).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                          View
                        </Button>
                        <Button size="small" variant="contained">
                          Take Action
                        </Button>
                      </Box>
                    </Box>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CandidateTracking; 