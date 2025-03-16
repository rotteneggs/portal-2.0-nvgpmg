<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use App\Services\AuditService;
use App\Exceptions\ApplicationValidationException;
use App\Exceptions\DocumentProcessingException;
use App\Exceptions\IntegrationException;
use App\Exceptions\PaymentProcessingException;
use App\Exceptions\WorkflowException;
use Throwable;

class CustomExceptionHandler extends ExceptionHandler
{
    /**
     * The audit service instance.
     *
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [];

    /**
     * A list of exception types that should be logged as security events.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected array $securityExceptions = [];

    /**
     * Create a new exception handler instance.
     *
     * @param AuditService $auditService
     * @return void
     */
    public function __construct(AuditService $auditService)
    {
        parent::__construct();
        $this->auditService = $auditService;
        
        // Exceptions that should not be reported
        $this->dontReport = [
            AuthenticationException::class,
            AuthorizationException::class,
            ValidationException::class,
            ApplicationValidationException::class,
        ];
        
        // Inputs that should not be flashed to the session
        $this->dontFlash = [
            'password',
            'password_confirmation',
            'current_password',
            'new_password',
            'credit_card',
            'ssn',
            'mfa_code',
        ];
        
        // Security exceptions that should be logged
        $this->securityExceptions = [
            AuthenticationException::class,
            AuthorizationException::class,
            IntegrationException::class,
        ];
    }

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register(): void
    {
        // Register security exception logging
        $this->reportable(function (Throwable $e) {
            if ($this->isSecurityException($e)) {
                $this->auditService->logSecurityEvent(
                    'security_exception',
                    [
                        'exception_class' => get_class($e),
                        'message' => $e->getMessage(),
                    ]
                );
            }
        });

        // Register renderable callbacks for application-specific exceptions
        
        // Handle custom application exceptions
        $this->renderable(function (ApplicationValidationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return $e->render($request);
            }
        });
        
