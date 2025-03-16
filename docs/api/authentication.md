# Authentication API Documentation

## Introduction

The Authentication API provides endpoints for user registration, authentication, password management, email verification, and multi-factor authentication. These endpoints form the foundation of the security system for the Student Admissions Enrollment Platform.

This documentation covers all authentication-related endpoints, including request and response formats, authentication flows, and security considerations.

## Authentication Flow

The platform uses JWT (JSON Web Token) based authentication with Laravel Sanctum. The general authentication flow is as follows:

### Standard Authentication

1. User registers an account or logs in with existing credentials
2. System validates credentials and returns an access token
3. User includes the access token in the Authorization header of subsequent requests
4. When the token expires, user can use the refresh token to obtain a new access token

### Multi-Factor Authentication

1. User logs in with email and password
2. If MFA is enabled, system returns a challenge response
3. User provides the MFA code or recovery code
4. System validates the code and returns an access token
5. User includes the access token in the Authorization header of subsequent requests

### Token Usage

Include the access token in the Authorization header of your requests:

```
Authorization: Bearer {your_access_token}
```

Access tokens have a limited lifetime (15 minutes by default, or longer with the 'remember me' option) for security reasons. Use the refresh token to obtain a new access token without requiring re-authentication.

## Registration Endpoints

Endpoints for creating new user accounts.

### Register a New User

Creates a new user account with the provided information.

**URL**: `/api/v1/auth/register`

**Method**: `POST`

**Auth required**: No

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",
  "password_confirmation": "SecureP@ssw0rd",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-01",
  "phone_number": "+1234567890",
  "address_line1": "123 Main St",
  "address_line2": "Apt 4B",
  "city": "Anytown",
  "state": "State",
  "postal_code": "12345",
  "country": "United States",
  "terms_accepted": true
}
```

**Required fields**: `email`, `password`, `password_confirmation`, `first_name`, `last_name`, `terms_accepted`

**Password requirements**:
- Minimum 12 characters
- Must include at least one uppercase letter, one lowercase letter, one number, and one special character
- Must not be a commonly used password

**Success Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "email_verified_at": null,
      "profile": {
        "phone_number": "+1234567890",
        "date_of_birth": "1990-01-01",
        "address_line1": "123 Main St",
        "address_line2": "Apt 4B",
        "city": "Anytown",
        "state": "State",
        "postal_code": "12345",
        "country": "United States"
      },
      "roles": [
        "applicant"
      ]
    },
    "token": {
      "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
      "token_type": "Bearer",
      "expires_in": 900,
      "refresh_token": "def50200641f31a3c361843a141e..."
    }
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The provided data was invalid.",
    "details": {
      "email": [
        "The email has already been taken."
      ],
      "password": [
        "The password must be at least 12 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      ]
    }
  }
}
```

**Notes**:
- A verification email will be sent to the provided email address
- The user will be assigned the 'applicant' role by default
- The access token can be used immediately, but some features may require email verification

### Verify Email

Verifies a user's email address using the verification link sent to their email.

**URL**: `/api/v1/auth/verify-email/{id}/{hash}`

**Method**: `GET`

**Auth required**: No

**URL Parameters**:
- `id`: The user ID (encrypted)
- `hash`: The verification hash

**Success Response**:
```json
{
  "success": true,
  "message": "Email verified successfully."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_VERIFICATION",
    "message": "Invalid verification link or link has expired."
  }
}
```

**Notes**:
- The verification link is typically accessed via email, not directly through API calls
- The link contains an encrypted user ID and a hash for security

### Resend Verification Email

Resends the email verification link to the user's email address.

**URL**: `/api/v1/auth/resend-verification`

**Method**: `POST`

**Auth required**: No

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Verification link has been resent to your email address."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_VERIFIED",
    "message": "This email address is already verified."
  }
}
```

**Notes**:
- There is a rate limit on how frequently verification emails can be resent (typically once per hour)
- If the email is already verified, an error will be returned

## Authentication Endpoints

Endpoints for authenticating users and managing sessions.

### Login

Authenticates a user and returns an access token.

**URL**: `/api/v1/auth/login`

**Method**: `POST`

**Auth required**: No

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",
  "remember_me": true
}
```

