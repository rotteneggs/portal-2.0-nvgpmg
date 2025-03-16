import { User } from '../../src/types/auth';

/**
 * Sets up the test environment for login testing
 */
function setupLoginTest() {
  cy.visit('/login');
  cy.get('form').should('be.visible');
}

/**
 * Sets up the test environment for registration testing
 */
function setupRegistrationTest() {
  cy.visit('/register');
  cy.get('form').should('be.visible');
}

/**
 * Sets up the test environment for forgot password testing
 */
function setupForgotPasswordTest() {
  cy.visit('/forgot-password');
  cy.get('form').should('be.visible');
}

/**
 * Sets up the test environment for password reset testing
 * @param token - Reset password token
 */
function setupResetPasswordTest(token: string) {
  cy.visit(`/reset-password?token=${token}`);
  cy.get('form').should('be.visible');
}

/**
 * Sets up the test environment for MFA verification testing
 */
function setupMfaVerificationTest() {
  // Stub the login API to return MFA required response
  cy.intercept('POST', '/api/v1/auth/login', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        requires_mfa: true,
        mfa_methods: ['email', 'totp'],
        user: {
          id: 1,
          email: 'test@example.com'
        }
      },
      meta: null,
      message: 'MFA verification required'
    }
  }).as('loginRequest');
  
  cy.visit('/login');
  cy.get('input[name="email"]').type('test@example.com');
  cy.get('input[name="password"]').type('Password123!');
  cy.get('button[type="submit"]').click();
  
  cy.wait('@loginRequest');
  cy.url().should('include', '/mfa-verification');
  cy.get('form').should('be.visible');
}

describe('Login Functionality', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should display login form with all required elements', () => {
    setupLoginTest();
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('input[type="checkbox"][name="remember"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('a', 'Forgot Password').should('be.visible');
    cy.contains('a', 'Register').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    setupLoginTest();
    cy.get('button[type="submit"]').click();
    cy.get('input[name="email"]').next('.error-message').should('be.visible');
    cy.get('input[name="password"]').next('.error-message').should('be.visible');
  });

  it('should show validation error for invalid email format', () => {
    setupLoginTest();
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.get('input[name="email"]').next('.error-message').should('be.visible')
      .and('contain', 'valid email');
  });

  it('should show error message for invalid credentials', () => {
    setupLoginTest();
    
    // Stub the login API to return authentication error
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 401,
      body: {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid email or password',
          details: null
        }
      }
    }).as('loginRequest');
    
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.get('.alert-error').should('be.visible')
      .and('contain', 'Invalid email or password');
  });

  it('should successfully log in with valid credentials', () => {
    setupLoginTest();
    
    // Stub the login API to return successful response
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User'
          },
          requires_mfa: false
        },
        meta: null,
        message: 'Login successful'
      }
    }).as('loginRequest');
    
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    cy.window().its('localStorage.token').should('exist');
  });

  it('should remember user when remember me is checked', () => {
    setupLoginTest();
    
    // Stub the login API to return successful response
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User'
          },
          requires_mfa: false
        },
        meta: null,
        message: 'Login successful'
      }
    }).as('loginRequest');
    
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('input[type="checkbox"][name="remember"]').check();
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    cy.window().its('localStorage.token').should('exist');
    cy.get('@loginRequest').its('request.body').should('include', 'remember=true');
  });

  it('should navigate to registration page when clicking register link', () => {
    setupLoginTest();
    cy.contains('a', 'Register').click();
    cy.url().should('include', '/register');
    cy.get('form').should('be.visible');
  });

  it('should navigate to forgot password page when clicking forgot password link', () => {
    setupLoginTest();
    cy.contains('a', 'Forgot Password').click();
    cy.url().should('include', '/forgot-password');
    cy.get('form').should('be.visible');
  });
});

