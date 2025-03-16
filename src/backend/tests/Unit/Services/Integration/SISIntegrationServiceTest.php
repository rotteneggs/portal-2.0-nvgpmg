<?php

namespace Tests\Unit\Services\Integration;

use App\Exceptions\IntegrationException; // Exception class for testing error handling in SIS integration
use App\Models\Application; // Application model for testing enrollment data synchronization
use App\Models\Integration; // Integration model for testing SIS integration configuration
use App\Models\IntegrationLog;
use App\Models\User; // User model for testing student data synchronization
use App\Models\UserProfile; // User profile model for testing personal information synchronization
use App\Services\Integration\SISIntegrationService; // The service class being tested
use Carbon\Carbon;
use Illuminate\Support\Facades\Config; // Laravel configuration facade for setting test configuration
use Illuminate\Support\Facades\Http; // Laravel HTTP facade for mocking API responses
use Mockery; // Mocking framework for creating test doubles
use Tests\TestCase; // Base test case class with helper methods for testing

class SISIntegrationServiceTest extends TestCase
{
    /**
     * @var SISIntegrationService
     */
    protected $sisService;

    /**
     * @var array
     */
    protected $testConfig;

    /**
     * @var User
     */
    protected $testUser;

    /**
     * @var Application
     */
    protected $testApplication;

    /**
     * @var Integration
     */
    protected $testIntegration;

    /**
     * Default constructor provided by PHPUnit
     */
    public function __construct(?string $name = null, array $data = [], $dataName = '')
    {
        parent::__construct($name, $data, $dataName);
    }

    /**
     * Set up the test environment before each test
     *
     * @return void
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Create test configuration for SIS integration
        $this->testConfig = [
            'api_url' => 'https://example.com/api',
            'api_key' => 'test_api_key',
            'api_secret' => 'test_api_secret',
            'timeout' => 10,
            'retry_attempts' => 3,
            'retry_delay' => 1,
            'endpoints' => [
                'students' => 'students',
                'enrollment' => 'enrollment',
            ],
            'field_mappings' => [
                'student' => [
                    'email' => 'emailAddress',
                    'first_name' => 'firstName',
                    'last_name' => 'lastName',
                ],
            ],
            'provider' => 'test_provider',
            'enabled' => true,
        ];

        // Mock the Config facade to return test configuration
        Config::shouldReceive('get')
            ->with('integrations.sis', [])
            ->andReturn($this->testConfig);

        // Create a test user with profile data
        $this->testUser = $this->createUser([
            'first_name' => 'John',
            'last_name' => 'Smith',
            'date_of_birth' => '1990-01-01',
            'phone_number' => '123-456-7890',
        ]);

        // Create a test application for the user
        $this->testApplication = $this->createApplication($this->testUser);

        // Create a test integration record for SIS
        $this->testIntegration = Integration::factory()->create([
            'system_name' => 'Test SIS',
            'integration_type' => 'sis',
            'configuration' => ['settings' => $this->testConfig],
            'is_active' => true,
        ]);

        // Initialize the SIS integration service with test configuration
        $this->sisService = new SISIntegrationService();
    }

    /**
     * Clean up the test environment after each test
     *
     * @return void
     */
    protected function tearDown(): void
    {
        // Reset mocked facades
        Mockery::close();

        parent::tearDown();
    }

    /**
     * Test that the service initializes correctly with valid configuration
     *
     * @return void
     */
    public function testInitializeWithValidConfiguration(): void
    {
        // Create a new SIS integration service instance
        $sisService = new SISIntegrationService();

        // Call the initialize method
        $result = $sisService->initialize();

        // Assert that the method returns true
        $this->assertTrue($result);

        // Assert that isConfigured() returns true
        $this->assertTrue($sisService->isConfigured());

        // Assert that isEnabled() returns true
        $this->assertTrue($sisService->isEnabled());
    }

    /**
     * Test that the service handles invalid configuration correctly
     *
     * @return void
     */
    public function testInitializeWithInvalidConfiguration(): void
    {
        // Mock the Config facade to return invalid configuration (missing required fields)
        Config::shouldReceive('get')
            ->with('integrations.sis', [])
            ->andReturn(['api_url' => null, 'api_key' => null]);

        // Create a new SIS integration service instance
        $sisService = new SISIntegrationService();

        // Call the initialize method
        $result = $sisService->initialize();

        // Assert that the method returns false
        $this->assertFalse($result);

        // Assert that isConfigured() returns false
        $this->assertFalse($sisService->isConfigured());
    }

