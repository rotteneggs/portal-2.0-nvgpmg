<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Routing\Controller; // illuminate/routing ^10.0 - Laravel base controller class with common functionality
use Illuminate\Http\Request; // illuminate/http ^10.0 - Laravel request object for handling HTTP requests
use Illuminate\Http\Response; // illuminate/http ^10.0 - Laravel response object for returning HTTP responses
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0 - Laravel authentication facade for accessing the authenticated user
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0 - Laravel logging facade for error and activity logging
use App\Services\PaymentService; // Access payment service methods for validating payment types and methods
use App\Http\Resources\PaymentResource; // Resource for transforming payment models to JSON responses
use App\Http\Requests\PaymentProcessRequest; // Form request for validating payment processing requests
use App\Exceptions\PaymentProcessingException; // Custom exception for payment processing errors

/**
 * Controller for handling payment-related API endpoints
 */
class PaymentController extends Controller
{
    /**
     * @var PaymentService
     */
    protected PaymentService $paymentService;

    /**
     * Create a new PaymentController instance
     *
     * @param PaymentService $paymentService
     */
    public function __construct(PaymentService $paymentService)
    {
        // Assign the payment service to the protected property
        $this->paymentService = $paymentService;
    }

    /**
     * Get a paginated list of payments for the authenticated user
     *
     * @param Request $request
     * @return Response JSON response with paginated payment resources
     */
    public function index(Request $request): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Extract filter parameters from the request (payment_type, status, date range)
        $filters = $request->only(['payment_type', 'status', 'start_date', 'end_date']);

        // Get paginated payments using the PaymentService
        $payments = $this->paymentService->getUserPayments($userId, $filters, 15, $request->get('page', 1));

        // Transform the payments using PaymentResource
        $paymentResources = PaymentResource::collection($payments);

