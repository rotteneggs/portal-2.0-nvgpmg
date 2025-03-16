/**
 * Redux slice for user profile state management in the Student Admissions Enrollment Platform.
 * This slice handles user profile data, notification preferences, and profile picture management.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.3
import {
  User,
  UserProfile,
  UpdateProfileRequest,
  UpdateNotificationPreferencesRequest,
  ChangePasswordRequest,
} from '../../types/user';
import {
  updateProfile as updateProfileApi,
  updateNotificationPreferences as updateNotificationPreferencesApi,
  changePassword as changePasswordApi,
  uploadProfilePicture as uploadProfilePictureApi,
  deleteProfilePicture as deleteProfilePictureApi
} from '../../api/users';

/**
 * Interface defining the structure of the user state in Redux
 */
interface UserState {
  profile: UserProfile | null;
  profilePictureUrl: string | null;
  loading: boolean;
  error: string | null;
  passwordChangeSuccess: boolean;
  passwordChangeMessage: string | null;
}

/**
 * Initial state for the user slice
 */
const initialState: UserState = {
  profile: null,
  profilePictureUrl: null,
  loading: false,
  error: null,
  passwordChangeSuccess: false,
  passwordChangeMessage: null
};

/**
 * Async thunk for updating the user's profile
 */
export const updateProfile = createAsyncThunk<User, UpdateProfileRequest>(
  'user/updateProfile',
  async (profileData: UpdateProfileRequest) => {
    const response = await updateProfileApi(profileData);
    return response;
  }
);

/**
 * Async thunk for updating notification preferences
 */
export const updateNotificationPreferences = createAsyncThunk<User, UpdateNotificationPreferencesRequest>(
  'user/updateNotificationPreferences',
  async (preferences: UpdateNotificationPreferencesRequest) => {
    const response = await updateNotificationPreferencesApi(preferences);
    return response;
  }
);

/**
 * Async thunk for changing the user's password
 */
export const changePassword = createAsyncThunk<{ success: boolean; message: string }, ChangePasswordRequest>(
  'user/changePassword',
  async (passwordData: ChangePasswordRequest) => {
    const response = await changePasswordApi(passwordData);
    return response;
  }
);

/**
 * Async thunk for uploading a profile picture
 */
export const uploadProfilePicture = createAsyncThunk<{ success: boolean; profile_picture_url: string }, File>(
  'user/uploadProfilePicture',
  async (file: File) => {
    const response = await uploadProfilePictureApi(file);
    return response;
  }
);

/**
 * Async thunk for deleting the user's profile picture
 */
export const deleteProfilePicture = createAsyncThunk<{ success: boolean; message: string }, void>(
  'user/deleteProfilePicture',
  async () => {
    const response = await deleteProfilePictureApi();
    return response;
  }
);

/**
 * Redux slice for the user state
 */
export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    /**
     * Set the user profile data
     */
    setProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    /**
     * Set the profile picture URL
     */
    setProfilePictureUrl: (state, action: PayloadAction<string | null>) => {
      state.profilePictureUrl = action.payload;
    },
    /**
     * Set the loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    /**
     * Set the error message
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    /**
     * Set the password change status and message
     */
    setPasswordChangeStatus: (state, action: PayloadAction<{ success: boolean; message: string | null }>) => {
      state.passwordChangeSuccess = action.payload.success;
      state.passwordChangeMessage = action.payload.message;
    },
    /**
     * Clear the password change status
     */
    clearPasswordChangeStatus: (state) => {
      state.passwordChangeSuccess = false;
      state.passwordChangeMessage = null;
    }
  },
  extraReducers: (builder) => {
    // Handle updateProfile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.profile;
        // Also update the profile picture URL if available
        state.profilePictureUrl = action.payload.profile_picture_url;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update profile';
      });

    // Handle updateNotificationPreferences
    builder
      .addCase(updateNotificationPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.profile;
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update notification preferences';
      });

    // Handle changePassword
    builder
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.passwordChangeSuccess = false;
        state.passwordChangeMessage = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.loading = false;
        state.passwordChangeSuccess = action.payload.success;
        state.passwordChangeMessage = action.payload.message;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to change password';
        state.passwordChangeSuccess = false;
      });

    // Handle uploadProfilePicture
    builder
      .addCase(uploadProfilePicture.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadProfilePicture.fulfilled, (state, action) => {
        state.loading = false;
        state.profilePictureUrl = action.payload.profile_picture_url;
      })
      .addCase(uploadProfilePicture.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to upload profile picture';
      });

    // Handle deleteProfilePicture
    builder
      .addCase(deleteProfilePicture.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProfilePicture.fulfilled, (state) => {
        state.loading = false;
        state.profilePictureUrl = null;
      })
      .addCase(deleteProfilePicture.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete profile picture';
      });
  }
});

// Export actions
export const {
  setProfile,
  setProfilePictureUrl,
  setLoading,
  setError,
  setPasswordChangeStatus,
  clearPasswordChangeStatus
} = userSlice.actions;

/**
 * Selector to get the user profile state
 */
export const selectUser = (state: { user: UserState }) => state.user;

/**
 * Selector to get the user profile data
 */
export const selectUserProfile = (state: { user: UserState }) => state.user.profile;

/**
 * Selector to check if profile operations are loading
 */
export const selectProfileLoading = (state: { user: UserState }) => state.user.loading;

/**
 * Selector to get profile operation error
 */
export const selectProfileError = (state: { user: UserState }) => state.user.error;

/**
 * Selector to get notification preferences
 */
export const selectNotificationPreferences = (state: { user: UserState }) => 
  state.user.profile?.notification_preferences || null;

/**
 * Selector to get the profile picture URL
 */
export const selectProfilePictureUrl = (state: { user: UserState }) => state.user.profilePictureUrl;

// Export the slice as default
export default userSlice;