describe('Registration Functionality', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should display registration form with all required elements', () => {
    setupRegistrationTest();
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="first_name"]').should('be.visible');
    cy.get('input[name="last_name"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('input[name="password_confirmation"]').should('be.visible');
    cy.get('input[type="checkbox"][name="terms"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('a', 'Login').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    setupRegistrationTest();
    cy.get('button[type="submit"]').click();
    cy.get('input[name="email"]').next('.error-message').should('be.visible');
    cy.get('input[name="first_name"]').next('.error-message').should('be.visible');
    cy.get('input[name="last_name"]').next('.error-message').should('be.visible');
    cy.get('input[name="password"]').next('.error-message').should('be.visible');
    cy.get('input[name="password_confirmation"]').next('.error-message').should('be.visible');
    cy.get('input[type="checkbox"][name="terms"]').parent().find('.error-message').should('be.visible');
  });

  it('should show validation error for invalid email format', () => {
    setupRegistrationTest();
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('input[name="first_name"]').type('John');
    cy.get('input[name="last_name"]').type('Doe');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('input[name="password_confirmation"]').type('Password123!');
    cy.get('input[type="checkbox"][name="terms"]').check();
    cy.get('button[type="submit"]').click();
    cy.get('input[name="email"]').next('.error-message').should('be.visible')
      .and('contain', 'valid email');
  });

  it('should show validation error for password complexity requirements', () => {
    setupRegistrationTest();
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="first_name"]').type('John');
    cy.get('input[name="last_name"]').type('Doe');
    cy.get('input[name="password"]').type('password'); // Too simple
    cy.get('input[name="password_confirmation"]').type('password');
    cy.get('input[type="checkbox"][name="terms"]').check();
    cy.get('button[type="submit"]').click();
    cy.get('input[name="password"]').next('.error-message').should('be.visible')
      .and('contain', 'password requirements');
  });

  it('should show validation error for mismatched passwords', () => {
    setupRegistrationTest();
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="first_name"]').type('John');
    cy.get('input[name="last_name"]').type('Doe');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('input[name="password_confirmation"]').type('DifferentPassword123!');
    cy.get('input[type="checkbox"][name="terms"]').check();
    cy.get('button[type="submit"]').click();
    cy.get('input[name="password_confirmation"]').next('.error-message').should('be.visible')
      .and('contain', 'passwords do not match');
  });

  it('should show error for already registered email', () => {
    setupRegistrationTest();
    
    // Stub the registration API to return email already exists error
    cy.intercept('POST', '/api/v1/auth/register', {
      statusCode: 422,
      body: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation errors occurred',
          details: {
            email: ['The email has already been taken.']
          }
        }
      }
    }).as('registerRequest');
    
    cy.get('input[name="email"]').type('existing@example.com');
    cy.get('input[name="first_name"]').type('John');
    cy.get('input[name="last_name"]').type('Doe');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('input[name="password_confirmation"]').type('Password123!');
    cy.get('input[type="checkbox"][name="terms"]').check();
    cy.get('button[type="submit"]').click();
    
    cy.wait('@registerRequest');
    cy.get('.alert-error').should('be.visible')
      .and('contain', 'email has already been taken');
  });

  it('should successfully register with valid data', () => {
    setupRegistrationTest();
    
    // Stub the registration API to return successful response
    cy.intercept('POST', '/api/v1/auth/register', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            full_name: 'John Doe'
          }
        },
        meta: null,
        message: 'Registration successful'
      }
    }).as('registerRequest');
    
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="first_name"]').type('John');
    cy.get('input[name="last_name"]').type('Doe');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('input[name="password_confirmation"]').type('Password123!');
    cy.get('input[type="checkbox"][name="terms"]').check();
    cy.get('button[type="submit"]').click();
    
    cy.wait('@registerRequest');
    cy.url().should('include', '/dashboard');
    cy.window().its('localStorage.token').should('exist');
  });

  it('should display password strength indicator', () => {
    setupRegistrationTest();
    
    // Test weak password
    cy.get('input[name="password"]').type('password');
    cy.get('.password-strength-indicator').should('have.class', 'weak');
    
    // Clear and test medium password
    cy.get('input[name="password"]').clear().type('Password123');
    cy.get('.password-strength-indicator').should('have.class', 'medium');
    
    // Clear and test strong password
    cy.get('input[name="password"]').clear().type('Password123!@#');
    cy.get('.password-strength-indicator').should('have.class', 'strong');
  });

  it('should navigate to login page when clicking login link', () => {
    setupRegistrationTest();
    cy.contains('a', 'Login').click();
    cy.url().should('include', '/login');
    cy.get('form').should('be.visible');
  });
});

