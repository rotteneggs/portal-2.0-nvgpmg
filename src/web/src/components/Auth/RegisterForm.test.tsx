import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // @testing-library/react ^14.0.0

import RegisterForm from './RegisterForm';
import { renderWithProviders } from '../../utils/testUtils';
import { AuthContext } from '../../contexts/AuthContext';

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

// Mock useForm hook
jest.mock('../../hooks/useForm', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    values: {
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      password_confirmation: '',
      terms_accepted: false,
    },
    errors: {},
    touched: {},
    handleChange: jest.fn(),
    handleBlur: jest.fn(),
    handleSubmit: jest.fn(),
    isSubmitting: false,
    isValidating: false,
    isDirty: false,
    setFieldValue: jest.fn(),
    setFieldError: jest.fn(),
    setFieldTouched: jest.fn(),
    setValues: jest.fn(),
    setErrors: jest.fn(),
    setTouched: jest.fn(),
    resetForm: jest.fn(),
    validateField: jest.fn(),
    validateForm: jest.fn(),
  })),
}));

/**
 * Helper function to set up the component for testing
 * @param props Optional props to override default props
 * @param contextValue Optional context value to override default context
 * @returns Rendered component and utilities
 */
const setup = (props = {}, contextValue = {}) => {
  // Create default props with optional overrides
  const defaultProps = {
    onSuccess: jest.fn(),
    redirectUrl: '/login',
    ...props,
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
    ...contextValue,
  };

  (AuthContext.useAuthContext as jest.Mock).mockReturnValue(defaultContextValue);

  // Render RegisterForm with renderWithProviders and AuthContext.Provider
  const { ...utils } = renderWithProviders(<RegisterForm {...defaultProps} />);

  return {
    ...utils,
  };
};

describe('RegisterForm', () => {
  it('renders correctly', () => {
    // Render the RegisterForm component
    setup();

    // Verify email input is present
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();

    // Verify first name input is present
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();

    // Verify last name input is present
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();

    // Verify password input is present
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    // Verify password confirmation input is present
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();

    // Verify terms acceptance checkbox is present
    expect(screen.getByRole('checkbox', { name: /I agree to the Terms of Service/i })).toBeInTheDocument();

    // Verify register button is present
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();

    // Verify login link is present
    expect(screen.getByRole('link', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('form validation', async () => {
    // Render the RegisterForm component
    setup();

    // Click the register button without entering any data
    const registerButton = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(registerButton);

    // Verify email validation error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    });

    // Verify first name validation error is displayed
    expect(screen.getByText(/First name is required/i)).toBeInTheDocument();

    // Verify last name validation error is displayed
    expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();

    // Verify password validation error is displayed
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();

    // Verify password confirmation validation error is displayed
    expect(screen.getByText(/Please confirm your password/i)).toBeInTheDocument();

    // Verify terms acceptance validation error is displayed
    expect(screen.getByText(/You must accept the terms and conditions/i)).toBeInTheDocument();
  });

  it('email validation', async () => {
    // Render the RegisterForm component
    setup();

    // Enter an invalid email format
    const emailInput = screen.getByLabelText(/Email Address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    // Blur the email field
    fireEvent.blur(emailInput);

    // Verify email format validation error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('password complexity', async () => {
    // Render the RegisterForm component
    setup();

    // Enter a simple password
    const passwordInput = screen.getByLabelText(/Password/i);
    fireEvent.change(passwordInput, { target: { value: 'simple' } });

    // Blur the password field
    fireEvent.blur(passwordInput);

    // Verify password complexity validation error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters/i)).toBeInTheDocument();
    });
  });

  it('password confirmation', async () => {
    // Render the RegisterForm component
    setup();

    // Enter a valid password
    const passwordInput = screen.getByLabelText(/Password/i);
    fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });

    // Enter a different password in the confirmation field
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword' } });

    // Blur the confirmation field
    fireEvent.blur(confirmPasswordInput);

    // Verify password match validation error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('password visibility toggle', () => {
    // Render the RegisterForm component
    setup();

    // Verify password field type is 'password'
    const passwordInput = screen.getByLabelText(/Password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the visibility toggle icon
    const visibilityToggle = screen.getByRole('button', { name: /Show password/i });
    fireEvent.click(visibilityToggle);

    // Verify password field type is changed to 'text'
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Click the visibility toggle icon again
    fireEvent.click(visibilityToggle);

    // Verify password field type is changed back to 'password'
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('confirm password visibility toggle', () => {
    // Render the RegisterForm component
    setup();

    // Verify confirm password field type is 'password'
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // Click the confirm password visibility toggle icon
    const visibilityToggle = screen.getAllByRole('button', { name: /Show password/i })[1];
    fireEvent.click(visibilityToggle);

    // Verify confirm password field type is changed to 'text'
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');

    // Click the visibility toggle icon again
    fireEvent.click(visibilityToggle);

    // Verify confirm password field type is changed back to 'password'
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  it('password strength indicator', () => {
    // Render the RegisterForm component
    setup();

    // Enter a weak password
    const passwordInput = screen.getByLabelText(/Password/i);
    fireEvent.change(passwordInput, { target: { value: 'weak' } });

    // Verify strength indicator shows weak strength
    expect(screen.getByText(/Password strength: Weak/i)).toBeInTheDocument();

    // Enter a medium strength password
    fireEvent.change(passwordInput, { target: { value: 'MediumPass1' } });

    // Verify strength indicator shows medium strength
    expect(screen.getByText(/Password strength: Medium/i)).toBeInTheDocument();

    // Enter a strong password
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });

    // Verify strength indicator shows strong strength
    expect(screen.getByText(/Password strength: Strong/i)).toBeInTheDocument();
  });

  it('form submission', async () => {
    // Create mock register function
    const registerMock = jest.fn().mockResolvedValue({});

    // Render the RegisterForm with mock context
    setup({}, { register: registerMock });

    // Fill in all required fields with valid data
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms of Service/i }));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    // Verify register function was called with correct values
    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        password: 'ValidPassword123!',
        password_confirmation: 'ValidPassword123!',
      });
    });
  });

  it('loading state', async () => {
    // Create mock register function that doesn't resolve immediately
    const registerMock = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    // Render the RegisterForm with mock context
    setup({}, { register: registerMock, loading: true });

    // Fill in all required fields with valid data
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms of Service/i }));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    // Verify loading indicator is displayed
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeDisabled();

    // Verify form is disabled during submission
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeDisabled();
  });

  it('authentication error', () => {
    // Create mock context with authentication error
    setup({}, { error: 'Authentication failed' });

    // Verify error message is displayed
    expect(screen.getByText(/Authentication failed/i)).toBeInTheDocument();
  });

  it('successful registration', async () => {
    // Create mock onSuccess callback
    const onSuccessMock = jest.fn();

    // Create mock register function that resolves successfully
    const registerMock = jest.fn().mockResolvedValue({});

    // Render the RegisterForm with mock context and callback
    setup({ onSuccess: onSuccessMock }, { register: registerMock });

    // Fill in all required fields with valid data
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms of Service/i }));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    // Verify onSuccess callback is called after successful registration
    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  it('redirect handling', async () => {
    // Create mock register function
    const registerMock = jest.fn().mockResolvedValue({});

    // Render the RegisterForm with redirectUrl prop
    setup({ redirectUrl: '/custom-redirect' }, { register: registerMock });

    // Fill in all required fields with valid data
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms of Service/i }));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    // Verify register function receives redirectUrl in options
    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        redirectUrl: '/custom-redirect'
      }));
    });
  });
});