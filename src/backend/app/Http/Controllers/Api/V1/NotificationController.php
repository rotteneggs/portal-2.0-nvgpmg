<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Routing\Controller; // illuminate/routing ^10.0
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Http\Response; // illuminate/http ^10.0
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0
use Illuminate\Http\Resources\Json\JsonResource; // illuminate/http/resources/json ^10.0
use App\Services\NotificationService; // path: src/backend/app/Services/NotificationService.php
use App\Http\Resources\NotificationResource; // path: src/backend/app/Http/Resources/NotificationResource.php
use App\Models\Notification; // path: src/backend/app/Models/Notification.php

class NotificationController extends Controller
{
    /**
     * @var NotificationService
     */
    protected NotificationService $notificationService;

    /**
     * Create a new NotificationController instance.
     *
     * @param NotificationService $notificationService
     */
    public function __construct(NotificationService $notificationService)
    {
        // Assign the notification service to the protected property
        $this->notificationService = $notificationService;
    }

    /**
     * Get paginated list of notifications for the authenticated user
     *
     * @param Request $request
     * @return JsonResource Paginated list of notifications
     */
    public function index(Request $request): JsonResource
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Extract pagination parameters from request (page, per_page)
        $page = (int) $request->get('page', 1);
        $perPage = (int) $request->get('per_page', 10);

        // Extract filter parameters from request (type, read_status, date_range)
        $filters = $request->only(['type', 'is_read', 'date_range']);

        // Call getUserNotifications on the notification service
        $notificationsData = $this->notificationService->getUserNotifications($userId, $page, $perPage, $filters);

        // Transform the results using NotificationResource collection
        $notifications = NotificationResource::collection(collect($notificationsData['data']));

        // Return the transformed collection with pagination metadata
        return $notifications->additional([
            'meta' => [
                'pagination' => $notificationsData['pagination'],
            ],
        ]);
    }

    /**
     * Get a specific notification by ID
     *
     * @param int $id
     * @return JsonResource|Response Notification resource or 404 response
     */
    public function show(int $id): JsonResource|Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Find the notification with the given ID that belongs to the user
        $notification = Notification::forUser($userId)
            ->where('notifications.id', $id)
            ->first();

        // If not found, return 404 response
        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        // Transform the notification using NotificationResource
        $notificationResource = new NotificationResource($notification);

        // Return the transformed resource
        return $notificationResource;
    }

    /**
     * Get the count of unread notifications for the authenticated user
     *
     * @return Response JSON response with unread count
     */
    public function unreadCount(): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call getUnreadCount on the notification service
        $count = $this->notificationService->getUnreadCount($userId);

        // Return JSON response with the count
        return response()->json(['unread_count' => $count]);
    }

    /**
     * Mark a specific notification as read
     *
     * @param int $id
     * @return Response JSON response indicating success or failure
     */
    public function markAsRead(int $id): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call markAsRead on the notification service
        $success = $this->notificationService->markAsRead($id, $userId);

        // Return JSON response with success status and message
        if ($success) {
            return response()->json(['message' => 'Notification marked as read', 'success' => true]);
        } else {
            return response()->json(['message' => 'Notification not found or could not be marked as read', 'success' => false], 404);
        }
    }

    /**
     * Mark all notifications as read for the authenticated user
     *
     * @return Response JSON response with count of notifications marked as read
     */
    public function markAllAsRead(): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call markAllAsRead on the notification service
        $count = $this->notificationService->markAllAsRead($userId);

        // Return JSON response with count and success message
        return response()->json(['message' => "{$count} notifications marked as read", 'count' => $count, 'success' => true]);
    }

    /**
     * Delete a specific notification
     *
     * @param int $id
     * @return Response JSON response indicating success or failure
     */
    public function delete(int $id): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call deleteNotification on the notification service
        $success = $this->notificationService->deleteNotification($id, $userId);

        // Return JSON response with success status and message
        if ($success) {
            return response()->json(['message' => 'Notification deleted', 'success' => true]);
        } else {
            return response()->json(['message' => 'Notification not found or could not be deleted', 'success' => false], 404);
        }
    }

    /**
     * Delete all notifications for the authenticated user
     *
     * @return Response JSON response with count of deleted notifications
     */
    public function deleteAll(): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call deleteAllNotifications on the notification service
        $count = $this->notificationService->deleteAllNotifications($userId);

        // Return JSON response with count and success message
        return response()->json(['message' => "{$count} notifications deleted", 'count' => $count, 'success' => true]);
    }

    /**
     * Get notification preferences for the authenticated user
     *
     * @return Response JSON response with notification preferences
     */
    public function getPreferences(): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call getUserPreferences on the notification service
        $preferences = $this->notificationService->getUserPreferences($userId);

        // Return JSON response with preferences data
        return response()->json(['preferences' => $preferences]);
    }

    /**
     * Update notification preferences for the authenticated user
     *
     * @param Request $request
     * @return Response JSON response indicating success or failure
     */
    public function updatePreferences(Request $request): Response
    {
        // Validate the request data for notification preferences
        $validatedData = $request->validate([
            'preferences' => 'required|array',
        ]);

        // Get the authenticated user ID
        $userId = Auth::id();

        // Call updateUserPreferences on the notification service
        $success = $this->notificationService->updateUserPreferences($userId, $validatedData['preferences']);

        // Return JSON response with success status and updated preferences
        if ($success) {
            return response()->json(['message' => 'Notification preferences updated', 'success' => true, 'preferences' => $validatedData['preferences']]);
        } else {
            return response()->json(['message' => 'Failed to update notification preferences', 'success' => false], 500);
        }
    }
}