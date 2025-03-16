import { useState, useEffect, useCallback } from 'react'; // v18.0.0
import { useSelector, useDispatch } from 'react-redux'; // v8.0.5
import {
  NotificationWithRecipient,
  NotificationPreferences,
  GetNotificationsParams
} from '../types/notification';
import {
  selectNotifications,
  selectUnreadCount,
  selectNotificationsLoading,
  selectNotificationsError,
  selectNotificationPreferences,
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  fetchNotificationPreferences,
  updateNotificationPreferences
} from '../redux/slices/notificationsSlice';

/**
 * Interface for pagination state used in the notification hook
 */
interface PaginationState {
  page: number;
  perPage: number;
  hasMore: boolean;
  loadingMore: boolean;
}

/**
 * Return type for the useNotification hook
 */
interface NotificationHookReturn {
  notifications: NotificationWithRecipient[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreferences | null;
  fetchNotifications: (params: GetNotificationsParams) => void;
  fetchUnreadCount: () => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  fetchPreferences: () => void;
  updatePreferences: (preferences: NotificationPreferences) => void;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * Custom hook that provides notification functionality for the Student Admissions Enrollment Platform.
 * This hook encapsulates notification state management and operations, making them easily accessible
 * to components throughout the application.
 * 
 * @returns Object containing notification state and methods
 */
const useNotification = (): NotificationHookReturn => {
  const dispatch = useDispatch();
  
  // Select notification state from Redux
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);
  const error = useSelector(selectNotificationsError);
  const preferences = useSelector(selectNotificationPreferences);
  
  // Local pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    perPage: 10,
    hasMore: true,
    loadingMore: false
  });
  
  // Fetch notifications with parameters
  const fetchNotificationsCallback = useCallback((params: GetNotificationsParams) => {
    dispatch(fetchNotifications(params));
  }, [dispatch]);
  
  // Fetch unread notification count
  const fetchUnreadCountCallback = useCallback(() => {
    dispatch(fetchUnreadCount());
  }, [dispatch]);
  
  // Mark a notification as read
  const markNotificationAsReadCallback = useCallback((notificationId: string) => {
    dispatch(markAsRead({ notificationId }));
  }, [dispatch]);
  
  // Mark all notifications as read
  const markAllNotificationsAsReadCallback = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);
  
  // Fetch notification preferences
  const fetchPreferencesCallback = useCallback(() => {
    dispatch(fetchNotificationPreferences());
  }, [dispatch]);
  
  // Update notification preferences
  const updatePreferencesCallback = useCallback((preferences: NotificationPreferences) => {
    dispatch(updateNotificationPreferences({ preferences }));
  }, [dispatch]);
  
  // Load more notifications for infinite scrolling
  const loadMore = useCallback(() => {
    // Prevent loading more if already loading or no more to load
    if (loading || pagination.loadingMore || !pagination.hasMore) return;
    
    // Set loading state
    setPagination(prev => ({ ...prev, loadingMore: true }));
    
    // Load next page of notifications
    dispatch(fetchNotifications({
      page: pagination.page + 1,
      per_page: pagination.perPage,
      type: null,
      read: null,
      date_from: null,
      date_to: null
    }));
  }, [dispatch, pagination, loading]);
  
  // Update pagination state when loading state changes
  useEffect(() => {
    if (!loading && pagination.loadingMore) {
      // Calculate if there are more notifications to load
      const expectedCount = pagination.page * pagination.perPage;
      const hasMore = notifications.length >= expectedCount;
      
      setPagination(prev => ({
        ...prev,
        page: prev.page + 1,
        hasMore,
        loadingMore: false
      }));
    }
  }, [loading, notifications.length, pagination]);
  
  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCountCallback();
  }, [fetchUnreadCountCallback]);
  
  return {
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    fetchNotifications: fetchNotificationsCallback,
    fetchUnreadCount: fetchUnreadCountCallback,
    markNotificationAsRead: markNotificationAsReadCallback,
    markAllNotificationsAsRead: markAllNotificationsAsReadCallback,
    fetchPreferences: fetchPreferencesCallback,
    updatePreferences: updatePreferencesCallback,
    hasMore: pagination.hasMore,
    loadMore
  };
};

export default useNotification;