**Success Response (No MFA)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "email_verified_at": "2023-04-01T12:00:00Z",
      "profile": {
        "phone_number": "+1234567890",
        "date_of_birth": "1990-01-01"
      },
      "roles": [
        "applicant"
      ]
    },
    "token": {
      "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
      "token_type": "Bearer",
      "expires_in": 3600,
      "refresh_token": "def50200641f31a3c361843a141e..."
    }
  },
  "message": "Login successful."
}
```

**Success Response (MFA Required)**:
```json
{
  "success": true,
  "data": {
    "mfa_required": true,
    "user_id": 1,
    "mfa_method": "email"
  },
  "message": "Multi-factor authentication required. Please check your email for the verification code."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "These credentials do not match our records."
  }
}
```

**Notes**:
- The `remember_me` parameter extends the token expiration time (default: 15 minutes, with remember_me: 12 hours)
- If MFA is enabled for the user, a challenge response will be returned instead of the token
- The user must then complete the MFA verification to receive the access token

### Verify MFA

Verifies a multi-factor authentication code and returns an access token.

**URL**: `/api/v1/auth/verify-mfa`

**Method**: `POST`

**Auth required**: No

**Request Body**:
```json
{
  "user_id": 1,
  "mfa_code": "123456"
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "email_verified_at": "2023-04-01T12:00:00Z",
      "profile": {
        "phone_number": "+1234567890",
        "date_of_birth": "1990-01-01"
      },
      "roles": [
        "applicant"
      ]
    },
    "token": {
      "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
      "token_type": "Bearer",
      "expires_in": 900,
      "refresh_token": "def50200641f31a3c361843a141e..."
    }
  },
  "message": "MFA verification successful."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_MFA_CODE",
    "message": "The MFA code is invalid or has expired."
  }
}
```

**Notes**:
- MFA codes are typically 6-digit numeric codes
- MFA codes expire after 10 minutes
- There is a limit on failed MFA attempts (typically 5) before temporary lockout

### Use Recovery Code

Uses a recovery code to bypass MFA and returns an access token.

**URL**: `/api/v1/auth/recovery-code`

**Method**: `POST`

**Auth required**: No

**Request Body**:
```json
{
  "user_id": 1,
  "recovery_code": "ABCD-1234-EFGH-5678"
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "email_verified_at": "2023-04-01T12:00:00Z",
      "profile": {
        "phone_number": "+1234567890",
        "date_of_birth": "1990-01-01"
      },
      "roles": [
        "applicant"
      ]
    },
    "token": {
      "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
      "token_type": "Bearer",
      "expires_in": 900,
      "refresh_token": "def50200641f31a3c361843a141e..."
    }
  },
  "message": "Recovery code accepted. This code cannot be used again."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_RECOVERY_CODE",
    "message": "The recovery code is invalid or has already been used."
  }
}
```

**Notes**:
- Recovery codes are one-time use only
- After using a recovery code, it's recommended to generate new recovery codes
- Recovery codes are typically formatted as 4 groups of 4 alphanumeric characters

### Refresh Token

Refreshes an expired access token using a valid refresh token.

**URL**: `/api/v1/auth/refresh`

**Method**: `POST`

**Auth required**: No

**Request Body**:
```json
{
  "refresh_token": "def50200641f31a3c361843a141e..."
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "token": {
      "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
      "token_type": "Bearer",
      "expires_in": 900,
      "refresh_token": "def50200641f31a3c361843a141e..."
    }
  },
  "message": "Token refreshed successfully."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "The refresh token is invalid or has expired."
  }
}
```

**Notes**:
- Refresh tokens have a longer lifetime than access tokens (typically 12 hours)
- Each refresh operation invalidates the previous refresh token and issues a new one
- If a refresh token is suspected to be compromised, all user tokens can be revoked through the logout endpoint

### Logout

Invalidates the current access token and all associated refresh tokens.

**URL**: `/api/v1/auth/logout`

**Method**: `POST`

**Auth required**: Yes (Bearer Token)

**Request Body**: None

**Success Response**:
```json
{
  "success": true,
  "message": "Successfully logged out."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthenticated."
  }
}
```

**Notes**:
- This endpoint invalidates the current token and adds it to a blacklist
- All refresh tokens associated with the current token are also invalidated
- For security reasons, it's recommended to remove the token from client storage after logout

### Get Current User

Retrieves the profile information of the currently authenticated user.

**URL**: `/api/v1/auth/me`

**Method**: `GET`

**Auth required**: Yes (Bearer Token)

**Success Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "email_verified_at": "2023-04-01T12:00:00Z",
      "profile": {
        "phone_number": "+1234567890",
        "date_of_birth": "1990-01-01",
        "address_line1": "123 Main St",
        "address_line2": "Apt 4B",
        "city": "Anytown",
        "state": "State",
        "postal_code": "12345",
        "country": "United States"
      },
      "roles": [
        "applicant"
      ],
      "mfa_enabled": true,
      "mfa_method": "email"
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthenticated."
  }
}
```

