# src/web/src/redux/slices/authSlice.test.ts
```typescript
import { configureStore } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.3
import {
  authSlice,
  login,
  register,
  logout,
  getCurrentUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  verifyMfa,
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectRequiresMfa,
  selectMfaMethods,
} from './authSlice';
import { AuthState, User, LoginRequest, RegisterRequest } from '../../types/auth';
import { mockLocalStorage, createTestStore } from '../../utils/testUtils';
import { getToken } from '../../utils/storageUtils';

// Mock API functions
jest.mock('../../api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  verifyEmail: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyMfa: jest.fn(),
}));

// Mock storage functions
jest.mock('../../utils/storageUtils', () => ({
  setToken: jest.fn(),
  getToken: jest.fn(),
  removeToken: jest.fn(),
}));

const mockLogin = jest.requireMock('../../api/auth').login;
const mockRegister = jest.requireMock('../../api/auth').register;
const mockLogout = jest.requireMock('../../api/auth').logout;
const mockGetCurrentUser = jest.requireMock('../../api/auth').getCurrentUser;
const mockVerifyEmail = jest.requireMock('../../api/auth').verifyEmail;
const mockForgotPassword = jest.requireMock('../../api/auth').forgotPassword;
const mockResetPassword = jest.requireMock('../../api/auth').resetPassword;
const mockVerifyMfa = jest.requireMock('../../api/auth').verifyMfa;
const mockGetToken = jest.requireMock('../../utils/storageUtils').getToken;

describe('Auth Slice', () => {
  describe('Reducers', () => {
    test('should set user and mark as authenticated', () => {
      const initialState: AuthState = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        requiresMfa: false,
        mfaMethods: [],
      };
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
        full_name: 'Test User',
        permissions: []
      };

      const nextState = authSlice.reducer(initialState, authSlice.actions.setUser(mockUser));

      expect(nextState.user).toEqual(mockUser);
      expect(nextState.isAuthenticated).toBe(true);
    });

    test('should set token', () => {
      const initialState: AuthState = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        requiresMfa: false,
        mfaMethods: [],
      };
      const mockToken = 'test_token';

      const nextState = authSlice.reducer(initialState, authSlice.actions.setToken(mockToken));

      expect(nextState.token).toBe(mockToken);
    });

    test('should set loading state', () => {
      const initialState: AuthState = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        requiresMfa: false,
        mfaMethods: [],
      };

      let nextState = authSlice.reducer(initialState, authSlice.actions.setLoading(true));
      expect(nextState.loading).toBe(true);

      nextState = authSlice.reducer(nextState, authSlice.actions.setLoading(false));
      expect(nextState.loading).toBe(false);
    });

    test('should set error message', () => {
      const initialState: AuthState = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        requiresMfa: false,
        mfaMethods: [],
      };
      const mockError = 'test_error';

      let nextState = authSlice.reducer(initialState, authSlice.actions.setError(mockError));
      expect(nextState.error).toBe(mockError);

      nextState = authSlice.reducer(nextState, authSlice.actions.setError(null));
      expect(nextState.error).toBe(null);
    });

    test('should set requiresMfa flag', () => {
      const initialState: AuthState = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        requiresMfa: false,
        mfaMethods: [],
      };

      let nextState = authSlice.reducer(initialState, authSlice.actions.setRequiresMfa(true));
      expect(nextState.requiresMfa).toBe(true);

      nextState = authSlice.reducer(nextState, authSlice.actions.setRequiresMfa(false));
      expect(nextState.requiresMfa).toBe(false);
    });

    test('should set MFA methods', () => {
      const initialState: AuthState = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        requiresMfa: false,
        mfaMethods: [],
      };
      const mockMfaMethods = ['totp', 'sms'];

      const nextState = authSlice.reducer(initialState, authSlice.actions.setMfaMethods(mockMfaMethods));

      expect(nextState.mfaMethods).toEqual(mockMfaMethods);
    });

    test('should clear auth state', () => {
      const initialState: AuthState = {
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
          full_name: 'Test User',
          permissions: []
        },
        token: 'test_token',
        loading: false,
        error: null,
        requiresMfa: false,
        mfaMethods: [],
      };

      const nextState = authSlice.reducer(initialState, authSlice.actions.clearAuth());

      expect(nextState.isAuthenticated).toBe(false);
      expect(nextState.user).toBeNull();
      expect(nextState.token).toBeNull();
      expect(nextState.requiresMfa).toBe(false);
      expect(nextState.mfaMethods).toEqual([]);
      expect(nextState.error).toBeNull();
    });
  });

  describe('Thunks', () => {
    test('login thunk should authenticate user', async () => {
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
        full_name: 'Test User',
        permissions: []
      };
      const mockToken = 'test_token';
      mockLogin.mockResolvedValue({ user: mockUser, token: mockToken });

      const testStore = createTestStore();
      const credentials: LoginRequest = { email: 'test@example.com', password: 'password', remember: false };
      await testStore.dispatch(login(credentials));

      expect(mockLogin).toHaveBeenCalledWith(credentials);
      expect(testStore.getState().auth.user).toEqual(mockUser);
      expect(testStore.getState().auth.token).toEqual(mockToken);
      expect(testStore.getState().auth.isAuthenticated).toBe(true);
      expect(testStore.getState().auth.loading).toBe(false);
    });

    test('login thunk should handle MFA requirement', async () => {
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
        full_name: 'Test User',
        permissions: []
      };
      const mockMfaMethods = ['totp', 'sms'];
      mockLogin.mockResolvedValue({ requires_mfa: true, mfa_methods: mockMfaMethods, user: mockUser });

      const testStore = createTestStore();
      const credentials: LoginRequest = { email: 'test@example.com', password: 'password', remember: false };
      await testStore.dispatch(login(credentials));

      expect(mockLogin).toHaveBeenCalledWith(credentials);
      expect(testStore.getState().auth.requiresMfa).toBe(true);
      expect(testStore.getState().auth.mfaMethods).toEqual(mockMfaMethods);
      expect(testStore.getState().auth.user).toEqual(mockUser);
      expect(testStore.getState().auth.isAuthenticated).toBe(false);
    });

    test('login thunk should handle errors', async () => {
      mockLogin.mockRejectedValue(new Error('Login failed'));

      const testStore = createTestStore();
      const credentials: LoginRequest = { email: 'test@example.com', password: 'password', remember: false };
      await testStore.dispatch(login(credentials));

      expect(mockLogin).toHaveBeenCalledWith(credentials);
      expect(testStore.getState().auth.error).toBe('Login failed');
      expect(testStore.getState().auth.loading).toBe(false);
      expect(testStore.getState().auth.user).toBeNull();
      expect(testStore.getState().auth.isAuthenticated).toBe(false);
    });

    test('register thunk should create new user', async () => {
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
        full_name: 'Test User',
        permissions: []
      };
      const mockToken = 'test_token';
      mockRegister.mockResolvedValue({ user: mockUser, token: mockToken });

      const testStore = createTestStore();
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: 'password',
        password_confirmation: 'password',
        first_name: 'Test',
        last_name: 'User',
      };
      await testStore.dispatch(register(userData));

      expect(mockRegister).toHaveBeenCalledWith(userData);
      expect(testStore.getState().auth.user).toEqual(mockUser);
      expect(testStore.getState().auth.token).toEqual(mockToken);
      expect(testStore.getState().auth.isAuthenticated).toBe(true);
      expect(testStore.getState().auth.loading).toBe(false);
    });

    test('register thunk should handle errors', async () => {
      mockRegister.mockRejectedValue(new Error('Registration failed'));

      const testStore = createTestStore();
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: 'password',
        password_confirmation: 'password',
        first_name: 'Test',
        last_name: 'User',
      };
      await testStore.dispatch(register(userData));

      expect(mockRegister).toHaveBeenCalledWith(userData);
      expect(testStore.getState().auth.error).toBe('Registration failed');
      expect(testStore.getState().auth.loading).toBe(false);
      expect(testStore.getState().auth.user).toBeNull();
      expect(testStore.getState().auth.isAuthenticated).toBe(false);
    });

    test('logout thunk should clear auth state', async () => {
      mockLogout.mockResolvedValue(undefined);

      const testStore = createTestStore({
        auth: {
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
            full_name: 'Test User',
            permissions: []
          },
          token: 'test_token',
          loading: false,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      });
      await testStore.dispatch(logout());

      expect(mockLogout).toHaveBeenCalled();
      expect(testStore.getState().auth.user).toBeNull();
      expect(testStore.getState().auth.token).toBeNull();
      expect(testStore.getState().auth.isAuthenticated).toBe(false);
      expect(testStore.getState().auth.loading).toBe(false);
    });

    test('getCurrentUser thunk should fetch user profile', async () => {
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
        full_name: 'Test User',
        permissions: []
      };
      mockGetToken.mockReturnValue('test_token');
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const testStore = createTestStore();
      await testStore.dispatch(getCurrentUser());

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(testStore.getState().auth.user).toEqual(mockUser);
      expect(testStore.getState().auth.isAuthenticated).toBe(true);
      expect(testStore.getState().auth.loading).toBe(false);
    });

    test('getCurrentUser thunk should handle missing token', async () => {
      mockGetToken.mockReturnValue(null);

      const testStore = createTestStore();
      await testStore.dispatch(getCurrentUser());

      expect(mockGetCurrentUser).not.toHaveBeenCalled();
      expect(testStore.getState().auth.error).toBe('No authentication token found');
      expect(testStore.getState().auth.user).toBeNull();
      expect(testStore.getState().auth.isAuthenticated).toBe(false);
    });

    test('verifyEmail thunk should verify email', async () => {
      mockVerifyEmail.mockResolvedValue(undefined);

      const testStore = createTestStore();
      const verificationData = { id: '1', hash: 'test_hash' };
      await testStore.dispatch(verifyEmail(verificationData));

      expect(mockVerifyEmail).toHaveBeenCalledWith(verificationData);
      expect(testStore.getState().auth.loading).toBe(false);
      expect(testStore.getState().auth.error).toBeNull();
    });

    test('forgotPassword thunk should request password reset', async () => {
      mockForgotPassword.mockResolvedValue(undefined);

      const testStore = createTestStore();
      const emailData = { email: 'test@example.com' };
      await testStore.dispatch(forgotPassword(emailData));

      expect(mockForgotPassword).toHaveBeenCalledWith(emailData);
      expect(testStore.getState().auth.loading).toBe(false);
      expect(testStore.getState().auth.error).toBeNull();
    });

    test('resetPassword thunk should reset password', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const testStore = createTestStore();
      const resetData = { email: 'test@example.com', token: 'test_token', password: 'new_password', password_confirmation: 'new_password' };
      await testStore.dispatch(resetPassword(resetData));

      expect(mockResetPassword).toHaveBeenCalledWith(resetData);
      expect(testStore.getState().auth.loading).toBe(false);
      expect(testStore.getState().auth.error).toBeNull();
    });

    test('verifyMfa thunk should verify MFA code', async () => {
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
        full_name: 'Test User',
        permissions: []
      };
      const mockToken = 'test_token';
      mockVerifyMfa.mockResolvedValue({ user: mockUser, token: mockToken });

      const testStore = createTestStore({
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: true,
          mfaMethods: ['totp'],
        },
      });
      const mfaData = { email: 'test@example.com', method: 'totp', code: '123456' };
      await testStore.dispatch(verifyMfa(mfaData));

      expect(mockVerifyMfa).toHaveBeenCalledWith(mfaData);
      expect(testStore.getState().auth.user).toEqual(mockUser);
      expect(testStore.getState().auth.token).toEqual(mockToken);
      expect(testStore.getState().auth.isAuthenticated).toBe(true);
      expect(testStore.getState().auth.requiresMfa).toBe(false);
      expect(testStore.getState().auth.loading).toBe(false);
    });
  });

  describe('Selectors', () => {
    test('selectAuth should return the auth state', () => {
      const mockState = {
        auth: {
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
            full_name: 'Test User',
            permissions: []
          },
          token: 'test_token',
          loading: false,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      };

      const selectedAuth = selectAuth(mockState);

      expect(selectedAuth).toEqual(mockState.auth);
    });

    test('selectUser should return the current user', () => {
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
        full_name: 'Test User',
        permissions: []
      };
      const mockState = {
        auth: {
          isAuthenticated: true,
          user: mockUser,
          token: 'test_token',
          loading: false,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      };

      let selectedUser = selectUser(mockState);
      expect(selectedUser).toEqual(mockUser);

      const mockStateNoUser = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      };
      selectedUser = selectUser(mockStateNoUser);
      expect(selectedUser).toBeNull();
    });

    test('selectIsAuthenticated should return authentication status', () => {
      const mockStateAuthenticated = {
        auth: {
          isAuthenticated: true,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      };

      let isAuthenticated = selectIsAuthenticated(mockStateAuthenticated);
      expect(isAuthenticated).toBe(true);

      const mockStateNotAuthenticated = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      };
      isAuthenticated = selectIsAuthenticated(mockStateNotAuthenticated);
      expect(isAuthenticated).toBe(false);
    });

    test('selectAuthLoading should return loading status', () => {
      const mockStateLoading = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: true,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      };

      let isLoading = selectAuthLoading(mockStateLoading);
      expect(isLoading).toBe(true);

      const mockStateNotLoading = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      };
      isLoading = selectAuthLoading(mockStateNotLoading);
      expect(isLoading).toBe(false);
    });

    test('selectAuthError should return error message', () => {
      const mockStateWithError = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: 'test error',
          requiresMfa: false,
          mfaMethods: [],
        },
      };

      let error = selectAuthError(mockStateWithError);
      expect(error).toBe('test error');

      const mockStateNoError = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      };
      error = selectAuthError(mockStateNoError);
      expect(error).toBeNull();
    });

    test('selectRequiresMfa should return MFA requirement status', () => {
      const mockStateRequiresMfa = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: true,
          mfaMethods: [],
        },
      };

      let requiresMfa = selectRequiresMfa(mockStateRequiresMfa);
      expect(requiresMfa).toBe(true);

      const mockStateNoRequiresMfa = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: false,
          mfaMethods: [],
        },
      };
      requiresMfa = selectRequiresMfa(mockStateNoRequiresMfa);
      expect(requiresMfa).toBe(false);
    });

    test('selectMfaMethods should return available MFA methods', () => {
      const mockStateWithMfaMethods = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: true,
          mfaMethods: ['totp', 'sms'],
        },
      };

      let mfaMethods = selectMfaMethods(mockStateWithMfaMethods);
      expect(mfaMethods).toEqual(['totp', 'sms']);

      const mockStateNoMfaMethods = {
        auth: {
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
          requiresMfa: true,
          mfaMethods: [],
        },
      };
      mfaMethods = selectMfaMethods(mockStateNoMfaMethods);
      expect(mfaMethods).toEqual([]);
    });
  });
});