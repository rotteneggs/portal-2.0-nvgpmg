import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'; // v18.0.0
import { 
  NotificationWithRecipient, 
  NotificationPreferences, 
  GetNotificationsParams 
} from '../types/notification';
import useNotification from '../hooks/useNotification';
import notificationService from '../services/NotificationService';

/**
 * Type definition for notification context value
 */
interface NotificationContextType {
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
 * Props for the NotificationProvider component
 */
interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * React context for notification management
 */
export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Custom hook to use the NotificationContext
 * 
 * @returns Notification context value
 * @throws Error if used outside of NotificationProvider
 */
export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

/**
 * Provider component for notification context
 * 
 * This component centralizes notification state and operations from the useNotification hook
 * and sets up real-time notification subscription for immediate updates across the application.
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  // Use custom hook for notification functionality
  const notificationData = useNotification();
  
  // Track most recent notification received via real-time channel
  const [realtimeNotification, setRealtimeNotification] = useState<NotificationWithRecipient | null>(null);

  // Set up real-time notification subscription
  useEffect(() => {
    // In a real implementation, the user ID would be obtained from the application's 
    // authentication system (auth context, Redux store, etc.)
    const userId = localStorage.getItem('user_id') || '';
    
    if (!userId) {
      console.warn('User ID not available, real-time notifications disabled');
      return;
    }
    
    // Subscribe to real-time notifications via WebSocket
    const unsubscribe = notificationService.subscribeToRealTimeNotifications(
      userId,
      (notification) => {
        // Store the received notification
        setRealtimeNotification(notification);
        
        // Update the unread count
        notificationData.fetchUnreadCount();
        
        // Optionally refresh the notification list
        const params: GetNotificationsParams = {
          page: 1,
          per_page: 10,
          type: null,
          read: null,
          date_from: null,
          date_to: null
        };
        notificationData.fetchNotifications(params);
      }
    );
    
    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, [notificationData.fetchUnreadCount, notificationData.fetchNotifications]);

  return (
    <NotificationContext.Provider value={notificationData}>
      {children}
    </NotificationContext.Provider>
  );
};