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
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Chip,
  Tooltip,
  SelectChangeEvent,
  Autocomplete,
  Badge,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import ShareIcon from '@mui/icons-material/Share';
import CompanyService, { Company, CreateCompanyData, CompanyPermission } from '../services/companies';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const companySizes = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1001-5000 employees',
  '5001+ employees'
];

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Media',
  'Transportation',
  'Construction',
  'Energy',
  'Agriculture',
  'Entertainment',
  'Hospitality',
  'Other'
];

interface Recruiter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
}

const CompanyManage: React.FC = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [companyToShare, setCompanyToShare] = useState<Company | null>(null);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState<Recruiter | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<'owner' | 'shared-owner' | 'shared'>('shared');
  const [permissions, setPermissions] = useState<CompanyPermission[]>([]);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [currentCompanyForPermissions, setCurrentCompanyForPermissions] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByPermission, setFilterByPermission] = useState<string>('all');

  useEffect(() => {
    fetchCompanies();
    fetchRecruiters();
  }, []);

  useEffect(() => {
    // Filter companies based on search term and permission filter
    if (searchTerm || filterByPermission !== 'all') {
      const filteredCompanies = companies.filter(company => {
        const matchesSearch = searchTerm.trim() === '' || 
          company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
          company.location.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesPermission = filterByPermission === 'all' || 
          company.userPermissionLevel === filterByPermission;
        
        return matchesSearch && matchesPermission;
      });
      
      setCompanies(filteredCompanies);
    } else {
      // If no filters, reload all companies
      fetchCompanies();
    }
  }, [searchTerm, filterByPermission]);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching companies...');
      const fetchedCompanies = await CompanyService.getCompanies();
      console.log('Companies fetched:', fetchedCompanies);
      setCompanies(Array.isArray(fetchedCompanies) ? fetchedCompanies : []);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      setError(err.response?.data?.message || 'Failed to load companies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecruiters = async () => {
    try {
      // This is a mock implementation - in a real app, you would fetch recruiters from your API
      // Fetching recruiters that can be granted access to companies
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
      // Not setting error state for this as it's not critical
    }
  };

  const fetchCompanyPermissions = async (companyId: string) => {
    try {
      const fetchedPermissions = await CompanyService.getCompanyPermissions(companyId);
      setPermissions(fetchedPermissions);
      return fetchedPermissions;
    } catch (err: any) {
      console.error('Error fetching company permissions:', err);
      return [];
    }
  };

  const handleCreateCompany = () => {
    setDialogMode('create');
    setCurrentCompanyId(null);
    setLogoFile(null);
    setLogoPreview(null);
    formik.resetForm();
    setOpenDialog(true);
  };

  const handleEditCompany = (company: Company) => {
    setDialogMode('edit');
    setCurrentCompanyId(company.id);
    setLogoPreview(company.logo || null);
    
    console.log('Editing company:', company);
    console.log('Industry value:', company.industry);
    console.log('Size value:', company.size);
    
    // Fix potentially null or undefined values
    const formValues = {
      name: company.name || '',
      description: company.description || '',
      website: company.website || '',
      location: company.location || '',
      industry: company.industry || '',
      size: company.size || '',
      foundedYear: company.foundedYear || undefined
    };
    
    console.log('Setting form values:', formValues);
    formik.setValues(formValues);
    
    setOpenDialog(true);
  };

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;
    
    try {
      await CompanyService.deleteCompany(companyToDelete.id);
      setCompanies(companies.filter(company => company.id !== companyToDelete.id));
      setDeleteConfirmOpen(false);
      setCompanyToDelete(null);
      setSuccess('Company deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting company:', err);
      setError(err.response?.data?.message || 'Failed to delete company. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setLogoFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (companyId: string) => {
    if (!logoFile) return;
    
    try {
      const updatedCompany = await CompanyService.uploadLogo(companyId, logoFile);
      setCompanies(companies.map(company => 
        company.id === companyId ? updatedCompany : company
      ));
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      // We don't set an error state here to not block the main functionality
    }
  };

  const formik = useFormik<CreateCompanyData>({
    initialValues: {
      name: '',
      description: '',
      website: '',
      location: '',
      industry: '',
      size: '',
      foundedYear: undefined
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Company name is required'),
      description: Yup.string().required('Description is required'),
      website: Yup.string().url('Must be a valid URL if provided'),
      location: Yup.string(),
      industry: Yup.string(),
      size: Yup.string(),
      foundedYear: Yup.number().integer('Must be a whole number')
        .min(1800, 'Year must be after 1800')
        .max(new Date().getFullYear(), 'Year cannot be in the future')
        .nullable()
    }),
    onSubmit: async (values) => {
      try {
        if (dialogMode === 'create') {
          const newCompany = await CompanyService.createCompany(values);
          setCompanies([...companies, newCompany]);
          
          if (logoFile) {
            await uploadLogo(newCompany.id);
          }
          
          setSuccess('Company created successfully');
        } else if (dialogMode === 'edit' && currentCompanyId) {
          const updatedCompany = await CompanyService.updateCompany(currentCompanyId, values);
          setCompanies(companies.map(company => 
            company.id === currentCompanyId ? updatedCompany : company
          ));
          
          if (logoFile) {
            await uploadLogo(currentCompanyId);
          }
          
          setSuccess('Company updated successfully');
        }
        
        setOpenDialog(false);
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        console.error('Error saving company:', err);
        setError(err.response?.data?.message || 'Failed to save company. Please try again.');
        setTimeout(() => setError(null), 3000);
      }
    },
  });

  const handleShareCompany = (company: Company) => {
    setCompanyToShare(company);
    setSelectedRecruiter(null);
    setPermissionLevel('shared');
    setShareDialogOpen(true);
  };

  const handleShareDialogClose = () => {
    setShareDialogOpen(false);
    setCompanyToShare(null);
    setSelectedRecruiter(null);
  };

  const handlePermissionChange = (event: SelectChangeEvent<string>) => {
    setPermissionLevel(event.target.value as 'owner' | 'shared-owner' | 'shared');
  };

  const handleSubmitShare = async () => {
    if (!companyToShare || !selectedRecruiter) return;

    try {
      await CompanyService.shareCompany({
        companyId: companyToShare.id,
        recruiterId: selectedRecruiter.id,
        permissionLevel
      });

      setSuccess(`Company shared successfully with ${selectedRecruiter.firstName} ${selectedRecruiter.lastName}`);
      setTimeout(() => setSuccess(null), 3000);
      handleShareDialogClose();
    } catch (err: any) {
      console.error('Error sharing company:', err);
      setError(err.response?.data?.message || 'Failed to share company. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleViewPermissions = async (company: Company) => {
    setCurrentCompanyForPermissions(company);
    const fetchedPermissions = await fetchCompanyPermissions(company.id);
    if (fetchedPermissions.length > 0) {
      setPermissions(fetchedPermissions);
    }
    setPermissionsDialogOpen(true);
  };

  const handlePermissionsDialogClose = () => {
    setPermissionsDialogOpen(false);
    setCurrentCompanyForPermissions(null);
    setPermissions([]);
  };

  const handleUpdatePermission = async (permissionId: string, newLevel: 'owner' | 'shared-owner' | 'shared') => {
    try {
      await CompanyService.updatePermission(permissionId, newLevel);
      // Update the permissions list
      if (currentCompanyForPermissions) {
        const updatedPermissions = await fetchCompanyPermissions(currentCompanyForPermissions.id);
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
      await CompanyService.removePermission(permissionId);
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
      />
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading companies...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Manage Companies
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleCreateCompany}
        >
          Add Company
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {companies.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <BusinessIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            You haven't created any companies yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create a company to start posting jobs
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleCreateCompany}
          >
            Add Your First Company
          </Button>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              placeholder="Search companies..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ mr: 2, flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            
            <FormControl sx={{ width: 200, mr: 2 }} size="small">
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
          </Box>
          
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Logo</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Industry</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Access Level</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      {company.logo ? (
                        <Avatar 
                          src={company.logo} 
                          alt={company.name}
                          sx={{ width: 40, height: 40 }}
                        />
                      ) : (
                        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                          {company.name.charAt(0)}
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>{company.industry}</TableCell>
                    <TableCell>{company.location}</TableCell>
                    <TableCell>{company.size}</TableCell>
                    <TableCell>
                      {renderPermissionBadge(company.userPermissionLevel)}
                    </TableCell>
                    <TableCell>
                      {company.userPermissionLevel === 'owner' || !company.userPermissionLevel ? (
                        <>
                          <Tooltip title="Edit Company">
                            <IconButton 
                              color="primary" 
                              onClick={() => handleEditCompany(company)}
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Share Company">
                            <IconButton 
                              color="primary" 
                              onClick={() => handleShareCompany(company)}
                              size="small"
                            >
                              <ShareIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Permissions">
                            <IconButton 
                              color="info" 
                              onClick={() => handleViewPermissions(company)}
                              size="small"
                            >
                              <PersonAddIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Company">
                            <IconButton 
                              color="error" 
                              onClick={() => handleDeleteClick(company)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : company.userPermissionLevel === 'shared-owner' ? (
                        <>
                          <Tooltip title="Share Company">
                            <IconButton 
                              color="primary" 
                              onClick={() => handleShareCompany(company)}
                              size="small"
                            >
                              <ShareIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Permissions">
                            <IconButton 
                              color="info" 
                              onClick={() => handleViewPermissions(company)}
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
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<WorkIcon />}
              component={Link}
              to="/jobs/manage"
              sx={{ mr: 2 }}
            >
              Manage Jobs
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleCreateCompany}
            >
              Add Another Company
            </Button>
          </Box>
        </>
      )}

      {/* Company Form Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Company' : 'Edit Company'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Fields marked with an asterisk (*) are required. All other fields are optional.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  label="Company Name *"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  id="website"
                  name="website"
                  label="Website"
                  placeholder="https://example.com"
                  value={formik.values.website}
                  onChange={formik.handleChange}
                  error={formik.touched.website && Boolean(formik.errors.website)}
                  helperText={formik.touched.website && formik.errors.website}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  id="location"
                  name="location"
                  label="Location"
                  value={formik.values.location}
                  onChange={formik.handleChange}
                  error={formik.touched.location && Boolean(formik.errors.location)}
                  helperText={formik.touched.location && formik.errors.location}
                  margin="normal"
                />
                
                <FormControl 
                  fullWidth 
                  margin="normal"
                  error={formik.touched.industry && Boolean(formik.errors.industry)}
                >
                  <InputLabel id="industry-label">Industry</InputLabel>
                  <Select
                    labelId="industry-label"
                    id="industry"
                    name="industry"
                    value={formik.values.industry || ''}
                    onChange={formik.handleChange}
                    label="Industry"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {industries.map((industry) => (
                      <MenuItem key={industry} value={industry}>
                        {industry}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.industry && formik.errors.industry && (
                    <FormHelperText>{formik.errors.industry}</FormHelperText>
                  )}
                </FormControl>
                
                <FormControl 
                  fullWidth 
                  margin="normal"
                  error={formik.touched.size && Boolean(formik.errors.size)}
                >
                  <InputLabel id="size-label">Company Size</InputLabel>
                  <Select
                    labelId="size-label"
                    id="size"
                    name="size"
                    value={formik.values.size || ''}
                    onChange={formik.handleChange}
                    label="Company Size"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {companySizes.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.size && formik.errors.size && (
                    <FormHelperText>{formik.errors.size}</FormHelperText>
                  )}
                </FormControl>
                
                <TextField
                  fullWidth
                  id="foundedYear"
                  name="foundedYear"
                  label="Founded Year"
                  type="number"
                  value={formik.values.foundedYear || ''}
                  onChange={formik.handleChange}
                  error={formik.touched.foundedYear && Boolean(formik.errors.foundedYear)}
                  helperText={formik.touched.foundedYear && formik.errors.foundedYear}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Company Description *"
                  multiline
                  rows={4}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                  margin="normal"
                />
                
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Company Logo
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {logoPreview ? (
                      <Avatar 
                        src={logoPreview} 
                        alt="Company Logo Preview"
                        sx={{ width: 100, height: 100, mr: 2 }}
                      />
                    ) : (
                      <Avatar sx={{ width: 100, height: 100, mr: 2, bgcolor: 'primary.main' }}>
                        {formik.values.name ? formik.values.name.charAt(0) : 'C'}
                      </Avatar>
                    )}
                    <Button
                      variant="outlined"
                      component="label"
                    >
                      Upload Logo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Recommended size: 400x400 pixels, max 2MB
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {companyToDelete?.name}? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Note: Deleting this company will also delete all associated jobs.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Company Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={handleShareDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Share Company</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="recruiter-label">Select Recruiter</InputLabel>
                <Select
                  labelId="recruiter-label"
                  id="recruiter"
                  value={selectedRecruiter?.id || ''}
                  onChange={(event) => {
                    const selectedRecruiterId = event.target.value;
                    const selectedRecruiter = recruiters.find(r => r.id === selectedRecruiterId);
                    setSelectedRecruiter(selectedRecruiter || null);
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
              <FormControl fullWidth margin="normal">
                <InputLabel id="permission-label">Permission Level</InputLabel>
                <Select
                  labelId="permission-label"
                  id="permission"
                  value={permissionLevel}
                  onChange={handlePermissionChange}
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
          <Button onClick={handleShareDialogClose}>Cancel</Button>
          <Button onClick={handleSubmitShare} variant="contained" color="primary">
            Share
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog
        open={permissionsDialogOpen}
        onClose={handlePermissionsDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Company Permissions</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Current Permissions</Typography>
            </Grid>
            <Grid item xs={12}>
              {permissions.map((permission) => (
                <Chip
                  key={permission.id}
                  label={`${permission.recruiter?.firstName || 'Unknown'} ${permission.recruiter?.lastName || 'User'} - ${permission.permissionLevel}`}
                  onDelete={() => handleRemovePermission(permission.id)}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6">Add New Permission</Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="recruiter-label">Select Recruiter</InputLabel>
                <Select
                  labelId="recruiter-label"
                  id="recruiter"
                  value={selectedRecruiter?.id || ''}
                  onChange={(event) => {
                    const selectedRecruiterId = event.target.value;
                    const selectedRecruiter = recruiters.find(r => r.id === selectedRecruiterId);
                    setSelectedRecruiter(selectedRecruiter || null);
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
              <FormControl fullWidth margin="normal">
                <InputLabel id="permission-label">Permission Level</InputLabel>
                <Select
                  labelId="permission-label"
                  id="permission"
                  value={permissionLevel}
                  onChange={handlePermissionChange}
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
          <Button onClick={() => handleUpdatePermission(selectedRecruiter?.id || '', permissionLevel)} variant="contained" color="primary">
            Add Permission
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CompanyManage; 