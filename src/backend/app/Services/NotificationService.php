<?php

namespace App\Services;

use App\Events\ApplicationStatusChangedEvent;
use App\Models\Notification;
use App\Models\NotificationRecipient;
use App\Models\User;
use Illuminate\Support\Facades\Log; // Laravel ^10.0
use Illuminate\Support\Facades\Config; // Laravel ^10.0
use Illuminate\Support\Facades\Redis; // Laravel ^10.0
use Illuminate\Support\Facades\Event; // Laravel ^10.0
use Illuminate\Support\Facades\Queue; // Laravel ^10.0
use App\Services\Integration\EmailService;
use App\Services\Integration\SMSService;
use Exception; // PHP 8.2

/**
 * Service class for managing and sending notifications through multiple channels
 */
class NotificationService
{
    /**
     * Email service instance
     *
     * @var EmailService
     */
    protected $emailService;

    /**
     * SMS service instance
     *
     * @var SMSService
     */
    protected $smsService;

    /**
     * Configuration settings
     *
     * @var array
     */
    protected $config;

    /**
     * Notification templates
     *
     * @var array
     */
    protected $templates;

    /**
     * Available notification channels
     *
     * @var array
     */
    protected $channels = ['in_app', 'email', 'sms'];

    /**
     * Whether queue is enabled for asynchronous processing
     *
     * @var bool
     */
    protected $queueEnabled = true;

    /**
     * Initialize the notification service with dependencies
     *
     * @param EmailService $emailService
     * @param SMSService $smsService
     */
    public function __construct(EmailService $emailService, SMSService $smsService)
    {
        // Assign the email service to the protected property
        $this->emailService = $emailService;

        // Assign the SMS service to the protected property
        $this->smsService = $smsService;

        // Load notification configuration from config files
        $this->config = Config::get('notifications', []);

        // Initialize notification templates from configuration
        $this->templates = $this->config['templates'] ?? [];

        // Set available notification channels (in-app, email, SMS)
        $this->channels = $this->config['channels'] ?? ['in_app', 'email', 'sms'];

        // Set queue configuration for asynchronous processing
        $this->queueEnabled = $this->config['queue_enabled'] ?? true;
    }

    /**
     * Create and send a notification to a single user
     *
     * @param int $userId
     * @param string $type
     * @param string $subject
     * @param string $content
     * @param array $data
     * @param array $channels
     * @return Notification The created notification object
     */
    public function send(int $userId, string $type, string $subject, string $content, array $data = [], array $channels = []): Notification
    {
        // Validate the user exists
        $user = User::find($userId);
        if (!$user) {
            throw new Exception("User with ID {$userId} not found.");
        }

        // Create a new Notification record with type, subject, content, and data
        $notification = Notification::create([
            'type' => $type,
            'subject' => $subject,
            'content' => $content,
            'data' => $data,
        ]);

        // Add the user as a recipient to the notification
        $notification->addRecipient($userId);

        // Determine which channels to use based on user preferences and provided channels
        $selectedChannels = $channels ?: $this->getUserChannelPreferences($userId, $type);

        // Send the notification through each selected channel
        $notificationRecipient = $notification->recipients()->where('user_id', $userId)->first();
        foreach ($selectedChannels as $channel) {
            switch ($channel) {
                case 'email':
                    $this->sendViaEmail($notification, $notificationRecipient);
                    break;
                case 'sms':
                    $this->sendViaSms($notification, $notificationRecipient);
                    break;
                case 'in_app':
                    $this->sendViaInApp($notification, $notificationRecipient);
                    break;
                default:
                    Log::warning("Unsupported notification channel: {$channel}");
            }
        }

        // Return the created notification object
        return $notification;
    }

