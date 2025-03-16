<?php

namespace App\Exceptions;

use App\Models\Integration;

class IntegrationException extends \Exception
{
    /**
     * The name of the integration system.
     *
     * @var string
     */
    protected string $integrationSystem;

    /**
     * The operation being performed when the error occurred.
     *
     * @var string
     */
    protected string $integrationOperation;

    /**
     * The request data that caused the error.
     *
     * @var array|null
     */
    protected ?array $requestData;

    /**
     * The response data received from the external system.
     *
     * @var array|null
     */
    protected ?array $responseData;

    /**
     * The error code from the external system.
     *
     * @var string|null
     */
    protected ?string $errorCode;

    /**
     * Create a new integration exception instance.
     *
     * @param  string  $message
     * @param  int  $code
     * @param  \Throwable|null  $previous
     * @param  string  $integrationSystem
     * @param  string  $integrationOperation
     * @param  array|null  $requestData
     * @param  array|null  $responseData
     * @param  string|null  $errorCode
     * @return void
     */
    public function __construct(
        string $message, 
        int $code = 0, 
        ?\Throwable $previous = null,
        string $integrationSystem = '',
        string $integrationOperation = '',
        ?array $requestData = null,
        ?array $responseData = null,
        ?string $errorCode = null
    ) {
        parent::__construct($message, $code, $previous);
        
        $this->integrationSystem = $integrationSystem;
        $this->integrationOperation = $integrationOperation;
        $this->requestData = $requestData;
        $this->responseData = $responseData;
        $this->errorCode = $errorCode;
    }

    /**
     * Create an exception from an API error response.
     *
     * @param  string  $message
     * @param  string  $integrationSystem
     * @param  string  $integrationOperation
     * @param  array  $requestData
     * @param  array  $responseData
     * @param  string  $errorCode
     * @param  int  $code
     * @param  \Throwable|null  $previous
     * @return static
     */
    public static function createFromApiError(
        string $message,
        string $integrationSystem,
        string $integrationOperation,
        array $requestData,
        array $responseData,
        string $errorCode = 'API_ERROR',
        int $code = 0,
        ?\Throwable $previous = null
    ): static {
        return new static(
            $message,
            $code,
            $previous,
            $integrationSystem,
            $integrationOperation,
            $requestData,
            $responseData,
            $errorCode
        );
    }

    /**
     * Create an exception from a connection error.
     *
     * @param  string  $message
     * @param  string  $integrationSystem
     * @param  string  $integrationOperation
     * @param  array|null  $requestData
     * @param  string  $errorCode
     * @param  int  $code
     * @param  \Throwable|null  $previous
     * @return static
     */
    public static function createFromConnectionError(
        string $message,
        string $integrationSystem,
        string $integrationOperation,
        ?array $requestData = null,
        string $errorCode = 'CONNECTION_ERROR',
        int $code = 0,
        ?\Throwable $previous = null
    ): static {
        return new static(
            $message,
            $code,
            $previous,
            $integrationSystem,
            $integrationOperation,
            $requestData,
            null, // No response data for connection errors
            $errorCode
        );
    }

    /**
     * Create an exception from an authentication error.
     *
     * @param  string  $message
     * @param  string  $integrationSystem
     * @param  string  $integrationOperation
     * @param  array|null  $requestData
     * @param  array|null  $responseData
     * @param  string  $errorCode
     * @param  int  $code
     * @param  \Throwable|null  $previous
     * @return static
     */
    public static function createFromAuthenticationError(
        string $message,
        string $integrationSystem,
        string $integrationOperation,
        ?array $requestData = null,
        ?array $responseData = null,
        string $errorCode = 'AUTHENTICATION_ERROR',
        int $code = 0,
        ?\Throwable $previous = null
    ): static {
        return new static(
            $message,
            $code,
            $previous,
            $integrationSystem,
            $integrationOperation,
            $requestData,
            $responseData,
            $errorCode
        );
    }

    /**
     * Create an exception from a configuration error.
     *
     * @param  string  $message
     * @param  string  $integrationSystem
     * @param  array|null  $configData
     * @param  string  $errorCode
     * @param  int  $code
     * @param  \Throwable|null  $previous
     * @return static
     */
    public static function createFromConfigurationError(
        string $message,
        string $integrationSystem,
        ?array $configData = null,
        string $errorCode = 'CONFIGURATION_ERROR',
        int $code = 0,
        ?\Throwable $previous = null
    ): static {
        return new static(
            $message,
            $code,
            $previous,
            $integrationSystem,
            'configuration',
            $configData,
            null,
            $errorCode
        );
    }

