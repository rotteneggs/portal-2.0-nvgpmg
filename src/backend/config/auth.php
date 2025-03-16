<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | This option controls the default authentication "guard" and password
    | reset options for your application. You may change these defaults
    | as required, but they're a perfect start for most applications.
    |
    */

    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    |
    | Next, you may define every authentication guard for your application.
    | Of course, a great default configuration has been defined for you
    | here which uses session storage and the Eloquent user provider.
    |
    | All authentication drivers have a user provider. This defines how the
    | users are actually retrieved out of your database or other storage
    | mechanisms used by this application to persist your user's data.
    |
    | Supported: "session", "token", "sanctum"
    |
    */

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        'api' => [
            'driver' => 'sanctum', // Laravel Sanctum v3.x
            'provider' => 'users',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    |
    | All authentication drivers have a user provider. This defines how the
    | users are actually retrieved out of your database or other storage
    | mechanisms used by this application to persist your user's data.
    |
    | If you have multiple user tables or models you may configure multiple
    | sources which represent each model / table. These sources may then
    | be assigned to any extra authentication guards you have defined.
    |
    | Supported: "database", "eloquent"
    |
    */

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => App\Models\User::class,
        ],

        // 'users' => [
        //     'driver' => 'database',
        //     'table' => 'users',
        // ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resetting Passwords
    |--------------------------------------------------------------------------
    |
    | You may specify multiple password reset configurations if you have more
    | than one user table or model in the application and you want to have
    | separate password reset settings based on the specific user types.
    |
    | The expire time is the number of minutes that each reset token will be
    | considered valid. This security feature keeps tokens short-lived so
    | they have less time to be guessed. You may change this as needed.
    |
    */

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_resets',
            'expire' => 60, // 60 minutes expiration for reset tokens
            'throttle' => 5, // Wait 5 minutes between reset attempts
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    |
    | Here you may define the amount of seconds before a password confirmation
    | times out and the user is prompted to re-enter their password via the
    | confirmation screen. By default, the timeout lasts for three hours.
    |
    */

    'password_timeout' => 10800, // 3 hours in seconds

    /*
    |--------------------------------------------------------------------------
    | Session Configuration
    |--------------------------------------------------------------------------
    |
    | This option defines the session driver and additional settings.
    | For the Student Admissions Enrollment Platform, we use Redis for
    | high-availability session storage with appropriate security settings.
    |
    */

    'session' => [
        'driver' => 'redis', // Redis 7.0+
        'lifetime' => 120, // 2 hours in minutes
        'expire_on_close' => false,
        'encrypt' => true,
        'secure' => true, // Only transmit cookies over HTTPS
        'http_only' => true, // JavaScript cannot access cookies
        'same_site' => 'lax',
    ],

    /*
    |--------------------------------------------------------------------------
    | Multi-Factor Authentication
    |--------------------------------------------------------------------------
    |
    | Configure multi-factor authentication settings including available methods,
    | role-based requirements, and security parameters.
    |
    */

    'mfa' => [
        'enabled' => true,
        'methods' => ['email', 'sms', 'totp'], // Available MFA methods
        'required_for_roles' => ['Administrator', 'Staff'], // Roles that require MFA
        'optional_for_roles' => ['Applicant', 'Student'], // Roles where MFA is optional
        'code_expiration' => 10, // Minutes until OTP codes expire
        'max_attempts' => 5, // Max failed attempts before lockout
        'lockout_time' => 30, // Minutes of lockout after max failed attempts
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Policy
    |--------------------------------------------------------------------------
    |
    | Define password strength requirements and management policies to ensure
    | secure authentication across the platform.
    |
    */

    'password_policy' => [
        'min_length' => 12, // Minimum password length
        'require_uppercase' => true, // Require at least one uppercase letter
        'require_lowercase' => true, // Require at least one lowercase letter
        'require_numeric' => true, // Require at least one number
        'require_special' => true, // Require at least one special character
        'prevent_common' => true, // Prevent common passwords
        'prevent_personal_info' => true, // Prevent passwords containing personal info
        'history_count' => 5, // Number of previous passwords to prevent reuse
        'expiration_days' => 180, // Password expiration in days (6 months)
    ],

    /*
    |--------------------------------------------------------------------------
    | Account Lockout
    |--------------------------------------------------------------------------
    |
    | Configure account lockout settings to prevent brute force attacks.
    |
    */

    'lockout' => [
        'max_attempts' => 5, // Maximum number of failed attempts
        'decay_minutes' => 30, // Lockout duration in minutes
        'progressive_delays' => [1, 5, 30, 60], // Progressive lockout times in minutes
    ],

];