    /**
     * Create and send a notification to multiple users
     *
     * @param array $userIds
     * @param string $type
     * @param string $subject
     * @param string $content
     * @param array $data
     * @param array $channels
     * @return Notification The created notification object
     */
    public function sendToMultiple(array $userIds, string $type, string $subject, string $content, array $data = [], array $channels = []): Notification
    {
        // Validate the user IDs array is not empty
        if (empty($userIds)) {
            throw new Exception("User IDs array cannot be empty.");
        }

        // Create a new Notification record with type, subject, content, and data
        $notification = Notification::create([
            'type' => $type,
            'subject' => $subject,
            'content' => $content,
            'data' => $data,
        ]);

        // Add all users as recipients to the notification
        $notification->addRecipients($userIds);

        // If queue is enabled, dispatch a job to the queue with notification and recipient data
        if ($this->isQueueEnabled()) {
            // If using Queue facade to dispatch 'SendBulkNotifications' job with notification ID, user IDs, and channels
            Queue::dispatch(function () use ($notification, $userIds, $channels) {
                foreach ($userIds as $userId) {
                    $selectedChannels = $channels ?: $this->getUserChannelPreferences($userId, $type);
                    $notificationRecipient = $notification->recipients()->where('user_id', $userId)->first();
                    foreach ($selectedChannels as $channel) {
                        switch ($channel) {
                            case 'email':
                                $this->sendViaEmail($notification, $notificationRecipient);
                                break;
                            case 'sms':
                                $this->sendViaSms($notification, $notificationRecipient);
                                break;
                            case 'in_app':
                                $this->sendViaInApp($notification, $notificationRecipient);
                                break;
                            default:
                                Log::warning("Unsupported notification channel: {$channel}");
                        }
                    }
                }
            });
        } else {
            // Otherwise, send the notification to each user synchronously
            foreach ($userIds as $userId) {
                $selectedChannels = $channels ?: $this->getUserChannelPreferences($userId, $type);
                $notificationRecipient = $notification->recipients()->where('user_id', $userId)->first();
                foreach ($selectedChannels as $channel) {
                    switch ($channel) {
                        case 'email':
                            $this->sendViaEmail($notification, $notificationRecipient);
                            break;
                        case 'sms':
                            $this->sendViaSms($notification, $notificationRecipient);
                            break;
                        case 'in_app':
                            $this->sendViaInApp($notification, $notificationRecipient);
                            break;
                        default:
                            Log::warning("Unsupported notification channel: {$channel}");
                    }
                }
            }
        }

        // Return the created notification object
        return $notification;
    }

    /**
     * Create and send a notification using a predefined template
     *
     * @param int $userId
     * @param string $templateKey
     * @param array $data
     * @param array $channels
     * @return Notification|null The created notification object or null if template not found
     */
    public function sendFromTemplate(int $userId, string $templateKey, array $data = [], array $channels = []): ?Notification
    {
        // Validate the template key exists in configured templates
        $template = $this->getTemplate($templateKey);
        if (!$template) {
            Log::error("Template with key '{$templateKey}' not found.");
            return null;
        }

        // Get template type, subject, content, and default data
        $type = $template['type'] ?? 'default';
        $subject = $template['subject'] ?? '';
        $content = $template['content'] ?? '';
        $defaultData = $template['data'] ?? [];

        // Merge provided data with template default data
        $mergedData = array_merge($defaultData, $data);

        // Call send() method with template values and merged data
        return $this->send($userId, $type, $subject, $content, $mergedData, $channels);
    }

    /**
     * Create and send a template-based notification to multiple users
     *
     * @param array $userIds
     * @param string $templateKey
     * @param array $data
     * @param array $channels
     * @return Notification|null The created notification object or null if template not found
     */
    public function sendFromTemplateToMultiple(array $userIds, string $templateKey, array $data = [], array $channels = []): ?Notification
    {
        // Validate the template key exists in configured templates
        $template = $this->getTemplate($templateKey);
        if (!$template) {
            Log::error("Template with key '{$templateKey}' not found.");
            return null;
        }

        // Get template type, subject, content, and default data
        $type = $template['type'] ?? 'default';
        $subject = $template['subject'] ?? '';
        $content = $template['content'] ?? '';
        $defaultData = $template['data'] ?? [];

        // Merge provided data with template default data
        $mergedData = array_merge($defaultData, $data);

        // Call sendToMultiple() method with template values and merged data
        return $this->sendToMultiple($userIds, $type, $subject, $content, $mergedData, $channels);
    }