        // Return a JSON response with the paginated payment resources
        return response([
            'success' => true,
            'data' => $paymentResources,
            'meta' => [
                'pagination' => [
                    'total' => $payments->total(),
                    'per_page' => $payments->perPage(),
                    'current_page' => $payments->currentPage(),
                    'last_page' => $payments->lastPage(),
                    'from' => $payments->firstItem(),
                    'to' => $payments->lastItem(),
                ],
            ],
        ]);
    }

    /**
     * Get a specific payment by ID
     *
     * @param Request $request
     * @param int $id
     * @return Response JSON response with the payment resource
     */
    public function show(Request $request, int $id): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Get the payment by ID using the PaymentService
        $payment = $this->paymentService->getPaymentById($id, $userId);

        // Check if the payment exists and belongs to the user
        if (!$payment) {
            return response([
                'success' => false,
                'error' => [
                    'code' => 'PAYMENT_NOT_FOUND',
                    'message' => 'Payment not found or does not belong to user',
                ],
            ], 404);
        }

        // Transform the payment using PaymentResource with user, application, and payment data
        $paymentResource = (new PaymentResource($payment))
            ->withUser()
            ->withApplication()
            ->withPaymentData();

        // Return a JSON response with the payment resource
        return response([
            'success' => true,
            'data' => $paymentResource,
        ]);
    }

    /**
     * Get payments associated with a specific application
     *
     * @param Request $request
     * @param int $applicationId
     * @return Response JSON response with application payment resources
     */
    public function getApplicationPayments(Request $request, int $applicationId): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Get payments for the application using the PaymentService
        $payments = $this->paymentService->getApplicationPayments($applicationId, $userId);

        // Transform the payments using PaymentResource
        $paymentResources = PaymentResource::collection($payments);

        // Return a JSON response with the payment resources
        return response([
            'success' => true,
            'data' => $paymentResources,
        ]);
    }

    /**
     * Get available payment types
     *
     * @param Request $request
     * @return Response JSON response with available payment types
     */
    public function getPaymentTypes(Request $request): Response
    {
        // Get available payment types from the PaymentService
        $paymentTypes = $this->paymentService->getPaymentTypes();

        // Return a JSON response with the payment types
        return response([
            'success' => true,
            'data' => $paymentTypes,
        ]);
    }

    /**
     * Get available payment methods for a specific payment type
     *
     * @param Request $request
     * @param string $paymentType
     * @return Response JSON response with available payment methods
     */
    public function getPaymentMethods(Request $request, string $paymentType): Response
    {
        // Get available payment methods for the payment type from the PaymentService
        $paymentMethods = $this->paymentService->getPaymentMethods($paymentType);

        // Return a JSON response with the payment methods
        return response([
            'success' => true,
            'data' => $paymentMethods,
        ]);
    }

    /**
     * Initialize a payment for processing
     *
     * @param Request $request
     * @return Response JSON response with payment initialization data
     */
    public function initializePayment(Request $request): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Validate the request data (payment_type, amount, payment_method, application_id if applicable)
        $validatedData = $request->validate([
            'payment_type' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string',
            'application_id' => 'nullable|integer|exists:applications,id,user_id,' . $userId,
            'payment_data' => 'nullable|array',
        ]);

        // Create a new payment record using the PaymentService
        $payment = $this->paymentService->createPayment(
            $userId,
            $validatedData['payment_type'],
            $validatedData['amount'],
            $validatedData['payment_method'],
            $validatedData['application_id'] ?? null,
            $validatedData['payment_data'] ?? null
        );

        // Initialize the payment with the payment gateway
        $paymentInitializationData = $this->paymentService->initializePayment($payment, $validatedData['payment_data'] ?? []);

        // Return a JSON response with the payment initialization data (client secret, redirect URL, etc.)
        return response([
            'success' => true,
            'data' => $paymentInitializationData,
        ]);
    }

    /**
     * Process a payment with the payment gateway
     *
     * @param PaymentProcessRequest $request
     * @param int $id
     * @return Response JSON response with payment processing result
     */
    public function processPayment(PaymentProcessRequest $request, int $id): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Get the payment by ID using the PaymentService
        $payment = $this->paymentService->getPaymentById($id, $userId);

        // Check if the payment exists and belongs to the user
        if (!$payment) {
            return response([
                'success' => false,
                'error' => [
                    'code' => 'PAYMENT_NOT_FOUND',
                    'message' => 'Payment not found or does not belong to user',
                ],
            ], 404);
        }

        // Try to process the payment using the PaymentService
        try {
            $paymentResult = $this->paymentService->processPayment($payment, $request->validated());

            // If successful, return a JSON response with the payment result
            return response([
                'success' => true,
                'data' => $paymentResult,
            ]);
        } catch (PaymentProcessingException $e) {
            // If an error occurs, catch the PaymentProcessingException and return the error response
            return $e->render($request);
        }
    }

    /**
     * Generate a receipt for a completed payment
     *
     * @param Request $request
     * @param int $id
     * @return Response JSON response with the receipt data
     */
    public function generateReceipt(Request $request, int $id): Response
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Get the payment by ID using the PaymentService
        $payment = $this->paymentService->getPaymentById($id, $userId);

        // Check if the payment exists, belongs to the user, and is completed
        if (!$payment) {
            return response([
                'success' => false,
                'error' => [
                    'code' => 'PAYMENT_NOT_FOUND',
                    'message' => 'Payment not found or does not belong to user',
                ],
            ], 404);
        }

        if (!$payment->isCompleted()) {
            return response([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_PAYMENT_STATUS',
                    'message' => 'Cannot generate receipt for non-completed payment',
                ],
            ], 422);
        }

        // Generate a receipt using the PaymentService
        $receiptData = $this->paymentService->generatePaymentReceipt($payment);

        // Return a JSON response with the receipt data
        return response([
            'success' => true,
            'data' => $receiptData,
        ]);
    }

    /**
     * Process a refund for a completed payment
     *
     * @param Request $request
     * @param int $id
     * @return Response JSON response with refund result
     */
    public function refundPayment(Request $request, int $id): Response
    {
        // Check if the authenticated user has admin or staff role
        if (!Auth::user()->hasRole('admin') && !Auth::user()->hasRole('staff')) {
            return response([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'You are not authorized to perform this action',
                ],
            ], 403);
        }

        // Get the payment by ID using the PaymentService
        $payment = $this->paymentService->getPaymentById($id);

        // Check if the payment exists and is completed
        if (!$payment) {
            return response([
                'success' => false,
                'error' => [
                    'code' => 'PAYMENT_NOT_FOUND',
                    'message' => 'Payment not found',
                ],
            ], 404);
        }

        if (!$payment->isCompleted()) {
            return response([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_PAYMENT_STATUS',
                    'message' => 'Cannot refund a non-completed payment',
                ],
            ], 422);
        }

        // Extract refund amount and reason from the request
        $validatedData = $request->validate([
            'amount' => 'nullable|numeric|min:0.01',
            'reason' => 'nullable|string|max:255',
        ]);

        // Try to process the refund using the PaymentService
        try {
            $refundResult = $this->paymentService->processRefund(
                $payment,
                $validatedData['amount'] ?? null,
                $validatedData['reason'] ?? null
            );

            // If successful, return a JSON response with the refund result
            return response([
                'success' => true,
                'data' => $refundResult,
            ]);
        } catch (PaymentProcessingException $e) {
            // If an error occurs, catch the PaymentProcessingException and return the error response
            return $e->render($request);
        }
    }

    /**
     * Handle webhook events from payment gateways
     *
     * @param Request $request
     * @param string $provider
     * @return Response JSON response acknowledging the webhook
     */
    public function handleWebhook(Request $request, string $provider): Response
    {
        // Extract the webhook payload and signature from the request
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature') ?? $request->header('Paypal-Auth-Algo');

        // Try to handle the webhook using the PaymentService
        try {
            $webhookResult = $this->paymentService->handleWebhook($payload, $signature, $provider);

            // Return a JSON response acknowledging the webhook
            return response([
                'success' => true,
                'data' => $webhookResult,
            ]);
        } catch (PaymentProcessingException $e) {
            // If an error occurs, log the error and return an appropriate error response
            Log::error('Webhook processing error', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $e->render($request);
        }
    }
}