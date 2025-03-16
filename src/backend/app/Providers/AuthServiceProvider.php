<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Config;
use App\Models\User;
use App\Models\Application;
use App\Models\Document;
use App\Models\Message;
use App\Models\Workflow;
use App\Models\Payment;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Application::class => \App\Policies\ApplicationPolicy::class,
        Document::class => \App\Policies\DocumentPolicy::class,
        Message::class => \App\Policies\MessagePolicy::class,
        Workflow::class => \App\Policies\WorkflowPolicy::class,
        Payment::class => \App\Policies\PaymentPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     *
     * @return void
     */
    public function register()
    {
        $this->registerPasswordValidationRules();
        
        // Configure password timeout settings (3 hours)
        Config::set('auth.password_timeout', 10800);
        
        // Configure MFA settings
        Config::set('auth.mfa.required_roles', ['administrator', 'staff']);
        Config::set('auth.mfa.methods', ['totp', 'email', 'sms']);
        Config::set('auth.mfa.remember_device_days', 30);
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->registerPolicies();
        
        $this->defineAuthorizationGates();
        $this->defineRoleGates();
        $this->defineOwnershipGates();
    }

    /**
     * Register custom password validation rules.
     *
     * @return void
     */
    protected function registerPasswordValidationRules()
    {
        Password::defaults(function () {
            return Password::min(12)
                ->mixedCase()
                ->numbers()
                ->symbols()
                ->uncompromised();
        });
    }

    /**
     * Define authorization gates for the application.
     *
     * @return void
     */
    protected function defineAuthorizationGates()
    {
        // Applications
        Gate::define('view-applications', function (User $user) {
            return $user->hasPermissionTo('view', 'applications');
        });
        
        Gate::define('create-application', function (User $user) {
            return $user->hasPermissionTo('create', 'applications');
        });
        
        Gate::define('edit-application', function (User $user, Application $application) {
            return $user->hasPermissionTo('edit', 'applications') || 
                   $user->id === $application->user_id;
        });
        
        Gate::define('delete-application', function (User $user, Application $application) {
            return $user->hasPermissionTo('delete', 'applications') || 
                   ($user->id === $application->user_id && !$application->isSubmitted());
        });

        // Documents
        Gate::define('view-documents', function (User $user) {
            return $user->hasPermissionTo('view', 'documents');
        });
        
        Gate::define('upload-document', function (User $user) {
            return $user->hasPermissionTo('create', 'documents');
        });
        
        Gate::define('verify-document', function (User $user) {
            return $user->hasPermissionTo('verify', 'documents');
        });
        
        Gate::define('delete-document', function (User $user, Document $document) {
            return $user->hasPermissionTo('delete', 'documents') || 
                   ($user->id === $document->user_id && !$document->is_verified);
        });

        // Messages
        Gate::define('view-messages', function (User $user) {
            return $user->hasPermissionTo('view', 'messages');
        });
        
        Gate::define('send-message', function (User $user) {
            return $user->hasPermissionTo('create', 'messages');
        });
        
        Gate::define('delete-message', function (User $user, Message $message) {
            return $user->hasPermissionTo('delete', 'messages') || 
                   $user->id === $message->sender_user_id;
        });

        // Workflows
        Gate::define('view-workflows', function (User $user) {
            return $user->hasPermissionTo('view', 'workflows');
        });
        
        Gate::define('create-workflow', function (User $user) {
            return $user->hasPermissionTo('create', 'workflows');
        });
        
        Gate::define('edit-workflow', function (User $user, Workflow $workflow) {
            return $user->hasPermissionTo('edit', 'workflows');
        });
        
        Gate::define('delete-workflow', function (User $user, Workflow $workflow) {
            return $user->hasPermissionTo('delete', 'workflows');
        });

        // Payments
        Gate::define('view-payments', function (User $user) {
            return $user->hasPermissionTo('view', 'payments');
        });
        
        Gate::define('process-payment', function (User $user) {
            return $user->hasPermissionTo('create', 'payments');
        });
        
        Gate::define('refund-payment', function (User $user) {
            return $user->hasPermissionTo('refund', 'payments');
        });

        // Financial Aid
        Gate::define('view-financial-aid', function (User $user) {
            return $user->hasPermissionTo('view', 'financial_aid');
        });
        
        Gate::define('apply-financial-aid', function (User $user) {
            return $user->hasPermissionTo('create', 'financial_aid');
        });
        
        Gate::define('review-financial-aid', function (User $user) {
            return $user->hasPermissionTo('review', 'financial_aid');
        });

        // User Management
        Gate::define('view-users', function (User $user) {
            return $user->hasPermissionTo('view', 'users');
        });
        
        Gate::define('create-user', function (User $user) {
            return $user->hasPermissionTo('create', 'users');
        });
        
        Gate::define('edit-user', function (User $user, User $targetUser) {
            return $user->hasPermissionTo('edit', 'users') || $user->id === $targetUser->id;
        });
        
        Gate::define('delete-user', function (User $user, User $targetUser) {
            return $user->hasPermissionTo('delete', 'users') && $user->id !== $targetUser->id;
        });

        // System Settings
        Gate::define('view-settings', function (User $user) {
            return $user->hasPermissionTo('view', 'settings');
        });
        
        Gate::define('edit-settings', function (User $user) {
            return $user->hasPermissionTo('edit', 'settings');
        });
    }

    /**
     * Define role-based gates for the application.
     *
     * @return void
     */
    protected function defineRoleGates()
    {
        // Administrator Role
        Gate::define('is-administrator', function (User $user) {
            return $user->hasRole('administrator');
        });
        
        // Staff Role (includes administrators)
        Gate::define('is-staff', function (User $user) {
            return $user->hasRole('staff') || $user->hasRole('administrator');
        });
        
        // Reviewer Role (includes staff and administrators)
        Gate::define('is-reviewer', function (User $user) {
            return $user->hasRole('reviewer') || $user->hasRole('staff') || $user->hasRole('administrator');
        });
        
        // Student Role
        Gate::define('is-student', function (User $user) {
            return $user->hasRole('student');
        });
        
        // Applicant Role (includes students)
        Gate::define('is-applicant', function (User $user) {
            return $user->hasRole('applicant') || $user->hasRole('student');
        });
    }

    /**
     * Define ownership-based gates for user resources.
     *
     * @return void
     */
    protected function defineOwnershipGates()
    {
        // Application Ownership
        Gate::define('owns-application', function (User $user, Application $application) {
            return $user->id === $application->user_id;
        });
        
        // Document Ownership
        Gate::define('owns-document', function (User $user, Document $document) {
            return $user->id === $document->user_id;
        });
        
        // Message Ownership (sender or recipient)
        Gate::define('owns-message', function (User $user, Message $message) {
            return $user->id === $message->sender_user_id || $user->id === $message->recipient_user_id;
        });
        
        // Payment Ownership
        Gate::define('owns-payment', function (User $user, Payment $payment) {
            return $user->id === $payment->user_id;
        });
    }
}