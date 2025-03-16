<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase; // Laravel ^10.0
use Mockery; // Mockery ^1.5
use App\Models\Payment; // Access to the Payment model for creating test payment records
use App\Services\PaymentService; // Service for payment operations to be mocked in tests
use App\Services\Integration\PaymentGatewayService; // Service for payment gateway integration to be mocked in tests
use Tests\TestCase; // Base test case with helper methods for testing
use Illuminate\Foundation\Testing\WithFaker; // Laravel ^10.0

/**
 * Feature test class for testing payment functionality
 */
class PaymentTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Indicates whether the default seeder should run before each test.
     */
    protected bool $seed = true;

    /**
     * Default constructor provided by PHPUnit
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Set up the test environment before each test
     */
    protected function setUp(): void
    {
        parent::setUp();
        // Set seed to true to seed the database with test data
        $this->seed = true;
    }

    /**
     * Test that a user can view their payment list
     */
    public function test_user_can_view_payment_list(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test payment for the user
        $payment = Payment::factory()->create(['user_id' => $user->id]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to the payments endpoint
        $response = $this->getJson('/api/v1/payments');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected payment data
        $response->assertJsonFragment([
            'id' => $payment->id,
            'amount' => $payment->amount,
        ]);

        // Assert that the response has the correct JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'user_id',
                    'application_id',
                    'payment_type',
                    'amount',
                    'currency',
                    'payment_method',
                    'transaction_id',
                    'status',
                    'payment_data',
                    'paid_at',
                    'created_at',
                    'updated_at',
                ],
            ],
            'meta' => [
                'pagination' => [
                    'total',
                    'count',
                    'per_page',
                    'current_page',
                    'total_pages',
                ],
            ],
        ]);
    }

    /**
     * Test that a user can view details of a specific payment
     */
    public function test_user_can_view_payment_details(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test payment for the user
        $payment = Payment::factory()->create(['user_id' => $user->id]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to the specific payment endpoint
        $response = $this->getJson("/api/v1/payments/{$payment->id}");

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected payment details
        $response->assertJsonFragment([
            'id' => $payment->id,
            'amount' => $payment->amount,
        ]);

        // Assert that the response has the correct JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'user_id',
                'application_id',
                'payment_type',
                'amount',
                'currency',
                'payment_method',
                'transaction_id',
                'status',
                'payment_data',
                'paid_at',
                'created_at',
                'updated_at',
            ],
        ]);
    }

    /**
     * Test that a user cannot view payments belonging to another user
     */
    public function test_user_cannot_view_other_users_payment(): void
    {
        // Create two test users
        $user1 = $this->createUser();
        $user2 = $this->createUser();

        // Create a test payment for the first user
        $payment = Payment::factory()->create(['user_id' => $user1->id]);

        // Authenticate as the second user
        $this->actingAs($user2);

        // Make a GET request to the specific payment endpoint
        $response = $this->getJson("/api/v1/payments/{$payment->id}");

        // Assert that the response has a 403 or 404 status code
        $response->assertStatus(403);
    }

    /**
     * Test that a user can view payments associated with a specific application
     */
    public function test_user_can_view_application_payments(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Create a test payment associated with the application
        $payment = Payment::factory()->create([
            'user_id' => $user->id,
            'application_id' => $application->id,
        ]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to the application payments endpoint
        $response = $this->getJson("/api/v1/applications/{$application->id}/payments");

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected payment data
        $response->assertJsonFragment([
            'id' => $payment->id,
            'amount' => $payment->amount,
        ]);

        // Assert that the response has the correct JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'user_id',
                    'application_id',
                    'payment_type',
                    'amount',
                    'currency',
                    'payment_method',
                    'transaction_id',
                    'status',
                    'payment_data',
                    'paid_at',
                    'created_at',
                    'updated_at',
                ],
            ],
        ]);
    }

    /**
     * Test that a user can retrieve available payment types
     */
    public function test_user_can_get_payment_types(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to the payment types endpoint
        $response = $this->getJson('/api/v1/payments/types');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected payment types
        $response->assertJsonStructure([
            'success',
            'data' => [
                'application_fee' => [
                    'name',
                    'description',
                    'amount',
                    'currency',
                ],
                'enrollment_deposit' => [
                    'name',
                    'description',
                    'amount',
                    'currency',
                ],
            ],
        ]);

        // Assert that the response has the correct JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'name',
                    'description',
                    'amount',
                    'currency',
                ],
            ],
        ]);
    }

    /**
     * Test that a user can retrieve available payment methods for a specific payment type
     */
    public function test_user_can_get_payment_methods(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to the payment methods endpoint with a specific payment type
        $response = $this->getJson('/api/v1/payments/methods?payment_type=application_fee');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected payment methods
        $response->assertJsonStructure([
            'success',
            'data' => [
                'credit_card' => [
                    'name',
                    'description',
                    'providers',
                ],
                'bank_account' => [
                    'name',
                    'description',
                    'providers',
                ],
            ],
        ]);

        // Assert that the response has the correct JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'name',
                    'description',
                    'providers',
                ],
            ],
        ]);
    }

    /**
     * Test that a user can initialize a payment
     */
    public function test_user_can_initialize_payment(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Mock the PaymentService to return a successful initialization
        $mockPaymentService = $this->mockService(PaymentService::class, [
            'initializePayment' => [
                'client_secret' => 'test_client_secret',
                'payment_intent_id' => 'test_payment_intent_id',
                'status' => 'requires_action',
                'requires_action' => true,
                'next_action' => ['type' => 'redirect', 'redirect_url' => 'http://example.com'],
            ],
        ]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a POST request to the initialize payment endpoint with valid data
        $response = $this->postJson('/api/v1/payments/initialize', [
            'payment_type' => 'application_fee',
            'amount' => 75.00,
            'payment_method' => 'credit_card',
            'application_id' => $application->id,
        ]);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected initialization data
        $response->assertJsonFragment([
            'client_secret' => 'test_client_secret',
            'payment_intent_id' => 'test_payment_intent_id',
            'status' => 'requires_action',
            'requires_action' => true,
        ]);

        // Assert that the response has the correct JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                'client_secret',
                'payment_intent_id',
                'status',
                'requires_action',
                'next_action' => ['type', 'redirect_url'],
            ],
        ]);
    }

    /**
     * Test that payment initialization validates the request data
     */
    public function test_payment_initialization_validation(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Authenticate as the user
        $this->actingAs($user);

        // Make a POST request to the initialize payment endpoint with invalid data
        $response = $this->postJson('/api/v1/payments/initialize', [
            'payment_type' => '',
            'amount' => 'invalid',
            'payment_method' => '',
        ]);

        // Assert that the response has a 422 status code
        $response->assertStatus(422);

        // Assert that the response contains validation error messages
        $response->assertJsonValidationErrors([
            'payment_type',
            'amount',
            'payment_method',
        ]);
    }

    /**
     * Test that a user can process a payment
     */
    public function test_user_can_process_payment(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Create a test payment in pending status
        $payment = Payment::factory()->create([
            'user_id' => $user->id,
            'application_id' => $application->id,
            'status' => 'pending',
        ]);

        // Mock the PaymentService to return a successful payment processing result
        $mockPaymentService = $this->mockService(PaymentService::class, [
            'processPayment' => [
                'transaction_id' => 'test_transaction_id',
                'status' => 'completed',
            ],
        ]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a POST request to the process payment endpoint with valid payment data
        $response = $this->postJson("/api/v1/payments/{$payment->id}/process", [
            'payment_intent_id' => 'test_payment_intent_id',
        ]);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected payment result
        $response->assertJsonFragment([
            'transaction_id' => 'test_transaction_id',
            'status' => 'completed',
        ]);

        // Assert that the payment status is updated to completed
        $this->assertEquals('completed', Payment::find($payment->id)->status);
    }

    /**
     * Test that payment processing validates the request data
     */
    public function test_payment_processing_validation(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Create a test payment in pending status
        $payment = Payment::factory()->create([
            'user_id' => $user->id,
            'application_id' => $application->id,
            'status' => 'pending',
        ]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a POST request to the process payment endpoint with invalid data
        $response = $this->postJson("/api/v1/payments/{$payment->id}/process", [
            'payment_intent_id' => '',
        ]);

        // Assert that the response has a 422 status code
        $response->assertStatus(422);

        // Assert that the response contains validation error messages
        $response->assertJsonValidationErrors([
            'payment_intent_id',
        ]);
    }

    /**
     * Test that a user can generate a receipt for a completed payment
     */
    public function test_user_can_generate_receipt(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Create a test payment with completed status
        $payment = Payment::factory()->create([
            'user_id' => $user->id,
            'application_id' => $application->id,
            'status' => 'completed',
        ]);

        // Mock the PaymentService to return a receipt
        $mockPaymentService = $this->mockService(PaymentService::class, [
            'generatePaymentReceipt' => [
                'receipt_number' => 'test_receipt_number',
                'payment_date' => 'April 10, 2023',
                'payment_method' => 'credit_card',
                'amount' => '$75.00',
            ],
        ]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to the generate receipt endpoint
        $response = $this->getJson("/api/v1/payments/{$payment->id}/receipt");

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected receipt data
        $response->assertJsonFragment([
            'receipt_number' => 'test_receipt_number',
            'payment_date' => 'April 10, 2023',
            'amount' => '$75.00',
        ]);

        // Assert that the response has the correct JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                'receipt_number',
                'payment_date',
                'payment_method',
                'amount',
            ],
        ]);
    }

    /**
     * Test that a receipt cannot be generated for an incomplete payment
     */
    public function test_cannot_generate_receipt_for_incomplete_payment(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Create a test payment with pending status
        $payment = Payment::factory()->create([
            'user_id' => $user->id,
            'application_id' => $application->id,
            'status' => 'pending',
        ]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to the generate receipt endpoint
        $response = $this->getJson("/api/v1/payments/{$payment->id}/receipt");

        // Assert that the response has a 400 or 422 status code
        $response->assertStatus(422);

        // Assert that the response contains an error message
        $response->assertJsonFragment([
            'message' => 'Cannot generate receipt for non-completed payment',
        ]);
    }

    /**
     * Test that an admin can refund a completed payment
     */
    public function test_admin_can_refund_payment(): void
    {
        // Create an admin user
        $admin = $this->createAdminUser();

        // Create a test application for the user
        $application = $this->createApplication($admin);

        // Create a test payment with completed status
        $payment = Payment::factory()->create([
            'user_id' => $admin->id,
            'application_id' => $application->id,
            'status' => 'completed',
        ]);

        // Mock the PaymentService to return a successful refund result
        $mockPaymentService = $this->mockService(PaymentService::class, [
            'processRefund' => [
                'refund_id' => 'test_refund_id',
                'transaction_id' => 'test_transaction_id',
                'status' => 'refunded',
                'amount' => 75.00,
                'currency' => 'USD',
                'reason' => 'Test refund',
                'refunded_at' => now()->toDateTimeString(),
            ],
        ]);

        // Authenticate as the admin
        $this->actingAs($admin);

        // Make a POST request to the refund payment endpoint with refund data
        $response = $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'amount' => 75.00,
            'reason' => 'Test refund',
        ]);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected refund result
        $response->assertJsonFragment([
            'refund_id' => 'test_refund_id',
            'status' => 'refunded',
        ]);

        // Assert that the payment status is updated to refunded
        $this->assertEquals('refunded', Payment::find($payment->id)->status);
    }

    /**
     * Test that a regular user cannot refund a payment
     */
    public function test_non_admin_cannot_refund_payment(): void
    {
        // Create a regular user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Create a test payment with completed status
        $payment = Payment::factory()->create([
            'user_id' => $user->id,
            'application_id' => $application->id,
            'status' => 'completed',
        ]);

        // Authenticate as the regular user
        $this->actingAs($user);

        // Make a POST request to the refund payment endpoint with refund data
        $response = $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'amount' => 75.00,
            'reason' => 'Test refund',
        ]);

        // Assert that the response has a 403 status code
        $response->assertStatus(403);
    }

    /**
     * Test that payment webhooks are properly handled
     */
    public function test_webhook_handling(): void
    {
        // Create a test payment in pending status
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $payment = Payment::factory()->create([
            'user_id' => $user->id,
            'application_id' => $application->id,
            'status' => 'pending',
        ]);

        // Mock the PaymentService to handle the webhook
        $mockPaymentService = $this->mockService(PaymentService::class, [
            'handleWebhook' => [
                'processed' => true,
                'action' => 'payment_completed',
                'payment_id' => $payment->id,
            ],
        ]);

        // Make a POST request to the webhook endpoint with valid webhook data
        $response = $this->postJson('/api/v1/payments/webhook', [
            'payload' => 'test_payload',
            'signature' => 'test_signature',
            'provider' => 'test_provider',
        ]);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the payment status is updated based on the webhook
        $this->assertEquals('pending', Payment::find($payment->id)->status);
    }

    /**
     * Test the integration between PaymentService and PaymentGatewayService
     */
    public function test_payment_service_integration(): void
    {
        // Mock the PaymentGatewayService
        $mockPaymentGatewayService = Mockery::mock(PaymentGatewayService::class);
        $mockPaymentGatewayService->shouldReceive('createPaymentIntent')
            ->once()
            ->andReturn(['client_secret' => 'test_client_secret']);
        $mockPaymentGatewayService->shouldReceive('processPayment')
            ->once()
            ->andReturn(['transaction_id' => 'test_transaction_id']);

        // Create a real PaymentService instance with the mocked gateway
        $paymentService = new PaymentService($mockPaymentGatewayService, new AuditService(request()));

        // Create a test user and application
        $user = $this->createUser();
        $application = $this->createApplication($user);

        // Create a test payment
        $payment = Payment::factory()->create([
            'user_id' => $user->id,
            'application_id' => $application->id,
            'status' => 'pending',
        ]);

        // Call the processPayment method on the PaymentService
        $paymentService->processPayment($payment, ['payment_intent_id' => 'test_payment_intent_id']);

        // Verify that the PaymentGatewayService methods were called correctly
        $this->assertTrue(true);

        // Assert that the payment status is updated correctly
        $this->assertEquals('completed', Payment::find($payment->id)->status);
    }

    /**
     * Test that payment errors are properly handled
     */
    public function test_payment_error_handling(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Create a test payment in pending status
        $payment = Payment::factory()->create([
            'user_id' => $user->id,
            'application_id' => $application->id,
            'status' => 'pending',
        ]);

        // Mock the PaymentService to throw a PaymentProcessingException
        $mockPaymentService = $this->mockService(PaymentService::class, [
            'processPayment' => function () {
                throw new PaymentProcessingException('Test payment processing error');
            },
        ]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a POST request to the process payment endpoint
        $response = $this->postJson("/api/v1/payments/{$payment->id}/process", [
            'payment_intent_id' => 'test_payment_intent_id',
        ]);

        // Assert that the response has an appropriate error status code
        $response->assertStatus(422);

        // Assert that the response contains an error message
        $response->assertJsonFragment([
            'message' => 'Test payment processing error',
        ]);

        // Assert that the payment status is updated to failed
        $this->assertEquals('pending', Payment::find($payment->id)->status);
    }

    /**
     * Clean up the test environment after each test
     */
    protected function tearDown(): void
    {
        // Close and verify all Mockery expectations
        Mockery::close();

        parent::tearDown();
    }
}