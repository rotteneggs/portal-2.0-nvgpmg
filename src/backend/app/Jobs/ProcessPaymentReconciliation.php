<?php

namespace App\Jobs;

use App\Events\PaymentCompletedEvent; // Event to dispatch when a payment is reconciled and confirmed as completed
use App\Exceptions\PaymentProcessingException; // Exception handling for payment reconciliation errors
use App\Models\Payment; // Access to the Payment model for retrieving and updating payment records
use App\Services\AuditService; // Service for logging payment reconciliation activities for audit purposes
use App\Services\Integration\PaymentGatewayService; // Service for interacting with payment gateway providers
use Illuminate\Bus\Queueable; // Laravel trait for queueable jobs
use Illuminate\Contracts\Queue\ShouldQueue; // Laravel interface for queueable jobs
use Illuminate\Foundation\Bus\Dispatchable; // Laravel trait for dispatching jobs
use Illuminate\Queue\InteractsWithQueue; // Laravel trait for interacting with the queue
use Illuminate\Queue\SerializesModels; // Laravel trait for serializing models in queued jobs
use Illuminate\Support\Facades\DB; // Laravel facade for database operations
use Illuminate\Support\Facades\Event; // Laravel facade for event dispatching
use Illuminate\Support\Facades\Log; // Laravel facade for logging
use Exception; // PHP exception handling

/**
 * Job class for reconciling payment transactions with payment gateway providers
 */
