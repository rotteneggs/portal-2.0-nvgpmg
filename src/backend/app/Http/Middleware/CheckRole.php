<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0
use Illuminate\Http\Response; // illuminate/http ^10.0
use App\Models\User;
use App\Services\AuditService;

class CheckRole
{
    /**
     * The AuditService instance.
     *
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * Create a new CheckRole middleware instance.
     *
     * @param AuditService $auditService
     * @return void
     */
    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Handle an incoming request and check if the user has any of the required roles.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string|array  $roles
     * @return mixed
     */
    public function handle(Request $request, \Closure $next, $roles)
    {
        // Check if user is authenticated
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Authentication required to access this resource.'
                ]
            ], 401);
        }

        // Get the authenticated user
        $user = Auth::user();

        // Convert roles to array if it's a string
        $roles = is_array($roles) ? $roles : explode('|', $roles);

        // Check if the user has any of the required roles
        foreach ($roles as $role) {
            if ($user->hasRole($role)) {
                return $next($request);
            }
        }

        // Log the failed access attempt
        $this->auditService->logSecurityEvent('role_access_denied', [
            'roles_required' => $roles,
            'resource' => $request->path(),
            'method' => $request->method(),
        ], $user);

        // Return forbidden response
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'FORBIDDEN',
                'message' => 'You do not have the required roles to access this resource.'
            ]
        ], 403);
    }
}