<?php

namespace Tests\Unit\Services;

use Illuminate\Foundation\Testing\RefreshDatabase; // -- illuminate/foundation/testing ^10.0
use Tests\TestCase; // -- path: src/backend/tests/TestCase.php
use App\Services\ApplicationService; // -- path: src/backend/app/Services/ApplicationService.php
use App\Services\DocumentService; // -- path: src/backend/app/Services/DocumentService.php
use App\Services\WorkflowEngineService; // -- path: src/backend/app/Services/WorkflowEngineService.php
use App\Services\NotificationService; // -- path: src/backend/app/Services/NotificationService.php
use App\Services\AuditService; // -- path: src/backend/app/Services/AuditService.php
use App\Models\Application; // -- path: src/backend/app/Models/Application.php
use App\Models\User; // -- path: src/backend/app/Models/User.php
use App\Models\ApplicationStatus; // -- path: src/backend/app/Models/ApplicationStatus.php
use App\Events\ApplicationSubmittedEvent; // -- path: src/backend/app/Events/ApplicationSubmittedEvent.php
use App\Events\ApplicationStatusChangedEvent; // -- path: src/backend/app/Events/ApplicationStatusChangedEvent.php
use App\Exceptions\ApplicationValidationException; // -- path: src/backend/app/Exceptions/ApplicationValidationException.php
use Mockery; // -- mockery/mockery ^1.5
use Illuminate\Support\Facades\Event; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\DB; // -- illuminate/support/facades ^10.0

class ApplicationServiceTest extends TestCase
{
    /**
     * The application service instance.
     *
     * @var ApplicationService
     */
    protected ApplicationService $applicationService;

    /**
     * The document service instance.
     *
     * @var DocumentService
     */
    protected DocumentService $documentService;

    /**
     * The workflow engine service instance.
     *
     * @var WorkflowEngineService
     */
    protected WorkflowEngineService $workflowEngine;

    /**
     * The notification service instance.
     *
     * @var NotificationService
     */
    protected NotificationService $notificationService;

    /**
     * The audit service instance.
     *
     * @var AuditService
     */
    protected AuditService $auditService;

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
        
        // Mock the DocumentService using mockService()
        $this->documentService = $this->mockService(DocumentService::class);

        // Mock the WorkflowEngineService using mockService()
        $this->workflowEngine = $this->mockService(WorkflowEngineService::class);

        // Mock the NotificationService using mockService()
        $this->notificationService = $this->mockService(NotificationService::class);

        // Mock the AuditService using mockService()
        $this->auditService = $this->mockService(AuditService::class);

