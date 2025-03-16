<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Custom exception for handling application-specific validation errors.
 *
 * This exception is thrown when application data fails validation rules
 * that are not covered by Laravel's standard ValidationException.
 */
class ApplicationValidationException extends Exception
{
    /**
     * The array of validation errors.
     *
     * @var array
     */
    protected array $errors;

    /**
     * The HTTP status code for the response.
     *
     * @var int
     */
    protected int $statusCode;

    /**
     * The error code for identifying the error type.
     *
     * @var string
     */
    protected string $errorCode;

    /**
     * Create a new ApplicationValidationException instance.
     *
     * @param string $message The exception message
     * @param array $errors The validation errors
     * @param int $statusCode The HTTP status code (default: 422)
     * @param string $errorCode The error code (default: VALIDATION_ERROR)
     * @param Exception|null $previous The previous exception
     * @return void
     */
    public function __construct(
        string $message,
        array $errors = [],
        int $statusCode = 422,
        string $errorCode = 'VALIDATION_ERROR',
        Exception $previous = null
    ) {
        parent::__construct($message, 0, $previous);
        $this->errors = $errors;
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
    }

    /**
     * Get the validation errors.
     *
     * @return array Array of validation errors
     */
    public function getErrors(): array
    {
        return $this->errors;
    }

    /**
     * Get the HTTP status code.
     *
     * @return int HTTP status code
     */
    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * Get the error code.
     *
     * @return string Error code
     */
    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    /**
     * Render the exception as an HTTP response.
     *
     * Creates a standardized error response format with validation details.
     *
     * @param Request $request The incoming request
     * @return JsonResponse JSON response with error details
     */
    public function render(Request $request): JsonResponse
    {
        $response = [
            'success' => false,
            'error' => [
                'code' => $this->errorCode,
                'message' => $this->getMessage(),
                'details' => $this->errors
            ]
        ];

        return new JsonResponse($response, $this->statusCode);
    }
}