<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Services\AuditService;

class CheckPermission
{
    /**
     * The audit service instance.
     *
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * Create a new CheckPermission middleware instance.
     *
     * @param  AuditService  $auditService
     * @return void
     */
    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Handle an incoming request and check if the user has the required permission.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  $action
     * @param  string  $resource
     * @return mixed
     */
    public function handle(Request $request, Closure $next, string $action, string $resource)
    {
        // Check if a user is authenticated
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'Authentication required.',
                ]
            ], 401);
        }

        $user = Auth::user();

        // Check if the user has the required permission
        if ($user->hasPermissionTo($action, $resource)) {
            return $next($request);
        }

        // Log the unauthorized access attempt
        $this->auditService->logSecurityEvent('permission_denied', [
            'action' => $action,
            'resource' => $resource,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ], $user);

        // Return a 403 Forbidden response
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'FORBIDDEN',
                'message' => 'You do not have permission to perform this action.',
                'details' => [
                    'action' => $action,
                    'resource' => $resource,
                ]
            ]
        ], 403);
    }
}