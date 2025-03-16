<?php

use Laravel\Sanctum\Sanctum;

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Requests from the following domains / hosts will receive stateful API
    | authentication cookies. Typically, these should include your local
    | and production domains which access your API via a frontend SPA.
    |
    */

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1,admissions.example.com',
        Sanctum::currentApplicationUrlWithPort()
    ))),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | This array contains the authentication guards that will be checked when
    | Sanctum is trying to authenticate a request. If none of these guards
    | are able to authenticate the request, Sanctum will use the bearer
    | token that's present on an incoming request for authentication.
    |
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | This value controls the number of minutes until an issued token will be
    | considered expired. If this value is null, personal access tokens do
    | not expire. This won't tweak the lifetime of first-party sessions.
    |
    | This is set to 15 minutes for security purposes as specified in the
    | application's token handling requirements.
    |
    */

    'expiration' => 15,

    /*
    |--------------------------------------------------------------------------
    | Refresh Token TTL
    |--------------------------------------------------------------------------
    |
    | This value determines the number of minutes that refresh tokens should
    | remain valid. When this time has expired, the user will need to log in
    | again.
    |
    | Set to 12 hours (720 minutes) as specified in security requirements.
    |
    */

    'refresh_ttl' => 720,

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    |
    | When authenticating your first-party SPA with Sanctum you may need to
    | customize some of the middleware Sanctum uses while processing the
    | request. You may change the middleware listed below as required.
    |
    */

    'middleware' => [
        'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | API Route Prefix
    |--------------------------------------------------------------------------
    |
    | This value defines the prefix for Sanctum API routes. This ensures 
    | consistency in API versioning and maintains the RESTful structure
    | as specified in the API design requirements.
    |
    */

    'prefix' => 'api/v1',

    /*
    |--------------------------------------------------------------------------
    | Token Blacklist
    |--------------------------------------------------------------------------
    |
    | Configuration for token blacklisting which allows for invalidating tokens
    | that have been revoked. This provides additional security by preventing
    | the use of tokens after they have been explicitly revoked.
    |
    */

    'token_blacklist' => [
        'enabled' => true,
        'storage' => 'redis',  // Use Redis for high-performance token blacklisting
        'ttl' => 1440,         // 24 hours in minutes
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Configuration for API rate limiting to prevent abuse and ensure system
    | stability. This limits the number of requests a user can make within
    | a specified time frame.
    |
    */

    'rate_limiting' => [
        'enabled' => true,
        'attempts' => 60,      // 60 requests
        'decay_minutes' => 1,  // per minute
    ],

    /*
    |--------------------------------------------------------------------------
    | Token Abilities
    |--------------------------------------------------------------------------
    |
    | Predefined token abilities that can be assigned to tokens for granular
    | permission control. These abilities align with the application's
    | permission requirements for various resources.
    |
    */

    'token_abilities' => [
        'applications:read',
        'applications:write',
        'documents:read',
        'documents:write',
        'messages:read',
        'messages:write',
        'profile:read',
        'profile:write',
        'admin:access',
    ],

];