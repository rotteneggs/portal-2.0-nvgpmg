/**
 * TypeScript type definitions for user-related data structures in the Student Admissions Enrollment Platform.
 * This file defines interfaces for user data, user profiles, roles, permissions, and related
 * request/response types for user management operations.
 */

import { ID, Timestamp, Nullable, Address } from './common';
import { ApiQueryParams, ApiPaginatedResponse } from './api';

/**
 * Interface representing a user in the system
 */
export interface User {
  id: ID;
  email: string;
  email_verified_at: Nullable<Timestamp>;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_login_at: Nullable<Timestamp>;
  has_mfa_enabled: boolean;
  roles: Role[];
  permissions: string[];
  profile: Nullable<UserProfile>;
  profile_picture_url: Nullable<string>;
}

/**
 * Interface representing a user's profile information
 */
export interface UserProfile {
  id: ID;
  user_id: ID;
  first_name: string;
  last_name: string;
  date_of_birth: Nullable<string>;
  phone_number: Nullable<string>;
  address_line1: Nullable<string>;
  address_line2: Nullable<string>;
  city: Nullable<string>;
  state: Nullable<string>;
  postal_code: Nullable<string>;
  country: Nullable<string>;
  notification_preferences: Nullable<NotificationPreferences>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Interface representing a user role for access control
 */
export interface Role {
  id: ID;
  name: string;
  description: Nullable<string>;
  is_system_role: boolean;
  permissions: Permission[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Interface representing a permission for access control
 */
export interface Permission {
  id: ID;
  name: string;
  description: Nullable<string>;
  resource: string;
  action: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Interface representing user notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  in_app: boolean;
  application_updates: string[];
  document_updates: string[];
  payment_updates: string[];
  marketing: boolean;
}

/**
 * Interface for profile update request payload
 */
export interface UpdateProfileRequest {
  first_name: string;
  last_name: string;
  date_of_birth: Nullable<string>;
  phone_number: Nullable<string>;
  address_line1: Nullable<string>;
  address_line2: Nullable<string>;
  city: Nullable<string>;
  state: Nullable<string>;
  postal_code: Nullable<string>;
  country: Nullable<string>;
}

/**
 * Interface for notification preferences update request payload
 */
export interface UpdateNotificationPreferencesRequest {
  email: boolean;
  sms: boolean;
  in_app: boolean;
  application_updates: string[];
  document_updates: string[];
  payment_updates: string[];
  marketing: boolean;
}

/**
 * Interface for password change request payload
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

/**
 * Interface for filtering users in list requests
 */
export interface UserFilters {
  role: string;
  is_active: boolean;
  has_verified_email: boolean;
  created_after: string;
  created_before: string;
  last_login_after: string;
  last_login_before: string;
}

/**
 * Interface for creating a new user (admin only)
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  password_confirmation: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
}

/**
 * Interface for updating a user (admin only)
 */
export interface UpdateUserRequest {
  email: string;
  is_active: boolean;
  roles: string[];
}

/**
 * Interface for paginated user list response
 */
export interface UserListResponse {
  data: User[];
  meta: object;
}

/**
 * Interface for user statistics data
 */
export interface UserStatistics {
  roleStats: Record<string, number>;
  activeStats: { active: number; inactive: number };
  verificationStats: { verified: number; unverified: number };
  registrationTrend: Record<string, number>;
}