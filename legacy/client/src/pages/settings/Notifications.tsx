import React, { useState } from 'react';
import { Box, Typography, Alert, Grid, Switch, FormControlLabel, Button, Divider } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import SettingsLayout from '../../components/settings/SettingsLayout';
import api from '../../services/api';

interface NotificationSettings {
  matches: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  messages: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  jobUpdates: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  profileViews: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

const defaultSettings: NotificationSettings = {
  matches: {
    email: true,
    push: true,
    inApp: true,
  },
  messages: {
    email: true,
    push: true,
    inApp: true,
  },
  jobUpdates: {
    email: true,
    push: true,
    inApp: true,
  },
  profileViews: {
    email: false,
    push: true,
    inApp: true,
  },
};

const NotificationSettingsPage: React.FC = () => {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: defaultSettings,
    validationSchema: Yup.object({
      matches: Yup.object({
        email: Yup.boolean(),
        push: Yup.boolean(),
        inApp: Yup.boolean(),
      }),
      messages: Yup.object({
        email: Yup.boolean(),
        push: Yup.boolean(),
        inApp: Yup.boolean(),
      }),
      jobUpdates: Yup.object({
        email: Yup.boolean(),
        push: Yup.boolean(),
        inApp: Yup.boolean(),
      }),
      profileViews: Yup.object({
        email: Yup.boolean(),
        push: Yup.boolean(),
        inApp: Yup.boolean(),
      }),
    }),
    onSubmit: async (values) => {
      try {
        await api.put('/users/notification-settings', values);
        setSuccess('Notification settings updated successfully');
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update notification settings');
        setSuccess(null);
      }
    },
  });

  const NotificationSection: React.FC<{
    title: string;
    section: keyof NotificationSettings;
  }> = ({ title, section }) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                name={`${section}.email`}
                checked={formik.values[section].email}
                onChange={formik.handleChange}
              />
            }
            label="Email Notifications"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                name={`${section}.push`}
                checked={formik.values[section].push}
                onChange={formik.handleChange}
              />
            }
            label="Push Notifications"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                name={`${section}.inApp`}
                checked={formik.values[section].inApp}
                onChange={formik.handleChange}
              />
            }
            label="In-App Notifications"
          />
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <SettingsLayout>
      <Typography variant="h5" gutterBottom>
        Notification Settings
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

        <NotificationSection title="Match Notifications" section="matches" />
        <Divider sx={{ my: 3 }} />
        <NotificationSection title="Message Notifications" section="messages" />
        <Divider sx={{ my: 3 }} />
        <NotificationSection title="Job Update Notifications" section="jobUpdates" />
        <Divider sx={{ my: 3 }} />
        <NotificationSection title="Profile View Notifications" section="profileViews" />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!formik.dirty || formik.isSubmitting}
          >
            Save Changes
          </Button>
        </Box>
      </Box>
    </SettingsLayout>
  );
};

export default NotificationSettingsPage; 