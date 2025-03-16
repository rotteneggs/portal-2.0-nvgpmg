import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Card, CardContent, Typography, Box, LinearProgress, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link, useNavigate, useParams } from 'react-router-dom';

import TextField from '../Common/TextField';
import Button from '../Common/Button';
import useForm from '../../hooks/useForm';
import { required, passwordComplexity, match } from '../../utils/validationUtils';
import AuthService from '../../services/AuthService';
import useNotification from '../../hooks/useNotification';
import { ResetPasswordRequest } from '../../types/auth';
import { colors, spacing } from '../../styles/variables';

/**
 * Props for the ResetPasswordForm component
 */
interface ResetPasswordFormProps {
  onLoginClick: () => void;
  redirectUrl?: string;
}

/**
 * Form values for the reset password form
 */
interface ResetPasswordFormValues {
  email: string;
  password: string;
  password_confirmation: string;
}

/**
 * Calculate password strength score based on complexity
 * @param password - The password to evaluate
 * @returns A number between 0 and 100 representing password strength
 */
const calculatePasswordStrength = (password: string): number => {
  let score = 0;
  
  // Add points for password length (longer is better)
  score += Math.min(password.length * 4, 40);
  
  // Add points for containing lowercase letters
  if (/[a-z]/.test(password)) score += 10;
  
  // Add points for containing uppercase letters
  if (/[A-Z]/.test(password)) score += 10;
  
  // Add points for containing numbers
  if (/[0-9]/.test(password)) score += 10;
  
  // Add points for containing special characters
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  
  // Add points for character variety
  const uniqueChars = new Set(password.split('')).size;
  score += Math.min(uniqueChars * 2, 15);
  
  // Cap score at 100
  return Math.min(score, 100);
};

/**
 * Get color for password strength indicator based on score
 * @param score - The password strength score
 * @returns A color value for the strength indicator
 */
const getStrengthColor = (score: number): string => {
  if (score < 30) return colors.error; // Weak
  if (score < 60) return colors.warning; // Medium
  return colors.success; // Strong
};

// Styled components
const FormContainer = styled(Card)`
  max-width: 500px;
  margin: 2rem auto;
  box-shadow: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12);
`;

const FormTitle = styled(Typography)`
  font-weight: 600;
  margin-bottom: ${spacing.md};
`;

const FormInstructions = styled(Typography)`
  margin-bottom: ${spacing.md};
  color: ${colors.neutralMedium};
`;

const FormGroup = styled(Box)`
  margin-bottom: ${spacing.md};
`;

const PasswordStrengthContainer = styled(Box)`
  margin-top: ${spacing.xs};
  margin-bottom: ${spacing.md};
`;

const PasswordStrengthText = styled(Typography)`
  font-size: 0.75rem;
  display: flex;
  justify-content: space-between;
  margin-bottom: ${spacing.xs};
`;

const PasswordStrengthIndicator = styled(LinearProgress)<{ strengthcolor: string }>`
  height: 4px;
  border-radius: 2px;
  background-color: ${colors.neutralLight};
  
  & .MuiLinearProgress-bar {
    background-color: ${props => props.strengthcolor};
  }
`;

const FormActions = styled(Box)`
  margin-top: ${spacing.lg};
`;

const SuccessMessage = styled(Box)`
  margin-top: ${spacing.md};
  padding: ${spacing.md};
  background-color: ${colors.success}10;
  border-radius: 4px;
  text-align: center;
`;

const LoginLink = styled(Link)`
  color: ${colors.primary};
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorMessage = styled(Typography)`
  color: ${colors.error};
  margin-top: ${spacing.sm};
  font-size: 0.875rem;
