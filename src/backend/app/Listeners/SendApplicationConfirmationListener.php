<?php

namespace App\Listeners;

use App\Events\ApplicationSubmittedEvent;
use App\Models\User; // Import the User model
use App\Services\NotificationService;
use App\Services\Integration\EmailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log; // Version 10.0
use Carbon\Carbon; // Version 2.0
use Illuminate\Support\Facades\Config; // Version 10.0

/**
 * Listener that sends confirmation notifications when an application is submitted
 */
class SendApplicationConfirmationListener implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $retryAfter = 60;

    /**
     * Notification service instance
     *
     * @var NotificationService
     */
    protected $notificationService;

    /**
     * Email service instance
     *
     * @var EmailService
     */
    protected $emailService;

    /**
     * Create a new listener instance with dependencies
     *
     * @param NotificationService $notificationService
     * @param EmailService $emailService
     */
    public function __construct(NotificationService $notificationService, EmailService $emailService)
    {
        // Assign the notification service to the protected property
        $this->notificationService = $notificationService;

        // Assign the email service to the protected property
        $this->emailService = $emailService;
    }

    /**
     * Handle the application submitted event
     *
     * @param ApplicationSubmittedEvent $event
     * @return void No return value
     */
    public function handle(ApplicationSubmittedEvent $event): void
    {
        try {
            // Extract the application from the event
            $application = $event->application;

            // Get the user who submitted the application
            $user = User::find($application->user_id);

            // Check if the user exists
            if (!$user) {
                Log::error('User not found for application', ['application_id' => $application->id, 'user_id' => $application->user_id]);
                return;
            }

            // Format the submission date using Carbon
            $submissionDate = Carbon::parse($application->submitted_at)->format('F j, Y');

            // Prepare notification data with application details
            $notificationData = $this->prepareNotificationData($application, $user);

            // Send an in-app notification using the notification service
            $this->notificationService->sendFromTemplate(
                $user->id,
                'application.submitted.in_app',
                $notificationData,
                ['in_app']
            );

            // Send an email confirmation using the email service
            $this->emailService->sendFromTemplate(
                $user->email,
                'application.submitted.email',
                $notificationData
            );

            // Log the confirmation sending activity
            Log::info('Application confirmation sent', [
                'application_id' => $application->id,
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
        } catch (\Exception $e) {
            // Handle any exceptions that occur during the process
            Log::error('Failed to send application confirmation', [
                'application_id' => $event->application->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Prepare data for the confirmation notification
     *
     * @param object $application
     * @param object $user
     * @return array Data for the notification template
     */
    protected function prepareNotificationData(object $application, object $user): array
    {
        // Create an array with user name, application ID, type, term, year
        $data = [
            'user_name' => $user->profile->first_name ?? $user->email,
            'application_id' => $application->id,
            'application_type' => $application->application_type,
            'academic_term' => $application->academic_term,
            'academic_year' => $application->academic_year,
        ];

        // Format the submission date
        $submissionDate = Carbon::parse($application->submitted_at)->format('F j, Y');
        $data['submission_date'] = $submissionDate;

        // Add the portal URL for checking application status
        $portalUrl = Config::get('app.url');
        $data['portal_url'] = $portalUrl;

        // Return the prepared data array
        return $data;
    }
}