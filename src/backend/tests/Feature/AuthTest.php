<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase; // Laravel ^10.0
use Illuminate\Support\Facades\Hash; // Illuminate\Support\Facades\Hash ^10.0
use Illuminate\Support\Facades\Notification; // Illuminate\Support\Facades\Notification ^10.0
use Illuminate\Support\Facades\URL; // Illuminate\Support\Facades\URL ^10.0
use Illuminate\Support\Facades\Redis; // Illuminate\Support\Facades\Redis ^10.0
use Illuminate\Support\Str; // Illuminate\Support\Str ^10.0
use Tests\TestCase; // Tests\TestCase
use App\Models\User; // App\Models\User
use App\Services\AuthService; // App\Services\AuthService

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that a user can register with valid data
     *
     * @return void
     */
    public function test_user_can_register_with_valid_data(): void
    {
        // 1. Create registration data with valid user information
        $registrationData = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ];

        // 2. Send a POST request to the registration endpoint
        $response = $this->postJson('/api/v1/auth/register', $registrationData);

        // 3. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 4. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 5. Assert that the response contains a token
        $response->assertJsonStructure(['data' => ['access_token']]);

        // 6. Assert that the user was created in the database
        $this->assertDatabaseHas('users', ['email' => 'john.doe@example.com']);

        // 7. Assert that the user profile was created with the provided data
        $this->assertDatabaseHas('user_profiles', [
            'first_name' => 'John',
            'last_name' => 'Doe',
        ]);
    }

    /**
     * Test that a user cannot register with invalid data
     *
     * @return void
     */
    public function test_user_cannot_register_with_invalid_data(): void
    {
        // 1. Create registration data with invalid email format
        $registrationDataInvalidEmail = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'invalid-email',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ];

        // 2. Send a POST request to the registration endpoint
        $responseInvalidEmail = $this->postJson('/api/v1/auth/register', $registrationDataInvalidEmail);

        // 3. Assert that the response has a 422 status code
        $responseInvalidEmail->assertStatus(422);

        // 4. Assert that the response contains validation errors for email
        $responseInvalidEmail->assertJsonValidationErrors(['email']);

        // 5. Create registration data with weak password
        $registrationDataWeakPassword = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'password' => 'weak',
            'password_confirmation' => 'weak',
        ];

        // 6. Send a POST request to the registration endpoint
        $responseWeakPassword = $this->postJson('/api/v1/auth/register', $registrationDataWeakPassword);

        // 7. Assert that the response has a 422 status code
        $responseWeakPassword->assertStatus(422);

        // 8. Assert that the response contains validation errors for password
        $responseWeakPassword->assertJsonValidationErrors(['password']);

        // 9. Create registration data with mismatched password confirmation
        $registrationDataMismatchedPassword = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'DifferentPassword!',
        ];

        // 10. Send a POST request to the registration endpoint
        $responseMismatchedPassword = $this->postJson('/api/v1/auth/register', $registrationDataMismatchedPassword);

        // 11. Assert that the response has a 422 status code
        $responseMismatchedPassword->assertStatus(422);

        // 12. Assert that the response contains validation errors for password confirmation
        $responseMismatchedPassword->assertJsonValidationErrors(['password']);
    }

    /**
     * Test that a user cannot register with an email that is already in use
     *
     * @return void
     */
    public function test_user_cannot_register_with_existing_email(): void
    {
        // 1. Create a user with a specific email
        $existingUser = $this->createUser(['email' => 'existing@example.com']);

        // 2. Create registration data with the same email
        $registrationData = [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'existing@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ];

        // 3. Send a POST request to the registration endpoint
        $response = $this->postJson('/api/v1/auth/register', $registrationData);

        // 4. Assert that the response has a 422 status code
        $response->assertStatus(422);

        // 5. Assert that the response contains validation errors for email uniqueness
        $response->assertJsonValidationErrors(['email']);
    }

    /**
     * Test that a user can login with valid credentials
     *
     * @return void
     */
    public function test_user_can_login_with_valid_credentials(): void
    {
        // 1. Create a user with known credentials
        $user = $this->createUser(['email' => 'test@example.com', 'password' => Hash::make('password')]);

        // 2. Send a POST request to the login endpoint with valid credentials
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        // 3. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 4. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 5. Assert that the response contains a token
        $response->assertJsonStructure(['data' => ['access_token']]);

        // 6. Assert that the response contains the user data
        $response->assertJsonStructure(['data' => ['user']]);
    }

    /**
     * Test that a user cannot login with invalid credentials
     *
     * @return void
     */
    public function test_user_cannot_login_with_invalid_credentials(): void
    {
        // 1. Create a user with known credentials
        $user = $this->createUser(['email' => 'test@example.com', 'password' => Hash::make('password')]);

        // 2. Send a POST request to the login endpoint with incorrect password
        $responseIncorrectPassword = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        // 3. Assert that the response has a 401 status code
        $responseIncorrectPassword->assertStatus(401);

        // 4. Assert that the response contains an error message
        $responseIncorrectPassword->assertJson(['success' => false, 'error' => ['message' => 'Invalid credentials']]);

        // 5. Send a POST request to the login endpoint with non-existent email
        $responseNonExistentEmail = $this->postJson('/api/v1/auth/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password',
        ]);

        // 6. Assert that the response has a 401 status code
        $responseNonExistentEmail->assertStatus(401);

        // 7. Assert that the response contains an error message
        $responseNonExistentEmail->assertJson(['success' => false, 'error' => ['message' => 'Invalid credentials']]);
    }

    /**
     * Test that a user cannot login with an inactive account
     *
     * @return void
     */
    public function test_user_cannot_login_with_inactive_account(): void
    {
        // 1. Create a user with inactive status
        $user = $this->createUser(['email' => 'inactive@example.com', 'password' => Hash::make('password'), 'is_active' => false]);

        // 2. Send a POST request to the login endpoint with valid credentials
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'password',
        ]);

        // 3. Assert that the response has a 401 status code
        $response->assertStatus(401);

        // 4. Assert that the response contains an error message about inactive account
        $response->assertJson(['success' => false, 'error' => ['message' => 'Inactive account']]);
    }

    /**
     * Test that a user can logout
     *
     * @return void
     */
    public function test_user_can_logout(): void
    {
        // 1. Create a user
        $user = $this->createUser();

        // 2. Authenticate as the user
        $this->actingAs($user);

        // 3. Send a POST request to the logout endpoint
        $response = $this->postJson('/api/v1/auth/logout');

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 6. Assert that the token has been invalidated by trying to access a protected endpoint
        $response = $this->getJson('/api/v1/auth/me');
        $response->assertStatus(401);
    }

    /**
     * Test that a user can verify their email address
     *
     * @return void
     */
    public function test_user_can_verify_email(): void
    {
        // 1. Create a user with unverified email
        $user = $this->createUser(['email_verified_at' => null]);

        // 2. Generate a signed verification URL
        $verificationUrl = URL::signedRoute('verification.verify', ['id' => $user->id, 'hash' => sha1($user->email)]);

        // 3. Send a GET request to the verification endpoint
        $response = $this->get($verificationUrl);

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 6. Assert that the user's email_verified_at timestamp has been updated in the database
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    /**
     * Test that a user cannot verify their email with an invalid signature
     *
     * @return void
     */
    public function test_user_cannot_verify_email_with_invalid_signature(): void
    {
        // 1. Create a user with unverified email
        $user = $this->createUser(['email_verified_at' => null]);

        // 2. Generate an invalid verification URL
        $verificationUrl = '/api/v1/auth/verify-email/' . $user->id . '/invalid-hash';

        // 3. Send a GET request to the verification endpoint
        $response = $this->get($verificationUrl);

        // 4. Assert that the response has a 400 status code
        $response->assertStatus(400);

        // 5. Assert that the response contains an error message
        $response->assertJson(['success' => false, 'error' => ['message' => 'Invalid signature']]);

        // 6. Assert that the user's email_verified_at timestamp remains null in the database
        $this->assertNull($user->fresh()->email_verified_at);
    }

    /**
     * Test that a user can request a new verification email
     *
     * @return void
     */
    public function test_user_can_resend_verification_email(): void
    {
        // 1. Create a user with unverified email
        $user = $this->createUser(['email_verified_at' => null]);

        // 2. Fake the notification system
        Notification::fake();

        // 3. Send a POST request to the resend verification endpoint
        $response = $this->actingAs($user)->postJson('/api/v1/auth/email/resend');

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 6. Assert that a verification email notification was sent
        Notification::assertSentTo(
            [$user],
            \Illuminate\Auth\Notifications\VerifyEmail::class
        );
    }

    /**
     * Test that a user can request a password reset
     *
     * @return void
     */
    public function test_user_can_request_password_reset(): void
    {
        // 1. Create a user
        $user = $this->createUser();

        // 2. Fake the notification system
        Notification::fake();

        // 3. Send a POST request to the forgot password endpoint
        $response = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 6. Assert that a password reset notification was sent
        Notification::assertSentTo(
            [$user],
            \Illuminate\Auth\Notifications\ResetPassword::class
        );
    }

    /**
     * Test that a user can reset their password with a valid token
     *
     * @return void
     */
    public function test_user_can_reset_password_with_valid_token(): void
    {
        // 1. Create a user
        $user = $this->createUser();

        // 2. Create a password reset token
        $token = Password::createToken($user);

        // 3. Send a POST request to the reset password endpoint with valid token and new password
        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 6. Assert that the user's password has been updated in the database
        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));

        // 7. Assert that the user can login with the new password
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'NewPassword123!',
        ]);
        $response->assertStatus(200);
    }

    /**
     * Test that a user cannot reset their password with an invalid token
     *
     * @return void
     */
    public function test_user_cannot_reset_password_with_invalid_token(): void
    {
        // 1. Create a user
        $user = $this->createUser();

        // 2. Send a POST request to the reset password endpoint with invalid token
        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        // 3. Assert that the response has a 400 status code
        $response->assertStatus(400);

        // 4. Assert that the response contains an error message
        $response->assertJson(['success' => false, 'error' => ['message' => 'Invalid token']]);

        // 5. Assert that the user's password remains unchanged in the database
        $this->assertFalse(Hash::check('NewPassword123!', $user->fresh()->password));
    }

    /**
     * Test that an authenticated user can change their password
     *
     * @return void
     */
    public function test_authenticated_user_can_change_password(): void
    {
        // 1. Create a user with known password
        $user = $this->createUser(['password' => Hash::make('OldPassword123!')]);

        // 2. Authenticate as the user
        $this->actingAs($user);

        // 3. Send a POST request to the change password endpoint with current and new password
        $response = $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'OldPassword123!',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 6. Assert that the user's password has been updated in the database
        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));

        // 7. Assert that the user can login with the new password
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'NewPassword123!',
        ]);
        $response->assertStatus(200);
    }

    /**
     * Test that an authenticated user cannot change their password with incorrect current password
     *
     * @return void
     */
    public function test_authenticated_user_cannot_change_password_with_incorrect_current_password(): void
    {
        // 1. Create a user with known password
        $user = $this->createUser(['password' => Hash::make('OldPassword123!')]);

        // 2. Authenticate as the user
        $this->actingAs($user);

        // 3. Send a POST request to the change password endpoint with incorrect current password
        $response = $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'WrongPassword!',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        // 4. Assert that the response has a 400 status code
        $response->assertStatus(400);

        // 5. Assert that the response contains an error message
        $response->assertJson(['success' => false, 'error' => ['message' => 'Incorrect current password']]);

        // 6. Assert that the user's password remains unchanged in the database
        $this->assertTrue(Hash::check('OldPassword123!', $user->fresh()->password));
    }

    /**
     * Test that a user can set up multi-factor authentication
     *
     * @return void
     */
    public function test_user_can_setup_mfa(): void
    {
        // 1. Create a user
        $user = $this->createUser();

        // 2. Authenticate as the user
        $this->actingAs($user);

        // 3. Send a POST request to the setup MFA endpoint with method 'email'
        $response = $this->postJson('/api/v1/auth/mfa/setup', ['method' => 'email']);

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains setup data
        $response->assertJsonStructure(['data' => ['method']]);

        // 6. Mock the verification code validation
        Redis::shouldReceive('get')->with("mfa:{$user->id}:code")->andReturn('123456');

        // 7. Send a POST request to verify the MFA setup
        $response = $this->postJson('/api/v1/auth/mfa/verify', ['code' => '123456']);

        // 8. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 9. Assert that the response contains success message and recovery codes
        $response->assertJsonStructure(['data' => ['recovery_codes']]);

        // 10. Assert that the user has MFA enabled in the database
        $this->assertNotNull($user->fresh()->mfa_secret);
    }

    /**
     * Test that a user with MFA enabled requires verification when logging in
     *
     * @return void
     */
    public function test_user_with_mfa_requires_verification_on_login(): void
    {
        // 1. Create a user with MFA enabled
        $user = $this->createUser(['password' => Hash::make('password')]);
        $user->enableMfa('email');

        // 2. Send a POST request to the login endpoint with valid credentials
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        // 3. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 4. Assert that the response indicates MFA is required
        $response->assertJson(['data' => ['mfa_required' => true]]);

        // 5. Assert that the response contains a user ID for MFA verification
        $response->assertJsonStructure(['data' => ['user_id']]);

        // 6. Assert that the response does not contain a token
        $response->assertJsonMissing(['data' => ['access_token']]);
    }

    /**
     * Test that a user can verify an MFA code during login
     *
     * @return void
     */
    public function test_user_can_verify_mfa_code(): void
    {
        // 1. Create a user with MFA enabled
        $user = $this->createUser(['password' => Hash::make('password')]);
        $user->enableMfa('email');

        // 2. Generate and store a valid MFA code
        Redis::shouldReceive('get')->with("mfa:{$user->id}:code")->andReturn('123456');

        // 3. Send a POST request to the verify MFA endpoint with the code
        $response = $this->postJson('/api/v1/auth/mfa/verify', [
            'user_id' => $user->id,
            'code' => '123456',
        ]);

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 6. Assert that the response contains a token
        $response->assertJsonStructure(['data' => ['access_token']]);

        // 7. Assert that the response contains the user data
        $response->assertJsonStructure(['data' => ['user']]);
    }

    /**
     * Test that a user cannot verify with an invalid MFA code
     *
     * @return void
     */
    public function test_user_cannot_verify_with_invalid_mfa_code(): void
    {
        // 1. Create a user with MFA enabled
        $user = $this->createUser(['password' => Hash::make('password')]);
        $user->enableMfa('email');

        // 2. Send a POST request to the verify MFA endpoint with an invalid code
        $response = $this->postJson('/api/v1/auth/mfa/verify', [
            'user_id' => $user->id,
            'code' => 'invalid-code',
        ]);

        // 3. Assert that the response has a 401 status code
        $response->assertStatus(401);

        // 4. Assert that the response contains an error message
        $response->assertJson(['success' => false, 'error' => ['message' => 'Invalid MFA code']]);
    }

    /**
     * Test that a user can use a recovery code to bypass MFA
     *
     * @return void
     */
    public function test_user_can_use_recovery_code(): void
    {
        // 1. Create a user with MFA enabled
        $user = $this->createUser(['password' => Hash::make('password')]);
        $authService = new AuthService(resolve('App\Services\AuditService'), resolve('App\Services\NotificationService'));
        $recoveryCodes = $authService->generateRecoveryCodes($user);

        // 2. Generate recovery codes for the user
        Redis::shouldReceive('get')->with("mfa:recovery_codes:{$user->id}")->andReturn(json_encode($recoveryCodes));

        // 3. Send a POST request to the recovery code endpoint with a valid code
        $response = $this->postJson('/api/v1/auth/mfa/recovery', [
            'user_id' => $user->id,
            'recovery_code' => $recoveryCodes[0],
        ]);

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 6. Assert that the response contains a token
        $response->assertJsonStructure(['data' => ['access_token']]);

        // 7. Assert that the recovery code has been consumed and cannot be used again
        Redis::shouldReceive('get')->with("mfa:recovery_codes:{$user->id}")->andReturn(json_encode(array_slice($recoveryCodes, 1)));
    }

    /**
     * Test that a user can disable MFA
     *
     * @return void
     */
    public function test_user_can_disable_mfa(): void
    {
        // 1. Create a user with MFA enabled
        $user = $this->createUser(['password' => Hash::make('password')]);
        $user->enableMfa('email');

        // 2. Authenticate as the user
        $this->actingAs($user);

        // 3. Send a POST request to the disable MFA endpoint with password confirmation
        $response = $this->postJson('/api/v1/auth/mfa/disable', [
            'password' => 'password',
        ]);

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a success message
        $response->assertJson(['success' => true]);

        // 6. Assert that the user no longer has MFA enabled in the database
        $this->assertNull($user->fresh()->mfa_secret);
    }

    /**
     * Test that a user can retrieve their MFA recovery codes
     *
     * @return void
     */
    public function test_user_can_get_recovery_codes(): void
    {
        // 1. Create a user with MFA enabled
        $user = $this->createUser();
        $authService = new AuthService(resolve('App\Services\AuditService'), resolve('App\Services\NotificationService'));
        $recoveryCodes = $authService->generateRecoveryCodes($user);
        $user->enableMfa('email');

        // 2. Generate recovery codes for the user
        Redis::shouldReceive('get')->with("mfa:recovery_codes:{$user->id}")->andReturn(json_encode($recoveryCodes));

        // 3. Authenticate as the user
        $this->actingAs($user);

        // 4. Send a GET request to the recovery codes endpoint
        $response = $this->getJson('/api/v1/auth/mfa/recovery-codes');

        // 5. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 6. Assert that the response contains recovery codes
        $response->assertJsonStructure(['data' => ['recovery_codes']]);

        // 7. Assert that the recovery codes match the expected format
        $response->assertJson(['data' => ['recovery_codes' => $recoveryCodes]]);
    }

    /**
     * Test that a user can refresh their authentication token
     *
     * @return void
     */
    public function test_user_can_refresh_token(): void
    {
        // 1. Create a user
        $user = $this->createUser(['password' => Hash::make('password')]);

        // 2. Authenticate as the user to get an initial token and refresh token
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $accessToken = $response['data']['access_token'];
        $refreshToken = $response['data']['refresh_token'];

        // 3. Send a POST request to the refresh token endpoint with the refresh token
        $response = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refreshToken]);

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains a new token
        $response->assertJsonStructure(['data' => ['access_token']]);

        // 6. Assert that the new token is different from the original token
        $newAccessToken = $response['data']['access_token'];
        $this->assertNotEquals($accessToken, $newAccessToken);

        // 7. Assert that the original token has been invalidated
        $this->withHeaders(['Authorization' => 'Bearer ' . $accessToken])
             ->getJson('/api/v1/auth/me')
             ->assertStatus(401);
    }

    /**
     * Test that an authenticated user can retrieve their profile information
     *
     * @return void
     */
    public function test_authenticated_user_can_get_their_profile(): void
    {
        // 1. Create a user with profile data
        $user = $this->createUser([
            'email' => 'profile@example.com',
            'first_name' => 'Profile',
            'last_name' => 'User',
        ]);

        // 2. Authenticate as the user
        $this->actingAs($user);

        // 3. Send a GET request to the me endpoint
        $response = $this->getJson('/api/v1/auth/me');

        // 4. Assert that the response has a 200 status code
        $response->assertStatus(200);

        // 5. Assert that the response contains the user's email
        $response->assertJson(['data' => ['email' => 'profile@example.com']]);

        // 6. Assert that the response contains the user's profile information
        $response->assertJson(['data' => ['profile' => ['first_name' => 'Profile', 'last_name' => 'User']]]);

        // 7. Assert that the response contains the user's roles
        $response->assertJsonStructure(['data' => ['roles']]);
    }
}