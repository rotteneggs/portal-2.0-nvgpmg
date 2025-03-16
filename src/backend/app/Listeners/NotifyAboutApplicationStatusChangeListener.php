<?php

namespace App\Listeners;

use App\Events\ApplicationStatusChangedEvent;
use App\Models\Application;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Config; // Laravel ^10.0
use Illuminate\Support\Facades\Log; // Laravel ^10.0

/**
 * Listener that handles notifications when an application's status changes
 */
class NotifyAboutApplicationStatusChangeListener
{
    /**
     * Notification service instance
     *
     * @var NotificationService
     */
    private $notificationService;

    /**
     * Map of application statuses to notification template keys
     *
     * @var array
     */
    private $statusTemplateMap;

    /**
     * Array of statuses that require staff notifications
     *
     * @var array
     */
    private $staffNotificationStatuses;

    /**
     * Create a new event listener instance
     *
     * @param NotificationService $notificationService
     */
    public function __construct(NotificationService $notificationService)
    {
        // Assign the notification service to the private property
        $this->notificationService = $notificationService;

        // Initialize the status template map with template keys for different statuses
        $this->statusTemplateMap = [
            'submitted' => 'application.status.submitted',
            'under_review' => 'application.status.under_review',
            'decision_made' => 'application.status.decision_made',
            'accepted' => 'application.status.accepted',
            'rejected' => 'application.status.rejected',
            'waitlisted' => 'application.status.waitlisted',
            'enrolled' => 'application.status.enrolled',
        ];

        // Initialize the staff notification statuses array with statuses that require staff notifications
        $this->staffNotificationStatuses = [
            'submitted',
            'under_review',
            'decision_pending',
        ];
    }

    /**
     * Handle the event by sending appropriate notifications
     *
     * @param ApplicationStatusChangedEvent $event
     * @return void No return value
     */
    public function handle(ApplicationStatusChangedEvent $event): void
    {
        // Extract the application from the event
        $application = $event->application;

        // Extract the new status from the event
        $newStatus = $event->newStatus->status;

        // Extract the previous status from the event
        $previousStatus = $event->previousStatus ? $event->previousStatus->status : null;

        // Get the user ID of the application owner
        $userId = $application->user_id;

        // Determine the appropriate notification template based on the new status
        $templateKey = $this->getNotificationTemplateForStatus($newStatus);

        // Prepare notification data with application details and status information
        $data = $this->prepareNotificationData($application, $newStatus, $previousStatus);

        // Send notification to the application owner using the determined template
        $this->notificationService->sendFromTemplate($userId, $templateKey, $data);

        // Check if staff notifications are needed for this status
        if ($this->shouldNotifyStaff($newStatus)) {
            // If staff notifications are needed, get relevant staff users
            $staffUsers = $this->getStaffUsersForNotification($newStatus, $application);

            // Send notifications to staff members with appropriate template
            $this->notificationService->sendFromTemplateToMultiple($staffUsers, 'application.status.staff_notification', $data);
        }

        // Log the notification activity
        $this->logNotification($application, $newStatus, [$userId]);
    }

    /**
     * Get the appropriate notification template key for a given status
     *
     * @param string $status
     * @return string Template key for the notification
     */
    private function getNotificationTemplateForStatus(string $status): string
    {
        // Check if the status exists in the statusTemplateMap
        if (array_key_exists($status, $this->statusTemplateMap)) {
            // If found, return the corresponding template key
            return $this->statusTemplateMap[$status];
        }

        // If not found, return the default 'application.status.changed' template key
        return 'application.status.changed';
    }

    /**
     * Prepare data for the notification based on the application and status
     *
     * @param Application $application
     * @param string $newStatus
     * @param string|null $previousStatus
     * @return array Data for the notification
     */
    private function prepareNotificationData(Application $application, string $newStatus, ?string $previousStatus): array
    {
        // Create an array with application ID, type, and term
        $data = [
            'application_id' => $application->id,
            'application_type' => $application->application_type,
            'academic_term' => $application->academic_term,
            'academic_year' => $application->academic_year,
        ];

        // Add the new status label to the data
        $data['new_status_label'] = $application->getStatusLabel();

        // Add the previous status label to the data if available
        if ($previousStatus) {
            $data['previous_status_label'] = $previousStatus;
        }

        // Add a status change description
        $data['status_change_description'] = (new ApplicationStatusChangedEvent($application, $application->currentStatus, $application->statuses->count() > 1 ? $application->statuses[1] : null))->getStatusChangeDescription();

        // Add application owner's name
        $data['applicant_name'] = $application->user->profile->first_name . ' ' . $application->user->profile->last_name;

        // Add any additional data needed for specific status types
        // Example: if ($newStatus === 'accepted') { $data['scholarship_amount'] = 1000; }

        // Return the prepared data array
        return $data;
    }

    /**
     * Get staff users who should be notified about this status change
     *
     * @param string $status
     * @param Application $application
     * @return array Array of staff user IDs
     */
    private function getStaffUsersForNotification(string $status, Application $application): array
    {
        $roles = [];

        // Determine which staff roles should be notified based on the status
        if ($status === 'submitted') {
            // For 'submitted' status, get users with 'admissions_officer' role
            $roles = ['admissions_officer'];
        } elseif ($status === 'under_review') {
            // For 'under_review' status, get users with 'reviewer' role
            $roles = ['reviewer'];
        } elseif ($status === 'decision_pending') {
            // For 'decision_pending' status, get users with 'admissions_manager' role
            $roles = ['admissions_manager'];
        } else {
            // For other statuses, get appropriate roles based on configuration
            $roles = Config::get('notifications.staff_roles.' . $status, []);
        }

        // Query the User model to find users with the determined roles
        $users = User::withRole($roles)->get();

        // Return an array of user IDs
        return $users->pluck('id')->toArray();
    }

    /**
     * Determine if staff should be notified about this status change
     *
     * @param string $status
     * @return bool True if staff should be notified, false otherwise
     */
    private function shouldNotifyStaff(string $status): bool
    {
        // Check if the status is in the staffNotificationStatuses array
        return in_array($status, $this->staffNotificationStatuses);
    }

    /**
     * Log the notification activity
     *
     * @param Application $application
     * @param string $status
     * @param array $recipients
     * @return void No return value
     */
    private function logNotification(Application $application, string $status, array $recipients): void
    {
        // Prepare log data with application ID, status, and recipient count
        $logData = [
            'application_id' => $application->id,
            'status' => $status,
            'recipient_count' => count($recipients),
        ];

        // Log the notification activity using the Log facade
        Log::info('Application status notification sent', $logData);
    }
}