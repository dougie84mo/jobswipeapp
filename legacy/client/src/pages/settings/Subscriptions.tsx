import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import SettingsLayout from '../../components/settings/SettingsLayout';
import api from '../../services/api';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  invoiceUrl?: string;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    interval: 'month',
    features: [
      '10 job postings per month',
      'Basic candidate matching',
      'Email support',
      'Standard analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    interval: 'month',
    features: [
      'Unlimited job postings',
      'Advanced candidate matching',
      'Priority email & phone support',
      'Advanced analytics',
      'Custom branding',
    ],
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    interval: 'month',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'API access',
      'Custom integrations',
      'SLA guarantees',
      'Bulk actions',
    ],
  },
];

const SubscriptionsSettings: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const [subscriptionResponse, billingResponse] = await Promise.all([
        api.get('/users/subscription'),
        api.get('/users/billing-history'),
      ]);
      setCurrentPlan(subscriptionResponse.data.planId);
      setBillingHistory(billingResponse.data);
      setLoading(false);
    } catch (err: any) {
      setError('Failed to load subscription data');
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      await api.post('/users/subscription', { planId });
      setSuccess('Subscription updated successfully');
      setError(null);
      fetchSubscriptionData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update subscription');
      setSuccess(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await api.delete('/users/subscription');
      setSuccess('Subscription cancelled successfully');
      setError(null);
      setCurrentPlan(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
      setSuccess(null);
    }
  };

  return (
    <SettingsLayout>
      <Typography variant="h5" gutterBottom>
        Subscription Settings
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

      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" gutterBottom>
          Available Plans
        </Typography>

        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  ...(plan.isPopular && {
                    border: (theme) => `2px solid ${theme.palette.primary.main}`,
                  }),
                }}
              >
                {plan.isPopular && (
                  <Chip
                    icon={<StarIcon />}
                    label="Most Popular"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      right: 12,
                    }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" component="div" gutterBottom>
                    ${plan.price}
                    <Typography variant="subtitle1" component="span" color="text.secondary">
                      /month
                    </Typography>
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {plan.features.map((feature) => (
                      <Box key={feature} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckIcon color="primary" sx={{ mr: 1 }} fontSize="small" />
                        <Typography variant="body2">{feature}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={currentPlan === plan.id ? 'outlined' : 'contained'}
                    color="primary"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={currentPlan === plan.id}
                  >
                    {currentPlan === plan.id ? 'Current Plan' : 'Subscribe'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {currentPlan && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Current Subscription
          </Typography>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              You are currently on the{' '}
              <strong>{plans.find((p) => p.id === currentPlan)?.name}</strong> plan.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={handleCancelSubscription}
              sx={{ mt: 2 }}
            >
              Cancel Subscription
            </Button>
          </Paper>
        </Box>
      )}

      <Divider sx={{ my: 4 }} />

      <Box>
        <Typography variant="h6" gutterBottom>
          Billing History
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Invoice</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {billingHistory.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell>{new Date(bill.date).toLocaleDateString()}</TableCell>
                  <TableCell>{bill.description}</TableCell>
                  <TableCell>${bill.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={bill.status}
                      color={
                        bill.status === 'paid'
                          ? 'success'
                          : bill.status === 'pending'
                          ? 'warning'
                          : 'error'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {bill.invoiceUrl && (
                      <Button size="small" href={bill.invoiceUrl} target="_blank">
                        Download
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {billingHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No billing history available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </SettingsLayout>
  );
};

export default SubscriptionsSettings; 