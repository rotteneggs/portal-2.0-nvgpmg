<?php

namespace App\Services;

use App\Models\Payment; // Access to the Payment model for database operations
use App\Models\User; // Access to the User model for payment associations
use App\Models\Application; // Access to the Application model for payment associations
use App\Services\Integration\PaymentGatewayService; // Service for interacting with payment gateway providers
use App\Services\AuditService; // Service for logging payment activities for audit purposes
use App\Events\PaymentCompletedEvent; // Event dispatched when a payment is completed
use App\Exceptions\PaymentProcessingException; // Custom exception for payment processing errors
use Illuminate\Support\Facades\DB; // illuminate/support/facades ^10.0 - Laravel's database facade for transaction management
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0 - Laravel's logging facade for error and activity logging
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0 - Laravel's configuration facade for accessing payment configuration
use Illuminate\Support\Facades\Event; // illuminate/support/facades ^10.0 - Laravel's event facade for dispatching payment events
use Carbon\Carbon; // nesbot/carbon ^2.0 - Date and time manipulation library

/**
 * Service class for managing payment operations in the Student Admissions Enrollment Platform
 */
class PaymentService
{
    /**
     * @var PaymentGatewayService
     */
    protected PaymentGatewayService $paymentGatewayService;

    /**
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * Create a new payment service instance with dependencies
     *
     * @param PaymentGatewayService $paymentGatewayService
     * @param AuditService $auditService
     */
    public function __construct(PaymentGatewayService $paymentGatewayService, AuditService $auditService)
    {
        $this->paymentGatewayService = $paymentGatewayService;
        $this->auditService = $auditService;
    }

    /**
     * Create a new payment record in the database
     *
     * @param int $userId
     * @param string $paymentType
     * @param float $amount
     * @param string $paymentMethod
     * @param ?int $applicationId
     * @param ?array $paymentData
     * @return Payment The created payment record
     */
    public function createPayment(int $userId, string $paymentType, float $amount, string $paymentMethod, ?int $applicationId = null, ?array $paymentData = null): Payment
    {
        // Validate the payment type is supported
        $this->validatePaymentType($paymentType);

        // Validate the payment method is supported for the payment type
        $this->validatePaymentMethod($paymentMethod, $paymentType);

        // If applicationId is provided, verify it exists and belongs to the user
        if ($applicationId) {
            $application = Application::where('id', $applicationId)->where('user_id', $userId)->first();
            if (!$application) {
                throw new PaymentProcessingException(
                    "Application not found or does not belong to user",
                    ['application_id' => $applicationId, 'user_id' => $userId],
                    404,
                    'APPLICATION_NOT_FOUND'
                );
            }
        }

        // Create a new Payment record with the provided data
        $payment = new Payment();
        $payment->user_id = $userId;
        $payment->application_id = $applicationId;
        $payment->payment_type = $paymentType;
        $payment->amount = $amount;
        $payment->payment_method = $paymentMethod;

        // Set status to 'pending'
        $payment->status = 'pending';

        // Set currency from configuration (default to USD)
        $payment->currency = Config::get('app.currency', 'USD');

        // Set payment_data if provided
        if ($paymentData) {
            $payment->payment_data = $paymentData;
        }

        $payment->save();

        // Log the payment creation in the audit log
        $this->auditService->logCreate('payment', $payment->id, $payment->toArray(), User::find($userId));

        // Return the created payment record
        return $payment;
    }

    /**
     * Get a payment record by its ID
     *
     * @param int $id
     * @param ?int $userId
     * @return ?Payment The payment record if found, null otherwise
     */
    public function getPaymentById(int $id, ?int $userId = null): ?Payment
    {
        // Query the Payment model by ID
        $query = Payment::where('id', $id);

        // If userId is provided, add a where clause to ensure the payment belongs to the user
        if ($userId) {
            $query->where('user_id', $userId);
        }

        // Return the payment record if found, null otherwise
        return $query->first();
    }

    /**
     * Get payments for a specific user with optional filtering
     *
     * @param int $userId
     * @param ?array $filters
     * @param int $perPage
     * @param int $page
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated payment records
     */
    public function getUserPayments(int $userId, ?array $filters = [], int $perPage = 15, int $page = 1): \Illuminate\Pagination\LengthAwarePaginator
    {
        // Start a query for payments belonging to the specified user
        $query = Payment::where('user_id', $userId);

        // Apply filters if provided (payment_type, status, date range)
        if (isset($filters['payment_type'])) {
            $query->byType($filters['payment_type']);
        }
        if (isset($filters['status'])) {
            $query->byStatus($filters['status']);
        }
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->byDateRange($filters['start_date'], $filters['end_date']);
        }

        // Order by created_at in descending order (newest first)
        $query->orderBy('created_at', 'desc');

