<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller; // illuminate/routing ^10.0
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Http\Response; // illuminate/http ^10.0
use Illuminate\Http\JsonResponse; // illuminate/http ^10.0
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0
use App\Services\MessageService; // '../../../Services/MessageService'
use App\Http\Resources\MessageResource; // '../../../Http/Resources/MessageResource'
use App\Models\Message; // '../../../Models/Message'

/**
 * Controller for handling message-related API requests
 */
class MessageController extends Controller
{
    /**
     * The message service instance.
     *
     * @var MessageService
     */
    protected MessageService $messageService;

    /**
     * Create a new MessageController instance.
     *
     * @param MessageService $messageService
     */
    public function __construct(MessageService $messageService)
    {
        // Inject MessageService dependency
        $this->messageService = $messageService;
    }

    /**
     * Get a paginated list of messages for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse Paginated list of messages
     */
    public function index(Request $request): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Extract query parameters (page, per_page, application_id, unread_only, search)
        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 15);
        $applicationId = $request->integer('application_id');
        $unreadOnly = $request->boolean('unread_only', false);
        $searchTerm = $request->input('search');

        // Call messageService->getMessages() with appropriate parameters
        $messagesData = $this->messageService->getMessages(
            $userId,
            [
                'application_id' => $applicationId,
                'unread_only' => $unreadOnly,
                'search_term' => $searchTerm,
            ],
            $perPage,
            $page
        );

        // Transform each message using MessageResource with preview
        $messages = collect($messagesData['data'])->map(function (Message $message) {
            return (new MessageResource($message))->withPreview();
        });

        // Return JSON response with paginated messages
        return response()->json([
            'success' => true,
            'data' => $messages,
            'meta' => $messagesData['meta'],
            'message' => 'Messages retrieved successfully',
        ]);
    }

    /**
     * Create a new message.
     *
     * @param Request $request
     * @return JsonResponse Newly created message or error response
     */
    public function store(Request $request): JsonResponse
    {
        // Validate request data (recipient_id, subject, message_body, application_id, attachments)
        $validatedData = $request->validate([
            'recipient_id' => 'required|integer|exists:users,id',
            'subject' => 'required|string|max:255',
            'message_body' => 'required|string',
            'application_id' => 'nullable|integer|exists:applications,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240|mimes:pdf,doc,docx,jpeg,png,xls,xlsx,zip,txt',
        ]);

        // Get authenticated user ID as sender
        $senderId = Auth::id();

        // Call messageService->sendMessage() with request data
        $message = $this->messageService->sendMessage(
            $senderId,
            $validatedData['recipient_id'],
            $validatedData['subject'],
            $validatedData['message_body'],
            $validatedData['application_id'] ?? null,
            $request->file('attachments') ?? []
        );

        // If message creation fails, return error response
        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create message',
            ], 500);
        }

        // Transform created message using MessageResource with all relationships
        $messageResource = (new MessageResource($message))
            ->withSender()
            ->withRecipient()
            ->withApplication()
            ->withAttachments();

        // Return JSON response with the created message
        return response()->json([
            'success' => true,
            'data' => $messageResource,
            'message' => 'Message created successfully',
        ], 201);
    }

    /**
     * Get a specific message by ID.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Message details or error response
     */
    public function show(Request $request, int $id): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Call messageService->getMessage() with message ID and user ID
        $message = $this->messageService->getMessage($id, $userId);

        // If message not found or user not authorized, return 404 error
        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Message not found or unauthorized',
            ], 404);
        }

        // Transform message using MessageResource with all relationships
        $messageResource = (new MessageResource($message))
            ->withSender()
            ->withRecipient()
            ->withApplication()
            ->withAttachments();

        // Return JSON response with the message details
        return response()->json([
            'success' => true,
            'data' => $messageResource,
            'message' => 'Message retrieved successfully',
        ]);
    }

    /**
     * Reply to an existing message.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Newly created reply message or error response
     */
    public function reply(Request $request, int $id): JsonResponse
    {
        // Validate request data (message_body, attachments)
        $validatedData = $request->validate([
            'message_body' => 'required|string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240|mimes:pdf,doc,docx,jpeg,png,xls,xlsx,zip,txt',
        ]);

        // Get authenticated user ID as sender
        $senderId = Auth::id();

        // Call messageService->replyToMessage() with original message ID, sender ID, and request data
        $message = $this->messageService->replyToMessage(
            $id,
            $senderId,
            $validatedData['message_body'],
            $request->file('attachments') ?? []
        );

        // If reply creation fails, return error response
        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reply to message',
            ], 500);
        }

        // Transform created reply message using MessageResource with all relationships
        $messageResource = (new MessageResource($message))
            ->withSender()
            ->withRecipient()
            ->withApplication()
            ->withAttachments();

        // Return JSON response with the created reply message
        return response()->json([
            'success' => true,
            'data' => $messageResource,
            'message' => 'Reply sent successfully',
        ], 201);
    }

    /**
     * Mark a message as read.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Success response or error response
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Call messageService->markAsRead() with message ID and user ID
        $success = $this->messageService->markAsRead($id, $userId);

        // If operation fails, return error response
        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark message as read',
            ], 500);
        }

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Message marked as read',
        ]);
    }

    /**
     * Mark a message as unread.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Success response or error response
     */
    public function markAsUnread(Request $request, int $id): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Call messageService->markAsUnread() with message ID and user ID
        $success = $this->messageService->markAsUnread($id, $userId);

        // If operation fails, return error response
        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark message as unread',
            ], 500);
        }

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Message marked as unread',
        ]);
    }

    /**
     * Get the count of unread messages for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse Count of unread messages
     */
    public function unreadCount(Request $request): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Call messageService->getUnreadCount() with user ID
        $unreadCount = $this->messageService->getUnreadCount($userId);

        // Return JSON response with the unread count
        return response()->json([
            'success' => true,
            'data' => ['unread_count' => $unreadCount],
            'message' => 'Unread message count retrieved successfully',
        ]);
    }

    /**
     * Get messages related to a specific application.
     *
     * @param Request $request
     * @param int $applicationId
     * @return JsonResponse Paginated list of application-related messages
     */
    public function applicationMessages(Request $request, int $applicationId): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Extract query parameters (page, per_page)
        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 15);

        // Call messageService->getApplicationMessages() with application ID, user ID, and pagination parameters
        $messagesData = $this->messageService->getApplicationMessages(
            $applicationId,
            $userId,
            $perPage,
            $page
        );

        // Transform each message using MessageResource with preview
        $messages = collect($messagesData['data'])->map(function (Message $message) {
            return (new MessageResource($message))->withPreview();
        });

        // Return JSON response with paginated messages
        return response()->json([
            'success' => true,
            'data' => $messages,
            'meta' => $messagesData['meta'],
            'message' => 'Application messages retrieved successfully',
        ]);
    }

    /**
     * Delete a message.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Success response or error response
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Call messageService->deleteMessage() with message ID and user ID
        $success = $this->messageService->deleteMessage($id, $userId);

        // If operation fails, return error response
        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete message',
            ], 500);
        }

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Message deleted successfully',
        ]);
    }

    /**
     * Get details of a message attachment.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Attachment details or error response
     */
    public function getAttachment(Request $request, int $id): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Call messageService->getAttachment() with attachment ID and user ID
        $attachment = $this->messageService->getAttachment($id, $userId);

        // If attachment not found or user not authorized, return 404 error
        if (!$attachment) {
            return response()->json([
                'success' => false,
                'message' => 'Attachment not found or unauthorized',
            ], 404);
        }

        // Return JSON response with the attachment details
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $attachment->id,
                'message_id' => $attachment->message_id,
                'file_name' => $attachment->file_name,
                'file_path' => $attachment->file_path,
                'mime_type' => $attachment->mime_type,
                'file_size' => $attachment->file_size,
                'created_at' => $attachment->created_at->toIso8601String(),
            ],
            'message' => 'Attachment details retrieved successfully',
        ]);
    }

    /**
     * Generate a download URL for an attachment.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Download URL or error response
     */
    public function downloadAttachment(Request $request, int $id): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Extract expiration time from request (default: 60 minutes)
        $expirationMinutes = $request->integer('expires', 60);

        // Call messageService->getAttachmentDownloadUrl() with attachment ID, user ID, and expiration
        $downloadUrl = $this->messageService->getAttachmentDownloadUrl($id, $userId, $expirationMinutes);

        // If operation fails, return error response
        if (!$downloadUrl) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate download URL',
            ], 500);
        }

        // Return JSON response with the download URL
        return response()->json([
            'success' => true,
            'data' => ['download_url' => $downloadUrl],
            'message' => 'Download URL generated successfully',
        ]);
    }

    /**
     * Search messages by content.
     *
     * @param Request $request
     * @return JsonResponse Paginated search results
     */
    public function search(Request $request): JsonResponse
    {
        // Get authenticated user ID
        $userId = Auth::id();

        // Extract search term and pagination parameters from request
        $searchTerm = $request->input('search_term');
        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 15);

        // Call messageService->searchMessages() with user ID, search term, and pagination parameters
        $messagesData = $this->messageService->searchMessages(
            $userId,
            $searchTerm,
            $perPage,
            $page
        );

        // Transform each message using MessageResource with preview
        $messages = collect($messagesData['data'])->map(function (Message $message) {
            return (new MessageResource($message))->withPreview();
        });

        // Return JSON response with paginated search results
        return response()->json([
            'success' => true,
            'data' => $messages,
            'meta' => $messagesData['meta'],
            'message' => 'Search results retrieved successfully',
        ]);
    }
}