        // Create a new ApplicationService instance with the mocked dependencies
        $this->applicationService = new ApplicationService(
            $this->documentService,
            $this->workflowEngine,
            $this->notificationService,
            $this->auditService
        );
    }

    /**
     * Test creating a new application
     *
     * @return void
     */
    public function testCreateApplication(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Set up expectations for the workflow engine mock to initialize a workflow
        $this->workflowEngine->shouldReceive('initializeApplicationWorkflow')
            ->once()
            ->with(Mockery::type(Application::class), $user)
            ->andReturn(true);

        // Set up expectations for the audit service mock to log the creation
        $this->auditService->shouldReceive('logCreate')
            ->once()
            ->with('application', Mockery::any(), Mockery::type('array'))
            ->andReturn(null);

        // Define test application data
        $applicationData = [
            'application_type' => 'undergraduate',
            'academic_term' => 'Fall',
            'academic_year' => date('Y'),
            'application_data' => ['key' => 'value'],
        ];

        // Call createApplication on the application service
        $application = $this->applicationService->createApplication(
            $user->id,
            $applicationData['application_type'],
            $applicationData['academic_term'],
            $applicationData['academic_year'],
            $applicationData['application_data']
        );

        // Assert that the returned application has the expected attributes
        $this->assertInstanceOf(Application::class, $application);
        $this->assertEquals($user->id, $application->user_id);
        $this->assertEquals($applicationData['application_type'], $application->application_type);
        $this->assertEquals($applicationData['academic_term'], $application->academic_term);
        $this->assertEquals($applicationData['academic_year'], $application->academic_year);
        $this->assertEquals($applicationData['application_data'], $application->application_data);

        // Assert that the application was created in the database
        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'user_id' => $user->id,
            'application_type' => $applicationData['application_type'],
            'academic_term' => $applicationData['academic_term'],
            'academic_year' => $applicationData['academic_year'],
        ]);
    }

    /**
     * Test updating an existing application
     *
     * @return void
     */
    public function testUpdateApplication(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Set up expectations for the audit service mock to log the update
        $this->auditService->shouldReceive('logUpdate')
            ->once()
            ->with('application', $application->id, Mockery::type('array'), Mockery::type('array'))
            ->andReturn(null);

        // Define test update data
        $updateData = ['new_key' => 'new_value'];

        // Call updateApplication on the application service
        $updatedApplication = $this->applicationService->updateApplication($application->id, $updateData, $user->id);

        // Assert that the returned application has the updated attributes
        $this->assertInstanceOf(Application::class, $updatedApplication);
        $this->assertEquals($updateData['new_key'], $updatedApplication->application_data['new_key']);

        // Assert that the application was updated in the database
        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'application_data' => json_encode(array_merge($application->application_data, $updateData)),
        ]);
    }

    /**
     * Test updating an application by an unauthorized user
     *
     * @return void
     */
    public function testUpdateApplicationUnauthorized(): void
    {
        // Create a test user
        $user1 = $this->createUser();

        // Create another test user
        $user2 = $this->createUser();

        // Create a test application for the first user
        $application = $this->createApplication($user1);

        // Define test update data
        $updateData = ['new_key' => 'new_value'];

        // Call updateApplication on the application service with the second user's ID
        $updatedApplication = $this->applicationService->updateApplication($application->id, $updateData, $user2->id);

        // Assert that the method returns null (unauthorized)
        $this->assertNull($updatedApplication);
    }

    /**
     * Test retrieving an application by ID
     *
     * @return void
     */
    public function testGetApplication(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Call getApplication on the application service
        $retrievedApplication = $this->applicationService->getApplication($application->id);

        // Assert that the returned application matches the created application
        $this->assertInstanceOf(Application::class, $retrievedApplication);
        $this->assertEquals($application->id, $retrievedApplication->id);
    }

    /**
     * Test retrieving an application by ID with user verification
     *
     * @return void
     */
    public function testGetApplicationWithUserId(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Call getApplication on the application service with the user ID
        $retrievedApplication = $this->applicationService->getApplication($application->id, $user->id);

        // Assert that the returned application matches the created application
        $this->assertInstanceOf(Application::class, $retrievedApplication);
        $this->assertEquals($application->id, $retrievedApplication->id);

        // Call getApplication with a different user ID
        $retrievedApplication = $this->applicationService->getApplication($application->id, $this->createUser()->id);

        // Assert that the method returns null (unauthorized)
        $this->assertNull($retrievedApplication);
    }

    /**
     * Test retrieving all applications for a user
     *
     * @return void
     */
    public function testGetUserApplications(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create multiple test applications for the user
        $application1 = $this->createApplication($user, ['application_type' => 'undergraduate', 'academic_term' => 'Fall', 'academic_year' => date('Y')]);
        $application2 = $this->createApplication($user, ['application_type' => 'graduate', 'academic_term' => 'Spring', 'academic_year' => date('Y') + 1]);

        // Call getUserApplications on the application service
        $applications = $this->applicationService->getUserApplications($user->id);

        // Assert that the returned collection contains all the user's applications
        $this->assertCount(2, $applications);
        $this->assertTrue($applications->contains($application1));
        $this->assertTrue($applications->contains($application2));

        // Test with filters (type, term, year, etc.)
        $filteredApplications = $this->applicationService->getUserApplications($user->id, ['type' => 'undergraduate']);
        $this->assertCount(1, $filteredApplications);
        $this->assertTrue($filteredApplications->contains($application1));
    }

    /**
     * Test submitting an application
     *
     * @return void
     */
    public function testSubmitApplication(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Set up mock for document service to return empty missing documents (application is complete)
        $this->documentService->shouldReceive('getMissingDocuments')
            ->once()
            ->with($application->id, null)
            ->andReturn([]);

        // Set up expectations for workflow engine to process automatic transitions
        $this->workflowEngine->shouldReceive('checkAutomaticTransitions')
            ->once()
            ->with($application)
            ->andReturn(true);

        // Set up expectations for notification service to send confirmation
        $this->notificationService->shouldReceive('send')
            ->once()
            ->with($user->id, 'application_submitted', 'Application Submitted', Mockery::any(), Mockery::any())
            ->andReturn(null);

        // Set up expectations for audit service to log the submission
        $this->auditService->shouldReceive('logUpdate')
            ->once()
            ->with('application', $application->id, Mockery::type('array'), Mockery::type('array'))
            ->andReturn(null);

        // Mock Event facade to expect ApplicationSubmittedEvent dispatch
        Event::fake([ApplicationSubmittedEvent::class]);

        // Call submitApplication on the application service
        $result = $this->applicationService->submitApplication($application->id, $user->id);

        // Assert that the method returns true (successful submission)
        $this->assertTrue($result);

        // Assert that the application is marked as submitted in the database
        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'is_submitted' => true,
        ]);

        // Assert that the submitted_at timestamp is set
        $application = Application::find($application->id);
        $this->assertNotNull($application->submitted_at);

        // Assert that the ApplicationSubmittedEvent was dispatched
        Event::assertDispatched(ApplicationSubmittedEvent::class, function ($event) use ($application) {
            return $event->application->id === $application->id;
        });
    }

    /**
     * Test submitting an incomplete application
     *
     * @return void
     */
    public function testSubmitIncompleteApplication(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Set up mock for document service to return missing documents (application is incomplete)
        $this->documentService->shouldReceive('getMissingDocuments')
            ->once()
            ->with($application->id, null)
            ->andReturn(['transcript']);

        // Call submitApplication on the application service
        $result = $this->applicationService->submitApplication($application->id, $user->id);

        // Assert that the method returns false (submission failed)
        $this->assertFalse($result);

        // Assert that the application is not marked as submitted in the database
        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'is_submitted' => false,
        ]);
    }

    /**
     * Test updating an application's status
     *
     * @return void
     */
    public function testUpdateApplicationStatus(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Create a test status
        $status = $this->createApplicationStatus($application, $user);

        // Set up expectations for workflow engine to process automatic transitions
        $this->workflowEngine->shouldReceive('checkAutomaticTransitions')
            ->once()
            ->with($application)
            ->andReturn(true);

        // Set up expectations for notification service to send status update
        $this->notificationService->shouldReceive('send')
            ->once()
            ->with($application->user_id, 'application_status_updated', 'Application Status Updated', Mockery::any(), Mockery::any())
            ->andReturn(null);

        // Set up expectations for audit service to log the status change
        $this->auditService->shouldReceive('logUpdate')
            ->once()
            ->with('application', $application->id, Mockery::type('array'), Mockery::type('array'))
            ->andReturn(null);

        // Mock Event facade to expect ApplicationStatusChangedEvent dispatch
        Event::fake([ApplicationStatusChangedEvent::class]);

        // Call updateApplicationStatus on the application service
        $result = $this->applicationService->updateApplicationStatus($application->id, $status->id, $user->id);

        // Assert that the method returns true (successful update)
        $this->assertTrue($result);

        // Assert that the application's status is updated in the database
        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'current_status_id' => $status->id,
        ]);

        // Assert that a new ApplicationStatus record is created
        $this->assertDatabaseHas('application_statuses', [
            'application_id' => $application->id,
            'status' => $status->id,
        ]);

        // Assert that the ApplicationStatusChangedEvent was dispatched
        Event::assertDispatched(ApplicationStatusChangedEvent::class, function ($event) use ($application, $status) {
            return $event->application->id === $application->id && $event->newStatus->id === $status->id;
        });
    }

    /**
     * Test retrieving required documents for an application
     *
     * @return void
     */
    public function testGetRequiredDocuments(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Set up mock for application to return required documents
        $this->documentService->shouldReceive('getRequiredDocuments')
            ->once()
            ->with($application->id, null)
            ->andReturn(['transcript', 'personal_statement']);

        // Call getRequiredDocuments on the application service
        $requiredDocuments = $this->applicationService->getRequiredDocuments($application->id);

        // Assert that the returned documents match the expected required documents
        $this->assertEquals(['transcript', 'personal_statement'], $requiredDocuments);
    }

    /**
     * Test retrieving missing documents for an application
     *
     * @return void
     */
    public function testGetMissingDocuments(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Set up mock for application to return missing documents
        $this->documentService->shouldReceive('getMissingDocuments')
            ->once()
            ->with($application->id, null)
            ->andReturn(['transcript', 'personal_statement']);

        // Call getMissingDocuments on the application service
        $missingDocuments = $this->applicationService->getMissingDocuments($application->id);

        // Assert that the returned documents match the expected missing documents
        $this->assertEquals(['transcript', 'personal_statement'], $missingDocuments);
    }

    /**
     * Test checking if an application is complete
     *
     * @return void
     */
    public function testCheckApplicationComplete(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Set up mock for application to return completion status
        $this->documentService->shouldReceive('checkApplicationComplete')
            ->once()
            ->with($application->id, null)
            ->andReturn(['is_complete' => true, 'missing_requirements' => []]);

        // Call checkApplicationComplete on the application service
        $completionStatus = $this->applicationService->checkApplicationComplete($application->id);

        // Assert that the returned status matches the expected completion status
        $this->assertEquals(['is_complete' => true, 'missing_requirements' => []], $completionStatus);

        // Test with both complete and incomplete applications
        $this->documentService->shouldReceive('checkApplicationComplete')
            ->once()
            ->with($application->id, null)
            ->andReturn(['is_complete' => false, 'missing_requirements' => ['transcript']]);

        $completionStatus = $this->applicationService->checkApplicationComplete($application->id);
        $this->assertEquals(['is_complete' => false, 'missing_requirements' => ['transcript']], $completionStatus);
    }

    /**
     * Test deleting an application
     *
     * @return void
     */
    public function testDeleteApplication(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Set up expectations for audit service to log the deletion
        $this->auditService->shouldReceive('logDelete')
            ->once()
            ->with('application', $application->id, Mockery::type('array'))
            ->andReturn(null);

        // Call deleteApplication on the application service
        $result = $this->applicationService->deleteApplication($application->id, $user->id);

        // Assert that the method returns true (successful deletion)
        $this->assertTrue($result);

        // Assert that the application is deleted from the database
        $this->assertDatabaseMissing('applications', ['id' => $application->id]);
    }

    /**
     * Test attempting to delete a submitted application
     *
     * @return void
     */
    public function testDeleteSubmittedApplication(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a submitted test application for the user
        $application = $this->createSubmittedApplication($user);

        // Call deleteApplication on the application service
        $result = $this->applicationService->deleteApplication($application->id, $user->id);

        // Assert that the method returns false (deletion failed)
        $this->assertFalse($result);

        // Assert that the application still exists in the database
        $this->assertDatabaseHas('applications', ['id' => $application->id]);
    }

    /**
     * Test validating application data
     *
     * @return void
     */
    public function testValidateApplicationData(): void
    {
        // Define valid application data
        $validData = ['name' => 'John Doe', 'email' => 'john.doe@example.com'];

        // Call validateApplicationData on the application service
        $result = $this->applicationService->validateApplicationData('undergraduate', $validData);

        // Assert that the method returns true for valid data
        $this->assertTrue($result);

        // Define invalid application data
        $invalidData = ['name' => '', 'email' => 'invalid-email'];

        // Set up expectation for ApplicationValidationException to be thrown
        $this->expectException(ApplicationValidationException::class);

        // Call validateApplicationData with invalid data
        $this->applicationService->validateApplicationData('undergraduate', $invalidData);

        // Assert that the exception is thrown with validation errors
        $this->expectExceptionMessage('Application data validation failed');
    }

    /**
     * Test searching for applications with criteria
     *
     * @return void
     */
    public function testSearchApplications(): void
    {
        // Create multiple test applications with different attributes
        $user1 = $this->createUser(['email' => 'john.doe@example.com']);
        $user2 = $this->createUser(['email' => 'jane.doe@example.com']);

        $application1 = $this->createApplication($user1, ['application_type' => 'undergraduate', 'academic_term' => 'Fall', 'academic_year' => date('Y')]);
        $application2 = $this->createApplication($user2, ['application_type' => 'graduate', 'academic_term' => 'Spring', 'academic_year' => date('Y') + 1]);

        // Define search criteria
        $criteria = ['type' => 'undergraduate'];

        // Call searchApplications on the application service
        $results = $this->applicationService->searchApplications($criteria);

        // Assert that the returned results match the expected applications
        $this->assertCount(2, $results);
        $this->assertTrue($results->contains($application1));

        // Test with different criteria combinations
        $criteria = ['user_id' => $user1->id];
        $results = $this->applicationService->searchApplications($criteria);
        $this->assertCount(2, $results);
        $this->assertTrue($results->contains($application1));

        // Test pagination functionality
        $results = $this->applicationService->searchApplications([], 1, 1);
        $this->assertCount(1, $results);
    }

    /**
     * Test retrieving application statistics
     *
     * @return void
     */
    public function testGetApplicationStatistics(): void
    {
        // Create multiple test applications with different attributes
        $user1 = $this->createUser();
        $user2 = $this->createUser();

        $application1 = $this->createApplication($user1, ['application_type' => 'undergraduate', 'is_submitted' => true]);
        $application2 = $this->createApplication($user2, ['application_type' => 'graduate', 'is_submitted' => false]);

        // Call getApplicationStatistics on the application service
        $statistics = $this->applicationService->getApplicationStatistics();

        // Assert that the returned statistics match the expected values
        $this->assertEquals(2, $statistics['total_applications']);
        $this->assertEquals(1, $statistics['submitted_applications']);
        $this->assertEquals(1, $statistics['draft_applications']);

        // Test with different filter combinations
        $statistics = $this->applicationService->getApplicationStatistics(['type' => 'undergraduate']);
        $this->assertEquals(1, $statistics['total_applications']);
        $this->assertEquals(1, $statistics['submitted_applications']);
        $this->assertEquals(0, $statistics['draft_applications']);
    }

    /**
     * Test retrieving an application's status timeline
     *
     * @return void
     */
    public function testGetApplicationTimeline(): void
    {
        // Create a test user
        $user = $this->createUser();

        // Create a test application for the user
        $application = $this->createApplication($user);

        // Create multiple status records for the application
        $status1 = $this->createApplicationStatus($application, $user, ['status' => 'draft']);
        $status2 = $this->createApplicationStatus($application, $user, ['status' => 'submitted']);

        // Call getApplicationTimeline on the application service
        $timeline = $this->applicationService->getApplicationTimeline($application->id);

        // Assert that the returned timeline contains all status records in the correct order
        $this->assertCount(2, $timeline);
        $this->assertEquals($status2->id, $timeline[0]->id);
        $this->assertEquals($status1->id, $timeline[1]->id);
    }

    /**
     * Test updating the status of multiple applications at once
     *
     * @return void
     */
    public function testBulkUpdateApplicationStatus(): void
    {
        // Create multiple test applications
        $user = $this->createUser();
        $application1 = $this->createApplication($user);
        $application2 = $this->createApplication($user);
        $applicationIds = [$application1->id, $application2->id];

        // Create a test status
        $status = $this->createApplicationStatus($application1, $user);

        // Set up expectations for workflow engine, notification service, and audit service
        $this->workflowEngine->shouldReceive('checkAutomaticTransitions')
            ->twice()
            ->with(Mockery::type(Application::class))
            ->andReturn(true);

        $this->notificationService->shouldReceive('send')
            ->twice()
            ->with(Mockery::any(), 'application_status_updated', 'Application Status Updated', Mockery::any(), Mockery::any())
            ->andReturn(null);

        $this->auditService->shouldReceive('logUpdate')
            ->twice()
            ->with('application', Mockery::any(), Mockery::type('array'), Mockery::type('array'))
            ->andReturn(null);

        // Call bulkUpdateApplicationStatus on the application service
        $updatedCount = $this->applicationService->bulkUpdateApplicationStatus($applicationIds, $status->id, $user->id);

        // Assert that the method returns the correct count of updated applications
        $this->assertEquals(2, $updatedCount);

        // Assert that all applications have the updated status in the database
        $this->assertDatabaseHas('applications', [
            'id' => $application1->id,
            'current_status_id' => $status->id,
        ]);
        $this->assertDatabaseHas('applications', [
            'id' => $application2->id,
            'current_status_id' => $status->id,
        ]);
    }
}