        // Paginate the results with the specified perPage and page parameters
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get payments associated with a specific application
     *
     * @param int $applicationId
     * @param ?int $userId
     * @return \Illuminate\Database\Eloquent\Collection Collection of payment records
     */
    public function getApplicationPayments(int $applicationId, ?int $userId = null): \Illuminate\Database\Eloquent\Collection
    {
        // Start a query for payments associated with the specified application
        $query = Payment::where('application_id', $applicationId);

        // If userId is provided, add a where clause to ensure the payments belong to the user
        if ($userId) {
            $query->where('user_id', $userId);
        }

        // Order by created_at in descending order (newest first)
        $query->orderBy('created_at', 'desc');

        // Return the collection of payment records
        return $query->get();
    }

    /**
     * Initialize a payment with the payment gateway
     *
     * @param Payment $payment
     * @param array $paymentData
     * @return array Payment initialization data (client secret, redirect URL, etc.)
     */
    public function initializePayment(Payment $payment, array $paymentData): array
    {
        // Validate the payment is in 'pending' status
        if (!$payment->isPending()) {
            throw new PaymentProcessingException(
                "Payment is not in pending status",
                ['payment_id' => $payment->id, 'status' => $payment->status],
                422,
                'INVALID_PAYMENT_STATUS'
            );
        }

        // Prepare payment data for the gateway

        // Call the payment gateway service to create a payment intent
        $paymentIntentData = $this->paymentGatewayService->createPaymentIntent($payment, $paymentData);

        // Update the payment record with any additional data from the gateway

        // Log the payment initialization in the audit log
        $this->auditService->logUpdate('payment', $payment->id, $payment->toArray(), array_merge($payment->toArray(), $paymentIntentData));

        // Return the payment initialization data for client-side processing
        return $paymentIntentData;
    }