    /**
     * Send personalized notifications to multiple users with user-specific data
     *
     * @param array $userDataMap
     * @param string $type
     * @param string $subject
     * @param string $content
     * @param array $commonData
     * @param array $channels
     * @return array Array of created notification objects
     */
    public function sendPersonalized(array $userDataMap, string $type, string $subject, string $content, array $commonData = [], array $channels = []): array
    {
        // Validate the userDataMap array is not empty
        if (empty($userDataMap)) {
            throw new Exception("userDataMap array cannot be empty.");
        }

        // Initialize results array
        $results = [];

        // For each user ID and user-specific data pair:
        foreach ($userDataMap as $userId => $userData) {
            // Merge common data with user-specific data
            $mergedData = array_merge($commonData, $userData);

            // Call send() method with user ID, type, subject, content, merged data, and channels
            $results[$userId] = $this->send($userId, $type, $subject, $content, $mergedData, $channels);
        }

        // Return the array of created notifications
        return $results;
    }

    /**
     * Send personalized template-based notifications to multiple users
     *
     * @param array $userDataMap
     * @param string $templateKey
     * @param array $commonData
     * @param array $channels
     * @return array Array of created notification objects
     */
    public function sendPersonalizedFromTemplate(array $userDataMap, string $templateKey, array $commonData = [], array $channels = []): array
    {
        // Validate the template key exists in configured templates
        $template = $this->getTemplate($templateKey);
        if (!$template) {
            Log::error("Template with key '{$templateKey}' not found.");
            return [];
        }

        // Get template type, subject, content, and default data
        $type = $template['type'] ?? 'default';
        $subject = $template['subject'] ?? '';
        $content = $template['content'] ?? '';
        $defaultData = $template['data'] ?? [];

        // Initialize results array
        $results = [];

        // For each user ID and user-specific data pair:
        foreach ($userDataMap as $userId => $userData) {
            // Merge template default data with common data and user-specific data
            $mergedData = array_merge($defaultData, $commonData, $userData);

            // Call send() method with user ID, template type, subject, content, merged data, and channels
            $results[$userId] = $this->send($userId, $type, $subject, $content, $mergedData, $channels);
        }

        // Return the array of created notifications
        return $results;
    }

    /**
     * Mark a notification as read for a specific user
     *
     * @param int $notificationId
     * @param int $userId
     * @return bool True if successful, false otherwise
     */
    public function markAsRead(int $notificationId, int $userId): bool
    {
        // Find the notification recipient record for the given notification and user
        $recipient = NotificationRecipient::where('notification_id', $notificationId)
            ->where('user_id', $userId)
            ->first();

        // If found, call markAsRead() on the notification recipient
        if ($recipient) {
            return $recipient->markAsRead();
        }

        return false;
    }

