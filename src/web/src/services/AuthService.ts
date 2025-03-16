import {
  login,
  register,
  logout,
  getCurrentUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyMfa,
  setupMfa,
  verifyMfaSetup,
  disableMfa,
  getRecoveryCodes,
  useRecoveryCode,
  refreshToken,
  resendVerificationEmail
} from '../api/auth';

import {
  setToken,
  getToken,
  removeToken
} from '../utils/storageUtils';

import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MfaVerifyRequest,
  MfaSetupResponse
} from '../types/auth';

/**
 * Service class that provides authentication functionality for the Student Admissions Enrollment Platform.
 * This class manages user authentication state, handles login/logout operations, and provides methods for
 * various authentication-related tasks such as registration, password management, and multi-factor authentication.
 */
class AuthService {
  /**
   * Indicates whether the user is currently authenticated.
   * This will be false if MFA is required but not yet completed.
   */
  public isAuthenticated: boolean = false;
  
  /**
   * The currently authenticated user's data, or null if not authenticated.
   */
  public currentUser: User | null = null;
  
  /**
   * Indicates whether multi-factor authentication is required to complete the authentication process.
   */
  public requiresMfa: boolean = false;
  
  /**
   * Array of available MFA methods for the current user.
   */
  public mfaMethods: string[] = [];

  /**
   * Initializes the AuthService and checks for existing authentication.
   * If a token exists in storage, sets isAuthenticated to true.
   */
  constructor() {
    // Check if a token exists in storage, which indicates a previous login
    const token = getToken();
    if (token) {
      this.isAuthenticated = true;
    }
  }

  /**
   * Authenticates a user with email and password
   * @param credentials - The login credentials
   * @returns Promise resolving to authenticated user data
   */
  public async login(credentials: LoginRequest): Promise<User> {
    const response = await login(credentials);
    
    // Store the token
    setToken(response.token);
    
    // If MFA is required, set the flag and methods but don't set isAuthenticated yet
    if (response.requires_mfa) {
      this.requiresMfa = true;
      this.mfaMethods = response.mfa_methods;
    } else {
      // If MFA is not required, set isAuthenticated to true
      this.isAuthenticated = true;
    }
    
    // Set the current user
    this.currentUser = response.user;
    
    return response.user;
  }

  /**
   * Registers a new user account
   * @param userData - The user registration data
   * @returns Promise resolving to the newly registered user data
   */
  public async register(userData: RegisterRequest): Promise<User> {
    const response = await register(userData);
    
    // Store the token
    setToken(response.token);
    
    // Set authentication state
    this.isAuthenticated = true;
    this.currentUser = response.user;
    
    return response.user;
  }

  /**
   * Logs out the current user
   * @returns Promise resolving when logout is complete
   */
  public async logout(): Promise<void> {
    // If not authenticated, return immediately
    if (!this.isAuthenticated) {
      return;
    }
    
    // Call the logout API
    await logout();
    
    // Clear authentication state
    removeToken();
    this.isAuthenticated = false;
    this.currentUser = null;
    this.requiresMfa = false;
    this.mfaMethods = [];
  }

  /**
   * Gets the current authenticated user's profile
   * @returns Promise resolving to user profile data
   */
  public async getCurrentUser(): Promise<User> {
    if (!this.isAuthenticated) {
      throw new Error('User is not authenticated');
    }
    
    const user = await getCurrentUser();
    this.currentUser = user;
    return user;
  }

  /**
   * Verifies a user's email address
   * @param verificationData - The email verification data
   * @returns Promise resolving when verification is complete
   */
  public async verifyEmail(verificationData: VerifyEmailRequest): Promise<void> {
    await verifyEmail(verificationData);
  }

  /**
   * Requests a password reset email
   * @param data - The forgot password request data
   * @returns Promise resolving when request is sent
   */
  public async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await forgotPassword(data);
  }

  /**
   * Resets a user's password using a token
   * @param data - The reset password request data
   * @returns Promise resolving when password is reset
   */
  public async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await resetPassword(data);
  }

  /**
   * Changes the current user's password
   * @param currentPassword - The current password
   * @param newPassword - The new password
   * @param newPasswordConfirmation - Confirmation of the new password
   * @returns Promise resolving when password is changed
   */
  public async changePassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Promise<void> {
    if (!this.isAuthenticated) {
      throw new Error('User is not authenticated');
    }
    
    await changePassword(currentPassword, newPassword, newPasswordConfirmation);
  }

  /**
   * Verifies a multi-factor authentication code
   * @param data - The MFA verification data
   * @returns Promise resolving to authenticated user data
   */
  public async verifyMfa(data: MfaVerifyRequest): Promise<User> {
    const response = await verifyMfa(data);
    
    // Store the token
    setToken(response.token);
    
    // Set authentication state
    this.isAuthenticated = true;
    this.requiresMfa = false;
    this.mfaMethods = [];
    this.currentUser = response.user;
    
    return response.user;
  }

  /**
   * Sets up multi-factor authentication for a user
   * @param method - The MFA method (e.g., 'totp', 'sms')
   * @param methodData - Additional data required for the MFA method
   * @returns Promise resolving to MFA setup data
   */
  public async setupMfa(
    method: string,
    methodData: Record<string, any>
  ): Promise<MfaSetupResponse> {
    if (!this.isAuthenticated) {
      throw new Error('User is not authenticated');
    }
    
    return await setupMfa(method, methodData);
  }

  /**
   * Verifies MFA setup by confirming a test code
   * @param method - The MFA method (e.g., 'totp', 'sms')
   * @param code - The verification code
   * @returns Promise resolving when setup is verified
   */
  public async verifyMfaSetup(method: string, code: string): Promise<void> {
    if (!this.isAuthenticated) {
      throw new Error('User is not authenticated');
    }
    
    await verifyMfaSetup(method, code);
  }

  /**
   * Disables multi-factor authentication for a user
   * @param password - The user's password for verification
   * @returns Promise resolving when MFA is disabled
   */
  public async disableMfa(password: string): Promise<void> {
    if (!this.isAuthenticated) {
      throw new Error('User is not authenticated');
    }
    
    await disableMfa(password);
  }

  /**
   * Gets recovery codes for MFA
   * @returns Promise resolving to array of recovery codes
   */
  public async getRecoveryCodes(): Promise<string[]> {
    if (!this.isAuthenticated) {
      throw new Error('User is not authenticated');
    }
    
    return await getRecoveryCodes();
  }

  /**
   * Uses a recovery code to bypass MFA
   * @param email - The user's email
   * @param recoveryCode - The recovery code
   * @returns Promise resolving to authenticated user data
   */
  public async useRecoveryCode(
    email: string,
    recoveryCode: string
  ): Promise<User> {
    const response = await useRecoveryCode(email, recoveryCode);
    
    // Store the token
    setToken(response.token);
    
    // Set authentication state
    this.isAuthenticated = true;
    this.requiresMfa = false;
    this.mfaMethods = [];
    this.currentUser = response.user;
    
    return response.user;
  }

  /**
   * Refreshes the authentication token
   * @returns Promise resolving to the new token
   */
  public async refreshToken(): Promise<string> {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await refreshToken();
    setToken(response.token);
    return response.token;
  }

  /**
   * Resends the email verification link
   * @param email - The email address to send the verification link to
   * @returns Promise resolving when email is sent
   */
  public async resendVerificationEmail(email: string): Promise<void> {
    await resendVerificationEmail(email);
  }

  /**
   * Checks if the user is currently authenticated
   * @returns True if authenticated, false otherwise
   */
  public checkAuthentication(): boolean {
    return this.isAuthenticated;
  }
}

export default AuthService;