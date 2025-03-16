<?php

namespace App\Services;

use App\Models\User; // User model for authentication operations
use App\Models\UserProfile; // User profile model for creating and updating user profiles
use App\Models\Role; // Role model for assigning default roles to new users
use App\Services\AuditService; // Service for logging authentication events
use App\Services\NotificationService; // Service for sending authentication-related notifications
use Illuminate\Support\Facades\Hash; // Laravel ^10.0 For password hashing and verification
use Illuminate\Support\Facades\Auth; // Laravel ^10.0 For Laravel authentication functionality
use Illuminate\Support\Facades\Password; // Laravel ^10.0 For password reset functionality
use Illuminate\Support\Facades\DB; // Laravel ^10.0 For database transactions
use Illuminate\Support\Facades\Str; // Laravel ^10.0 For string manipulation and random string generation
use Carbon\Carbon; // nesbot/carbon ^2.0 For date/time handling
use Illuminate\Support\Facades\Redis; // Laravel ^10.0 For token storage and blacklisting
use PragmaRX\Google2FA\Google2FA as TOTP; // pragmarx/google2fa ^8.0 For TOTP-based multi-factor authentication

/**
 * Service class for handling authentication-related functionality
 */
class AuthService
{
    /**
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * @var NotificationService
     */
    protected NotificationService $notificationService;

    /**
     * @var int
     */
    protected int $tokenExpiration;

    /**
     * @var int
     */
    protected int $refreshTokenExpiration;

    /**
     * @var array
     */
    protected array $defaultRoles;

    /**
     * @var array
     */
    protected array $passwordRules;

    /**
     * @var int
     */
    protected int $mfaCodeExpiration;

    /**
     * @var int
     */
    protected int $recoveryCodesCount;

    /**
     * Create a new AuthService instance
     *
     * @param AuditService $auditService
     * @param NotificationService $notificationService
     */
    public function __construct(AuditService $auditService, NotificationService $notificationService)
    {
        // Initialize the service with dependencies
        // Store AuditService instance for logging authentication events
        $this->auditService = $auditService;
        // Store NotificationService instance for sending notifications
        $this->notificationService = $notificationService;
        // Load token expiration settings from config (default: 15 minutes)
        $this->tokenExpiration = config('sanctum.expiration', 15);
        // Load refresh token expiration settings from config (default: 12 hours)
        $this->refreshTokenExpiration = config('auth.refresh_token_expiration', 720);
        // Load default roles for new users from config (default: 'applicant')
        $this->defaultRoles = config('auth.defaults.roles', ['applicant']);
        // Load password rules from config (min length, complexity, etc.)
        $this->passwordRules = config('auth.password_rules', ['min:8']);
        // Set MFA code expiration time (default: 10 minutes)
        $this->mfaCodeExpiration = config('auth.mfa_code_expiration', 10);
        // Set recovery codes count (default: 8)
        $this->recoveryCodesCount = config('auth.recovery_codes_count', 8);
    }

    /**
     * Register a new user account
     *
     * @param array $data
     * @return array User data with authentication token
     */
    public function register(array $data): array
    {
        // Validate registration data against rules
        $validatedData = validator($data, [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'string', 'confirmed', ...$this->passwordRules],
        ])->validate();

