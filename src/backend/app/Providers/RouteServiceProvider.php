<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider; // illuminate/support ^10.0
use Illuminate\Support\Facades\Route; // illuminate/support/facades/route ^10.0
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Support\Facades\RateLimiter; // illuminate/support/facades ^10.0
use Illuminate\Cache\RateLimiting\Limit;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The controller namespace for the application.
     *
     * @var string
     */
    protected $namespace;

    /**
     * The path to your application's "home" route.
     * 
     * This is used by Laravel authentication to redirect users after login.
     *
     * @var string
     */
    public const HOME = '/dashboard';

    /**
     * The namespace for the API controllers.
     *
     * @var string
     */
    protected $apiNamespace;

    /**
     * The API route prefix.
     *
     * @var string
     */
    protected $apiPrefix;

    /**
     * The API version.
     *
     * @var string
     */
    protected $apiVersion;

    /**
     * Register services with the service container.
     *
     * @return void
     */
    public function register()
    {
        $this->apiNamespace = 'App\\Http\\Controllers\\Api';
        $this->apiPrefix = 'api';
        $this->apiVersion = 'v1';
    }

    /**
     * Bootstrap any application services after registration.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureRateLimiting();
        $this->configureRouteModelBindings();
        $this->loadRoutes();
    }

    /**
     * Configure rate limiting for API routes.
     *
     * @return void
     */
    protected function configureRateLimiting()
    {
        // Default rate limit for API routes
        RateLimiter::for('api', function (Request $request) {
            // Admin users get 300 requests per minute
            if ($request->user() && $request->user()->hasRole('administrator')) {
                return Limit::perMinute(300)->by($request->user()->id);
            }

            // Authenticated users get 120 requests per minute
            if ($request->user()) {
                return Limit::perMinute(120)->by($request->user()->id);
            }

            // Guest users get 60 requests per minute
            return Limit::perMinute(60)->by($request->ip())
                ->response(function () {
                    return response()->json([
                        'success' => false,
                        'error' => [
                            'code' => 'RATE_LIMIT_EXCEEDED',
                            'message' => 'Too many requests. Please try again later.'
                        ]
                    ], 429);
                });
        });

        // Payment processing has stricter rate limits
        RateLimiter::for('payment_processing', function (Request $request) {
            return Limit::perMinute(30)->by($request->user() ? $request->user()->id : $request->ip());
        });

        // Document upload rate limits
        RateLimiter::for('document_uploads', function (Request $request) {
            return Limit::perMinute(50)->by($request->user() ? $request->user()->id : $request->ip());
        });

        // Admin operations rate limit
        RateLimiter::for('admin_operations', function (Request $request) {
            return Limit::perMinute(200)->by($request->user()->id);
        });
    }

    /**
     * Configure route model bindings for the application.
     *
     * @return void
     */
    protected function configureRouteModelBindings()
    {
        // Bind route parameters to models
        Route::model('application', \App\Models\Application::class);
        Route::model('document', \App\Models\Document::class);
        Route::model('message', \App\Models\Message::class);
        Route::model('workflow', \App\Models\Workflow::class);
        Route::model('payment', \App\Models\Payment::class);
        Route::model('financial_aid', \App\Models\FinancialAidApplication::class);
    }

    /**
     * Load routes from the route files.
     *
     * @return void
     */
    protected function loadRoutes()
    {
        $this->mapWebRoutes();
        $this->mapApiRoutes();
        $this->mapAdminRoutes();
    }

    /**
     * Map API routes with appropriate middleware and prefixes.
     *
     * @return void
     */
    protected function mapApiRoutes()
    {
        Route::prefix("{$this->apiPrefix}/{$this->apiVersion}")
            ->middleware(['api', 'throttle:api'])
            ->namespace($this->apiNamespace)
            ->group(base_path('routes/api.php'));
    }

    /**
     * Map web routes with appropriate middleware.
     *
     * @return void
     */
    protected function mapWebRoutes()
    {
        Route::middleware('web')
            ->namespace($this->namespace)
            ->group(base_path('routes/web.php'));
    }

    /**
     * Map admin routes with appropriate middleware and prefixes.
     *
     * @return void
     */
    protected function mapAdminRoutes()
    {
        Route::prefix("{$this->apiPrefix}/{$this->apiVersion}/admin")
            ->middleware(['api', 'auth:sanctum', 'role:administrator', 'throttle:admin_operations'])
            ->namespace($this->apiNamespace . '\\Admin')
            ->group(base_path('routes/admin.php'));
    }
}