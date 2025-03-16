<?php

namespace App\Services;

use App\Models\AuditLog; // AuditLog model for logging user-related actions
use App\Models\Permission; // Permission model for permission management operations
use App\Models\Role; // Role model for role management operations
use App\Models\User; // User model for user management operations
use App\Models\UserProfile; // User profile model for profile management operations
use Carbon\Carbon; // nesbot/carbon ^2.0 For date/time handling
use Exception; // php 8.2 For error handling
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator; // Pagination class
use Illuminate\Support\Collection; // Collection class
use Illuminate\Support\Facades\DB; // illuminate/support/facades ^10.0 For database transactions
use Illuminate\Support\Facades\Hash; // illuminate/support/facades ^10.0 For password hashing
use Illuminate\Support\Facades\Str; // illuminate/support/facades ^10.0 For string manipulation

/**
 * Service class for managing users in the system
 */
class UserService
{
    /**
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * @var NotificationService
     */
    protected NotificationService $notificationService;

    /**
     * Create a new UserService instance
     *
     * @param AuditService $auditService
     * @param NotificationService $notificationService
     */
    public function __construct(AuditService $auditService, NotificationService $notificationService)
    {
        // Store AuditService instance for logging user actions
        $this->auditService = $auditService;
        // Store NotificationService instance for sending notifications
        $this->notificationService = $notificationService;
    }

    /**
     * Get a user by ID with optional relations
     *
     * @param int $id
     * @param array $relations
     * @return ?User User model instance or null if not found
     */
    public function getUser(int $id, array $relations = []): ?User
    {
        // Query the User model with the given ID
        $user = User::find($id);

        // Load the specified relations if provided
        if ($user && !empty($relations)) {
            $user->load($relations);
        }

        // Return the user instance or null if not found
        return $user;
    }

    /**
     * Get a user by email address
     *
     * @param string $email
     * @param array $relations
     * @return ?User User model instance or null if not found
     */
    public function getUserByEmail(string $email, array $relations = []): ?User
    {
        // Query the User model with the given email
        $user = User::where('email', $email)->first();

        // Load the specified relations if provided
        if ($user && !empty($relations)) {
            $user->load($relations);
        }

        // Return the user instance or null if not found
        return $user;
    }

    /**
     * Get a paginated list of users with optional filtering
     *
     * @param array $filters
     * @param int $perPage
     * @param int $page
     * @param array $relations
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated list of users
     */
    public function listUsers(array $filters = [], int $perPage = 15, int $page = 1, array $relations = []): LengthAwarePaginator
    {
        // Start with a base query for User model
        $query = User::query();

        // Apply role filter if provided
        if (isset($filters['role'])) {
            $query->withRole($filters['role']);
        }

        // Apply status filter if provided
        if (isset($filters['status'])) {
            if ($filters['status'] === 'active') {
                $query->active();
            } elseif ($filters['status'] === 'inactive') {
                $query->inactive();
            }
        }

        // Apply date range filter if provided
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->whereBetween('created_at', [$filters['start_date'], $filters['end_date']]);
        }

        // Load the specified relations if provided
        if (!empty($relations)) {
            $query->with($relations);
        }

