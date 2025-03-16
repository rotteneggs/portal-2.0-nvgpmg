<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase; // Laravel ^10.0
use Illuminate\Foundation\Testing\WithFaker; // Laravel ^10.0
use App\Models\Application;
use App\Models\User;
use App\Services\ApplicationService;
use App\Services\DocumentService;
use App\Services\WorkflowEngineService;
use App\Services\NotificationService;
use Tests\TestCase;
use Mockery; // Mockery ^1.5

class ApplicationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Set up the test environment before each test
     *
     * @return void
     */
    protected function setUp(): void
    {
        parent::setUp();
        // Additional setup tasks specific to application tests can be added here
    }

    /**
     * Clean up the test environment after each test
     *
     * @return void
     */
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Test that a user can retrieve their applications
     *
     * @return void
     */
    public function test_can_get_user_applications(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create multiple applications for the user
        $this->createApplication($user, ['application_type' => 'undergraduate']);
        $this->createApplication($user, ['application_type' => 'graduate']);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to /api/v1/applications
        $response = $this->getJson('/api/v1/applications');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected applications
        $response->assertJsonCount(2, 'data');

        // Assert that the response has the correct JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'user_id',
                    'application_type',
                    'academic_term',
                    'academic_year',
                    'current_status_id',
                    'application_data',
                    'is_submitted',
                    'submitted_at',
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
     * Test that applications can be filtered by type
     *
     * @return void
     */
    public function test_can_filter_applications_by_type(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create applications of different types for the user
        $this->createApplication($user, ['application_type' => 'undergraduate']);
        $this->createApplication($user, ['application_type' => 'graduate']);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to /api/v1/applications?type=undergraduate
        $response = $this->getJson('/api/v1/applications?type=undergraduate');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response only contains undergraduate applications
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['application_type' => 'undergraduate']);

        // Make a GET request to /api/v1/applications?type=graduate
        $response = $this->getJson('/api/v1/applications?type=graduate');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response only contains graduate applications
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['application_type' => 'graduate']);
    }

    /**
     * Test that applications can be filtered by academic term
     *
     * @return void
     */
    public function test_can_filter_applications_by_term(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create applications for different academic terms
        $this->createApplication($user, ['academic_term' => 'Fall', 'academic_year' => '2023-2024']);
        $this->createApplication($user, ['academic_term' => 'Spring', 'academic_year' => '2024-2025']);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to /api/v1/applications?term=Fall&year=2023-2024
        $response = $this->getJson('/api/v1/applications?term=Fall&year=2023-2024');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response only contains applications for Fall 2023-2024
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['academic_term' => 'Fall', 'academic_year' => '2023-2024']);
    }

    /**
     * Test that a user can create a new application
     *
     * @return void
     */
    public function test_can_create_new_application(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Authenticate as the user
        $this->actingAs($user);

        // Prepare application data
        $applicationData = [
            'application_type' => 'undergraduate',
            'academic_term' => 'Fall',
            'academic_year' => '2023-2024',
            'application_data' => [
                'personal_info' => [
                    'first_name' => 'John',
                    'last_name' => 'Doe',
                ],
            ],
        ];

        // Make a POST request to /api/v1/applications with the application data
        $response = $this->postJson('/api/v1/applications', $applicationData);

        // Assert that the response has a 201 status code
        $response->assertStatus(201);

        // Assert that the response contains the created application
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'user_id',
                'application_type',
                'academic_term',
                'academic_year',
                'current_status_id',
                'application_data',
                'is_submitted',
                'submitted_at',
                'created_at',
                'updated_at',
            ],
        ]);

        // Assert that the application was stored in the database
        $this->assertDatabaseHas('applications', [
            'user_id' => $user->id,
            'application_type' => 'undergraduate',
            'academic_term' => 'Fall',
            'academic_year' => '2023-2024',
        ]);
    }

    /**
     * Test that application creation fails with invalid data
     *
     * @return void
     */
    public function test_cannot_create_application_with_invalid_data(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Authenticate as the user
        $this->actingAs($user);

        // Prepare invalid application data (missing required fields)
        $applicationData = [
            'application_type' => '', // Missing
            'academic_term' => '', // Missing
            'academic_year' => '', // Missing
        ];

        // Make a POST request to /api/v1/applications with the invalid data
        $response = $this->postJson('/api/v1/applications', $applicationData);

        // Assert that the response has a 422 status code
        $response->assertStatus(422);

        // Assert that the response contains validation error messages
        $response->assertJsonStructure([
            'success',
            'error' => [
                'code',
                'message',
                'details',
            ],
        ]);
    }

    /**
     * Test that a user can retrieve a specific application
     *
     * @return void
     */
    public function test_can_get_specific_application(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to /api/v1/applications/{id}
        $response = $this->getJson('/api/v1/applications/' . $application->id);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected application
        $response->assertJsonFragment(['id' => $application->id]);

        // Assert that the response has the correct JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'user_id',
                'application_type',
                'academic_term',
                'academic_year',
                'current_status_id',
                'application_data',
                'is_submitted',
                'submitted_at',
                'created_at',
                'updated_at',
            ],
        ]);
    }

    /**
     * Test that a user cannot access another user's application
     *
     * @return void
     */
    public function test_cannot_access_another_users_application(): void
    {
        // Create two test users
        $user1 = $this->createUser();
        $user2 = $this->createUser();

        // Create an application for the first user
        $application = $this->createApplication($user1);

        // Authenticate as the second user
        $this->actingAs($user2);

        // Make a GET request to /api/v1/applications/{id} for the first user's application
        $response = $this->getJson('/api/v1/applications/' . $application->id);

        // Assert that the response has a 403 or 404 status code
        $response->assertStatus(403);
    }

    /**
     * Test that a user can update their application
     *
     * @return void
     */
    public function test_can_update_application(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Authenticate as the user
        $this->actingAs($user);

        // Prepare updated application data
        $updatedData = [
            'application_data' => [
                'personal_info' => [
                    'first_name' => 'Jane',
                    'last_name' => 'Doe',
                ],
            ],
        ];

        // Make a PUT request to /api/v1/applications/{id} with the updated data
        $response = $this->putJson('/api/v1/applications/' . $application->id, $updatedData);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the updated application
        $response->assertJsonFragment(['application_data' => ['personal_info' => ['first_name' => 'Jane']]]);

        // Assert that the application was updated in the database
        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'application_data' => json_encode(['personal_info' => ['first_name' => 'Jane', 'last_name' => 'Doe']]),
        ]);
    }

    /**
     * Test that a submitted application cannot be updated
     *
     * @return void
     */
    public function test_cannot_update_submitted_application(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a submitted application for the user
        $application = $this->createSubmittedApplication($user);

        // Authenticate as the user
        $this->actingAs($user);

        // Prepare updated application data
        $updatedData = [
            'application_data' => [
                'personal_info' => [
                    'first_name' => 'Jane',
                    'last_name' => 'Doe',
                ],
            ],
        ];

        // Make a PUT request to /api/v1/applications/{id} with the updated data
        $response = $this->putJson('/api/v1/applications/' . $application->id, $updatedData);

        // Assert that the response has a 422 or 403 status code
        $response->assertStatus(422);

        // Assert that the response contains an error message about submitted applications
        $response->assertJsonStructure([
            'success',
            'error' => [
                'code',
                'message',
                'details',
            ],
        ]);

        // Assert that the application still exists in the database
        $this->assertDatabaseHas('applications', ['id' => $application->id]);
    }

    /**
     * Test that a user can submit their application
     *
     * @return void
     */
    public function test_can_submit_application(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a complete application for the user
        $application = $this->createApplication($user);

        // Create all required documents for the application
        $this->createDocument($user, $application);
        $this->createDocument($user, $application, ['document_type' => 'personal_statement']);
        $this->createDocument($user, $application, ['document_type' => 'recommendation_letter']);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a POST request to /api/v1/applications/{id}/submit
        $response = $this->postJson('/api/v1/applications/' . $application->id . '/submit');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response indicates successful submission
        $response->assertJson(['success' => true]);

        // Assert that the application is marked as submitted in the database
        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'is_submitted' => true,
        ]);
    }

    /**
     * Test that an incomplete application cannot be submitted
     *
     * @return void
     */
    public function test_cannot_submit_incomplete_application(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create an incomplete application for the user (missing required documents)
        $application = $this->createApplication($user);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a POST request to /api/v1/applications/{id}/submit
        $response = $this->postJson('/api/v1/applications/' . $application->id . '/submit');

        // Assert that the response has a 422 status code
        $response->assertStatus(422);

        // Assert that the response contains an error message about incomplete application
        $response->assertJsonStructure([
            'success',
            'error' => [
                'code',
                'message',
                'details',
            ],
        ]);
    }

    /**
     * Test that a user can delete a draft application
     *
     * @return void
     */
    public function test_can_delete_draft_application(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a draft application for the user
        $application = $this->createApplication($user);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a DELETE request to /api/v1/applications/{id}
        $response = $this->deleteJson('/api/v1/applications/' . $application->id);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the application is removed from the database
        $this->assertDatabaseMissing('applications', ['id' => $application->id]);
    }

    /**
     * Test that a submitted application cannot be deleted
     *
     * @return void
     */
    public function test_cannot_delete_submitted_application(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a submitted application for the user
        $application = $this->createSubmittedApplication($user);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a DELETE request to /api/v1/applications/{id}
        $response = $this->deleteJson('/api/v1/applications/' . $application->id);

        // Assert that the response has a 422 or 403 status code
        $response->assertStatus(422);

        // Assert that the response contains an error message about submitted applications
        $response->assertJsonStructure([
            'success',
            'error' => [
                'code',
                'message',
                'details',
            ],
        ]);

        // Assert that the application still exists in the database
        $this->assertDatabaseHas('applications', ['id' => $application->id]);
    }

    /**
     * Test that a user can get the list of required documents for an application
     *
     * @return void
     */
    public function test_can_get_required_documents(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to /api/v1/applications/{id}/required-documents
        $response = $this->getJson('/api/v1/applications/' . $application->id . '/required-documents');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the list of required documents
        $response->assertJsonStructure([
            'success',
            'data' => [],
        ]);

        // Assert that the list matches the expected document types for the application type
        $expectedDocuments = ['transcript', 'personal_statement', 'recommendation_letter'];
        $response->assertJson(['data' => $expectedDocuments]);
    }

    /**
     * Test that a user can get the list of missing documents for an application
     *
     * @return void
     */
    public function test_can_get_missing_documents(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create some but not all required documents for the application
        $this->createDocument($user, $application);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to /api/v1/applications/{id}/missing-documents
        $response = $this->getJson('/api/v1/applications/' . $application->id . '/missing-documents');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the list of missing documents
        $response->assertJsonStructure([
            'success',
            'data' => [],
        ]);

        // Assert that the list only includes document types that haven't been uploaded
        $missingDocuments = ['personal_statement', 'recommendation_letter'];
        $response->assertJson(['data' => $missingDocuments]);
    }

    /**
     * Test that a user can check if their application is complete
     *
     * @return void
     */
    public function test_can_check_application_completeness(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create all required documents for the application
        $this->createDocument($user, $application);
        $this->createDocument($user, $application, ['document_type' => 'personal_statement']);
        $this->createDocument($user, $application, ['document_type' => 'recommendation_letter']);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to /api/v1/applications/{id}/check-complete
        $response = $this->getJson('/api/v1/applications/' . $application->id . '/check-complete');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response indicates the application is complete
        $response->assertJson(['success' => true, 'data' => ['is_complete' => true, 'missing_requirements' => []]]);

        // Remove a required document
        $application->documents()->where('document_type', 'transcript')->delete();

        // Make another GET request to /api/v1/applications/{id}/check-complete
        $response = $this->getJson('/api/v1/applications/' . $application->id . '/check-complete');

        // Assert that the response now indicates the application is incomplete
        $response->assertJson(['success' => true, 'data' => ['is_complete' => false]]);

        // Assert that the response lists the missing document
        $response->assertJsonFragment(['missing_requirements' => ['transcript']]);
    }

    /**
     * Test that a user can get the status timeline for their application
     *
     * @return void
     */
    public function test_can_get_application_timeline(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create an application for the user with multiple status changes
        $application = $this->createApplication($user);
        $status1 = $this->createApplicationStatus($application, $user, ['status' => 'draft']);
        $status2 = $this->createApplicationStatus($application, $user, ['status' => 'submitted']);
        $application->update(['current_status_id' => $status2->id]);

        // Authenticate as the user
        $this->actingAs($user);

        // Make a GET request to /api/v1/applications/{id}/timeline
        $response = $this->getJson('/api/v1/applications/' . $application->id . '/timeline');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the status timeline
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'application_id',
                    'workflow_stage_id',
                    'status',
                    'notes',
                    'created_by_user_id',
                    'created_at',
                    'workflow_stage' => [
                        'id',
                        'workflow_id',
                        'name',
                        'description',
                        'sequence',
                    ],
                ],
            ],
        ]);

        // Assert that the timeline includes all status changes in chronological order
        $response->assertJsonCount(2, 'data');
        $response->assertJsonFragment(['status' => 'draft']);
        $response->assertJsonFragment(['status' => 'submitted']);
    }

    /**
     * Test the integration between ApplicationController and ApplicationService
     *
     * @return void
     */
    public function test_application_service_integration(): void
    {
        // Mock the ApplicationService
        $applicationServiceMock = Mockery::mock(ApplicationService::class);

        // Configure the mock to expect specific method calls and return test data
        $applicationServiceMock->shouldReceive('getUserApplications')
            ->once()
            ->andReturn(collect([
                (object) ['id' => 1, 'application_type' => 'undergraduate'],
                (object) ['id' => 2, 'application_type' => 'graduate'],
            ]));

        // Create a test user
        $user = $this->createUser();

        // Authenticate as the user
        $this->actingAs($user);

        // Replace the ApplicationService in the container with the mock
        $this->app->instance(ApplicationService::class, $applicationServiceMock);

        // Make API requests that should use the ApplicationService
        $response = $this->getJson('/api/v1/applications');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the expected applications
        $response->assertJsonCount(2, 'data');

        // Verify that the expected service methods were called with correct parameters
        $applicationServiceMock->shouldHaveReceived('getUserApplications', [$user->id]);
    }
}