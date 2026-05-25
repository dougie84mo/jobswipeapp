import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tooltip,
  Stack,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import VerifiedIcon from '@mui/icons-material/Verified';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonOffIcon from '@mui/icons-material/PersonOff';

// Styled components
const StageCard = styled(Card)(({ theme }) => ({
  height: '100%',
  position: 'relative',
  border: '1px solid rgba(0, 0, 0, 0.12)',
  '&:hover': {
    boxShadow: theme.shadows[3],
  },
}));

const StatsPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
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

interface CandidateStageData {
  stageName: string;
  count: number;
  target: number;
  candidates: {
    id: number;
    name: string;
    matchScore: number;
    status: string;
    timeInStage: number; // days
    avatar?: string;
  }[];
}

interface PerformanceMetric {
  name: string;
  value: number;
  change: number;
  unit: string;
  isPositive: boolean;
}

interface JobAnalysisProps {
  jobId: string;
  jobTitle: string;
}

const JobAnalysis: React.FC<JobAnalysisProps> = ({ jobId, jobTitle }) => {
  const theme = useTheme();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  
  // Mock data for the job analysis
  const jobStats = {
    views: 624,
    applications: 87,
    qualified: 32,
    interviewed: 12,
    offered: 3,
    hired: 1,
    rejected: 16,
    daysActive: 28,
  };
  
  const performanceMetrics: PerformanceMetric[] = [
    { name: 'Views per Day', value: 22.3, change: 12.5, unit: '', isPositive: true },
    { name: 'Application Rate', value: 13.9, change: -2.3, unit: '%', isPositive: false },
    { name: 'Qualification Rate', value: 36.8, change: 5.2, unit: '%', isPositive: true },
    { name: 'Time to Hire', value: 23, change: -4, unit: 'days', isPositive: true },
    { name: 'Offer Acceptance', value: 75, change: 0, unit: '%', isPositive: true },
    { name: 'Cost per Hire', value: 450, change: -75, unit: '$', isPositive: true },
  ];
  
  const recruitmentStages: CandidateStageData[] = [
    {
      stageName: 'Applied',
      count: 87,
      target: 100,
      candidates: [
        { id: 1, name: 'David Johnson', matchScore: 82, status: 'new', timeInStage: 1 },
        { id: 2, name: 'Sarah Williams', matchScore: 76, status: 'reviewed', timeInStage: 2 },
        { id: 3, name: 'Michael Brown', matchScore: 68, status: 'new', timeInStage: 1 },
      ]
    },
    {
      stageName: 'Screening',
      count: 32,
      target: 40,
      candidates: [
        { id: 4, name: 'Jennifer Wilson', matchScore: 94, status: 'active', timeInStage: 3 },
        { id: 5, name: 'Robert Smith', matchScore: 85, status: 'paused', timeInStage: 5 },
      ]
    },
    {
      stageName: 'Interview',
      count: 12,
      target: 15,
      candidates: [
        { id: 6, name: 'Michael Chen', matchScore: 89, status: 'scheduled', timeInStage: 4 },
        { id: 7, name: 'Emma Davis', matchScore: 82, status: 'completed', timeInStage: 6 },
      ]
    },
    {
      stageName: 'Assessment',
      count: 6,
      target: 10,
      candidates: [
        { id: 8, name: 'James Rodriguez', matchScore: 91, status: 'active', timeInStage: 2 },
      ]
    },
    {
      stageName: 'Offer',
      count: 3,
      target: 3,
      candidates: [
        { id: 9, name: 'Lisa Thompson', matchScore: 88, status: 'accepted', timeInStage: 3 },
        { id: 10, name: 'Daniel Garcia', matchScore: 90, status: 'pending', timeInStage: 1 },
      ]
    },
    {
      stageName: 'Hired',
      count: 1,
      target: 2,
      candidates: [
        { id: 11, name: 'Lisa Thompson', matchScore: 88, status: 'onboarding', timeInStage: 5 },
      ]
    }
  ];
  
  const candidatesBySkill = [
    { skill: 'React', count: 42, qualified: 28 },
    { skill: 'TypeScript', count: 36, qualified: 24 },
    { skill: 'Node.js', count: 30, qualified: 18 },
    { skill: 'MongoDB', count: 25, qualified: 15 },
    { skill: 'AWS', count: 20, qualified: 12 },
  ];
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <PersonAddIcon fontSize="small" color="primary" />;
      case 'reviewed':
        return <VerifiedIcon fontSize="small" color="success" />;
      case 'active':
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'paused':
        return <PauseCircleOutlineIcon fontSize="small" color="warning" />;
      case 'scheduled':
        return <HourglassEmptyIcon fontSize="small" color="primary" />;
      case 'completed':
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'accepted':
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'pending':
        return <HourglassEmptyIcon fontSize="small" color="warning" />;
      case 'onboarding':
        return <PersonAddIcon fontSize="small" color="success" />;
      default:
        return <ErrorIcon fontSize="small" color="error" />;
    }
  };
  
  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return theme.palette.success.main;
    if (score >= 75) return theme.palette.info.main;
    return theme.palette.warning.main;
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Job Analysis: {jobTitle} <Chip label="Active" color="success" size="small" sx={{ ml: 1 }} />
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Key Stats */}
        <Grid item xs={12} md={8}>
          <StatsPanel>
            <SectionHeading variant="h6">
              Recruitment Pipeline Overview
            </SectionHeading>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {jobStats.views}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Views
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {jobStats.applications}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Applications
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {jobStats.qualified}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Qualified
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {jobStats.interviewed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Interviewed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {jobStats.offered}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Offered
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {jobStats.hired}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hired
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                {performanceMetrics.map((metric, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {metric.name}
                      </Typography>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
                          {metric.value}{metric.unit}
                        </Typography>
                        <Chip 
                          label={`${metric.change > 0 ? '+' : ''}${metric.change}${metric.unit}`} 
                          size="small" 
                          color={metric.isPositive ? 'success' : 'error'}
                          icon={metric.isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        />
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </StatsPanel>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <StatsPanel>
            <SectionHeading variant="h6">
              Top Candidate Skills
            </SectionHeading>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Skill</TableCell>
                    <TableCell align="right">Applied</TableCell>
                    <TableCell align="right">Qualified</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {candidatesBySkill.map((row) => (
                    <TableRow key={row.skill}>
                      <TableCell component="th" scope="row">
                        {row.skill}
                      </TableCell>
                      <TableCell align="right">{row.count}</TableCell>
                      <TableCell align="right">{row.qualified}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </StatsPanel>
        </Grid>
      </Grid>
      
      <SectionHeading variant="h6">
        Candidate Pipeline Stages
      </SectionHeading>
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {recruitmentStages.map((stage, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <StageCard 
              onClick={() => setSelectedStage(stage.stageName)}
              sx={{ 
                cursor: 'pointer',
                border: selectedStage === stage.stageName 
                  ? `2px solid ${theme.palette.primary.main}`
                  : '1px solid rgba(0, 0, 0, 0.12)'
              }}
            >
              <CardContent>
                <Box textAlign="center" mb={2}>
                  <Typography variant="h6">{stage.stageName}</Typography>
                  <Typography variant="h4" color="primary.main">
                    {stage.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Target: {stage.target}
                  </Typography>
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={(stage.count / stage.target) * 100} 
                  sx={{ height: 6, borderRadius: 1 }}
                />
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Top Candidates:
                  </Typography>
                  {stage.candidates.slice(0, 2).map((candidate) => (
                    <Box key={candidate.id} display="flex" alignItems="center" mb={1}>
                      <Avatar 
                        alt={candidate.name} 
                        src={candidate.avatar}
                        sx={{ width: 24, height: 24, mr: 1 }}
                      >
                        {candidate.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                        {candidate.name}
                      </Typography>
                      <Chip 
                        label={`${candidate.matchScore}%`} 
                        size="small"
                        sx={{ 
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: getMatchScoreColor(candidate.matchScore),
                          color: 'white',
                        }}
                      />
                    </Box>
                  ))}
                  {stage.candidates.length > 2 && (
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      + {stage.candidates.length - 2} more
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </StageCard>
          </Grid>
        ))}
      </Grid>
      
      {selectedStage && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {selectedStage} Stage Candidates
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Candidate</TableCell>
                  <TableCell>Match</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time in Stage</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recruitmentStages
                  .find(stage => stage.stageName === selectedStage)?.candidates
                  .map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, width: 30, height: 30 }}>
                            {candidate.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {candidate.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${candidate.matchScore}%`} 
                          size="small"
                          sx={{ 
                            backgroundColor: getMatchScoreColor(candidate.matchScore),
                            color: 'white',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {getStatusIcon(candidate.status)}
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {candidate.timeInStage} days
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                          Review
                        </Button>
                        <Button size="small" variant="contained">
                          Advance
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default JobAnalysis; 