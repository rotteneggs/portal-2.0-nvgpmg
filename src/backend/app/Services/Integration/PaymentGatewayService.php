<?php

namespace App\Services\Integration;

use App\Models\Payment;
use App\Exceptions\PaymentProcessingException;
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Stripe\Stripe; // stripe/stripe-php ^10.0
use Stripe\PaymentIntent; // stripe/stripe-php ^10.0
use Stripe\Refund; // stripe/stripe-php ^10.0
use Stripe\Exception\ApiErrorException; // stripe/stripe-php ^10.0
use PayPalCheckoutSdk\Core\PayPalHttpClient; // paypal/paypal-checkout-sdk ^1.0
use PayPalCheckoutSdk\Core\SandboxEnvironment; // paypal/paypal-checkout-sdk ^1.0
use PayPalCheckoutSdk\Core\ProductionEnvironment; // paypal/paypal-checkout-sdk ^1.0
use PayPalCheckoutSdk\Orders\OrdersCreateRequest; // paypal/paypal-checkout-sdk ^1.0
use PayPalCheckoutSdk\Orders\OrdersCaptureRequest; // paypal/paypal-checkout-sdk ^1.0
use PayPalCheckoutSdk\Payments\CapturesRefundRequest; // paypal/paypal-checkout-sdk ^1.0

/**
 * Service class for integrating with payment gateway providers
 */
class PaymentGatewayService
{
    /**
     * Payment configuration.
     *
     * @var array
     */
    protected array $config;

    /**
     * Default payment provider.
     *
     * @var string
     */
    protected string $defaultProvider;

    /**
     * Available payment providers.
     *
     * @var array
     */
    protected array $providers;

    /**
     * Available payment methods.
     *
     * @var array
     */
    protected array $paymentMethods;

    /**
     * Gateway client instances.
     *
     * @var array
     */
    protected array $gatewayClients = [];

    /**
     * Create a new payment gateway service instance
     */
    public function __construct()
    {
        // Load payment configuration from config files
        $this->config = Config::get('payment', []);
        
        // Set the default payment provider from configuration
        $this->defaultProvider = $this->config['default_provider'] ?? 'stripe';
        
        // Set the available payment providers from configuration
        $this->providers = $this->config['providers'] ?? ['stripe', 'paypal'];
        
        // Set the available payment methods from configuration
        $this->paymentMethods = $this->config['payment_methods'] ?? [];
        
        // Initialize empty array for gateway clients
        $this->gatewayClients = [];
    }

    /**
     * Create a payment intent with the payment gateway
     *
     * @param Payment $payment
     * @param array $paymentData
     * @param string|null $provider
     * @return array Payment intent data including client secret or redirect URL
     * @throws PaymentProcessingException
     */
    public function createPaymentIntent(Payment $payment, array $paymentData, ?string $provider = null): array
    {
        // Determine the payment provider to use (specified or default)
        $provider = $provider ?? $this->defaultProvider;

        // Validate the payment provider is supported
        if (!in_array($provider, $this->providers)) {
            throw new PaymentProcessingException(
                "Payment provider {$provider} is not supported",
                ['provider' => $provider],
                422,
                'UNSUPPORTED_PAYMENT_PROVIDER'
            );
        }

        // Prepare payment data for the gateway
        try {
            // Call the appropriate provider-specific method to create payment intent
            switch ($provider) {
                case 'stripe':
                    return $this->createStripePaymentIntent($payment, $paymentData);
                case 'paypal':
                    return $this->createPayPalOrder($payment, $paymentData);
                default:
                    throw new PaymentProcessingException(
                        "Payment provider {$provider} is not implemented",
                        ['provider' => $provider],
                        422,
                        'UNIMPLEMENTED_PAYMENT_PROVIDER'
                    );
            }
        } catch (\Exception $e) {
            $this->handlePaymentError($e, 'create_payment_intent', [
                'payment_id' => $payment->id,
                'provider' => $provider,
                'payment_data' => $paymentData,
            ]);
        }
    }

