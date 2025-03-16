import { renderHook, act } from '@testing-library/react'; // @testing-library/react-hooks v8.0.1, @testing-library/react v14.0.0
import { waitFor } from '@testing-library/react'; // @testing-library/react v14.0.0
import useAuth from './useAuth';
import AuthService from '../services/AuthService';
import { getToken } from '../utils/storageUtils';
import { User, LoginRequest, RegisterRequest, MfaVerifyRequest } from '../types/auth';

// Mock AuthService and storage utilities
jest.mock('../services/AuthService');
jest.mock('../utils/storageUtils');

describe('useAuth', () => {
  beforeEach(() => {
    // Clear all mocks to ensure clean test environment
    (AuthService as jest.Mock).mockClear();
    (getToken as jest.Mock).mockClear();
  });

  afterEach(() => {
    // Restore all mocks to their original implementation
    jest.restoreAllMocks();
  });

  it('should initialize with loading state', () => {
    // Mock getToken to return null (no token)
    (getToken as jest.Mock).mockReturnValue(null);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Assert that loading is initially true
    expect(result.current.loading).toBe(true);

    // Assert that user is null
    expect(result.current.user).toBeNull();

    // Assert that isAuthenticated is false
    expect(result.current.isAuthenticated).toBe(false);

    // Assert that error is null
    expect(result.current.error).toBeNull();

    // Assert that requiresMfa is false
    expect(result.current.requiresMfa).toBe(false);
  });

  it('should load user data when token exists', async () => {
    // Mock getToken to return a valid token
    (getToken as jest.Mock).mockReturnValue('test-token');

    // Mock getCurrentUser to return user data
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      email_verified_at: null,
      is_active: true,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      last_login_at: null,
      has_mfa_enabled: false,
      roles: [],
      profile: null,
      full_name: 'Test User'
    };
    (AuthService.prototype.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Wait for the hook to finish loading
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that user contains the expected data
    expect(result.current.user).toEqual(mockUser);

    // Assert that isAuthenticated is true
    expect(result.current.isAuthenticated).toBe(true);

    // Assert that error is null
    expect(result.current.error).toBeNull();
  });

  it('should handle login successfully', async () => {
    // Mock login to return a successful response with user data
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      email_verified_at: null,
      is_active: true,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      last_login_at: null,
      has_mfa_enabled: false,
      roles: [],
      profile: null,
      full_name: 'Test User'
    };
    (AuthService.prototype.login as jest.Mock).mockResolvedValue(mockUser);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the login method with test credentials
    const credentials: LoginRequest = { email: 'test@example.com', password: 'password', remember: false };
    await act(async () => {
      await result.current.login(credentials);
    });

    // Assert that login was called with correct credentials
    expect(AuthService.prototype.login).toHaveBeenCalledWith(credentials);

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that user contains the expected data
    expect(result.current.user).toEqual(mockUser);

    // Assert that isAuthenticated is true
    expect(result.current.isAuthenticated).toBe(true);

    // Assert that error is null
    expect(result.current.error).toBeNull();
  });

  it('should handle login with MFA requirement', async () => {
    // Mock login to throw an error with requiresMfa flag
    const mockError = new Error('MFA required');
    (AuthService.prototype.login as jest.Mock).mockImplementation(() => {
      const error: any = new Error('MFA required');
      error.requiresMfa = true;
      error.mfaMethods = ['totp', 'sms'];
      throw error;
    });

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the login method with test credentials
    const credentials: LoginRequest = { email: 'test@example.com', password: 'password', remember: false };
    await act(async () => {
      try {
        await result.current.login(credentials);
      } catch (e) {
        // Ignore the error, we are testing the state change
      }
    });

    // Assert that login was called with correct credentials
    expect(AuthService.prototype.login).toHaveBeenCalledWith(credentials);

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that requiresMfa is true
    expect(result.current.requiresMfa).toBe(true);

    // Assert that isAuthenticated is false
    expect(result.current.isAuthenticated).toBe(false);

    // Assert that error is null
    expect(result.current.error).toBeNull();
  });

  it('should handle login failure', async () => {
    // Mock login to throw an error
    (AuthService.prototype.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the login method with test credentials
    const credentials: LoginRequest = { email: 'test@example.com', password: 'password', remember: false };
    await act(async () => {
      try {
        await result.current.login(credentials);
      } catch (e) {
        // Ignore the error, we are testing the state change
      }
    });

    // Assert that login was called with correct credentials
    expect(AuthService.prototype.login).toHaveBeenCalledWith(credentials);

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that user is null
    expect(result.current.user).toBeNull();

    // Assert that isAuthenticated is false
    expect(result.current.isAuthenticated).toBe(false);

    // Assert that error contains the expected error message
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('should handle registration successfully', async () => {
    // Mock register to return a successful response with user data
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      email_verified_at: null,
      is_active: true,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      last_login_at: null,
      has_mfa_enabled: false,
      roles: [],
      profile: null,
      full_name: 'Test User'
    };
    (AuthService.prototype.register as jest.Mock).mockResolvedValue(mockUser);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the register method with test user data
    const userData: RegisterRequest = {
      email: 'test@example.com',
      password: 'password',
      password_confirmation: 'password',
      first_name: 'Test',
      last_name: 'User'
    };
    await act(async () => {
      await result.current.register(userData);
    });

    // Assert that register was called with correct user data
    expect(AuthService.prototype.register).toHaveBeenCalledWith(userData);

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that user contains the expected data
    expect(result.current.user).toEqual(mockUser);

    // Assert that isAuthenticated is true
    expect(result.current.isAuthenticated).toBe(true);

    // Assert that error is null
    expect(result.current.error).toBeNull();
  });

  it('should handle registration failure', async () => {
    // Mock register to throw an error
    (AuthService.prototype.register as jest.Mock).mockRejectedValue(new Error('Registration failed'));

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the register method with test user data
    const userData: RegisterRequest = {
      email: 'test@example.com',
      password: 'password',
      password_confirmation: 'password',
      first_name: 'Test',
      last_name: 'User'
    };
    await act(async () => {
      try {
        await result.current.register(userData);
      } catch (e) {
        // Ignore the error, we are testing the state change
      }
    });

    // Assert that register was called with correct user data
    expect(AuthService.prototype.register).toHaveBeenCalledWith(userData);

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that user is null
    expect(result.current.user).toBeNull();

    // Assert that isAuthenticated is false
    expect(result.current.isAuthenticated).toBe(false);

    // Assert that error contains the expected error message
    expect(result.current.error).toBe('Registration failed');
  });

  it('should handle logout successfully', async () => {
    // Mock logout to return a successful response
    (AuthService.prototype.logout as jest.Mock).mockResolvedValue(undefined);

    // Render the useAuth hook with initial authenticated state
    const { result } = renderHook(() => useAuth(), {
      initialProps: {
        isAuthenticated: true,
        user: {
          id: 1,
          email: 'test@example.com',
          email_verified_at: null,
          is_active: true,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          last_login_at: null,
          has_mfa_enabled: false,
          roles: [],
          profile: null,
          full_name: 'Test User'
        },
        loading: false,
        error: null,
        requiresMfa: false,
        mfaMethods: []
      }
    });

    // Call the logout method
    await act(async () => {
      await result.current.logout();
    });

    // Assert that logout was called
    expect(AuthService.prototype.logout).toHaveBeenCalled();

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that user is null
    expect(result.current.user).toBeNull();

    // Assert that isAuthenticated is false
    expect(result.current.isAuthenticated).toBe(false);

    // Assert that error is null
    expect(result.current.error).toBeNull();
  });

  it('should handle logout failure', async () => {
    // Mock logout to throw an error
    (AuthService.prototype.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));

    // Render the useAuth hook with initial authenticated state
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      email_verified_at: null,
      is_active: true,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      last_login_at: null,
      has_mfa_enabled: false,
      roles: [],
      profile: null,
      full_name: 'Test User'
    };
    const { result } = renderHook(() => useAuth(), {
      initialProps: {
        isAuthenticated: true,
        user: mockUser,
        loading: false,
        error: null,
        requiresMfa: false,
        mfaMethods: []
      }
    });

    // Call the logout method
    await act(async () => {
      try {
        await result.current.logout();
      } catch (e) {
        // Ignore the error, we are testing the state change
      }
    });

    // Assert that logout was called
    expect(AuthService.prototype.logout).toHaveBeenCalled();

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that error contains the expected error message
    expect(result.current.error).toBe('Logout failed');

    // Assert that user and isAuthenticated remain unchanged
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle MFA verification successfully', async () => {
    // Mock verifyMfa to return a successful response with user data
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      email_verified_at: null,
      is_active: true,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      last_login_at: null,
      has_mfa_enabled: true,
      roles: [],
      profile: null,
      full_name: 'Test User'
    };
    (AuthService.prototype.verifyMfa as jest.Mock).mockResolvedValue(mockUser);

    // Render the useAuth hook with requiresMfa set to true
    const { result } = renderHook(() => useAuth(), {
      initialProps: {
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
        requiresMfa: true,
        mfaMethods: ['totp']
      }
    });

    // Call the verifyMfaCode method with test verification data
    const verificationData: MfaVerifyRequest = { email: 'test@example.com', method: 'totp', code: '123456' };
    await act(async () => {
      await result.current.verifyMfaCode(verificationData);
    });

    // Assert that verifyMfa was called with correct verification data
    expect(AuthService.prototype.verifyMfa).toHaveBeenCalledWith(verificationData);

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that user contains the expected data
    expect(result.current.user).toEqual(mockUser);

    // Assert that isAuthenticated is true
    expect(result.current.isAuthenticated).toBe(true);

    // Assert that requiresMfa is false
    expect(result.current.requiresMfa).toBe(false);

    // Assert that error is null
    expect(result.current.error).toBeNull();
  });

  it('should handle MFA verification failure', async () => {
    // Mock verifyMfa to throw an error
    (AuthService.prototype.verifyMfa as jest.Mock).mockRejectedValue(new Error('Invalid MFA code'));

    // Render the useAuth hook with requiresMfa set to true
    const { result } = renderHook(() => useAuth(), {
      initialProps: {
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
        requiresMfa: true,
        mfaMethods: ['totp']
      }
    });

    // Call the verifyMfaCode method with test verification data
    const verificationData: MfaVerifyRequest = { email: 'test@example.com', method: 'totp', code: '123456' };
    await act(async () => {
      try {
        await result.current.verifyMfaCode(verificationData);
      } catch (e) {
        // Ignore the error, we are testing the state change
      }
    });

    // Assert that verifyMfa was called with correct verification data
    expect(AuthService.prototype.verifyMfa).toHaveBeenCalledWith(verificationData);

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that user is null
    expect(result.current.user).toBeNull();

    // Assert that isAuthenticated is false
    expect(result.current.isAuthenticated).toBe(false);

    // Assert that requiresMfa remains true
    expect(result.current.requiresMfa).toBe(true);

    // Assert that error contains the expected error message
    expect(result.current.error).toBe('Invalid MFA code');
  });

  it('should handle getCurrentUser failure', async () => {
    // Mock getToken to return a valid token
    (getToken as jest.Mock).mockReturnValue('test-token');

    // Mock getCurrentUser to throw an error
    (AuthService.prototype.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Failed to fetch user'));

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Wait for the hook to update
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert that loading becomes false
    expect(result.current.loading).toBe(false);

    // Assert that user is null
    expect(result.current.user).toBeNull();

    // Assert that isAuthenticated is false
    expect(result.current.isAuthenticated).toBe(false);

    // Assert that error contains the expected error message
    expect(result.current.error).toBe('Failed to fetch user');
  });
});