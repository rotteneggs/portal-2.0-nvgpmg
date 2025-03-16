import React from 'react'; // react v18.x
import { render, screen, act } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { renderHook } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { AuthContext, AuthProvider, useAuthContext } from './AuthContext';
import useAuth from '../hooks/useAuth';
import { renderWithProviders } from '../utils/testUtils';
import { User } from '../types/auth';

// Mock the useAuth hook
jest.mock('../hooks/useAuth'); // Function to mock modules for testing

/**
 * Test suite for the AuthContext component
 */
describe('AuthContext', () => {
  // Mock implementation of the useAuth hook
  const mockUseAuth = { // Mock implementation of the useAuth hook
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null,
    requiresMfa: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    verifyMfaCode: jest.fn(),
  };

  // Setup function that runs before each test
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue(mockUseAuth); // Reset mock implementations
  });

  // Cleanup function that runs after each test
  afterEach(() => {
    jest.clearAllMocks(); // Restore all mocks to their original implementation
  });

  /**
   * Test that the context is created with default values
   */
  it('should create context with default values', () => {
    // Verify that AuthContext has default values
    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    // Assert that the context has the expected properties
    expect(result.error).toBeInstanceOf(Error);
  });

  /**
   * Test that the AuthProvider provides authentication state to children
   */
  it('should provide authentication state to children', async () => {
    // Mock useAuth to return test authentication state
    (useAuth as jest.Mock).mockReturnValue({
      ...mockUseAuth,
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' } as User,
    });

    // Create a test component that consumes the AuthContext
    const TestConsumer: React.FC = () => {
      const { isAuthenticated, user } = useAuthContext();
      return (
        <div>
          {isAuthenticated ? <div data-testid="authenticated">Authenticated</div> : <div data-testid="unauthenticated">Unauthenticated</div>}
          {user && <div data-testid="user-email">{user.email}</div>}
        </div>
      );
    };

    // Render the test component wrapped in AuthProvider
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Assert that the component receives the correct authentication state
    expect(screen.getByText('Authenticated')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  /**
   * Test that the AuthProvider provides authentication methods to children
   */
  it('should provide authentication methods to children', async () => {
    // Mock useAuth to return test authentication methods
    const loginMock = jest.fn();
    const logoutMock = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      ...mockUseAuth,
      login: loginMock,
      logout: logoutMock,
    });

    // Create a test component that calls the authentication methods
    const TestMethodCaller: React.FC = () => {
      const { login, logout } = useAuthContext();
      return (
        <div>
          <button data-testid="login-button" onClick={() => login({ email: 'test@example.com', password: 'password', remember: false })}>Login</button>
          <button data-testid="logout-button" onClick={logout}>Logout</button>
        </div>
      );
    };

    // Render the test component wrapped in AuthProvider
    render(
      <AuthProvider>
        <TestMethodCaller />
      </AuthProvider>
    );

    // Trigger the authentication methods in the component
    act(() => {
      screen.getByTestId('login-button').click();
      screen.getByTestId('logout-button').click();
    });

    // Assert that the mocked methods are called with correct parameters
    expect(loginMock).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password', remember: false });
    expect(logoutMock).toHaveBeenCalled();
  });

  /**
   * Test that useAuthContext throws an error when used outside of AuthProvider
   */
  it('should throw error when useAuthContext is used outside provider', () => {
    // Create a test component that uses useAuthContext outside of AuthProvider
    const OutsideProviderComponent: React.FC = () => {
      try {
        useAuthContext();
        return <div data-testid="success">Success</div>;
      } catch (error: any) {
        return <div data-testid="error">{error.message}</div>;
      }
    };

    // Render the component without wrapping it in AuthProvider
    render(<OutsideProviderComponent />);

    // Assert that an error is thrown with the expected message
    expect(screen.getByTestId('error')).toHaveTextContent('useAuthContext must be used within an AuthProvider');
  });

  /**
   * Test that the context updates when authentication state changes
   */
  it('should update context when authentication state changes', async () => {
    // Mock useAuth to initially return unauthenticated state
    (useAuth as jest.Mock).mockReturnValue({
      ...mockUseAuth,
      isAuthenticated: false,
      user: null,
    });

    // Create a test component that displays authentication state
    const TestConsumer: React.FC = () => {
      const { isAuthenticated, user } = useAuthContext();
      return (
        <div>
          {isAuthenticated ? <div data-testid="authenticated">Authenticated</div> : <div data-testid="unauthenticated">Unauthenticated</div>}
          {user && <div data-testid="user-email">{user.email}</div>}
        </div>
      );
    };

    // Render the test component wrapped in AuthProvider
    const { rerender } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Assert that the component shows unauthenticated state
    expect(screen.getByText('Unauthenticated')).toBeInTheDocument();

    // Update the mock to return authenticated state
    (useAuth as jest.Mock).mockReturnValue({
      ...mockUseAuth,
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' } as User,
    });

    // Re-render the component
    rerender(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Assert that the component now shows authenticated state
    await screen.findByText('Authenticated');
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});