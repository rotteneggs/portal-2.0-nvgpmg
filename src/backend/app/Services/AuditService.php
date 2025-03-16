<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0

class AuditService
{
    /**
     * The current request instance.
     *
     * @var Request
     */
    protected Request $request;

    /**
     * Create a new AuditService instance.
     *
     * @param Request $request
     * @return void
     */
    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    /**
     * Log an audit event with the provided details.
     *
     * @param string $action
     * @param string $resourceType
     * @param int|string|null $resourceId
     * @param array|null $oldValues
     * @param array|null $newValues
     * @param User|null $user
     * @return AuditLog
     */
    public function log(
        string $action,
        string $resourceType,
        int|string|null $resourceId = null,
        array|null $oldValues = null,
        array|null $newValues = null,
        User|null $user = null
    ): AuditLog {
        // Determine the user ID from the provided user or the currently authenticated user
        $userId = $user ? $user->id : (Auth::id() ?? null);
        
        // Create a new AuditLog entry with the provided details
        $auditLog = new AuditLog([
            'user_id' => $userId,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $this->request->ip(),
            'user_agent' => $this->request->userAgent(),
        ]);
        
        $auditLog->save();
        
        // If the action is a security-related event, also log to the application log
        if (in_array($action, AuditLog::SECURITY_ACTIONS)) {
            Log::warning("Security event: {$action} on {$resourceType}" . 
                         ($resourceId ? " #{$resourceId}" : '') . 
                         ($userId ? " by user #{$userId}" : ''));
        }
        
        return $auditLog;
    }

    /**
     * Log a resource creation event.
     *
     * @param string $resourceType
     * @param int|string $resourceId
     * @param array $values
     * @param User|null $user
     * @return AuditLog
     */
    public function logCreate(
        string $resourceType,
        int|string $resourceId,
        array $values,
        User|null $user = null
    ): AuditLog {
        return $this->log('create', $resourceType, $resourceId, null, $values, $user);
    }

    /**
     * Log a resource update event.
     *
     * @param string $resourceType
     * @param int|string $resourceId
     * @param array $oldValues
     * @param array $newValues
     * @param User|null $user
     * @return AuditLog
     */
    public function logUpdate(
        string $resourceType,
        int|string $resourceId,
        array $oldValues,
        array $newValues,
        User|null $user = null
    ): AuditLog {
        return $this->log('update', $resourceType, $resourceId, $oldValues, $newValues, $user);
    }

    /**
     * Log a resource deletion event.
     *
     * @param string $resourceType
     * @param int|string $resourceId
     * @param array $values
     * @param User|null $user
     * @return AuditLog
     */
    public function logDelete(
        string $resourceType,
        int|string $resourceId,
        array $values,
        User|null $user = null
    ): AuditLog {
        return $this->log('delete', $resourceType, $resourceId, $values, null, $user);
    }

    /**
     * Log a user login event.
     *
     * @param User $user
     * @param bool $success
     * @param string|null $reason
     * @return AuditLog
     */
    public function logLogin(User $user, bool $success, string|null $reason = null): AuditLog {
        $action = $success ? 'login' : 'login_failed';
        $values = ['success' => $success];
        
        if ($reason) {
            $values['reason'] = $reason;
        }
        
        return $this->log($action, 'user', $user->id, null, $values, $user);
    }

    /**
     * Log a user logout event.
     *
     * @param User $user
     * @return AuditLog
     */
    public function logLogout(User $user): AuditLog {
        return $this->log('logout', 'user', $user->id, null, null, $user);
    }

    /**
     * Log a security-related event.
     *
     * @param string $event
     * @param array $details
     * @param User|null $user
     * @return AuditLog
     */
    public function logSecurityEvent(string $event, array $details, User|null $user = null): AuditLog {
        $details['event'] = $event;
        
        // Also log to the application log with warning level
        Log::warning("Security event: {$event}", $details);
        
        return $this->log('security_event', 'security', null, null, $details, $user);
    }

    /**
     * Log a permission change event.
     *
     * @param string $resourceType
     * @param int|string $resourceId
     * @param array $oldPermissions
     * @param array $newPermissions
     * @param User|null $user
     * @return AuditLog
     */
    public function logPermissionChange(
        string $resourceType,
        int|string $resourceId,
        array $oldPermissions,
        array $newPermissions,
        User|null $user = null
    ): AuditLog {
        return $this->log('permission_change', $resourceType, $resourceId, $oldPermissions, $newPermissions, $user);
    }

    /**
     * Log a role change event.
     *
     * @param User $targetUser
     * @param array $oldRoles
     * @param array $newRoles
     * @param User|null $user
     * @return AuditLog
     */
    public function logRoleChange(
        User $targetUser,
        array $oldRoles,
        array $newRoles,
        User|null $user = null
    ): AuditLog {
        return $this->log('role_change', 'user', $targetUser->id, $oldRoles, $newRoles, $user);
    }