describe('Password Recovery Functionality', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should display forgot password form with all required elements', () => {
    setupForgotPasswordTest();
    cy.get('input[name="email"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('a', 'Back to Login').should('be.visible');
  });

  it('should show validation error for empty email', () => {
    setupForgotPasswordTest();
    cy.get('button[type="submit"]').click();
    cy.get('input[name="email"]').next('.error-message').should('be.visible');
  });

  it('should show validation error for invalid email format', () => {
    setupForgotPasswordTest();
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('button[type="submit"]').click();
    cy.get('input[name="email"]').next('.error-message').should('be.visible')
      .and('contain', 'valid email');
  });

  it('should show success message for valid email submission', () => {
    setupForgotPasswordTest();
    
    // Stub the forgot password API to return successful response
    cy.intercept('POST', '/api/v1/auth/forgot-password', {
      statusCode: 200,
      body: {
        success: true,
        data: null,
        meta: null,
        message: 'Password reset link has been sent to your email'
      }
    }).as('forgotPasswordRequest');
    
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@forgotPasswordRequest');
    cy.get('.alert-success').should('be.visible')
      .and('contain', 'Password reset link has been sent');
  });

  it('should navigate to login page when clicking back to login link', () => {
    setupForgotPasswordTest();
    cy.contains('a', 'Back to Login').click();
    cy.url().should('include', '/login');
    cy.get('form').should('be.visible');
  });

  it('should display reset password form with all required elements', () => {
    const validToken = 'valid-reset-token';
    setupResetPasswordTest(validToken);
    cy.get('input[name="password"]').should('be.visible');
    cy.get('input[name="password_confirmation"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('a', 'Back to Login').should('be.visible');
  });

  it('should show validation errors for empty password fields', () => {
    const validToken = 'valid-reset-token';
    setupResetPasswordTest(validToken);
    cy.get('button[type="submit"]').click();
    cy.get('input[name="password"]').next('.error-message').should('be.visible');
    cy.get('input[name="password_confirmation"]').next('.error-message').should('be.visible');
  });

  it('should show validation error for password complexity requirements', () => {
    const validToken = 'valid-reset-token';
    setupResetPasswordTest(validToken);
    cy.get('input[name="password"]').type('password'); // Too simple
    cy.get('input[name="password_confirmation"]').type('password');
    cy.get('button[type="submit"]').click();
    cy.get('input[name="password"]').next('.error-message').should('be.visible')
      .and('contain', 'password requirements');
  });

  it('should show validation error for mismatched passwords', () => {
    const validToken = 'valid-reset-token';
    setupResetPasswordTest(validToken);
    cy.get('input[name="password"]').type('Password123!');
    cy.get('input[name="password_confirmation"]').type('DifferentPassword123!');
    cy.get('button[type="submit"]').click();
    cy.get('input[name="password_confirmation"]').next('.error-message').should('be.visible')
      .and('contain', 'passwords do not match');
  });

  it('should show error for invalid or expired token', () => {
    const invalidToken = 'invalid-reset-token';
    setupResetPasswordTest(invalidToken);
    
    // Stub the reset password API to return token invalid error
    cy.intercept('POST', '/api/v1/auth/reset-password', {
      statusCode: 400,
      body: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid or expired password reset token',
          details: null
        }
      }
    }).as('resetPasswordRequest');
    
    cy.get('input[name="password"]').type('Password123!');
    cy.get('input[name="password_confirmation"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@resetPasswordRequest');
    cy.get('.alert-error').should('be.visible')
      .and('contain', 'Invalid or expired password reset token');
  });

  it('should successfully reset password with valid data and token', () => {
    const validToken = 'valid-reset-token';
    setupResetPasswordTest(validToken);
    
    // Stub the reset password API to return successful response
    cy.intercept('POST', '/api/v1/auth/reset-password', {
      statusCode: 200,
      body: {
        success: true,
        data: null,
        meta: null,
        message: 'Password has been reset successfully'
      }
    }).as('resetPasswordRequest');
    
    cy.get('input[name="password"]').type('NewPassword123!');
    cy.get('input[name="password_confirmation"]').type('NewPassword123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@resetPasswordRequest');
    cy.get('.alert-success').should('be.visible')
      .and('contain', 'Password has been reset successfully');
    cy.url().should('include', '/login');
  });
});

