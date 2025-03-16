import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import TextField from '../Common/TextField';
import Button from '../Common/Button';
import useForm from '../../hooks/useForm';
import { isRequired, isEmail, composeValidators } from '../../utils/validationUtils';
import AuthService from '../../services/AuthService';
import useNotification from '../../hooks/useNotification';
import { ForgotPasswordRequest } from '../../types/auth';
import { colors, spacing } from '../../styles/variables';

/**
 * Props for the ForgotPasswordForm component
 */
interface ForgotPasswordFormProps {
  onLoginClick: () => void;
}

/**
 * Form values for the forgot password form
 */
interface ForgotPasswordFormValues {
  email: string;
}

// Styled components
const FormContainer = styled(Card)`
  width: 100%;
  max-width: 450px;
  margin: ${spacing.xl} auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

const FormTitle = styled(Typography)`
  margin-bottom: ${spacing.lg};
  font-weight: 600;
  text-align: center;
`;

const FormInstructions = styled(Typography)`
  margin-bottom: ${spacing.xl};
  color: ${colors.neutralMedium};
  text-align: center;
`;

const FormGroup = styled(Box)`
  margin-bottom: ${spacing.md};
`;

const FormActions = styled(Box)`
  display: flex;
  flex-direction: column;
  margin-top: ${spacing.lg};
`;

const SuccessMessage = styled(Box)`
  background-color: ${colors.success}15;
  border-radius: 4px;
  padding: ${spacing.md};
  margin-bottom: ${spacing.lg};
`;

const LoginLink = styled(Link)`
  display: block;
  text-align: center;
  margin-top: ${spacing.lg};
  color: ${colors.primary};
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorText = styled(Typography)`
  color: ${colors.error};
  font-size: 0.875rem;
  margin-top: ${spacing.xs};
  margin-bottom: ${spacing.sm};
`;

/**
 * A form component that allows users to request a password reset by entering their email address.
 * This component is part of the authentication flow in the Student Admissions Enrollment Platform,
 * providing the first step in the password recovery process.
 */
const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onLoginClick }) => {
  // Initialize notification hook for user feedback
  const notification = useNotification();
  
  // Track whether password reset request was successful
  const [requestSuccess, setRequestSuccess] = useState(false);
  
  // Create form validation schema
  const validationSchema = {
    email: composeValidators([isRequired, isEmail])
  };
  
  // Initialize form with useForm hook
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    setFieldError
  } = useForm({
    initialValues: { email: '' },
    validationSchema,
    onSubmit: handleForgotPassword
  });
  
  /**
   * Handle form submission to request password reset
   */
  async function handleForgotPassword(formValues: ForgotPasswordFormValues) {
    try {
      const forgotPasswordData: ForgotPasswordRequest = {
        email: formValues.email
      };
      
      // Create AuthService instance
      const authService = new AuthService();
      
      // Call forgotPassword method
      await authService.forgotPassword(forgotPasswordData);
      
      // Set success state
      setRequestSuccess(true);
    } catch (error) {
      // Handle API errors
      if (error && error.message) {
        setFieldError('email', error.message);
      } else {
        setFieldError('email', 'Failed to request password reset. Please try again later.');
      }
    }
  }
  
  return (
    <FormContainer>
      <CardContent>
        <FormTitle variant="h5">
          Forgot Password
        </FormTitle>
        
        <FormInstructions variant="body2">
          Enter your email address below. We'll send you instructions to reset your password.
        </FormInstructions>
        
        {requestSuccess ? (
          <SuccessMessage>
            <Typography variant="body2" color="success">
              A password reset link has been sent to <strong>{values.email}</strong>.
              Please check your email and follow the instructions to reset your password.
            </Typography>
          </SuccessMessage>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <FormGroup>
              <TextField
                id="email"
                name="email"
                label="Email Address"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.email && errors.email}
                fullWidth
                required
                autoComplete="email"
                autoFocus
                type="email"
                placeholder="Enter your email address"
              />
            </FormGroup>
            
            <FormActions>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Send Reset Instructions
              </Button>
            </FormActions>
          </form>
        )}
        
        <LoginLink to="#" onClick={onLoginClick}>
          Back to Login
        </LoginLink>
      </CardContent>
    </FormContainer>
  );
};

export default ForgotPasswordForm;