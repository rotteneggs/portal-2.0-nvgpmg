<?php

namespace App\Listeners;

use App\Events\PaymentCompletedEvent; // Import the PaymentCompletedEvent class
use App\Services\PaymentService; // Import the PaymentService class
use App\Services\Integration\EmailService; // Import the EmailService class
use App\Services\AuditService; // Import the AuditService class
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0

/**
 * Listener that generates and sends payment receipts when payments are completed
 */
class GeneratePaymentReceiptListener
{
    /**
     * @var PaymentService
     */
    protected PaymentService $paymentService;

    /**
     * @var EmailService
     */
    protected EmailService $emailService;

    /**
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * Create a new listener instance with required services
     *
     * @param PaymentService $paymentService
     * @param EmailService $emailService
     * @param AuditService $auditService
     */
    public function __construct(PaymentService $paymentService, EmailService $emailService, AuditService $auditService)
    {
        // Assign the payment service to the protected property
        $this->paymentService = $paymentService;
        // Assign the email service to the protected property
        $this->emailService = $emailService;
        // Assign the audit service to the protected property
        $this->auditService = $auditService;
    }

    /**
     * Handle the payment completed event
     *
     * @param PaymentCompletedEvent $event
     * @return void No return value
     */
    public function handle(PaymentCompletedEvent $event): void
    {
        try {
            // Extract the payment from the event
            $payment = $event->payment;

            // Generate receipt data using the payment service
            $receiptData = $this->paymentService->generatePaymentReceipt($payment);

            // Generate a unique receipt number
            $receiptNumber = $this->generateReceiptNumber($payment->id);

            // Prepare email data with receipt information
            $emailData = $this->prepareReceiptEmailData($receiptData, $receiptNumber);

            // Get the user's email address from the payment's user relationship
            $userEmail = $payment->user->email;

            // Send the receipt email using the email service's sendFromTemplate method
            $this->emailService->sendFromTemplate(
                $userEmail,
                'payment.receipt',
                $emailData
            );

            // Log the receipt generation in the audit log
            $this->auditService->logActivity(
                'receipt_generated',
                'payment',
                $payment->id,
                ['receipt_number' => $receiptNumber],
                $payment->user
            );
        } catch (\Exception $e) {
            // Handle any exceptions that occur during the process
            // Log errors if they occur but don't rethrow to prevent disrupting other listeners
            Log::error('Failed to generate and send payment receipt', [
                'payment_id' => $event->payment->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Generate a unique receipt number
     *
     * @param int $paymentId
     * @return string Unique receipt number
     */
    protected function generateReceiptNumber(int $paymentId): string
    {
        // Generate a receipt prefix from configuration or use default 'RCPT'
        $receiptPrefix = Config::get('payment.receipt_prefix', 'RCPT');

        // Format the payment ID with leading zeros
        $formattedPaymentId = str_pad((string) $paymentId, 6, '0', STR_PAD_LEFT);

        // Add a timestamp component for uniqueness
        $timestamp = now()->format('YmdHis');

        // Combine the components to create a unique receipt number
        $receiptNumber = "{$receiptPrefix}-{$formattedPaymentId}-{$timestamp}";

        // Return the formatted receipt number
        return $receiptNumber;
    }

    /**
     * Prepare data for the receipt email template
     *
     * @param array $receiptData
     * @param string $receiptNumber
     * @return array Prepared email data
     */
    protected function prepareReceiptEmailData(array $receiptData, string $receiptNumber): array
    {
        // Extract user information from receipt data
        $userName = $receiptData['user_name'] ?? 'Guest';
        $userEmail = $receiptData['user_email'] ?? '';

        // Extract payment details from receipt data
        $paymentDate = $receiptData['payment_date'] ?? '';
        $paymentMethod = $receiptData['payment_method'] ?? 'Unknown';
        $amount = $receiptData['amount'] ?? '0.00';
        $transactionId = $receiptData['transaction_id'] ?? 'N/A';

        // Format the payment amount with currency symbol
        $formattedAmount = $amount;

        // Format the payment date in a readable format
        $formattedPaymentDate = $paymentDate;

        // Get institution information from configuration
        $institutionName = Config::get('app.name', 'Student Admissions');
        $institutionUrl = Config::get('app.url', 'https://example.com');

        // Generate URL for PDF receipt download if available
        $receiptDownloadUrl = '#'; // Replace with actual URL generation logic

        // Generate URL for the payment history in the student portal
        $paymentHistoryUrl = '#'; // Replace with actual URL generation logic

        // Combine all data into a structured array for the email template
        $emailData = [
            'receipt_number' => $receiptNumber,
            'user_name' => $userName,
            'user_email' => $userEmail,
            'payment_date' => $formattedPaymentDate,
            'payment_method' => $paymentMethod,
            'amount' => $formattedAmount,
            'transaction_id' => $transactionId,
            'institution_name' => $institutionName,
            'institution_url' => $institutionUrl,
            'receipt_download_url' => $receiptDownloadUrl,
            'payment_history_url' => $paymentHistoryUrl,
        ];

        // Return the prepared email data
        return $emailData;
    }
}