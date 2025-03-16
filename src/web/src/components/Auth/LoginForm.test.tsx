import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // @testing-library/react ^14.0.0
import LoginForm from './LoginForm';
import { renderWithProviders } from '../../utils/testUtils';
import { AuthContext } from '../../contexts/AuthContext';

// Mock the AuthContext module
jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: jest.fn()
}));

// Mock the useForm hook to control form state and validation in tests
jest.mock('../../hooks/useForm', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    values: { email: '', password: '', remember: false },
    errors: {},
    touched: {},
    isSubmitting: false,
    isValidating: false,
    isDirty: false,
    handleChange: jest.fn(),
    handleBlur: jest.fn(),
    handleSubmit: jest.fn(),
    setFieldValue: jest.fn(),
    setFieldError: jest.fn(),
    setFieldTouched: jest.fn(),
    setValues: jest.fn(),
    setErrors: jest.fn(),
    setTouched: jest.fn(),
    resetForm: jest.fn(),
    validateField: jest.fn(),
    validateForm: jest.fn()
  }))
}));

// Helper function to set up the component for testing
const setup = (props = {}, contextValue = {}) => {
  // Create default props with optional overrides
  const defaultProps = {
    onMfaRequired: jest.fn(),
    redirectUrl: '/dashboard',
    ...props
  };

  // Create default context value with optional overrides
  const defaultContextValue = {
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null,
    requiresMfa: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    verifyMfaCode: jest.fn(),
    ...contextValue
  };

  // Mock the useAuthContext hook to return the default context value
  (AuthContext.useAuthContext as jest.Mock).mockReturnValue(defaultContextValue);

  // Render LoginForm with renderWithProviders and AuthContext.Provider
  const renderResult = renderWithProviders(<LoginForm {...defaultProps} />);

  // Return rendered component and utilities
  return {
    ...renderResult,
    props: defaultProps,
    contextValue: defaultContextValue
  };
};

describe('LoginForm', () => {
  it('renders correctly', () => {
    // Render the LoginForm component
    const { getByLabelText, getByRole } = setup();

    // Verify email input is present
    expect(getByLabelText('Email Address')).toBeInTheDocument();

    // Verify password input is present
    expect(getByLabelText('Password')).toBeInTheDocument();

    // Verify remember me checkbox is present
    expect(getByLabelText('Remember me')).toBeInTheDocument();

    // Verify login button is present
    expect(getByRole('button', { name: 'Sign In' })).toBeInTheDocument();

    // Verify forgot password link is present
    expect(getByRole('link', { name: 'Forgot Password?' })).toBeInTheDocument();

    // Verify register link is present
    expect(getByRole('link', { name: 'Register now' })).toBeInTheDocument();
  });

  it('form validation', () => {
    // Render the LoginForm component
    const { getByRole, getByText } = setup();

    // Click the login button without entering any data
    fireEvent.click(getByRole('button', { name: 'Sign In' }));

    // Verify email validation error is displayed
    expect(getByText('Email is required')).toBeInTheDocument();

    // Verify password validation error is displayed
    expect(getByText('Password is required')).toBeInTheDocument();
  });

  it('email validation', () => {
    // Render the LoginForm component
    const { getByLabelText, getByText } = setup();

    // Enter an invalid email format
    const emailInput = getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    // Blur the email field
    fireEvent.blur(emailInput);

    // Verify email format validation error is displayed
    expect(getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  it('password visibility toggle', () => {
    // Render the LoginForm component
    const { getByLabelText, getByRole } = setup();

    // Verify password field type is 'password'
    const passwordInput = getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the visibility toggle icon
    const toggleButton = getByRole('button', { name: 'Show password' });
    fireEvent.click(toggleButton);

    // Verify password field type is changed to 'text'
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Click the visibility toggle icon again
    fireEvent.click(getByRole('button', { name: 'Hide password' }));

    // Verify password field type is changed back to 'password'
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('form submission', async () => {
    // Create mock login function
    const loginMock = jest.fn().mockResolvedValue({ id: 1, email: 'test@example.com' });

    // Render the LoginForm with mock context
    const { getByLabelText, getByRole } = setup({}, { login: loginMock });

    // Enter valid email and password
    fireEvent.change(getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'password123' } });

    // Check the remember me checkbox
    fireEvent.click(getByLabelText('Remember me'));

    // Submit the form
    fireEvent.click(getByRole('button', { name: 'Sign In' }));

    // Verify login function was called with correct values
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        remember: true
      });
    });
  });

  it('loading state', () => {
    // Create mock login function that doesn't resolve immediately
    const loginMock = jest.fn(() => new Promise(resolve => setTimeout(() => resolve({ id: 1, email: 'test@example.com' }), 100)));

    // Render the LoginForm with mock context
    const { getByRole } = setup({}, { login: loginMock, loading: true });

    // Enter valid credentials
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

    // Submit the form
    fireEvent.click(getByRole('button', { name: 'Sign In' }));

    // Verify loading indicator is displayed
    expect(getByRole('button', { name: 'Sign In' })).toBeDisabled();
  });

  it('authentication error', () => {
    // Create mock context with authentication error
    const { getByText } = setup({}, { error: 'Invalid credentials' });

    // Verify error message is displayed
    expect(getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('MFA handling', () => {
    // Create mock onMfaRequired callback
    const onMfaRequiredMock = jest.fn();

    // Create mock context with requiresMfa flag
    const { contextValue } = setup({ onMfaRequired: onMfaRequiredMock }, { requiresMfa: true });

    // Verify onMfaRequired callback is called when requiresMfa becomes true
    expect(onMfaRequiredMock).toHaveBeenCalled();
  });

  it('redirect handling', async () => {
    // Create mock login function
    const loginMock = jest.fn().mockResolvedValue({ id: 1, email: 'test@example.com' });

    // Render the LoginForm with redirectUrl prop
    const { getByLabelText, getByRole, props } = setup({ redirectUrl: '/dashboard' }, { login: loginMock });

    // Enter valid credentials
    fireEvent.change(getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'password123' } });

    // Submit the form with valid credentials
    fireEvent.click(getByRole('button', { name: 'Sign In' }));

    // Verify login function receives redirectUrl in options
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          password: 'password123',
          remember: false
        },
        { redirectUrl: '/dashboard' }
      );
    });
  });
});