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
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../../contexts/AuthContext';

// Styled components
const CompanyCard = styled(Card)(({ theme }) => ({
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

const ManageCompanies: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentMenuCompany, setCurrentMenuCompany] = useState<number | null>(null);
  
  // Mock effect to load companies
  useEffect(() => {
    // In a real app, this would be an API call
    const mockCompanies = [
      {
        id: 1,
        name: 'TechCorp Inc.',
        industry: 'Technology',
        location: 'San Francisco, CA',
        description: 'Leading technology company specializing in cloud solutions',
        website: 'www.techcorp.com',
        activeJobs: 5,
        totalJobs: 12,
        employees: '100-500',
        founded: '2015',
        specialties: ['Cloud Computing', 'AI/ML', 'Enterprise Software']
      },
      {
        id: 2,
        name: 'DesignLabs',
        industry: 'Design',
        location: 'New York, NY',
        description: 'Creative design agency focused on digital experiences',
        website: 'www.designlabs.com',
        activeJobs: 3,
        totalJobs: 8,
        employees: '50-200',
        founded: '2018',
        specialties: ['UI/UX Design', 'Branding', 'Digital Marketing']
      },
      {
        id: 3,
        name: 'WebTech Solutions',
        industry: 'Web Development',
        location: 'Remote',
        description: 'Full-service web development company',
        website: 'www.webtech.com',
        activeJobs: 4,
        totalJobs: 15,
        employees: '200-1000',
        founded: '2010',
        specialties: ['Web Development', 'E-commerce', 'Mobile Apps']
      }
    ];
    
    setCompanies(mockCompanies);
  }, []);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, companyId: number) => {
    setAnchorEl(event.currentTarget);
    setCurrentMenuCompany(companyId);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setCurrentMenuCompany(null);
  };
  
  const handleAddCompany = () => {
    setDialogMode('create');
    setCurrentCompany(null);
    setCompanyName('');
    setIndustry('');
    setLocation('');
    setDescription('');
    setWebsite('');
    setOpenDialog(true);
  };
  
  const handleEditCompany = (company: any) => {
    setDialogMode('edit');
    setCurrentCompany(company);
    setCompanyName(company.name);
    setIndustry(company.industry);
    setLocation(company.location);
    setDescription(company.description);
    setWebsite(company.website);
    setOpenDialog(true);
    handleCloseMenu();
  };
  
  const handleDeleteCompany = (companyId: number) => {
    setCompanies(companies.filter(company => company.id !== companyId));
    handleCloseMenu();
  };
  
  const handleDuplicateCompany = (company: any) => {
    const newCompany = {
      ...company,
      id: Math.max(...companies.map(c => c.id)) + 1,
      name: `${company.name} (Copy)`,
      activeJobs: 0,
      totalJobs: 0
    };
    
    setCompanies([...companies, newCompany]);
    handleCloseMenu();
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleSaveCompany = () => {
    if (dialogMode === 'create') {
      const newCompany = {
        id: Math.max(...companies.map(c => c.id)) + 1,
        name: companyName,
        industry: industry,
        location: location,
        description: description,
        website: website,
        activeJobs: 0,
        totalJobs: 0,
        employees: '0-50',
        founded: new Date().getFullYear().toString(),
        specialties: industry.split(',').map((specialty: string) => specialty.trim())
      };
      
      setCompanies([...companies, newCompany]);
    } else if (currentCompany) {
      setCompanies(
        companies.map(company => 
          company.id === currentCompany.id
            ? {
                ...company,
                name: companyName,
                industry: industry,
                location: location,
                description: description,
                website: website,
                specialties: industry.split(',').map((specialty: string) => specialty.trim())
              }
            : company
        )
      );
    }
    
    handleCloseDialog();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Manage Companies
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddCompany}
        >
          Add New Company
        </Button>
      </Box>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your company profiles and track job postings across different organizations.
      </Typography>
      
      <Grid container spacing={3}>
        {companies.map((company) => (
          <Grid item key={company.id} xs={12} sm={6} md={4}>
            <CompanyCard>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                      <BusinessIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {company.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {company.industry}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleOpenMenu(e, company.id)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} />
                    {company.location}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} />
                    {company.employees} employees
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {company.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Founded:</strong> {company.founded}
                  </Typography>
                </Box>
                
                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                  {company.specialties.map((specialty: string, index: number) => (
                    <Chip key={index} label={specialty} size="small" variant="outlined" />
                  ))}
                </Stack>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Active Jobs</Typography>
                  <Typography variant="body2" fontWeight="bold">{company.activeJobs}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Total Jobs</Typography>
                  <Typography variant="body2" fontWeight="bold">{company.totalJobs}</Typography>
                </Box>
                
                <Box sx={{ width: '100%', mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(company.activeJobs / company.totalJobs) * 100} 
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              </CardContent>
              
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button 
                  size="small" 
                  startIcon={<WorkIcon />}
                  fullWidth
                >
                  View Jobs
                </Button>
              </CardActions>
            </CompanyCard>
          </Grid>
        ))}
      </Grid>
      
      {/* Create/Edit Company Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Add New Company' : 'Edit Company'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            {dialogMode === 'create' 
              ? 'Add a new company to your portfolio.' 
              : 'Update company information and details.'}
          </DialogContentText>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                variant="outlined"
                margin="normal"
                helperText="Enter the company name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                variant="outlined"
                margin="normal"
                helperText="Enter industry or specialties (comma-separated)"
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
                helperText="Enter company location"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                multiline
                rows={4}
                variant="outlined"
                margin="normal"
                helperText="Describe the company and its mission"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                required
                variant="outlined"
                margin="normal"
                helperText="Enter company website URL"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveCompany} 
            variant="contained" 
            color="primary"
            disabled={!companyName || !industry || !location || !description || !website}
          >
            {dialogMode === 'create' ? 'Add Company' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Company Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {currentMenuCompany && (
          <>
            <MenuItem 
              onClick={() => handleEditCompany(companies.find(c => c.id === currentMenuCompany))}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit Company</ListItemText>
            </MenuItem>
            <MenuItem 
              onClick={() => handleDuplicateCompany(companies.find(c => c.id === currentMenuCompany))}
            >
              <ListItemIcon>
                <ContentCopyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Duplicate Company</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={() => handleDeleteCompany(currentMenuCompany)}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete Company</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default ManageCompanies; 