<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RolePermissionController extends Controller
{
    /**
     * The audit service instance.
     *
     * @var AuditService
     */
    protected $auditService;

    /**
     * Create a new controller instance.
     *
     * @param AuditService $auditService
     * @return void
     */
    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Get a list of all roles with their permissions.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        // Determine if system roles should be included based on query parameter
        $includeSystemRoles = $request->boolean('include_system_roles', true);
        
        // Query roles based on the system roles flag
        $roles = $includeSystemRoles 
            ? Role::with('permissions')->get() 
            : Role::customRoles()->with('permissions')->get();
            
        return response()->json([
            'success' => true,
            'data' => $roles,
            'meta' => [
                'include_system_roles' => $includeSystemRoles,
                'total' => $roles->count()
            ]
        ]);
    }

    /**
     * Create a new role with optional permissions.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        // Validate the request data
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name',
            'description' => 'nullable|string|max:255',
            'is_system_role' => 'boolean',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        try {
            // Begin database transaction
            DB::beginTransaction();
            
            // Create the new role
            $role = Role::findOrCreate(
                $validated['name'],
                $validated['description'] ?? null,
                $validated['is_system_role'] ?? false
            );
            
            // If permissions are provided, sync them with the role
            if (isset($validated['permissions'])) {
                $role->permissions()->sync($validated['permissions']);
            }
            
            // Commit the transaction
            DB::commit();
            
            // Load the permissions relationship
            $role->load('permissions');
            
            // Log role creation
            $this->auditService->logCreate(
                'role',
                $role->id,
                $role->toArray(),
                Auth::user()
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Role created successfully',
                'data' => $role
            ], Response::HTTP_CREATED);
            
        } catch (\Exception $e) {
            // Rollback transaction on error
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to create role',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get details of a specific role with its permissions.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        // Find the role by ID or return 404
        $role = Role::with('permissions')->find($id);
        
        if (!$role) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Role not found'
                ]
            ], Response::HTTP_NOT_FOUND);
        }
        
        return response()->json([
            'success' => true,
            'data' => $role
        ]);
    }

    /**
     * Update an existing role and its permissions.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        // Find the role by ID or return 404
        $role = Role::find($id);
        
        if (!$role) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Role not found'
                ]
            ], Response::HTTP_NOT_FOUND);
        }
        
        // Check if role is a system role and prevent updates if it is
        if ($role->is_system_role && !$request->boolean('force_update', false)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'System roles cannot be modified',
                    'details' => 'Use force_update=true to override this restriction (not recommended)'
                ]
            ], Response::HTTP_FORBIDDEN);
        }
        
        // Validate the request data
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100|unique:roles,name,' . $id,
            'description' => 'nullable|string|max:255',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        try {
            // Begin database transaction
            DB::beginTransaction();
            
            // Store original values for audit log
            $oldValues = $role->toArray();
            
            // Update role attributes
            if (isset($validated['name'])) {
                $role->name = $validated['name'];
            }
            
            if (array_key_exists('description', $validated)) {
                $role->description = $validated['description'];
            }
            
            // Save the role
            $role->save();
            
            // If permissions are provided, get old permissions for audit log
            if (isset($validated['permissions'])) {
                $role->load('permissions');
                $oldPermissions = $role->permissions->pluck('id')->toArray();
                
                // Sync new permissions with the role
                $role->permissions()->sync($validated['permissions']);
                
                // Log permission changes
                $this->auditService->logPermissionChange(
                    'role',
                    $role->id,
                    ['permissions' => $oldPermissions],
                    ['permissions' => $validated['permissions']],
                    Auth::user()
                );
            }
            
            // Commit the transaction
            DB::commit();
            
            // Reload the role with permissions
            $role->load('permissions');
            
            // Log role update
            $this->auditService->logUpdate(
                'role',
                $role->id,
                $oldValues,
                $role->toArray(),
                Auth::user()
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Role updated successfully',
                'data' => $role
            ]);
            
        } catch (\Exception $e) {
            // Rollback transaction on error
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to update role',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete a role if it's not a system role.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        // Find the role by ID or return 404
        $role = Role::find($id);
        
        if (!$role) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Role not found'
                ]
            ], Response::HTTP_NOT_FOUND);
        }
        
        // Check if role is a system role and prevent deletion if it is
        if ($role->is_system_role) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'System roles cannot be deleted'
                ]
            ], Response::HTTP_FORBIDDEN);
        }
        
        try {
            // Begin database transaction
            DB::beginTransaction();
            
            // Store role data for audit log
            $roleData = $role->toArray();
            
            // Delete the role (this will also delete the pivot records)
            $role->delete();
            
            // Commit the transaction
            DB::commit();
            
            // Log role deletion
            $this->auditService->logDelete(
                'role',
                $id,
                $roleData,
                Auth::user()
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Role deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            // Rollback transaction on error
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to delete role',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get a list of all permissions.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function permissions(Request $request)
    {
        $query = Permission::query();
        
        // Filter by resource if provided
        if ($request->has('resource')) {
            $query->forResource($request->resource);
        }
        
        // Filter by action if provided
        if ($request->has('action')) {
            $query->forAction($request->action);
        }
        
        // Execute the query
        $permissions = $query->get();
        
        return response()->json([
            'success' => true,
            'data' => $permissions,
            'meta' => [
                'total' => $permissions->count()
            ]
        ]);
    }

    /**
     * Create a new permission.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storePermission(Request $request)
    {
        // Validate the request data
        $validated = $request->validate([
            'resource' => 'required|string|max:100',
            'action' => 'required|string|max:100',
            'description' => 'nullable|string|max:255'
        ]);
        
        // Check if permission already exists
        $existingPermission = Permission::getByResourceAndAction(
            $validated['resource'],
            $validated['action']
        );
        
        if ($existingPermission) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Permission already exists',
                    'data' => $existingPermission
                ]
            ], Response::HTTP_CONFLICT);
        }
        
        try {
            // Create the new permission
            $permission = Permission::findOrCreateByResourceAndAction(
                $validated['resource'],
                $validated['action'],
                $validated['description'] ?? null
            );
            
            // Log permission creation
            $this->auditService->logCreate(
                'permission',
                $permission->id,
                $permission->toArray(),
                Auth::user()
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Permission created successfully',
                'data' => $permission
            ], Response::HTTP_CREATED);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to create permission',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update an existing permission.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updatePermission(Request $request, $id)
    {
        // Find the permission by ID or return 404
        $permission = Permission::find($id);
        
        if (!$permission) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Permission not found'
                ]
            ], Response::HTTP_NOT_FOUND);
        }
        
        // Validate the request data
        // Only allow updating description, as resource and action define the permission
        $validated = $request->validate([
            'description' => 'nullable|string|max:255'
        ]);
        
        try {
            // Store original values for audit log
            $oldValues = $permission->toArray();
            
            // Update permission description
            if (array_key_exists('description', $validated)) {
                $permission->description = $validated['description'];
                $permission->save();
            }
            
            // Log permission update
            $this->auditService->logUpdate(
                'permission',
                $permission->id,
                $oldValues,
                $permission->toArray(),
                Auth::user()
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Permission updated successfully',
                'data' => $permission
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to update permission',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete a permission if it's not in use.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroyPermission($id)
    {
        // Find the permission by ID or return 404
        $permission = Permission::with('roles')->find($id);
        
        if (!$permission) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Permission not found'
                ]
            ], Response::HTTP_NOT_FOUND);
        }
        
        // Check if permission is used by any roles
        if ($permission->roles->count() > 0) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Permission is in use by one or more roles and cannot be deleted',
                    'roles' => $permission->roles->pluck('name')
                ]
            ], Response::HTTP_CONFLICT);
        }
        
        try {
            // Store permission data for audit log
            $permissionData = $permission->toArray();
            
            // Delete the permission
            $permission->delete();
            
            // Log permission deletion
            $this->auditService->logDelete(
                'permission',
                $id,
                $permissionData,
                Auth::user()
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Permission deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to delete permission',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Assign a role to a user.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function assignRoleToUser(Request $request)
    {
        // Validate the request data
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id'
        ]);
        
        try {
            // Find the user
            $user = User::findOrFail($validated['user_id']);
            
            // Find the role
            $role = Role::findOrFail($validated['role_id']);
            
            // Check if user already has the role
            if ($user->hasRole($role)) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'message' => 'User already has this role'
                    ]
                ], Response::HTTP_CONFLICT);
            }
            
            // Begin database transaction
            DB::beginTransaction();
            
            // Get current roles for audit log
            $user->load('roles');
            $oldRoles = $user->roles->pluck('id')->toArray();
            
            // Assign role to user
            $user->assignRole($role);
            
            // Reload roles
            $user->load('roles');
            $newRoles = $user->roles->pluck('id')->toArray();
            
            // Commit the transaction
            DB::commit();
            
            // Log role assignment
            $this->auditService->logRoleChange(
                $user,
                $oldRoles,
                $newRoles,
                Auth::user()
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Role assigned to user successfully',
                'data' => [
                    'user_id' => $user->id,
                    'role_id' => $role->id,
                    'roles' => $user->roles
                ]
            ]);
            
        } catch (\Exception $e) {
            // Rollback transaction on error
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to assign role to user',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove a role from a user.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function removeRoleFromUser(Request $request)
    {
        // Validate the request data
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id'
        ]);
        
        try {
            // Find the user
            $user = User::findOrFail($validated['user_id']);
            
            // Find the role
            $role = Role::findOrFail($validated['role_id']);
            
            // Check if user has the role
            if (!$user->hasRole($role)) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'message' => 'User does not have this role'
                    ]
                ], Response::HTTP_BAD_REQUEST);
            }
            
            // Begin database transaction
            DB::beginTransaction();
            
            // Get current roles for audit log
            $user->load('roles');
            $oldRoles = $user->roles->pluck('id')->toArray();
            
            // Remove role from user
            $user->removeRole($role);
            
            // Reload roles
            $user->load('roles');
            $newRoles = $user->roles->pluck('id')->toArray();
            
            // Commit the transaction
            DB::commit();
            
            // Log role removal
            $this->auditService->logRoleChange(
                $user,
                $oldRoles,
                $newRoles,
                Auth::user()
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Role removed from user successfully',
                'data' => [
                    'user_id' => $user->id,
                    'role_id' => $role->id,
                    'roles' => $user->roles
                ]
            ]);
            
        } catch (\Exception $e) {
            // Rollback transaction on error
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to remove role from user',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get all roles assigned to a user.
     *
     * @param int $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUserRoles($userId)
    {
        try {
            // Find the user
            $user = User::with('roles')->findOrFail($userId);
            
            return response()->json([
                'success' => true,
                'data' => $user->roles,
                'meta' => [
                    'user_id' => $user->id,
                    'total' => $user->roles->count()
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to get user roles',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Sync a user's roles with the provided role IDs.
     *
     * @param Request $request
     * @param int $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function syncUserRoles(Request $request, $userId)
    {
        // Validate the request data
        $validated = $request->validate([
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id'
        ]);
        
        try {
            // Find the user
            $user = User::with('roles')->findOrFail($userId);
            
            // Begin database transaction
            DB::beginTransaction();
            
            // Get current roles for audit log
            $oldRoles = $user->roles->pluck('id')->toArray();
            
            // Sync user's roles with the provided role IDs
            $user->syncRoles($validated['role_ids']);
            
            // Reload roles
            $user->load('roles');
            $newRoles = $user->roles->pluck('id')->toArray();
            
            // Commit the transaction
            DB::commit();
            
            // Log role changes
            $this->auditService->logRoleChange(
                $user,
                $oldRoles,
                $newRoles,
                Auth::user()
            );
            
            return response()->json([
                'success' => true,
                'message' => 'User roles synchronized successfully',
                'data' => $user->roles,
                'meta' => [
                    'user_id' => $user->id,
                    'total' => $user->roles->count()
                ]
            ]);
            
        } catch (\Exception $e) {
            // Rollback transaction on error
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => 'Failed to sync user roles',
                    'details' => $e->getMessage()
                ]
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}