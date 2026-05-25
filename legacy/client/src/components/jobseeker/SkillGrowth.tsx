import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Button,
  Paper,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Stack,
  Tab,
  Tabs,
  useTheme,
  Tooltip,
  CircularProgress
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`skill-tabpanel-${index}`}
      aria-labelledby={`skill-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Styled components
const LearningCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
}));

const CircleProgressWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  marginRight: theme.spacing(2),
}));

const CircleProgressLabel = styled(Box)(({ theme }) => ({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const SkillTag = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}));

// Mock data for skills
const skillGroups = [
  {
    name: 'Technical Skills',
    skills: [
      { name: 'React', level: 75, trending: true },
      { name: 'TypeScript', level: 65, trending: true },
      { name: 'Node.js', level: 60, trending: false },
      { name: 'GraphQL', level: 40, trending: true },
      { name: 'AWS', level: 30, trending: false },
    ]
  },
  {
    name: 'Soft Skills',
    skills: [
      { name: 'Communication', level: 80, trending: false },
      { name: 'Problem Solving', level: 85, trending: false },
      { name: 'Teamwork', level: 90, trending: false },
      { name: 'Time Management', level: 70, trending: true },
    ]
  },
  {
    name: 'Design Skills',
    skills: [
      { name: 'UI Design', level: 55, trending: true },
      { name: 'Figma', level: 50, trending: true },
      { name: 'Adobe XD', level: 40, trending: false },
    ]
  }
];

// Mock learning resources
const learningResources = [
  {
    id: 1,
    title: 'Advanced React Patterns',
    type: 'Course',
    source: 'Frontend Masters',
    duration: '6 hours',
    skills: ['React', 'JavaScript'],
    saved: true,
    completed: false,
    progress: 30,
    image: 'https://via.placeholder.com/150'
  },
  {
    id: 2,
    title: 'TypeScript for React Developers',
    type: 'Workshop',
    source: 'Udemy',
    duration: '4 hours',
    skills: ['TypeScript', 'React'],
    saved: true,
    completed: false,
    progress: 60,
    image: 'https://via.placeholder.com/150'
  },
  {
    id: 3,
    title: 'Building GraphQL APIs',
    type: 'Tutorial',
    source: 'Apollo',
    duration: '3 hours',
    skills: ['GraphQL', 'Node.js'],
    saved: false,
    completed: false,
    progress: 0,
    image: 'https://via.placeholder.com/150'
  },
  {
    id: 4,
    title: 'UI/UX Design Fundamentals',
    type: 'Course',
    source: 'Coursera',
    duration: '8 hours',
    skills: ['UI Design', 'UX Design'],
    saved: true,
    completed: false,
    progress: 15,
    image: 'https://via.placeholder.com/150'
  },
  {
    id: 5,
    title: 'AWS for Frontend Developers',
    type: 'Tutorial',
    source: 'AWS Training',
    duration: '5 hours',
    skills: ['AWS', 'Cloud'],
    saved: false,
    completed: false,
    progress: 0,
    image: 'https://via.placeholder.com/150'
  },
];

// Market demands - mock data
const marketDemands = [
  { skill: 'React', demand: 90, growth: 15, salary: '$120,000' },
  { skill: 'TypeScript', demand: 85, growth: 20, salary: '$125,000' },
  { skill: 'GraphQL', demand: 70, growth: 30, salary: '$115,000' },
  { skill: 'AWS', demand: 88, growth: 18, salary: '$130,000' },
  { skill: 'Node.js', demand: 80, growth: 12, salary: '$110,000' },
  { skill: 'UI Design', demand: 75, growth: 10, salary: '$105,000' },
  { skill: 'Figma', demand: 65, growth: 25, salary: '$100,000' },
];

const SkillGrowth: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [savedResources, setSavedResources] = useState<number[]>([]);
  
  useEffect(() => {
    // In a real app, these would come from an API
    setSavedResources(learningResources.filter(r => r.saved).map(r => r.id));
  }, []);
  
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleToggleSaveResource = (resourceId: number) => {
    if (savedResources.includes(resourceId)) {
      setSavedResources(savedResources.filter(id => id !== resourceId));
    } else {
      setSavedResources([...savedResources, resourceId]);
    }
  };
  
  const getSkillLevelLabel = (level: number) => {
    if (level < 30) return 'Beginner';
    if (level < 60) return 'Intermediate';
    if (level < 85) return 'Advanced';
    return 'Expert';
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
        Skill Growth Dashboard
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Track your professional growth, discover in-demand skills, and access personalized learning resources.
      </Typography>
      
      <Grid container spacing={4}>
        {/* Skill Assessment Section */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                Your Skills
              </Typography>
              <Button 
                variant="outlined" 
                color="primary" 
                startIcon={<AddIcon />}
                size="small"
              >
                Add New Skill
              </Button>
            </Box>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleChangeTab} 
                aria-label="skill categories"
                variant="scrollable"
                scrollButtons="auto"
              >
                {skillGroups.map((group, index) => (
                  <Tab label={group.name} key={index} />
                ))}
                <Tab label="All Skills" />
              </Tabs>
            </Box>
            
            {skillGroups.map((group, index) => (
              <TabPanel value={tabValue} index={index} key={index}>
                <Grid container spacing={2}>
                  {group.skills.map((skill, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={idx}>
                      <Card sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            {skill.name}
                            {skill.trending && (
                              <Tooltip title="In-demand skill">
                                <TrendingUpIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
                              </Tooltip>
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getSkillLevelLabel(skill.level)}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={skill.level} 
                          sx={{ height: 8, borderRadius: 4, mb: 1 }} 
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {skill.level}%
                          </Typography>
                          <Button size="small">Improve</Button>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </TabPanel>
            ))}
            
            <TabPanel value={tabValue} index={skillGroups.length}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" gutterBottom>
                  All your skills in one place. Click on any skill to see learning resources.
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 2 }}>
                  {skillGroups.flatMap(group => 
                    group.skills.map((skill, idx) => (
                      <SkillTag 
                        key={`${group.name}-${idx}`}
                        label={skill.name}
                        color={skill.trending ? "primary" : "default"}
                        variant={skill.level > 70 ? "filled" : "outlined"}
                        icon={skill.level > 70 ? <StarIcon /> : undefined}
                      />
                    ))
                  )}
                </Box>
              </Box>
            </TabPanel>
          </Paper>
        </Grid>
        
        {/* Market Insights Section */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 3 }}>
              Market Insights
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Top in-demand skills for your career path
            </Typography>
            
            <List>
              {marketDemands.slice(0, 5).map((item, index) => (
                <ListItem 
                  key={index}
                  disablePadding
                  sx={{ 
                    py: 1, 
                    borderBottom: index < marketDemands.length - 1 ? '1px solid #eee' : 'none' 
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1">{item.skill}</Typography>
                        <Chip 
                          size="small" 
                          label={`+${item.growth}%`} 
                          color="success" 
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Demand: {item.demand}% • Avg. Salary: {item.salary}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={item.demand} 
                          sx={{ height: 4, borderRadius: 2, mt: 1 }} 
                          color="success"
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button color="primary">View Complete Analysis</Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Learning Resources Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 3 }}>
              Recommended Learning Resources
            </Typography>
            
            <Grid container spacing={3}>
              {learningResources.map((resource) => (
                <Grid item xs={12} sm={6} md={4} key={resource.id}>
                  <LearningCard>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Chip 
                          size="small" 
                          label={resource.type} 
                          color="primary" 
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />
                        <IconButton 
                          size="small" 
                          onClick={() => handleToggleSaveResource(resource.id)}
                          color={savedResources.includes(resource.id) ? "primary" : "default"}
                        >
                          <BookmarkIcon />
                        </IconButton>
                      </Box>
                      
                      <Typography variant="h6" component="h3" gutterBottom>
                        {resource.title}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {resource.source} • {resource.duration}
                      </Typography>
                      
                      <Stack direction="row" spacing={0.5} sx={{ mt: 2, mb: 2 }}>
                        {resource.skills.map((skill, idx) => (
                          <Chip key={idx} label={skill} size="small" />
                        ))}
                      </Stack>
                      
                      {resource.progress > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              Progress
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {resource.progress}%
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={resource.progress}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      )}
                    </CardContent>
                    
                    <Divider />
                    
                    <Box sx={{ p: 2, pt: 1, pb: 1 }}>
                      <Button 
                        fullWidth
                        color="primary"
                        variant={resource.progress > 0 ? "contained" : "outlined"}
                      >
                        {resource.progress > 0 ? "Continue Learning" : "Start Learning"}
                      </Button>
                    </Box>
                  </LearningCard>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SkillGrowth; 