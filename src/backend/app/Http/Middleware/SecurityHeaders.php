<?php

namespace App\Http\Middleware;

use Closure; // illuminate/support ^10.0
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Http\Response; // illuminate/http ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SecurityHeaders
{
    /**
     * The security headers array with their values.
     *
     * @var array
     */
    protected array $securityHeaders;

    /**
     * Create a new SecurityHeaders middleware instance.
     *
     * @return void
     */
    public function __construct()
    {
        // Initialize default security headers with recommended values
        $defaultHeaders = [
            // Prevents clickjacking by controlling whether the page can be embedded in frames
            'X-Frame-Options' => 'SAMEORIGIN',
            
            // Prevents MIME type sniffing which can lead to security vulnerabilities
            'X-Content-Type-Options' => 'nosniff',
            
            // Enables browser's built-in XSS filtering capabilities
            'X-XSS-Protection' => '1; mode=block',
            
            // Enforces secure connections to the server
            'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains',
            
            // Controls resources the browser is allowed to load for the page
            'Content-Security-Policy' => "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
            
            // Controls how much referrer information should be included with requests
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            
            // Controls which browser features and APIs can be used in the application
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
        ];

        // Merge with any custom headers from config
        $customHeaders = Config::get('security.headers', []);
        $this->securityHeaders = array_merge($defaultHeaders, $customHeaders);
    }

    /**
     * Handle an incoming request and add security headers to the response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if ($response instanceof SymfonyResponse) {
            return $this->addSecurityHeaders($response);
        }

        return $response;
    }

    /**
     * Add security headers to the response.
     *
     * @param  \Symfony\Component\HttpFoundation\Response  $response
     * @return \Symfony\Component\HttpFoundation\Response
     */
    protected function addSecurityHeaders(SymfonyResponse $response): SymfonyResponse
    {
        foreach ($this->getSecurityHeaders() as $headerName => $headerValue) {
            if (!$response->headers->has($headerName)) {
                $response->headers->set($headerName, $headerValue);
            }
        }

        return $response;
    }

    /**
     * Get the list of security headers to be applied.
     *
     * @return array
     */
    protected function getSecurityHeaders(): array
    {
        return $this->securityHeaders;
    }
}