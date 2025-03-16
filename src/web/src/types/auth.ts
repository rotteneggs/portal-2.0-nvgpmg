import { ApiResponse } from './api';

/**
 * Interface representing a user in the system
 */
export interface User {
  id: number;
  email: string;
  email_verified_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  has_mfa_enabled: boolean;
  roles: Role[];
  profile: UserProfile | null;
  full_name: string;
}

/**
 * Interface representing a user's profile information
 */
export interface UserProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  phone_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  notification_preferences: NotificationPreferences | null;
  full_name: string;
  formatted_address: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface representing a user role for access control
 */
export interface Role {
  id: number;
  name: string;
  description: string | null;
  is_system_role: boolean;
  permissions: Permission[];
}

/**
 * Interface representing a permission for access control
 */
export interface Permission {
  id: number;
  name: string;
  description: string | null;
  resource: string;
  action: string;
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
 * Interface for login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * Interface for login response data
 */
export interface LoginResponse {
  token: string;
  user: User;
  requires_mfa: boolean;
  mfa_methods: string[];
}

/**
 * Interface for registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  password_confirmation: string;
  first_name: string;
  last_name: string;
}

/**
 * Interface for registration response data
 */
export interface RegisterResponse {
  token: string;
  user: User;
}

/**
 * Interface for forgot password request payload
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Interface for reset password request payload
 */
export interface ResetPasswordRequest {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

/**
 * Interface for email verification request payload
 */
export interface VerifyEmailRequest {
  id: string;
  hash: string;
}

/**
 * Interface for MFA verification request payload
 */
export interface MfaVerifyRequest {
  email: string;
  method: string;
  code: string;
}

/**
 * Interface for MFA setup response data
 */
export interface MfaSetupResponse {
  method: string;
  secret: string;
  qr_code: string;
  recovery_codes: string[];
}

/**
 * Interface for authentication state in Redux store
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  requiresMfa: boolean;
  mfaMethods: string[];
}