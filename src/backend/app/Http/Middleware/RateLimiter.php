<?php

namespace App\Http\Middleware;

use App\Services\AuditService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\RateLimiter as LaravelRateLimiter;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class RateLimiter
{
    /**
     * The audit service instance.
     *
     * @var \App\Services\AuditService
     */
    protected AuditService $auditService;
    
    /**
     * Rate limiters configuration for different user types.
     *
     * @var array
     */
    protected array $limiters;
    
    /**
     * IP addresses that bypass rate limiting.
     *
     * @var array
     */
    protected array $bypassIps;
    
    /**
     * Create a new rate limiter middleware instance.
     *
     * @param \App\Services\AuditService $auditService
     * @return void
     */
    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
        
        // Initialize rate limiter configurations for different user types
        $this->limiters = [
            'admin' => [
                'maxAttempts' => 300, // 300 requests per minute for administrators
                'decayMinutes' => 1
            ],
            'staff' => [
                'maxAttempts' => 120, // 120 requests per minute for staff
                'decayMinutes' => 1
            ],
            'student' => [
                'maxAttempts' => 60, // 60 requests per minute for students/applicants
                'decayMinutes' => 1
            ],
            'public' => [
                'maxAttempts' => 30, // 30 requests per minute for unauthenticated users
                'decayMinutes' => 1
            ],
            'sensitive' => [
                'maxAttempts' => 20, // 20 requests per minute for sensitive endpoints
                'decayMinutes' => 1
            ],
            'payment' => [
                'maxAttempts' => 10, // 10 requests per minute for payment endpoints
                'decayMinutes' => 1
            ]
        ];
        
        // Define IP addresses that bypass rate limiting (internal systems)
        $this->bypassIps = [
            '127.0.0.1',  // localhost
            '::1',        // localhost IPv6
            // Add any other internal IPs that should bypass rate limiting
        ];
    }
    
    /**
     * Handle an incoming request and apply rate limiting.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string|null  $limiterName
     * @return mixed
     */
    public function handle(Request $request, Closure $next, string $limiterName = null)
    {
        // Determine the appropriate limiter to use based on user role and endpoint
        $limiter = $this->getLimiterForRequest($request, $limiterName);
        
        // Skip rate limiting for whitelisted IPs (internal systems)
        if ($this->shouldBypassRateLimiting($request)) {
            return $next($request);
        }
        
        // Generate a unique key for the rate limiter based on user ID or IP
        $key = $this->generateRateLimitKey($request);
        
        // Check if the request exceeds the rate limit
        $executed = LaravelRateLimiter::attempt(
            $key,
            $limiter['maxAttempts'],
            function() {
                return true;
            },
            $limiter['decayMinutes'] * 60
        );
        
        if (!$executed) {
            // Get remaining seconds until the rate limit resets
            $seconds = LaravelRateLimiter::availableIn($key);
            
            // Log rate limit exceeded event
            $this->auditService->logSecurityEvent(
                'rate_limit_exceeded',
                [
                    'ip_address' => $request->ip(),
                    'path' => $request->path(),
                    'user_id' => Auth::id(),
                    'key' => $key,
                    'available_in' => $seconds
                ]
            );
            
            // Return rate limit exceeded response
            return $this->buildRateLimitResponse($request, $seconds);
        }
        
        // Proceed to the next middleware
        $response = $next($request);
        
        // Add rate limit headers to the response
        if ($response instanceof Response) {
            $remainingAttempts = LaravelRateLimiter::remaining($key, $limiter['maxAttempts']);
            $availableIn = LaravelRateLimiter::availableIn($key);
            
            $response = $this->addRateLimitHeaders(
                $response,
                $limiter['maxAttempts'],
                $remainingAttempts,
                $availableIn
            );
        }
        
        return $response;
    }
    
    /**
     * Determine which rate limiter to use based on the request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string|null  $limiterName
     * @return array
     */
    protected function getLimiterForRequest(Request $request, string $limiterName = null): array
    {
        // If a specific limiter name is provided, use that configuration
        if ($limiterName && isset($this->limiters[$limiterName])) {
            return $this->limiters[$limiterName];
        }
        
        // Check for sensitive endpoints that require stricter rate limiting
        $path = $request->path();
        
        // For payments, document uploads, and other sensitive endpoints, use more restrictive limits
        if (Str::contains($path, ['payment', 'checkout', 'billing'])) {
            return $this->limiters['payment'];
        }
        
        if (Str::contains($path, ['document/upload', 'verify', 'password/reset'])) {
            return $this->limiters['sensitive'];
        }
        
        // For authenticated users, apply rate limits based on their role
        if (Auth::check()) {
            $user = Auth::user();
            
            if ($user->hasRole('administrator')) {
                return $this->limiters['admin'];
            }
            
            if ($user->hasRole('staff') || $user->hasRole('reviewer')) {
                return $this->limiters['staff'];
            }
            
            // Default for students/applicants
            return $this->limiters['student'];
        }
        
        // For unauthenticated users, use the public limiter
        return $this->limiters['public'];
    }
    
    /**
     * Generate a unique key for rate limiting.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string
     */
    protected function generateRateLimitKey(Request $request): string
    {
        // If user is authenticated, use 'user:{id}' as the key
        $userPart = Auth::id() ? 'user:' . Auth::id() : 'ip:' . $request->ip();
        // Append the request path to make the key specific to the endpoint
        $pathPart = 'path:' . Str::slug($request->path());
        
        return 'rate_limit:' . $userPart . ':' . $pathPart;
    }
    
    /**
     * Build a response for when rate limit is exceeded.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $availableIn
     * @return \Illuminate\Http\Response
     */
    protected function buildRateLimitResponse(Request $request, int $availableIn): Response
    {
        // Create a JSON response with error details
        $response = new Response([
            'success' => false,
            'error' => [
                'code' => 'RATE_LIMIT_EXCEEDED',
                'message' => 'Too many requests. Please try again later.',
                'details' => [
                    'retry_after' => $availableIn,
                ]
            ]
        ], 429);
        
        $resetTime = time() + $availableIn;
        
        // Set HTTP status code to 429 Too Many Requests
        return $response
            ->header('Retry-After', $availableIn)
            ->header('X-RateLimit-Reset', $resetTime);
    }
    
    /**
     * Add rate limit headers to the response.
     *
     * @param  \Illuminate\Http\Response  $response
     * @param  int  $maxAttempts
     * @param  int  $remainingAttempts
     * @param  int|null  $availableIn
     * @return \Illuminate\Http\Response
     */
    protected function addRateLimitHeaders(
        Response $response,
        int $maxAttempts,
        int $remainingAttempts,
        int $availableIn = null
    ): Response {
        // Add X-RateLimit-Limit header with maximum attempts
        $response->header('X-RateLimit-Limit', $maxAttempts);
        // Add X-RateLimit-Remaining header with remaining attempts
        $response->header('X-RateLimit-Remaining', $remainingAttempts);
        
        // If available, add X-RateLimit-Reset header with reset timestamp
        if (!is_null($availableIn)) {
            $response->header('X-RateLimit-Reset', time() + $availableIn);
        }
        
        return $response;
    }
    
    /**
     * Determine if the request should bypass rate limiting.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return bool
     */
    protected function shouldBypassRateLimiting(Request $request): bool
    {
        // Check if the request IP is in the bypass list
        if (in_array($request->ip(), $this->bypassIps)) {
            return true;
        }
        
        // Check if the request has a valid bypass token
        $bypassToken = $request->header('X-RateLimit-Bypass');
        if ($bypassToken && hash_equals(config('app.rate_limit_bypass_token', ''), $bypassToken)) {
            return true;
        }
        
        return false;
    }
}