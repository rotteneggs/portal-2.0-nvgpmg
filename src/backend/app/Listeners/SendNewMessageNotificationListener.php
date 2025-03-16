<?php

namespace App\Listeners;

use App\Events\NewMessageEvent; // Access the event data containing the new message
use App\Models\Message; // Access message data and relationships
use App\Services\NotificationService; // Service for sending notifications through multiple channels
use Illuminate\Support\Facades\Log; // Logging notification activities and errors

/**
 * Listener that handles sending notifications when a new message is created
 */
class SendNewMessageNotificationListener
{
    /**
     * The notification service instance.
     *
     * @var NotificationService
     */
    protected $notificationService;

    /**
     * Create a new listener instance with dependencies
     *
     * @param  NotificationService  $notificationService
     * @return void
     */
    public function __construct(NotificationService $notificationService)
    {
        // Assign the notification service to the protected property
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the NewMessageEvent by sending appropriate notifications
     *
     * @param  NewMessageEvent  $event
     * @return void
     */
    public function handle(NewMessageEvent $event): void
    {
        // Extract the message from the event
        $message = $event->message;

        try {
            // Get the recipient user from the message relationship
            $recipient = $message->recipient();
            $recipientUser = $recipient->first();

            // Get the sender user from the message relationship
            $sender = $message->sender();
            $senderUser = $sender->first();

            // Prepare notification data including message details, sender information, and preview
            $notificationData = [
                'message_id' => $message->id,
                'subject' => $message->subject,
                'message_preview' => $message->getPreview(),
                'sender_name' => $senderUser->full_name,
                'sender_id' => $senderUser->id,
            ];

            // Determine appropriate notification channels based on user preferences
            $channels = $this->notificationService->getUserChannelPreferences($recipientUser->id, 'new_message');

            // Send notification to the recipient using the 'new_message' template
            $this->notificationService->sendFromTemplate(
                $recipientUser->id,
                'new_message',
                $notificationData,
                $channels
            );

            // Log successful notification delivery
            Log::info('New message notification sent', [
                'message_id' => $message->id,
                'recipient_id' => $recipientUser->id,
                'channels' => $channels,
            ]);
        } catch (\Exception $e) {
            // Handle any exceptions during notification sending and log errors
            Log::error('Failed to send new message notification', [
                'message_id' => $message->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}