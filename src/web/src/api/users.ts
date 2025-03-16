/**
 * API client module for user-related endpoints in the Student Admissions Enrollment Platform.
 * Provides functions to interact with the user API endpoints for profile management,
 * role and permission management, and administrative user operations.
 */
import apiClient from './apiClient';
import {
  User,
  UserProfile,
  UpdateProfileRequest,
  UpdateNotificationPreferencesRequest,
  ChangePasswordRequest,
  UserFilters,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UserStatistics
} from '../types/user';
import { ApiQueryParams } from '../types/api';

/**
 * Gets the current authenticated user's profile
 * @returns Promise resolving to user profile data
 */
export const getCurrentUser = (): Promise<User> => {
  return apiClient.get('/users/me');
};

/**
 * Updates the current user's profile information
 * @param profileData - Profile data to update
 * @returns Promise resolving to updated user data
 */
export const updateProfile = (profileData: UpdateProfileRequest): Promise<User> => {
  return apiClient.put('/users/profile', profileData);
};

/**
 * Updates the current user's notification preferences
 * @param preferences - Notification preferences to update
 * @returns Promise resolving to updated user data
 */
export const updateNotificationPreferences = (
  preferences: UpdateNotificationPreferencesRequest
): Promise<User> => {
  return apiClient.put('/users/notification-preferences', preferences);
};

/**
 * Changes the current user's password
 * @param passwordData - Object containing current and new password
 * @returns Promise resolving to success status and message
 */
export const changePassword = (
  passwordData: ChangePasswordRequest
): Promise<{ success: boolean; message: string }> => {
  return apiClient.post('/users/change-password', passwordData);
};

/**
 * Uploads a profile picture for the current user
 * @param file - The image file to upload
 * @returns Promise resolving to success status and the URL of the uploaded picture
 */
export const uploadProfilePicture = (
  file: File
): Promise<{ success: boolean; profile_picture_url: string }> => {
  return apiClient.upload('/users/profile-picture', file);
};

/**
 * Deletes the current user's profile picture
 * @returns Promise resolving to success status and message
 */
export const deleteProfilePicture = (): Promise<{ success: boolean; message: string }> => {
  return apiClient.delete('/users/profile-picture');
};

/**
 * Checks if an email address is available for registration
 * @param email - Email address to check
 * @returns Promise resolving to availability status
 */
export const checkEmailAvailability = (email: string): Promise<{ available: boolean }> => {
  return apiClient.get('/users/check-email', { email });
};

/**
 * Gets a paginated list of users (admin only)
 * @param params - Query parameters for filtering, pagination, and sorting
 * @returns Promise resolving to paginated list of users
 */
export const getUsers = (
  params: ApiQueryParams & UserFilters = {}
): Promise<UserListResponse> => {
  return apiClient.get('/admin/users', params);
};

/**
 * Gets a specific user by ID (admin only)
 * @param userId - The ID of the user to retrieve
 * @returns Promise resolving to the user data
 */
export const getUser = (userId: number): Promise<User> => {
  return apiClient.get(`/admin/users/${userId}`);
};

/**
 * Creates a new user (admin only)
 * @param userData - The user data to create
 * @returns Promise resolving to the created user data
 */
export const createUser = (userData: CreateUserRequest): Promise<User> => {
  return apiClient.post('/admin/users', userData);
};

/**
 * Updates a user (admin only)
 * @param userId - The ID of the user to update
 * @param userData - The user data to update
 * @returns Promise resolving to the updated user data
 */
export const updateUser = (userId: number, userData: UpdateUserRequest): Promise<User> => {
  return apiClient.put(`/admin/users/${userId}`, userData);
};

/**
 * Deletes a user (admin only)
 * @param userId - The ID of the user to delete
 * @returns Promise resolving to success status and message
 */
export const deleteUser = (userId: number): Promise<{ success: boolean; message: string }> => {
  return apiClient.delete(`/admin/users/${userId}`);
};