        $this->renderable(function (DocumentProcessingException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'success' => false,
                    'error' => [
                        'code' => $e->getErrorCode(),
                        'message' => $e->getMessage(),
                        'details' => $e->getDocumentContext(),
                    ]
                ], 422);
            }
        });
        
        $this->renderable(function (IntegrationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'success' => false,
                    'error' => [
                        'code' => $e->getErrorCode() ?? 'INTEGRATION_ERROR',
                        'message' => $e->getMessage(),
                        'details' => [
                            'integration_system' => $e->getIntegrationSystem(),
                            'integration_operation' => $e->getIntegrationOperation(),
                            'request_data' => $e->getRequestData(),
                            'response_data' => $e->getResponseData(),
                        ],
                    ]
                ], 500);
            }
        });
        
        $this->renderable(function (PaymentProcessingException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return $e->render($request);
            }
        });
        
        $this->renderable(function (WorkflowException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return $e->render($request);
            }
        });
        
        // Handle standard Laravel exceptions
        $this->renderable(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'success' => false,
                    'error' => [
                        'code' => 'AUTHENTICATION_FAILED',
                        'message' => 'Unauthenticated or token expired',
                    ]
                ], 401);
            }
        });
        
        $this->renderable(function (AuthorizationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'success' => false,
                    'error' => [
                        'code' => 'AUTHORIZATION_FAILED',
                        'message' => $e->getMessage() ?: 'You do not have permission to access this resource',
                    ]
                ], 403);
            }
        });
        
        $this->renderable(function (ValidationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'success' => false,
                    'error' => [
                        'code' => 'VALIDATION_ERROR',
                        'message' => 'The given data was invalid',
                        'details' => $e->errors(),
                    ]
                ], $e->status);
            }
        });
        
        $this->renderable(function (ModelNotFoundException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'success' => false,
                    'error' => [
                        'code' => 'RESOURCE_NOT_FOUND',
                        'message' => 'The requested resource was not found',
                    ]
                ], 404);
            }
        });
        
        $this->renderable(function (NotFoundHttpException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'success' => false,
                    'error' => [
                        'code' => 'ENDPOINT_NOT_FOUND',
                        'message' => 'The requested endpoint does not exist',
                    ]
                ], 404);
            }
        });
        
        $this->renderable(function (MethodNotAllowedHttpException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'success' => false,
                    'error' => [
                        'code' => 'METHOD_NOT_ALLOWED',
                        'message' => 'The HTTP method used is not supported for this endpoint',
                    ]
                ], 405);
            }
        });
        
        $this->renderable(function (HttpException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'success' => false,
                    'error' => [
                        'code' => 'HTTP_ERROR',
                        'message' => $e->getMessage(),
                    ]
                ], $e->getStatusCode());
            }
        });
        
        // Catch-all for other exceptions in API requests
        $this->renderable(function (Throwable $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return $this->prepareJsonResponse($request, $e);
            }
        });
    }

    /**
     * Report or log an exception.
     *
     * @param  \Throwable  $exception
     * @return void
     *
     * @throws \Exception
     */
    public function report(Throwable $exception): void
    {
        if ($this->isSecurityException($exception)) {
            $this->auditService->logSecurityEvent(
                'security_exception',
                [
                    'exception_class' => get_class($exception),
                    'message' => $exception->getMessage(),
                    'trace' => $exception->getTraceAsString(),
                ]
            );
        }
        
        parent::report($exception);
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $exception
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws \Throwable
     */
    public function render($request, Throwable $exception)
    {
        return parent::render($request, $exception);
    }

    /**
     * Prepare a JSON response for the given exception.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $exception
     * @return \Illuminate\Http\JsonResponse
     */
    protected function prepareJsonResponse($request, Throwable $exception): JsonResponse
    {
        $statusCode = $this->getExceptionStatusCode($exception);
        
        $error = [
            'success' => false,
            'error' => [
                'code' => $this->getExceptionCode($exception),
                'message' => $this->isHttpException($exception) 
                    ? $exception->getMessage() 
                    : 'Server Error',
            ]
        ];
        
        // Only show detailed exception message in non-production environments
        if (!app()->environment('production') && !$this->isHttpException($exception)) {
            $error['error']['message'] = $exception->getMessage();
        }
        
        $details = $this->getExceptionDetails($exception);
        if (!empty($details)) {
            $error['error']['details'] = $details;
        }
        
        return new JsonResponse($error, $statusCode);
    }

    /**
     * Determine if the exception is security-related.
     *
     * @param  \Throwable  $exception
     * @return bool
     */
    protected function isSecurityException(Throwable $exception): bool
    {
        foreach ($this->securityExceptions as $securityException) {
            if ($exception instanceof $securityException) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get a standardized error code for the exception.
     *
     * @param  \Throwable  $exception
     * @return string
     */
    protected function getExceptionCode(Throwable $exception): string
    {
        // For exceptions that define their own error code
        if (method_exists($exception, 'getErrorCode')) {
            return $exception->getErrorCode();
        }
        
        // Map common exception types to error codes
        $errorCodes = [
            AuthenticationException::class => 'AUTHENTICATION_FAILED',
            AuthorizationException::class => 'AUTHORIZATION_FAILED',
            ValidationException::class => 'VALIDATION_ERROR',
            ModelNotFoundException::class => 'RESOURCE_NOT_FOUND',
            NotFoundHttpException::class => 'ENDPOINT_NOT_FOUND',
            MethodNotAllowedHttpException::class => 'METHOD_NOT_ALLOWED',
        ];
        
        foreach ($errorCodes as $class => $code) {
            if ($exception instanceof $class) {
                return $code;
            }
        }
        
        // Default error code
        return 'SERVER_ERROR';
    }

    /**
     * Get the HTTP status code for the exception.
     *
     * @param  \Throwable  $exception
     * @return int
     */
    protected function getExceptionStatusCode(Throwable $exception): int
    {
        // For exceptions that define their own status code
        if (method_exists($exception, 'getStatusCode')) {
            return $exception->getStatusCode();
        }
        
        // Map common exception types to status codes
        $statusCodes = [
            AuthenticationException::class => 401,
            AuthorizationException::class => 403,
            ValidationException::class => 422,
            ModelNotFoundException::class => 404,
            NotFoundHttpException::class => 404,
            MethodNotAllowedHttpException::class => 405,
            ApplicationValidationException::class => 422,
            DocumentProcessingException::class => 422,
            PaymentProcessingException::class => 422,
            WorkflowException::class => 400,
        ];
        
        foreach ($statusCodes as $class => $code) {
            if ($exception instanceof $class) {
                return $code;
            }
        }
        
        // If it's an HTTP exception, use its status code
        if ($exception instanceof HttpException) {
            return $exception->getStatusCode();
        }
        
        // Default status code for server errors
        return 500;
    }

    /**
     * Get additional details for the exception.
     *
     * @param  \Throwable  $exception
     * @return array|null
     */
    protected function getExceptionDetails(Throwable $exception): ?array
    {
        // Extract details from different exception types
        if ($exception instanceof ValidationException) {
            return $exception->errors();
        }
        
        if ($exception instanceof ApplicationValidationException) {
            return $exception->getErrors();
        }
        
        if ($exception instanceof DocumentProcessingException) {
            return $exception->getDocumentContext();
        }
        
        if ($exception instanceof IntegrationException) {
            return [
                'integration_system' => $exception->getIntegrationSystem(),
                'integration_operation' => $exception->getIntegrationOperation(),
                'request_data' => $exception->getRequestData(),
                'response_data' => $exception->getResponseData(),
            ];
        }
        
        if ($exception instanceof PaymentProcessingException) {
            return $exception->getPaymentContext();
        }
        
        if ($exception instanceof WorkflowException) {
            return $exception->getContext();
        }
        
        return null;
    }
}