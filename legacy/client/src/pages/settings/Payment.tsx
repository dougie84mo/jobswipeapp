import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import SettingsLayout from '../../components/settings/SettingsLayout';
import api from '../../services/api';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CreditCardIcon from '@mui/icons-material/CreditCard';

interface PaymentMethod {
  id: string;
  type: 'credit' | 'debit';
  last4: string;
  expMonth: number;
  expYear: number;
  brand: string;
  isDefault: boolean;
}

interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const PaymentSettings: React.FC = () => {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);

  const billingFormik = useFormik({
    initialValues: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    validationSchema: Yup.object({
      street: Yup.string().required('Street address is required'),
      city: Yup.string().required('City is required'),
      state: Yup.string().required('State is required'),
      zipCode: Yup.string().required('ZIP code is required'),
      country: Yup.string().required('Country is required'),
    }),
    onSubmit: async (values) => {
      try {
        await api.put('/users/billing-address', values);
        setSuccess('Billing address updated successfully');
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update billing address');
        setSuccess(null);
      }
    },
  });

  const cardFormik = useFormik({
    initialValues: {
      cardNumber: '',
      expMonth: '',
      expYear: '',
      cvc: '',
      cardholderName: '',
    },
    validationSchema: Yup.object({
      cardNumber: Yup.string()
        .matches(/^\d{16}$/, 'Card number must be 16 digits')
        .required('Card number is required'),
      expMonth: Yup.string()
        .matches(/^(0[1-9]|1[0-2])$/, 'Invalid month')
        .required('Expiration month is required'),
      expYear: Yup.string()
        .matches(/^\d{4}$/, 'Invalid year')
        .required('Expiration year is required'),
      cvc: Yup.string()
        .matches(/^\d{3,4}$/, 'Invalid CVC')
        .required('CVC is required'),
      cardholderName: Yup.string().required('Cardholder name is required'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        await api.post('/users/payment-methods', values);
        setSuccess('Payment method added successfully');
        setError(null);
        setIsAddingCard(false);
        resetForm();
        // Refresh payment methods
        fetchPaymentMethods();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to add payment method');
        setSuccess(null);
      }
    },
  });

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('/users/payment-methods');
      setPaymentMethods(response.data);
    } catch (err: any) {
      setError('Failed to fetch payment methods');
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    try {
      await api.delete(`/users/payment-methods/${methodId}`);
      setSuccess('Payment method deleted successfully');
      setError(null);
      fetchPaymentMethods();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete payment method');
      setSuccess(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await api.put(`/users/payment-methods/${methodId}/default`);
      setSuccess('Default payment method updated');
      setError(null);
      fetchPaymentMethods();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update default payment method');
      setSuccess(null);
    }
  };

  return (
    <SettingsLayout>
      <Typography variant="h5" gutterBottom>
        Payment Settings
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

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Payment Methods
        </Typography>

        <Grid container spacing={2}>
          {paymentMethods.map((method) => (
            <Grid item xs={12} sm={6} key={method.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CreditCardIcon sx={{ mr: 1 }} />
                      <Box>
                        <Typography variant="subtitle1">
                          {method.brand} •••• {method.last4}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Expires {method.expMonth}/{method.expYear}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => setSelectedMethod(method)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteMethod(method.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  {!method.isDefault && (
                    <Button
                      size="small"
                      onClick={() => handleSetDefault(method.id)}
                      sx={{ mt: 1 }}
                    >
                      Set as Default
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Button
          variant="outlined"
          onClick={() => setIsAddingCard(true)}
          sx={{ mt: 2 }}
        >
          Add Payment Method
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      <Box component="form" onSubmit={billingFormik.handleSubmit}>
        <Typography variant="h6" gutterBottom>
          Billing Address
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Street Address"
              name="street"
              value={billingFormik.values.street}
              onChange={billingFormik.handleChange}
              error={billingFormik.touched.street && Boolean(billingFormik.errors.street)}
              helperText={billingFormik.touched.street && billingFormik.errors.street}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              name="city"
              value={billingFormik.values.city}
              onChange={billingFormik.handleChange}
              error={billingFormik.touched.city && Boolean(billingFormik.errors.city)}
              helperText={billingFormik.touched.city && billingFormik.errors.city}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="State"
              name="state"
              value={billingFormik.values.state}
              onChange={billingFormik.handleChange}
              error={billingFormik.touched.state && Boolean(billingFormik.errors.state)}
              helperText={billingFormik.touched.state && billingFormik.errors.state}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="ZIP Code"
              name="zipCode"
              value={billingFormik.values.zipCode}
              onChange={billingFormik.handleChange}
              error={billingFormik.touched.zipCode && Boolean(billingFormik.errors.zipCode)}
              helperText={billingFormik.touched.zipCode && billingFormik.errors.zipCode}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Country"
              name="country"
              value={billingFormik.values.country}
              onChange={billingFormik.handleChange}
              error={billingFormik.touched.country && Boolean(billingFormik.errors.country)}
              helperText={billingFormik.touched.country && billingFormik.errors.country}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!billingFormik.dirty || billingFormik.isSubmitting}
              >
                Save Billing Address
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Add Payment Method Dialog */}
      <Dialog open={isAddingCard} onClose={() => setIsAddingCard(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Payment Method</DialogTitle>
        <form onSubmit={cardFormik.handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Card Number"
                  name="cardNumber"
                  value={cardFormik.values.cardNumber}
                  onChange={cardFormik.handleChange}
                  error={cardFormik.touched.cardNumber && Boolean(cardFormik.errors.cardNumber)}
                  helperText={cardFormik.touched.cardNumber && cardFormik.errors.cardNumber}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cardholder Name"
                  name="cardholderName"
                  value={cardFormik.values.cardholderName}
                  onChange={cardFormik.handleChange}
                  error={cardFormik.touched.cardholderName && Boolean(cardFormik.errors.cardholderName)}
                  helperText={cardFormik.touched.cardholderName && cardFormik.errors.cardholderName}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Month"
                  name="expMonth"
                  value={cardFormik.values.expMonth}
                  onChange={cardFormik.handleChange}
                  error={cardFormik.touched.expMonth && Boolean(cardFormik.errors.expMonth)}
                  helperText={cardFormik.touched.expMonth && cardFormik.errors.expMonth}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Year"
                  name="expYear"
                  value={cardFormik.values.expYear}
                  onChange={cardFormik.handleChange}
                  error={cardFormik.touched.expYear && Boolean(cardFormik.errors.expYear)}
                  helperText={cardFormik.touched.expYear && cardFormik.errors.expYear}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="CVC"
                  name="cvc"
                  value={cardFormik.values.cvc}
                  onChange={cardFormik.handleChange}
                  error={cardFormik.touched.cvc && Boolean(cardFormik.errors.cvc)}
                  helperText={cardFormik.touched.cvc && cardFormik.errors.cvc}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsAddingCard(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Add Card
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </SettingsLayout>
  );
};

export default PaymentSettings; 