    /**
     * Process a payment with the payment gateway
     *
     * @param Payment $payment
     * @param array $paymentData
     * @return array Payment processing result with transaction details
     */
    public function processPayment(Payment $payment, array $paymentData): array
    {
        // Validate the payment is in 'pending' status
        if (!$payment->isPending()) {
            throw new PaymentProcessingException(
                "Payment is not in pending status",
                ['payment_id' => $payment->id, 'status' => $payment->status],
                422,
                'INVALID_PAYMENT_STATUS'
            );
        }

        // Begin a database transaction
        DB::beginTransaction();

        try {
            // Try to process the payment with the payment gateway service
            $paymentResult = $this->paymentGatewayService->processPayment($payment, $paymentData);

            // If successful, update the payment status to 'completed'
            // Set the transaction ID and paid_at timestamp
            $payment->markAsCompleted($paymentResult['transaction_id'], $paymentResult);

            // Dispatch the PaymentCompletedEvent
            Event::dispatch(new PaymentCompletedEvent($payment));

            // Log the successful payment in the audit log
            $this->auditService->logUpdate('payment', $payment->id, $payment->toArray(), $payment->toArray());

            // Commit the transaction
            DB::commit();

            // Return the payment processing result with transaction details
            return $paymentResult;
        } catch (\Exception $e) {
            // Catch any exceptions, rollback the transaction, mark payment as failed, and rethrow or return error details
            DB::rollBack();
            $payment->markAsFailed(['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Process a refund for a completed payment
     *
     * @param Payment $payment
     * @param ?float $amount
     * @param ?string $reason
     * @return array Refund processing result with refund details
     */
    public function processRefund(Payment $payment, ?float $amount = null, ?string $reason = null): array
    {
        // Validate the payment is in 'completed' status and not already refunded
        if (!$payment->isCompleted()) {
            throw new PaymentProcessingException(
                "Payment is not in completed status",
                ['payment_id' => $payment->id, 'status' => $payment->status],
                422,
                'INVALID_PAYMENT_STATUS'
            );
        }

        if ($payment->isRefunded()) {
            throw new PaymentProcessingException(
                "Payment has already been refunded",
                ['payment_id' => $payment->id, 'status' => $payment->status],
                422,
                'ALREADY_REFUNDED'
            );
        }

        // Begin a database transaction
        DB::beginTransaction();

        try {
            // Try to process the refund with the payment gateway service
            $refundResult = $this->paymentGatewayService->processRefund($payment, $amount, $reason);

            // If successful, update the payment status to 'refunded'
            // Store refund details in the payment_data
            $payment->markAsRefunded($refundResult['refund_id'], $refundResult);

            // Log the refund in the audit log
            $this->auditService->logUpdate('payment', $payment->id, $payment->toArray(), $payment->toArray());

            // Commit the transaction
            DB::commit();

            // Return the refund processing result with refund details
            return $refundResult;
        } catch (\Exception $e) {
            // Catch any exceptions, rollback the transaction, and rethrow or return error details
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get available payment types from configuration
     *
     * @return array List of available payment types with their details
     */
    public function getPaymentTypes(): array
    {
        // Get payment types configuration from config files
        $paymentTypes = Config::get('payment.payment_types', []);

        // Format the payment types with their details (name, description, amount, etc.)
        $formattedPaymentTypes = [];
        foreach ($paymentTypes as $key => $paymentType) {
            $formattedPaymentTypes[$key] = [
                'name' => $paymentType['name'],
                'description' => $paymentType['description'],
                'amount' => $paymentType['amount'],
                'currency' => Config::get('app.currency', 'USD'),
            ];
        }

        // Return the list of available payment types
        return $formattedPaymentTypes;
    }

    /**
     * Get available payment methods for a specific payment type
     *
     * @param string $paymentType
     * @return array List of available payment methods for the payment type
     */
    public function getPaymentMethods(string $paymentType): array
    {
        // Validate the payment type is supported
        $this->validatePaymentType($paymentType);

        // Call the payment gateway service to get payment methods for the payment type
        return $this->paymentGatewayService->getPaymentMethods($paymentType);
    }

    /**
     * Validate that a payment type is supported
     *
     * @param string $paymentType
     * @return bool True if the payment type is valid, false otherwise
     */
    public function validatePaymentType(string $paymentType): bool
    {
        // Get payment types configuration from config files
        $paymentTypes = Config::get('payment.payment_types', []);

        // Check if the provided payment type exists in the configuration
        return isset($paymentTypes[$paymentType]);
    }

    /**
     * Validate that a payment method is supported for a payment type
     *
     * @param string $paymentMethod
     * @param string $paymentType
     * @return bool True if the payment method is valid for the payment type, false otherwise
     */
    public function validatePaymentMethod(string $paymentMethod, string $paymentType): bool
    {
        // Validate the payment type is supported
        $this->validatePaymentType($paymentType);

        // Get payment methods for the payment type from the payment gateway service
        $paymentMethods = $this->getPaymentMethods($paymentType);

        // Check if the provided payment method exists in the available methods
        return isset($paymentMethods[$paymentMethod]);
    }

    /**
     * Get configuration for a specific payment type
     *
     * @param string $paymentType
     * @return ?array Configuration for the payment type if found, null otherwise
     */
    public function getPaymentConfig(string $paymentType): ?array
    {
        // Get payment types configuration from config files
        $paymentTypes = Config::get('payment.payment_types', []);

        // Return the configuration for the specified payment type if found, null otherwise
        return $paymentTypes[$paymentType] ?? null;
    }

    /**
     * Generate a receipt for a completed payment
     *
     * @param Payment $payment
     * @return array Receipt data with payment details
     */
    public function generatePaymentReceipt(Payment $payment): array
    {
        // Validate the payment is in 'completed' status
        if (!$payment->isCompleted()) {
            throw new PaymentProcessingException(
                "Cannot generate receipt for non-completed payment",
                ['payment_id' => $payment->id, 'status' => $payment->status],
                422,
                'INVALID_PAYMENT_STATUS'
            );
        }

        // Load the payment with its relationships (user, application)
        $payment->load('user', 'application');

        // Generate a unique receipt number
        $receiptNumber = 'RCPT-' . strtoupper(uniqid());

        // Prepare receipt data with payment details (amount, date, payment method, etc.)
        $receiptData = [
            'receipt_number' => $receiptNumber,
            'payment_date' => $payment->paid_at->format('F d, Y h:i A'),
            'payment_method' => $payment->payment_method,
            'amount' => $payment->getFormattedAmount(),
            'transaction_id' => $payment->transaction_id,
        ];

        // Include user information and application details if applicable
        if ($payment->user) {
            $receiptData['user_name'] = $payment->user->getFullNameAttribute();
            $receiptData['user_email'] = $payment->user->email;
        }

        if ($payment->application) {
            $receiptData['application_type'] = $payment->application->application_type;
            $receiptData['academic_term'] = $payment->application->academic_term;
            $receiptData['academic_year'] = $payment->application->academic_year;
        }

        // Format dates and amounts for display

        // Return the complete receipt data
        return $receiptData;
    }

    /**
     * Handle webhook events from payment gateways
     *
     * @param string $payload
     * @param string $signature
     * @param string $provider
     * @return array Webhook handling result
     */
    public function handleWebhook(string $payload, string $signature, string $provider): array
    {
        // Validate the webhook signature with the payment gateway service
        if (!$this->paymentGatewayService->validateWebhook($payload, $signature, $provider)) {
            throw new PaymentProcessingException(
                "Invalid webhook signature",
                ['provider' => $provider, 'signature' => $signature],
                400,
                'INVALID_WEBHOOK_SIGNATURE'
            );
        }

        // Parse the webhook payload to determine the event type
        $eventType = $this->getWebhookEventType($payload, $provider);

        // Handle different event types (payment.succeeded, payment.failed, etc.)
        return $this->paymentGatewayService->handleWebhook($payload, $eventType, $provider);
    }

    /**
     * Get the webhook event type from the payload
     *
     * @param string $payload
     * @param string $provider
     * @return string
     */
    protected function getWebhookEventType(string $payload, string $provider): string
    {
        $event = json_decode($payload, true);

        switch ($provider) {
            case 'stripe':
                return $event['type'] ?? '';
            case 'paypal':
                return $event['event_type'] ?? '';
            default:
                return '';
        }
    }
}