    /**
     * Get audit logs with optional filtering.
     *
     * @param array $filters
     * @param int $perPage
     * @param int $page
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getAuditLogs(
        array $filters = [],
        int $perPage = 15,
        int $page = 1
    ): \Illuminate\Pagination\LengthAwarePaginator {
        // Start with a base query for AuditLog
        $query = AuditLog::query();
        
        // Apply user filter if provided
        if (isset($filters['user_id'])) {
            $query->byUser($filters['user_id']);
        }
        
        // Apply action filter if provided
        if (isset($filters['action'])) {
            $query->byAction($filters['action']);
        }
        
        // Apply resource type and ID filters if provided
        if (isset($filters['resource_type'])) {
            $resourceId = $filters['resource_id'] ?? null;
            $query->byResource($filters['resource_type'], $resourceId);
        }
        
        // Apply date range filter if provided
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->byDateRange($filters['start_date'], $filters['end_date']);
        }
        
        // Apply security events filter if specified
        if (isset($filters['security_events']) && $filters['security_events']) {
            $query->securityEvents();
        }
        
        // Order by created_at in descending order
        $query->orderBy('created_at', 'desc');
        
        // Paginate the results with the specified per page and page number
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get security-related audit logs with optional filtering.
     *
     * @param array $filters
     * @param int $perPage
     * @param int $page
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getSecurityEvents(
        array $filters = [],
        int $perPage = 15,
        int $page = 1
    ): \Illuminate\Pagination\LengthAwarePaginator {
        // Start with a base query for AuditLog
        $query = AuditLog::query();
        
        // Apply the securityEvents scope to filter for security-related events
        $query->securityEvents();
        
        // Apply user filter if provided
        if (isset($filters['user_id'])) {
            $query->byUser($filters['user_id']);
        }
        
        // Apply date range filter if provided
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->byDateRange($filters['start_date'], $filters['end_date']);
        }
        
        // Order by created_at in descending order
        $query->orderBy('created_at', 'desc');
        
        // Paginate the results with the specified per page and page number
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get audit logs for a specific user.
     *
     * @param User|int $user
     * @param array $filters
     * @param int $perPage
     * @param int $page
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getUserActivityLogs(
        User|int $user,
        array $filters = [],
        int $perPage = 15,
        int $page = 1
    ): \Illuminate\Pagination\LengthAwarePaginator {
        // Start with a base query for AuditLog
        $query = AuditLog::query();
        
        // Apply the byUser scope with the provided user
        $query->byUser($user);
        
        // Apply action filter if provided
        if (isset($filters['action'])) {
            $query->byAction($filters['action']);
        }
        
        // Apply resource type and ID filters if provided
        if (isset($filters['resource_type'])) {
            $resourceId = $filters['resource_id'] ?? null;
            $query->byResource($filters['resource_type'], $resourceId);
        }
        
        // Apply date range filter if provided
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->byDateRange($filters['start_date'], $filters['end_date']);
        }
        
        // Order by created_at in descending order
        $query->orderBy('created_at', 'desc');
        
        // Paginate the results with the specified per page and page number
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get audit logs for a specific resource.
     *
     * @param string $resourceType
     * @param int|string $resourceId
     * @param array $filters
     * @param int $perPage
     * @param int $page
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getResourceActivityLogs(
        string $resourceType,
        int|string $resourceId,
        array $filters = [],
        int $perPage = 15,
        int $page = 1
    ): \Illuminate\Pagination\LengthAwarePaginator {
        // Start with a base query for AuditLog
        $query = AuditLog::query();
        
        // Apply the byResource scope with the provided resource type and ID
        $query->byResource($resourceType, $resourceId);
        
        // Apply user filter if provided
        if (isset($filters['user_id'])) {
            $query->byUser($filters['user_id']);
        }
        
        // Apply action filter if provided
        if (isset($filters['action'])) {
            $query->byAction($filters['action']);
        }
        
        // Apply date range filter if provided
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->byDateRange($filters['start_date'], $filters['end_date']);
        }
        
        // Order by created_at in descending order
        $query->orderBy('created_at', 'desc');
        
        // Paginate the results with the specified per page and page number
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get audit logs for a specific action type.
     *
     * @param string $action
     * @param array $filters
     * @param int $perPage
     * @param int $page
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getActionActivityLogs(
        string $action,
        array $filters = [],
        int $perPage = 15,
        int $page = 1
    ): \Illuminate\Pagination\LengthAwarePaginator {
        // Start with a base query for AuditLog
        $query = AuditLog::query();
        
        // Apply the byAction scope with the provided action
        $query->byAction($action);
        
        // Apply user filter if provided
        if (isset($filters['user_id'])) {
            $query->byUser($filters['user_id']);
        }
        
        // Apply resource type and ID filters if provided
        if (isset($filters['resource_type'])) {
            $resourceId = $filters['resource_id'] ?? null;
            $query->byResource($filters['resource_type'], $resourceId);
        }
        
        // Apply date range filter if provided
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->byDateRange($filters['start_date'], $filters['end_date']);
        }
        
        // Order by created_at in descending order
        $query->orderBy('created_at', 'desc');
        
        // Paginate the results with the specified per page and page number
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get audit logs for a specific date range.
     *
     * @param string|Carbon $startDate
     * @param string|Carbon $endDate
     * @param array $filters
     * @param int $perPage
     * @param int $page
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getDateRangeActivityLogs(
        string|Carbon $startDate,
        string|Carbon $endDate,
        array $filters = [],
        int $perPage = 15,
        int $page = 1
    ): \Illuminate\Pagination\LengthAwarePaginator {
        // Start with a base query for AuditLog
        $query = AuditLog::query();
        
        // Apply the byDateRange scope with the provided start and end dates
        $query->byDateRange($startDate, $endDate);
        
        // Apply user filter if provided
        if (isset($filters['user_id'])) {
            $query->byUser($filters['user_id']);
        }
        
        // Apply action filter if provided
        if (isset($filters['action'])) {
            $query->byAction($filters['action']);
        }
        
        // Apply resource type and ID filters if provided
        if (isset($filters['resource_type'])) {
            $resourceId = $filters['resource_id'] ?? null;
            $query->byResource($filters['resource_type'], $resourceId);
        }
        
        // Order by created_at in descending order
        $query->orderBy('created_at', 'desc');
        
        // Paginate the results with the specified per page and page number
        return $query->paginate($perPage, ['*'], 'page', $page);
    }
}