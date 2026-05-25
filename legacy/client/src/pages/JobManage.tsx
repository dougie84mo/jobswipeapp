import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  CircularProgress, 
  Alert, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Avatar,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormLabel,
  Tooltip,
  Badge,
  Autocomplete,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import WorkIcon from '@mui/icons-material/Work';
import JobService, { Job, CreateJobData, JobPermission, ShareJobData, ShareWithMatchData } from '../services/jobs';
import CompanyService, { Company } from '../services/companies';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import BusinessIcon from '@mui/icons-material/Business';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Recruiter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
}

interface Match {
  id: string;
  jobId: string;
  jobSeekerId: string;
  jobSeekerName: string;
  jobTitle: string;
  matchDate: string;
}

const JobManage: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]); // For filtering
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  
  // Sharing state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [jobToShare, setJobToShare] = useState<Job | null>(null);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState<Recruiter | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<'owner' | 'shared-owner' | 'shared'>('shared');
  const [permissions, setPermissions] = useState<JobPermission[]>([]);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [currentJobForPermissions, setCurrentJobForPermissions] = useState<Job | null>(null);
  
  // Match sharing state
  const [shareWithMatchDialogOpen, setShareWithMatchDialogOpen] = useState(false);
  const [jobToShareWithMatches, setJobToShareWithMatches] = useState<Job | null>(null);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByPermission, setFilterByPermission] = useState<string>('all');
  const [filterBySkill, setFilterBySkill] = useState<string>('');
  const [filterByRequirement, setFilterByRequirement] = useState<string>('');
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [allRequirements, setAllRequirements] = useState<string[]>([]);

  useEffect(() => {
    if (user && user.userType !== 'recruiter') {
      setError('Access denied. Only recruiters can manage job postings.');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        // Check if token exists
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please log in.');
          setLoading(false);
          return;
        }
        
        // Check if user exists and is a recruiter
        if (!user) {
          console.log('User data not loaded yet');
          setLoading(false);
          return; // Wait for user data to load
        }
        
        if (user.userType !== 'recruiter') {
          setError('Access denied. Only recruiters can manage job postings.');
          setLoading(false);
          return;
        }
        
        console.log('Fetching recruiter jobs...');
        try {
          const jobsData = await JobService.getRecruiterJobs();
          console.log('Jobs data:', jobsData);
          
          // Ensure we have an array of jobs
          if (Array.isArray(jobsData)) {
            setJobs(jobsData);
            setAllJobs(jobsData);
            setError(null);
          } else {
            console.error('Invalid jobs data format:', jobsData);
            setJobs([]);
            setAllJobs([]);
            setError('Received invalid data format from server.');
          }
        } catch (jobErr: any) {
          console.error('Error fetching jobs:', jobErr);
          setError(jobErr.response?.data?.message || 'Failed to load jobs. Please try again.');
        }
      } catch (err: any) {
        console.error('Error in fetchJobs:', err);
        setError(err.response?.data?.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    const fetchCompanies = async () => {
      try {
        const companiesData = await CompanyService.getCompanies();
        setCompanies(companiesData);
      } catch (err: any) {
        console.error('Error fetching companies:', err);
        // No need to set error state here as it's not critical for the UI
      }
    };

    fetchJobs();
    fetchCompanies();
  }, [user]);

  useEffect(() => {
    // Extract all unique skills and requirements from jobs
    if (allJobs.length > 0) {
      const skillsSet = new Set<string>();
      const requirementsSet = new Set<string>();
      
      allJobs.forEach(job => {
        job.skills.forEach(skill => skillsSet.add(skill));
        job.requirements.forEach(req => requirementsSet.add(req));
      });
      
      setAllSkills(Array.from(skillsSet));
      setAllRequirements(Array.from(requirementsSet));
    }
  }, [allJobs]);

  useEffect(() => {
    // Filter jobs based on search term, permissions, skills, and requirements
    if (searchTerm || filterByPermission !== 'all' || filterBySkill || filterByRequirement) {
      const filteredJobs = allJobs.filter(job => {
        const matchesSearch = searchTerm.trim() === '' || 
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.location.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesPermission = filterByPermission === 'all' || 
          job.userPermissionLevel === filterByPermission;
        
        const matchesSkill = filterBySkill === '' || 
          job.skills.includes(filterBySkill);
        
        const matchesRequirement = filterByRequirement === '' || 
          job.requirements.includes(filterByRequirement);
        
        return matchesSearch && matchesPermission && matchesSkill && matchesRequirement;
      });
      
      setJobs(filteredJobs);
    } else {
      // If no filters, use all jobs
      setJobs(allJobs);
    }
  }, [searchTerm, filterByPermission, filterBySkill, filterByRequirement, allJobs]);

  const handleCreateJob = () => {
    if (companies.length === 0) {
      setError('You need to create a company before you can create a job. Please go to Companies to create one.');
      return;
    }
    
    console.log('Opening create job dialog');
    setDialogMode('create');
    setCurrentJobId(null);
    formik.resetForm();
    setOpenDialog(true);
  };

  const handleEditJob = (job: Job) => {
    setDialogMode('edit');
    setCurrentJobId(job.id);
    
    // Determine work location type based on isRemote and isHybrid flags
    let workLocationType: 'remote' | 'hybrid' | 'onsite' = 'onsite';
    if (job.isRemote) {
      workLocationType = 'remote';
    } else if (job.isHybrid) {
      workLocationType = 'hybrid';
    }
    
    formik.setValues({
      title: job.title,
      description: job.description,
      location: job.location,
      salary: job.salary,
      companyId: job.companyId,
      skills: job.skills,
      requirements: job.requirements,
      jobType: job.jobType || 'full-time',
      workLocationType,
      isRemote: job.isRemote || false,
      isHybrid: job.isHybrid || false,
      experienceLevel: job.experienceLevel as any,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency || 'USD',
      salaryType: job.salaryType || 'yearly'
    });
    
    setOpenDialog(true);
  };

  const handleDeleteClick = (job: Job) => {
    setJobToDelete(job);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    
    try {
      await JobService.deleteJob(jobToDelete.id);
      setJobs(jobs.filter(job => job.id !== jobToDelete.id));
      setDeleteConfirmOpen(false);
      setJobToDelete(null);
    } catch (err: any) {
      console.error('Error deleting job:', err);
      setError(err.response?.data?.message || 'Failed to delete job. Please try again.');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      console.log('Adding skill:', skillInput.trim());
      const updatedSkills = [...formik.values.skills, skillInput.trim()];
      console.log('Updated skills array:', updatedSkills);
      formik.setFieldValue('skills', updatedSkills);
      formik.setFieldTouched('skills', true);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    formik.setFieldValue(
      'skills',
      formik.values.skills.filter((_, i) => i !== index)
    );
  };

  const handleAddRequirement = () => {
    if (requirementInput.trim()) {
      formik.setFieldValue('requirements', [...formik.values.requirements, requirementInput.trim()]);
      setRequirementInput('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    formik.setFieldValue(
      'requirements',
      formik.values.requirements.filter((_, i) => i !== index)
    );
  };

  const formik = useFormik<CreateJobData>({
    initialValues: {
      title: '',
      description: '',
      location: '',
      companyId: companies.length > 0 ? companies[0].id : '',
      skills: ['JavaScript'],
      requirements: [],
      jobType: 'full-time',
      workLocationType: 'onsite',
      isRemote: false,
      isHybrid: false,
      experienceLevel: 'mid',
      salaryMin: 0,
      salaryMax: 0,
      salaryCurrency: 'USD',
      salaryType: 'yearly'
    },
    enableReinitialize: true,
    validateOnMount: false,
    validationSchema: Yup.object({
      title: Yup.string().required('Title is required'),
      description: Yup.string().required('Description is required'),
      location: Yup.string(),
      companyId: Yup.string().required('Company is required'),
      skills: Yup.array().of(Yup.string()).min(1, 'At least one skill is required'),
      jobType: Yup.string().required('Job type is required'),
      workLocationType: Yup.string().required('Work location type is required')
    }),
    onSubmit: async (values) => {
      console.log('Form submitted with values:', JSON.stringify(values, null, 2));
      console.log('Token in localStorage:', localStorage.getItem('token'));
      
      // Update isRemote and isHybrid based on workLocationType
      values.isRemote = values.workLocationType === 'remote';
      values.isHybrid = values.workLocationType === 'hybrid';
      
      // If location is empty, use company location
      if (!values.location || values.location.trim() === '') {
        const company = companies.find(c => c.id === values.companyId);
        if (company && company.location) {
          values.location = company.location;
          console.log('Using company location:', values.location);
        }
      }
      
      // Validate user is a recruiter
      if (!user || user.userType !== 'recruiter') {
        setError('Access denied. Only recruiters can create or edit job postings.');
        return;
      }
      
      // Validate token exists
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }
      
      try {
        if (dialogMode === 'create') {
          console.log('Creating new job with data:', JSON.stringify(values, null, 2));
          
          // Log the request details
          console.log('Request URL:', '/api/jobs');
          console.log('Request method:', 'POST');
          console.log('Request headers:', {
            'Content-Type': 'application/json',
            'x-auth-token': token
          });
          
          const newJob = await JobService.createJob(values);
          console.log('Job created successfully:', newJob);
          setJobs([...jobs, newJob]);
          setOpenDialog(false);
          alert('Job created successfully!');
        } else if (dialogMode === 'edit' && currentJobId) {
          console.log('Updating job with ID:', currentJobId);
          console.log('Update data:', JSON.stringify(values, null, 2));
          
          const updatedJob = await JobService.updateJob(currentJobId, values);
          console.log('Job updated successfully:', updatedJob);
          setJobs(jobs.map(job => job.id === currentJobId ? updatedJob : job));
          setOpenDialog(false);
          alert('Job updated successfully!');
        }
      } catch (err: any) {
        console.error('Error saving job:', err);
        
        if (err.response) {
          console.error('Error status:', err.response.status);
          console.error('Error data:', err.response.data);
          
          if (err.response.status === 401) {
            setError('Authentication error. Please log in again.');
          } else if (err.response.status === 403) {
            setError('Access denied. You do not have permission to perform this action.');
          } else if (err.response.status === 400) {
            // Handle validation errors
            const validationErrors = err.response.data.errors;
            if (validationErrors && Array.isArray(validationErrors)) {
              const errorMessages = validationErrors.map((error) => error.msg).join(', ');
              setError(`Validation error: ${errorMessages}`);
            } else {
              setError(err.response.data.message || 'Invalid form data. Please check your inputs.');
            }
          } else {
            setError(err.response.data.message || 'Failed to save job. Please try again.');
          }
        } else {
          setError('Network error. Please check your connection and try again.');
        }
      }
    },
  });

  // Debug formik state
  useEffect(() => {
    if (openDialog) {
      console.log('Formik state:', {
        values: formik.values,
        errors: formik.errors,
        touched: formik.touched,
        isValid: formik.isValid,
        dirty: formik.dirty,
        isSubmitting: formik.isSubmitting
      });
    }
  }, [formik.values, formik.errors, formik.touched, formik.isValid, formik.dirty, formik.isSubmitting, openDialog]);

  const fetchRecruiters = async () => {
    try {
      // This is a mock implementation - in a real app, you would fetch recruiters from your API
      const mockRecruiters: Recruiter[] = [
        { id: '1', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com' },
        { id: '2', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
        { id: '3', firstName: 'Alice', lastName: 'Johnson', email: 'alice.johnson@example.com' },
        { id: '4', firstName: 'Bob', lastName: 'Williams', email: 'bob.williams@example.com' },
        { id: '5', firstName: 'Carol', lastName: 'Davis', email: 'carol.davis@example.com' }
      ];
      setRecruiters(mockRecruiters);
    } catch (err: any) {
      console.error('Error fetching recruiters:', err);
    }
  };

  const fetchJobPermissions = async (jobId: string) => {
    try {
      const fetchedPermissions = await JobService.getJobPermissions(jobId);
      setPermissions(fetchedPermissions);
      return fetchedPermissions;
    } catch (err: any) {
      console.error('Error fetching job permissions:', err);
      return [];
    }
  };

  const fetchAvailableMatches = async () => {
    try {
      // This is a mock implementation - in a real app, you would fetch matches from your API
      const mockMatches: Match[] = [
        { 
          id: '1', 
          jobId: '101', 
          jobSeekerId: '201', 
          jobSeekerName: 'John Applicant', 
          jobTitle: 'Frontend Developer',
          matchDate: new Date().toISOString()
        },
        { 
          id: '2', 
          jobId: '102', 
          jobSeekerId: '202', 
          jobSeekerName: 'Sarah Developer', 
          jobTitle: 'Backend Developer',
          matchDate: new Date().toISOString()
        },
        { 
          id: '3', 
          jobId: '103', 
          jobSeekerId: '203', 
          jobSeekerName: 'Michael Engineer', 
          jobTitle: 'DevOps Engineer',
          matchDate: new Date().toISOString()
        }
      ];
      setAvailableMatches(mockMatches);
    } catch (err: any) {
      console.error('Error fetching available matches:', err);
    }
  };

  const handleShareJob = (job: Job) => {
    setJobToShare(job);
    setSelectedRecruiter(null);
    setPermissionLevel('shared');
    fetchRecruiters();
    setShareDialogOpen(true);
  };

  const handleShareDialogClose = () => {
    setShareDialogOpen(false);
    setJobToShare(null);
    setSelectedRecruiter(null);
  };

  const handleShareWithMatch = (job: Job) => {
    setJobToShareWithMatches(job);
    setSelectedMatch(null);
    fetchAvailableMatches();
    setShareWithMatchDialogOpen(true);
  };

  const handleShareWithMatchDialogClose = () => {
    setShareWithMatchDialogOpen(false);
    setJobToShareWithMatches(null);
    setSelectedMatch(null);
  };

  const handlePermissionChange = (event: SelectChangeEvent<string>) => {
    setPermissionLevel(event.target.value as 'owner' | 'shared-owner' | 'shared');
  };

  const handleSubmitShare = async () => {
    if (!jobToShare || !selectedRecruiter) return;

    try {
      await JobService.shareJob({
        jobId: jobToShare.id,
        recruiterId: selectedRecruiter.id,
        permissionLevel
      });

      setSuccess(`Job shared successfully with ${selectedRecruiter.firstName} ${selectedRecruiter.lastName}`);
      setTimeout(() => setSuccess(null), 3000);
      handleShareDialogClose();
    } catch (err: any) {
      console.error('Error sharing job:', err);
      setError(err.response?.data?.message || 'Failed to share job. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSubmitShareWithMatch = async () => {
    if (!jobToShareWithMatches || !selectedMatch) return;

    try {
      await JobService.shareWithMatch({
        jobId: jobToShareWithMatches.id,
        matchId: selectedMatch.id
      });

      setSuccess(`Job shared successfully with match: ${selectedMatch.jobSeekerName}`);
      setTimeout(() => setSuccess(null), 3000);
      handleShareWithMatchDialogClose();
    } catch (err: any) {
      console.error('Error sharing job with match:', err);
      setError(err.response?.data?.message || 'Failed to share job with match. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleViewPermissions = async (job: Job) => {
    setCurrentJobForPermissions(job);
    const fetchedPermissions = await fetchJobPermissions(job.id);
    if (fetchedPermissions.length > 0) {
      setPermissions(fetchedPermissions);
    }
    setPermissionsDialogOpen(true);
  };

  const handlePermissionsDialogClose = () => {
    setPermissionsDialogOpen(false);
    setCurrentJobForPermissions(null);
    setPermissions([]);
  };

  const handleUpdatePermission = async (permissionId: string, newLevel: 'owner' | 'shared-owner' | 'shared') => {
    try {
      await JobService.updateJobPermission(permissionId, newLevel);
      // Update the permissions list
      if (currentJobForPermissions) {
        const updatedPermissions = await fetchJobPermissions(currentJobForPermissions.id);
        setPermissions(updatedPermissions);
      }
      setSuccess('Permission updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating permission:', err);
      setError(err.response?.data?.message || 'Failed to update permission. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    try {
      await JobService.removeJobPermission(permissionId);
      // Update the permissions list
      setPermissions(permissions.filter(p => p.id !== permissionId));
      setSuccess('Permission removed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error removing permission:', err);
      setError(err.response?.data?.message || 'Failed to remove permission. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setFilterByPermission(event.target.value);
  };

  const handleSkillFilterChange = (event: SelectChangeEvent<string>) => {
    setFilterBySkill(event.target.value);
  };

  const handleRequirementFilterChange = (event: SelectChangeEvent<string>) => {
    setFilterByRequirement(event.target.value);
  };

  const renderPermissionBadge = (permissionLevel?: string) => {
    if (!permissionLevel) {
      // Default to 'owner' if no permission level is provided
      permissionLevel = 'owner';
    }
    
    let color: 'success' | 'primary' | 'secondary' = 'secondary';
    let label = 'Shared';
    
    if (permissionLevel === 'owner') {
      color = 'success';
      label = 'Owner';
    } else if (permissionLevel === 'shared-owner') {
      color = 'primary';
      label = 'Shared Owner';
    }
    
    return (
      <Chip 
        label={label} 
        color={color} 
        size="small" 
        icon={<LockIcon />} 
        sx={{ ml: 1 }}
      />
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading jobs...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Manage Jobs
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleCreateJob}
          >
            Create Job
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => {
                setError(null);
                setLoading(true);
                // Fetch jobs again
                const fetchJobsAgain = async () => {
                  try {
                    const jobsData = await JobService.getRecruiterJobs();
                    if (Array.isArray(jobsData)) {
                      setJobs(jobsData);
                    } else {
                      setJobs([]);
                      setError('Still having trouble loading jobs. Please try again later.');
                    }
                  } catch (err) {
                    setError('Failed to load jobs. Please try again later.');
                  } finally {
                    setLoading(false);
                  }
                };
                fetchJobsAgain();
              }}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {companies.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <BusinessIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            You need to create a company first
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Before posting jobs, you need to create at least one company
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<BusinessIcon />}
            component={Link}
            to="/companies/manage"
          >
            Manage Companies
          </Button>
        </Paper>
      ) : jobs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <WorkIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            You haven't created any job postings yet
          </Typography>
          {companies.length === 0 ? (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                You need to create a company before you can create a job.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                component={Link} 
                to="/companies/manage"
                startIcon={<BusinessIcon />}
              >
                Add Your First Company
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Click the button below to create your first job posting.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={handleCreateJob}
              >
                Create Job Posting
              </Button>
            </>
          )}
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            {/* Search field */}
            <TextField
              placeholder="Search jobs..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ flexGrow: 1, minWidth: '200px' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            
            {/* Permission filter */}
            <FormControl sx={{ minWidth: '180px' }} size="small">
              <InputLabel id="permission-filter-label">Permission Level</InputLabel>
              <Select
                labelId="permission-filter-label"
                id="permission-filter"
                value={filterByPermission}
                label="Permission Level"
                onChange={handleFilterChange}
              >
                <MenuItem value="all">All Permissions</MenuItem>
                <MenuItem value="owner">Owner</MenuItem>
                <MenuItem value="shared-owner">Shared Owner</MenuItem>
                <MenuItem value="shared">Shared</MenuItem>
              </Select>
            </FormControl>
            
            {/* Skills filter */}
            <FormControl sx={{ minWidth: '180px' }} size="small">
              <InputLabel id="skill-filter-label">Filter by Skill</InputLabel>
              <Select
                labelId="skill-filter-label"
                id="skill-filter"
                value={filterBySkill}
                label="Filter by Skill"
                onChange={handleSkillFilterChange}
              >
                <MenuItem value="">All Skills</MenuItem>
                {allSkills.map(skill => (
                  <MenuItem key={skill} value={skill}>{skill}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Requirements filter */}
            <FormControl sx={{ minWidth: '180px' }} size="small">
              <InputLabel id="requirement-filter-label">Filter by Requirement</InputLabel>
              <Select
                labelId="requirement-filter-label"
                id="requirement-filter"
                value={filterByRequirement}
                label="Filter by Requirement"
                onChange={handleRequirementFilterChange}
              >
                <MenuItem value="">All Requirements</MenuItem>
                {allRequirements.map(req => (
                  <MenuItem key={req} value={req}>{req}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Job Type</TableCell>
                  <TableCell>Skills</TableCell>
                  <TableCell>Access Level</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.title}</TableCell>
                    <TableCell>
                      {job.company ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {job.company.logo ? (
                            <Avatar 
                              src={job.company.logo} 
                              alt={job.company.name}
                              sx={{ width: 24, height: 24, mr: 1 }}
                            />
                          ) : (
                            <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.8rem' }}>
                              {job.company.name.charAt(0)}
                            </Avatar>
                          )}
                          {job.company.name}
                        </Box>
                      ) : (
                        'Unknown Company'
                      )}
                    </TableCell>
                    <TableCell>
                      {job.location}
                      {job.isRemote && <Chip size="small" label="Remote" sx={{ ml: 1 }} />}
                      {job.isHybrid && <Chip size="small" label="Hybrid" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{job.jobType}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
                        {job.skills.slice(0, 2).map((skill, index) => (
                          <Chip key={index} label={skill} size="small" />
                        ))}
                        {job.skills.length > 2 && (
                          <Tooltip title={job.skills.slice(2).join(', ')}>
                            <Chip label={`+${job.skills.length - 2}`} size="small" />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {renderPermissionBadge(job.userPermissionLevel)}
                    </TableCell>
                    <TableCell>
                      {job.userPermissionLevel === 'owner' || !job.userPermissionLevel ? (
                        <>
                          <Tooltip title="Edit Job">
                            <IconButton 
                              color="primary" 
                              onClick={() => handleEditJob(job)}
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Share Job">
                            <IconButton 
                              color="primary" 
                              onClick={() => handleShareJob(job)}
                              size="small"
                            >
                              <ShareIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Share with Match">
                            <IconButton 
                              color="info" 
                              onClick={() => handleShareWithMatch(job)}
                              size="small"
                            >
                              <PersonAddIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Job">
                            <IconButton 
                              color="error" 
                              onClick={() => handleDeleteClick(job)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : job.userPermissionLevel === 'shared-owner' ? (
                        <>
                          <Tooltip title="Share Job">
                            <IconButton 
                              color="primary" 
                              onClick={() => handleShareJob(job)}
                              size="small"
                            >
                              <ShareIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Share with Match">
                            <IconButton 
                              color="info" 
                              onClick={() => handleShareWithMatch(job)}
                              size="small"
                            >
                              <PersonAddIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          View only
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Job Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {dialogMode === 'create' ? 'Create New Job' : 'Edit Job'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="title"
                  name="title"
                  label="Job Title"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.title && Boolean(formik.errors.title)}
                  helperText={formik.touched.title && formik.errors.title}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Job Description"
                  multiline
                  rows={4}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  error={formik.touched.jobType && Boolean(formik.errors.jobType)}
                >
                  <InputLabel id="job-type-select-label">Job Type</InputLabel>
                  <Select
                    labelId="job-type-select-label"
                    id="jobType"
                    name="jobType"
                    value={formik.values.jobType}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Job Type"
                  >
                    <MenuItem value="full-time">Full Time</MenuItem>
                    <MenuItem value="part-time">Part Time</MenuItem>
                    <MenuItem value="contract">Contract</MenuItem>
                    <MenuItem value="internship">Internship</MenuItem>
                    <MenuItem value="temporary">Temporary</MenuItem>
                  </Select>
                  {formik.touched.jobType && formik.errors.jobType && (
                    <FormHelperText>{formik.errors.jobType as string}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  error={formik.touched.experienceLevel && Boolean(formik.errors.experienceLevel)}
                >
                  <InputLabel id="experience-level-select-label">Experience Level</InputLabel>
                  <Select
                    labelId="experience-level-select-label"
                    id="experienceLevel"
                    name="experienceLevel"
                    value={formik.values.experienceLevel || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Experience Level"
                  >
                    <MenuItem value="entry">Entry Level</MenuItem>
                    <MenuItem value="mid">Mid Level</MenuItem>
                    <MenuItem value="senior">Senior Level</MenuItem>
                    <MenuItem value="executive">Executive Level</MenuItem>
                  </Select>
                  {formik.touched.experienceLevel && formik.errors.experienceLevel && (
                    <FormHelperText>{formik.errors.experienceLevel as string}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl component="fieldset" error={formik.touched.workLocationType && Boolean(formik.errors.workLocationType)}>
                  <FormLabel component="legend">Work Location Type</FormLabel>
                  <RadioGroup
                    row
                    name="workLocationType"
                    value={formik.values.workLocationType}
                    onChange={formik.handleChange}
                  >
                    <FormControlLabel value="remote" control={<Radio />} label="Remote" />
                    <FormControlLabel value="hybrid" control={<Radio />} label="Hybrid" />
                    <FormControlLabel value="onsite" control={<Radio />} label="On-Site" />
                  </RadioGroup>
                  {formik.touched.workLocationType && formik.errors.workLocationType && (
                    <FormHelperText>{formik.errors.workLocationType as string}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              {(formik.values.workLocationType === 'hybrid' || formik.values.workLocationType === 'onsite') && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="location"
                    name="location"
                    label="Location"
                    value={formik.values.location}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.location && Boolean(formik.errors.location)}
                    helperText={
                      (formik.touched.location && formik.errors.location) 
                        ? String(formik.errors.location) 
                        : "Company location will be used if empty"
                    }
                    placeholder="Enter job location (optional)"
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="company-select-label">Company</InputLabel>
                  <Select
                    labelId="company-select-label"
                    id="companyId"
                    name="companyId"
                    value={formik.values.companyId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Company"
                    error={formik.touched.companyId && Boolean(formik.errors.companyId)}
                  >
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {company.logo ? (
                            <Avatar 
                              src={company.logo} 
                              alt={company.name}
                              sx={{ width: 24, height: 24, mr: 1 }}
                            />
                          ) : (
                            <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                              {company.name.charAt(0)}
                            </Avatar>
                          )}
                          {company.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.companyId && formik.errors.companyId && (
                    <FormHelperText>{formik.errors.companyId as string}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  id="salaryMin"
                  name="salaryMin"
                  label="Minimum Salary"
                  type="number"
                  value={formik.values.salaryMin || ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.salaryMin && Boolean(formik.errors.salaryMin)}
                  helperText={formik.touched.salaryMin && formik.errors.salaryMin}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  id="salaryMax"
                  name="salaryMax"
                  label="Maximum Salary"
                  type="number"
                  value={formik.values.salaryMax || ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.salaryMax && Boolean(formik.errors.salaryMax)}
                  helperText={formik.touched.salaryMax && formik.errors.salaryMax}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="currency-select-label">Currency</InputLabel>
                  <Select
                    labelId="currency-select-label"
                    id="salaryCurrency"
                    name="salaryCurrency"
                    value={formik.values.salaryCurrency || 'USD'}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Currency"
                  >
                    <MenuItem value="USD">USD - US Dollar</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                    <MenuItem value="GBP">GBP - British Pound</MenuItem>
                    <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                    <MenuItem value="AUD">AUD - Australian Dollar</MenuItem>
                    <MenuItem value="JPY">JPY - Japanese Yen</MenuItem>
                    <MenuItem value="CNY">CNY - Chinese Yuan</MenuItem>
                    <MenuItem value="INR">INR - Indian Rupee</MenuItem>
                    <MenuItem value="BRL">BRL - Brazilian Real</MenuItem>
                    <MenuItem value="MXN">MXN - Mexican Peso</MenuItem>
                    <MenuItem value="ZAR">ZAR - South African Rand</MenuItem>
                    <MenuItem value="SGD">SGD - Singapore Dollar</MenuItem>
                    <MenuItem value="HKD">HKD - Hong Kong Dollar</MenuItem>
                    <MenuItem value="CHF">CHF - Swiss Franc</MenuItem>
                    <MenuItem value="SEK">SEK - Swedish Krona</MenuItem>
                    <MenuItem value="NZD">NZD - New Zealand Dollar</MenuItem>
                    <MenuItem value="THB">THB - Thai Baht</MenuItem>
                    <MenuItem value="IDR">IDR - Indonesian Rupiah</MenuItem>
                    <MenuItem value="RUB">RUB - Russian Ruble</MenuItem>
                    <MenuItem value="AED">AED - UAE Dirham</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={12}>
                <FormControl fullWidth>
                  <InputLabel id="salary-type-select-label">Salary Type</InputLabel>
                  <Select
                    labelId="salary-type-select-label"
                    id="salaryType"
                    name="salaryType"
                    value={formik.values.salaryType || 'yearly'}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Salary Type"
                  >
                    <MenuItem value="hourly">Hourly</MenuItem>
                    <MenuItem value="hourly-with-overtime">Hourly with Overtime</MenuItem>
                    <MenuItem value="per-diem">Per Diem</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="bi-weekly">Bi-Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                    <MenuItem value="project-based">Project Based</MenuItem>
                    <MenuItem value="commission">Commission</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Skills Required
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {formik.values.skills.map((skill, index) => (
                    <Chip
                      key={index}
                      label={skill}
                      onDelete={() => handleRemoveSkill(index)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <TextField
                  fullWidth
                  label="Add Skill"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button onClick={handleAddSkill}>Add</Button>
                      </InputAdornment>
                    ),
                  }}
                  error={formik.touched.skills && Boolean(formik.errors.skills)}
                  helperText={formik.touched.skills && formik.errors.skills}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Requirements
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {formik.values.requirements.map((requirement, index) => (
                    <Chip
                      key={index}
                      label={requirement}
                      onDelete={() => handleRemoveRequirement(index)}
                      color="secondary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <TextField
                  fullWidth
                  label="Add Requirement"
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRequirement();
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button onClick={handleAddRequirement}>Add</Button>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              type="button" 
              variant="contained"
              disabled={formik.isSubmitting}
              onClick={() => {
                console.log('Manual submit button clicked');
                formik.submitForm();
              }}
            >
              {formik.isSubmitting ? <CircularProgress size={24} /> : 'Save Job'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the job "{jobToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job Sharing Dialog */}
      <Dialog open={shareDialogOpen} onClose={handleShareDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Share Job</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="recruiter-select-label">Recruiter</InputLabel>
                <Select
                  labelId="recruiter-select-label"
                  id="recruiterId"
                  name="recruiterId"
                  value={selectedRecruiter?.id || ''}
                  onChange={(e) => {
                    const recruiter = recruiters.find(r => r.id === e.target.value);
                    if (recruiter) {
                      setSelectedRecruiter(recruiter);
                    }
                  }}
                  label="Recruiter"
                >
                  {recruiters.map((recruiter) => (
                    <MenuItem key={recruiter.id} value={recruiter.id}>
                      {recruiter.firstName} {recruiter.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="permission-select-label">Permission</InputLabel>
                <Select
                  labelId="permission-select-label"
                  id="permissionLevel"
                  name="permissionLevel"
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value as 'owner' | 'shared-owner' | 'shared')}
                  label="Permission"
                >
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="shared-owner">Shared Owner</MenuItem>
                  <MenuItem value="shared">Shared</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleShareDialogClose}>Cancel</Button>
          <Button onClick={handleSubmitShare} disabled={!selectedRecruiter}>
            Share
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job Sharing with Match Dialog */}
      <Dialog open={shareWithMatchDialogOpen} onClose={handleShareWithMatchDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Share Job with Match</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="match-select-label">Match</InputLabel>
                <Select
                  labelId="match-select-label"
                  id="matchId"
                  name="matchId"
                  value={selectedMatch?.id || ''}
                  onChange={(e) => {
                    const match = availableMatches.find(m => m.id === e.target.value);
                    if (match) {
                      setSelectedMatch(match);
                    }
                  }}
                  label="Match"
                >
                  {availableMatches.map((match) => (
                    <MenuItem key={match.id} value={match.id}>
                      {match.jobSeekerName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleShareWithMatchDialogClose}>Cancel</Button>
          <Button onClick={handleSubmitShareWithMatch} disabled={!selectedMatch}>
            Share
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onClose={handlePermissionsDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Job Permissions</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Current Permissions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {permissions.map((permission) => (
                  <Chip
                    key={permission.id}
                    label={permission.recruiter?.firstName}
                    onDelete={() => handleRemovePermission(permission.id)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="permission-level-select-label">Permission Level</InputLabel>
                <Select
                  labelId="permission-level-select-label"
                  id="permissionLevel"
                  name="permissionLevel"
                  value={permissionLevel}
                  onChange={(e) => handlePermissionChange(e)}
                  label="Permission Level"
                >
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="shared-owner">Shared Owner</MenuItem>
                  <MenuItem value="shared">Shared</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePermissionsDialogClose}>Cancel</Button>
          <Button 
            onClick={() => {
              if (selectedRecruiter && permissionLevel) {
                handleUpdatePermission(selectedRecruiter.id, permissionLevel);
              }
            }} 
            disabled={!selectedRecruiter}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default JobManage; 