<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\UserResource; // UserResource for transforming user data for API responses
use App\Models\Role; // Role model for role management operations
use App\Models\User; // User model for user management operations
use App\Services\AuditService; // Service for audit logging
use App\Services\UserService; // Service for user management operations
use Exception; // php 8.2
use Illuminate\Http\JsonResponse; // illuminate/http ^10.0
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Support\Facades\Validator; // illuminate/validation ^10.0
use Illuminate\Routing\Controller; // illuminate/routing ^10.0

class UserManagementController extends Controller
{
    /**
     * @var UserService
     */
    protected UserService $userService;

    /**
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * Create a new UserManagementController instance
     *
     * @param UserService $userService
     * @param AuditService $auditService
     */
    public function __construct(UserService $userService, AuditService $auditService)
    {
        // Store UserService instance for user management operations
        $this->userService = $userService;
        // Store AuditService instance for audit logging
        $this->auditService = $auditService;
    }

    /**
     * List all users with optional filtering and pagination
     *
     * @param Request $request
     * @return JsonResponse Paginated list of users
     */
    public function index(Request $request): JsonResponse
    {
        // Validate request parameters
        $validator = Validator::make($request->all(), [
            'role' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
            'sort_by' => 'nullable|string',
            'sort_order' => 'nullable|in:asc,desc',
            'with_profile' => 'nullable|boolean',
            'with_roles' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Extract filters, page, perPage, and relations from request
        $filters = $validator->validated();
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 15);
        $relations = [];

        if ($request->input('with_profile')) {
            $relations[] = 'profile';
        }

        if ($request->input('with_roles')) {
            $relations[] = 'roles';
        }

        // Call UserService::listUsers with parameters
        $users = $this->userService->listUsers($filters, $perPage, $page, $relations);

        // Transform each user with UserResource
        $transformedUsers = UserResource::collection($users);

        // Return JSON response with paginated users
        return response()->json([
            'success' => true,
            'data' => $transformedUsers,
            'meta' => [
                'pagination' => [
                    'total' => $users->total(),
                    'per_page' => $users->perPage(),
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'from' => $users->firstItem(),
                    'to' => $users->lastItem(),
                ]
            ]
        ]);
    }

    /**
     * Get a specific user by ID
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse User details or error response
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'with_profile' => 'nullable|boolean',
            'with_roles' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        $relations = [];

        if ($request->input('with_profile')) {
            $relations[] = 'profile';
        }

        if ($request->input('with_roles')) {
            $relations[] = 'roles';
        }

        // Call UserService::getUser with ID and relations
        $user = $this->userService->getUser($id, $relations);

        // If user not found, return 404 error response
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Transform user with UserResource, including profile and roles
        $userResource = (new UserResource($user));

        if ($request->input('with_profile')) {
            $userResource->withProfile();
        }

        if ($request->input('with_roles')) {
            $userResource->withRoles();
        }

        // Return JSON response with user details
        return response()->json(['success' => true, 'data' => $userResource]);
    }

    /**
     * Create a new user
     *
     * @param Request $request
     * @return JsonResponse Created user or error response
     */
    public function store(Request $request): JsonResponse
    {
        // Validate request data (email, password, profile information, roles)
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'date_of_birth' => 'nullable|date',
            'phone_number' => 'nullable|string|max:20',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
            'roles' => 'nullable|array',
            'roles.*' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::createUser with validated data
        $user = $this->userService->createUser($validator->validated());

        // Transform created user with UserResource, including profile and roles
        $userResource = (new UserResource($user))->withProfile()->withRoles();

        // Return JSON response with created user and 201 status code
        return response()->json(['success' => true, 'data' => $userResource], 201);
    }

    /**
     * Update an existing user
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Updated user or error response
     */
    public function update(Request $request, int $id): JsonResponse
    {
        // Validate request data (email, profile information, roles)
        $validator = Validator::make($request->all(), [
            'email' => 'sometimes|required|email|unique:users,email,' . $id,
            'password' => 'sometimes|nullable|min:8',
            'is_active' => 'sometimes|boolean',
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'date_of_birth' => 'sometimes|nullable|date',
            'phone_number' => 'sometimes|nullable|string|max:20',
            'address_line1' => 'sometimes|nullable|string|max:255',
            'address_line2' => 'sometimes|nullable|string|max:255',
            'city' => 'sometimes|nullable|string|max:100',
            'state' => 'sometimes|nullable|string|max:100',
            'postal_code' => 'sometimes|nullable|string|max:20',
            'country' => 'sometimes|nullable|string|max:100',
            'roles' => 'sometimes|nullable|array',
            'roles.*' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::updateUser with ID and validated data
        $user = $this->userService->updateUser($id, $validator->validated());

        // If user not found, return 404 error response
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Transform updated user with UserResource, including profile and roles
        $userResource = (new UserResource($user))->withProfile()->withRoles();

        // Return JSON response with updated user
        return response()->json(['success' => true, 'data' => $userResource]);
    }

    /**
     * Delete a user
     *
     * @param int $id
     * @return JsonResponse Success or error response
     */
    public function destroy(int $id): JsonResponse
    {
        // Call UserService::deleteUser with ID
        $deleted = $this->userService->deleteUser($id);

        // If user not found, return 404 error response
        if (!$deleted) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Return JSON response with success message
        return response()->json(['success' => true, 'message' => 'User deleted successfully']);
    }

    /**
     * Search for users by name, email, or other criteria
     *
     * @param Request $request
     * @return JsonResponse Paginated search results
     */
    public function search(Request $request): JsonResponse
    {
        // Validate request parameters (searchTerm, filters, page, perPage)
        $validator = Validator::make($request->all(), [
            'search_term' => 'required|string',
            'role' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::searchUsers with parameters
        $searchTerm = $request->input('search_term');
        $filters = $validator->validated();
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 15);

        $users = $this->userService->searchUsers($searchTerm, $filters, $perPage);

        // Transform each user with UserResource
        $transformedUsers = UserResource::collection($users);

        // Return JSON response with paginated search results
        return response()->json([
            'success' => true,
            'data' => $transformedUsers,
            'meta' => [
                'pagination' => [
                    'total' => $users->total(),
                    'per_page' => $users->perPage(),
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'from' => $users->firstItem(),
                    'to' => $users->lastItem(),
                ]
            ]
        ]);
    }

    /**
     * Assign a role to a user
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Updated user or error response
     */
    public function assignRole(Request $request, int $id): JsonResponse
    {
        // Validate request data (role)
        $validator = Validator::make($request->all(), [
            'role' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::assignRoleToUser with user ID and role
        $user = $this->userService->assignRoleToUser($id, $validator->validated()['role']);

        // If user not found, return 404 error response
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Transform updated user with UserResource, including roles
        $userResource = (new UserResource($user))->withProfile()->withRoles();

        // Return JSON response with updated user
        return response()->json(['success' => true, 'data' => $userResource]);
    }

    /**
     * Remove a role from a user
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Updated user or error response
     */
    public function removeRole(Request $request, int $id): JsonResponse
    {
        // Validate request data (role)
        $validator = Validator::make($request->all(), [
            'role' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::removeRoleFromUser with user ID and role
        $user = $this->userService->removeRoleFromUser($id, $validator->validated()['role']);

        // If user not found, return 404 error response
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Transform updated user with UserResource, including roles
        $userResource = (new UserResource($user))->withProfile()->withRoles();

        // Return JSON response with updated user
        return response()->json(['success' => true, 'data' => $userResource]);
    }

    /**
     * Sync a user's roles with the provided roles
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Updated user or error response
     */
    public function syncRoles(Request $request, int $id): JsonResponse
    {
        // Validate request data (roles array)
        $validator = Validator::make($request->all(), [
            'roles' => 'required|array',
            'roles.*' => 'string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::syncUserRoles with user ID and roles
        $user = $this->userService->syncUserRoles($id, $validator->validated()['roles']);

        // If user not found, return 404 error response
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Transform updated user with UserResource, including roles
        $userResource = (new UserResource($user))->withProfile()->withRoles();

        // Return JSON response with updated user
        return response()->json(['success' => true, 'data' => $userResource]);
    }

    /**
     * Activate a user account
     *
     * @param int $id
     * @return JsonResponse Success or error response
     */
    public function activate(int $id): JsonResponse
    {
        // Call UserService::activateUser with ID
        $user = $this->userService->activateUser($id);

        // If user not found, return 404 error response
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Return JSON response with success message
        return response()->json(['success' => true, 'message' => 'User activated successfully']);
    }

    /**
     * Deactivate a user account
     *
     * @param int $id
     * @return JsonResponse Success or error response
     */
    public function deactivate(int $id): JsonResponse
    {
        // Call UserService::deactivateUser with ID
        $user = $this->userService->deactivateUser($id);

        // If user not found, return 404 error response
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Return JSON response with success message
        return response()->json(['success' => true, 'message' => 'User deactivated successfully']);
    }

    /**
     * Get all permissions assigned to a user through their roles
     *
     * @param int $id
     * @return JsonResponse User permissions or error response
     */
    public function permissions(int $id): JsonResponse
    {
        // Call UserService::getUserPermissions with ID
        $permissions = $this->userService->getUserPermissions($id);

        // If user not found, return 404 error response
        if (!$permissions) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Return JSON response with permissions collection
        return response()->json(['success' => true, 'data' => $permissions]);
    }

    /**
     * Get activity logs for a specific user
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse Paginated activity logs or error response
     */
    public function activityLogs(Request $request, int $id): JsonResponse
    {
        // Validate request parameters (filters, page, perPage)
        $validator = Validator::make($request->all(), [
            'action' => 'nullable|string',
            'resource_type' => 'nullable|string',
            'resource_id' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::getUser to verify user exists
        $user = $this->userService->getUser($id);

        // If user not found, return 404 error response
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        // Call AuditService::getUserActivityLogs with user ID and parameters
        $filters = $validator->validated();
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 15);

        $activityLogs = $this->auditService->getUserActivityLogs($user, $filters, $perPage, $page);

        // Return JSON response with paginated activity logs
        return response()->json([
            'success' => true,
            'data' => $activityLogs->items(),
            'meta' => [
                'pagination' => [
                    'total' => $activityLogs->total(),
                    'per_page' => $activityLogs->perPage(),
                    'current_page' => $activityLogs->currentPage(),
                    'last_page' => $activityLogs->lastPage(),
                    'from' => $activityLogs->firstItem(),
                    'to' => $activityLogs->lastItem(),
                ]
            ]
        ]);
    }

    /**
     * Create multiple users in bulk
     *
     * @param Request $request
     * @return JsonResponse Result of bulk creation operation
     */
    public function bulkCreate(Request $request): JsonResponse
    {
        // Validate request data (array of user data)
        $validator = Validator::make($request->all(), [
            'users' => 'required|array',
            'users.*.email' => 'required|email|distinct|unique:users',
            'users.*.password' => 'required|min:8',
            'users.*.first_name' => 'required|string|max:255',
            'users.*.last_name' => 'required|string|max:255',
            'users.*.date_of_birth' => 'nullable|date',
            'users.*.phone_number' => 'nullable|string|max:20',
            'users.*.address_line1' => 'nullable|string|max:255',
            'users.*.address_line2' => 'nullable|string|max:255',
            'users.*.city' => 'nullable|string|max:100',
            'users.*.state' => 'nullable|string|max:100',
            'users.*.postal_code' => 'nullable|string|max:20',
            'users.*.country' => 'nullable|string|max:100',
            'users.*.roles' => 'nullable|array',
            'users.*.roles.*' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::bulkCreateUsers with validated data
        $result = $this->userService->bulkCreateUsers($validator->validated()['users']);

        // Return JSON response with results (successful creations and errors)
        return response()->json(['success' => true, 'data' => $result]);
    }

    /**
     * Update multiple users in bulk
     *
     * @param Request $request
     * @return JsonResponse Result of bulk update operation
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        // Validate request data (array of user data with IDs)
        $validator = Validator::make($request->all(), [
            'users' => 'required|array',
            'users.*.id' => 'required|integer|exists:users,id',
            'users.*.email' => 'sometimes|required|email|distinct|unique:users,email',
            'users.*.password' => 'sometimes|nullable|min:8',
            'users.*.is_active' => 'sometimes|boolean',
            'users.*.first_name' => 'sometimes|string|max:255',
            'users.*.last_name' => 'sometimes|string|max:255',
            'users.*.date_of_birth' => 'sometimes|nullable|date',
            'users.*.phone_number' => 'sometimes|nullable|string|max:20',
            'users.*.address_line1' => 'sometimes|nullable|string|max:255',
            'users.*.address_line2' => 'sometimes|nullable|string|max:255',
            'users.*.city' => 'sometimes|nullable|string|max:100',
            'users.*.state' => 'sometimes|nullable|string|max:100',
            'users.*.postal_code' => 'sometimes|nullable|string|max:20',
            'users.*.country' => 'sometimes|nullable|string|max:100',
            'users.*.roles' => 'sometimes|nullable|array',
            'users.*.roles.*' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::bulkUpdateUsers with validated data
        $result = $this->userService->bulkUpdateUsers($validator->validated()['users']);

        // Return JSON response with results (successful updates and errors)
        return response()->json(['success' => true, 'data' => $result]);
    }

    /**
     * Delete multiple users in bulk
     *
     * @param Request $request
     * @return JsonResponse Result of bulk deletion operation
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        // Validate request data (array of user IDs)
        $validator = Validator::make($request->all(), [
            'user_ids' => 'required|array',
            'user_ids.*' => 'required|integer|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()], 400);
        }

        // Call UserService::bulkDeleteUsers with validated data
        $result = $this->userService->bulkDeleteUsers($validator->validated()['user_ids']);

        // Return JSON response with results (successful deletions and errors)
        return response()->json(['success' => true, 'data' => $result]);
    }

    /**
     * Get user statistics (counts by role, active/inactive)
     *
     * @return JsonResponse User statistics
     */
    public function statistics(): JsonResponse
    {
        // Call UserService::countUsersByRole to get role statistics
        $roleStats = $this->userService->countUsersByRole();

        // Call UserService::countActiveInactiveUsers to get status statistics
        $statusStats = $this->userService->countActiveInactiveUsers();

        // Return JSON response with combined statistics
        return response()->json(['success' => true, 'data' => [
            'roles' => $roleStats,
            'status' => $statusStats,
        ]]);
    }
}