/**
 * Searches for users by name, email, or other criteria (admin only)
 * @param searchTerm - The search term to query
 * @param params - Additional query parameters for filtering, pagination, and sorting
 * @returns Promise resolving to paginated search results
 */
export const searchUsers = (
  searchTerm: string,
  params: ApiQueryParams & UserFilters = {}
): Promise<UserListResponse> => {
  return apiClient.get('/admin/users/search', { search: searchTerm, ...params });
};

/**
 * Assigns a role to a user (admin only)
 * @param userId - The ID of the user
 * @param roleName - The name of the role to assign
 * @returns Promise resolving to the updated user data
 */
export const assignRole = (userId: number, roleName: string): Promise<User> => {
  return apiClient.post(`/admin/users/${userId}/roles`, { role: roleName });
};

/**
 * Removes a role from a user (admin only)
 * @param userId - The ID of the user
 * @param roleName - The name of the role to remove
 * @returns Promise resolving to the updated user data
 */
export const removeRole = (userId: number, roleName: string): Promise<User> => {
  return apiClient.delete(`/admin/users/${userId}/roles/${roleName}`);
};

/**
 * Syncs a user's roles with the provided roles (admin only)
 * @param userId - The ID of the user
 * @param roleNames - Array of role names to assign to the user
 * @returns Promise resolving to the updated user data
 */
export const syncRoles = (userId: number, roleNames: string[]): Promise<User> => {
  return apiClient.put(`/admin/users/${userId}/roles`, { roles: roleNames });
};

/**
 * Activates a user account (admin only)
 * @param userId - The ID of the user to activate
 * @returns Promise resolving to the updated user data
 */
export const activateUser = (userId: number): Promise<User> => {
  return apiClient.post(`/admin/users/${userId}/activate`);
};

/**
 * Deactivates a user account (admin only)
 * @param userId - The ID of the user to deactivate
 * @returns Promise resolving to the updated user data
 */
export const deactivateUser = (userId: number): Promise<User> => {
  return apiClient.post(`/admin/users/${userId}/deactivate`);
};

/**
 * Gets all permissions for a user (admin only)
 * @param userId - The ID of the user
 * @returns Promise resolving to array of permission names
 */
export const getUserPermissions = (userId: number): Promise<string[]> => {
  return apiClient.get(`/admin/users/${userId}/permissions`);
};

/**
 * Gets user statistics (counts by role, active/inactive) (admin only)
 * @returns Promise resolving to user statistics
 */
export const getUserStatistics = (): Promise<UserStatistics> => {
  return apiClient.get('/admin/users/statistics');
};

/**
 * Creates multiple users in bulk (admin only)
 * @param usersData - Array of user data objects to create
 * @returns Promise resolving to bulk creation results
 */
export const bulkCreateUsers = (
  usersData: CreateUserRequest[]
): Promise<{ success: boolean; created: number; errors: any[] }> => {
  return apiClient.post('/admin/users/bulk', usersData);
};

/**
 * Updates multiple users in bulk (admin only)
 * @param usersData - Array of user data objects with IDs to update
 * @returns Promise resolving to bulk update results
 */
export const bulkUpdateUsers = (
  usersData: Array<{ id: number } & UpdateUserRequest>
): Promise<{ success: boolean; updated: number; errors: any[] }> => {
  return apiClient.put('/admin/users/bulk', usersData);
};

/**
 * Deletes multiple users in bulk (admin only)
 * @param userIds - Array of user IDs to delete
 * @returns Promise resolving to bulk deletion results
 */
export const bulkDeleteUsers = (
  userIds: number[]
): Promise<{ success: boolean; deleted: number; errors: any[] }> => {
  return apiClient.post('/admin/users/bulk-delete', userIds);
};

/**
 * Gets activity logs for a specific user (admin only)
 * @param userId - The ID of the user
 * @param params - Query parameters for filtering and pagination
 * @returns Promise resolving to paginated activity logs
 */
export const getUserActivityLogs = (
  userId: number,
  params: ApiQueryParams = {}
): Promise<any> => {
  return apiClient.get(`/admin/users/${userId}/activity-logs`, params);
};