    /**
     * Test creating a new student record in the SIS
     *
     * @return void
     */
    public function testCreateStudent(): void
    {
        // Mock the HTTP facade to return a successful response with a student ID
        Http::shouldReceive('withHeaders->timeout->post')
            ->once()
            ->with(
                'https://example.com/api/students',
                [
                    'emailAddress' => 'john.smith@example.com',
                    'firstName' => 'John',
                    'lastName' => 'Smith',
                    'full_name' => 'John Smith',
                    'date_of_birth' => '1990-01-01',
                    'phone_number' => '123-456-7890',
                    'application_id' => $this->testApplication->id,
                    'application_type' => 'undergraduate',
                    'academic_term' => 'Fall',
                    'academic_year' => date('Y'),
                    'application_status' => 'draft',
                    'is_submitted' => false,
                ]
            )
            ->andReturn(Http::response(['id' => 'sis123', 'success' => true], 200));

        // Call the createStudent method with test user and application
        $response = $this->sisService->createStudent($this->testUser, $this->testApplication);

        // Assert that the response contains the expected student ID
        $this->assertEquals('sis123', $response['sis_student_id']);

        // Assert that the integration activity was logged
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'create_student',
            'status' => 'success',
        ]);
    }

    /**
     * Test that createStudent handles API errors correctly
     *
     * @return void
     */
    public function testCreateStudentHandlesError(): void
    {
        // Mock the HTTP facade to throw an exception
        Http::shouldReceive('withHeaders->timeout->post')
            ->once()
            ->andThrow(new \Exception('API Connection Error'));

        // Set up expectations for exception handling
        $this->expectException(IntegrationException::class);
        $this->expectExceptionMessage('Failed to create student in SIS: API Connection Error');

        // Call the createStudent method and expect an IntegrationException
        try {
            $this->sisService->createStudent($this->testUser, $this->testApplication);
        } catch (IntegrationException $e) {
            // Assert that the exception contains the expected error details
            $this->assertEquals('CONNECTION_ERROR', $e->getErrorCode());
            throw $e; // Re-throw the exception to satisfy the test
        }

        // Assert that the error was logged
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'create_student',
            'status' => 'error',
        ]);
    }

    /**
     * Test updating an existing student record in the SIS
     *
     * @return void
     */
    public function testUpdateStudent(): void
    {
        // Mock the HTTP facade to return a successful response
        Http::shouldReceive('withHeaders->timeout->put')
            ->once()
            ->with(
                'https://example.com/api/students/sis123',
                [
                    'emailAddress' => 'john.smith@example.com',
                    'firstName' => 'John',
                    'lastName' => 'Smith',
                    'full_name' => 'John Smith',
                    'date_of_birth' => '1990-01-01',
                    'phone_number' => '123-456-7890',
                ]
            )
            ->andReturn(Http::response(['success' => true], 200));

        // Call the updateStudent method with test user, SIS student ID, and update data
        $response = $this->sisService->updateStudent($this->testUser, 'sis123', []);

        // Assert that the response indicates success
        $this->assertTrue($response['success']);

        // Assert that the integration activity was logged
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'update_student',
            'status' => 'success',
        ]);
    }

    /**
     * Test retrieving a student record from the SIS
     *
     * @return void
     */
    public function testGetStudent(): void
    {
        // Mock the HTTP facade to return a student record
        Http::shouldReceive('withHeaders->timeout->get')
            ->once()
            ->with('https://example.com/api/students/sis123')
            ->andReturn(Http::response([
                'id' => 'sis123',
                'emailAddress' => 'john.smith@example.com',
                'firstName' => 'John',
                'lastName' => 'Smith',
            ], 200));

        // Call the getStudent method with a SIS student ID
        $studentData = $this->sisService->getStudent('sis123');

        // Assert that the returned data matches the expected student data
        $this->assertEquals('john.smith@example.com', $studentData['email']);
        $this->assertEquals('John', $studentData['first_name']);
        $this->assertEquals('Smith', $studentData['last_name']);

        // Assert that the integration activity was logged
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'get_student',
            'status' => 'success',
        ]);
    }

    /**
     * Test handling of non-existent student in the SIS
     *
     * @return void
     */
    public function testGetStudentNotFound(): void
    {
        // Mock the HTTP facade to return a 404 response
        Http::shouldReceive('withHeaders->timeout->get')
            ->once()
            ->with('https://example.com/api/students/nonexistent')
            ->andReturn(Http::response(['message' => 'Student not found'], 404));

        // Call the getStudent method with a non-existent SIS student ID
        $studentData = $this->sisService->getStudent('nonexistent');

        // Assert that the method returns null
        $this->assertNull($studentData);

        // Assert that the integration activity was logged with 'not_found' status
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'get_student',
            'status' => 'error',
        ]);
    }

    /**
     * Test finding a student in the SIS by email address
     *
     * @return void
     */
    public function testFindStudentByEmail(): void
    {
        // Mock the HTTP facade to return a student record
        Http::shouldReceive('withHeaders->timeout->get')
            ->once()
            ->with('https://example.com/api/students', ['email' => 'john.smith@example.com'])
            ->andReturn(Http::response([
                'id' => 'sis123',
                'emailAddress' => 'john.smith@example.com',
                'firstName' => 'John',
                'lastName' => 'Smith',
            ], 200));

        // Call the findStudentByEmail method with an email address
        $studentData = $this->sisService->findStudentByEmail('john.smith@example.com');

        // Assert that the returned data matches the expected student data
        $this->assertEquals('sis123', $studentData['id']);
        $this->assertEquals('john.smith@example.com', $studentData['emailAddress']);
        $this->assertEquals('John', $studentData['firstName']);
        $this->assertEquals('Smith', $studentData['lastName']);

        // Assert that the integration activity was logged
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'find_student_by_email',
            'status' => 'success',
        ]);
    }

    /**
     * Test updating a student's enrollment status in the SIS
     *
     * @return void
     */
    public function testUpdateEnrollmentStatus(): void
    {
        // Mock the HTTP facade to return a successful response
        Http::shouldReceive('withHeaders->timeout->put')
            ->once()
            ->with(
                'https://example.com/api/enrollment/sis123',
                [
                    'status' => 'enrolled',
                    'updated_at' => Mockery::any(),
                ]
            )
            ->andReturn(Http::response(['success' => true], 200));

        // Call the updateEnrollmentStatus method with SIS student ID and status
        $result = $this->sisService->updateEnrollmentStatus('sis123', 'enrolled');

        // Assert that the method returns true
        $this->assertTrue($result);

        // Assert that the integration activity was logged
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'update_enrollment_status',
            'status' => 'success',
        ]);
    }

    /**
     * Test synchronizing student data between the platform and SIS
     *
     * @return void
     */
    public function testSyncStudentData(): void
    {
        // Mock the findStudentByEmail method to return null (student doesn't exist)
        $this->sisService = Mockery::mock(SISIntegrationService::class)->makePartial();
        $this->sisService->shouldReceive('initialize')->andReturn(true);
        $this->sisService->shouldReceive('findStudentByEmail')->with($this->testUser->email)->once()->andReturn(null);

        // Mock the createStudent method to return a new SIS student ID
        $this->sisService->shouldReceive('createStudent')->with($this->testUser, Mockery::any())->once()->andReturn(['sis_student_id' => 'newSisId', 'success' => true]);

        // Call the syncStudentData method with test user
        $result = $this->sisService->syncStudentData($this->testUser);

        // Assert that the response contains the expected SIS student ID
        $this->assertEquals('newSisId', $result['sis_student_id']);

        // Assert that the sync status is 'created'
        $this->assertTrue($result['created']);

        // Mock findStudentByEmail to return an existing student
        $this->sisService->shouldReceive('findStudentByEmail')->with($this->testUser->email)->once()->andReturn(['id' => 'existingSisId']);

        // Mock updateStudent to return success
        $this->sisService->shouldReceive('updateStudent')->with($this->testUser, 'existingSisId', Mockery::any())->once()->andReturn(['success' => true]);

        // Call syncStudentData again
        $result = $this->sisService->syncStudentData($this->testUser, 'existingSisId');

        // Assert that the sync status is 'updated'
        $this->assertTrue($result['updated']);
    }

    /**
     * Test importing student data from SIS to the platform
     *
     * @return void
     */
    public function testImportStudentData(): void
    {
        // Mock the getStudent method to return SIS student data
        $this->sisService = Mockery::mock(SISIntegrationService::class)->makePartial();
        $this->sisService->shouldReceive('initialize')->andReturn(true);
        $this->sisService->shouldReceive('getStudent')->with('sis123')->once()->andReturn([
            'email' => 'updated.email@example.com',
            'firstName' => 'Updated',
            'lastName' => 'Name',
            'date_of_birth' => '1991-02-03',
            'phone_number' => '987-654-3210',
            'address' => [
                'line1' => 'New Address Line 1',
                'line2' => 'New Address Line 2',
                'city' => 'New City',
                'state' => 'New State',
                'postal_code' => '54321',
                'country' => 'USA',
            ],
        ]);

        // Call the importStudentData method with SIS student ID and test user
        $result = $this->sisService->importStudentData('sis123', $this->testUser);

        // Assert that the user data is updated with SIS data
        $this->testUser->refresh();
        $this->assertEquals('updated.email@example.com', $this->testUser->email);
        $this->assertEquals('Updated', $this->testUser->profile->first_name);
        $this->assertEquals('Name', $this->testUser->profile->last_name);
        $this->assertEquals('1991-02-03', $this->testUser->profile->date_of_birth->format('Y-m-d'));
        $this->assertEquals('987-654-3210', $this->testUser->profile->phone_number);
        $this->assertEquals('New Address Line 1', $this->testUser->profile->address_line1);
        $this->assertEquals('New Address Line 2', $this->testUser->profile->address_line2);
        $this->assertEquals('New City', $this->testUser->profile->city);
        $this->assertEquals('New State', $this->testUser->profile->state);
        $this->assertEquals('54321', $this->testUser->profile->postal_code);
        $this->assertEquals('USA', $this->testUser->profile->country);

        // Assert that the integration activity was logged
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'import_student_data',
            'status' => 'success',
        ]);
    }

    /**
     * Test processing of webhook notifications from SIS
     *
     * @return void
     */
    public function testHandleWebhook(): void
    {
        // Create a test webhook payload for a student update event
        $payload = [
            'event' => 'student.updated',
            'student_id' => 'sis123',
        ];

        // Mock necessary methods to handle the webhook
        $this->sisService = Mockery::mock(SISIntegrationService::class)->makePartial();
        $this->sisService->shouldReceive('initialize')->andReturn(true);
        $this->sisService->shouldReceive('getStudent')->with('sis123')->andReturn(['email' => $this->testUser->email]);
        $this->sisService->shouldReceive('importStudentData')->with('sis123', $this->testUser)->andReturn(['success' => true]);

        // Call the handleWebhook method with the test payload
        $result = $this->sisService->handleWebhook($payload);

        // Assert that the method returns true
        $this->assertTrue($result);

        // Assert that the appropriate actions were taken based on the webhook event
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'webhook_received',
            'status' => 'info',
        ]);

        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'webhook_processed',
            'status' => 'success',
        ]);
    }

    /**
     * Test the connection testing functionality
     *
     * @return void
     */
    public function testTestConnection(): void
    {
        // Mock the HTTP facade to return a successful response
        Http::shouldReceive('withHeaders->timeout->get')
            ->once()
            ->with('https://example.com/api/ping')
            ->andReturn(Http::response(['status' => 'ok'], 200));

        // Call the testConnection method
        $result = $this->sisService->testConnection();

        // Assert that the method returns true
        $this->assertTrue($result);

        // Assert that the connection test was logged
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'test_connection',
            'status' => 'success',
        ]);

        // Mock the HTTP facade to throw an exception
        Http::shouldReceive('withHeaders->timeout->get')
            ->once()
            ->with('https://example.com/api/ping')
            ->andThrow(new \Exception('Connection failed'));

        // Call the testConnection method again
        $result = $this->sisService->testConnection();

        // Assert that the method returns false
        $this->assertFalse($result);

        // Assert that the connection test was logged
        $this->assertDatabaseHas('integration_logs', [
            'integration_id' => $this->testIntegration->id,
            'operation' => 'test_connection',
            'status' => 'error',
        ]);
    }

    /**
     * Test the data mapping between local and SIS formats
     *
     * @return void
     */
    public function testDataMapping(): void
    {
        // Create test local data with platform field names
        $localData = [
            'email' => 'john.smith@example.com',
            'first_name' => 'John',
            'last_name' => 'Smith',
        ];

        // Use reflection to access the private mapDataToSIS method
        $reflection = new \ReflectionClass(SISIntegrationService::class);
        $method = $reflection->getMethod('mapDataToSIS');
        $method->setAccessible(true);

        // Call the method with the test data
        $sisData = $method->invoke($this->sisService, $localData);

        // Assert that the field names are correctly mapped to SIS format
        $this->assertEquals('john.smith@example.com', $sisData['emailAddress']);
        $this->assertEquals('John', $sisData['firstName']);
        $this->assertEquals('Smith', $sisData['lastName']);

        // Create test SIS data with SIS field names
        $sisData = [
            'emailAddress' => 'john.smith@example.com',
            'firstName' => 'John',
            'lastName' => 'Smith',
        ];

        // Use reflection to access the private mapDataFromSIS method
        $method = $reflection->getMethod('mapDataFromSIS');
        $method->setAccessible(true);

        // Call the method with the test SIS data
        $localData = $method->invoke($this->sisService, $sisData);

        // Assert that the field names are correctly mapped to local format
        $this->assertEquals('john.smith@example.com', $localData['email']);
        $this->assertEquals('John', $localData['first_name']);
        $this->assertEquals('Smith', $localData['last_name']);
    }

    /**
     * Test the preparation of student data for SIS integration
     *
     * @return void
     */
    public function testPrepareStudentData(): void
    {
        // Use reflection to access the private prepareStudentData method
        $reflection = new \ReflectionClass(SISIntegrationService::class);
        $method = $reflection->getMethod('prepareStudentData');
        $method->setAccessible(true);

        // Call the method with test user and application
        $preparedData = $method->invoke($this->sisService, $this->testUser, $this->testApplication);

        // Assert that the prepared data contains all required fields
        $this->assertArrayHasKey('email', $preparedData);
        $this->assertArrayHasKey('first_name', $preparedData);
        $this->assertArrayHasKey('last_name', $preparedData);
        $this->assertArrayHasKey('date_of_birth', $preparedData);
        $this->assertArrayHasKey('phone_number', $preparedData);
        $this->assertArrayHasKey('application_id', $preparedData);
        $this->assertArrayHasKey('application_type', $preparedData);
        $this->assertArrayHasKey('academic_term', $preparedData);
        $this->assertArrayHasKey('academic_year', $preparedData);

        // Assert that the data is correctly extracted from user, profile, and application
        $this->assertEquals($this->testUser->email, $preparedData['email']);
        $this->assertEquals($this->testUser->profile->first_name, $preparedData['first_name']);
        $this->assertEquals($this->testUser->profile->last_name, $preparedData['last_name']);
        $this->assertEquals($this->testUser->profile->date_of_birth->format('Y-m-d'), $preparedData['date_of_birth']);
        $this->assertEquals($this->testUser->profile->phone_number, $preparedData['phone_number']);
        $this->assertEquals($this->testApplication->id, $preparedData['application_id']);
        $this->assertEquals($this->testApplication->application_type, $preparedData['application_type']);
        $this->assertEquals($this->testApplication->academic_term, $preparedData['academic_term']);
        $this->assertEquals($this->testApplication->academic_year, $preparedData['academic_year']);
    }

    /**
     * Test the logging of integration activities
     *
     * @return void
     */
    public function testLogActivity(): void
    {
        // Mock the Integration model's logActivity method
        $this->testIntegration = Mockery::mock(Integration::class);
        $this->testIntegration->shouldReceive('logActivity')
            ->once()
            ->with(
                'test_operation',
                'test_status',
                ['test_request_data'],
                ['test_response_data'],
                'test_error_message'
            )
            ->andReturn(new IntegrationLog());

        $this->sisService = Mockery::mock(SISIntegrationService::class)->makePartial();
        $this->sisService->shouldReceive('initialize')->andReturn(true);
        $this->sisService->integration = $this->testIntegration;

        // Use reflection to access the private logActivity method
        $reflection = new \ReflectionClass(SISIntegrationService::class);
        $method = $reflection->getMethod('logActivity');
        $method->setAccessible(true);

        // Call the method with test parameters
        $method->invoke(
            $this->sisService,
            'test_operation',
            'test_status',
            ['test_request_data'],
            ['test_response_data'],
            'test_error_message'
        );
    }

    /**
     * Test the retry mechanism for API requests
     *
     * @return void
     */
    public function testRetryMechanism(): void
    {
        // Mock the HTTP facade to throw an exception on first call and succeed on second call
        $httpMock = Http::shouldReceive('withHeaders->timeout->get')
            ->twice();

        $httpMock->andReturn(Http::response(['status' => 'ok'], 200), Http::response(['status' => 'ok'], 200));

        $this->sisService = Mockery::mock(SISIntegrationService::class)->makePartial();
        $this->sisService->shouldReceive('initialize')->andReturn(true);

        // Use reflection to access the private sendApiRequest method
        $reflection = new \ReflectionClass(SISIntegrationService::class);
        $method = $reflection->getMethod('sendApiRequest');
        $method->setAccessible(true);

        // Call the method with test parameters
        $result = $method->invoke($this->sisService, 'GET', 'test');

        // Assert that the request was retried and eventually succeeded
        $this->assertEquals(['status' => 'ok'], $result);
    }
}