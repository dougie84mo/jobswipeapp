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
  Divider,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Avatar,
  AvatarGroup,
  Badge,
  LinearProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../contexts/AuthContext';

// Styled components
const ResumeCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[6],
  },
}));

const ActiveResumeBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.main,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      content: '""',
    },
  },
}));

const UploadArea = styled(Paper)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  textAlign: 'center',
  backgroundColor: theme.palette.background.default,
  transition: 'border-color 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
}));

// Mock data for resumes
const mockResumes = [
  {
    id: 1,
    name: 'Frontend Developer Resume',
    fileName: 'frontend_developer_resume.pdf',
    lastUpdated: '2023-07-10',
    active: true,
    size: '387 KB',
    sharedWith: [
      { id: 1, name: 'Jane Smith', email: 'jane@example.com', avatar: '' },
      { id: 2, name: 'John Doe', email: 'john@example.com', avatar: '' },
    ],
    matchScore: 92,
    linkedProfiles: ['Frontend Developer Profile'],
    description: 'Tailored resume highlighting React and TypeScript skills'
  },
  {
    id: 2,
    name: 'Full Stack Resume',
    fileName: 'fullstack_resume.pdf',
    lastUpdated: '2023-06-22',
    active: false,
    size: '412 KB',
    sharedWith: [],
    matchScore: 84,
    linkedProfiles: ['Full Stack Profile'],
    description: 'Resume focusing on full stack development with Node.js and MongoDB'
  },
  {
    id: 3,
    name: 'UI/UX Designer Resume',
    fileName: 'ui_ux_designer_resume.pdf', 
    lastUpdated: '2023-05-15',
    active: false,
    size: '398 KB',
    sharedWith: [
      { id: 3, name: 'Michael Johnson', email: 'michael@example.com', avatar: '' },
    ],
    matchScore: 76,
    linkedProfiles: ['UI/UX Design Profile'],
    description: 'Creative resume showcasing UX research and design projects'
  }
];

