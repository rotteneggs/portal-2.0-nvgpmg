/**
 * API client module for notification-related operations in the Student Admissions Enrollment Platform.
 * Provides functions for fetching notifications, managing notification status, and handling 
 * notification preferences.
 */
import apiClient from './apiClient';
import {
  NotificationWithRecipient,
  NotificationPreferences,
  GetNotificationsParams,
  NotificationsResponse,
  NotificationCountResponse
} from '../types/notification';
import { ApiResponse } from '../types/api';

/**
 * Fetch paginated list of notifications
 * @param params - Query parameters for filtering and pagination
 * @returns Promise resolving to paginated notifications response
 */
export const getNotifications = (
  params: GetNotificationsParams
): Promise<ApiResponse<NotificationsResponse>> => {
  return apiClient.get('notifications', params);
};

/**
 * Fetch a specific notification by ID
 * @param id - Notification ID
 * @returns Promise resolving to notification details
 */
export const getNotification = (
  id: string
): Promise<ApiResponse<NotificationWithRecipient>> => {
  return apiClient.get(`notifications/${id}`);
};

/**
 * Get count of unread notifications
 * @returns Promise resolving to unread notification count
 */
export const getUnreadCount = (): Promise<ApiResponse<NotificationCountResponse>> => {
  return apiClient.get('notifications/unread/count');
};

/**
 * Mark a notification as read
 * @param id - Notification ID
 * @returns Promise resolving to success response
 */
export const markAsRead = (
  id: string
): Promise<ApiResponse<{success: boolean}>> => {
  return apiClient.post(`notifications/${id}/read`, {});
};

/**
 * Mark all notifications as read
 * @returns Promise resolving to count of notifications marked as read
 */
export const markAllAsRead = (): Promise<ApiResponse<{count: number}>> => {
  return apiClient.post('notifications/read-all', {});
};

/**
 * Delete a specific notification
 * @param id - Notification ID
 * @returns Promise resolving to success response
 */
export const deleteNotification = (
  id: string
): Promise<ApiResponse<{success: boolean}>> => {
  return apiClient.delete(`notifications/${id}`);
};

/**
 * Get notification preferences
 * @returns Promise resolving to notification preferences
 */
export const getNotificationPreferences = (): Promise<ApiResponse<NotificationPreferences>> => {
  return apiClient.get('notifications/preferences');
};

/**
 * Update notification preferences
 * @param preferences - Notification preferences to update
 * @returns Promise resolving to success response
 */
export const updateNotificationPreferences = (
  preferences: NotificationPreferences
): Promise<ApiResponse<{success: boolean}>> => {
  return apiClient.put('notifications/preferences', preferences);
};