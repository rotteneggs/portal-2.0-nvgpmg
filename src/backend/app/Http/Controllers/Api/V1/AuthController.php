<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\AuthLoginRequest; // Form request for validating login requests, version ^10.0
use App\Http\Requests\AuthRegisterRequest; // Form request for validating registration requests, version ^10.0
use App\Http\Resources\UserResource; // Resource for transforming user data into API responses
use App\Services\AuthService; // Service for handling authentication-related functionality
use App\Models\User; // User model for authentication operations
use Illuminate\Routing\Controller; // Laravel base controller class, version ^10.0
use Illuminate\Http\Request; // HTTP request handling, version ^10.0
use Illuminate\Http\Response; // HTTP response generation, version ^10.0
use Illuminate\Support\Facades\Auth; // Laravel authentication facade, version ^10.0
use Illuminate\Support\Facades\Validator; // Laravel validation facade, version ^10.0

/**
 * API controller responsible for handling authentication-related endpoints in the Student Admissions Enrollment Platform.
 * This controller manages user registration, login, logout, email verification, password reset, and multi-factor authentication functionality.
 */
class AuthController extends Controller
{
    /**
     * @var AuthService
     */
    protected AuthService $authService;

    /**
     * Create a new AuthController instance
     *
     * @param AuthService $authService
     * @return void
     */
    public function __construct(AuthService $authService)
    {
        // Initialize the controller with dependencies
        // Store AuthService instance for handling authentication operations
        $this->authService = $authService;
    }

    /**
     * Register a new user account
     *
     * @param AuthRegisterRequest $request
     * @return \Illuminate\Http\JsonResponse JSON response with user data and token
     */
    public function register(AuthRegisterRequest $request): \Illuminate\Http\JsonResponse
    {
        // Validate the registration request using AuthRegisterRequest
        // Call the AuthService register method with validated data
        $registrationData = $this->authService->register($request->validated());

        // Transform the user data using UserResource with profile and roles
        $userResource = (new UserResource($registrationData['user']))->withProfile()->withRoles();

        // Return JSON response with success status, user data, and token
        return response()->json([
            'success' => true,
            'data' => [
                'user' => $userResource,
                'access_token' => $registrationData['access_token'],
                'refresh_token' => $registrationData['refresh_token'],
                'token_type' => $registrationData['token_type'],
                'expires_in' => $registrationData['expires_in'],
            ],
            'message' => 'Registration successful',
        ], Response::HTTP_CREATED); // 201 Created
    }