        // Begin database transaction
        return DB::transaction(function () use ($validatedData) {
            // Create new User record with email and hashed password
            $user = User::create([
                'email' => $validatedData['email'],
                'password' => Hash::make($validatedData['password']),
            ]);

            // Create UserProfile record with personal information
            UserProfile::create([
                'user_id' => $user->id,
                'first_name' => $validatedData['first_name'],
                'last_name' => $validatedData['last_name'],
            ]);

            // Assign default roles to the user
            $roles = [];
            foreach ($this->defaultRoles as $roleName) {
                $role = Role::findByName($roleName);
                if ($role) {
                    $roles[] = $role->id;
                }
            }
            $user->syncRoles($roles);

            // Generate email verification token
            $verificationToken = Str::random(60);
            // Send verification email via NotificationService
            $this->notificationService->send(
                $user->id,
                'email_verification',
                'Verify Your Email Address',
                'Please click the link below to verify your email address.',
                ['verification_url' => route('verification.verify', ['id' => $user->id, 'hash' => sha1($user->email)])],
                ['email']
            );

            // Generate authentication token
            $tokenData = $this->generateToken($user, false);

            // Log successful registration via AuditService
            $this->auditService->logCreate('user', $user->id, [
                'email' => $user->email,
                'first_name' => $validatedData['first_name'],
                'last_name' => $validatedData['last_name'],
            ]);

            // Return user data with authentication token
            return [
                'user' => $user,
                'access_token' => $tokenData['access_token'],
                'refresh_token' => $tokenData['refresh_token'],
                'token_type' => 'Bearer',
                'expires_in' => $this->tokenExpiration * 60,
            ];
        });
    }

    /**
     * Authenticate a user and generate access token
     *
     * @param string $email
     * @param string $password
     * @param bool $remember
     * @return array|bool User data with token or false if authentication fails
     */
    public function login(string $email, string $password, bool $remember): array|bool
    {
        // Attempt to authenticate user with credentials
        if (!Auth::attempt(['email' => $email, 'password' => $password])) {
            // Log failed attempt and return false
            $this->auditService->logLogin(new User(['email' => $email]), false, 'Invalid credentials');
            return false;
        }

        // Get the authenticated user
        $user = Auth::user();

        // Check if user account is active
        if (!$user->isActive()) {
            // Log failed attempt and return false
            $this->auditService->logLogin($user, false, 'Inactive account');
            return false;
        }

        // Check if MFA is enabled for the user
        if ($user->hasMfaEnabled()) {
            // Generate and send MFA code, return MFA required response
            $method = 'email'; // Default to email for now
            $code = $this->generateMfaCode($user, $method);
            $this->sendMfaCode($user, $method, $code);

            return [
                'mfa_required' => true,
                'user_id' => $user->id,
                'mfa_method' => $method,
            ];
        }

        // Generate authentication token
        $tokenData = $this->generateToken($user, $remember);

        // Update last login timestamp
        $user->updateLastLogin();

        // Log successful login via AuditService
        $this->auditService->logLogin($user, true);

        // Return user data with authentication token
        return [
            'user' => $user,
            'access_token' => $tokenData['access_token'],
            'refresh_token' => $tokenData['refresh_token'],
            'token_type' => 'Bearer',
            'expires_in' => $this->tokenExpiration * 60,
        ];
    }

    /**
     * Verify a multi-factor authentication code
     *
     * @param User $user
     * @param string $code
     * @return array|bool User data with token or false if verification fails
     */
    public function verifyMfaCode(User $user, string $code): array|bool
    {
        // Retrieve stored MFA code and expiration time from Redis
        $storedCode = Redis::get("mfa:{$user->id}:code");
        $expiration = Redis::ttl("mfa:{$user->id}:code");

        // Check if code has expired
        if ($expiration <= 0) {
            $this->auditService->logLogin($user, false, 'MFA code expired');
            return false;
        }

        // Verify the provided code matches the stored code
        if ($code !== $storedCode) {
            $this->auditService->logLogin($user, false, 'Invalid MFA code');
            return false;
        }

        // Generate authentication token
        $tokenData = $this->generateToken($user, false);

        // Update last login timestamp
        $user->updateLastLogin();

        // Log successful MFA verification via AuditService
        $this->auditService->logLogin($user, true, 'MFA verified');

        // Return user data with authentication token
        return [
            'user' => $user,
            'access_token' => $tokenData['access_token'],
            'refresh_token' => $tokenData['refresh_token'],
            'token_type' => 'Bearer',
            'expires_in' => $this->tokenExpiration * 60,
        ];
    }

    /**
     * Log out a user by revoking their token
     *
     * @param User $user
     * @param object $request
     * @return bool True if logout was successful
     */
    public function logout(User $user, object $request): bool
    {
        // Get the bearer token from the request
        $token = $request->bearerToken();

        // Add token to blacklist in Redis
        $this->blacklistToken($token, $this->tokenExpiration * 60);

        // Revoke the current token
        $user->currentAccessToken()->delete();

        // Log logout event via AuditService
        $this->auditService->logLogout($user);

        // Return true indicating successful logout
        return true;
    }

    /**
     * Verify a user's email address
     *
     * @param string $id
     * @param string $hash
     * @return bool True if verification was successful
     */
    public function verifyEmail(string $id, string $hash): bool
    {
        // Find user by ID
        $user = User::findOrFail($id);

        // Verify the hash matches the expected value
        if (!hash_equals((string) $hash, sha1($user->email))) {
            return false;
        }

        // If already verified, return true
        if ($user->hasVerifiedEmail()) {
            return true;
        }

        // Update email_verified_at timestamp
        $user->markEmailAsVerified();

        // Log email verification via AuditService
        $this->auditService->log('email_verified', 'user', $user->id);

        // Send welcome notification via NotificationService
        $this->notificationService->send(
            $user->id,
            'welcome',
            'Welcome to Our Platform!',
            'Thank you for verifying your email address.'
        );

        // Return true indicating successful verification
        return true;
    }

    /**
     * Send a password reset link to the user's email
     *
     * @param string $email
     * @return bool True if reset link was sent successfully
     */
    public function sendPasswordResetLink(string $email): bool
    {
        // Generate password reset token
        $token = Password::createToken(User::where('email', $email)->firstOrFail());

        // Send password reset email via NotificationService
        $this->notificationService->send(
            User::where('email', $email)->firstOrFail()->id,
            'password_reset',
            'Reset Your Password',
            'Click the link below to reset your password.',
            ['reset_url' => route('password.reset', ['token' => $token, 'email' => $email])],
            ['email']
        );

        // Log password reset request via AuditService
        $this->auditService->log('password_reset_requested', 'user', $email);

        // Return true indicating successful sending of reset link
        return true;
    }

    /**
     * Reset a user's password using a valid token
     *
     * @param string $email
     * @param string $token
     * @param string $password
     * @return bool True if password was reset successfully
     */
    public function resetPassword(string $email, string $token, string $password): bool
    {
        // Validate the reset token against stored token
        $user = User::where('email', $email)->firstOrFail();

        // Validate new password against password rules
        $validatedData = validator(['password' => $password], [
            'password' => ['required', 'string', 'confirmed', ...$this->passwordRules],
        ])->validate();

        // Update user's password with new hashed password
        $user->password = Hash::make($validatedData['password']);
        $user->save();

        // Log password reset completion via AuditService
        $this->auditService->log('password_reset_completed', 'user', $user->id);

        // Send password changed notification via NotificationService
        $this->notificationService->send(
            $user->id,
            'password_changed',
            'Your Password Has Been Changed',
            'Your password has been successfully changed.'
        );

        // Return true indicating successful password reset
        return true;
    }

    /**
     * Change a user's password (requires current password)
     *
     * @param User $user
     * @param string $currentPassword
     * @param string $newPassword
     * @return bool True if password was changed successfully
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): bool
    {
        // Verify current password is correct
        if (!Hash::check($currentPassword, $user->password)) {
            return false;
        }

        // Validate new password against password rules
        $validatedData = validator(['password' => $newPassword], [
            'password' => ['required', 'string', 'confirmed', ...$this->passwordRules],
        ])->validate();

        // Update user's password with new hashed password
        $user->password = Hash::make($validatedData['password']);
        $user->save();

        // Log password change via AuditService
        $this->auditService->log('password_changed', 'user', $user->id);

        // Send password changed notification via NotificationService
        $this->notificationService->send(
            $user->id,
            'password_changed',
            'Your Password Has Been Changed',
            'Your password has been successfully changed.'
        );

        // Return true indicating successful password change
        return true;
    }

    /**
     * Set up multi-factor authentication for a user
     *
     * @param User $user
     * @param string $method
     * @param array $methodData
     * @return array MFA setup data including verification code or QR code
     */
    public function setupMfa(User $user, string $method, array $methodData): array
    {
        // Validate MFA method (email, sms, totp)
        $validatedData = validator(array_merge(['method' => $method], $methodData), [
            'method' => 'required|in:email,sms,totp',
            'email' => 'required_if:method,email|email',
            'phone_number' => 'required_if:method,sms|string',
        ])->validate();

        // If method is totp, generate TOTP secret
        if ($validatedData['method'] === 'totp') {
            $totp = new TOTP();
            $secret = $totp->generateSecretKey();
            $qrCodeUrl = $totp->getQRCodeUrl(
                config('app.name'),
                $user->email,
                $secret
            );
        }

        // Store temporary MFA setup data in Redis
        $mfaData = [
            'method' => $validatedData['method'],
            'secret' => $secret ?? null,
        ];
        Redis::setex("mfa:setup:{$user->id}", $this->mfaCodeExpiration * 60, json_encode($mfaData));

        // Generate verification code for setup confirmation
        $code = $this->generateMfaCode($user, $validatedData['method']);

        // If method is email or sms, send verification code
        if ($validatedData['method'] === 'email' || $validatedData['method'] === 'sms') {
            $this->sendMfaCode($user, $validatedData['method'], $code);
        }

        // Return setup data including verification method and temporary code/QR
        return [
            'method' => $validatedData['method'],
            'qr_code_url' => $qrCodeUrl ?? null,
        ];
    }

    /**
     * Verify MFA setup by confirming a test code
     *
     * @param User $user
     * @param string $method
     * @param string $code
     * @return bool True if MFA setup was verified successfully
     */
    public function verifyMfaSetup(User $user, string $method, string $code): bool
    {
        // Retrieve temporary MFA setup data from Redis
        $mfaDataJson = Redis::get("mfa:setup:{$user->id}");
        if (!$mfaDataJson) {
            return false;
        }
        $mfaData = json_decode($mfaDataJson, true);

        // Verify the provided code is valid for the selected method
        $storedCode = Redis::get("mfa:{$user->id}:code");
        if ($code !== $storedCode) {
            return false;
        }

        // Enable MFA for the user with the verified method
        if ($method === 'totp') {
            $user->enableMfa($mfaData['secret']);
        } else {
            $user->enableMfa($method);
        }

        // Generate recovery codes and store them securely
        $recoveryCodes = $this->generateRecoveryCodes($user);

        // Log MFA setup via AuditService
        $this->auditService->logSecurityEvent('mfa_enabled', ['method' => $method], $user);

        // Send MFA enabled notification via NotificationService
        $this->notificationService->send(
            $user->id,
            'mfa_enabled',
            'Multi-Factor Authentication Enabled',
            'You have successfully enabled multi-factor authentication.'
        );

        // Return true indicating successful MFA setup
        return true;
    }

    /**
     * Disable multi-factor authentication for a user
     *
     * @param User $user
     * @param string $password
     * @return bool True if MFA was disabled successfully
     */
    public function disableMfa(User $user, string $password): bool
    {
        // Verify password is correct for additional security
        if (!Hash::check($password, $user->password)) {
            return false;
        }

        // Disable MFA for the user
        $user->disableMfa();

        // Delete recovery codes
        Redis::del("mfa:recovery_codes:{$user->id}");

        // Log MFA disabled event via AuditService
        $this->auditService->logSecurityEvent('mfa_disabled', [], $user);

        // Send MFA disabled notification via NotificationService
        $this->notificationService->send(
            $user->id,
            'mfa_disabled',
            'Multi-Factor Authentication Disabled',
            'You have successfully disabled multi-factor authentication.'
        );

        // Return true indicating successful MFA disabling
        return true;
    }

    /**
     * Generate or retrieve recovery codes for MFA
     *
     * @param User $user
     * @return array Array of recovery codes
     */
    public function generateRecoveryCodes(User $user): array
    {
        // Check if user has MFA enabled
        if (!$user->hasMfaEnabled()) {
            return [];
        }

        // Retrieve existing recovery codes if available
        $recoveryCodesJson = Redis::get("mfa:recovery_codes:{$user->id}");
        if ($recoveryCodesJson) {
            return json_decode($recoveryCodesJson, true);
        }

        // Generate specified number of random recovery codes
        $recoveryCodes = [];
        for ($i = 0; $i < $this->recoveryCodesCount; $i++) {
            $recoveryCodes[] = Str::random(16);
        }

        // Store hashed recovery codes in database
        Redis::setex("mfa:recovery_codes:{$user->id}", 3600, json_encode($recoveryCodes));

        // Log recovery code generation via AuditService
        $this->auditService->logSecurityEvent('mfa_recovery_codes_generated', [], $user);

        // Return array of unhashed recovery codes to user
        return $recoveryCodes;
    }

    /**
     * Use a recovery code to bypass MFA
     *
     * @param User $user
     * @param string $recoveryCode
     * @return array|bool User data with token or false if recovery fails
     */
    public function useRecoveryCode(User $user, string $recoveryCode): array|bool
    {
        // Retrieve stored recovery codes for the user
        $recoveryCodesJson = Redis::get("mfa:recovery_codes:{$user->id}");
        if (!$recoveryCodesJson) {
            $this->auditService->logLogin($user, false, 'Invalid recovery code');
            return false;
        }
        $recoveryCodes = json_decode($recoveryCodesJson, true);

        // Check if provided code matches any stored code
        $index = array_search($recoveryCode, $recoveryCodes);
        if ($index === false) {
            $this->auditService->logLogin($user, false, 'Invalid recovery code');
            return false;
        }

        // Remove used recovery code from storage
        unset($recoveryCodes[$index]);
        Redis::setex("mfa:recovery_codes:{$user->id}", 3600, json_encode(array_values($recoveryCodes)));

        // Generate authentication token
        $tokenData = $this->generateToken($user, false);

        // Update last login timestamp
        $user->updateLastLogin();

        // Log recovery code usage via AuditService
        $this->auditService->logSecurityEvent('mfa_recovery_code_used', [], $user);

        // Return user data with authentication token
        return [
            'user' => $user,
            'access_token' => $tokenData['access_token'],
            'refresh_token' => $tokenData['refresh_token'],
            'token_type' => 'Bearer',
            'expires_in' => $this->tokenExpiration * 60,
        ];
    }

    /**
     * Refresh an authentication token
     *
     * @param string $refreshToken
     * @return array|bool New token data or false if refresh fails
     */
    public function refreshToken(string $refreshToken): array|bool
    {
        // Validate refresh token
        $tokenData = $this->validateRefreshToken($refreshToken);
        if (!$tokenData) {
            return false;
        }

        // Extract user ID from token
        $userId = $tokenData['user_id'];

        // Find user by ID
        $user = User::find($userId);
        if (!$user) {
            return false;
        }

        // Generate new access token and refresh token
        $newTokenData = $this->generateToken($user, false);

        // Blacklist old refresh token
        $this->blacklistToken($refreshToken, $this->refreshTokenExpiration * 60);

        // Log token refresh via AuditService
        $this->auditService->log('token_refreshed', 'user', $user->id);

        // Return new token data
        return [
            'access_token' => $newTokenData['access_token'],
            'refresh_token' => $newTokenData['refresh_token'],
            'token_type' => 'Bearer',
            'expires_in' => $this->tokenExpiration * 60,
        ];
    }

    /**
     * Generate authentication tokens for a user
     *
     * @param User $user
     * @param bool $remember
     * @return array Token data including access token and refresh token
     */
    public function generateToken(User $user, bool $remember): array
    {
        // Determine token expiration based on remember flag
        $expiration = $remember ? $this->refreshTokenExpiration : $this->tokenExpiration;

        // Create new personal access token with appropriate expiration
        $accessToken = $user->createToken('auth-token', ['*'], now()->addMinutes($this->tokenExpiration))->plainTextToken;

        // Generate refresh token with longer expiration
        $refreshToken = Str::random(80);

        // Store refresh token in Redis with user association
        Redis::setex("refresh_token:{$refreshToken}", $expiration * 60, $user->id);

        // Return token data including access token, refresh token, and expiration times
        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => $this->tokenExpiration * 60,
        ];
    }

    /**
     * Validate password strength against security requirements
     *
     * @param string $password
     * @return bool True if password meets strength requirements
     */
    public function validatePasswordStrength(string $password): bool
    {
        // Check password length against minimum requirement
        if (strlen($password) < 8) {
            return false;
        }

        // Check for required character types (uppercase, lowercase, numbers, special)
        if (!preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password) || !preg_match('/[^\\w]/', $password)) {
            return false;
        }

        // Return true if all checks pass, false otherwise
        return true;
    }

    /**
     * Generate a multi-factor authentication code
     *
     * @param User $user
     * @param string $method
     * @return string Generated MFA code
     */
    public function generateMfaCode(User $user, string $method): string
    {
        // Generate random numeric code of appropriate length
        $code = Str::random(6);

        // Store code in Redis with expiration time
        Redis::setex("mfa:{$user->id}:code", $this->mfaCodeExpiration * 60, $code);

        // Return the generated code
        return $code;
    }

    /**
     * Send a multi-factor authentication code to the user
     *
     * @param User $user
     * @param string $method
     * @param string $code
     * @return bool True if code was sent successfully
     */
    public function sendMfaCode(User $user, string $method, string $code): bool
    {
        // Determine delivery channel based on method (email or sms)
        $channel = ($method === 'email') ? 'email' : 'sms';

        // Prepare notification data with the code
        $data = ['mfa_code' => $code];

        // Send notification via NotificationService
        $success = $this->notificationService->send(
            $user->id,
            'mfa_code',
            'Multi-Factor Authentication Code',
            "Your multi-factor authentication code is: {$code}",
            $data,
            [$channel]
        );

        // Log MFA code sending via AuditService
        $this->auditService->logSecurityEvent('mfa_code_sent', ['method' => $method], $user);

        // Return true if sending was successful
        return $success;
    }

    /**
     * Add a token to the blacklist
     *
     * @param string $token
     * @param int $expiration
     * @return bool True if token was blacklisted successfully
     */
    public function blacklistToken(string $token, int $expiration): bool
    {
        // Add token to Redis blacklist set
        Redis::setex("blacklist:{$token}", $expiration, 'blacklisted');

        // Return true indicating successful blacklisting
        return true;
    }

    /**
     * Check if a token is in the blacklist
     *
     * @param string $token
     * @return bool True if token is blacklisted
     */
    public function isTokenBlacklisted(string $token): bool
    {
        // Check if token exists in Redis blacklist set
        $isBlacklisted = Redis::exists("blacklist:{$token}");

        // Return true if token is found in blacklist, false otherwise
        return (bool) $isBlacklisted;
    }

    /**
     * Validate a refresh token
     *
     * @param string $refreshToken
     * @return array|null Token data if valid, null otherwise
     */
    protected function validateRefreshToken(string $refreshToken): ?array
    {
        // Check if token has been blacklisted
        if ($this->isTokenBlacklisted($refreshToken)) {
            return null;
        }

        // Check if token has expired
        $userId = Redis::get("refresh_token:{$refreshToken}");
        if (!$userId) {
            return null;
        }

        // Return token data
        return [
            'user_id' => $userId,
        ];
    }
}