**Notes**:
- This endpoint is useful for retrieving the current user's profile and permissions
- It can be used to check if the current token is still valid
- The response includes the user's roles, which can be used for authorization checks

## Password Management Endpoints

Endpoints for managing user passwords.

### Forgot Password

Sends a password reset link to the user's email address.

**URL**: `/api/v1/auth/forgot-password`

**Method**: `POST`

**Auth required**: No

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Password reset link has been sent to your email address."
}
```

**Notes**:
- For security reasons, the API returns a success response even if the email doesn't exist in the system
- The password reset link expires after a certain period (typically 1 hour)
- There is a rate limit on password reset requests (typically 3 per hour)

### Reset Password

Resets a user's password using a valid reset token.

**URL**: `/api/v1/auth/reset-password`

**Method**: `POST`

**Auth required**: No

**Request Body**:
```json
{
  "email": "user@example.com",
  "token": "a1b2c3d4e5f6g7h8i9j0",
  "password": "NewSecureP@ssw0rd",
  "password_confirmation": "NewSecureP@ssw0rd"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Password has been reset successfully."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "This password reset token is invalid or has expired."
  }
}
```

**Notes**:
- The token is typically provided via email as part of a reset link
- The new password must meet the same complexity requirements as registration
- After resetting the password, all existing tokens for the user are invalidated

### Change Password

Changes the password for the authenticated user.

**URL**: `/api/v1/auth/change-password`

**Method**: `POST`

**Auth required**: Yes (Bearer Token)

**Request Body**:
```json
{
  "current_password": "CurrentSecureP@ssw0rd",
  "password": "NewSecureP@ssw0rd",
  "password_confirmation": "NewSecureP@ssw0rd"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CURRENT_PASSWORD",
    "message": "The provided current password is incorrect."
  }
}
```

**Notes**:
- The current password is required for security verification
- The new password must meet the same complexity requirements as registration
- The new password cannot be the same as the current password or recent previous passwords
- After changing the password, all existing tokens except the current one are invalidated

## Multi-Factor Authentication Endpoints

Endpoints for setting up and managing multi-factor authentication.

### Setup MFA

Initiates the setup process for multi-factor authentication.

**URL**: `/api/v1/auth/setup-mfa`

**Method**: `POST`

**Auth required**: Yes (Bearer Token)

**Request Body**:
```json
{
  "mfa_method": "email"
}
```

**Supported MFA Methods**:
- `email`: Send verification codes to the user's email address
- `sms`: Send verification codes to the user's phone number (requires a verified phone number)
- `totp`: Time-based one-time password using an authenticator app

**Success Response (Email/SMS)**:
```json
{
  "success": true,
  "data": {
    "mfa_method": "email",
    "verification_code_sent": true,
    "destination": "u***@example.com"
  },
  "message": "A verification code has been sent to your email address. Please verify to complete MFA setup."
}
```

**Success Response (TOTP)**:
```json
{
  "success": true,
  "data": {
    "mfa_method": "totp",
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "message": "Scan the QR code with your authenticator app and enter the verification code to complete MFA setup."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_MFA_METHOD",
    "message": "The selected MFA method is not supported."
  }
}
```

**Notes**:
- For email and SMS methods, a verification code is sent to the user
- For TOTP method, a secret key and QR code are provided for the user to scan with an authenticator app
- The setup process must be completed by verifying a test code using the verify-mfa-setup endpoint

### Verify MFA Setup

Completes the MFA setup process by verifying a test code.

**URL**: `/api/v1/auth/verify-mfa-setup`

**Method**: `POST`

**Auth required**: Yes (Bearer Token)

**Request Body**:
```json
{
  "mfa_method": "email",
  "verification_code": "123456"
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "recovery_codes": [
      "ABCD-1234-EFGH-5678",
      "IJKL-9012-MNOP-3456",
      "QRST-7890-UVWX-1234",
      "YZ12-3456-7890-ABCD",
      "EFGH-5678-IJKL-9012",
      "MNOP-3456-QRST-7890",
      "UVWX-1234-YZ12-3456",
      "7890-ABCD-EFGH-5678"
    ]
  },
  "message": "Multi-factor authentication has been enabled successfully. Please save your recovery codes in a secure location."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_VERIFICATION_CODE",
    "message": "The verification code is invalid or has expired."
  }
}
```

**Notes**:
- The verification code is a 6-digit numeric code for all MFA methods
- Recovery codes are provided upon successful MFA setup
- Recovery codes should be stored securely as they can be used to bypass MFA if the primary method is unavailable
- Each recovery code can only be used once

### Disable MFA

Disables multi-factor authentication for the authenticated user.

**URL**: `/api/v1/auth/disable-mfa`

**Method**: `POST`

**Auth required**: Yes (Bearer Token)

**Request Body**:
```json
{
  "password": "SecureP@ssw0rd"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Multi-factor authentication has been disabled successfully."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "The provided password is incorrect."
  }
}
```

**Notes**:
- The current password is required for security verification
- Disabling MFA will invalidate all recovery codes
- For security reasons, a notification will be sent to the user's email address when MFA is disabled

### Get Recovery Codes

Retrieves or generates recovery codes for the authenticated user.

**URL**: `/api/v1/auth/recovery-codes`

**Method**: `GET`

**Auth required**: Yes (Bearer Token)

**Success Response**:
```json
{
  "success": true,
  "data": {
    "recovery_codes": [
      "ABCD-1234-EFGH-5678",
      "IJKL-9012-MNOP-3456",
      "QRST-7890-UVWX-1234",
      "YZ12-3456-7890-ABCD",
      "EFGH-5678-IJKL-9012",
      "MNOP-3456-QRST-7890",
      "UVWX-1234-YZ12-3456",
      "7890-ABCD-EFGH-5678"
    ]
  },
  "message": "Recovery codes retrieved successfully."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "MFA_NOT_ENABLED",
    "message": "Multi-factor authentication is not enabled for this account."
  }
}
```

**Notes**:
- This endpoint returns the existing recovery codes if available
- If all recovery codes have been used, new ones will be generated automatically
- Recovery codes should be stored securely as they can be used to bypass MFA if the primary method is unavailable
- Each recovery code can only be used once

## Security Considerations

Important security information for using the Authentication API.

### Token Security

- Store access tokens securely (e.g., HttpOnly cookies for web applications)
- Never store tokens in client-side storage accessible by JavaScript
- Implement token refresh logic to maintain user sessions
- Revoke tokens when they are no longer needed
- Access tokens have a limited lifetime (15 minutes by default, or longer with the 'remember me' option)

### Password Security

- Passwords must be at least 12 characters long
- Passwords must include at least one uppercase letter, one lowercase letter, one number, and one special character
- Passwords are checked against a list of commonly used passwords
- Password history is maintained to prevent reuse of recent passwords
- Failed login attempts are rate-limited to prevent brute force attacks

### Multi-Factor Authentication

- MFA adds an additional layer of security beyond passwords
- Three MFA methods are supported: email, SMS, and TOTP (authenticator app)
- Recovery codes should be stored securely as they can bypass MFA
- Each recovery code can only be used once
- MFA setup and disabling requires additional verification

### Rate Limiting

The Authentication API implements rate limiting to prevent abuse. Rate limits vary by endpoint:

- Login: 5 attempts per minute per IP address
- Registration: 3 attempts per hour per IP address
- Password Reset: 3 attempts per hour per email address
- MFA Verification: 5 attempts per 10 minutes per user

When a rate limit is exceeded, the API returns a `429 Too Many Requests` response with information about when the rate limit will reset.

## Error Codes

Common error codes returned by the Authentication API.

### Authentication Errors

- `INVALID_CREDENTIALS`: The provided email or password is incorrect
- `ACCOUNT_LOCKED`: The account has been temporarily locked due to too many failed login attempts
- `ACCOUNT_DISABLED`: The account has been disabled by an administrator
- `EMAIL_NOT_VERIFIED`: The email address has not been verified
- `UNAUTHORIZED`: The request requires authentication

### MFA Errors

- `MFA_REQUIRED`: Multi-factor authentication is required to complete login
- `INVALID_MFA_CODE`: The provided MFA code is invalid or has expired
- `INVALID_RECOVERY_CODE`: The provided recovery code is invalid or has already been used
- `MFA_NOT_ENABLED`: Multi-factor authentication is not enabled for this account
- `INVALID_MFA_METHOD`: The selected MFA method is not supported

### Password Errors

- `INVALID_RESET_TOKEN`: The password reset token is invalid or has expired
- `INVALID_CURRENT_PASSWORD`: The provided current password is incorrect
- `PASSWORD_RECENTLY_USED`: The new password has been used recently
- `PASSWORD_TOO_WEAK`: The password does not meet the complexity requirements

### Validation Errors

- `VALIDATION_ERROR`: The provided data was invalid
- `EMAIL_ALREADY_VERIFIED`: The email address is already verified
- `EMAIL_IN_USE`: The email address is already in use by another account
- `INVALID_VERIFICATION`: The verification link is invalid or has expired

### Rate Limiting Errors

- `TOO_MANY_ATTEMPTS`: Too many attempts, please try again later
- `TOO_MANY_REQUESTS`: Rate limit exceeded, please try again later

## Webhooks

The Authentication API can trigger webhooks for certain events if configured in the administrative interface.

### Authentication Events

- `user.registered`: A new user has registered
- `user.verified`: A user has verified their email address
- `user.login`: A user has logged in successfully
- `user.login_failed`: A login attempt has failed
- `user.logout`: A user has logged out
- `user.password_changed`: A user has changed their password
- `user.password_reset`: A user has reset their password
- `user.mfa_enabled`: A user has enabled multi-factor authentication
- `user.mfa_disabled`: A user has disabled multi-factor authentication

### Webhook Payload

Webhook payloads follow a consistent format:

```json
{
  "event": "user.registered",
  "timestamp": "2023-04-15T14:30:00Z",
  "data": {
    "user_id": 1,
    "email": "u***@example.com",
    "ip_address": "192.168.1.1"
  }
}
```

The `data` object contains information relevant to the specific event, with sensitive information partially masked for security.

## Best Practices

Recommendations for effectively using the Authentication API.

### Secure Token Storage

- For web applications, store tokens in HttpOnly cookies with the Secure flag
- For mobile applications, use secure storage mechanisms like Keychain (iOS) or KeyStore (Android)
- For single-page applications, consider using a backend-for-frontend pattern to handle token storage
- Implement token refresh logic to maintain user sessions without requiring re-authentication
- Clear tokens from storage when the user logs out

### Error Handling

- Implement proper error handling for all authentication requests
- Provide user-friendly error messages while maintaining security
- Handle MFA challenges appropriately by redirecting to the MFA verification flow
- Implement exponential backoff for retrying failed requests
- Monitor and log authentication failures for security analysis

### User Experience

- Provide clear feedback during the registration and login processes
- Implement a "remember me" option for extended sessions
- Offer password strength indicators during registration and password changes
- Provide clear instructions for MFA setup and recovery
- Implement progressive enhancement for authentication features

## API Reference

For a complete API reference, see the [OpenAPI specification](openapi.yaml).