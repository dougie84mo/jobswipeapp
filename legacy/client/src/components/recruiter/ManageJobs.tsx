import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Divider,
  Avatar,
  useTheme,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../../contexts/AuthContext';

// Styled components
const JobCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
}));

const ActiveJobMark = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 10,
  right: 10,
  color: theme.palette.success.main,
}));

const ManageJobs: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentMenuJob, setCurrentMenuJob] = useState<number | null>(null);
  
  // Mock effect to load jobs
  useEffect(() => {
    // In a real app, this would be an API call
    const mockJobs = [
      {
        id: 1,
        title: 'Senior Frontend Developer',
        company: 'TechCorp Inc.',
        location: 'Remote',
        status: 'active',
        postedDate: '2023-07-15',
        applications: 32,
        views: 245,
        matchRate: 22,
        description: 'Looking for an experienced Frontend Developer with strong React skills',
        requirements: 'React, TypeScript, 5+ years experience',
        skills: ['React', 'TypeScript', 'Node.js', 'Redux']
      },
      {
        id: 2,
        title: 'UX/UI Designer',
        company: 'DesignLabs',
        location: 'New York, NY',
        status: 'active',
        postedDate: '2023-07-10',
        applications: 28,
        views: 187,
        matchRate: 18,
        description: 'Seeking a creative UX/UI Designer to join our design team',
        requirements: 'Figma, Adobe XD, 3+ years experience',
        skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'User Research']
      },
      {
        id: 3,
        title: 'Full Stack Developer',
        company: 'WebTech Solutions',
        location: 'San Francisco, CA',
        status: 'filled',
        postedDate: '2023-06-20',
        applications: 45,
        views: 312,
        matchRate: 24,
        description: 'Join our team as a Full Stack Developer working on cutting-edge web applications',
        requirements: 'Node.js, React, MongoDB, 4+ years experience',
        skills: ['Node.js', 'React', 'MongoDB', 'Express']
      }
    ];
    
    setJobs(mockJobs);
  }, []);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, jobId: number) => {
    setAnchorEl(event.currentTarget);
    setCurrentMenuJob(jobId);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setCurrentMenuJob(null);
  };
  
  const handleAddJob = () => {
    setDialogMode('create');
    setCurrentJob(null);
    setJobTitle('');
    setCompany('');
    setLocation('');
    setDescription('');
    setRequirements('');
    setOpenDialog(true);
  };
  
  const handleEditJob = (job: any) => {
    setDialogMode('edit');
    setCurrentJob(job);
    setJobTitle(job.title);
    setCompany(job.company);
    setLocation(job.location);
    setDescription(job.description);
    setRequirements(job.requirements);
    setOpenDialog(true);
    handleCloseMenu();
  };
  
  const handleDeleteJob = (jobId: number) => {
    setJobs(jobs.filter(job => job.id !== jobId));
    handleCloseMenu();
  };
  
  const handleDuplicateJob = (job: any) => {
    const newJob = {
      ...job,
      id: Math.max(...jobs.map(j => j.id)) + 1,
      title: `${job.title} (Copy)`,
      status: 'draft',
      postedDate: new Date().toISOString().split('T')[0],
      applications: 0,
      views: 0,
      matchRate: 0
    };
    
    setJobs([...jobs, newJob]);
    handleCloseMenu();
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleSaveJob = () => {
    if (dialogMode === 'create') {
      const newJob = {
        id: Math.max(...jobs.map(j => j.id)) + 1,
        title: jobTitle,
        company: company,
        location: location,
        status: 'active',
        postedDate: new Date().toISOString().split('T')[0],
        applications: 0,
        views: 0,
        matchRate: 0,
        description: description,
        requirements: requirements,
        skills: requirements.split(',').map((skill: string) => skill.trim())
      };
      
      setJobs([...jobs, newJob]);
    } else if (currentJob) {
      setJobs(
        jobs.map(job => 
          job.id === currentJob.id
            ? {
                ...job,
                title: jobTitle,
                company: company,
                location: location,
                description: description,
                requirements: requirements,
                skills: requirements.split(',').map((skill: string) => skill.trim())
              }
            : job
        )
      );
    }
    
    handleCloseDialog();
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'filled': return 'primary';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Manage Job Postings
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddJob}
        >
          Post New Job
        </Button>
      </Box>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Create and manage your job postings. Track applications, views, and match rates for each position.
      </Typography>
      
      <Grid container spacing={3}>
        {jobs.map((job) => (
          <Grid item key={job.id} xs={12} sm={6} md={4}>
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
                      <Typography variant="body2" color="text.secondary">
                        {job.company}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleOpenMenu(e, job.id)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Chip 
                    label={job.status.toUpperCase()} 
                    color={getStatusColor(job.status) as "success" | "primary" | "default"}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {job.location}
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {job.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Requirements:</strong> {job.requirements}
                  </Typography>
                </Box>
                
                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                  {job.skills.map((skill: string, index: number) => (
                    <Chip key={index} label={skill} size="small" variant="outlined" />
                  ))}
                </Stack>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Applications</Typography>
                  <Typography variant="body2" fontWeight="bold">{job.applications}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Views</Typography>
                  <Typography variant="body2" fontWeight="bold">{job.views}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Match Rate</Typography>
                  <Typography variant="body2" fontWeight="bold">{job.matchRate}%</Typography>
                </Box>
                
                <Box sx={{ width: '100%', mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={job.matchRate} 
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              </CardContent>
              
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button 
                  size="small" 
                  startIcon={<PeopleIcon />}
                  fullWidth
                >
                  View Applications
                </Button>
              </CardActions>
            </JobCard>
          </Grid>
        ))}
      </Grid>
      
      {/* Create/Edit Job Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Post New Job' : 'Edit Job Posting'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            {dialogMode === 'create' 
              ? 'Create a new job posting to attract qualified candidates.' 
              : 'Update your job posting details to improve candidate matches.'}
          </DialogContentText>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
                variant="outlined"
                margin="normal"
                helperText="Enter a clear and descriptive job title"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                variant="outlined"
                margin="normal"
                helperText="Enter your company name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                variant="outlined"
                margin="normal"
                helperText="Enter job location or 'Remote'"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Job Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                multiline
                rows={4}
                variant="outlined"
                margin="normal"
                helperText="Describe the role and responsibilities"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                required
                multiline
                rows={3}
                variant="outlined"
                margin="normal"
                helperText="List required skills and experience (comma-separated)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveJob} 
            variant="contained" 
            color="primary"
            disabled={!jobTitle || !company || !location || !description || !requirements}
          >
            {dialogMode === 'create' ? 'Post Job' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Job Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {currentMenuJob && (
          <>
            <MenuItem 
              onClick={() => handleEditJob(jobs.find(j => j.id === currentMenuJob))}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit Job</ListItemText>
            </MenuItem>
            <MenuItem 
              onClick={() => handleDuplicateJob(jobs.find(j => j.id === currentMenuJob))}
            >
              <ListItemIcon>
                <ContentCopyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Duplicate Job</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={() => handleDeleteJob(currentMenuJob)}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete Job</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default ManageJobs; 