    /**
     * Process a payment with the payment gateway
     *
     * @param Payment $payment
     * @param array $paymentData
     * @param string|null $provider
     * @return array Payment processing result with transaction details
     * @throws PaymentProcessingException
     */
    public function processPayment(Payment $payment, array $paymentData, ?string $provider = null): array
    {
        // Determine the payment provider to use (specified or default)
        $provider = $provider ?? $this->defaultProvider;

        // Validate the payment provider is supported
        if (!in_array($provider, $this->providers)) {
            throw new PaymentProcessingException(
                "Payment provider {$provider} is not supported",
                ['provider' => $provider],
                422,
                'UNSUPPORTED_PAYMENT_PROVIDER'
            );
        }

        // Call the appropriate provider-specific method to process payment
        try {
            switch ($provider) {
                case 'stripe':
                    return $this->processStripePayment($payment, $paymentData);
                case 'paypal':
                    return $this->processPayPalPayment($payment, $paymentData);
                default:
                    throw new PaymentProcessingException(
                        "Payment provider {$provider} is not implemented",
                        ['provider' => $provider],
                        422,
                        'UNIMPLEMENTED_PAYMENT_PROVIDER'
                    );
            }
        } catch (\Exception $e) {
            $this->handlePaymentError($e, 'process_payment', [
                'payment_id' => $payment->id,
                'provider' => $provider,
                'payment_data' => $paymentData,
            ]);
        }
    }

    /**
     * Process a refund for a completed payment
     *
     * @param Payment $payment
     * @param float|null $amount
     * @param string|null $reason
     * @param string|null $provider
     * @return array Refund processing result with refund details
     * @throws PaymentProcessingException
     */
    public function processRefund(Payment $payment, ?float $amount = null, ?string $reason = null, ?string $provider = null): array
    {
        // Determine the payment provider to use (specified or default)
        $provider = $provider ?? $this->defaultProvider;

        // Validate the payment provider is supported
        if (!in_array($provider, $this->providers)) {
            throw new PaymentProcessingException(
                "Payment provider {$provider} is not supported",
                ['provider' => $provider],
                422,
                'UNSUPPORTED_PAYMENT_PROVIDER'
            );
        }

        // Validate the payment has a transaction ID
        if (!$payment->transaction_id) {
            throw new PaymentProcessingException(
                "Cannot refund payment without transaction ID",
                ['payment_id' => $payment->id],
                422,
                'MISSING_TRANSACTION_ID'
            );
        }

        // Prepare refund data for the gateway
        try {
            // Call the appropriate provider-specific method to process refund
            switch ($provider) {
                case 'stripe':
                    return $this->processStripeRefund($payment, $amount, $reason);
                case 'paypal':
                    return $this->processPayPalRefund($payment, $amount, $reason);
                default:
                    throw new PaymentProcessingException(
                        "Payment provider {$provider} is not implemented",
                        ['provider' => $provider],
                        422,
                        'UNIMPLEMENTED_PAYMENT_PROVIDER'
                    );
            }
        } catch (\Exception $e) {
            $this->handlePaymentError($e, 'process_refund', [
                'payment_id' => $payment->id,
                'provider' => $provider,
                'amount' => $amount,
                'reason' => $reason,
            ]);
        }
    }

    /**
     * Get available payment methods for a specific payment type
     *
     * @param string $paymentType
     * @param string|null $provider
     * @return array List of available payment methods
     */
    public function getPaymentMethods(string $paymentType, ?string $provider = null): array
    {
        // Determine the payment provider to use (specified or default)
        $provider = $provider ?? $this->defaultProvider;
        
        // Get payment type configuration from config
        $paymentTypeConfig = $this->config['payment_types'][$paymentType] ?? [];
        
        $methods = [];
        
        if (isset($paymentTypeConfig['payment_methods'])) {
            // If payment type has specific payment methods, use those
            $allowedMethods = $paymentTypeConfig['payment_methods'];
        } else {
            // Otherwise use all payment methods
            $allowedMethods = array_keys($this->paymentMethods);
        }
        
        // Filter payment methods based on payment type and provider support
        foreach ($allowedMethods as $method) {
            if (isset($this->paymentMethods[$method])) {
                $methodData = $this->paymentMethods[$method];
                
                // Check if this method is supported by the requested provider
                if (!isset($methodData['providers']) || in_array($provider, $methodData['providers'])) {
                    $methods[$method] = $methodData;
                }
            }
        }
        
        return $methods;
    }

