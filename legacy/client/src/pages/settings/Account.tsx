import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Grid, Switch, FormControlLabel } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import SettingsLayout from '../../components/settings/SettingsLayout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// Common timezones list
const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland'
];

const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      emailNotifications: user?.emailNotifications ?? true,
      profileVisibility: user?.profileVisibility ?? 'public',
      language: user?.language ?? 'en',
      timezone: user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    validationSchema: Yup.object({
      emailNotifications: Yup.boolean(),
      profileVisibility: Yup.string().oneOf(['public', 'private']),
      language: Yup.string(),
      timezone: Yup.string(),
    }),
    onSubmit: async (values) => {
      try {
        await api.put('/users/account-settings', values);
        setSuccess('Account settings updated successfully');
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update account settings');
        setSuccess(null);
      }
    },
  });

  return (
    <SettingsLayout>
      <Typography variant="h5" gutterBottom>
        Account Settings
      </Typography>

      <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3 }}>
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

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="emailNotifications"
                  checked={formik.values.emailNotifications}
                  onChange={formik.handleChange}
                />
              }
              label="Email Notifications"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Profile Visibility"
              name="profileVisibility"
              value={formik.values.profileVisibility}
              onChange={formik.handleChange}
              error={formik.touched.profileVisibility && Boolean(formik.errors.profileVisibility)}
              helperText={formik.touched.profileVisibility && formik.errors.profileVisibility}
              SelectProps={{
                native: true,
              }}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Language"
              name="language"
              value={formik.values.language}
              onChange={formik.handleChange}
              error={formik.touched.language && Boolean(formik.errors.language)}
              helperText={formik.touched.language && formik.errors.language}
              SelectProps={{
                native: true,
              }}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Timezone"
              name="timezone"
              value={formik.values.timezone}
              onChange={formik.handleChange}
              error={formik.touched.timezone && Boolean(formik.errors.timezone)}
              helperText={formik.touched.timezone && formik.errors.timezone}
              SelectProps={{
                native: true,
              }}
            >
              {timezones.map((tz: string) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!formik.dirty || formik.isSubmitting}
              >
                Save Changes
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </SettingsLayout>
  );
};

export default AccountSettings; 