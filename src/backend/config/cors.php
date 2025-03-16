<?php

/**
 * Cross-Origin Resource Sharing (CORS) Configuration
 *
 * This file contains configurations for the Cross-Origin Resource Sharing (CORS)
 * middleware that is applied to your API routes. CORS defines a way in which a
 * browser and server can interact to safely determine whether or not to allow
 * cross-origin requests.
 *
 * These settings control which origins, methods, and headers are permitted for
 * cross-origin requests to ensure proper security while allowing legitimate 
 * frontend applications to communicate with the backend API.
 *
 * For detailed information on CORS, see: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */

return [

    /*
    |--------------------------------------------------------------------------
    | CORS Paths
    |--------------------------------------------------------------------------
    |
    | This defines the paths where CORS will be applied. By default, we apply
    | CORS to all API routes and the Sanctum CSRF cookie endpoint which is
    | needed for SPA authentication.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Request Methods
    |--------------------------------------------------------------------------
    |
    | Specifies the HTTP methods that are allowed for cross-origin requests.
    | This includes standard RESTful methods as well as OPTIONS which is
    | used for preflight requests.
    |
    */

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins
    |--------------------------------------------------------------------------
    |
    | Specifies which origins can access the API. For the Student Admissions
    | Enrollment Platform, this is configured to use an environment variable
    | for the frontend URL, with a fallback to localhost for development.
    |
    */

    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins Patterns
    |--------------------------------------------------------------------------
    |
    | Allows more complex pattern matching for allowed origins using regular
    | expressions. This is useful for allowing multiple subdomains or
    | dynamically-named environments.
    |
    */

    'allowed_origins_patterns' => [],

    /*
    |--------------------------------------------------------------------------
    | Allowed Headers
    |--------------------------------------------------------------------------
    |
    | Lists the HTTP headers that can be included in cross-origin requests.
    | Important headers like Authorization and X-CSRF-TOKEN are included
    | to ensure proper authentication functionality.
    |
    */

    'allowed_headers' => [
        'Content-Type',
        'X-Requested-With',
        'Authorization',
        'X-CSRF-TOKEN',
        'Accept',
        'Origin',
    ],

    /*
    |--------------------------------------------------------------------------
    | Exposed Headers
    |--------------------------------------------------------------------------
    |
    | Lists the HTTP headers that should be exposed to the browser in the
    | response. These headers will be accessible via JavaScript in the browser.
    |
    */

    'exposed_headers' => [
        'Cache-Control',
        'Content-Language',
        'Content-Type',
        'Expires',
        'Last-Modified',
        'Pragma',
    ],

    /*
    |--------------------------------------------------------------------------
    | Max Age
    |--------------------------------------------------------------------------
    |
    | Defines the maximum time (in seconds) that the results of a preflight
    | request can be cached by the browser. This helps reduce the number of
    | preflight requests for better performance.
    |
    | Current value: 86400 seconds = 24 hours
    |
    */

    'max_age' => 86400,

    /*
    |--------------------------------------------------------------------------
    | Supports Credentials
    |--------------------------------------------------------------------------
    |
    | Determines whether cookies, HTTP authentication, and client-side SSL
    | certificates are included in cross-origin requests. This must be true
    | for the Student Admissions Enrollment Platform to properly handle
    | authentication across origins.
    |
    */

    'supports_credentials' => true,

];