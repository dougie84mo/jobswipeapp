import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Avatar, 
  Button, 
  Grid, 
  TextField, 
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Autocomplete
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmailIcon from '@mui/icons-material/Email';
import WorkIcon from '@mui/icons-material/Work';
import api from '../services/api';

const Profile: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [industries, setIndustries] = useState<string[]>(user?.industries || []);

  // Mock data for skills and industries (replace with API data later)
  const availableSkills = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'C++', 'SQL',
    'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication',
    'Problem Solving', 'Data Analysis', 'Machine Learning', 'UI/UX Design'
  ];

  const availableIndustries = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
    'Retail', 'Media', 'Entertainment', 'Consulting', 'Real Estate',
    'Energy', 'Transportation', 'Hospitality', 'Construction'
  ];

  const formik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      location: user?.location || '',
      bio: user?.bio || '',
      skills: user?.skills || [],
      industries: user?.industries || []
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required('First name is required'),
      lastName: Yup.string().required('Last name is required'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
      location: Yup.string(),
      bio: Yup.string(),
      skills: Yup.array().of(Yup.string()),
      industries: Yup.array().of(Yup.string())
    }),
    onSubmit: async (values) => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      try {
        await api.put('/users/profile', {
          ...values,
          skills,
          industries
        });
        setSuccess('Profile updated successfully');
        setEditing(false);
        // Reload the page to refresh user data
        window.location.reload();
      } catch (err: any) {
        console.error('Error updating profile:', err);
        setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
      } finally {
        setSaving(false);
      }
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      await api.post('/users/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess('Profile picture updated successfully');
      // Reload the page to refresh user data
      window.location.reload();
    } catch (err: any) {
      console.error('Error uploading profile picture:', err);
      setError(err.response?.data?.message || 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  if (authLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading profile...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Your Profile
          </Typography>
          {!editing && (
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />}
              onClick={() => setEditing(true)}
            >
              Edit Profile
            </Button>
          )}
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

        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Profile Picture */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar
              src={user?.profilePicture}
              sx={{ width: 150, height: 150, mb: 2 }}
            >
              {!user?.profilePicture && <PersonIcon sx={{ fontSize: 80 }} />}
            </Avatar>
            
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="profile-picture-upload"
              type="file"
              onChange={handleFileUpload}
              disabled={uploadingImage}
            />
            <label htmlFor="profile-picture-upload">
              <Button
                variant="outlined"
                component="span"
                disabled={uploadingImage}
                sx={{ mb: 1 }}
              >
                {uploadingImage ? <CircularProgress size={24} /> : 'Change Picture'}
              </Button>
            </label>
            
            <Chip 
              label={user?.userType === 'jobseeker' ? 'Job Seeker' : 'Recruiter'} 
              color="primary" 
              sx={{ mt: 1 }}
            />
          </Grid>

          {/* Profile Details */}
          <Grid item xs={12} md={8}>
            {editing ? (
              <form onSubmit={formik.handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="firstName"
                      name="firstName"
                      label="First Name"
                      value={formik.values.firstName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                      helperText={formik.touched.firstName && formik.errors.firstName}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="lastName"
                      name="lastName"
                      label="Last Name"
                      value={formik.values.lastName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                      helperText={formik.touched.lastName && formik.errors.lastName}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="email"
                      name="email"
                      label="Email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.email && Boolean(formik.errors.email)}
                      helperText={formik.touched.email && formik.errors.email}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="location"
                      name="location"
                      label="Location"
                      value={formik.values.location}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.location && Boolean(formik.errors.location)}
                      helperText={formik.touched.location && formik.errors.location}
                      placeholder="e.g. New York, NY"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="bio"
                      name="bio"
                      label="Bio"
                      multiline
                      rows={4}
                      value={formik.values.bio}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.bio && Boolean(formik.errors.bio)}
                      helperText={formik.touched.bio && formik.errors.bio}
                      placeholder="Tell us about yourself"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Skills
                    </Typography>
                    <Autocomplete
                      multiple
                      options={availableSkills}
                      value={skills}
                      onChange={(_, newValue) => setSkills(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder="Add skills"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option}
                            {...getTagProps({ index })}
                            color="primary"
                            variant="outlined"
                          />
                        ))
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Industries
                    </Typography>
                    <Autocomplete
                      multiple
                      options={availableIndustries}
                      value={industries}
                      onChange={(_, newValue) => setIndustries(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder="Add industries"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option}
                            {...getTagProps({ index })}
                            color="secondary"
                            variant="outlined"
                          />
                        ))
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={saving}
                    >
                      {saving ? <CircularProgress size={24} /> : 'Save Changes'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">
                    {user?.firstName} {user?.lastName}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="body1">
                    {user?.email}
                  </Typography>
                </Box>
                
                {user?.location && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationOnIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="body1">
                      {user.location}
                    </Typography>
                  </Box>
                )}
                
                {user?.userType === 'jobseeker' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WorkIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="body1">
                      Job Seeker
                    </Typography>
                  </Box>
                )}
                
                {user?.userType === 'recruiter' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WorkIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="body1">
                      Recruiter
                    </Typography>
                  </Box>
                )}
                
                {user?.bio && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      About Me
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {user.bio}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Profile; 