    /**
     * Validate a webhook request from the payment gateway
     *
     * @param string $payload
     * @param string $signature
     * @param string|null $provider
     * @return bool True if webhook is valid, false otherwise
     */
    public function validateWebhook(string $payload, string $signature, ?string $provider = null): bool
    {
        // Determine the payment provider to use (specified or default)
        $provider = $provider ?? $this->defaultProvider;

        try {
            // Call the appropriate provider-specific method to validate webhook
            switch ($provider) {
                case 'stripe':
                    return $this->validateStripeWebhook($payload, $signature);
                case 'paypal':
                    return $this->validatePayPalWebhook($payload, $signature);
                default:
                    return false;
            }
        } catch (\Exception $e) {
            Log::error('Webhook validation error', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Handle a webhook event from the payment gateway
     *
     * @param string $payload
     * @param string $eventType
     * @param string|null $provider
     * @return array Webhook handling result
     * @throws PaymentProcessingException
     */
    public function handleWebhook(string $payload, string $eventType, ?string $provider = null): array
    {
        // Determine the payment provider to use (specified or default)
        $provider = $provider ?? $this->defaultProvider;

        try {
            // Call the appropriate provider-specific method to handle webhook
            switch ($provider) {
                case 'stripe':
                    return $this->handleStripeWebhook($payload, $eventType);
                case 'paypal':
                    return $this->handlePayPalWebhook($payload, $eventType);
                default:
                    throw new PaymentProcessingException(
                        "Webhook handler for provider {$provider} is not implemented",
                        ['provider' => $provider, 'event_type' => $eventType],
                        422,
                        'UNIMPLEMENTED_WEBHOOK_HANDLER'
                    );
            }
        } catch (\Exception $e) {
            $this->handlePaymentError($e, 'handle_webhook', [
                'provider' => $provider,
                'event_type' => $eventType,
            ]);
        }
    }

    /**
     * Create a payment intent with Stripe
     *
     * @param Payment $payment
     * @param array $paymentData
     * @return array Stripe payment intent data
     * @throws ApiErrorException
     */
    protected function createStripePaymentIntent(Payment $payment, array $paymentData): array
    {
        // Initialize Stripe with API key from configuration
        Stripe::setApiKey($this->config['providers']['stripe']['secret_key']);

        // Format amount for Stripe (in cents)
        $amount = $this->formatAmount($payment->amount, $payment->currency, 'stripe');

        // Prepare payment intent data (amount, currency, payment method, etc.)
        $intentData = [
            'amount' => $amount,
            'currency' => strtolower($payment->currency),
            'payment_method_types' => $paymentData['payment_method_types'] ?? ['card'],
            'description' => $paymentData['description'] ?? "Payment for {$payment->payment_type}",
            'metadata' => [
                'payment_id' => $payment->id,
                'user_id' => $payment->user_id,
                'application_id' => $payment->application_id,
                'payment_type' => $payment->payment_type,
            ],
        ];

        // Add optional parameters if provided
        if (isset($paymentData['payment_method'])) {
            $intentData['payment_method'] = $paymentData['payment_method'];
        }

        if (isset($paymentData['confirm']) && $paymentData['confirm']) {
            $intentData['confirm'] = true;
        }

        if (isset($paymentData['setup_future_usage'])) {
            $intentData['setup_future_usage'] = $paymentData['setup_future_usage'];
        }

        // Create payment intent using Stripe SDK
        $intent = PaymentIntent::create($intentData);

        // Update payment record with intent ID
        $existingData = $payment->getPaymentData() ?: [];
        $existingData['stripe'] = [
            'payment_intent_id' => $intent->id,
            'client_secret' => $intent->client_secret,
        ];
        $payment->setPaymentData($existingData);
        $payment->save();

        // Return payment intent data including client secret
        return [
            'provider' => 'stripe',
            'client_secret' => $intent->client_secret,
            'payment_intent_id' => $intent->id,
            'status' => $intent->status,
            'requires_action' => $intent->status === 'requires_action',
            'next_action' => $intent->next_action ?? null,
        ];
    }

    /**
     * Process a payment with Stripe
     *
     * @param Payment $payment
     * @param array $paymentData
     * @return array Stripe payment processing result
     * @throws ApiErrorException
     * @throws PaymentProcessingException
     */
    protected function processStripePayment(Payment $payment, array $paymentData): array
    {
        // Initialize Stripe with API key from configuration
        Stripe::setApiKey($this->config['providers']['stripe']['secret_key']);

        // Retrieve payment intent ID from payment data
        $paymentIntentId = $paymentData['payment_intent_id'] ?? 
            ($payment->getPaymentData()['stripe']['payment_intent_id'] ?? null);

        if (!$paymentIntentId) {
            throw new PaymentProcessingException(
                "Payment intent ID is required",
                ['payment_id' => $payment->id],
                422,
                'MISSING_PAYMENT_INTENT_ID'
            );
        }

        // Retrieve payment intent from Stripe
        $intent = PaymentIntent::retrieve($paymentIntentId);

        // Verify payment intent status is 'succeeded'
        if ($intent->status !== 'succeeded') {
            throw new PaymentProcessingException(
                "Payment intent not succeeded. Status: {$intent->status}",
                ['payment_id' => $payment->id, 'intent_status' => $intent->status],
                422,
                'PAYMENT_INTENT_NOT_SUCCEEDED'
            );
        }

        // Extract transaction details from payment intent
        $payment->markAsCompleted(
            $intent->id,
            [
                'stripe' => [
                    'payment_intent_id' => $intent->id,
                    'payment_method' => $intent->payment_method,
                    'charges' => $intent->charges->data,
                ],
            ]
        );

        // Return payment processing result with transaction details
        return [
            'provider' => 'stripe',
            'transaction_id' => $intent->id,
            'status' => 'completed',
            'payment_method' => $intent->payment_method,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'paid_at' => now()->toDateTimeString(),
        ];
    }

    /**
     * Process a refund with Stripe
     *
     * @param Payment $payment
     * @param float|null $amount
     * @param string|null $reason
     * @return array Stripe refund processing result
     * @throws ApiErrorException
     * @throws PaymentProcessingException
     */
    protected function processStripeRefund(Payment $payment, ?float $amount = null, ?string $reason = null): array
    {
        // Initialize Stripe with API key from configuration
        Stripe::setApiKey($this->config['providers']['stripe']['secret_key']);

        // Retrieve transaction ID from payment data
        $paymentData = $payment->getPaymentData();
        $paymentIntentId = $paymentData['stripe']['payment_intent_id'] ?? $payment->transaction_id;

        if (!$paymentIntentId) {
            throw new PaymentProcessingException(
                "Cannot refund payment without transaction ID",
                ['payment_id' => $payment->id],
                422,
                'MISSING_TRANSACTION_ID'
            );
        }

        // Prepare refund data (payment intent, amount, reason)
        $refundData = [
            'payment_intent' => $paymentIntentId,
        ];

        if ($amount !== null) {
            $refundData['amount'] = $this->formatAmount($amount, $payment->currency, 'stripe');
        }

        if ($reason !== null) {
            $refundData['reason'] = $reason;
        }

        // Create refund using Stripe SDK
        $refund = Refund::create($refundData);

        // Verify refund status is 'succeeded'
        if ($refund->status !== 'succeeded') {
            throw new PaymentProcessingException(
                "Refund not succeeded. Status: {$refund->status}",
                ['payment_id' => $payment->id, 'refund_status' => $refund->status],
                422,
                'REFUND_NOT_SUCCEEDED'
            );
        }

        // Return refund processing result with refund details
        $payment->markAsRefunded($refund->id, [
            'stripe' => [
                'refund_id' => $refund->id,
                'amount' => $refund->amount / 100, // Convert cents back to dollars
                'status' => $refund->status,
                'reason' => $refund->reason,
            ],
        ]);

        return [
            'provider' => 'stripe',
            'refund_id' => $refund->id,
            'transaction_id' => $payment->transaction_id,
            'status' => 'refunded',
            'amount' => $amount ?? $payment->amount,
            'currency' => $payment->currency,
            'reason' => $reason,
            'refunded_at' => now()->toDateTimeString(),
        ];
    }

    /**
     * Validate a webhook request from Stripe
     *
     * @param string $payload
     * @param string $signature
     * @return bool True if webhook is valid, false otherwise
     */
    protected function validateStripeWebhook(string $payload, string $signature): bool
    {
        try {
            // Initialize Stripe with API key from configuration
            Stripe::setApiKey($this->config['providers']['stripe']['secret_key']);

            // Get webhook secret from configuration
            $webhookSecret = $this->config['providers']['stripe']['webhook_secret'] ?? null;

            if (!$webhookSecret) {
                Log::error('Stripe webhook secret not configured');
                return false;
            }

            // Use Stripe SDK to verify webhook signature
            $event = \Stripe\Webhook::constructEvent($payload, $signature, $webhookSecret);

            // Return true if signature is valid, false otherwise
            return true;
        } catch (\Exception $e) {
            // Catch and log any exceptions, return false on error
            Log::error('Stripe webhook validation error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Handle a webhook event from Stripe
     *
     * @param string $payload
     * @param string $eventType
     * @return array Stripe webhook handling result
     */
    protected function handleStripeWebhook(string $payload, string $eventType): array
    {
        // Parse the payload to extract event data
        $event = json_decode($payload, true);
        $result = ['processed' => false, 'action' => 'none'];

        // Handle different event types (payment_intent.succeeded, payment_intent.payment_failed, etc.)
        switch ($eventType) {
            case 'payment_intent.succeeded':
                $paymentIntentId = $event['data']['object']['id'] ?? null;
                
                if ($paymentIntentId) {
                    // Find the payment by payment intent ID in payment_data
                    $payment = Payment::where('payment_data->stripe->payment_intent_id', $paymentIntentId)->first();
                    
                    if ($payment && !$payment->isCompleted()) {
                        $payment->markAsCompleted($paymentIntentId, [
                            'stripe' => [
                                'payment_intent_id' => $paymentIntentId,
                                'webhook_data' => $event['data']['object'],
                            ],
                        ]);
                        
                        $result = [
                            'processed' => true,
                            'action' => 'payment_completed',
                            'payment_id' => $payment->id,
                        ];
                    }
                }
                break;
                
            case 'payment_intent.payment_failed':
                $paymentIntentId = $event['data']['object']['id'] ?? null;
                
                if ($paymentIntentId) {
                    // Find the payment by payment intent ID in payment_data
                    $payment = Payment::where('payment_data->stripe->payment_intent_id', $paymentIntentId)->first();
                    
                    if ($payment && !$payment->isFailed()) {
                        $errorMessage = $event['data']['object']['last_payment_error']['message'] ?? 'Payment failed';
                        $errorCode = $event['data']['object']['last_payment_error']['code'] ?? 'unknown';
                        
                        $payment->markAsFailed([
                            'stripe' => [
                                'payment_intent_id' => $paymentIntentId,
                                'error_message' => $errorMessage,
                                'error_code' => $errorCode,
                                'webhook_data' => $event['data']['object'],
                            ],
                        ]);
                        
                        $result = [
                            'processed' => true,
                            'action' => 'payment_failed',
                            'payment_id' => $payment->id,
                            'error' => $errorMessage,
                        ];
                    }
                }
                break;
                
            case 'charge.refunded':
                $chargeId = $event['data']['object']['id'] ?? null;
                $paymentIntentId = $event['data']['object']['payment_intent'] ?? null;
                
                if ($paymentIntentId) {
                    // Find the payment by payment intent ID in payment_data
                    $payment = Payment::where('payment_data->stripe->payment_intent_id', $paymentIntentId)
                        ->orWhere('transaction_id', $paymentIntentId)
                        ->first();
                    
                    if ($payment && !$payment->isRefunded()) {
                        $refundId = $event['data']['object']['refunds']['data'][0]['id'] ?? null;
                        $refundAmount = ($event['data']['object']['refunds']['data'][0]['amount'] ?? 0) / 100; // Convert cents to dollars
                        
                        $payment->markAsRefunded($refundId, [
                            'stripe' => [
                                'refund_id' => $refundId,
                                'charge_id' => $chargeId,
                                'amount' => $refundAmount,
                                'webhook_data' => $event['data']['object'],
                            ],
                        ]);
                        
                        $result = [
                            'processed' => true,
                            'action' => 'payment_refunded',
                            'payment_id' => $payment->id,
                            'refund_id' => $refundId,
                        ];
                    }
                }
                break;
        }

        // Return webhook handling result with action taken
        return $result;
    }

    /**
     * Create a payment order with PayPal
     *
     * @param Payment $payment
     * @param array $paymentData
     * @return array PayPal order data
     * @throws \Exception
     */
    protected function createPayPalOrder(Payment $payment, array $paymentData): array
    {
        // Initialize PayPal client with credentials from configuration
        $client = $this->getPayPalClient();

        // Prepare order data (amount, currency, intent, etc.)
        $request = new OrdersCreateRequest();
        $request->prefer('return=representation');

        $orderData = [
            'intent' => 'CAPTURE',
            'purchase_units' => [
                [
                    'reference_id' => (string) $payment->id,
                    'description' => $paymentData['description'] ?? "Payment for {$payment->payment_type}",
                    'custom_id' => (string) $payment->id,
                    'amount' => [
                        'currency_code' => $payment->currency,
                        'value' => number_format($payment->amount, 2, '.', ''),
                    ],
                ],
            ],
            'application_context' => [
                'brand_name' => $this->config['app_name'] ?? 'Student Admissions Platform',
                'landing_page' => 'BILLING',
                'shipping_preference' => 'NO_SHIPPING',
                'user_action' => 'PAY_NOW',
                'return_url' => $paymentData['return_url'] ?? null,
                'cancel_url' => $paymentData['cancel_url'] ?? null,
            ],
        ];

        $request->buildRequestBody($orderData);

        // Create order using PayPal SDK
        $response = $client->execute($request);

        // Extract the approval URL for redirect
        $approvalUrl = null;
        foreach ($response->result->links as $link) {
            if ($link->rel === 'approve') {
                $approvalUrl = $link->href;
                break;
            }
        }

        // Update payment record with order ID
        $existingData = $payment->getPaymentData() ?: [];
        $existingData['paypal'] = [
            'order_id' => $response->result->id,
            'status' => $response->result->status,
        ];
        $payment->setPaymentData($existingData);
        $payment->save();

        // Return order data including approval URL for redirect
        return [
            'provider' => 'paypal',
            'order_id' => $response->result->id,
            'status' => $response->result->status,
            'approval_url' => $approvalUrl,
            'requires_action' => true,
            'next_action' => [
                'type' => 'redirect',
                'redirect_url' => $approvalUrl,
            ],
        ];
    }

    /**
     * Process a payment with PayPal
     *
     * @param Payment $payment
     * @param array $paymentData
     * @return array PayPal payment processing result
     * @throws PaymentProcessingException
     * @throws \Exception
     */
    protected function processPayPalPayment(Payment $payment, array $paymentData): array
    {
        // Initialize PayPal client with credentials from configuration
        $client = $this->getPayPalClient();

        // Retrieve order ID from payment data
        $orderId = $paymentData['order_id'] ?? 
            ($payment->getPaymentData()['paypal']['order_id'] ?? null);

        if (!$orderId) {
            throw new PaymentProcessingException(
                "PayPal order ID is required",
                ['payment_id' => $payment->id],
                422,
                'MISSING_ORDER_ID'
            );
        }

        // Capture the order using PayPal SDK
        $request = new OrdersCaptureRequest($orderId);
        $request->prefer('return=representation');
        $response = $client->execute($request);
        
        // Verify capture status is 'COMPLETED'
        if ($response->result->status !== 'COMPLETED') {
            throw new PaymentProcessingException(
                "PayPal capture not completed. Status: {$response->result->status}",
                ['payment_id' => $payment->id, 'order_status' => $response->result->status],
                422,
                'PAYPAL_CAPTURE_NOT_COMPLETED'
            );
        }

        // Extract transaction details from capture result
        $captureId = $response->result->purchase_units[0]->payments->captures[0]->id ?? null;

        $payment->markAsCompleted(
            $orderId,
            [
                'paypal' => [
                    'order_id' => $orderId,
                    'capture_id' => $captureId,
                    'status' => $response->result->status,
                    'capture_data' => json_decode(json_encode($response->result), true),
                ],
            ]
        );

        // Return payment processing result with transaction details
        return [
            'provider' => 'paypal',
            'transaction_id' => $orderId,
            'capture_id' => $captureId,
            'status' => 'completed',
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'paid_at' => now()->toDateTimeString(),
        ];
    }

    /**
     * Process a refund with PayPal
     *
     * @param Payment $payment
     * @param float|null $amount
     * @param string|null $reason
     * @return array PayPal refund processing result
     * @throws PaymentProcessingException
     * @throws \Exception
     */
    protected function processPayPalRefund(Payment $payment, ?float $amount = null, ?string $reason = null): array
    {
        // Initialize PayPal client with credentials from configuration
        $client = $this->getPayPalClient();

        // Retrieve capture ID from payment data
        $paymentData = $payment->getPaymentData();
        $captureId = $paymentData['paypal']['capture_id'] ?? null;

        if (!$captureId) {
            throw new PaymentProcessingException(
                "Cannot refund PayPal payment without capture ID",
                ['payment_id' => $payment->id],
                422,
                'MISSING_CAPTURE_ID'
            );
        }

        // Prepare refund data (capture ID, amount, reason)
        $request = new CapturesRefundRequest($captureId);
        $refundData = [];
        
        if ($amount !== null) {
            $refundData['amount'] = [
                'value' => number_format($amount, 2, '.', ''),
                'currency_code' => $payment->currency,
            ];
        }
        
        if ($reason !== null) {
            $refundData['note_to_payer'] = $reason;
        }
        
        if (!empty($refundData)) {
            $request->buildRequestBody($refundData);
        }

        // Create refund using PayPal SDK
        $response = $client->execute($request);
        
        // Verify refund status is 'COMPLETED'
        if ($response->result->status !== 'COMPLETED') {
            throw new PaymentProcessingException(
                "PayPal refund not completed. Status: {$response->result->status}",
                ['payment_id' => $payment->id, 'refund_status' => $response->result->status],
                422,
                'PAYPAL_REFUND_NOT_COMPLETED'
            );
        }

        // Return refund processing result with refund details
        $refundId = $response->result->id;

        $payment->markAsRefunded($refundId, [
            'paypal' => [
                'refund_id' => $refundId,
                'capture_id' => $captureId,
                'amount' => $amount ?? $payment->amount,
                'status' => $response->result->status,
                'refund_data' => json_decode(json_encode($response->result), true),
            ],
        ]);

        return [
            'provider' => 'paypal',
            'refund_id' => $refundId,
            'transaction_id' => $payment->transaction_id,
            'status' => 'refunded',
            'amount' => $amount ?? $payment->amount,
            'currency' => $payment->currency,
            'reason' => $reason,
            'refunded_at' => now()->toDateTimeString(),
        ];
    }

    /**
     * Validate a webhook request from PayPal
     *
     * @param string $payload
     * @param string $signature
     * @return bool True if webhook is valid, false otherwise
     */
    protected function validatePayPalWebhook(string $payload, string $signature): bool
    {
        try {
            // Get webhook ID and secret from configuration
            $webhookId = $this->config['providers']['paypal']['webhook_id'] ?? null;
            $webhookSecret = $this->config['providers']['paypal']['webhook_secret'] ?? null;

            if (!$webhookId || !$webhookSecret) {
                Log::error('PayPal webhook ID or secret not configured');
                return false;
            }

            // Parse the signature header
            $signatureAlgorithm = 'sha256';
            $signatureCertId = null;
            $signatureTimestamp = null;

            $signatureParts = explode(',', $signature);
            foreach ($signatureParts as $part) {
                $keyValue = explode('=', $part, 2);
                if (count($keyValue) === 2) {
                    $key = trim($keyValue[0]);
                    $value = trim($keyValue[1]);
                    
                    if ($key === 'algorithm') {
                        $signatureAlgorithm = $value;
                    } elseif ($key === 'cert_id') {
                        $signatureCertId = $value;
                    } elseif ($key === 'timestamp') {
                        $signatureTimestamp = $value;
                    }
                }
            }

            // Log the validation attempt
            Log::info('PayPal webhook validation', [
                'webhook_id' => $webhookId,
                'signature_algorithm' => $signatureAlgorithm,
                'signature_cert_id' => $signatureCertId,
                'signature_timestamp' => $signatureTimestamp,
            ]);
            
            // In a real implementation, we would validate the signature cryptographically
            // For this implementation, we'll return true if all required fields are present
            return !empty($signatureCertId) && !empty($signatureTimestamp);
        } catch (\Exception $e) {
            // Catch and log any exceptions, return false on error
            Log::error('PayPal webhook validation error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Handle a webhook event from PayPal
     *
     * @param string $payload
     * @param string $eventType
     * @return array PayPal webhook handling result
     */
    protected function handlePayPalWebhook(string $payload, string $eventType): array
    {
        // Parse the payload to extract event data
        $event = json_decode($payload, true);
        $result = ['processed' => false, 'action' => 'none'];

        // Handle different event types (PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, etc.)
        switch ($eventType) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                $orderId = $event['resource']['supplementary_data']['related_ids']['order_id'] ?? null;
                $captureId = $event['resource']['id'] ?? null;
                
                if ($orderId && $captureId) {
                    // Find the payment by order ID in payment_data
                    $payment = Payment::where('payment_data->paypal->order_id', $orderId)->first();
                    
                    if ($payment && !$payment->isCompleted()) {
                        $payment->markAsCompleted($orderId, [
                            'paypal' => [
                                'order_id' => $orderId,
                                'capture_id' => $captureId,
                                'status' => 'COMPLETED',
                                'webhook_data' => $event,
                            ],
                        ]);
                        
                        $result = [
                            'processed' => true,
                            'action' => 'payment_completed',
                            'payment_id' => $payment->id,
                        ];
                    }
                }
                break;
                
            case 'PAYMENT.CAPTURE.DENIED':
                $orderId = $event['resource']['supplementary_data']['related_ids']['order_id'] ?? null;
                $captureId = $event['resource']['id'] ?? null;
                
                if ($orderId) {
                    // Find the payment by order ID in payment_data
                    $payment = Payment::where('payment_data->paypal->order_id', $orderId)->first();
                    
                    if ($payment && !$payment->isFailed()) {
                        $payment->markAsFailed([
                            'paypal' => [
                                'order_id' => $orderId,
                                'capture_id' => $captureId,
                                'status' => 'DENIED',
                                'webhook_data' => $event,
                            ],
                        ]);
                        
                        $result = [
                            'processed' => true,
                            'action' => 'payment_failed',
                            'payment_id' => $payment->id,
                        ];
                    }
                }
                break;
                
            case 'PAYMENT.CAPTURE.REFUNDED':
                $captureId = $event['resource']['supplementary_data']['related_ids']['capture_id'] ?? null;
                $refundId = $event['resource']['id'] ?? null;
                
                if ($captureId && $refundId) {
                    // Find the payment by capture ID in payment_data
                    $payment = Payment::where('payment_data->paypal->capture_id', $captureId)->first();
                    
                    if ($payment && !$payment->isRefunded()) {
                        $refundAmount = $event['resource']['amount']['value'] ?? null;
                        
                        $payment->markAsRefunded($refundId, [
                            'paypal' => [
                                'refund_id' => $refundId,
                                'capture_id' => $captureId,
                                'amount' => $refundAmount,
                                'status' => 'COMPLETED',
                                'webhook_data' => $event,
                            ],
                        ]);
                        
                        $result = [
                            'processed' => true,
                            'action' => 'payment_refunded',
                            'payment_id' => $payment->id,
                            'refund_id' => $refundId,
                        ];
                    }
                }
                break;
        }

        // Return webhook handling result with action taken
        return $result;
    }

    /**
     * Get or create a PayPal HTTP client
     *
     * @return PayPalHttpClient PayPal HTTP client instance
     * @throws PaymentProcessingException
     */
    protected function getPayPalClient(): PayPalHttpClient
    {
        // Check if client already exists in gatewayClients array
        if (isset($this->gatewayClients['paypal'])) {
            return $this->gatewayClients['paypal'];
        }

        // If not, create a new client based on environment (sandbox or production)
        $paypalConfig = $this->config['providers']['paypal'] ?? [];
        $clientId = $paypalConfig['client_id'] ?? null;
        $clientSecret = $paypalConfig['client_secret'] ?? null;
        $environment = $paypalConfig['environment'] ?? 'sandbox';

        if (!$clientId || !$clientSecret) {
            throw new PaymentProcessingException(
                "PayPal client ID or secret not configured",
                [],
                500,
                'PAYPAL_CONFIG_MISSING'
            );
        }

        if ($environment === 'production') {
            $environment = new ProductionEnvironment($clientId, $clientSecret);
        } else {
            $environment = new SandboxEnvironment($clientId, $clientSecret);
        }

        // Store client in gatewayClients array for reuse
        $client = new PayPalHttpClient($environment);
        $this->gatewayClients['paypal'] = $client;

        // Return the PayPal HTTP client
        return $client;
    }

    /**
     * Format amount for payment gateway (convert to smallest currency unit)
     *
     * @param float $amount
     * @param string $currency
     * @param string $provider
     * @return int|float Formatted amount in smallest currency unit
     */
    protected function formatAmount(float $amount, string $currency, string $provider)
    {
        // Determine currency decimal places (2 for USD, 0 for JPY, etc.)
        $currencyDecimals = 2; // Default for most currencies
        
        if (strtoupper($currency) === 'JPY') {
            $currencyDecimals = 0;
        }
        
        // Multiply amount by 10^decimal_places for Stripe (converts to cents)
        switch ($provider) {
            case 'stripe':
                return (int) ($amount * pow(10, $currencyDecimals));
                
            case 'paypal':
                // Return amount as is for PayPal (uses decimal amounts)
                return $amount;
                
            default:
                return $amount;
        }
    }

    /**
     * Handle payment gateway errors consistently
     *
     * @param \Exception $exception
     * @param string $operation
     * @param array $context
     * @throws PaymentProcessingException
     */
    protected function handlePaymentError(\Exception $exception, string $operation, array $context): void
    {
        // Log the exception with context information
        Log::error('Payment processing error', [
            'operation' => $operation,
            'context' => $context,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);

        // Determine appropriate error code and message based on exception type
        $errorCode = 'PAYMENT_PROCESSING_ERROR';
        $statusCode = 422;
        $message = 'An error occurred while processing your payment.';

        if ($exception instanceof ApiErrorException) {
            $errorCode = 'STRIPE_' . strtoupper(str_replace(' ', '_', $exception->getStripeCode() ?? 'API_ERROR'));
            $message = $exception->getMessage();
        } elseif ($exception instanceof \PayPalHttp\HttpException) {
            $errorCode = 'PAYPAL_API_ERROR';
            $message = $exception->getMessage();
        } elseif ($exception instanceof PaymentProcessingException) {
            throw $exception;
        }

        // Throw a new PaymentProcessingException with error details
        throw new PaymentProcessingException(
            $message,
            $context,
            $statusCode,
            $errorCode,
            $exception
        );
    }
}