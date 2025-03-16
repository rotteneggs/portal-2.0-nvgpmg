import React from 'react'; // react v18.2.0
import { render, screen, waitFor, act } from '@testing-library/react'; // @testing-library/react v14.0.0
import { LoginPage } from './LoginPage';
import { renderWithProviders } from '../../utils/testUtils';
import { AuthContext } from '../../contexts/AuthContext';

// Mock useNavigate and useLocation hooks for testing navigation and location state
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: jest.fn()
}));

// Mock AuthContext with default values and mock functions
jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: jest.fn()
}));

// Test suite for the LoginPage component
describe('LoginPage', () => {
  // Mock useNavigate hook
  const mockNavigate = jest.fn();
  
  // Mock useLocation hook
  const mockUseLocation = jest.fn();

  // Setup function to configure the component for testing
  const setup = (contextValue: any = {}) => {
    // Mock the useAuthContext hook with the provided context value
    (AuthContext.useAuthContext as jest.Mock).mockReturnValue({
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
    });

    // Mock the useNavigate hook
    (require('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Mock the useLocation hook
    (require('react-router-dom').useLocation as jest.Mock).mockReturnValue(mockUseLocation());

    // Render the LoginPage component with the renderWithProviders utility
    renderWithProviders(<LoginPage />);

    // Return the rendered component and mock functions for assertions
    return { mockNavigate, mockUseLocation };
  };

  // Clear mocks before each test
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseLocation.mockClear();
    (AuthContext.useAuthContext as jest.Mock).mockClear();
    jest.clearAllMocks();
  });

  // Test case: renders correctly
  it('renders correctly', () => {
    // Setup the component
    setup();

    // Assert that the "Sign In" title is present
    expect(screen.getByText('Sign In')).toBeInTheDocument();

    // Assert that the LoginForm component is rendered
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  // Test case: redirects authenticated users
  it('redirects authenticated users', () => {
    // Setup the component with isAuthenticated set to true
    setup({ isAuthenticated: true });

    // Assert that the navigate function was called with '/dashboard'
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  // Test case: handles redirect URL from location state
  it('handles redirect URL from location state', () => {
    // Mock useLocation to return state with redirectUrl
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: { redirectUrl: '/profile' },
      key: 'default'
    });

    // Setup the component
    setup();

    // Assert that LoginForm receives the correct redirectUrl prop
    expect(screen.getByTestId('login-form')).toHaveAttribute('redirecturl', '/profile');
  });

  // Test case: handles redirect URL from query parameters
  it('handles redirect URL from query parameters', () => {
    // Mock useLocation to return search string with redirect parameter
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '?redirect=/settings',
      hash: '',
      state: null,
      key: 'default'
    });

    // Setup the component
    setup();

    // Assert that LoginForm receives the correct redirectUrl prop
    expect(screen.getByTestId('login-form')).toHaveAttribute('redirecturl', '/settings');
  });

  // Test case: handles MFA requirement
  it('handles MFA requirement', async () => {
    // Setup the component
    setup();

    // Mock the onMfaRequired prop on LoginForm
    const onMfaRequired = jest.fn();
    (AuthContext.useAuthContext as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
      requiresMfa: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      verifyMfaCode: jest.fn(),
      onMfaRequired: onMfaRequired
    });

    // Render the LoginPage component
    renderWithProviders(<LoginPage />);

    // Simulate MFA requirement by calling onMfaRequired prop on LoginForm
    act(() => {
      onMfaRequired();
    });

    // Wait for the navigation to occur
    await waitFor(() => {
      // Assert that the navigate function was called with the MFA verification path
      expect(mockNavigate).toHaveBeenCalledWith('/mfa-verify');
    });
  });

  // Test case: uses default redirect
  it('uses default redirect', () => {
    // Mock useLocation to return empty state and search
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: null,
      key: 'default'
    });

    // Setup the component
    setup();

    // Assert that LoginForm receives '/dashboard' as redirectUrl prop
    expect(screen.getByTestId('login-form')).toHaveAttribute('redirecturl', '/dashboard');
  });

  // Test case: authentication state change
  it('authentication state change', async () => {
    // Create mock context with isAuthenticated initially false
    const contextValue = {
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
      requiresMfa: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      verifyMfaCode: jest.fn()
    };

    // Setup the component with mock context
    const { rerender } = renderWithProviders(<LoginPage />, {}, contextValue);

    // Update mock context to set isAuthenticated to true
    (AuthContext.useAuthContext as jest.Mock).mockReturnValue({
      ...contextValue,
      isAuthenticated: true
    });

    // Re-render component with updated context
    rerender(<LoginPage />);

    // Wait for the navigation to occur
    await waitFor(() => {
      // Assert that the navigate function was called with '/dashboard'
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});