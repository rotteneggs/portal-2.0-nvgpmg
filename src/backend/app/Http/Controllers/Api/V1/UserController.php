<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\UserResource; // Import UserResource class for transforming user data into API responses
use App\Models\User; // Import User model for accessing user data
use App\Services\UserService; // Import UserService class for handling user-related operations
use Illuminate\Http\Request; // Import Request class for handling HTTP requests
use Illuminate\Http\Response; // Import Response class for generating HTTP responses
use Illuminate\Support\Facades\Auth; // Import Auth facade for authentication
use Illuminate\Support\Facades\Validator; // Import Validator facade for data validation
use Illuminate\Routing\Controller; // Import Controller class for defining base controller

/**
 * Controller for handling user-related API endpoints
 */
class UserController extends Controller
{
    /**
     * @var UserService
     */
    protected UserService $userService;

    /**
     * Create a new UserController instance
     *
     * @param UserService $userService
     */
    public function __construct(UserService $userService)
    {
        // Initialize the controller with dependencies
        // Store UserService instance for handling user operations
        $this->userService = $userService;
    }

    /**
     * Get the authenticated user's profile
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with user profile data
     */
    public function profile(Request $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user
        $user = Auth::user();

        // Transform the user data using UserResource with profile and roles
        $userResource = (new UserResource($user))->withProfile()->withRoles();

        // Return JSON response with user profile data
        return response()->json([
            'success' => true,
            'data' => $userResource,
        ]);
    }

    /**
     * Update the authenticated user's profile information
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with updated profile data
     */
    public function updateProfile(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for profile fields (first_name, last_name, date_of_birth, phone_number, address fields)
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'date_of_birth' => 'nullable|date',
            'phone_number' => 'nullable|string|max:20',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors(),
            ], 400);
        }

        // Get the authenticated user
        $user = Auth::user();

        // Call the UserService updateProfile method with user ID and validated data
        $profileData = $validator->validated();
        $updatedProfile = $this->userService->updateProfile($user->id, $profileData);

        // If update fails, return error response with 400 status
        if (!$updatedProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile update failed',
            ], 400);
        }

        // Transform the updated user data using UserResource with profile
        $userResource = (new UserResource($user))->withProfile();

        // Return JSON response with success status and updated profile data
        return response()->json([
            'success' => true,
            'data' => $userResource,
        ]);
    }

    /**
     * Update the user's notification preferences
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with success message
     */
    public function updateNotificationPreferences(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for notification preferences
        $validator = Validator::make($request->all(), [
            'preferences' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors(),
            ], 400);
        }

        // Get the authenticated user
        $user = Auth::user();

        // Call the UserService updateNotificationPreferences method with user ID and preferences
        $preferences = $validator->validated()['preferences'];
        $success = $this->userService->updateNotificationPreferences($user->id, $preferences);

        // If update fails, return error response with 400 status
        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Notification preferences update failed',
            ], 400);
        }

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Notification preferences updated successfully',
        ]);
    }

    /**
     * Get the authenticated user's permissions
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with user permissions
     */
    public function getPermissions(Request $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user
        $user = Auth::user();

        // Call the UserService getUserPermissions method with user ID
        $permissions = $this->userService->getUserPermissions($user->id);

        // Return JSON response with permissions data
        return response()->json([
            'success' => true,
            'data' => $permissions,
        ]);
    }

    /**
     * Upload a profile photo for the authenticated user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with photo URL
     */
    public function uploadProfilePhoto(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for photo file (image type, max size)
        $validator = Validator::make($request->all(), [
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors(),
            ], 400);
        }

        // Get the authenticated user
        $user = Auth::user();

        // Process and store the uploaded photo
        $photo = $request->file('photo');
        $path = $photo->store('profile_photos', 'public');

        // Update the user's profile with the new photo URL
        $profileData = ['profile_photo_url' => $path];
        $updatedProfile = $this->userService->updateProfile($user->id, $profileData);

        if (!$updatedProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile photo upload failed',
            ], 500);
        }

        // Return JSON response with success status and photo URL
        return response()->json([
            'success' => true,
            'data' => ['photo_url' => asset('storage/' . $path)],
        ]);
    }

    /**
     * Delete the authenticated user's profile photo
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with success message
     */
    public function deleteProfilePhoto(Request $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user
        $user = Auth::user();

        // Delete the existing profile photo if it exists
        $profile = $user->profile;
        if ($profile && $profile->profile_photo_url) {
            \Storage::disk('public')->delete($profile->profile_photo_url);
        }

        // Update the user's profile to remove the photo reference
        $profileData = ['profile_photo_url' => null];
        $updatedProfile = $this->userService->updateProfile($user->id, $profileData);

        if (!$updatedProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile photo deletion failed',
            ], 500);
        }

        // Return JSON response with success message
        return response()->json([
            'success' => true,
            'message' => 'Profile photo deleted successfully',
        ]);
    }

    /**
     * Check if an email address is available for registration
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with availability status
     */
    public function checkEmailAvailability(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate the request for email
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors(),
            ], 400);
        }

        // Check if the email already exists in the users table
        $email = $validator->validated()['email'];
        $user = $this->userService->getUserByEmail($email);

        // Return JSON response with availability status
        return response()->json([
            'success' => true,
            'available' => !$user,
        ]);
    }
}