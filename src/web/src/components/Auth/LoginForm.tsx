import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { IconButton } from '@mui/material';

import TextField from '../Common/TextField';
import Button from '../Common/Button';
import Checkbox from '../Common/Checkbox';
import useForm from '../../hooks/useForm';
import { useAuthContext } from '../../contexts/AuthContext';
import { LoginRequest } from '../../types/auth';
import { email, required } from '../../utils/validationUtils';
import { colors, spacing, typography, borderRadius, shadows } from '../../styles/variables';
import { flexColumn, fadeIn } from '../../styles/mixins';
import { mediaQueries } from '../../styles/breakpoints';

interface LoginFormProps {
  onMfaRequired?: () => void;
  redirectUrl?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onMfaRequired, redirectUrl }) => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, error: authError, loading, requiresMfa } = useAuthContext();

  // Form validation schema
  const validationSchema = {
    email: [required('Email is required'), email('Please enter a valid email address')],
    password: [required('Password is required')]
  };

  // Initialize form with useForm hook
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldError
  } = useForm({
    initialValues: {
      email: '',
      password: '',
      remember: false
    },
    validationSchema,
    onSubmit: handleLogin
  });

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState);
  };

  // Handle MFA requirement change
  useEffect(() => {
    if (requiresMfa && onMfaRequired) {
      onMfaRequired();
    }
  }, [requiresMfa, onMfaRequired]);

  // Login form submission handler
  async function handleLogin(formValues: LoginRequest) {
    try {
      await login(formValues);
      // If MFA is not required, the auth context will handle the redirect
    } catch (error) {
      // Error will be handled by the auth context and displayed in the form
    }
  }

  return (
    <FormContainer onSubmit={handleSubmit} aria-labelledby="login-title" noValidate>
      <FormTitle id="login-title">Sign In</FormTitle>

      {authError && (
        <ErrorMessage role="alert" aria-live="assertive">
          {authError}
        </ErrorMessage>
      )}

      <FormGroup>
        <TextField
          id="email"
          name="email"
          label="Email Address"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.email ? errors.email : undefined}
          placeholder="Enter your email"
          autoComplete="email"
          fullWidth
          autoFocus
          required
          type="email"
          inputProps={{
            'aria-required': 'true',
            'aria-invalid': Boolean(touched.email && errors.email),
            'aria-describedby': touched.email && errors.email ? 'email-error' : undefined
          }}
        />
      </FormGroup>

      <FormGroup>
        <TextField
          id="password"
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.password ? errors.password : undefined}
          placeholder="Enter your password"
          autoComplete="current-password"
          fullWidth
          required
          inputProps={{
            'aria-required': 'true',
            'aria-invalid': Boolean(touched.password && errors.password),
            'aria-describedby': touched.password && errors.password ? 'password-error' : undefined
          }}
          endAdornment={
            <IconButton
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={togglePasswordVisibility}
              edge="end"
              size="small"
              tabIndex={-1} // Don't include in tab order, accessible via password field
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          }
        />
      </FormGroup>

      <RememberMeContainer>
        <Checkbox
          id="remember"
          name="remember"
          label="Remember me"
          checked={values.remember}
          onChange={handleChange}
        />
        <ForgotPasswordLink to="/forgot-password">
          Forgot Password?
        </ForgotPasswordLink>
      </RememberMeContainer>

      <FormActions>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          loading={isSubmitting || loading}
          disabled={isSubmitting || loading}
          ariaLabel="Sign in to your account"
        >
          Sign In
        </Button>
      </FormActions>

      <RegisterLinkContainer>
        Don't have an account?{' '}
        <RegisterLink to="/register">Register now</RegisterLink>
      </RegisterLinkContainer>
    </FormContainer>
  );
};

// Styled components
const FormContainer = styled.form`
  ${flexColumn};
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: ${spacing.lg};
  background-color: ${colors.white};
  border-radius: ${borderRadius.md};
  box-shadow: ${shadows.sm};
  animation: ${fadeIn} 0.5s ease-in-out;
  
  ${mediaQueries.smDown} {
    max-width: 100%;
    padding: ${spacing.md};
    box-shadow: none;
  }
`;

const FormTitle = styled.h2`
  margin: 0 0 ${spacing.lg};
  font-size: ${typography.fontSizes.h2};
  font-weight: ${typography.fontWeights.medium};
  text-align: center;
  color: ${colors.neutralDark};
`;

const FormGroup = styled.div`
  margin-bottom: ${spacing.md};
`;

const RememberMeContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: ${spacing.sm};
  
  ${mediaQueries.smDown} {
    flex-direction: column;
    align-items: flex-start;
    gap: ${spacing.sm};
  }
`;

const FormActions = styled.div`
  margin-top: ${spacing.md};
`;

const ForgotPasswordLink = styled(Link)`
  color: ${colors.primary};
  text-decoration: none;
  font-size: ${typography.fontSizes.body2};
  transition: color 0.3s ease;
  
  &:hover {
    color: ${colors.primaryDark};
    text-decoration: underline;
  }
  
  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`;

const RegisterLinkContainer = styled.div`
  margin-top: ${spacing.lg};
  text-align: center;
  font-size: ${typography.fontSizes.body2};
  color: ${colors.neutralDark};
`;

const RegisterLink = styled(Link)`
  color: ${colors.primary};
  text-decoration: none;
  font-weight: ${typography.fontWeights.medium};
  transition: color 0.3s ease;
  
  &:hover {
    color: ${colors.primaryDark};
    text-decoration: underline;
  }
  
  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`;

const ErrorMessage = styled.div`
  margin-bottom: ${spacing.md};
  padding: ${spacing.sm} ${spacing.md};
  background-color: #FEE8E7;
  color: ${colors.error};
  border-radius: ${borderRadius.sm};
  font-size: ${typography.fontSizes.body2};
  border-left: 3px solid ${colors.error};
`;

export default LoginForm;