        // Apply sorting if specified
        if (isset($filters['sort_by']) && isset($filters['sort_order'])) {
            $query->orderBy($filters['sort_by'], $filters['sort_order']);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        // Paginate the results with the specified per page and page number
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Create a new user with profile and optional roles
     *
     * @param array $data
     * @return User Created user instance
     */
    public function createUser(array $data): User
    {
        // Begin database transaction
        DB::beginTransaction();

        try {
            // Create new User record with email and hashed password
            $user = User::create([
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            // Create UserProfile record with personal information
            $profileData = collect($data)->only([
                'first_name', 'last_name', 'date_of_birth', 'phone_number',
                'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'
            ])->toArray();

            $user->profile()->create($profileData);

            // Assign default roles if specified
            if (isset($data['roles']) && is_array($data['roles'])) {
                $user->syncRoles($data['roles']);
            }

            // Log user creation via AuditService
            $this->auditService->logCreate('user', $user->id, $user->toArray());

            // Commit transaction
            DB::commit();

            // Send welcome notification via NotificationService
            $this->notificationService->sendFromTemplate($user->id, 'user.welcome');

            // Return the created user instance
            return $user;
        } catch (Exception $e) {
            // Rollback transaction on error
            DB::rollback();
            throw $e;
        }
    }

    /**
     * Update an existing user
     *
     * @param int $id
     * @param array $data
     * @return ?User Updated user instance or null if not found
     */
    public function updateUser(int $id, array $data): ?User
    {
        // Get the user by ID
        $user = User::find($id);

        // Return null if user not found
        if (!$user) {
            return null;
        }

        // Begin database transaction
        DB::beginTransaction();

        try {
            // Store old values for auditing
            $oldValues = $user->toArray();

            // Update user attributes from data
            $user->fill(collect($data)->only([
                'email', 'is_active'
            ])->toArray());

            // If a new password is provided, hash it
            if (isset($data['password'])) {
                $user->password = Hash::make($data['password']);
            }

            // Save the user model
            $user->save();

            // Log user update via AuditService
            $this->auditService->logUpdate('user', $user->id, $oldValues, $user->toArray());

            // Commit transaction
            DB::commit();

            // Return the updated user instance
            return $user;
        } catch (Exception $e) {
            // Rollback transaction on error
            DB::rollback();
            throw $e;
        }
    }

    /**
     * Delete a user
     *
     * @param int $id
     * @return bool True if successful, false if user not found
     */
    public function deleteUser(int $id): bool
    {
        // Get the user by ID
        $user = User::find($id);

        // Return false if user not found
        if (!$user) {
            return false;
        }

        // Begin database transaction
        DB::beginTransaction();

        try {
            // Store old values for auditing
            $oldValues = $user->toArray();

            // Delete the user's profile
            $user->profile()->delete();

            // Delete the user
            $user->delete();

            // Log user deletion via AuditService
            $this->auditService->logDelete('user', $user->id, $oldValues);

            // Commit transaction
            DB::commit();

            // Return true indicating successful deletion
            return true;
        } catch (Exception $e) {
            // Rollback transaction on error
            DB::rollback();
            throw $e;
        }
    }

    /**
     * Search for users by name, email, or other criteria
     *
     * @param string $searchTerm
     * @param array $filters
     * @param int $perPage
     * @param array $relations
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated search results
     */
    public function searchUsers(string $searchTerm, array $filters = [], int $perPage = 15, array $relations = []): LengthAwarePaginator
    {
        // Start with a base query for User model
        $query = User::query();

        // Apply search condition to email field
        $query->where('email', 'LIKE', '%' . $searchTerm . '%');

        // Apply search condition to profile's first_name and last_name fields
        $query->orWhereHas('profile', function ($q) use ($searchTerm) {
            $q->where('first_name', 'LIKE', '%' . $searchTerm . '%')
              ->orWhere('last_name', 'LIKE', '%' . $searchTerm . '%');
        });

        // Apply additional filters if provided
        if (isset($filters['role'])) {
            $query->withRole($filters['role']);
        }

        if (isset($filters['status'])) {
            if ($filters['status'] === 'active') {
                $query->active();
            } elseif ($filters['status'] === 'inactive') {
                $query->inactive();
            }
        }

        // Load the specified relations if provided
        if (!empty($relations)) {
            $query->with($relations);
        }

        // Paginate the results with the specified per page
        return $query->paginate($perPage);
    }

    /**
     * Update a user's profile information
     *
     * @param int $userId
     * @param array $profileData
     * @return ?UserProfile Updated profile instance or null if user not found
     */
    public function updateProfile(int $userId, array $profileData): ?UserProfile
    {
        // Get the user by ID with profile relation
        $user = User::with('profile')->find($userId);

        // Return null if user not found
        if (!$user) {
            return null;
        }

        // Begin database transaction
        DB::beginTransaction();

        try {
            // Store old values for auditing
            $oldValues = $user->profile->toArray();

            // Update profile attributes from profileData
            $user->profile->fill(collect($profileData)->only([
                'first_name', 'last_name', 'date_of_birth', 'phone_number',
                'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'
            ])->toArray());

            // Save the profile model
            $user->profile->save();

            // Log profile update via AuditService
            $this->auditService->logUpdate('user_profile', $user->profile->id, $oldValues, $user->profile->toArray());

            // Commit transaction
            DB::commit();

            // Return the updated profile instance
            return $user->profile;
        } catch (Exception $e) {
            // Rollback transaction on error
            DB::rollback();
            throw $e;
        }
    }

    /**
     * Assign a role to a user
     *
     * @param int $userId
     * @param string|int|Role $role
     * @return ?User Updated user instance or null if user not found
     */
    public function assignRoleToUser(int $userId, string|int|Role $role): ?User
    {
        // Get the user by ID
        $user = User::find($userId);

        // Return null if user not found
        if (!$user) {
            return null;
        }

        // Store old roles for auditing
        $oldRoles = $user->roles->pluck('name')->toArray();

        // If role is a string, find the role by name
        if (is_string($role)) {
            $role = Role::findByName($role);
        } elseif (is_numeric($role)) {
            $role = Role::find($role);
        }

        // If role is not found, return the user
        if (!$role) {
            return $user;
        }

        // Call assignRole method on the user model
        $user->assignRole($role);

        // Log role assignment via AuditService
        $newRoles = $user->roles->pluck('name')->toArray();
        $this->auditService->logRoleChange($user, $oldRoles, $newRoles);

        // Return the updated user instance
        return $user;
    }

    /**
     * Remove a role from a user
     *
     * @param int $userId
     * @param string|int|Role $role
     * @return ?User Updated user instance or null if user not found
     */
    public function removeRoleFromUser(int $userId, string|int|Role $role): ?User
    {
        // Get the user by ID
        $user = User::find($userId);

        // Return null if user not found
        if (!$user) {
            return null;
        }

        // Store old roles for auditing
        $oldRoles = $user->roles->pluck('name')->toArray();

        // If role is a string, find the role by name
        if (is_string($role)) {
            $role = Role::findByName($role);
        } elseif (is_numeric($role)) {
            $role = Role::find($role);
        }

        // If role is not found, return the user
        if (!$role) {
            return $user;
        }

        // Call removeRole method on the user model
        $user->removeRole($role);

        // Log role removal via AuditService
        $newRoles = $user->roles->pluck('name')->toArray();
        $this->auditService->logRoleChange($user, $oldRoles, $newRoles);

        // Return the updated user instance
        return $user;
    }

    /**
     * Sync a user's roles with the provided roles
     *
     * @param int $userId
     * @param array $roles
     * @return ?User Updated user instance or null if user not found
     */
    public function syncUserRoles(int $userId, array $roles): ?User
    {
        // Get the user by ID with roles relation
        $user = User::with('roles')->find($userId);

        // Return null if user not found
        if (!$user) {
            return null;
        }

        // Store old roles for auditing
        $oldRoles = $user->roles->pluck('name')->toArray();

        // Process the roles array to ensure all items are role IDs
        $roleIds = [];
        foreach ($roles as $role) {
            if (is_string($role)) {
                $role = Role::findByName($role);
                if ($role) {
                    $roleIds[] = $role->id;
                }
            } elseif (is_numeric($role)) {
                $roleIds[] = $role;
            } elseif ($role instanceof Role) {
                $roleIds[] = $role->id;
            }
        }

        // Call syncRoles method on the user model
        $user->syncRoles($roleIds);

        // Log role sync via AuditService
        $newRoles = $user->roles->pluck('name')->toArray();
        $this->auditService->logRoleChange($user, $oldRoles, $newRoles);

        // Return the updated user instance
        return $user;
    }

    /**
     * Activate a user account
     *
     * @param int $userId
     * @return ?User Updated user instance or null if user not found
     */
    public function activateUser(int $userId): ?User
    {
        // Get the user by ID
        $user = User::find($userId);

        // Return null if user not found
        if (!$user) {
            return null;
        }

        // Call activate method on the user model
        $user->activate();

        // Log account activation via AuditService
        $this->auditService->log('activate', 'user', $user->id);

        // Send account activation notification via NotificationService
        $this->notificationService->sendFromTemplate($user->id, 'user.activated');

        // Return the updated user instance
        return $user;
    }

    /**
     * Deactivate a user account
     *
     * @param int $userId
     * @return ?User Updated user instance or null if user not found
     */
    public function deactivateUser(int $userId): ?User
    {
        // Get the user by ID
        $user = User::find($userId);

        // Return null if user not found
        if (!$user) {
            return null;
        }

        // Call deactivate method on the user model
        $user->deactivate();

        // Log account deactivation via AuditService
        $this->auditService->log('deactivate', 'user', $user->id);

        // Send account deactivation notification via NotificationService
        $this->notificationService->sendFromTemplate($user->id, 'user.deactivated');

        // Return the updated user instance
        return $user;
    }

    /**
     * Get all permissions assigned to a user through their roles
     *
     * @param int $userId
     * @return ?\Illuminate\Support\Collection Collection of permissions or null if user not found
     */
    public function getUserPermissions(int $userId): ?Collection
    {
        // Get the user by ID with roles relation
        $user = User::with('roles')->find($userId);

        // Return null if user not found
        if (!$user) {
            return null;
        }

        // Call getAllPermissions method on the user model
        $permissions = $user->getAllPermissions();

        // Return the collection of permissions
        return $permissions;
    }

    /**
     * Update a user's notification preferences
     *
     * @param int $userId
     * @param array $preferences
     * @return bool True if successful, false if user not found
     */
    public function updateNotificationPreferences(int $userId, array $preferences): bool
    {
        // Get the user by ID
        $user = User::find($userId);

        // Return false if user not found
        if (!$user) {
            return false;
        }

        // Call updateUserPreferences method on NotificationService
        $success = $this->notificationService->updateUserPreferences($userId, $preferences);

        // Log preference update via AuditService
        $this->auditService->log('update_notification_preferences', 'user', $userId, null, $preferences);

        // Return true indicating successful update
        return $success;
    }

    /**
     * Create multiple users in bulk
     *
     * @param array $usersData
     * @return array Array with successful creations and errors
     */
    public function bulkCreateUsers(array $usersData): array
    {
        // Initialize results arrays for successful and failed creations
        $success = [];
        $errors = [];

        // Loop through each user data entry
        foreach ($usersData as $data) {
            try {
                // Try to create each user using createUser method
                $user = $this->createUser($data);

                // Add successful creations to success array
                $success[] = $user;
            } catch (Exception $e) {
                // Catch and log exceptions, add failures to errors array
                Log::error('Bulk user creation failed', [
                    'data' => $data,
                    'error' => $e->getMessage()
                ]);
                $errors[] = [
                    'data' => $data,
                    'error' => $e->getMessage()
                ];
            }
        }

        // Return array with successful and failed creations
        return [
            'success' => $success,
            'errors' => $errors
        ];
    }

    /**
     * Update multiple users in bulk
     *
     * @param array $usersData
     * @return array Array with successful updates and errors
     */
    public function bulkUpdateUsers(array $usersData): array
    {
        // Initialize results arrays for successful and failed updates
        $success = [];
        $errors = [];

        // Loop through each user data entry
        foreach ($usersData as $data) {
            try {
                // Try to update each user using updateUser method
                $user = $this->updateUser($data['id'], $data);

                // Add successful updates to success array
                if ($user) {
                    $success[] = $user;
                } else {
                    $errors[] = [
                        'data' => $data,
                        'error' => 'User not found'
                    ];
                }
            } catch (Exception $e) {
                // Catch and log exceptions, add failures to errors array
                Log::error('Bulk user update failed', [
                    'data' => $data,
                    'error' => $e->getMessage()
                ]);
                $errors[] = [
                    'data' => $data,
                    'error' => $e->getMessage()
                ];
            }
        }

        // Return array with successful and failed updates
        return [
            'success' => $success,
            'errors' => $errors
        ];
    }

    /**
     * Delete multiple users in bulk
     *
     * @param array $userIds
     * @return array Array with successful deletions and errors
     */
    public function bulkDeleteUsers(array $userIds): array
    {
        // Initialize results arrays for successful and failed deletions
        $success = [];
        $errors = [];

        // Loop through each user ID
        foreach ($userIds as $userId) {
            try {
                // Try to delete each user using deleteUser method
                $deleted = $this->deleteUser($userId);

                // Add successful deletions to success array
                if ($deleted) {
                    $success[] = $userId;
                } else {
                    $errors[] = [
                        'user_id' => $userId,
                        'error' => 'User not found'
                    ];
                }
            } catch (Exception $e) {
                // Catch and log exceptions, add failures to errors array
                Log::error('Bulk user deletion failed', [
                    'user_id' => $userId,
                    'error' => $e->getMessage()
                ]);
                $errors[] = [
                    'user_id' => $userId,
                    'error' => $e->getMessage()
                ];
            }
        }

        // Return array with successful and failed deletions
        return [
            'success' => $success,
            'errors' => $errors
        ];
    }

    /**
     * Count users by role
     *
     * @return array Array of role names with user counts
     */
    public function countUsersByRole(): array
    {
        // Query the database to count users by role
        $roles = Role::all();
        $counts = [];

        foreach ($roles as $role) {
            $counts[$role->name] = $role->users()->count();
        }

        // Return array with role names as keys and counts as values
        return $counts;
    }

    /**
     * Count active and inactive users
     *
     * @return array Array with active and inactive user counts
     */
    public function countActiveInactiveUsers(): array
    {
        // Query the database to count active users
        $activeCount = User::active()->count();

        // Query the database to count inactive users
        $inactiveCount = User::inactive()->count();

        // Return array with active and inactive counts
        return [
            'active' => $activeCount,
            'inactive' => $inactiveCount
        ];
    }

    /**
     * Get users created between two dates
     *
     * @param string|Carbon $startDate
     * @param string|Carbon $endDate
     * @param int $perPage
     * @param array $relations
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated list of users
     */
    public function getUsersCreatedBetween(string|Carbon $startDate, string|Carbon $endDate, int $perPage = 15, array $relations = []): LengthAwarePaginator
    {
        // Convert string dates to Carbon instances if needed
        if (is_string($startDate)) {
            $startDate = Carbon::parse($startDate);
        }

        if (is_string($endDate)) {
            $endDate = Carbon::parse($endDate);
        }

        // Query users where created_at is between the start and end dates
        $query = User::whereBetween('created_at', [$startDate, $endDate]);

        // Load the specified relations if provided
        if (!empty($relations)) {
            $query->with($relations);
        }

        // Paginate the results with the specified per page
        return $query->paginate($perPage);
    }

    /**
     * Check if a user has permission to perform an action on a resource
     *
     * @param int $userId
     * @param string $action
     * @param string $resource
     * @return bool True if user has permission, false otherwise
     */
    public function checkUserHasPermission(int $userId, string $action, string $resource): bool
    {
        // Get the user by ID
        $user = User::find($userId);

        // Return false if user not found
        if (!$user) {
            return false;
        }

        // Call hasPermissionTo method on the user model with action and resource
        $hasPermission = $user->hasPermissionTo($action, $resource);

        // Return the result of the permission check
        return $hasPermission;
    }
}