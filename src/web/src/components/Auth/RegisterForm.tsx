import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { IconButton, LinearProgress } from '@mui/material';

import TextField from '../Common/TextField';
import Button from '../Common/Button';
import Checkbox from '../Common/Checkbox';
import useForm from '../../hooks/useForm';
import { useAuthContext } from '../../contexts/AuthContext';
import { RegisterRequest } from '../../types/auth';
import { email, required, passwordComplexity, match } from '../../utils/validationUtils';
import { colors, spacing } from '../../styles/variables';

// Props for the RegisterForm component
interface RegisterFormProps {
  onSuccess: () => void;
  redirectUrl?: string;
}

// Form values for the registration form
interface RegisterFormValues {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
  terms_accepted: boolean;
}

// Styled components
const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
  padding: ${spacing.lg};
`;

const FormTitle = styled.h2`
  text-align: center;
  margin-bottom: ${spacing.lg};
  color: ${colors.neutralDark};
  font-weight: 500;
`;

const FormGroup = styled.div`
  margin-bottom: ${spacing.md};
`;

const PasswordStrengthContainer = styled.div`
  margin-top: ${spacing.xs};
  margin-bottom: ${spacing.xs};
`;

const PasswordStrengthText = styled.div<{ color: string }>`
  font-size: 12px;
  margin-bottom: ${spacing.xs};
  color: ${props => props.color};
  display: flex;
  justify-content: space-between;
`;

const FormActions = styled.div`
  margin-top: ${spacing.lg};
`;

const FormLinks = styled.div`
  text-align: center;
  margin-top: ${spacing.md};
  font-size: 14px;
  
  a {
    color: ${colors.primary};
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorMessage = styled.div`
  color: ${colors.error};
  margin-top: ${spacing.md};
  padding: ${spacing.sm};
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
`;

/**
 * Calculate password strength score based on complexity
 * @param password Password string to evaluate
 * @returns Strength score between 0 and 100
 */
const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0;
  
  let score = 0;
  
  // Length contribution (up to 40 points)
  score += Math.min(password.length * 4, 40);
  
  // Character variety contribution
  if (/[a-z]/.test(password)) score += 10; // lowercase
  if (/[A-Z]/.test(password)) score += 10; // uppercase
  if (/[0-9]/.test(password)) score += 10; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 15; // special characters
  
  // Variety of character types (up to 15 points)
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars * 2, 15);
  
  // Cap the score at 100
  return Math.min(score, 100);
};

/**
 * Get color for password strength indicator based on score
 * @param score Strength score (0-100)
 * @returns CSS color value
 */
const getStrengthColor = (score: number): string => {
  if (score < 30) return colors.error; // weak
  if (score < 60) return colors.warning; // medium
  return colors.success; // strong
};

/**
 * A form component that handles user registration in the Student Admissions Enrollment Platform.
 * Provides comprehensive registration form with validation and password strength indicator.
 */