const ResumeManagement: React.FC = () => {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResume, setSelectedResume] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [resumeName, setResumeName] = useState('');
  const [resumeDescription, setResumeDescription] = useState('');
  const [linkedProfile, setLinkedProfile] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Mock profiles for linking
  const availableProfiles = [
    'Frontend Developer Profile',
    'Full Stack Profile',
    'UI/UX Design Profile'
  ];
  
  useEffect(() => {
    // In a real app, this would be an API call
    setResumes(mockResumes);
  }, []);
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, resume: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedResume(resume);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setResumeName('');
    setResumeDescription('');
    setLinkedProfile(null);
    setOpenDialog(true);
  };
  
  const handleOpenEditDialog = (resume: any) => {
    setDialogMode('edit');
    setSelectedResume(resume);
    setResumeName(resume.name);
    setResumeDescription(resume.description);
    setLinkedProfile(resume.linkedProfiles[0]);
    setOpenDialog(true);
    handleMenuClose();
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleSaveResume = () => {
    if (dialogMode === 'create') {
      // In a real app, this would be an API call
      const newResume = {
        id: Math.max(...resumes.map(r => r.id)) + 1,
        name: resumeName,
        fileName: `${resumeName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        lastUpdated: new Date().toISOString().split('T')[0],
        active: false,
        size: '0 KB',
        sharedWith: [],
        matchScore: 0,
        linkedProfiles: linkedProfile ? [linkedProfile] : [],
        description: resumeDescription
      };
      
      setResumes([...resumes, newResume]);
    } else if (selectedResume) {
      // Update existing resume
      setResumes(
        resumes.map(resume => 
          resume.id === selectedResume.id
            ? {
                ...resume,
                name: resumeName,
                description: resumeDescription,
                lastUpdated: new Date().toISOString().split('T')[0],
                linkedProfiles: linkedProfile ? [linkedProfile] : resume.linkedProfiles
              }
            : resume
        )
      );
    }
    
    handleCloseDialog();
  };
  
  const handleDeleteResume = (resumeId: number) => {
    setResumes(resumes.filter(resume => resume.id !== resumeId));
    handleMenuClose();
  };
  
  const handleSetActiveResume = (resumeId: number) => {
    setResumes(
      resumes.map(resume => ({
        ...resume,
        active: resume.id === resumeId
      }))
    );
    handleMenuClose();
  };
  
  const handleDuplicateResume = (resume: any) => {
    const newResume = {
      ...resume,
      id: Math.max(...resumes.map(r => r.id)) + 1,
      name: `${resume.name} (Copy)`,
      active: false,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    setResumes([...resumes, newResume]);
    handleMenuClose();
  };
  
  const handleOpenShareDialog = (resume: any) => {
    setSelectedResume(resume);
    setShareEmail('');
    setShareDialogOpen(true);
    handleMenuClose();
  };
  
  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
  };
  
  const handleShareResume = () => {
    // In a real app, this would be an API call
    if (selectedResume && shareEmail) {
      // Mock sharing by adding to sharedWith list
      setResumes(
        resumes.map(resume => 
          resume.id === selectedResume.id
            ? {
                ...resume,
                sharedWith: [
                  ...resume.sharedWith,
                  { id: Math.random(), name: shareEmail, email: shareEmail, avatar: '' }
                ]
              }
            : resume
        )
      );
      
      setShareEmail('');
      handleCloseShareDialog();
    }
  };
  
  const handleOpenPreviewDialog = (resume: any) => {
    setSelectedResume(resume);
    setPreviewDialogOpen(true);
    handleMenuClose();
  };
  
  const handleClosePreviewDialog = () => {
    setPreviewDialogOpen(false);
  };
  
  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true);
  };
  
  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setIsUploading(false);
    setUploadProgress(0);
  };
  
  const handleUploadResume = () => {
    // Simulate upload process
    setIsUploading(true);
    let progress = 0;
    
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          handleCloseUploadDialog();
          // After upload, open the edit dialog to add details
          handleOpenCreateDialog();
        }, 500);
      }
    }, 300);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Resume Management
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<FileUploadIcon />}
            onClick={handleOpenUploadDialog}
            sx={{ mr: 2 }}
          >
            Upload Resume
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Create New Resume
          </Button>
        </Box>
      </Box>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Create, manage, and share targeted resumes to match specific job descriptions and profiles.
      </Typography>
      
      <Grid container spacing={3}>
        {resumes.map((resume) => (
          <Grid item key={resume.id} xs={12} sm={6} md={4}>
            <ResumeCard>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {resume.active ? (
                    <ActiveResumeBadge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                      variant="dot"
                    >
                      <Avatar sx={{ bgcolor: 'primary.light', width: 40, height: 40 }}>
                        <DescriptionIcon />
                      </Avatar>
                    </ActiveResumeBadge>
                  ) : (
                    <Avatar sx={{ bgcolor: 'grey.200', width: 40, height: 40 }}>
                      <DescriptionIcon />
                    </Avatar>
                  )}
                  
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleMenuOpen(e, resume)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {resume.name}
                    {resume.active && (
                      <Tooltip title="Active Resume">
                        <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
                      </Tooltip>
                    )}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {resume.description}
                  </Typography>
                </Box>
                
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  {resume.linkedProfiles.map((profile: string, index: number) => (
                    <Chip 
                      key={index} 
                      label={profile} 
                      size="small" 
                      icon={<AccountTreeIcon />}
                      variant="outlined"
                    />
                  ))}
                </Stack>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    File: {resume.fileName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {resume.size}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Updated: {resume.lastUpdated}
                  </Typography>
                  
                  {resume.matchScore > 0 && (
                    <Chip 
                      label={`${resume.matchScore}% Match`} 
                      size="small" 
                      color={resume.matchScore > 85 ? "success" : "primary"}
                    />
                  )}
                </Box>
                
                {resume.sharedWith.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Shared with:
                    </Typography>
                    <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                      {resume.sharedWith.map((person: any) => (
                        <Tooltip key={person.id} title={person.name}>
                          <Avatar sx={{ width: 24, height: 24 }}>
                            {person.name.charAt(0)}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  </Box>
                )}
              </CardContent>
              
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button 
                  size="small" 
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleOpenPreviewDialog(resume)}
                >
                  Preview
                </Button>
                <Button 
                  size="small" 
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenEditDialog(resume)}
                >
                  Edit
                </Button>
                <Button 
                  size="small" 
                  startIcon={<ShareIcon />}
                  onClick={() => handleOpenShareDialog(resume)}
                >
                  Share
                </Button>
              </CardActions>
            </ResumeCard>
          </Grid>
        ))}
      </Grid>
      
      {/* Resume Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedResume && handleOpenEditDialog(selectedResume)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Resume</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedResume && handleOpenPreviewDialog(selectedResume)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preview</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedResume && handleDuplicateResume(selectedResume)}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedResume && handleOpenShareDialog(selectedResume)}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <FileDownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        {selectedResume && !selectedResume.active && (
          <MenuItem onClick={() => selectedResume && handleSetActiveResume(selectedResume.id)}>
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Set as Active</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem 
          onClick={() => selectedResume && handleDeleteResume(selectedResume.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Create/Edit Resume Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Resume' : 'Edit Resume'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {dialogMode === 'create' 
              ? 'Create a targeted resume to match specific job requirements.' 
              : 'Update your resume details and improve your job matches.'}
          </DialogContentText>
          
          <TextField
            fullWidth
            label="Resume Name"
            value={resumeName}
            onChange={(e) => setResumeName(e.target.value)}
            margin="normal"
            required
            variant="outlined"
          />
          
          <TextField
            fullWidth
            label="Description"
            value={resumeDescription}
            onChange={(e) => setResumeDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            variant="outlined"
          />
          
          <TextField
            select
            fullWidth
            label="Link to Profile"
            value={linkedProfile || ''}
            onChange={(e) => setLinkedProfile(e.target.value)}
            margin="normal"
            variant="outlined"
            helperText="Linking to a profile helps tailor your resume to specific job types"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {availableProfiles.map((profile) => (
              <MenuItem key={profile} value={profile}>
                {profile}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveResume} 
            variant="contained" 
            color="primary"
            disabled={!resumeName}
          >
            {dialogMode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Share Resume Dialog */}
      <Dialog open={shareDialogOpen} onClose={handleCloseShareDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Share Resume</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Share your resume with recruiters, mentors, or other job seekers for feedback.
          </DialogContentText>
          
          {selectedResume && selectedResume.sharedWith.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Already shared with:
              </Typography>
              <List dense>
                {selectedResume.sharedWith.map((person: any) => (
                  <ListItem key={person.id}>
                    <ListItemIcon>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        {person.name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText 
                      primary={person.name} 
                      secondary={person.email} 
                    />
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ my: 2 }} />
            </Box>
          )}
          
          <TextField
            fullWidth
            label="Email Address"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            margin="normal"
            required
            variant="outlined"
            placeholder="example@email.com"
            type="email"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareDialog}>Cancel</Button>
          <Button 
            onClick={handleShareResume} 
            variant="contained" 
            color="primary"
            disabled={!shareEmail}
          >
            Share
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Preview Resume Dialog */}
      <Dialog open={previewDialogOpen} onClose={handleClosePreviewDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedResume?.name}
          <IconButton
            aria-label="close"
            onClick={handleClosePreviewDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <DeleteIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Resume preview would be displayed here.
            </Typography>
            <Box 
              component="img" 
              src="https://via.placeholder.com/600x800?text=Resume+Preview" 
              alt="Resume Preview"
              sx={{ 
                maxWidth: '100%', 
                height: 'auto',
                mt: 2,
                boxShadow: 3,
                border: '1px solid #e0e0e0'
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreviewDialog}>Close</Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<FileDownloadIcon />}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Upload Resume Dialog */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Resume</DialogTitle>
        <DialogContent>
          {!isUploading ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <UploadArea>
                <Box sx={{ p: 3 }}>
                  <FileUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Drag & Drop your resume here
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    or
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    sx={{ mt: 2 }}
                  >
                    Browse Files
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx"
                      onChange={handleUploadResume}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Supported formats: PDF, DOC, DOCX
                  </Typography>
                </Box>
              </UploadArea>
            </Box>
          ) : (
            <Box sx={{ py: 4, px: 2 }}>
              <Typography variant="body1" align="center" gutterBottom>
                Uploading resume...
              </Typography>
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="body2" color="text.secondary" align="right" sx={{ mt: 1 }}>
                  {uploadProgress}%
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog} disabled={isUploading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResumeManagement; 