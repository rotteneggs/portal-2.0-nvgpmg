/**
 * API client module for authentication-related endpoints in the Student Admissions Enrollment Platform.
 * This file provides functions to interact with the authentication API endpoints for user registration,
 * login, logout, password management, and multi-factor authentication.
 */
import apiClient from './apiClient';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  MfaVerifyRequest,
  MfaSetupResponse,
  User
} from '../types/auth';
import { ApiResponse } from '../types/api';

/**
 * Authenticates a user with email and password
 * @param credentials - The login credentials
 * @returns Promise resolving to login response with token and user data
 */
export const login = (credentials: LoginRequest): Promise<LoginResponse> => {
  return apiClient.post<LoginResponse>('/auth/login', credentials);
};

/**
 * Registers a new user account
 * @param userData - The user registration data
 * @returns Promise resolving to registration response with token and user data
 */
export const register = (userData: RegisterRequest): Promise<RegisterResponse> => {
  return apiClient.post<RegisterResponse>('/auth/register', userData);
};

/**
 * Logs out the current user
 * @returns Promise resolving when logout is complete
 */
export const logout = (): Promise<void> => {
  return apiClient.post<void>('/auth/logout', {});
};

/**
 * Gets the current authenticated user's profile
 * @returns Promise resolving to user profile data
 */
export const getCurrentUser = (): Promise<User> => {
  return apiClient.get<User>('/auth/me');
};

/**
 * Verifies a user's email address
 * @param verificationData - The email verification data (id and hash)
 * @returns Promise resolving when verification is complete
 */
export const verifyEmail = (verificationData: VerifyEmailRequest): Promise<void> => {
  const { id, hash } = verificationData;
  return apiClient.get<void>(`/auth/verify-email/${id}/${hash}`);
};

/**
 * Requests a password reset email
 * @param data - The forgot password request data containing email
 * @returns Promise resolving when request is sent
 */
export const forgotPassword = (data: ForgotPasswordRequest): Promise<void> => {
  return apiClient.post<void>('/auth/forgot-password', data);
};

/**
 * Resets a user's password using a token
 * @param data - The reset password request data
 * @returns Promise resolving when password is reset
 */
export const resetPassword = (data: ResetPasswordRequest): Promise<void> => {
  return apiClient.post<void>('/auth/reset-password', data);
};

/**
 * Changes the current user's password
 * @param currentPassword - The user's current password
 * @param newPassword - The new password
 * @param newPasswordConfirmation - Confirmation of the new password
 * @returns Promise resolving when password is changed
 */
export const changePassword = (
  currentPassword: string,
  newPassword: string,
  newPasswordConfirmation: string
): Promise<void> => {
  return apiClient.post<void>('/auth/change-password', {
    current_password: currentPassword,
    password: newPassword,
    password_confirmation: newPasswordConfirmation
  });
};

/**
 * Verifies a multi-factor authentication code
 * @param data - The MFA verification data
 * @returns Promise resolving to login response with token and user data
 */
export const verifyMfa = (data: MfaVerifyRequest): Promise<LoginResponse> => {
  return apiClient.post<LoginResponse>('/auth/mfa/verify', data);
};

/**
 * Sets up multi-factor authentication for a user
 * @param method - The MFA method (e.g., 'totp', 'sms')
 * @param methodData - Additional data required for the MFA method
 * @returns Promise resolving to MFA setup data
 */
export const setupMfa = (
  method: string,
  methodData: Record<string, any>
): Promise<MfaSetupResponse> => {
  return apiClient.post<MfaSetupResponse>('/auth/mfa/setup', {
    method,
    ...methodData
  });
};

/**
 * Verifies MFA setup by confirming a test code
 * @param method - The MFA method (e.g., 'totp', 'sms')
 * @param code - The verification code
 * @returns Promise resolving when setup is verified
 */
export const verifyMfaSetup = (
  method: string,
  code: string
): Promise<void> => {
  return apiClient.post<void>('/auth/mfa/verify-setup', {
    method,
    code
  });
};

/**
 * Disables multi-factor authentication for a user
 * @param password - The user's password for verification
 * @returns Promise resolving when MFA is disabled
 */
export const disableMfa = (password: string): Promise<void> => {
  return apiClient.post<void>('/auth/mfa/disable', { password });
};

/**
 * Gets recovery codes for MFA
 * @returns Promise resolving to array of recovery codes
 */
export const getRecoveryCodes = (): Promise<string[]> => {
  return apiClient.get<string[]>('/auth/mfa/recovery-codes');
};

/**
 * Uses a recovery code to bypass MFA
 * @param email - The user's email
 * @param recoveryCode - The recovery code
 * @returns Promise resolving to login response with token and user data
 */
export const useRecoveryCode = (
  email: string,
  recoveryCode: string
): Promise<LoginResponse> => {
  return apiClient.post<LoginResponse>('/auth/mfa/recovery', {
    email,
    recovery_code: recoveryCode
  });
};

/**
 * Refreshes the authentication token
 * @returns Promise resolving to object containing new token
 */
export const refreshToken = (): Promise<{ token: string }> => {
  return apiClient.post<{ token: string }>('/auth/refresh', {});
};

/**
 * Resends the email verification link
 * @param email - The email address to send the verification link to
 * @returns Promise resolving when email is sent
 */
export const resendVerificationEmail = (email: string): Promise<void> => {
  return apiClient.post<void>('/auth/email/resend', { email });
};