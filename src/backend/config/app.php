<?php

use Illuminate\Support\Facades\Facade;

/**
 * Application Configuration
 *
 * This file defines the core configuration settings for the Laravel application.
 * It includes settings for the application name, environment, debugging,
 * timezone, locale, encryption, and service providers.
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Application Name
    |--------------------------------------------------------------------------
    |
    | This value is the name of your application. This value is used when the
    | framework needs to display the application's name, such as in emails
    | or on the command line.
    */

    'name' => env('APP_NAME', 'Student Admissions Enrollment Platform'),

    /*
    |--------------------------------------------------------------------------
    | Application Environment
    |--------------------------------------------------------------------------
    |
    | This value determines the "environment" your application is currently
    | running in. This may determine how various things are done such as
    | error reporting and other features.
    */

    'env' => env('APP_ENV', 'production'),

    /*
    |--------------------------------------------------------------------------
    | Application Debug Mode
    |--------------------------------------------------------------------------
    |
    | When your application is in debug mode, detailed error messages with
    | stack traces will be shown on every error that occurs within your
    | application. If disabled, a simple generic error page is shown.
    */

    'debug' => (bool) env('APP_DEBUG', false),

    /*
    |--------------------------------------------------------------------------
    | Application URL
    |--------------------------------------------------------------------------
    |
    | This URL is used by the console to properly generate URLs when using
    | the Artisan command line tool. You should set this to the root of
    | your application so that it is used when running Artisan tasks.
    */

    'url' => env('APP_URL', 'http://localhost'),

    'asset_url' => env('ASSET_URL', null),

    /*
    |--------------------------------------------------------------------------
    | Application Timezone
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default timezone for your application, which
    | will be used by the PHP date and date-time functions. We have chosen
    | America/New_York as the default timezone.
    */

    'timezone' => 'America/New_York',

    /*
    |--------------------------------------------------------------------------
    | Application Locale Configuration
    |--------------------------------------------------------------------------
    |
    | The application locale determines the default locale that will be used
    | by the translation service provider. You are free to set this value
    | to any of the locales which will be supported by the application.
    */

    'locale' => 'en',

    /*
    |--------------------------------------------------------------------------
    | Application Fallback Locale
    |--------------------------------------------------------------------------
    |
    | The fallback locale determines the locale to use when the current one
    | is not available. You may change the value to correspond to any of
    | the language folders that are provided through your application.
    */

    'fallback_locale' => 'en',

    /*
    |--------------------------------------------------------------------------
    | Faker Locale
    |--------------------------------------------------------------------------
    |
    | This locale will be used by the Faker PHP library when generating fake
    | data for your database seeds. For example, this will be used to get
    | localized telephone numbers, street address information and more.
    */

    'faker_locale' => 'en_US',

    /*
    |--------------------------------------------------------------------------
    | Encryption Key
    |--------------------------------------------------------------------------
    |
    | This key is used by the Illuminate encrypter service and should be set
    | to a random, 32 character string. Otherwise, these encrypted strings
    | will not be safe. Please, use the `php artisan key:generate` command.
    */

    'key' => env('APP_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Application Encryption Cipher
    |--------------------------------------------------------------------------
    |
    | This cipher is used by the Illuminate encrypter service to encrypt
    | sensitive data. You are free to change this value. The available
    | ciphers are AES-128-CBC and AES-256-CBC.
    */

    'cipher' => 'AES-256-CBC',

    /*
    |--------------------------------------------------------------------------
    | Maintenance Mode Driver
    |--------------------------------------------------------------------------
    |
    | These configuration options determine the driver used to determine and
    | manage Laravel's "maintenance mode" behavior. The "cache" driver will
    | allow maintenance mode to be quickly enabled / disabled via cache.
    */

    'maintenance' => [
        'driver' => 'file',
    ],

    /*
    |--------------------------------------------------------------------------
    | Autoloaded Service Providers
    |--------------------------------------------------------------------------
    |
    | The service providers listed here will be automatically loaded on the
    | request to your application. Feel free to add your own services to
    | this array to grant expanded functionality to your applications.
    */

    'providers' => [

        /*
         * Laravel Framework Service Providers...
         */
        Illuminate\Auth\AuthServiceProvider::class,
        Illuminate\Broadcasting\BroadcastServiceProvider::class,
        Illuminate\Bus\BusServiceProvider::class,
        Illuminate\Cache\CacheServiceProvider::class,
        Illuminate\Foundation\Providers\ConsoleSupportServiceProvider::class,
        Illuminate\Cookie\CookieServiceProvider::class,
        Illuminate\Database\DatabaseServiceProvider::class,
        Illuminate\Encryption\EncryptionServiceProvider::class,
        Illuminate\Filesystem\FilesystemServiceProvider::class,
        Illuminate\Foundation\Providers\FoundationServiceProvider::class,
        Illuminate\Hashing\HashServiceProvider::class,
        Illuminate\Mail\MailServiceProvider::class,
        Illuminate\Notifications\NotificationServiceProvider::class,
        Illuminate\Pagination\PaginationServiceProvider::class,
        Illuminate\Pipeline\PipelineServiceProvider::class,
        Illuminate\Queue\QueueServiceProvider::class,
        Illuminate\Redis\RedisServiceProvider::class,
        Illuminate\Auth\Passwords\PasswordResetServiceProvider::class,
        Illuminate\Session\SessionServiceProvider::class,
        Illuminate\Translation\TranslationServiceProvider::class,
        Illuminate\Validation\ValidationServiceProvider::class,
        Illuminate\View\ViewServiceProvider::class,

        /*
         * Package Service Providers...
         */
        Laravel\Sanctum\SanctumServiceProvider::class, // v3.x
        Laravel\Horizon\HorizonServiceProvider::class, // v5.x

        /*
         * Application Service Providers...
         */
        App\Providers\AppServiceProvider::class,
        App\Providers\AuthServiceProvider::class,
        App\Providers\EventServiceProvider::class,
        App\Providers\RouteServiceProvider::class,
	    App\Providers\AIServiceProvider::class,
        App\Providers\IntegrationServiceProvider::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | Class Aliases
    |--------------------------------------------------------------------------
    |
    | This array of class aliases will be registered when this application
    | is started. However, feel free to register as many as you wish as
    | the aliases are "lazy" loaded so they don't hinder performance.
    */

    'aliases' => [

        'App' => Illuminate\Support\Facades\App::class,
        'Arr' => Illuminate\Support\Arr::class,
        'Artisan' => Illuminate\Support\Facades\Artisan::class,
        'Auth' => Illuminate\Support\Facades\Auth::class,
        'Blade' => Illuminate\Support\Facades\Blade::class,
        'Broadcast' => Illuminate\Support\Facades\Broadcast::class,
        'Bus' => Illuminate\Support\Facades\Bus::class,
        'Cache' => Illuminate\Support\Facades\Cache::class,
        'Config' => Illuminate\Support\Facades\Config::class,
        'Cookie' => Illuminate\Support\Facades\Cookie::class,
        'Crypt' => Illuminate\Support\Facades\Crypt::class,
        'Date' => Illuminate\Support\Facades\Date::class,
        'DB' => Illuminate\Support\Facades\DB::class,
        'Eloquent' => Illuminate\Database\Eloquent\Model::class,
        'Event' => Illuminate\Support\Facades\Event::class,
        'File' => Illuminate\Support\Facades\File::class,
        'Gate' => Illuminate\Support\Facades\Gate::class,
        'Hash' => Illuminate\Support\Facades\Hash::class,
        'Http' => Illuminate\Support\Facades\Http::class,
        'Js' => Illuminate\Support\Js::class,
        'Lang' => Illuminate\Support\Facades\Lang::class,
        'Log' => Illuminate\Support\Facades\Log::class,
        'Mail' => Illuminate\Support\Facades\Mail::class,
        'Notification' => Illuminate\Support\Facades\Notification::class,
        'Password' => Illuminate\Support\Facades\Password::class,
        'Queue' => Illuminate\Support\Facades\Queue::class,
        'RateLimiter' => Illuminate\Support\Facades\RateLimiter::class,
        'Redirect' => Illuminate\Support\Facades\Redirect::class,
        'Request' => Illuminate\Support\Facades\Request::class,
        'Response' => Illuminate\Support\Facades\Response::class,
        'Route' => Illuminate\Support\Facades\Route::class,
        'Schema' => Illuminate\Support\Facades\Schema::class,
        'Session' => Illuminate\Support\Facades\Session::class,
        'Storage' => Illuminate\Support\Facades\Storage::class,
        'Str' => Illuminate\Support\Str::class,
        'URL' => Illuminate\Support\Facades\URL::class,
        'Validator' => Illuminate\Support\Facades\Validator::class,
        'View' => Illuminate\Support\Facades\View::class,

		/*
		 * Custom Aliases
		 */
		'AIService' => App\Facades\AIService::class,
		'DocumentService' => App\Facades\DocumentService::class,
		'WorkflowEngine' => App\Facades\WorkflowEngine::class,
		'PaymentService' => App\Facades\PaymentService::class,
		'NotificationService' => App\Facades\NotificationService::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | Middleware Groups
    |--------------------------------------------------------------------------
    |
    | These middleware groups provide a convenient way to assign middleware
    | to routes that share the same middleware. For example, you can add
    | a group of middleware to all of your web routes including session.
    */

    'middlewareGroups' => [
        'web' => [
            \App\Http\Middleware\EncryptCookies::class, // Encrypt cookies
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class, // Add queued cookies to response
            \Illuminate\Session\Middleware\StartSession::class, // Start session
            \Illuminate\View\Middleware\ShareErrorsFromSession::class, // Share errors from session
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class, // Verify CSRF token
            \Illuminate\Routing\Middleware\SubstituteBindings::class, // Substitute route model bindings
            \App\Http\Middleware\SecurityHeaders::class, // Apply security headers
        ],

        'api' => [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class, // Ensure frontend requests are stateful for Sanctum
            'throttle:api', // Apply API rate limiting
            \Illuminate\Routing\Middleware\SubstituteBindings::class, // Substitute route model bindings
            \App\Http\Middleware\SecurityHeaders::class, // Apply security headers
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Route Middleware
    |--------------------------------------------------------------------------
    |
    | These middleware may be assigned to groups or used individually. They
    | provide a convenient shortcut to assigning middleware to your routes
    | so you may easily assign the middleware to any route or route group.
    */

    'routeMiddleware' => [
        'auth' => \Illuminate\Auth\Middleware\Authenticate::class, // Authenticate user
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class, // Authenticate with basic auth
        'auth.session' => \Illuminate\Session\Middleware\AuthenticateSession::class, // Authenticate session
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class, // Set cache headers
        'can' => \Illuminate\Auth\Middleware\Authorize::class, // Authorize user action
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class, // Redirect if authenticated
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class, // Require password confirmation
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class, // Validate route signature
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class, // Throttle requests
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class, // Ensure email is verified
		'role' => \App\Http\Middleware\CheckRole::class, // Check user role
		'permission' => \App\Http\Middleware\CheckPermission::class, // Check user permission
		'rate.limit' => \App\Http\Middleware\RateLimiter::class, // Apply custom rate limiter
    ],

	/*
	|--------------------------------------------------------------------------
	| Security Settings
	|--------------------------------------------------------------------------
	|
	| These settings configure various security aspects of the application,
	| such as password hashing, session security, and HTTP headers.
	*/
	'security_settings' => [
		'hashing' => [
			'driver' => 'bcrypt', // Use bcrypt for password hashing
			'rounds' => 12, // Number of hashing rounds (higher is more secure but slower)
			'description' => 'Password hashing configuration',
		],
		'session' => [
			'secure' => true, // Ensure session cookies are only sent over HTTPS
			'http_only' => true, // Prevent client-side JavaScript from accessing session cookies
			'same_site' => 'lax', // Provide some CSRF protection
			'description' => 'Session cookie security settings',
		],
		'headers' => [
			'x_frame_options' => 'SAMEORIGIN', // Prevent clickjacking attacks
			'x_content_type_options' => 'nosniff', // Prevent MIME sniffing
			'x_xss_protection' => '1; mode=block', // Enable XSS filtering
			'content_security_policy' => "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'", // Define content security policy
			'description' => 'Security headers applied to all responses',
		],
	],
];