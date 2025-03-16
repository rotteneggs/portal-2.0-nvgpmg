<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware; // illuminate/auth ^10.0
use Closure; // illuminate/support ^10.0
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Http\Response; // illuminate/http ^10.0
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Redis; // illuminate/support/facades ^10.0
use App\Services\AuthService; // Internal import: AuthService for authentication logic

class Authenticate extends Middleware
{
    /**
     * @var AuthService
     */
    protected AuthService $authService;

    /**
     * Create a new Authenticate middleware instance.
     *
     * @param AuthService $authService
     */
    public function __construct(AuthService $authService)
    {
        // Call parent constructor
        parent::__construct();

        // Store AuthService instance for later use
        $this->authService = $authService;
    }

    /**
     * Handle an incoming request and ensure the user is authenticated.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string|array  ...$guards
     * @return mixed
     */
    public function handle(Request $request, Closure $next, ...$guards)
    {
        // Check if the request has a bearer token
        $token = $request->bearerToken();

        if ($token) {
            // If token exists, validate it using AuthService::validateToken
            if ($this->authService->isTokenBlacklisted($token)) {
                // If token is invalid, return a 401 Unauthorized response
                return response()->json(['message' => 'Unauthorized - Invalid token'], 401);
            }
        }

        // Call parent::handle to perform standard Laravel authentication
        try {
            parent::handle($request, $next, ...$guards);
        } catch (\Illuminate\Auth\AuthenticationException $exception) {
            // If authentication fails, redirectTo method will be called
            return $this->unauthenticated($request, $guards);
        }

        // If authentication passes, proceed to the next middleware
        return $next($request);
    }

    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo(Request $request): ?string
    {
        // Check if the request expects JSON (API request)
        if ($request->expectsJson()) {
            // If it's an API request, return null to trigger a JSON error response
            return null;
        }

        // If it's a web request, return the login route path
        return route('login');
    }

    /**
     * Handle an unauthenticated user.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  array  $guards
     * @return \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
     */
    protected function unauthenticated(Request $request, array $guards)
    {
        // Check if the request expects JSON (API request)
        if ($request->expectsJson()) {
            // If it's an API request, return a JSON response with 401 status and error message
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // If it's a web request, redirect to the login page with a return URL
        return redirect()->guest(route('login'));
    }
}