    /**
     * Create an exception from a data synchronization error.
     *
     * @param  string  $message
     * @param  string  $integrationSystem
     * @param  string  $entityType
     * @param  array|null  $entityData
     * @param  array|null  $responseData
     * @param  string  $errorCode
     * @param  int  $code
     * @param  \Throwable|null  $previous
     * @return static
     */
    public static function createFromDataSyncError(
        string $message,
        string $integrationSystem,
        string $entityType,
        ?array $entityData = null,
        ?array $responseData = null,
        string $errorCode = 'SYNC_ERROR',
        int $code = 0,
        ?\Throwable $previous = null
    ): static {
        return new static(
            $message,
            $code,
            $previous,
            $integrationSystem,
            'sync_' . $entityType,
            $entityData,
            $responseData,
            $errorCode
        );
    }

    /**
     * Create an exception from a rate limit error.
     *
     * @param  string  $message
     * @param  string  $integrationSystem
     * @param  string  $integrationOperation
     * @param  array|null  $responseData
     * @param  int  $retryAfter
     * @param  string  $errorCode
     * @param  int  $code
     * @param  \Throwable|null  $previous
     * @return static
     */
    public static function createFromRateLimitError(
        string $message,
        string $integrationSystem,
        string $integrationOperation,
        ?array $responseData = null,
        int $retryAfter = 0,
        string $errorCode = 'RATE_LIMIT_ERROR',
        int $code = 0,
        ?\Throwable $previous = null
    ): static {
        $responseData = $responseData ?? [];
        
        if ($retryAfter > 0) {
            $responseData['retry_after'] = $retryAfter;
        }
        
        return new static(
            $message,
            $code,
            $previous,
            $integrationSystem,
            $integrationOperation,
            null,
            $responseData,
            $errorCode
        );
    }

    /**
     * Get the integration system name.
     *
     * @return string
     */
    public function getIntegrationSystem(): string
    {
        return $this->integrationSystem;
    }

    /**
     * Get the integration operation being performed.
     *
     * @return string
     */
    public function getIntegrationOperation(): string
    {
        return $this->integrationOperation;
    }

    /**
     * Get the request data that caused the error.
     *
     * @return array|null
     */
    public function getRequestData(): ?array
    {
        return $this->requestData;
    }

    /**
     * Get the response data received from the external system.
     *
     * @return array|null
     */
    public function getResponseData(): ?array
    {
        return $this->responseData;
    }

    /**
     * Get the error code from the external system.
     *
     * @return string|null
     */
    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }

    /**
     * Determine if the exception represents an error that can be retried.
     *
     * @return bool
     */
    public function isRetryable(): bool
    {
        // Error codes that indicate temporary issues that can be retried
        $retryableErrorCodes = [
            'CONNECTION_ERROR',
            'TIMEOUT_ERROR',
            'SERVER_ERROR',
            'RATE_LIMIT_ERROR',
            'TEMPORARY_ERROR',
            'SERVICE_UNAVAILABLE'
        ];
        
        // Error codes that indicate permanent issues that should not be retried
        $nonRetryableErrorCodes = [
            'AUTHENTICATION_ERROR',
            'AUTHORIZATION_ERROR',
            'CONFIGURATION_ERROR',
            'VALIDATION_ERROR',
            'RESOURCE_NOT_FOUND',
            'NOT_IMPLEMENTED'
        ];
        
        // If the error code is explicitly in the retryable list, it can be retried
        if (in_array($this->errorCode, $retryableErrorCodes)) {
            return true;
        }
        
        // If the error code is explicitly in the non-retryable list, it cannot be retried
        if (in_array($this->errorCode, $nonRetryableErrorCodes)) {
            return false;
        }
        
        // For unknown error codes, assume they cannot be retried
        return false;
    }

    /**
     * Get the recommended delay before retrying the operation.
     *
     * @param  int  $attempt
     * @return int
     */
    public function getRetryDelay(int $attempt = 1): int
    {
        // For rate limit errors, use the retry_after value from response if available
        if ($this->errorCode === 'RATE_LIMIT_ERROR' && 
            is_array($this->responseData) && 
            isset($this->responseData['retry_after'])) {
            return (int) $this->responseData['retry_after'];
        }
        
        // Otherwise, calculate exponential backoff
        // Base delay of 2 seconds with exponential growth based on attempt number
        // Formula: 2^attempt seconds with a maximum of 300 seconds (5 minutes)
        $delay = min(pow(2, $attempt), 300);
        
        return $delay;
    }

    /**
     * Convert the exception to an array for logging or API responses.
     *
     * @return array
     */
    public function toArray(): array
    {
        $data = [
            'message' => $this->getMessage(),
            'code' => $this->getCode(),
            'integration_system' => $this->integrationSystem,
            'integration_operation' => $this->integrationOperation,
            'error_code' => $this->errorCode,
        ];
        
        // Add request and response data if available
        if ($this->requestData) {
            $data['request_data'] = $this->requestData;
        }
        
        if ($this->responseData) {
            $data['response_data'] = $this->responseData;
        }
        
        return $data;
    }
}