    /**
     * Mark all notifications as read for a specific user
     *
     * @param int $userId
     * @return int Number of notifications marked as read
     */
    public function markAllAsRead(int $userId): int
    {
        // Find all unread notification recipient records for the user
        $recipients = NotificationRecipient::where('user_id', $userId)
            ->where('is_read', false)
            ->get();

        $count = 0;
        // For each record, call markAsRead()
        foreach ($recipients as $recipient) {
            if ($recipient->markAsRead()) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Get notifications for a specific user with pagination
     *
     * @param int $userId
     * @param int $page
     * @param int $perPage
     * @param array $filters
     * @return array Paginated array of notifications with metadata
     */
    public function getUserNotifications(int $userId, int $page = 1, int $perPage = 10, array $filters = []): array
    {
        // Build a query for notifications where the user is a recipient
        $query = Notification::forUser($userId);

        // Apply filters for type, read status, and date range if provided
        if (!empty($filters['type'])) {
            $query->ofType($filters['type']);
        }
        if (isset($filters['is_read'])) {
            if ($filters['is_read']) {
                $query->where('notification_recipients.is_read', true);
            } else {
                $query->where('notification_recipients.is_read', false);
            }
        }
        if (!empty($filters['date_range'])) {
            $query->whereBetween('notifications.created_at', [$filters['date_range']['start'], $filters['date_range']['end']]);
        }

        // Paginate the results with the specified page and perPage values
        $notifications = $query->paginate($perPage, ['*'], 'page', $page);

        // Return the paginated results with metadata
        return [
            'data' => $notifications->items(),
            'pagination' => [
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'from' => $notifications->firstItem(),
                'to' => $notifications->lastItem(),
            ],
        ];
    }

    /**
     * Get the count of unread notifications for a user
     *
     * @param int $userId
     * @return int Count of unread notifications
     */
    public function getUnreadCount(int $userId): int
    {
        // Query notification recipients for the user where is_read is false
        $count = NotificationRecipient::forUser($userId)
            ->unread()
            ->count();

        // Return the count of results
        return $count;
    }

    /**
     * Delete a notification for a specific user
     *
     * @param int $notificationId
     * @param int $userId
     * @return bool True if successful, false otherwise
     */
    public function deleteNotification(int $notificationId, int $userId): bool
    {
        // Find the notification recipient record for the given notification and user
        $recipient = NotificationRecipient::where('notification_id', $notificationId)
            ->where('user_id', $userId)
            ->first();

        // If found, delete the notification recipient record
        if ($recipient) {
            return (bool) $recipient->delete();
        }

        return false;
    }

    /**
     * Delete all notifications for a specific user
     *
     * @param int $userId
     * @return int Number of notifications deleted
     */
    public function deleteAllNotifications(int $userId): int
    {
        // Find all notification recipient records for the user
        $recipients = NotificationRecipient::where('user_id', $userId)->get();

        $count = 0;
        // Delete all found records
        foreach ($recipients as $recipient) {
            if ($recipient->delete()) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Get notification preferences for a user
     *
     * @param int $userId
     * @return array User's notification preferences
     */
    public function getUserPreferences(int $userId): array
    {
        // Get the user model with profile relationship
        $user = User::with('profile')->find($userId);

        // Extract notification preferences from the user profile
        $preferences = $user->profile->notification_preferences ?? [];

        // If no preferences are set, return default preferences
        if (empty($preferences)) {
            return $this->config['default_preferences'] ?? [];
        }

        // Return the preferences array
        return $preferences;
    }

    /**
     * Update notification preferences for a user
     *
     * @param int $userId
     * @param array $preferences
     * @return bool True if successful, false otherwise
     */
    public function updateUserPreferences(int $userId, array $preferences): bool
    {
        // Get the user model with profile relationship
        $user = User::with('profile')->find($userId);

        // Validate the preferences array structure
        if (!is_array($preferences)) {
            Log::error('Invalid preferences format. Must be an array.');
            return false;
        }

        // Update the notification_preferences field in the user profile
        $user->profile->notification_preferences = $preferences;

        // Save the user profile
        return $user->profile->save();
    }

    /**
     * Register a new notification template
     *
     * @param string $key
     * @param string $type
     * @param string $subject
     * @param string $content
     * @param array $defaultData
     * @return self Returns $this for method chaining
     */
    public function registerTemplate(string $key, string $type, string $subject, string $content, array $defaultData = []): self
    {
        // Create template configuration array with type, subject, content, and default data
        $this->templates[$key] = [
            'type' => $type,
            'subject' => $subject,
            'content' => $content,
            'data' => $defaultData,
        ];

        // Return $this for method chaining
        return $this;
    }

    /**
     * Get a template by key
     *
     * @param string $key
     * @return array|null Template configuration or null if not found
     */
    public function getTemplate(string $key): ?array
    {
        // Check if template key exists in templates array
        if (array_key_exists($key, $this->templates)) {
            // Return template configuration if found, null otherwise
            return $this->templates[$key];
        }

        return null;
    }

    /**
     * Enable queue for asynchronous notification processing
     *
     * @return self Returns $this for method chaining
     */
    public function enableQueue(): self
    {
        // Set queueEnabled property to true
        $this->queueEnabled = true;

        // Return $this for method chaining
        return $this;
    }

    /**
     * Disable queue for synchronous notification processing
     *
     * @return self Returns $this for method chaining
     */
    public function disableQueue(): self
    {
        // Set queueEnabled property to false
        $this->queueEnabled = false;

        // Return $this for method chaining
        return $this;
    }

    /**
     * Check if queue is enabled for notification processing
     *
     * @return bool True if queue is enabled, false otherwise
     */
    public function isQueueEnabled(): bool
    {
        // Return value of queueEnabled property
        return $this->queueEnabled;
    }

    /**
     * Process an application status changed event and send appropriate notifications
     *
     * @param ApplicationStatusChangedEvent $event
     * @return bool True if notifications were sent successfully, false otherwise
     */
    public function processApplicationStatusChangedEvent(ApplicationStatusChangedEvent $event): bool
    {
        // Extract application and status information from the event
        $application = $event->application;
        $newStatus = $event->newStatus;

        // Determine the appropriate notification template based on the new status
        $templateKey = 'application.status_changed.' . $newStatus->status;

        // Prepare notification data with application and status details
        $data = [
            'application_id' => $application->id,
            'application_type' => $application->application_type,
            'status' => $newStatus->status,
            'status_label' => $application->getStatusLabel(),
        ];

        // Get the user ID of the application owner
        $userId = $application->user_id;

        // Send notification to the application owner using the determined template
        $success = $this->sendFromTemplate($userId, $templateKey, $data);

        // Determine if staff notifications are needed based on status type
        $staffNotificationStatuses = ['submitted', 'under_review', 'decision_made'];
        if (in_array($newStatus->status, $staffNotificationStatuses)) {
            // Send notifications to relevant staff members
            // This would involve querying for staff roles and sending notifications
            // Implementation depends on specific staff notification requirements
            // Example: $this->sendToStaff($templateKey, $data);
        }

        // Return true if all notifications were sent successfully, false otherwise
        return $success;
    }

    /**
     * Send a notification via email channel
     *
     * @param Notification $notification
     * @param NotificationRecipient $recipient
     * @return bool True if successful, false otherwise
     */
    protected function sendViaEmail(Notification $notification, NotificationRecipient $recipient): bool
    {
        // Get user from notification recipient
        $user = $recipient->user;
        if (!$user) {
            Log::error('Email notification failed: user not found', [
                'notification_id' => $notification->id,
                'recipient_id' => $recipient->id
            ]);
            return false;
        }

        // Get user's email address
        $to = $user->email;

        // Prepare email data from notification content
        $subject = $notification->subject;
        $data = [
            'notification' => $notification,
            'recipient' => $recipient,
            'user' => $user,
            'content' => $notification->content,
            'data' => $notification->data
        ];

        // Determine template based on notification type
        $templateKey = 'notification.' . $notification->type;
        $template = $this->getTemplate($templateKey);

        $success = false;

        if ($template) {
            // Send email using template
            $success = $this->emailService->sendFromTemplate($to, $templateKey, $data);
        } else {
            // Fallback to generic notification template
            $view = 'emails.notification';
            $success = $this->emailService->send($to, $subject, $view, $data);
        }

        // If successful, mark notification as sent for recipient
        if ($success) {
            $recipient->markAsSent();
        }

        return $success;
    }

    /**
     * Send a notification via SMS channel
     *
     * @param Notification $notification
     * @param NotificationRecipient $recipient
     * @return bool True if successful, false otherwise
     */
    protected function sendViaSms(Notification $notification, NotificationRecipient $recipient): bool
    {
        // Get user from notification recipient
        $user = $recipient->user;
        if (!$user) {
            Log::error('SMS notification failed: user not found', [
                'notification_id' => $notification->id,
                'recipient_id' => $recipient->id
            ]);
            return false;
        }

        // Get user's phone number from profile
        $phoneNumber = $user->profile->phone_number ?? null;

        // If phone number is not available, return false
        if (!$phoneNumber) {
            Log::info('User does not have a phone number', ['user_id' => $user->id]);
            return false;
        }

        // Prepare SMS data from notification content
        $subject = $notification->subject;
        $content = $notification->content;
        $data = $notification->data ?? [];
        $message = $subject ? "$subject: $content" : $content;

        // Determine template based on notification type if applicable
        $templateKey = null;
        if (isset($data['sms_template'])) {
            $templateKey = $data['sms_template'];
        } elseif (isset($this->config['notification_templates'][$notification->type])) {
            $templateKey = $this->config['notification_templates'][$notification->type];
        }

        // Send SMS using send() or sendFromTemplate()
        $success = false;

        if ($templateKey) {
            $success = $this->smsService->sendFromTemplate($phoneNumber, $templateKey, $data);
        } else {
            $success = $this->smsService->send($phoneNumber, $message);
        }

        // If successful, mark notification as sent for recipient
        if ($success) {
            $recipient->markAsSent();
        }

        return $success;
    }

    /**
     * Send a notification via in-app channel (real-time)
     *
     * @param Notification $notification
     * @param NotificationRecipient $recipient
     * @return bool True if successful, false otherwise
     */
    protected function sendViaInApp(Notification $notification, NotificationRecipient $recipient): bool
    {
        // Mark the notification as sent for this recipient via in-app channel
        $recipient->markAsSent();

        // Prepare notification data for real-time delivery
        $data = [
            'notification_id' => $notification->id,
            'type' => $notification->type,
            'subject' => $notification->subject,
            'content' => $notification->content,
            'data' => $notification->data,
            'created_at' => $notification->created_at->toDateTimeString(),
        ];

        // Use Redis to publish the notification to the user's channel
        $channel = 'user.' . $recipient->user_id;
        Redis::publish($channel, json_encode($data));

        // Dispatch an event for WebSocket broadcasting if enabled
        Event::dispatch(new \App\Events\RealTimeNotification($recipient->user_id, $data));

        return true;
    }

    /**
     * Get channel preferences for a specific user and notification type
     *
     * @param int $userId
     * @param string $notificationType
     * @return array Array of enabled channels for the user and notification type
     */
    protected function getUserChannelPreferences(int $userId, string $notificationType): array
    {
        // Get user notification preferences
        $preferences = $this->getUserPreferences($userId);

        // Check if there are specific preferences for the notification type
        if (isset($preferences[$notificationType])) {
            // If specific preferences exist, return the enabled channels
            return $preferences[$notificationType];
        }

        // Otherwise, return the default channels for the notification type
        if (isset($this->config['default_channels'][$notificationType])) {
            return $this->config['default_channels'][$notificationType];
        }

        // If no preferences are found, return all available channels
        return $this->channels;
    }

    /**
     * Log notification sending activity
     *
     * @param Notification $notification
     * @param int $userId
     * @param string $channel
     * @param bool $success
     * @param string|null $error
     * @return void No return value
     */
    protected function logNotificationActivity(Notification $notification, int $userId, string $channel, bool $success, ?string $error = null): void
    {
        // Prepare log data array with notification details
        $logData = [
            'notification_id' => $notification->id,
            'user_id' => $userId,
            'channel' => $channel,
            'success' => $success,
        ];

        if ($error) {
            $logData['error'] = $error;
        }

        // Determine log level based on success
        if ($success) {
            Log::info('Notification sent successfully', $logData);
        } else {
            Log::warning('Notification sending failed', $logData);
        }
    }

    /**
     * Process a template by replacing placeholders with data
     *
     * @param string $template
     * @param array $data
     * @return string Processed template with placeholders replaced
     */
    protected function processTemplate(string $template, array $data = []): string
    {
        // Replace each {key} placeholder with corresponding value
        return preg_replace_callback('/{([^}]+)}/', function ($matches) use ($data) {
            $key = $matches[1];
            return $data[$key] ?? '';
        }, $template);
    }
}