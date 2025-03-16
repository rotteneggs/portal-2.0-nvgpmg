<?php

namespace App\Jobs;

use App\Models\Notification; // Import the Notification model
use App\Models\NotificationRecipient; // Import the NotificationRecipient model
use App\Services\NotificationService; // Import the NotificationService class
use Illuminate\Contracts\Queue\ShouldQueue; // Import the ShouldQueue interface from illuminate/contracts
use Illuminate\Foundation\Bus\Dispatchable; // Import the Dispatchable trait from illuminate/foundation
use Illuminate\Queue\InteractsWithQueue; // Import the InteractsWithQueue trait from illuminate/queue
use Illuminate\Queue\SerializesModels; // Import the SerializesModels trait from illuminate/queue
use Illuminate\Support\Facades\Log; // Import the Log facade from illuminate/support

class SendBulkNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds after which the job's timeout is considered.
     *
     * @var int
     */
    public $timeout = 60;

    /**
     * The queue this job should run on.
     *
     * @var string
     */
    public $queue = 'notifications';

    /**
     * The notification ID.
     *
     * @var int
     */
    public int $notificationId;

    /**
     * The user IDs to send the notification to.
     *
     * @var array
     */
    public array $userIds;

    /**
     * The channels to send the notification through.
     *
     * @var array
     */
    public array $channels;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public int $backoff = 30;

    /**
     * Create a new job instance.
     *
     * @param int $notificationId The notification ID
     * @param array $userIds The user IDs to send the notification to
     * @param array $channels The channels to send the notification through
     * @return void
     */
    public function __construct(int $notificationId, array $userIds, array $channels)
    {
        // Set the notification ID property
        $this->notificationId = $notificationId;

        // Set the user IDs array property
        $this->userIds = $userIds;

        // Set the channels array property
        $this->channels = $channels;

        // Set default job configuration (timeout, tries, backoff)
        $this->timeout = 60;
        $this->tries = 3;
        $this->backoff = 30;

        // Set the queue name to 'notifications'
        $this->queue = 'notifications';
    }

    /**
     * Execute the job to process bulk notifications.
     *
     * @param NotificationService $notificationService The notification service
     * @return void
     */
    public function handle(NotificationService $notificationService): void
    {
        // Log the start of bulk notification processing
        Log::info('Starting bulk notification processing', [
            'notification_id' => $this->notificationId,
            'user_count' => count($this->userIds),
        ]);

        // Retrieve the notification by ID from the database
        $notification = Notification::find($this->notificationId);

        // If notification not found, log error and mark job as failed
        if (!$notification) {
            Log::error('Notification not found', ['notification_id' => $this->notificationId]);
            $this->fail(new \Exception('Notification not found'));
            return;
        }

        // Process each user ID in the array
        foreach ($this->userIds as $userId) {
            try {
                // For each user, determine which channels to use based on preferences and specified channels
                $selectedChannels = $this->channels ?: $notificationService->getUserChannelPreferences($userId, $notification->type);

                // Get the notification recipient
                $notificationRecipient = NotificationRecipient::forUser($userId)
                    ->where('notification_id', $notification->id)
                    ->first();

                // If notification recipient not found, log error and continue to the next user
                if (!$notificationRecipient) {
                    Log::error('Notification recipient not found', [
                        'notification_id' => $notification->id,
                        'user_id' => $userId,
                    ]);
                    continue;
                }

                // For each channel (in-app, email, SMS), send the notification using the appropriate method
                foreach ($selectedChannels as $channel) {
                    switch ($channel) {
                        case 'email':
                            $success = $notificationService->sendViaEmail($notification, $notificationRecipient);
                            break;
                        case 'sms':
                            $success = $notificationService->sendViaSms($notification, $notificationRecipient);
                            break;
                        case 'in_app':
                            $success = $notificationService->sendViaInApp($notification, $notificationRecipient);
                            break;
                        default:
                            Log::warning("Unsupported notification channel: {$channel}");
                            $success = false;
                    }

                    // Track delivery status for each channel
                    $notificationService->logNotificationActivity($notification, $userId, $channel, $success);

                    // If successful, mark notification as sent for recipient
                    if ($success) {
                        $notificationRecipient->markAsSent();
                    }
                }
            } catch (\Exception $e) {
                // Log detailed information about the error
                Log::error('Error sending notification to user', [
                    'notification_id' => $this->notificationId,
                    'user_id' => $userId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);

                // If exceptions occur, log the error and handle retry logic
                if ($this->attempts() > $this->tries) {
                    // If max retries exceeded, mark job as failed permanently
                    Log::critical('Max retries exceeded for notification', [
                        'notification_id' => $this->notificationId,
                        'user_id' => $userId,
                    ]);
                    $this->fail($e);
                } else {
                    // Otherwise, release job back to queue with exponential backoff
                    $this->release($this->backoff);
                }
            }
        }

        // Log the completion of bulk notification processing
        Log::info('Completed bulk notification processing', [
            'notification_id' => $this->notificationId,
            'user_count' => count($this->userIds),
        ]);
    }

    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        // Log detailed information about the failed job
        Log::critical('Bulk notification job failed', [
            'notification_id' => $this->notificationId,
            'user_count' => count($this->userIds),
            'exception' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);

        // Notify administrators about critical notification failures
        // Implement notification to admin team here (e.g., email, Slack)
    }
}