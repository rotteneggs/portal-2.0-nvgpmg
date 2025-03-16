<?php

namespace App\Services;

use App\Models\Message;
use App\Models\MessageAttachment;
use App\Models\User;
use App\Models\Application;
use App\Services\StorageService;
use App\Events\NewMessageEvent;
use Illuminate\Support\Facades\DB; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Event; // illuminate/support/facades ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use Illuminate\Support\Collection; // illuminate/support ^10.0
use Exception; // php 8.2

/**
 * Service class for handling all messaging functionality in the application
 */
class MessageService
{
    /**
     * The storage service for handling file operations
     */
    protected StorageService $storageService;

    /**
     * The path where message attachments are stored
     */
    protected string $attachmentsPath;

    /**
     * The allowed MIME types for message attachments
     */
    protected array $allowedAttachmentTypes;

    /**
     * The maximum size allowed for message attachments
     */
    protected int $maxAttachmentSize;

    /**
     * Create a new MessageService instance
     *
     * @param StorageService $storageService
     */
    public function __construct(StorageService $storageService)
    {
        $this->storageService = $storageService;
        $this->attachmentsPath = config('filesystems.paths.attachments', 'attachments');
        $this->allowedAttachmentTypes = config('filesystems.allowed_mime_types.attachments', [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip',
            'text/plain'
        ]);
        $this->maxAttachmentSize = config('filesystems.max_file_sizes.attachments', 10 * 1024 * 1024); // 10MB default
    }