describe('Multi-Factor Authentication', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should redirect to MFA verification page when MFA is required', () => {
    // Stub the login API to return MFA required response
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          requires_mfa: true,
          mfa_methods: ['email', 'totp'],
          user: {
            id: 1,
            email: 'test@example.com'
          }
        },
        meta: null,
        message: 'MFA verification required'
      }
    }).as('loginRequest');
    
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.url().should('include', '/mfa-verification');
  });

  it('should display MFA verification form with all required elements', () => {
    setupMfaVerificationTest();
    cy.get('input[name="code"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('a', 'Resend Code').should('be.visible');
    cy.contains('a', 'Use Recovery Code').should('be.visible');
  });

  it('should show validation error for empty code', () => {
    setupMfaVerificationTest();
    cy.get('button[type="submit"]').click();
    cy.get('input[name="code"]').next('.error-message').should('be.visible');
  });

  it('should show error for invalid verification code', () => {
    setupMfaVerificationTest();
    
    // Stub the verify MFA API to return invalid code error
    cy.intercept('POST', '/api/v1/auth/mfa/verify', {
      statusCode: 400,
      body: {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid verification code',
          details: null
        }
      }
    }).as('verifyMfaRequest');
    
    cy.get('input[name="code"]').type('123456'); // Invalid code
    cy.get('button[type="submit"]').click();
    
    cy.wait('@verifyMfaRequest');
    cy.get('.alert-error').should('be.visible')
      .and('contain', 'Invalid verification code');
  });

  it('should successfully verify with valid code', () => {
    setupMfaVerificationTest();
    
    // Stub the verify MFA API to return successful response
    cy.intercept('POST', '/api/v1/auth/mfa/verify', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User'
          }
        },
        meta: null,
        message: 'Verification successful'
      }
    }).as('verifyMfaRequest');
    
    cy.get('input[name="code"]').type('123456'); // Valid code
    cy.get('button[type="submit"]').click();
    
    cy.wait('@verifyMfaRequest');
    cy.url().should('include', '/dashboard');
    cy.window().its('localStorage.token').should('exist');
  });

  it('should show recovery code form when clicking use recovery code link', () => {
    setupMfaVerificationTest();
    cy.contains('a', 'Use Recovery Code').click();
    cy.get('input[name="recovery_code"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('a', 'Back to Verification').should('be.visible');
  });

  it('should successfully verify with valid recovery code', () => {
    setupMfaVerificationTest();
    cy.contains('a', 'Use Recovery Code').click();
    
    // Stub the recovery code API to return successful response
    cy.intercept('POST', '/api/v1/auth/mfa/recovery', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User'
          }
        },
        meta: null,
        message: 'Verification successful'
      }
    }).as('recoveryCodeRequest');
    
    cy.get('input[name="recovery_code"]').type('ABCD-1234-EFGH-5678');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@recoveryCodeRequest');
    cy.url().should('include', '/dashboard');
    cy.window().its('localStorage.token').should('exist');
  });
});

describe('Logout Functionality', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should successfully log out the user', () => {
    // Stub the login API to return successful response
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User'
          },
          requires_mfa: false
        },
        meta: null,
        message: 'Login successful'
      }
    }).as('loginRequest');
    
    // Stub the logout API to return successful response
    cy.intercept('POST', '/api/v1/auth/logout', {
      statusCode: 200,
      body: {
        success: true,
        data: null,
        meta: null,
        message: 'Logged out successfully'
      }
    }).as('logoutRequest');
    
    // Log in
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    
    // Log out
    cy.get('.user-menu').click();
    cy.contains('Logout').click();
    
    cy.wait('@logoutRequest');
    cy.url().should('include', '/login');
    cy.window().its('localStorage.token').should('not.exist');
  });

  it('should redirect to login page when accessing protected route after logout', () => {
    // Stub the login API to return successful response
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User'
          },
          requires_mfa: false
        },
        meta: null,
        message: 'Login successful'
      }
    }).as('loginRequest');
    
    // Stub the logout API to return successful response
    cy.intercept('POST', '/api/v1/auth/logout', {
      statusCode: 200,
      body: {
        success: true,
        data: null,
        meta: null,
        message: 'Logged out successfully'
      }
    }).as('logoutRequest');
    
    // Log in
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    
    // Log out
    cy.get('.user-menu').click();
    cy.contains('Logout').click();
    
    cy.wait('@logoutRequest');
    cy.url().should('include', '/login');
    
    // Try to access protected route
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
    cy.url().should('include', 'returnUrl=/dashboard'); // Check return URL parameter
  });
});

