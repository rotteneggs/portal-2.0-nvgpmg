import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit v1.9.3
import {
  AuthState,
  User,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  MfaVerifyRequest
} from '../../types/auth';
import {
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  getCurrentUser as getCurrentUserApi,
  verifyEmail as verifyEmailApi,
  forgotPassword as forgotPasswordApi,
  resetPassword as resetPasswordApi,
  verifyMfa as verifyMfaApi
} from '../../api/auth';
import { setToken, getToken, removeToken } from '../../utils/storageUtils';

/**
 * Initial state for the authentication slice
 */
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  requiresMfa: false,
  mfaMethods: []
};

/**
 * Async thunk for user login
 */
export const login = createAsyncThunk<User, LoginRequest>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await loginApi(credentials);
      
      // If MFA is required, return that info in the rejection
      if (response.requires_mfa) {
        return rejectWithValue({
          requiresMfa: true,
          mfaMethods: response.mfa_methods,
          user: response.user
        });
      }
      
      // Store the token
      setToken(response.token);
      
      // Return the user data
      return response.user;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for user registration
 */
export const register = createAsyncThunk<User, RegisterRequest>(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await registerApi(userData);
      
      // Store the token
      setToken(response.token);
      
      // Return the user data
      return response.user;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for user logout
 */
export const logout = createAsyncThunk<void, void>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutApi();
      
      // Remove the token
      removeToken();
    } catch (error) {
      // Still remove the token even if API call fails
      removeToken();
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk to get the current user's profile
 */
export const getCurrentUser = createAsyncThunk<User, void>(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      // Check if a token exists
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Get the current user
      const user = await getCurrentUserApi();
      return user;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk to verify a user's email address
 */
export const verifyEmail = createAsyncThunk<void, VerifyEmailRequest>(
  'auth/verifyEmail',
  async (verificationData, { rejectWithValue }) => {
    try {
      await verifyEmailApi(verificationData);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk to request a password reset email
 */
export const forgotPassword = createAsyncThunk<void, ForgotPasswordRequest>(
  'auth/forgotPassword',
  async (data, { rejectWithValue }) => {
    try {
      await forgotPasswordApi(data);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk to reset a user's password using a token
 */
export const resetPassword = createAsyncThunk<void, ResetPasswordRequest>(
  'auth/resetPassword',
  async (data, { rejectWithValue }) => {
    try {
      await resetPasswordApi(data);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk to verify a multi-factor authentication code
 */
export const verifyMfa = createAsyncThunk<User, MfaVerifyRequest>(
  'auth/verifyMfa',
  async (data, { rejectWithValue }) => {
    try {
      const response = await verifyMfaApi(data);
      
      // Store the token
      setToken(response.token);
      
      // Return the user data
      return response.user;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Redux slice for authentication state management
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set the current user and mark as authenticated
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    
    // Set the authentication token
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    
    // Set the loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Set the error message
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Set whether MFA is required
    setRequiresMfa: (state, action: PayloadAction<boolean>) => {
      state.requiresMfa = action.payload;
    },
    
    // Set available MFA methods
    setMfaMethods: (state, action: PayloadAction<string[]>) => {
      state.mfaMethods = action.payload;
    },
    
    // Clear authentication state on logout
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.requiresMfa = false;
      state.mfaMethods = [];
      state.error = null;
    },
    
    // Initialize auth state from stored token
    initializeAuth: (state) => {
      const token = getToken();
      if (token) {
        state.token = token;
        // Don't set isAuthenticated yet - we need to verify the token by fetching the user
      }
    }
  },
  extraReducers: (builder) => {
    // Login thunk cases
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        
        // Check if this is an MFA required rejection
        if (action.payload && typeof action.payload === 'object' && 'requiresMfa' in action.payload) {
          state.requiresMfa = true;
          state.mfaMethods = (action.payload as any).mfaMethods || [];
          state.user = (action.payload as any).user;
          state.error = null;
        } else {
          state.error = action.error.message || 'Login failed';
        }
      });
    
    // Register thunk cases
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      });
    
    // Logout thunk cases
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, (state) => {
        // Clear auth state
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.loading = false;
        state.error = null;
        state.requiresMfa = false;
        state.mfaMethods = [];
      })
      .addCase(logout.rejected, (state, action) => {
        // Even if logout API call fails, we should still clear auth state
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.loading = false;
        state.error = action.error.message || 'Logout failed';
        state.requiresMfa = false;
        state.mfaMethods = [];
      });
    
    // GetCurrentUser thunk cases
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        // If we can't get the current user, auth has failed
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.loading = false;
        state.error = action.error.message || 'Failed to get user data';
      });
    
    // VerifyEmail thunk cases
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.loading = false;
        
        // If we have a user, update their email_verified_at
        if (state.user) {
          state.user.email_verified_at = new Date().toISOString();
        }
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Email verification failed';
      });
    
    // ForgotPassword thunk cases
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Password reset request failed';
      });
    
    // ResetPassword thunk cases
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Password reset failed';
      });
    
    // VerifyMfa thunk cases
    builder
      .addCase(verifyMfa.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyMfa.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.requiresMfa = false;
        state.mfaMethods = [];
        state.loading = false;
        state.error = null;
      })
      .addCase(verifyMfa.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'MFA verification failed';
      });
  }
});

// Selector to get the entire auth state
export const selectAuth = (state: { auth: AuthState }): AuthState => state.auth;

// Selector to get the current user
export const selectUser = (state: { auth: AuthState }): User | null => state.auth.user;

// Selector to check if the user is authenticated
export const selectIsAuthenticated = (state: { auth: AuthState }): boolean => state.auth.isAuthenticated;

// Selector to check if authentication is loading
export const selectAuthLoading = (state: { auth: AuthState }): boolean => state.auth.loading;

// Selector to get authentication error
export const selectAuthError = (state: { auth: AuthState }): string | null => state.auth.error;

// Selector to check if MFA is required
export const selectRequiresMfa = (state: { auth: AuthState }): boolean => state.auth.requiresMfa;

// Selector to get available MFA methods
export const selectMfaMethods = (state: { auth: AuthState }): string[] => state.auth.mfaMethods;

// Export the auth slice
export default authSlice;

// Export all actions and selectors for use in components
export {
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
  selectMfaMethods
};