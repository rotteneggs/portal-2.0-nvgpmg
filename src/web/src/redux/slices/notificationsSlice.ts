/**
 * Redux slice for notification state management in the Student Admissions Enrollment Platform.
 * This file defines the notification state structure, reducers, and async thunks for
 * handling notification operations like fetching notifications, marking as read,
 * and managing notification preferences.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.3
import {
  NotificationWithRecipient,
  NotificationPreferences,
  GetNotificationsParams,
  NotificationsResponse,
  NotificationCountResponse,
  NotificationState,
  MarkAsReadPayload,
  UpdatePreferencesPayload,
} from '../../types/notification';
import {
  getNotifications as getNotificationsApi,
  getNotification as getNotificationApi,
  getUnreadCount as getUnreadCountApi,
  markAsRead as markAsReadApi,
  markAllAsRead as markAllAsReadApi,
  deleteNotification as deleteNotificationApi,
  getNotificationPreferences as getNotificationPreferencesApi,
  updateNotificationPreferences as updateNotificationPreferencesApi,
} from '../../api/notifications';
import notificationService from '../../services/NotificationService';

/**
 * Async thunk for fetching notifications
 */
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params: GetNotificationsParams) => {
    try {
      return await getNotificationsApi(params);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for fetching a single notification by ID
 */
export const fetchNotification = createAsyncThunk(
  'notifications/fetchNotification',
  async (notificationId: string) => {
    try {
      return await getNotificationApi(notificationId);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for fetching unread notification count
 */
export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async () => {
    try {
      return await getUnreadCountApi();
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for marking a notification as read
 */
export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (payload: MarkAsReadPayload) => {
    try {
      await markAsReadApi(payload.notificationId);
      return payload.notificationId;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for marking all notifications as read
 */
export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async () => {
    try {
      return await markAllAsReadApi();
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for deleting a notification
 */
export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string) => {
    try {
      await deleteNotificationApi(notificationId);
      return notificationId;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for fetching notification preferences
 */
export const fetchNotificationPreferences = createAsyncThunk(
  'notifications/fetchPreferences',
  async () => {
    try {
      return await getNotificationPreferencesApi();
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for updating notification preferences
 */
export const updateNotificationPreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async (payload: UpdatePreferencesPayload) => {
    try {
      await updateNotificationPreferencesApi(payload.preferences);
      return payload.preferences;
    } catch (error) {
      throw error;
    }
  }
);

// Define initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  preferences: null,
  loading: false,
  error: null,
  preferencesLoading: false,
  preferencesError: null,
};

/**
 * Notification slice with reducers and extra reducers for async thunks
 */
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add a notification received in real-time via WebSocket
    addRealTimeNotification: (state, action: PayloadAction<NotificationWithRecipient>) => {
      // Add new notification to the beginning of the list
      state.notifications.unshift(action.payload);
      // Increment unread count
      state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    // Handle fetchNotifications actions
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.data;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch notifications';
      });

    // Handle fetchNotification actions
    builder
      .addCase(fetchNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotification.fulfilled, (state, action) => {
        state.loading = false;
        // Find if notification already exists and update it, otherwise add it
        const index = state.notifications.findIndex((n) => n.id === action.payload.id);
        if (index >= 0) {
          state.notifications[index] = action.payload;
        } else {
          state.notifications.push(action.payload);
        }
      })
      .addCase(fetchNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch notification';
      });

    // Handle fetchUnreadCount actions
    builder
      .addCase(fetchUnreadCount.pending, (state) => {
        // Don't set loading here since this is a background operation
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.count;
      })
      .addCase(fetchUnreadCount.rejected, (state) => {
        // Don't set error for background operations
      });

    // Handle markAsRead actions
    builder
      .addCase(markAsRead.pending, (state) => {
        // Don't set loading state for optimistic updates
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        // Update the notification in state
        const notificationId = Number(action.payload);
        const notification = state.notifications.find(n => n.id === notificationId);
        
        if (notification && !notification.recipient.is_read) {
          // Update read status
          notification.recipient.is_read = true;
          notification.recipient.read_at = new Date().toISOString();
          // Decrement unread count
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to mark notification as read';
      });

    // Handle markAllAsRead actions
    builder
      .addCase(markAllAsRead.pending, (state) => {
        // Don't set loading state for optimistic updates
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        // Mark all notifications as read
        state.notifications.forEach((notification) => {
          notification.recipient.is_read = true;
          notification.recipient.read_at = new Date().toISOString();
        });
        // Reset unread count to zero
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to mark all notifications as read';
      });

    // Handle deleteNotification actions
    builder
      .addCase(deleteNotification.pending, (state) => {
        // Don't set loading state for optimistic updates
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        // Remove the notification from state
        const notificationId = Number(action.payload);
        const index = state.notifications.findIndex(n => n.id === notificationId);
        
        if (index >= 0) {
          // If the deleted notification was unread, decrement the count
          if (!state.notifications[index].recipient.is_read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          // Remove notification from array
          state.notifications.splice(index, 1);
        }
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete notification';
      });

    // Handle fetchNotificationPreferences actions
    builder
      .addCase(fetchNotificationPreferences.pending, (state) => {
        state.preferencesLoading = true;
        state.preferencesError = null;
      })
      .addCase(fetchNotificationPreferences.fulfilled, (state, action) => {
        state.preferencesLoading = false;
        state.preferences = action.payload;
      })
      .addCase(fetchNotificationPreferences.rejected, (state, action) => {
        state.preferencesLoading = false;
        state.preferencesError = action.error.message || 'Failed to fetch notification preferences';
      });

    // Handle updateNotificationPreferences actions
    builder
      .addCase(updateNotificationPreferences.pending, (state) => {
        state.preferencesLoading = true;
        state.preferencesError = null;
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.preferencesLoading = false;
        state.preferences = action.payload;
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.preferencesLoading = false;
        state.preferencesError = action.error.message || 'Failed to update notification preferences';
      });
  },
});

// Extract action creator for adding real-time notifications
export const { addRealTimeNotification } = notificationsSlice.actions;

// Selectors
export const selectNotifications = (state: { notifications: NotificationState }) => 
  state.notifications.notifications;

export const selectUnreadCount = (state: { notifications: NotificationState }) => 
  state.notifications.unreadCount;

export const selectNotificationPreferences = (state: { notifications: NotificationState }) => 
  state.notifications.preferences;

export const selectNotificationsLoading = (state: { notifications: NotificationState }) => 
  state.notifications.loading;

export const selectNotificationsError = (state: { notifications: NotificationState }) => 
  state.notifications.error;

export const selectPreferencesLoading = (state: { notifications: NotificationState }) => 
  state.notifications.preferencesLoading;

export const selectPreferencesError = (state: { notifications: NotificationState }) => 
  state.notifications.preferencesError;

export default notificationsSlice.reducer;