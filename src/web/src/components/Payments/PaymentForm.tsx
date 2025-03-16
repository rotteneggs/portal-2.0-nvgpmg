import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from '@emotion/styled';
import { Box, Grid, Alert, Typography } from '@mui/material';

import Form from '../Common/Form';
import TextField from '../Common/TextField';
import Select from '../Common/Select';
import Button from '../Common/Button';

import {
  PaymentType,
  PaymentMethod,
  Currency,
  PaymentFormData
} from '../../types/payment';

import {
  fetchPaymentTypes,
  fetchPaymentMethods,
  initializePayment,
  selectPaymentTypes,
  selectPaymentMethods,
  selectPaymentLoading,
  selectPaymentError,
  selectPaymentInitialization
} from '../../redux/slices/paymentsSlice';

import { formatCurrency } from '../../utils/formatUtils';
import { colors, spacing } from '../../styles/variables';

/**
 * Props interface for the PaymentForm component
 */
export interface PaymentFormProps {
  /** ID of the application associated with the payment */
  applicationId: string;
  /** Pre-selected payment type (optional) */
  initialPaymentType?: PaymentType;
  /** Pre-filled payment amount (optional) */
  initialAmount?: number;
  /** Callback function called when payment is initialized */
  onPaymentInitialized?: (paymentInitialization: any) => void;
  /** Callback function called when form is cancelled */
  onCancel?: () => void;
  /** Additional CSS class for styling */
  className?: string;
}

// Styled components
const FormContainer = styled(Box)`
  margin-bottom: ${spacing.md};
`;

const ButtonContainer = styled(Box)`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: ${spacing.sm};
  margin-top: ${spacing.md};
`;

const ErrorAlert = styled(Alert)`
  margin-bottom: ${spacing.md};
`;

/**
 * Validates the payment form data
 * @param values Form values to validate
 * @returns Validation errors, if any
 */
const validatePaymentForm = (values: Record<string, any>): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!values.payment_type) {
    errors.payment_type = 'Please select a payment type';
  }

  if (!values.payment_method) {
    errors.payment_method = 'Please select a payment method';
  }

  if (!values.amount) {
    errors.amount = 'Please enter an amount';
  } else if (isNaN(Number(values.amount)) || Number(values.amount) <= 0) {
    errors.amount = 'Please enter a valid amount';
  }

  return errors;
};

/**
 * A form component for processing payments in the Student Admissions Enrollment Platform.
 * Allows users to select payment types, payment methods, enter payment amounts, and submit
 * payment information for processing.
 */
const PaymentForm: React.FC<PaymentFormProps> = ({
  applicationId,
  initialPaymentType,
  initialAmount,
  onPaymentInitialized,
  onCancel,
  className
}) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const paymentTypes = useSelector(selectPaymentTypes);
  const paymentMethods = useSelector(selectPaymentMethods);
  const isLoading = useSelector(selectPaymentLoading);
  const error = useSelector(selectPaymentError);
  const paymentInitialization = useSelector(selectPaymentInitialization);
  
  // Form initial values
  const initialValues = {
    payment_type: initialPaymentType || '',
    payment_method: '',
    amount: initialAmount || '',
    currency: Currency.USD
  };
  
  // Fetch payment types on component mount
  useEffect(() => {
    dispatch(fetchPaymentTypes());
  }, [dispatch]);
  
  // Fetch payment methods when payment type changes
  useEffect(() => {
    if (initialValues.payment_type) {
      dispatch(fetchPaymentMethods(initialValues.payment_type));
    }
  }, [dispatch, initialValues.payment_type]);
  
  // Call callback when payment is initialized
  useEffect(() => {
    if (paymentInitialization && onPaymentInitialized) {
      onPaymentInitialized(paymentInitialization);
    }
  }, [paymentInitialization, onPaymentInitialized]);
  
  // Handle form submission
  const handleSubmit = useCallback((values: Record<string, any>) => {
    const paymentData: PaymentFormData = {
      application_id: applicationId ? parseInt(applicationId) : null,
      payment_type: values.payment_type as PaymentType,
      payment_method: values.payment_method as PaymentMethod,
      amount: parseFloat(values.amount),
      currency: values.currency as Currency,
      payment_details: {}
    };
    
    dispatch(initializePayment(paymentData));
  }, [dispatch, applicationId]);
  
  // Convert payment types and methods to select options
  const paymentTypeOptions = paymentTypes.map(type => ({
    value: type.code,
    label: type.name
  }));
  
  const paymentMethodOptions = paymentMethods.map(method => ({
    value: method.code,
    label: method.name
  }));
  
  return (
    <FormContainer className={className}>
      {error && (
        <ErrorAlert severity="error" data-testid="payment-form-error">
          {error}
        </ErrorAlert>
      )}
      
      <Form
        initialValues={initialValues}
        validationSchema={validatePaymentForm}
        onSubmit={handleSubmit}
        noValidate
        id="payment-form"
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Select
                  name="payment_type"
                  label="Payment Type"
                  value={values.payment_type}
                  onChange={(e) => {
                    const paymentType = e.target.value as string;
                    setFieldValue('payment_type', paymentType);
                    setFieldValue('payment_method', '');
                    
                    if (paymentType) {
                      dispatch(fetchPaymentMethods(paymentType));
                    }
                  }}
                  onBlur={handleBlur}
                  options={paymentTypeOptions}
                  error={touched.payment_type && Boolean(errors.payment_type)}
                  helperText={touched.payment_type ? errors.payment_type : ''}
                  required
                  fullWidth
                  data-testid="payment-type-select"
                />
              </Grid>
              
              {values.payment_type && (
                <Grid item xs={12}>
                  <Select
                    name="payment_method"
                    label="Payment Method"
                    value={values.payment_method}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    options={paymentMethodOptions}
                    error={touched.payment_method && Boolean(errors.payment_method)}
                    helperText={touched.payment_method ? errors.payment_method : ''}
                    required
                    fullWidth
                    data-testid="payment-method-select"
                    disabled={isLoading || paymentMethods.length === 0}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <TextField
                  name="amount"
                  label="Amount"
                  value={values.amount}
                  onChange={(e) => {
                    // Allow only numbers and decimal point
                    const value = e.target.value.replace(/[^\d.]/g, '');
                    setFieldValue('amount', value);
                  }}
                  onBlur={handleBlur}
                  error={touched.amount && Boolean(errors.amount)}
                  helperText={touched.amount ? errors.amount : ''}
                  required
                  fullWidth
                  type="text"
                  inputProps={{ inputMode: 'decimal' }}
                  startAdornment={<Typography variant="body1">$</Typography>}
                  data-testid="payment-amount-input"
                />
                {values.amount && !isNaN(Number(values.amount)) && (
                  <Typography variant="caption" color="textSecondary">
                    {formatCurrency(Number(values.amount), Currency.USD)}
                  </Typography>
                )}
              </Grid>
            </Grid>
            
            <ButtonContainer>
              {onCancel && (
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  disabled={isLoading}
                  data-testid="payment-cancel-button"
                >
                  Cancel
                </Button>
              )}
              
              <Button
                variant="contained"
                color="primary"
                type="submit"
                loading={isLoading}
                disabled={isLoading}
                data-testid="payment-submit-button"
              >
                Continue to Payment
              </Button>
            </ButtonContainer>
          </>
        )}
      </Form>
    </FormContainer>
  );
};

export default PaymentForm;