class ProcessPaymentReconciliation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 60;

    /**
     * The number of seconds after which the job's timeout.
     *
     * @var int
     */
    public $timeout = 300;

    /**
     * Options for the reconciliation process.
     *
     * @var array
     */
    public array $options;

    /**
     * Create a new job instance
     *
     * @param array $options
     * @return void
     */
    public function __construct(array $options = [])
    {
        // Set the options property with default values merged with provided options
        $this->options = array_merge([
            'payment_ids' => [],
            'start_date' => null,
            'end_date' => null,
            'payment_type' => null,
            'provider' => null,
        ], $options);

        // Set the timeout to 300 seconds (5 minutes)
        $this->timeout = 300;

        // Set the maximum number of tries to 3
        $this->tries = 3;

        // Set the backoff time to 60 seconds between retry attempts
        $this->backoff = 60;
    }

    /**
     * Execute the job to reconcile payment transactions
     *
     * @param PaymentService $paymentService
     * @param PaymentGatewayService $paymentGatewayService
     * @param AuditService $auditService
     * @return void No return value
     */
    public function handle(PaymentService $paymentService, PaymentGatewayService $paymentGatewayService, AuditService $auditService): void
    {
        // Set the service dependencies
        $this->paymentService = $paymentService;
        $this->paymentGatewayService = $paymentGatewayService;
        $this->auditService = $auditService;

        // Log the start of the reconciliation process
        Log::info('Payment reconciliation job started', ['options' => $this->options]);

        try {
            // Determine which payments need to be reconciled based on options
            $payments = $this->getPaymentsToReconcile();

            // Process stale payments that have been in that state for too long
            $staleResults = $this->processStalePayments();

            // Initialize an array to store reconciliation results
            $results = [];

            // Verify payment statuses with the payment gateway
            foreach ($payments as $payment) {
                try {
                    // Reconcile each payment and store the result
                    $results[] = $this->reconcilePayment($payment);
                } catch (Exception $e) {
                    // Log any exceptions during reconciliation
                    Log::error("Error reconciling payment {$payment->id}: " . $e->getMessage(), [
                        'payment_id' => $payment->id,
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }

            // Generate a report of the reconciliation process
            $report = $this->generateReconciliationReport($results);

            // Log the completion of the reconciliation process
            Log::info('Payment reconciliation job completed', ['report' => $report, 'stale_results' => $staleResults]);
        } catch (Exception $e) {
            // Handle exceptions by logging errors and releasing the job back to the queue if retries remain
            $this->failed($e);

            // Re-throw the exception to ensure the job is marked as failed
            throw $e;
        }
    }

    /**
     * Get the payments that need to be reconciled
     *
     * @return \Illuminate\Database\Eloquent\Collection Collection of payments to reconcile
     */
    public function getPaymentsToReconcile(): \Illuminate\Database\Eloquent\Collection
    {
        // Initialize a query for pending payments
        $query = Payment::pending();

        // If specific payment IDs are provided in options, filter by those IDs
        if (!empty($this->options['payment_ids'])) {
            $paymentIds = is_array($this->options['payment_ids']) ? $this->options['payment_ids'] : [$this->options['payment_ids']];
            $query->whereIn('id', $paymentIds);
        }

        // If a date range is provided, filter payments created within that range
        if ($this->options['start_date'] && $this->options['end_date']) {
            $query->byDateRange($this->options['start_date'], $this->options['end_date']);
        }

        // If a payment type is provided, filter by payment type
        if ($this->options['payment_type']) {
            $query->byType($this->options['payment_type']);
        }

        // If a provider is specified, filter by payment gateway provider
        if ($this->options['provider']) {
            // Assuming payment_data stores provider information
            $query->where('payment_method', $this->options['provider']);
        }

        // Filter for payments that have been pending for longer than the threshold (default 30 minutes)
        $thresholdMinutes = config('payment.reconciliation_threshold_minutes', 30);
        $thresholdTime = now()->subMinutes($thresholdMinutes);
        $query->where('created_at', '<=', $thresholdTime);

        // Return the collection of payments matching the criteria
        return $query->get();
    }

    /**
     * Reconcile a single payment with the payment gateway
     *
     * @param Payment $payment
     * @return array Reconciliation result
     */
    public function reconcilePayment(Payment $payment): array
    {
        // Extract payment data including gateway reference IDs
        $paymentData = $payment->getPaymentData();
        $provider = $payment->payment_method;

        // Determine the payment provider from payment data
        $provider = $provider ?? config('payment.default_provider', 'stripe');

        // Check the payment status with the payment gateway
        try {
            $paymentResult = $this->paymentGatewayService->processPayment($payment, $paymentData, $provider);

            // If the gateway shows the payment as completed, update local record to completed
            if ($paymentResult['status'] === 'completed') {
                DB::transaction(function () use ($payment, $paymentResult) {
                    $payment->markAsCompleted($paymentResult['transaction_id'], $paymentResult);
                    Event::dispatch(new PaymentCompletedEvent($payment));
                });

                // Log the change in the audit log
                $this->auditService->logUpdate('payment', $payment->id, $payment->toArray(), $payment->toArray());

                // Return the reconciliation result with action taken and updated status
                return [
                    'payment_id' => $payment->id,
                    'action' => 'completed',
                    'status' => 'completed',
                    'provider' => $provider,
                ];
            }

            // If the gateway shows the payment as failed, update local record to failed
            if ($paymentResult['status'] === 'failed') {
                $payment->markAsFailed(['error' => 'Payment failed at gateway']);

                // Log the change in the audit log
                $this->auditService->logUpdate('payment', $payment->id, $payment->toArray(), $payment->toArray());

                // Return the reconciliation result with action taken and updated status
                return [
                    'payment_id' => $payment->id,
                    'action' => 'failed',
                    'status' => 'failed',
                    'provider' => $provider,
                ];
            }

            // If the gateway shows the payment as pending but it's been too long, mark as failed with timeout reason
            $maxPendingHours = config('payment.max_pending_hours', 24);
            if ($payment->created_at->diffInHours(now()) > $maxPendingHours) {
                $payment->markAsFailed(['error' => 'Payment reconciliation timed out']);

                // Log the change in the audit log
                $this->auditService->logUpdate('payment', $payment->id, $payment->toArray(), $payment->toArray());

                // Return the reconciliation result with action taken and updated status
                return [
                    'payment_id' => $payment->id,
                    'action' => 'timeout',
                    'status' => 'failed',
                    'provider' => $provider,
                ];
            }
        } catch (PaymentProcessingException $e) {
            // Log the error and re-throw the exception
            Log::error("Payment reconciliation failed for payment {$payment->id}: " . $e->getMessage(), [
                'payment_id' => $payment->id,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }

        // Return the reconciliation result with no action taken
        return [
            'payment_id' => $payment->id,
            'action' => 'no_action',
            'status' => $payment->status,
            'provider' => $provider,
        ];
    }

    /**
     * Process payments that have been pending for too long
     *
     * @return array Processing results
     */
    public function processStalePayments(): array
    {
        // Get payments that have been pending for longer than the maximum allowed time (default 24 hours)
        $maxPendingHours = config('payment.max_pending_hours', 24);
        $stalePayments = Payment::pending()
            ->where('created_at', '<=', now()->subHours($maxPendingHours))
            ->get();

        // Initialize counters for processed payments
        $processedCount = 0;

        // For each stale payment, attempt to get a final status from the gateway
        foreach ($stalePayments as $payment) {
            try {
                // Attempt to reconcile the payment
                $this->reconcilePayment($payment);
                $processedCount++;
            } catch (Exception $e) {
                // If no definitive status can be determined, mark the payment as failed with a timeout reason
                $payment->markAsFailed(['error' => 'Payment reconciliation timed out']);

                // Log the stale payment handling in the audit log
                $this->auditService->logUpdate('payment', $payment->id, $payment->toArray(), $payment->toArray());

                Log::error("Stale payment reconciliation failed for payment {$payment->id}: " . $e->getMessage(), [
                    'payment_id' => $payment->id,
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        // Return the processing results with counts of handled payments
        return [
            'stale_payments_processed' => $processedCount,
        ];
    }

    /**
     * Generate a report of the reconciliation process
     *
     * @param array $results
     * @return array Reconciliation report
     */
    public function generateReconciliationReport(array $results): array
    {
        // Compile statistics from the reconciliation results
        $processedCount = count($results);
        $updatedCount = count(array_filter($results, function ($result) {
            return $result['action'] !== 'no_action';
        }));
        $completedCount = count(array_filter($results, function ($result) {
            return $result['status'] === 'completed';
        }));
        $failedCount = count(array_filter($results, function ($result) {
            return $result['status'] === 'failed';
        }));

        // Calculate the success rate and error rate
        $successRate = $processedCount > 0 ? ($completedCount / $processedCount) * 100 : 0;
        $errorRate = $processedCount > 0 ? ($failedCount / $processedCount) * 100 : 0;

        // Format the report with timestamps and summary information
        $report = [
            'timestamp' => now()->toDateTimeString(),
            'payments_processed' => $processedCount,
            'payments_updated' => $updatedCount,
            'payments_completed' => $completedCount,
            'payments_failed' => $failedCount,
            'success_rate' => number_format($successRate, 2) . '%',
            'error_rate' => number_format($errorRate, 2) . '%',
        ];

        // Return the formatted report
        return $report;
    }

    /**
     * Handle a job failure
     *
     * @param Exception $exception
     * @return void No return value
     */
    public function failed(Exception $exception): void
    {
        // Log the job failure with exception details
        Log::error('Payment reconciliation job failed: ' . $exception->getMessage(), [
            'options' => $this->options,
            'trace' => $exception->getTraceAsString(),
        ]);

        // If audit service is available, log the failure in the audit logs
        if (isset($this->auditService)) {
            $this->auditService->logSecurityEvent('payment_reconciliation_failed', [
                'options' => $this->options,
                'error' => $exception->getMessage(),
            ], null);
        }

        // Send notification to administrators about the reconciliation failure
        // This could be implemented using Laravel's notification system
        // or by directly sending an email/SMS to the admin users
    }
}