describe('Authentication State Persistence', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should maintain authentication state across page reloads', () => {
    // Stub the login API to return successful response
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User'
          },
          requires_mfa: false
        },
        meta: null,
        message: 'Login successful'
      }
    }).as('loginRequest');
    
    // Stub the current user API for subsequent requests
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          email: 'test@example.com',
          full_name: 'Test User'
        },
        meta: null,
        message: null
      }
    }).as('meRequest');
    
    // Log in
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    
    // Reload the page
    cy.reload();
    cy.wait('@meRequest');
    
    // Verify we're still on dashboard and user info is displayed
    cy.url().should('include', '/dashboard');
    cy.get('.user-menu').should('contain', 'Test User');
  });

  it('should redirect to login when token is expired', () => {
    // Stub the login API to return successful response
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User'
          },
          requires_mfa: false
        },
        meta: null,
        message: 'Login successful'
      }
    }).as('loginRequest');
    
    // Stub the current user API to return 401 unauthorized (expired token)
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 401,
      body: {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Token has expired',
          details: null
        }
      }
    }).as('expiredTokenRequest');
    
    // Log in
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    
    // Manually trigger a token check (normally done on route change or API request)
    cy.window().then(win => {
      // Simulate an expired token by modifying localStorage
      win.localStorage.setItem('token', 'expired-token');
      
      // Reload the page to trigger auth check
      cy.reload();
      cy.wait('@expiredTokenRequest');
      
      // Should be redirected to login
      cy.url().should('include', '/login');
    });
  });
});

describe('Protected Routes', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should redirect to login when accessing protected route without authentication', () => {
    // Try to access protected route directly
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
    cy.url().should('include', 'returnUrl=/dashboard'); // Check return URL parameter
  });

  it('should allow access to protected route with valid authentication', () => {
    // Stub the login API to return successful response
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User'
          },
          requires_mfa: false
        },
        meta: null,
        message: 'Login successful'
      }
    }).as('loginRequest');
    
    // Stub the current user API for subsequent requests
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          email: 'test@example.com',
          full_name: 'Test User'
        },
        meta: null,
        message: null
      }
    }).as('meRequest');
    
    // Log in
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    
    // Navigate to another protected route
    cy.visit('/applications');
    cy.wait('@meRequest'); // Auth check happens
    cy.url().should('include', '/applications'); // Should not redirect
  });

  it('should redirect to unauthorized page when accessing route without permission', () => {
    // Stub the login API to return successful response with limited permissions
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'fake-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            full_name: 'Test User',
            roles: [
              {
                id: 2,
                name: 'student',
                permissions: [
                  { id: 1, name: 'view_own_application', resource: 'applications', action: 'view_own' }
                ]
              }
            ]
          },
          requires_mfa: false
        },
        meta: null,
        message: 'Login successful'
      }
    }).as('loginRequest');
    
    // Stub the current user API with the same limited permissions
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          email: 'test@example.com',
          full_name: 'Test User',
          roles: [
            {
              id: 2,
              name: 'student',
              permissions: [
                { id: 1, name: 'view_own_application', resource: 'applications', action: 'view_own' }
              ]
            }
          ]
        },
        meta: null,
        message: null
      }
    }).as('meRequest');
    
    // Log in
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    
    // Try to access admin route
    cy.visit('/admin/users');
    cy.wait('@meRequest'); // Auth check happens
    cy.url().should('include', '/unauthorized'); // Should redirect to unauthorized page
  });
});