import AuthService from './AuthService';
import { mockLocalStorage } from '../utils/testUtils';
import { setToken, getToken, removeToken } from '../utils/storageUtils';
import { User, LoginRequest, RegisterRequest } from '../types/auth';
import * as authApi from '../api/auth';

// Mock the auth API module
jest.mock('../api/auth', () => ({ // jest v29.0.0
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  verifyEmail: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
  verifyMfa: jest.fn(),
  setupMfa: jest.fn(),
  verifyMfaSetup: jest.fn(),
  disableMfa: jest.fn(),
  getRecoveryCodes: jest.fn(),
  useRecoveryCode: jest.fn(),
  refreshToken: jest.fn(),
  resendVerificationEmail: jest.fn()
}));

// Mock the storage utility functions
jest.mock('../utils/storageUtils', () => ({
  setToken: jest.fn(),
  getToken: jest.fn(),
  removeToken: jest.fn()
}));

// Utility function to create a mock user object
const createMockUser = (overrides: Partial<User> = {}): User => {
  const defaultUser: User = {
    id: 1,
    email: 'test@example.com',
    email_verified_at: null,
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
    last_login_at: null,
    has_mfa_enabled: false,
    roles: [],
    permissions: [],
    profile: null,
    profile_picture_url: null,
    full_name: 'Test User'
  };

  return { ...defaultUser, ...overrides };
};

