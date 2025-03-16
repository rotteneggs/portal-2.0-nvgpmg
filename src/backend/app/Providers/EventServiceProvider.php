<?php

namespace App\Providers;

use Illuminate\Support\Facades\Event; // Laravel facade for event registration // illuminate/support/facades ^10.0
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider; // Laravel service provider base class // illuminate/support ^10.0
use Illuminate\Auth\Events\Registered; // Laravel authentication event for user registration // illuminate/auth/events ^10.0
use Illuminate\Auth\Events\Verified; // Laravel authentication event for email verification // illuminate/auth/events ^10.0
use Illuminate\Auth\events\Login; // Laravel authentication event for user login // illuminate/auth/events ^10.0
use Illuminate\Auth\events\Logout; // Laravel authentication event for user logout // illuminate/auth/events ^10.0
use Illuminate\Auth\Listeners\SendEmailVerificationNotification; // Laravel listener for sending email verification notifications // illuminate/auth/listeners ^10.0
use App\Events\ApplicationStatusChangedEvent; // Event dispatched when an application's status changes
use App\Events\ApplicationSubmittedEvent; // Event dispatched when an application is submitted
use App\Events\DocumentUploadedEvent; // Event dispatched when a document is uploaded
use App\Events\DocumentVerifiedEvent; // Event dispatched when a document is verified
use App\Events\NewMessageEvent; // Event dispatched when a new message is sent
use App\Events\PaymentCompletedEvent; // Event dispatched when a payment is completed
use App\Events\WorkflowStageCompletedEvent; // Event dispatched when a workflow stage is completed
use App\Listeners\NotifyAboutApplicationStatusChangeListener; // Listener that sends notifications when application status changes
use App\Listeners\SendApplicationConfirmationListener; // Listener that sends confirmation emails when applications are submitted
use App\Listeners\ProcessDocumentVerificationListener; // Listener that initiates document verification when documents are uploaded
use App\Listeners\SendNewMessageNotificationListener; // Listener that sends notifications when new messages are received
use App\Listeners\GeneratePaymentReceiptListener; // Listener that generates receipts when payments are completed
use App\Listeners\TriggerWorkflowTransitionListener; // Listener that triggers workflow transitions when stages are completed

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        ApplicationSubmittedEvent::class => [
            SendApplicationConfirmationListener::class,
        ],
        ApplicationStatusChangedEvent::class => [
            NotifyAboutApplicationStatusChangeListener::class,
        ],
        DocumentUploadedEvent::class => [
            ProcessDocumentVerificationListener::class,
        ],
        DocumentVerifiedEvent::class => [
            NotifyAboutApplicationStatusChangeListener::class,
        ],
        NewMessageEvent::class => [
            SendNewMessageNotificationListener::class,
        ],
        PaymentCompletedEvent::class => [
            GeneratePaymentReceiptListener::class,
        ],
        WorkflowStageCompletedEvent::class => [
            TriggerWorkflowTransitionListener::class,
        ],
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
    ];

    /**
     * The subscriber classes to register.
     *
     * @var array
     */
    protected $observers = [
        //
    ];

    /**
     * Register any other events for your application.
     *
     * @var bool
     */
    protected $discoverEvents = false;

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        // Return false to disable automatic event discovery
        // This ensures explicit registration of all event listeners for better control
        return false;
    }

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        parent::boot();

        // Register model observers for tracking model changes
        $this->registerModelObservers();
    }

    /**
     * Register model observers for tracking model changes
     */
    protected function registerModelObservers(): void
    {
        // Register observers for Application model to track application changes
        // Application::observe(ApplicationObserver::class);

        // Register observers for Document model to track document changes
        // Document::observe(DocumentObserver::class);

        // Register observers for User model to track user changes
        // User::observe(UserObserver::class);

        // Register observers for other models as needed
    }
}