`;

/**
 * A form component that allows users to reset their password by entering a new password and confirmation.
 * This component is part of the authentication flow in the Student Admissions Enrollment Platform,
 * providing the final step in the password recovery process after receiving a reset token.
 */
const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onLoginClick, redirectUrl }) => {
  // Get token from URL params
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const notifications = useNotification();
  
  // Form state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Check if token is present
  useEffect(() => {
    if (!token) {
      // If no token is provided, redirect to forgot password page
      navigate('/forgot-password');
    }
  }, [token, navigate]);
  
  // Create form with validation
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError
  } = useForm({
    initialValues: {
      email: '',
      password: '',
      password_confirmation: ''
    },
    validationSchema: {
      email: [required('Email is required')],
      password: [
        required('Password is required'),
        passwordComplexity('Password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters')
      ],
      password_confirmation: [
        required('Please confirm your password'),
        match('password', 'Passwords do not match')
      ]
    },
    onSubmit: handleResetPassword
  });
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Toggle confirm password visibility
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  // Handle password field changes and update strength indicator
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    setPasswordStrength(calculatePasswordStrength(e.target.value));
  };
  
  // Handle form submission
  async function handleResetPassword(formValues: ResetPasswordFormValues) {
    try {
      const authService = new AuthService();
      
      // Create reset password payload
      const resetData: ResetPasswordRequest = {
        email: formValues.email || 'user@example.com', // Email might be pre-filled or determined server-side
        token: token || '',
        password: formValues.password,
        password_confirmation: formValues.password_confirmation
      };
      
      // Call reset password API
      await authService.resetPassword(resetData);
      
      // Set success state
      setResetSuccess(true);
      
      // Redirect to login page or specified redirect URL after 3 seconds
      setTimeout(() => {
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          onLoginClick();
        }
      }, 3000);
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error.message || 'Failed to reset password. Please try again.';
      console.error('Password reset error:', errorMessage);
      
      // Set field errors if available
      if (error.details) {
        Object.entries(error.details).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            setFieldError(field, messages[0]);
          }
        });
      }
    }
  }
  
  // Get strength label based on score
  const getStrengthLabel = (score: number): string => {
    if (score < 30) return 'Weak';
    if (score < 60) return 'Medium';
    return 'Strong';
  };
  
  const strengthColor = getStrengthColor(passwordStrength);
  
  return (
    <FormContainer>
      <CardContent>
        <FormTitle variant="h5">Reset Your Password</FormTitle>
        
        {!resetSuccess ? (
          <>
            <FormInstructions variant="body2">
              Please create a new password for your account. The password must be at least 12 characters long and include a mix of uppercase, lowercase, numbers, and special characters.
            </FormInstructions>
            
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <TextField
                  id="password"
                  name="password"
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={handlePasswordChange}
                  onBlur={handleBlur}
                  error={touched.password && errors.password}
                  required
                  fullWidth
                  endAdornment={
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={togglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  }
                />
                
                {values.password && (
                  <PasswordStrengthContainer>
                    <PasswordStrengthText>
                      <span>Password strength:</span>
                      <span style={{ color: strengthColor }}>{getStrengthLabel(passwordStrength)}</span>
                    </PasswordStrengthText>
                    <PasswordStrengthIndicator 
                      variant="determinate" 
                      value={passwordStrength} 
                      strengthcolor={strengthColor}
                    />
                  </PasswordStrengthContainer>
                )}
                
                <TextField
                  id="password_confirmation"
                  name="password_confirmation"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={values.password_confirmation}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.password_confirmation && errors.password_confirmation}
                  required
                  fullWidth
                  endAdornment={
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={toggleConfirmPasswordVisibility}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  }
                />
              </FormGroup>
              
              <FormActions>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Reset Password
                </Button>
              </FormActions>
            </form>
            
            <Box mt={2} textAlign="center">
              <Typography variant="body2">
                Remember your password? <LoginLink to="/login" onClick={onLoginClick}>Back to Login</LoginLink>
              </Typography>
            </Box>
          </>
        ) : (
          <SuccessMessage>
            <Typography variant="h6" color="success" gutterBottom>
              Password Reset Successful!
            </Typography>
            <Typography variant="body2" paragraph>
              Your password has been reset successfully. You will be redirected to the login page in a few seconds.
            </Typography>
            <LoginLink to="/login" onClick={onLoginClick}>
              Back to Login
            </LoginLink>
          </SuccessMessage>
        )}
      </CardContent>
    </FormContainer>
  );
};

export default ResetPasswordForm;