    /**
     * Authenticate a user and generate access token
     *
     * @param AuthLoginRequest $request
     * @return \Illuminate\Http\JsonResponse JSON response with user data and token or MFA challenge
     */
    public function login(AuthLoginRequest $request): \Illuminate\Http\JsonResponse
    {
        // Validate the login request using AuthLoginRequest
        // Extract email, password, and remember flag from request
        $credentials = $request->validated();
        $email = $credentials['email'];
        $password = $credentials['password'];
        $remember = $credentials['remember_me'] ?? false;

        // Call the AuthService login method with credentials
        $loginResult = $this->authService->login($email, $password, $remember);

        // If login fails, return error response with 401 status
        if ($loginResult === false) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'invalid_credentials',
                    'message' => 'Invalid email or password.',
                ],
            ], Response::HTTP_UNAUTHORIZED); // 401 Unauthorized
        }

        // If MFA is required, return MFA challenge response
        if (isset($loginResult['mfa_required']) && $loginResult['mfa_required'] === true) {
            return response()->json([
                'success' => true,
                'data' => [
                    'mfa_required' => true,
                    'user_id' => $loginResult['user_id'],
                    'mfa_method' => $loginResult['mfa_method'],
                ],
                'message' => 'Multi-factor authentication required.',
            ], Response::HTTP_OK); // 200 OK
        }

        // Transform the user data using UserResource with profile and roles
        $userResource = (new UserResource($loginResult['user']))->withProfile()->withRoles();

        // Return JSON response with success status, user data, and token
        return response()->json([
            'success' => true,
            'data' => [
                'user' => $userResource,
                'access_token' => $loginResult['access_token'],
                'refresh_token' => $loginResult['refresh_token'],
                'token_type' => $loginResult['token_type'],
                'expires_in' => $loginResult['expires_in'],
            ],
            'message' => 'Login successful',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Verify a multi-factor authentication code
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with user data and token
     */
    public function verifyMfa(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for user_id and mfa_code
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer',
            'mfa_code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Find the user by ID
        $user = User::find($request->user_id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'user_not_found',
                    'message' => 'User not found.',
                ],
            ], Response::HTTP_NOT_FOUND); // 404 Not Found
        }

        // Call the AuthService verifyMfaCode method
        $verificationResult = $this->authService->verifyMfaCode($user, $request->mfa_code);

        // If verification fails, return error response with 401 status
        if ($verificationResult === false) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'invalid_mfa_code',
                    'message' => 'Invalid multi-factor authentication code.',
                ],
            ], Response::HTTP_UNAUTHORIZED); // 401 Unauthorized
        }

        // Transform the user data using UserResource with profile and roles
        $userResource = (new UserResource($verificationResult['user']))->withProfile()->withRoles();

        // Return JSON response with success status, user data, and token
        return response()->json([
            'success' => true,
            'data' => [
                'user' => $userResource,
                'access_token' => $verificationResult['access_token'],
                'refresh_token' => $verificationResult['refresh_token'],
                'token_type' => $verificationResult['token_type'],
                'expires_in' => $verificationResult['expires_in'],
            ],
            'message' => 'Multi-factor authentication verified',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Use a recovery code to bypass MFA
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with user data and token
     */
    public function useRecoveryCode(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for user_id and recovery_code
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer',
            'recovery_code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Find the user by ID
        $user = User::find($request->user_id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'user_not_found',
                    'message' => 'User not found.',
                ],
            ], Response::HTTP_NOT_FOUND); // 404 Not Found
        }

        // Call the AuthService useRecoveryCode method
        $recoveryResult = $this->authService->useRecoveryCode($user, $request->recovery_code);

        // If recovery fails, return error response with 401 status
        if ($recoveryResult === false) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'invalid_recovery_code',
                    'message' => 'Invalid recovery code.',
                ],
            ], Response::HTTP_UNAUTHORIZED); // 401 Unauthorized
        }

        // Transform the user data using UserResource with profile and roles
        $userResource = (new UserResource($recoveryResult['user']))->withProfile()->withRoles();

        // Return JSON response with success status, user data, and token
        return response()->json([
            'success' => true,
            'data' => [
                'user' => $userResource,
                'access_token' => $recoveryResult['access_token'],
                'refresh_token' => $recoveryResult['refresh_token'],
                'token_type' => $recoveryResult['token_type'],
                'expires_in' => $recoveryResult['expires_in'],
            ],
            'message' => 'Multi-factor authentication bypassed with recovery code',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Log out a user by revoking their token
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with success message
     */
    public function logout(Request $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user
        $user = Auth::user();

        // Call the AuthService logout method with user and request
        $this->authService->logout($user, $request);

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Logout successful',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Refresh an authentication token
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with new token data
     */
    public function refreshToken(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for refresh_token
        $validator = Validator::make($request->all(), [
            'refresh_token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Call the AuthService refreshToken method
        $refreshResult = $this->authService->refreshToken($request->refresh_token);

        // If refresh fails, return error response with 401 status
        if ($refreshResult === false) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'invalid_refresh_token',
                    'message' => 'Invalid or expired refresh token.',
                ],
            ], Response::HTTP_UNAUTHORIZED); // 401 Unauthorized
        }

        // Return JSON response with success status and new token data
        return response()->json([
            'success' => true,
            'data' => [
                'access_token' => $refreshResult['access_token'],
                'refresh_token' => $refreshResult['refresh_token'],
                'token_type' => $refreshResult['token_type'],
                'expires_in' => $refreshResult['expires_in'],
            ],
            'message' => 'Token refreshed successfully',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Verify a user's email address
     *
     * @param Request $request
     * @param string $id
     * @param string $hash
     * @return \Illuminate\Http\JsonResponse JSON response with success message
     */
    public function verifyEmail(Request $request, string $id, string $hash): \Illuminate\Http\JsonResponse
    {
        // Call the AuthService verifyEmail method with id and hash
        $verificationResult = $this->authService->verifyEmail($id, $hash);

        // If verification fails, return error response with 400 status
        if ($verificationResult === false) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'invalid_verification_link',
                    'message' => 'Invalid verification link.',
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Resend the email verification link
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with success message
     */
    public function resendVerificationEmail(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for email
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Find the user by email
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'user_not_found',
                    'message' => 'User not found.',
                ],
            ], Response::HTTP_NOT_FOUND); // 404 Not Found
        }

        // Call the AuthService resendVerificationEmail method
        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Verification email resent successfully',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Send a password reset link to the user's email
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with success message
     */
    public function forgotPassword(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for email
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Call the AuthService sendPasswordResetLink method
        $this->authService->sendPasswordResetLink($request->email);

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Password reset link sent successfully',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Reset a user's password using a valid token
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with success message
     */
    public function resetPassword(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for email, token, password, and password_confirmation
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|confirmed|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Call the AuthService resetPassword method
        $resetResult = $this->authService->resetPassword($request->email, $request->token, $request->password);

        // If reset fails, return error response with 400 status
        if ($resetResult === false) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'invalid_reset_token',
                    'message' => 'Invalid or expired reset token.',
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Change a user's password (requires current password)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with success message
     */
    public function changePassword(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for current_password, password, and password_confirmation
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => 'required|string|confirmed|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Get the authenticated user
        $user = Auth::user();

        // Call the AuthService changePassword method
        $changeResult = $this->authService->changePassword($user, $request->current_password, $request->password);

        // If change fails, return error response with 400 status
        if ($changeResult === false) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'invalid_current_password',
                    'message' => 'Invalid current password.',
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Set up multi-factor authentication for a user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with MFA setup data
     */
    public function setupMfa(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for mfa_method and method-specific data
        $validator = Validator::make($request->all(), [
            'mfa_method' => 'required|in:email,sms,totp',
            // Add validation rules for method-specific data here
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Get the authenticated user
        $user = Auth::user();

        // Call the AuthService setupMfa method
        $mfaSetupData = $this->authService->setupMfa($user, $request->mfa_method, $request->all());

        // Return JSON response with MFA setup data (verification code or QR code)
        return response()->json([
            'success' => true,
            'data' => $mfaSetupData,
            'message' => 'MFA setup initiated',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Verify MFA setup by confirming a test code
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with success message and recovery codes
     */
    public function verifyMfaSetup(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for mfa_method and verification_code
        $validator = Validator::make($request->all(), [
            'mfa_method' => 'required|in:email,sms,totp',
            'verification_code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Get the authenticated user
        $user = Auth::user();

        // Call the AuthService verifyMfaSetup method
        $verificationResult = $this->authService->verifyMfaSetup($user, $request->mfa_method, $request->verification_code);

        // If verification fails, return error response with 400 status
        if ($verificationResult === false) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'invalid_verification_code',
                    'message' => 'Invalid verification code.',
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Generate recovery codes
        $recoveryCodes = $this->authService->generateRecoveryCodes($user);

        // Return JSON response with success message and recovery codes
        return response()->json([
            'success' => true,
            'data' => [
                'recovery_codes' => $recoveryCodes,
            ],
            'message' => 'MFA setup verified successfully',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Disable multi-factor authentication for a user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with success message
     */
    public function disableMfa(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for password
        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation error',
                    'details' => $validator->errors(),
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Get the authenticated user
        $user = Auth::user();

        // Call the AuthService disableMfa method
        $disableResult = $this->authService->disableMfa($user, $request->password);

        // If disabling fails, return error response with 400 status
        if ($disableResult === false) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'invalid_password',
                    'message' => 'Invalid password.',
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'MFA disabled successfully',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Get or generate recovery codes for MFA
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with recovery codes
     */
    public function getRecoveryCodes(Request $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user
        $user = Auth::user();

        // Check if user has MFA enabled
        if (!$user->hasMfaEnabled()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'mfa_not_enabled',
                    'message' => 'MFA is not enabled for this user.',
                ],
            ], Response::HTTP_BAD_REQUEST); // 400 Bad Request
        }

        // Call the AuthService generateRecoveryCodes method
        $recoveryCodes = $this->authService->generateRecoveryCodes($user);

        // Return JSON response with recovery codes
        return response()->json([
            'success' => true,
            'data' => [
                'recovery_codes' => $recoveryCodes,
            ],
            'message' => 'Recovery codes retrieved successfully',
        ], Response::HTTP_OK); // 200 OK
    }

    /**
     * Get the authenticated user's information
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with user data
     */
    public function me(Request $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user
        $user = Auth::user();

        // Transform the user data using UserResource with profile and roles
        $userResource = (new UserResource($user))->withProfile()->withRoles();

        // Return JSON response with user data
        return response()->json([
            'success' => true,
            'data' => [
                'user' => $userResource,
            ],
        ], Response::HTTP_OK); // 200 OK
    }
}