// Index file that exports all authentication-related components for the Student Admissions Enrollment Platform.
// This file serves as a central export point for login, registration, password reset, and email verification components.

import LoginForm, { LoginFormProps } from './LoginForm'; // Import login form component for re-export
import RegisterForm, { RegisterFormProps } from './RegisterForm'; // Import registration form component for re-export
import ForgotPasswordForm, { ForgotPasswordFormProps } from './ForgotPasswordForm'; // Import forgot password form component for re-export
import ResetPasswordForm, { ResetPasswordFormProps } from './ResetPasswordForm'; // Import reset password form component for setting new password
import VerifyEmail from './VerifyEmail'; // Import email verification component for re-export

// Export login form component for user authentication
export { LoginForm };
export type { LoginFormProps };

// Export registration form component for new user sign-up
export { RegisterForm };
export type { RegisterFormProps };

// Export forgot password form component for password recovery initiation
export { ForgotPasswordForm };
export type { ForgotPasswordFormProps };

// Export reset password form component for setting new password
export { ResetPasswordForm };
export type { ResetPasswordFormProps };

// Export email verification component for validating user email addresses
export { VerifyEmail };