const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, redirectUrl = "/login" }) => {
  // State for password visibility and strength
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // Get auth context for registration
  const { register, error: authError, loading } = useAuthContext();
  
  // Initial form values
  const initialValues: RegisterFormValues = {
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirmation: '',
    terms_accepted: false
  };
  
  // Form validation schema
  const validationSchema = {
    email: [
      required('Email is required'),
      email('Please enter a valid email address')
    ],
    first_name: [
      required('First name is required')
    ],
    last_name: [
      required('Last name is required')
    ],
    password: [
      required('Password is required'),
      passwordComplexity('Password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters')
    ],
    password_confirmation: [
      required('Please confirm your password'),
      match('password', 'Passwords do not match')
    ],
    terms_accepted: [
      required('You must accept the terms and conditions')
    ]
  };
  
  // Initialize form with our custom hook
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting
  } = useForm({
    initialValues,
    validationSchema,
    onSubmit: async (formValues) => {
      try {
        // Create registration payload
        const registerData: RegisterRequest = {
          email: formValues.email,
          first_name: formValues.first_name,
          last_name: formValues.last_name,
          password: formValues.password,
          password_confirmation: formValues.password_confirmation
        };
        
        // Call register function from auth context
        await register(registerData);
        
        // If successful, call onSuccess callback
        onSuccess();
      } catch (error) {
        // Error handling is managed by the auth context
        console.error('Registration failed:', error);
      }
    }
  });
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };
  
  // Toggle confirm password visibility
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };
  
  // Handle password change and update strength indicator
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    setPasswordStrength(calculatePasswordStrength(e.target.value));
  };
  
  // Get password strength label and color
  const strengthColor = getStrengthColor(passwordStrength);
  const strengthLabel = passwordStrength < 30 ? 'Weak' : passwordStrength < 60 ? 'Medium' : 'Strong';
  
  return (
    <FormContainer onSubmit={handleSubmit}>
      <FormTitle>Create Your Account</FormTitle>
      
      <FormGroup>
        <TextField
          id="email"
          name="email"
          label="Email Address"
          value={values.email}
          type="email"
          error={touched.email ? errors.email : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
          fullWidth
          required
          autoComplete="email"
        />
      </FormGroup>
      
      <FormGroup>
        <TextField
          id="first_name"
          name="first_name"
          label="First Name"
          value={values.first_name}
          error={touched.first_name ? errors.first_name : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
          fullWidth
          required
          autoComplete="given-name"
        />
      </FormGroup>
      
      <FormGroup>
        <TextField
          id="last_name"
          name="last_name"
          label="Last Name"
          value={values.last_name}
          error={touched.last_name ? errors.last_name : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
          fullWidth
          required
          autoComplete="family-name"
        />
      </FormGroup>
      
      <FormGroup>
        <TextField
          id="password"
          name="password"
          label="Password"
          value={values.password}
          type={showPassword ? 'text' : 'password'}
          error={touched.password ? errors.password : undefined}
          onChange={handlePasswordChange}
          onBlur={handleBlur}
          fullWidth
          required
          autoComplete="new-password"
          endAdornment={
            <IconButton 
              onClick={togglePasswordVisibility}
              edge="end"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              size="small"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          }
          helperText="Must be at least 12 characters with letters, numbers, and special characters."
        />
        
        {values.password && (
          <PasswordStrengthContainer>
            <PasswordStrengthText color={strengthColor}>
              <span>Password strength:</span> <span>{strengthLabel}</span>
            </PasswordStrengthText>
            <LinearProgress
              variant="determinate"
              value={passwordStrength}
              sx={{ 
                height: 4, 
                borderRadius: 2,
                backgroundColor: 'rgba(0,0,0,0.1)', 
                '& .MuiLinearProgress-bar': { 
                  backgroundColor: strengthColor 
                } 
              }}
            />
          </PasswordStrengthContainer>
        )}
      </FormGroup>
      
      <FormGroup>
        <TextField
          id="password_confirmation"
          name="password_confirmation"
          label="Confirm Password"
          value={values.password_confirmation}
          type={showConfirmPassword ? 'text' : 'password'}
          error={touched.password_confirmation ? errors.password_confirmation : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
          fullWidth
          required
          autoComplete="new-password"
          endAdornment={
            <IconButton 
              onClick={toggleConfirmPasswordVisibility}
              edge="end"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              size="small"
            >
              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          }
        />
      </FormGroup>
      
      <FormGroup>
        <Checkbox
          id="terms_accepted"
          name="terms_accepted"
          label={<>I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link></>}
          checked={values.terms_accepted}
          error={touched.terms_accepted && !!errors.terms_accepted}
          errorMessage={touched.terms_accepted ? errors.terms_accepted : undefined}
          onChange={handleChange}
        />
      </FormGroup>
      
      {authError && (
        <ErrorMessage role="alert">
          {authError}
        </ErrorMessage>
      )}
      
      <FormActions>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          loading={isSubmitting || loading}
          disabled={isSubmitting || loading}
        >
          Create Account
        </Button>
      </FormActions>
      
      <FormLinks>
        Already have an account? <Link to={redirectUrl}>Sign In</Link>
      </FormLinks>
    </FormContainer>
  );
};

export default RegisterForm;