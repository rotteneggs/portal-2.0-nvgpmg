<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Custom exception class for handling payment processing errors in the Student Admissions Enrollment Platform.
 * 
 * This exception is thrown when payment operations fail due to issues such as
 * gateway errors, insufficient funds, invalid payment methods, or other
 * payment-related problems.
 */
class PaymentProcessingException extends Exception
{
    /**
     * The payment context information.
     *
     * @var array
     */
    protected array $paymentContext;

    /**
     * The HTTP status code.
     *
     * @var int
     */
    protected int $statusCode;

    /**
     * The error code.
     *
     * @var string
     */
    protected string $errorCode;

    /**
     * Create a new PaymentProcessingException instance.
     *
     * @param string         $message        The error message
     * @param array          $paymentContext The payment context information
     * @param int            $statusCode     The HTTP status code (default: 422)
     * @param string         $errorCode      The error code (default: PAYMENT_PROCESSING_ERROR)
     * @param Exception|null $previous       The previous exception
     *
     * @return void
     */
    public function __construct(
        string $message,
        array $paymentContext = [],
        int $statusCode = 422,
        string $errorCode = 'PAYMENT_PROCESSING_ERROR',
        Exception $previous = null
    ) {
        parent::__construct($message, 0, $previous);
        
        $this->paymentContext = $paymentContext;
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
    }

    /**
     * Get the payment context information.
     *
     * @return array The payment context information
     */
    public function getPaymentContext(): array
    {
        return $this->paymentContext;
    }

    /**
     * Get the HTTP status code.
     *
     * @return int The HTTP status code
     */
    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * Get the error code.
     *
     * @return string The error code
     */
    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    /**
     * Render the exception as an HTTP response.
     *
     * @param  Request  $request The HTTP request
     * @return JsonResponse      The JSON response with error details
     */
    public function render(Request $request): JsonResponse
    {
        $error = [
            'success' => false,
            'error' => [
                'code' => $this->errorCode,
                'message' => $this->getMessage(),
                'details' => $this->paymentContext,
            ]
        ];

        return new JsonResponse($error, $this->statusCode);
    }
}