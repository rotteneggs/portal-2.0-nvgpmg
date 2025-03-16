<?php

namespace App\Providers;

use App\Services\ApplicationService; // Import ApplicationService class
use App\Services\DocumentService; // Import DocumentService class
use App\Services\WorkflowEngineService; // Import WorkflowEngineService class
use App\Services\NotificationService; // Import NotificationService class
use App\Services\PaymentService; // Import PaymentService class
use App\Services\UserService; // Import UserService class
use App\Services\AuditService; // Import AuditService class
use App\Services\StorageService; // Import StorageService class
use App\Services\FinancialAidService; // Import FinancialAidService class
use Illuminate\Support\ServiceProvider; // -- illuminate/support ^10.0
use Illuminate\Support\Facades\Schema; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\URL; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Blade; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Config; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Redis; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\DB; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Validator; // -- illuminate/support/facades ^10.0

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register(): void
    {
        // LD1: Register ApplicationService as a singleton
        $this->app->singleton(ApplicationService::class, function ($app) {
            return new ApplicationService(
                $app->make(DocumentService::class),
                $app->make(WorkflowEngineService::class),
                $app->make(NotificationService::class),
                $app->make(AuditService::class)
            );
        });

        // LD1: Register DocumentService as a singleton
        $this->app->singleton(DocumentService::class, function ($app) {
            return new DocumentService(
                $app->make(StorageService::class)
            );
        });

        // LD1: Register WorkflowEngineService as a singleton
        $this->app->singleton(WorkflowEngineService::class, function ($app) {
            return new WorkflowEngineService(
                $app->make(WorkflowService::class),
                $app->make(NotificationService::class),
                $app->make(AuditService::class)
            );
        });

        // LD1: Register NotificationService as a singleton
        $this->app->singleton(NotificationService::class, function ($app) {
            return new NotificationService(
                $app->make(EmailService::class),
                $app->make(SMSService::class)
            );
        });

        // LD1: Register PaymentService as a singleton
        $this->app->singleton(PaymentService::class, function ($app) {
            return new PaymentService(
                $app->make(PaymentGatewayService::class),
                $app->make(AuditService::class)
            );
        });

        // LD1: Register UserService as a singleton
        $this->app->singleton(UserService::class, function ($app) {
            return new UserService(
                $app->make(AuditService::class),
                $app->make(NotificationService::class)
            );
        });

        // LD1: Register AuditService as a singleton
        $this->app->singleton(AuditService::class, function ($app) {
            return new AuditService(
                $app['request']
            );
        });

        // LD1: Register StorageService as a singleton
        $this->app->singleton(StorageService::class, function ($app) {
            return new StorageService();
        });

        // LD1: Register FinancialAidService as a singleton
        $this->app->singleton(FinancialAidService::class, function ($app) {
            return new FinancialAidService(
                $app->make(StorageService::class),
                $app->make(AuditService::class)
            );
        });

        // LD1: Bind service interfaces to their implementations
        $this->app->bind(\App\Contracts\ApplicationServiceInterface::class, ApplicationService::class);
        $this->app->bind(\App\Contracts\DocumentServiceInterface::class, DocumentService::class);
        $this->app->bind(\App\Contracts\WorkflowEngineServiceInterface::class, WorkflowEngineService::class);
        $this->app->bind(\App\Contracts\NotificationServiceInterface::class, NotificationService::class);
        $this->app->bind(\App\Contracts\PaymentServiceInterface::class, PaymentService::class);
        $this->app->bind(\App\Contracts\UserServiceInterface::class, UserService::class);
        $this->app->bind(\App\Contracts\AuditServiceInterface::class, AuditService::class);
        $this->app->bind(\App\Contracts\StorageServiceInterface::class, StorageService::class);
        $this->app->bind(\App\Contracts\FinancialAidServiceInterface::class, FinancialAidService::class);

        // LD1: Register facades for commonly used services
        $this->app->alias(ApplicationService::class, 'ApplicationService');
        $this->app->alias(DocumentService::class, 'DocumentService');
        $this->app->alias(WorkflowEngineService::class, 'WorkflowEngineService');
        $this->app->alias(NotificationService::class, 'NotificationService');
        $this->app->alias(PaymentService::class, 'PaymentService');
        $this->app->alias(UserService::class, 'UserService');
        $this->app->alias(AuditService::class, 'AuditService');
        $this->app->alias(StorageService::class, 'StorageService');
        $this->app->alias(FinancialAidService::class, 'FinancialAidService');

        // LD1: Register custom validation rules
        $this->registerCustomValidationRules();
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot(): void
    {
        // LD1: Configure database settings (strict mode, query logging in development)
        $this->configureDatabaseSettings();

        // LD1: Configure URL generation for HTTPS if app.url starts with https
        if (Str::startsWith(config('app.url'), 'https')) {
            URL::forceScheme('https');
        }

        // LD1: Configure Redis connection settings
        $this->configureRedisSettings();

        // LD1: Register custom Blade directives for permissions and roles
        $this->registerBladeDirectives();

        // LD1: Configure pagination to use Bootstrap styling
        \Illuminate\Pagination\Paginator::useBootstrap();

        // LD1: Set up model observers for auditing and event tracking
        // (This is a placeholder - implement actual observers in relevant models)
        // Application::observe(ApplicationObserver::class);

        // LD1: Configure global middleware for all HTTP requests
        // (This is a placeholder - implement actual middleware in Http/Middleware)
        // $this->app['router']->middleware('global_middleware');

        // LD1: Set up error reporting and monitoring integrations
        // (This is a placeholder - implement actual integrations with Sentry, Bugsnag, etc.)
        // if (app()->environment('production')) {
        //     \Sentry\init(['dsn' => config('sentry.dsn')]);
        // }

        // LD1: Configure performance optimization settings
        // (This is a placeholder - implement actual performance optimizations)
        // $this->app->configure('cache');
    }

    /**
     * Register the application management service
     *
     * @return void
     */
    protected function registerApplicationService(): void
    {
        // LD1: Bind ApplicationService as a singleton with its dependencies
        $this->app->singleton(ApplicationService::class, function ($app) {
            return new ApplicationService(
                $app->make(DocumentService::class),
                $app->make(WorkflowEngineService::class),
                $app->make(NotificationService::class),
                $app->make(AuditService::class)
            );
        });

        // LD1: Bind ApplicationServiceInterface to ApplicationService implementation
        $this->app->bind(\App\Contracts\ApplicationServiceInterface::class, ApplicationService::class);
    }

    /**
     * Register the document management service
     *
     * @return void
     */
    protected function registerDocumentService(): void
    {
        // LD1: Bind DocumentService as a singleton with its dependencies
        $this->app->singleton(DocumentService::class, function ($app) {
            return new DocumentService(
                $app->make(StorageService::class)
            );
        });

        // LD1: Bind DocumentServiceInterface to DocumentService implementation
        $this->app->bind(\App\Contracts\DocumentServiceInterface::class, DocumentService::class);
    }

    /**
     * Register the workflow engine service
     *
     * @return void
     */
    protected function registerWorkflowEngineService(): void
    {
        // LD1: Bind WorkflowEngineService as a singleton with its dependencies
        $this->app->singleton(WorkflowEngineService::class, function ($app) {
            return new WorkflowEngineService(
                $app->make(WorkflowService::class),
                $app->make(NotificationService::class),
                $app->make(AuditService::class)
            );
        });

        // LD1: Bind WorkflowEngineServiceInterface to WorkflowEngineService implementation
        $this->app->bind(\App\Contracts\WorkflowEngineServiceInterface::class, WorkflowEngineService::class);
    }

    /**
     * Register the notification service
     *
     * @return void
     */
    protected function registerNotificationService(): void
    {
        // LD1: Bind NotificationService as a singleton with its dependencies
        $this->app->singleton(NotificationService::class, function ($app) {
            return new NotificationService(
                $app->make(EmailService::class),
                $app->make(SMSService::class)
            );
        });

        // LD1: Bind NotificationServiceInterface to NotificationService implementation
        $this->app->bind(\App\Contracts\NotificationServiceInterface::class, NotificationService::class);
    }

    /**
     * Register the payment processing service
     *
     * @return void
     */
    protected function registerPaymentService(): void
    {
        // LD1: Bind PaymentService as a singleton with its dependencies
        $this->app->singleton(PaymentService::class, function ($app) {
            return new PaymentService(
                $app->make(PaymentGatewayService::class),
                $app->make(AuditService::class)
            );
        });

        // LD1: Bind PaymentServiceInterface to PaymentService implementation
        $this->app->bind(\App\Contracts\PaymentServiceInterface::class, PaymentService::class);
    }

    /**
     * Register the user management service
     *
     * @return void
     */
    protected function registerUserService(): void
    {
        // LD1: Bind UserService as a singleton with its dependencies
        $this->app->singleton(UserService::class, function ($app) {
            return new UserService(
                $app->make(AuditService::class),
                $app->make(NotificationService::class)
            );
        });

        // LD1: Bind UserServiceInterface to UserService implementation
        $this->app->bind(\App\Contracts\UserServiceInterface::class, UserService::class);
    }

    /**
     * Register the audit logging service
     *
     * @return void
     */
    protected function registerAuditService(): void
    {
        // LD1: Bind AuditService as a singleton with its dependencies
        $this->app->singleton(AuditService::class, function ($app) {
            return new AuditService(
                $app['request']
            );
        });

        // LD1: Bind AuditServiceInterface to AuditService implementation
        $this->app->bind(\App\Contracts\AuditServiceInterface::class, AuditService::class);
    }

    /**
     * Register the file storage service
     *
     * @return void
     */
    protected function registerStorageService(): void
    {
        // LD1: Bind StorageService as a singleton with its dependencies
        $this->app->singleton(StorageService::class, function ($app) {
            return new StorageService();
        });

        // LD1: Bind StorageServiceInterface to StorageService implementation
        $this->app->bind(\App\Contracts\StorageServiceInterface::class, StorageService::class);
    }

    /**
     * Register the financial aid service
     *
     * @return void
     */
    protected function registerFinancialAidService(): void
    {
        // LD1: Bind FinancialAidService as a singleton with its dependencies
        $this->app->singleton(FinancialAidService::class, function ($app) {
            return new FinancialAidService(
                $app->make(StorageService::class),
                $app->make(AuditService::class)
            );
        });

        // LD1: Bind FinancialAidServiceInterface to FinancialAidService implementation
        $this->app->bind(\App\Contracts\FinancialAidServiceInterface::class, FinancialAidService::class);
    }

    /**
     * Register custom validation rules for the application
     *
     * @return void
     */
    protected function registerCustomValidationRules(): void
    {
        // LD1: Register custom validation rule for document types
        Validator::extend('document_type', function ($attribute, $value, $parameters, $validator) {
            return in_array($value, Config::get('workflow.document_types', []));
        });

        // LD1: Register custom validation rule for application types
        Validator::extend('application_type', function ($attribute, $value, $parameters, $validator) {
            return in_array($value, Config::get('workflow.application_types', []));
        });

        // LD1: Register custom validation rule for academic terms
        Validator::extend('academic_term', function ($attribute, $value, $parameters, $validator) {
            return in_array($value, Config::get('workflow.academic_terms', []));
        });

        // LD1: Register custom validation rule for password complexity
        Validator::extend('password_complexity', function ($attribute, $value, $parameters, $validator) {
            $pattern = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/';
            return preg_match($pattern, $value);
        });
    }

    /**
     * Register custom Blade directives for the application
     *
     * @return void
     */
    protected function registerBladeDirectives(): void
    {
        // LD1: Register @role directive for role-based access control
        Blade::directive('role', function ($role) {
            return "<?php if (auth()->check() && auth()->user()->hasRole({$role})): ?>";
        });

        // LD1: Register @permission directive for permission-based access control
        Blade::directive('permission', function ($permission) {
            return "<?php if (auth()->check() && auth()->user()->hasPermissionTo({$permission})): ?>";
        });

        // LD1: Register @owner directive for resource ownership checks
        Blade::directive('owner', function ($resource) {
            return "<?php if (auth()->check() && auth()->user()->id === {$resource}->user_id): ?>";
        });

        // LD1: Register @applicationStatus directive for status-based rendering
        Blade::directive('applicationStatus', function ($status) {
            return "<?php if (isset(\$application) && \$application->currentStatus && \$application->currentStatus->status === {$status}): ?>";
        });
    }

    /**
     * Configure database settings for optimal performance
     *
     * @return void
     */
    protected function configureDatabaseSettings(): void
    {
        // LD1: Enable strict mode for MySQL to ensure data integrity
        DB::statement("SET SESSION sql_mode='STRICT_ALL_TABLES'");

        // LD1: Configure query logging in development environment
        if (config('app.debug')) {
            DB::listen(function ($query) {
                Log::info(
                    $query->sql,
                    $query->bindings,
                );
            });
        }

        // LD1: Set default string length for schema operations
        Schema::defaultStringLength(191);

        // LD1: Configure connection pooling settings
        // (This is a placeholder - implement actual connection pooling settings)
        // config(['database.connections.mysql.options' => [
        //     PDO::ATTR_PERSISTENT => true,
        // ]]);
    }

    /**
     * Configure Redis settings for caching and queues
     *
     * @return void
     */
    protected function configureRedisSettings(): void
    {
        // LD1: Configure Redis connection parameters
        $redisConfig = [
            'client' => 'phpredis',
            'options' => [
                'cluster' => config('database.redis.options.cluster'),
                'prefix' => config('database.redis.prefix', Str::slug(config('app.name'), '_') . '_database_'),
            ],
            'default' => [
                'host' => config('database.redis.default.host', '127.0.0.1'),
                'port' => config('database.redis.default.port', 6379),
                'database' => config('database.redis.default.database', 0),
                'password' => config('database.redis.default.password', null),
            ],
        ];

        // LD1: Set up Redis prefix for application isolation
        config(['cache.prefix' => config('database.redis.prefix', Str::slug(config('app.name'), '_') . '_cache_')]);
        config(['queue.prefix' => config('database.redis.prefix', Str::slug(config('app.name'), '_') . '_queue_')]);

        // LD1: Configure Redis for session storage
        config(['session.driver' => env('SESSION_DRIVER', 'redis')]);
        config(['session.connection' => 'default']);

        // LD1: Configure Redis for cache storage
        config(['cache.default' => 'redis']);
        config(['cache.stores.redis.connection' => 'default']);

        // LD1: Configure Redis for queue processing
        config(['queue.default' => 'redis']);
        config(['queue.connections.redis.connection' => 'default']);
    }
}