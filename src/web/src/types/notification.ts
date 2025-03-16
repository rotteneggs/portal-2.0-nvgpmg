/**
 * TypeScript type definitions for notifications in the Student Admissions Enrollment Platform.
 * This file defines interfaces for notification data structures, API responses, 
 * and related types used throughout the frontend application.
 */

import { User } from './user';
import { ApiResponse } from './api';

/**
 * Enumeration of notification types in the system
 */
export enum NotificationType {
  APPLICATION_STATUS_CHANGE = 'APPLICATION_STATUS_CHANGE',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  DEADLINE_REMINDER = 'DEADLINE_REMINDER',
  ADMISSION_DECISION = 'ADMISSION_DECISION',
  FINANCIAL_AID_UPDATE = 'FINANCIAL_AID_UPDATE',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT'
}

/**
 * Enumeration of notification channels for delivery
 */
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS'
}

/**
 * Interface representing a notification in the system
 */
export interface Notification {
  id: number;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  content: string;
  data: Record<string, any>; // Additional data specific to the notification type
  created_at: string;
}

/**
 * Interface representing a notification recipient 
 */
export interface NotificationRecipient {
  id: number;
  notification_id: number;
  user_id: number;
  is_sent: boolean;
  is_read: boolean;
  sent_at: string | null;
  read_at: string | null;
  is_new: boolean; // Flag for newly received notifications
  created_at: string;
}

/**
 * Interface combining notification with recipient information
 */
export interface NotificationWithRecipient {
  id: number;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  content: string;
  data: Record<string, any>;
  created_at: string;
  recipient: NotificationRecipient;
  user: User | null; // User who sent the notification (if applicable)
}

/**
 * Interface for notification channel preferences
 */
export interface NotificationChannelPreferences {
  in_app: boolean;
  email: boolean;
  sms: boolean;
}

/**
 * Interface for user notification preferences
 */
export interface NotificationPreferences {
  typePreferences: Record<NotificationType, NotificationChannelPreferences>;
  defaultPreferences: NotificationChannelPreferences;
}

/**
 * Interface for the notification state in Redux
 */
export interface NotificationState {
  notifications: NotificationWithRecipient[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  preferencesLoading: boolean;
  preferencesError: string | null;
}

/**
 * Interface for pagination metadata in API responses
 */
export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

/**
 * Interface for parameters when fetching notifications
 */
export interface GetNotificationsParams {
  page: number;
  per_page: number;
  type: NotificationType | null;
  read: boolean | null;
  date_from: string | null;
  date_to: string | null;
}

/**
 * Interface for notifications list API response
 */
export interface NotificationsResponse {
  data: NotificationWithRecipient[];
  meta: PaginationMeta;
}

/**
 * Interface for notification count API response
 */
export interface NotificationCountResponse {
  count: number;
}

/**
 * Interface for the payload when marking a notification as read
 */
export interface MarkAsReadPayload {
  notificationId: string;
}

/**
 * Interface for the payload when updating notification preferences
 */
export interface UpdatePreferencesPayload {
  preferences: NotificationPreferences;
}