    /**
     * Get paginated messages for a user
     *
     * @param int $userId
     * @param array $filters
     * @param int $perPage
     * @param int $page
     * @return array Paginated messages with metadata
     */
    public function getMessages(int $userId, array $filters = [], int $perPage = 15, int $page = 1): array
    {
        $query = Message::query()->forUser($userId);
        
        // Apply filters
        if (isset($filters['application_id'])) {
            $query->where('application_id', $filters['application_id']);
        }
        
        if (isset($filters['unread_only']) && $filters['unread_only']) {
            $query->where('is_read', false)
                  ->where('recipient_user_id', $userId);
        }
        
        if (isset($filters['search_term']) && !empty($filters['search_term'])) {
            $query->search($filters['search_term']);
        }
        
        // Order by most recent
        $query->orderBy('created_at', 'desc');
        
        // Paginate and load relationships
        $messages = $query->with(['sender', 'recipient', 'application'])
                          ->paginate($perPage, ['*'], 'page', $page);
        
        return [
            'data' => $messages->items(),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
                'last_page' => $messages->lastPage(),
            ]
        ];
    }

    /**
     * Get a specific message by ID for a user
     *
     * @param int $messageId
     * @param int $userId
     * @return Message|null Message model instance or null if not found or not authorized
     */
    public function getMessage(int $messageId, int $userId): ?Message
    {
        $message = Message::find($messageId);
        
        if (!$message) {
            return null;
        }
        
        // Ensure the user is authorized to view this message
        if ($message->sender_user_id !== $userId && $message->recipient_user_id !== $userId) {
            return null;
        }
        
        // Load relationships
        $message->load(['sender', 'recipient', 'application', 'attachments']);
        
        return $message;
    }

    /**
     * Send a new message from one user to another
     *
     * @param int $senderId
     * @param int $recipientId
     * @param string $subject
     * @param string $messageBody
     * @param int|null $applicationId
     * @param array $attachments
     * @return Message|null Created message or null on failure
     */
    public function sendMessage(
        int $senderId,
        int $recipientId,
        string $subject,
        string $messageBody,
        ?int $applicationId = null,
        array $attachments = []
    ): ?Message {
        // Verify that both users exist
        $sender = User::find($senderId);
        $recipient = User::find($recipientId);
        
        if (!$sender || !$recipient) {
            return null;
        }
        
        // If application ID is provided, verify it exists
        if ($applicationId) {
            $application = Application::find($applicationId);
            if (!$application) {
                $applicationId = null;
            }
        }
        
        try {
            // Begin database transaction
            DB::beginTransaction();
            
            // Create new Message record with provided data
            $message = Message::create([
                'sender_user_id' => $senderId,
                'recipient_user_id' => $recipientId,
                'application_id' => $applicationId,
                'subject' => $subject,
                'message_body' => $messageBody,
                'is_read' => false,
            ]);
            
            // Process and store attachments if provided
            if (!empty($attachments)) {
                $this->processAttachments($message, $attachments);
            }
            
            // Commit transaction
            DB::commit();
            
            // Load relationships for the created message
            $message->load(['sender', 'recipient', 'application', 'attachments']);
            
            // Dispatch NewMessageEvent for real-time notification
            Event::dispatch(new NewMessageEvent($message));
            
            // Log the message activity
            $this->logMessageActivity('send', $message->id, $senderId);
            
            return $message;
        } catch (Exception $e) {
            // Rollback transaction on failure
            DB::rollBack();
            
            Log::error('Failed to send message', [
                'sender_id' => $senderId,
                'recipient_id' => $recipientId,
                'subject' => $subject,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return null;
        }
    }

    /**
     * Reply to an existing message
     *
     * @param int $originalMessageId
     * @param int $senderId
     * @param string $messageBody
     * @param array $attachments
     * @return Message|null Created reply message or null on failure
     */
    public function replyToMessage(
        int $originalMessageId,
        int $senderId,
        string $messageBody,
        array $attachments = []
    ): ?Message {
        // Find the original message
        $originalMessage = Message::find($originalMessageId);
        
        if (!$originalMessage) {
            return null;
        }
        
        // Determine the recipient (the sender of the original message)
        $recipientId = $originalMessage->sender_user_id;
        
        // Validate sender exists and is authorized to reply
        if ($originalMessage->recipient_user_id !== $senderId) {
            return null;
        }
        
        try {
            // Begin database transaction
            DB::beginTransaction();
            
            // Create new Message record with 'Re: ' prefix on subject
            $subject = $this->buildReplySubject($originalMessage->subject);
            
            $message = Message::create([
                'sender_user_id' => $senderId,
                'recipient_user_id' => $recipientId,
                'application_id' => $originalMessage->application_id, // Copy application_id from original message
                'subject' => $subject,
                'message_body' => $messageBody,
                'is_read' => false,
            ]);
            
            // Process and store attachments if provided
            if (!empty($attachments)) {
                $this->processAttachments($message, $attachments);
            }
            
            // Commit transaction
            DB::commit();
            
            // Load relationships for the created reply message
            $message->load(['sender', 'recipient', 'application', 'attachments']);
            
            // Dispatch NewMessageEvent for real-time notification
            Event::dispatch(new NewMessageEvent($message));
            
            // Log the reply activity
            $this->logMessageActivity('reply', $message->id, $senderId, 'Reply to message #' . $originalMessageId);
            
            return $message;
        } catch (Exception $e) {
            // Rollback transaction on failure
            DB::rollBack();
            
            Log::error('Failed to reply to message', [
                'original_message_id' => $originalMessageId,
                'sender_id' => $senderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return null;
        }
    }

    /**
     * Mark a message as read by the recipient
     *
     * @param int $messageId
     * @param int $userId
     * @return bool True if successful, false otherwise
     */
    public function markAsRead(int $messageId, int $userId): bool
    {
        // Find the message by ID
        $message = Message::find($messageId);
        
        if (!$message) {
            return false;
        }
        
        // Verify the user is the recipient of the message
        if ($message->recipient_user_id !== $userId) {
            return false;
        }
        
        // Call the markAsRead method on the message model
        $result = $message->markAsRead();
        
        if ($result) {
            $this->logMessageActivity('mark_read', $messageId, $userId);
        }
        
        return $result;
    }

    /**
     * Mark a message as unread by the recipient
     *
     * @param int $messageId
     * @param int $userId
     * @return bool True if successful, false otherwise
     */
    public function markAsUnread(int $messageId, int $userId): bool
    {
        // Find the message by ID
        $message = Message::find($messageId);
        
        if (!$message) {
            return false;
        }
        
        // Verify the user is the recipient of the message
        if ($message->recipient_user_id !== $userId) {
            return false;
        }
        
        // Call the markAsUnread method on the message model
        $result = $message->markAsUnread();
        
        if ($result) {
            $this->logMessageActivity('mark_unread', $messageId, $userId);
        }
        
        return $result;
    }

    /**
     * Get the count of unread messages for a user
     *
     * @param int $userId
     * @return int Count of unread messages
     */
    public function getUnreadCount(int $userId): int
    {
        return Message::where('recipient_user_id', $userId)
                     ->where('is_read', false)
                     ->count();
    }

    /**
     * Get messages related to a specific application
     *
     * @param int $applicationId
     * @param int $userId
     * @param int $perPage
     * @param int $page
     * @return array Paginated application-related messages with metadata
     */
    public function getApplicationMessages(
        int $applicationId,
        int $userId,
        int $perPage = 15,
        int $page = 1
    ): array {
        // Verify the application exists
        $application = Application::find($applicationId);
        
        if (!$application) {
            return [
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'per_page' => $perPage,
                    'total' => 0,
                    'last_page' => 1,
                ]
            ];
        }
        
        // Build query for messages where application_id = applicationId
        $query = Message::where('application_id', $applicationId)
                       ->where(function ($query) use ($userId) {
                           $query->where('sender_user_id', $userId)
                                 ->orWhere('recipient_user_id', $userId);
                       })
                       ->orderBy('created_at', 'desc');
        
        // Paginate the results with the specified perPage and page
        $messages = $query->with(['sender', 'recipient'])
                          ->paginate($perPage, ['*'], 'page', $page);
        
        return [
            'data' => $messages->items(),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
                'last_page' => $messages->lastPage(),
            ]
        ];
    }

    /**
     * Delete a message (soft delete)
     *
     * @param int $messageId
     * @param int $userId
     * @return bool True if successful, false otherwise
     */
    public function deleteMessage(int $messageId, int $userId): bool
    {
        // Find the message by ID
        $message = Message::find($messageId);
        
        if (!$message) {
            return false;
        }
        
        // Verify the user is either the sender or recipient
        if ($message->sender_user_id !== $userId && $message->recipient_user_id !== $userId) {
            return false;
        }
        
        // Soft delete the message
        $result = $message->delete();
        
        if ($result) {
            $this->logMessageActivity('delete', $messageId, $userId);
        }
        
        return $result;
    }

    /**
     * Get a message attachment by ID
     *
     * @param int $attachmentId
     * @param int $userId
     * @return MessageAttachment|null Attachment model or null if not found or not authorized
     */
    public function getAttachment(int $attachmentId, int $userId): ?MessageAttachment
    {
        // Find the attachment by ID
        $attachment = MessageAttachment::find($attachmentId);
        
        if (!$attachment) {
            return null;
        }
        
        // Load the message relationship
        $attachment->load('message');
        
        // Verify the user is either the sender or recipient of the related message
        if (!$attachment->message || 
            ($attachment->message->sender_user_id !== $userId && 
             $attachment->message->recipient_user_id !== $userId)) {
            return null;
        }
        
        return $attachment;
    }

    /**
     * Generate a temporary download URL for an attachment
     *
     * @param int $attachmentId
     * @param int $userId
     * @param int $expirationMinutes
     * @return string|null Temporary download URL or null if not found or not authorized
     */
    public function getAttachmentDownloadUrl(
        int $attachmentId,
        int $userId,
        int $expirationMinutes = 60
    ): ?string {
        // Get the attachment using getAttachment method
        $attachment = $this->getAttachment($attachmentId, $userId);
        
        if (!$attachment) {
            return null;
        }
        
        try {
            // Use StorageService to generate a temporary URL for the attachment's file_path
            $url = $this->storageService->getTemporaryUrl(
                $attachment->file_path,
                $expirationMinutes
            );
            
            if ($url) {
                $this->logMessageActivity(
                    'download_attachment',
                    $attachment->message->id,
                    $userId,
                    'Attachment ID: ' . $attachmentId
                );
            }
            
            return $url;
        } catch (Exception $e) {
            Log::error('Failed to generate attachment download URL', [
                'attachment_id' => $attachmentId,
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return null;
        }
    }

    /**
     * Search messages by content
     *
     * @param int $userId
     * @param string $searchTerm
     * @param int $perPage
     * @param int $page
     * @return array Paginated search results with metadata
     */
    public function searchMessages(
        int $userId,
        string $searchTerm,
        int $perPage = 15,
        int $page = 1
    ): array {
        // Build query for messages where the user is either sender or recipient
        $query = Message::forUser($userId)
                       ->search($searchTerm)
                       ->orderBy('created_at', 'desc');
        
        // Paginate the results with the specified perPage and page
        $messages = $query->with(['sender', 'recipient', 'application'])
                          ->paginate($perPage, ['*'], 'page', $page);
        
        return [
            'data' => $messages->items(),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
                'last_page' => $messages->lastPage(),
            ]
        ];
    }

    /**
     * Process and store message attachments
     *
     * @param Message $message
     * @param array $attachments
     * @return array Created attachment records
     */
    protected function processAttachments(Message $message, array $attachments): array
    {
        $createdAttachments = [];
        
        foreach ($attachments as $attachment) {
            try {
                // Validate each attachment (file size, mime type)
                $this->validateAttachment($attachment);
                
                // Generate a unique path for the attachment
                $path = $this->generateAttachmentPath($message->id, $attachment->getClientOriginalName());
                
                // Store the file using StorageService
                $storedPath = $this->storageService->storeFile($attachment, $path);
                
                // Create a MessageAttachment record with file metadata
                $attachmentRecord = MessageAttachment::create([
                    'message_id' => $message->id,
                    'file_name' => $attachment->getClientOriginalName(),
                    'file_path' => $storedPath,
                    'mime_type' => $attachment->getMimeType(),
                    'file_size' => $attachment->getSize(),
                ]);
                
                $createdAttachments[] = $attachmentRecord;
                
            } catch (Exception $e) {
                Log::error('Failed to process attachment', [
                    'message_id' => $message->id,
                    'filename' => $attachment->getClientOriginalName(),
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                
                // Continue processing other attachments even if one fails
                continue;
            }
        }
        
        return $createdAttachments;
    }

    /**
     * Validate an attachment file
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @return bool True if valid, throws exception otherwise
     * @throws Exception If any validation fails
     */
    protected function validateAttachment(\Illuminate\Http\UploadedFile $file): bool
    {
        // Check if file is valid and not empty
        if (!$file->isValid()) {
            throw new Exception('Invalid file upload.');
        }
        
        // Verify file size is within the maximum allowed limit
        if ($file->getSize() > $this->maxAttachmentSize) {
            throw new Exception('File size exceeds the maximum allowed limit of ' . 
                ($this->maxAttachmentSize / 1024 / 1024) . 'MB.');
        }
        
        // Verify file mime type is in the allowed types list
        if (!empty($this->allowedAttachmentTypes) && !in_array($file->getMimeType(), $this->allowedAttachmentTypes)) {
            throw new Exception('File type not allowed. Allowed types: ' . 
                implode(', ', $this->allowedAttachmentTypes));
        }
        
        return true;
    }

    /**
     * Generate a unique storage path for an attachment
     *
     * @param int $messageId
     * @param string $filename
     * @return string Unique storage path
     */
    protected function generateAttachmentPath(int $messageId, string $filename): string
    {
        // Create a path with format: attachments/{messageId}/{timestamp}_{filename}
        $timestamp = time();
        $safeFilename = $this->sanitizeFilename($filename);
        
        return "{$this->attachmentsPath}/{$messageId}/{$timestamp}_{$safeFilename}";
    }

    /**
     * Helper method to sanitize filenames for safe storage
     *
     * @param string $filename
     * @return string
     */
    protected function sanitizeFilename(string $filename): string
    {
        // Remove directory traversal attempts
        $filename = basename($filename);
        
        // Replace spaces with underscores
        $filename = str_replace(' ', '_', $filename);
        
        // Remove any characters that could cause issues in filesystems
        $filename = preg_replace('/[^\w\-\.]/', '_', $filename);
        
        return $filename;
    }

    /**
     * Helper method to build a reply subject with "Re:" prefix
     *
     * @param string $originalSubject
     * @return string
     */
    protected function buildReplySubject(string $originalSubject): string
    {
        // Check if the subject already starts with "Re: "
        if (strpos($originalSubject, 'Re: ') === 0) {
            return $originalSubject; // Already has "Re: " prefix
        }
        
        return 'Re: ' . $originalSubject;
    }

    /**
     * Log message activity for auditing and debugging
     *
     * @param string $action
     * @param int $messageId
     * @param int $userId
     * @param string|null $details
     * @return void
     */
    protected function logMessageActivity(
        string $action,
        int $messageId,
        int $userId,
        ?string $details = null
    ): void {
        // Prepare log data array with message details
        $logData = [
            'action' => $action,
            'message_id' => $messageId,
            'user_id' => $userId,
            'timestamp' => Carbon::now()->toDateTimeString(),
        ];
        
        if ($details) {
            $logData['details'] = $details;
        }
        
        // Write to log using Log facade
        Log::info('Message activity: ' . $action, $logData);
    }
}