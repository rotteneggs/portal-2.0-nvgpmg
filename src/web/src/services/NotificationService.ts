import { io, Socket } from 'socket.io-client'; // socket.io-client v4.6.1
import { NotificationWithRecipient, NotificationType } from '../types/notification';

/**
 * Mapping of notification types to their corresponding sound file paths
 */
const NOTIFICATION_SOUNDS: Record<NotificationType, string> = {
  [NotificationType.APPLICATION_STATUS_CHANGE]: '/sounds/status-change.mp3',
  [NotificationType.DOCUMENT_VERIFIED]: '/sounds/document-verified.mp3',
  [NotificationType.DOCUMENT_REJECTED]: '/sounds/document-rejected.mp3',
  [NotificationType.PAYMENT_RECEIVED]: '/sounds/payment-received.mp3',
  [NotificationType.PAYMENT_FAILED]: '/sounds/payment-failed.mp3',
  [NotificationType.MESSAGE_RECEIVED]: '/sounds/message-received.mp3',
  [NotificationType.DEADLINE_REMINDER]: '/sounds/deadline-reminder.mp3',
  [NotificationType.ADMISSION_DECISION]: '/sounds/admission-decision.mp3',
  [NotificationType.FINANCIAL_AID_UPDATE]: '/sounds/financial-aid-update.mp3',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: '/sounds/system-announcement.mp3',
};

/**
 * Subscribe to real-time notifications via WebSocket
 * 
 * @param userId - The ID of the current user
 * @param onNotificationReceived - Callback function to handle received notifications
 * @returns Function to unsubscribe and clean up the WebSocket connection
 */
const subscribeToRealTimeNotifications = (
  userId: string,
  onNotificationReceived: (notification: NotificationWithRecipient) => void
): (() => void) => {
  // Initialize WebSocket connection to notification server
  const socket: Socket = io(process.env.REACT_APP_WEBSOCKET_URL || '', {
    path: '/ws/notifications',
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: true,
    auth: {
      token: localStorage.getItem('token') // Use authentication token if available
    }
  });

  // Connect to the server and handle connection events
  socket.on('connect', () => {
    console.log('Connected to notification server');
    
    // Join user-specific notification channel
    socket.emit('subscribe', { userId });
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Failed to connect to notification server:', error);
  });

  // Set up event listener for 'notification' events
  socket.on('notification', (notification: NotificationWithRecipient) => {
    // Call the provided callback when a new notification is received
    onNotificationReceived(notification);
    
    // Play notification sound if appropriate
    if (shouldPlaySound(notification.type)) {
      playNotificationSound(notification.type);
    }
  });

  // Return unsubscribe function that disconnects the socket
  return () => {
    if (socket.connected) {
      socket.emit('unsubscribe', { userId });
      socket.disconnect();
      console.log('Disconnected from notification server');
    }
  };
};

/**
 * Play sound alert for a notification based on its type
 * 
 * @param notificationType - The type of notification
 */
const playNotificationSound = (notificationType: NotificationType): void => {
  try {
    // Get sound file path from NOTIFICATION_SOUNDS based on notificationType
    const soundPath = NOTIFICATION_SOUNDS[notificationType];
    
    if (!soundPath) {
      console.warn(`No sound defined for notification type: ${notificationType}`);
      return;
    }
    
    // Create new Audio object with the sound file path
    const audio = new Audio(soundPath);
    
    // Set volume to appropriate level (80%)
    audio.volume = 0.8;
    
    // Play the sound
    audio.play().catch(error => {
      console.error('Error playing notification sound:', error);
    });
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

/**
 * Format notification content for display, replacing placeholders with actual values
 * 
 * @param notification - The notification to format
 * @returns Formatted notification content
 */
const formatNotificationContent = (notification: NotificationWithRecipient): string => {
  // Extract content and data from notification
  let { content } = notification;
  const { data } = notification;
  
  // If no content or no data for placeholder replacement, return content as is
  if (!content || !data) {
    return content;
  }
  
  // Replace placeholders in content with values from data
  // Placeholders are in the format {{placeholder_name}}
  content = content.replace(/\{\{(\w+)\}\}/g, (match, placeholder) => {
    return data[placeholder] !== undefined ? String(data[placeholder]) : match;
  });
  
  // In a production environment, consider using a dedicated HTML sanitizer library
  // This is a simple implementation for basic safety
  content = content.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#039;');
  
  return content;
};

/**
 * Get appropriate icon for a notification based on its type
 * 
 * @param notificationType - The type of notification
 * @returns Icon name or path
 */
const getNotificationIcon = (notificationType: NotificationType): string => {
  // Switch on notificationType to determine appropriate icon
  switch (notificationType) {
    case NotificationType.APPLICATION_STATUS_CHANGE:
      return 'status_change';
    case NotificationType.DOCUMENT_VERIFIED:
      return 'check_circle';
    case NotificationType.DOCUMENT_REJECTED:
      return 'cancel';
    case NotificationType.PAYMENT_RECEIVED:
      return 'payments';
    case NotificationType.PAYMENT_FAILED:
      return 'money_off';
    case NotificationType.MESSAGE_RECEIVED:
      return 'message';
    case NotificationType.DEADLINE_REMINDER:
      return 'alarm';
    case NotificationType.ADMISSION_DECISION:
      return 'school';
    case NotificationType.FINANCIAL_AID_UPDATE:
      return 'attach_money';
    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return 'campaign';
    default:
      return 'notifications'; // Default icon
  }
};

/**
 * Determine if sound should be played for a notification based on user preferences
 * 
 * @param notificationType - The type of notification
 * @returns Whether sound should be played
 */
const shouldPlaySound = (notificationType: NotificationType): boolean => {
  // Get user preferences from local storage
  const userPreferencesString = localStorage.getItem('notification_preferences');
  
  if (!userPreferencesString) {
    // If no preferences are stored, default to true (play sounds)
    return true;
  }
  
  try {
    const userPreferences = JSON.parse(userPreferencesString);
    
    // Check if notification sounds are enabled globally
    if (userPreferences.sound_enabled === false) {
      return false;
    }
    
    // Check if specific notification type sounds are enabled
    if (userPreferences.notification_types && 
        userPreferences.notification_types[notificationType] !== undefined) {
      return userPreferences.notification_types[notificationType].sound_enabled !== false;
    }
    
    // Default to true if no specific preference is set
    return true;
  } catch (error) {
    console.error('Error parsing notification preferences:', error);
    return true; // Default to true in case of errors
  }
};

export default {
  subscribeToRealTimeNotifications,
  playNotificationSound,
  formatNotificationContent,
  getNotificationIcon,
  shouldPlaySound
};