describe('AuthService', () => {
  beforeEach(() => {
    mockLocalStorage();
    (authApi.login as jest.Mock).mockClear();
    (authApi.register as jest.Mock).mockClear();
    (authApi.logout as jest.Mock).mockClear();
    (authApi.getCurrentUser as jest.Mock).mockClear();
    (authApi.verifyEmail as jest.Mock).mockClear();
    (authApi.forgotPassword as jest.Mock).mockClear();
    (authApi.resetPassword as jest.Mock).mockClear();
    (authApi.changePassword as jest.Mock).mockClear();
    (authApi.verifyMfa as jest.Mock).mockClear();
    (authApi.setupMfa as jest.Mock).mockClear();
    (authApi.verifyMfaSetup as jest.Mock).mockClear();
    (authApi.disableMfa as jest.Mock).mockClear();
    (authApi.getRecoveryCodes as jest.Mock).mockClear();
    (authApi.useRecoveryCode as jest.Mock).mockClear();
    (authApi.refreshToken as jest.Mock).mockClear();
    (authApi.resendVerificationEmail as jest.Mock).mockClear();
    (setToken as jest.Mock).mockClear();
    (getToken as jest.Mock).mockClear();
    (removeToken as jest.Mock).mockClear();
  });

  it('constructor should initialize with correct default values', () => {
    const authService = new AuthService();
    expect(authService.isAuthenticated).toBe(false);
    expect(authService.currentUser).toBeNull();
    expect(authService.requiresMfa).toBe(false);
    expect(authService.mfaMethods).toEqual([]);
  });

  it('constructor with existing token should set isAuthenticated to true if token exists', () => {
    (getToken as jest.Mock).mockReturnValue('test-token');
    const authService = new AuthService();
    expect(authService.isAuthenticated).toBe(true);
  });

  it('login should authenticate user and store token', async () => {
    const mockCredentials: LoginRequest = { email: 'test@example.com', password: 'password', remember: false };
    const mockUser = createMockUser();
    (authApi.login as jest.Mock).mockResolvedValue({ token: 'test-token', user: mockUser, requires_mfa: false, mfa_methods: [] });

    const authService = new AuthService();
    const user = await authService.login(mockCredentials);

    expect(setToken).toHaveBeenCalledWith('test-token');
    expect(authService.isAuthenticated).toBe(true);
    expect(authService.currentUser).toEqual(mockUser);
    expect(user).toEqual(mockUser);
  });

  it('login with MFA required should set requiresMfa flag when MFA is required', async () => {
    const mockCredentials: LoginRequest = { email: 'test@example.com', password: 'password', remember: false };
    const mockUser = createMockUser();
    (authApi.login as jest.Mock).mockResolvedValue({ token: 'test-token', user: mockUser, requires_mfa: true, mfa_methods: ['totp', 'sms'] });

    const authService = new AuthService();
    await authService.login(mockCredentials);

    expect(authService.isAuthenticated).toBe(false);
    expect(authService.requiresMfa).toBe(true);
    expect(authService.mfaMethods).toEqual(['totp', 'sms']);
  });

  it('login failure should handle login failures correctly', async () => {
    const mockCredentials: LoginRequest = { email: 'test@example.com', password: 'password', remember: false };
    (authApi.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    const authService = new AuthService();
    await expect(authService.login(mockCredentials)).rejects.toThrow('Invalid credentials');

    expect(authService.isAuthenticated).toBe(false);
    expect(authService.currentUser).toBeNull();
  });

  it('register should register user and store token', async () => {
    const mockRegistrationData: RegisterRequest = {
      email: 'test@example.com',
      password: 'password',
      password_confirmation: 'password',
      first_name: 'Test',
      last_name: 'User'
    };
    const mockUser = createMockUser();
    (authApi.register as jest.Mock).mockResolvedValue({ token: 'test-token', user: mockUser });

    const authService = new AuthService();
    const user = await authService.register(mockRegistrationData);

    expect(setToken).toHaveBeenCalledWith('test-token');
    expect(authService.isAuthenticated).toBe(true);
    expect(authService.currentUser).toEqual(mockUser);
    expect(user).toEqual(mockUser);
  });

  it('register failure should handle registration failures correctly', async () => {
    const mockRegistrationData: RegisterRequest = {
      email: 'test@example.com',
      password: 'password',
      password_confirmation: 'password',
      first_name: 'Test',
      last_name: 'User'
    };
    (authApi.register as jest.Mock).mockRejectedValue(new Error('Registration failed'));

    const authService = new AuthService();
    await expect(authService.register(mockRegistrationData)).rejects.toThrow('Registration failed');

    expect(authService.isAuthenticated).toBe(false);
    expect(authService.currentUser).toBeNull();
  });

  it('logout should log out user and remove token', async () => {
    (getToken as jest.Mock).mockReturnValue('test-token');
    const authService = new AuthService();
    authService.isAuthenticated = true;
    authService.currentUser = createMockUser();
    (authApi.logout as jest.Mock).mockResolvedValue(undefined);

    await authService.logout();

    expect(removeToken).toHaveBeenCalled();
    expect(authService.isAuthenticated).toBe(false);
    expect(authService.currentUser).toBeNull();
    expect(authService.requiresMfa).toBe(false);
    expect(authService.mfaMethods).toEqual([]);
  });

  it('logout when not authenticated should do nothing if user is not authenticated', async () => {
    const authService = new AuthService();
    await authService.logout();

    expect(authApi.logout).not.toHaveBeenCalled();
    expect(removeToken).not.toHaveBeenCalled();
  });

  it('getCurrentUser should fetch and return current user data', async () => {
    (getToken as jest.Mock).mockReturnValue('test-token');
    const mockUser = createMockUser();
    (authApi.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    const authService = new AuthService();
    authService.isAuthenticated = true;
    const user = await authService.getCurrentUser();

    expect(authApi.getCurrentUser).toHaveBeenCalled();
    expect(authService.currentUser).toEqual(mockUser);
    expect(user).toEqual(mockUser);
  });

  it('getCurrentUser when not authenticated should throw error if user is not authenticated', async () => {
    const authService = new AuthService();
    await expect(authService.getCurrentUser()).rejects.toThrow('User is not authenticated');
    expect(authApi.getCurrentUser).not.toHaveBeenCalled();
  });

  it('verifyEmail should call API to verify email', async () => {
    const mockVerificationData = { id: '123', hash: 'test-hash' };
    (authApi.verifyEmail as jest.Mock).mockResolvedValue(undefined);

    const authService = new AuthService();
    await authService.verifyEmail(mockVerificationData);

    expect(authApi.verifyEmail).toHaveBeenCalledWith(mockVerificationData);
  });

  it('forgotPassword should call API to request password reset', async () => {
    const mockForgotPasswordData = { email: 'test@example.com' };
    (authApi.forgotPassword as jest.Mock).mockResolvedValue(undefined);

    const authService = new AuthService();
    await authService.forgotPassword(mockForgotPasswordData);

    expect(authApi.forgotPassword).toHaveBeenCalledWith(mockForgotPasswordData);
  });

  it('resetPassword should call API to reset password', async () => {
    const mockResetPasswordData = { token: 'test-token', email: 'test@example.com', password: 'new-password', password_confirmation: 'new-password' };
    (authApi.resetPassword as jest.Mock).mockResolvedValue(undefined);

    const authService = new AuthService();
    await authService.resetPassword(mockResetPasswordData);

    expect(authApi.resetPassword).toHaveBeenCalledWith(mockResetPasswordData);
  });

  it('changePassword should call API to change password for authenticated user', async () => {
    (getToken as jest.Mock).mockReturnValue('test-token');
    const authService = new AuthService();
    authService.isAuthenticated = true;
    (authApi.changePassword as jest.Mock).mockResolvedValue(undefined);

    await authService.changePassword('old-password', 'new-password', 'new-password');

    expect(authApi.changePassword).toHaveBeenCalledWith('old-password', 'new-password', 'new-password');
  });

  it('changePassword when not authenticated should throw error if user is not authenticated', async () => {
    const authService = new AuthService();
    await expect(authService.changePassword('old-password', 'new-password', 'new-password')).rejects.toThrow('User is not authenticated');
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('verifyMfa should verify MFA code and complete authentication', async () => {
    const mockMfaVerificationData = { email: 'test@example.com', method: 'totp', code: '123456' };
    const mockUser = createMockUser();
    (authApi.verifyMfa as jest.Mock).mockResolvedValue({ token: 'test-token', user: mockUser, requires_mfa: false, mfa_methods: [] });

    const authService = new AuthService();
    const user = await authService.verifyMfa(mockMfaVerificationData);

    expect(setToken).toHaveBeenCalledWith('test-token');
    expect(authService.isAuthenticated).toBe(true);
    expect(authService.requiresMfa).toBe(false);
    expect(authService.mfaMethods).toEqual([]);
    expect(authService.currentUser).toEqual(mockUser);
    expect(user).toEqual(mockUser);
  });

  it('setupMfa should call API to set up MFA for authenticated user', async () => {
    (getToken as jest.Mock).mockReturnValue('test-token');
    const authService = new AuthService();
    authService.isAuthenticated = true;
    const mockSetupData = { method: 'totp', secret: 'test-secret', qr_code: 'test-qr-code', recovery_codes: ['code1', 'code2'] };
    (authApi.setupMfa as jest.Mock).mockResolvedValue(mockSetupData);

    const setupData = await authService.setupMfa('totp', { data: 'test-data' });

    expect(authApi.setupMfa).toHaveBeenCalledWith('totp', { data: 'test-data' });
    expect(setupData).toEqual(mockSetupData);
  });

  it('setupMfa when not authenticated should throw error if user is not authenticated', async () => {
    const authService = new AuthService();
    await expect(authService.setupMfa('totp', { data: 'test-data' })).rejects.toThrow('User is not authenticated');
    expect(authApi.setupMfa).not.toHaveBeenCalled();
  });

  it('verifyMfaSetup should call API to verify MFA setup for authenticated user', async () => {
    (getToken as jest.Mock).mockReturnValue('test-token');
    const authService = new AuthService();
    authService.isAuthenticated = true;
    (authApi.verifyMfaSetup as jest.Mock).mockResolvedValue(undefined);

    await authService.verifyMfaSetup('totp', '123456');

    expect(authApi.verifyMfaSetup).toHaveBeenCalledWith('totp', '123456');
  });

  it('verifyMfaSetup when not authenticated should throw error if user is not authenticated', async () => {
    const authService = new AuthService();
    await expect(authService.verifyMfaSetup('totp', '123456')).rejects.toThrow('User is not authenticated');
    expect(authApi.verifyMfaSetup).not.toHaveBeenCalled();
  });

  it('disableMfa should call API to disable MFA for authenticated user', async () => {
    (getToken as jest.Mock).mockReturnValue('test-token');
    const authService = new AuthService();
    authService.isAuthenticated = true;
    (authApi.disableMfa as jest.Mock).mockResolvedValue(undefined);

    await authService.disableMfa('password');

    expect(authApi.disableMfa).toHaveBeenCalledWith('password');
  });

  it('disableMfa when not authenticated should throw error if user is not authenticated', async () => {
    const authService = new AuthService();
    await expect(authService.disableMfa('password')).rejects.toThrow('User is not authenticated');
    expect(authApi.disableMfa).not.toHaveBeenCalled();
  });

  it('getRecoveryCodes should call API to get recovery codes for authenticated user', async () => {
    (getToken as jest.Mock).mockReturnValue('test-token');
    const authService = new AuthService();
    authService.isAuthenticated = true;
    const mockCodes = ['code1', 'code2'];
    (authApi.getRecoveryCodes as jest.Mock).mockResolvedValue(mockCodes);

    const codes = await authService.getRecoveryCodes();

    expect(authApi.getRecoveryCodes).toHaveBeenCalled();
    expect(codes).toEqual(mockCodes);
  });

  it('getRecoveryCodes when not authenticated should throw error if user is not authenticated', async () => {
    const authService = new AuthService();
    await expect(authService.getRecoveryCodes()).rejects.toThrow('User is not authenticated');
    expect(authApi.getRecoveryCodes).not.toHaveBeenCalled();
  });

  it('useRecoveryCode should use recovery code to bypass MFA', async () => {
    const mockEmail = 'test@example.com';
    const mockRecoveryCode = 'recovery-code';
    const mockUser = createMockUser();
    (authApi.useRecoveryCode as jest.Mock).mockResolvedValue({ token: 'test-token', user: mockUser, requires_mfa: false, mfa_methods: [] });

    const authService = new AuthService();
    const user = await authService.useRecoveryCode(mockEmail, mockRecoveryCode);

    expect(setToken).toHaveBeenCalledWith('test-token');
    expect(authService.isAuthenticated).toBe(true);
    expect(authService.requiresMfa).toBe(false);
    expect(authService.mfaMethods).toEqual([]);
    expect(authService.currentUser).toEqual(mockUser);
    expect(user).toEqual(mockUser);
  });

  it('refreshToken should refresh authentication token', async () => {
    (getToken as jest.Mock).mockReturnValue('old-token');
    (authApi.refreshToken as jest.Mock).mockResolvedValue({ token: 'new-token' });

    const authService = new AuthService();
    const newToken = await authService.refreshToken();

    expect(authApi.refreshToken).toHaveBeenCalled();
    expect(setToken).toHaveBeenCalledWith('new-token');
    expect(newToken).toBe('new-token');
  });

  it('refreshToken with no existing token should throw error if no token exists', async () => {
    (getToken as jest.Mock).mockReturnValue(null);

    const authService = new AuthService();
    await expect(authService.refreshToken()).rejects.toThrow('No authentication token found');
    expect(authApi.refreshToken).not.toHaveBeenCalled();
  });

  it('resendVerificationEmail should call API to resend verification email', async () => {
    const mockEmail = 'test@example.com';
    (authApi.resendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

    const authService = new AuthService();
    await authService.resendVerificationEmail(mockEmail);

    expect(authApi.resendVerificationEmail).toHaveBeenCalledWith(mockEmail);
  });

  it('checkAuthentication should return current authentication status', () => {
    const authService = new AuthService();
    authService.isAuthenticated = true;
    expect(authService.checkAuthentication()).toBe(true);

    authService.isAuthenticated = false;
    expect(authService.checkAuthentication()).toBe(false);
  });
});