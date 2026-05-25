import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Grid, Switch, FormControlLabel, Divider } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import SettingsLayout from '../../components/settings/SettingsLayout';
import api from '../../services/api';

const SecuritySettings: React.FC = () => {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required('Current password is required'),
      newPassword: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        )
        .required('New password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword')], 'Passwords must match')
        .required('Please confirm your password'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        await api.put('/users/change-password', {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });
        setSuccess('Password changed successfully');
        setError(null);
        resetForm();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to change password');
        setSuccess(null);
      }
    },
  });

  const securityFormik = useFormik({
    initialValues: {
      twoFactorEnabled: false,
      loginNotifications: true,
      deviceHistory: true,
      sessionTimeout: 30,
    },
    validationSchema: Yup.object({
      twoFactorEnabled: Yup.boolean(),
      loginNotifications: Yup.boolean(),
      deviceHistory: Yup.boolean(),
      sessionTimeout: Yup.number().min(15).max(120),
    }),
    onSubmit: async (values) => {
      try {
        await api.put('/users/security-settings', values);
        setSuccess('Security settings updated successfully');
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update security settings');
        setSuccess(null);
      }
    },
  });

  return (
    <SettingsLayout>
      <Typography variant="h5" gutterBottom>
        Security Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={securityFormik.handleSubmit} sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Security Preferences
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="twoFactorEnabled"
                  checked={securityFormik.values.twoFactorEnabled}
                  onChange={securityFormik.handleChange}
                />
              }
              label="Enable Two-Factor Authentication"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="loginNotifications"
                  checked={securityFormik.values.loginNotifications}
                  onChange={securityFormik.handleChange}
                />
              }
              label="Notify me of new login attempts"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="deviceHistory"
                  checked={securityFormik.values.deviceHistory}
                  onChange={securityFormik.handleChange}
                />
              }
              label="Keep device login history"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Session Timeout (minutes)"
              name="sessionTimeout"
              value={securityFormik.values.sessionTimeout}
              onChange={securityFormik.handleChange}
              error={securityFormik.touched.sessionTimeout && Boolean(securityFormik.errors.sessionTimeout)}
              helperText={securityFormik.touched.sessionTimeout && securityFormik.errors.sessionTimeout}
              InputProps={{ inputProps: { min: 15, max: 120 } }}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!securityFormik.dirty || securityFormik.isSubmitting}
              >
                Save Security Settings
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      <Box component="form" onSubmit={passwordFormik.handleSubmit}>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="password"
              label="Current Password"
              name="currentPassword"
              value={passwordFormik.values.currentPassword}
              onChange={passwordFormik.handleChange}
              error={passwordFormik.touched.currentPassword && Boolean(passwordFormik.errors.currentPassword)}
              helperText={passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              type="password"
              label="New Password"
              name="newPassword"
              value={passwordFormik.values.newPassword}
              onChange={passwordFormik.handleChange}
              error={passwordFormik.touched.newPassword && Boolean(passwordFormik.errors.newPassword)}
              helperText={passwordFormik.touched.newPassword && passwordFormik.errors.newPassword}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              type="password"
              label="Confirm New Password"
              name="confirmPassword"
              value={passwordFormik.values.confirmPassword}
              onChange={passwordFormik.handleChange}
              error={passwordFormik.touched.confirmPassword && Boolean(passwordFormik.errors.confirmPassword)}
              helperText={passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!passwordFormik.dirty || passwordFormik.isSubmitting}
              >
                Change Password
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </SettingsLayout>
  );
};

export default SecuritySettings; 