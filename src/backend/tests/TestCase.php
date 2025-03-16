<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase; // Laravel ^10.0
use Illuminate\Foundation\Testing\RefreshDatabase; // Laravel ^10.0
use Illuminate\Foundation\Testing\WithFaker; // Laravel ^10.0
use App\Models\User;
use App\Models\Application;
use App\Models\Document;
use App\Models\ApplicationStatus;
use App\Models\Role;
use App\Models\Permission;
use Mockery; // Mockery ^1.5
use Carbon\Carbon; // Carbon ^2.0
use Illuminate\Support\Facades\Storage; // Laravel ^10.0
use Illuminate\Support\Facades\Hash; // Laravel ^10.0
use Illuminate\Support\Facades\Event; // Laravel ^10.0
use Illuminate\Support\Facades\Notification; // Laravel ^10.0

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Indicates whether the default seeder should run before each test.
     */
    protected bool $seed = false;

    /**
     * The base URL to use while testing the application.
     */
    protected string $baseUrl = 'http://localhost';

    /**
     * Creates the Laravel application for testing.
     *
     * @return \Illuminate\Foundation\Application
     */
    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';
        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        return $app;
    }

    /**
     * Set up the test environment before each test.
     *
     * @return void
     */
    protected function setUp(): void
    {
        parent::setUp();
        
        // You can add common setup code here like mocking commonly used services
        // or setting up initial data needed by most tests
    }

    /**
     * Clean up the test environment after each test.
     *
     * @return void
     */
    protected function tearDown(): void
    {
        // Close and verify all Mockery expectations
        Mockery::close();
        
        parent::tearDown();
    }

    /**
     * Create a test user with optional attributes.
     *
     * @param array $attributes
     * @param string|null $role
     * @return \App\Models\User
     */
    protected function createUser(array $attributes = [], string $role = null)
    {
        $defaultAttributes = [
            'email' => $this->faker->unique()->safeEmail(),
            'password' => Hash::make('password'),
            'is_active' => true,
            'email_verified_at' => now(),
        ];
        
        $user = User::create(array_merge($defaultAttributes, $attributes));
        
        // Create a user profile
        $user->profile()->create([
            'first_name' => $attributes['first_name'] ?? $this->faker->firstName(),
            'last_name' => $attributes['last_name'] ?? $this->faker->lastName(),
            'date_of_birth' => $attributes['date_of_birth'] ?? $this->faker->date(),
            'phone_number' => $attributes['phone_number'] ?? $this->faker->phoneNumber(),
        ]);
        
        // Assign the specified role to the user if provided
        if ($role) {
            $user->assignRole($role);
        }
        
        return $user;
    }

    /**
     * Create a test user with administrator role.
     *
     * @param array $attributes
     * @return \App\Models\User
     */
    protected function createAdminUser(array $attributes = [])
    {
        return $this->createUser($attributes, 'administrator');
    }

    /**
     * Create a test user with staff role.
     *
     * @param array $attributes
     * @return \App\Models\User
     */
    protected function createStaffUser(array $attributes = [])
    {
        return $this->createUser($attributes, 'staff');
    }

    /**
     * Create a test application with optional attributes.
     *
     * @param \App\Models\User $user
     * @param array $attributes
     * @return \App\Models\Application
     */
    protected function createApplication(User $user, array $attributes = [])
    {
        $defaultAttributes = [
            'user_id' => $user->id,
            'application_type' => 'undergraduate',
            'academic_term' => 'Fall',
            'academic_year' => date('Y'),
            'application_data' => [
                'personal_info' => [
                    'first_name' => $user->profile->first_name,
                    'last_name' => $user->profile->last_name,
                    'date_of_birth' => $user->profile->date_of_birth,
                ],
                'contact_info' => [
                    'email' => $user->email,
                    'phone' => $user->profile->phone_number,
                ],
            ],
            'is_submitted' => false,
        ];
        
        $application = Application::create(array_merge($defaultAttributes, $attributes));
        
        // Create an initial application status
        $initialStatus = $this->createApplicationStatus($application, $user, [
            'status' => 'draft',
        ]);
        
        $application->update(['current_status_id' => $initialStatus->id]);
        
        return $application;
    }

    /**
     * Create a test application that has been submitted.
     *
     * @param \App\Models\User $user
     * @param array $attributes
     * @return \App\Models\Application
     */
    protected function createSubmittedApplication(User $user, array $attributes = [])
    {
        $application = $this->createApplication($user, $attributes);
        $application->is_submitted = true;
        $application->submitted_at = now();
        $application->save();
        
        // Update the status to 'submitted'
        $submittedStatus = $this->createApplicationStatus($application, $user, [
            'status' => 'submitted',
        ]);
        
        $application->update(['current_status_id' => $submittedStatus->id]);
        
        return $application;
    }

    /**
     * Create a test document with optional attributes.
     *
     * @param \App\Models\User $user
     * @param \App\Models\Application $application
     * @param array $attributes
     * @return \App\Models\Document
     */
    protected function createDocument(User $user, Application $application, array $attributes = [])
    {
        $defaultAttributes = [
            'user_id' => $user->id,
            'application_id' => $application->id,
            'document_type' => 'transcript',
            'file_name' => 'transcript.pdf',
            'file_path' => 'documents/' . $user->id . '/' . $this->faker->uuid() . '.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => $this->faker->numberBetween(100000, 5000000),
            'is_verified' => false,
        ];
        
        return Document::create(array_merge($defaultAttributes, $attributes));
    }

    /**
     * Create a test document that has been verified.
     *
     * @param \App\Models\User $user
     * @param \App\Models\Application $application
     * @param \App\Models\User $verifier
     * @param array $attributes
     * @return \App\Models\Document
     */
    protected function createVerifiedDocument(User $user, Application $application, User $verifier, array $attributes = [])
    {
        $document = $this->createDocument($user, $application, $attributes);
        
        $document->is_verified = true;
        $document->verified_at = now();
        $document->verified_by_user_id = $verifier->id;
        $document->save();
        
        // Create a document verification record
        $document->verifications()->create([
            'verification_method' => 'manual',
            'verification_status' => 'verified',
            'verified_by_user_id' => $verifier->id,
            'confidence_score' => 1.0,
            'notes' => 'Verified during test',
        ]);
        
        return $document;
    }

    /**
     * Create a test application status with optional attributes.
     *
     * @param \App\Models\Application $application
     * @param \App\Models\User $user
     * @param array $attributes
     * @return \App\Models\ApplicationStatus
     */
    protected function createApplicationStatus(Application $application, User $user, array $attributes = [])
    {
        $defaultAttributes = [
            'application_id' => $application->id,
            'status' => 'draft',
            'created_by_user_id' => $user->id,
        ];
        
        return ApplicationStatus::create(array_merge($defaultAttributes, $attributes));
    }

    /**
     * Create a test workflow with optional attributes.
     *
     * @param \App\Models\User $creator
     * @param array $attributes
     * @return \App\Models\Workflow
     */
    protected function createWorkflow(User $creator, array $attributes = [])
    {
        $defaultAttributes = [
            'name' => 'Test Workflow',
            'description' => 'A test workflow for admissions process',
            'application_type' => 'undergraduate',
            'is_active' => true,
            'created_by_user_id' => $creator->id,
        ];
        
        return \App\Models\Workflow::create(array_merge($defaultAttributes, $attributes));
    }

    /**
     * Create a test workflow stage with optional attributes.
     *
     * @param \App\Models\Workflow $workflow
     * @param array $attributes
     * @return \App\Models\WorkflowStage
     */
    protected function createWorkflowStage(\App\Models\Workflow $workflow, array $attributes = [])
    {
        $defaultAttributes = [
            'workflow_id' => $workflow->id,
            'name' => 'Test Stage',
            'description' => 'A test workflow stage',
            'sequence' => $attributes['sequence'] ?? 1,
            'required_documents' => ['transcript', 'personal_statement'],
            'required_actions' => ['review_documents'],
            'notification_triggers' => [
                'on_enter' => ['applicant', 'staff'],
                'on_complete' => ['applicant'],
            ],
        ];
        
        return \App\Models\WorkflowStage::create(array_merge($defaultAttributes, $attributes));
    }

    /**
     * Create a test workflow transition with optional attributes.
     *
     * @param \App\Models\WorkflowStage $sourceStage
     * @param \App\Models\WorkflowStage $targetStage
     * @param array $attributes
     * @return \App\Models\WorkflowTransition
     */
    protected function createWorkflowTransition(\App\Models\WorkflowStage $sourceStage, \App\Models\WorkflowStage $targetStage, array $attributes = [])
    {
        $defaultAttributes = [
            'source_stage_id' => $sourceStage->id,
            'target_stage_id' => $targetStage->id,
            'name' => 'Test Transition',
            'description' => 'A test workflow transition',
            'transition_conditions' => ['documents_verified' => true],
            'is_automatic' => false,
        ];
        
        return \App\Models\WorkflowTransition::create(array_merge($defaultAttributes, $attributes));
    }

    /**
     * Create a test message with optional attributes.
     *
     * @param \App\Models\User $sender
     * @param \App\Models\User $recipient
     * @param array $attributes
     * @return \App\Models\Message
     */
    protected function createMessage(User $sender, User $recipient, array $attributes = [])
    {
        $defaultAttributes = [
            'sender_user_id' => $sender->id,
            'recipient_user_id' => $recipient->id,
            'subject' => 'Test Message',
            'message_body' => 'This is a test message body',
            'is_read' => false,
        ];
        
        return \App\Models\Message::create(array_merge($defaultAttributes, $attributes));
    }

    /**
     * Create a test payment with optional attributes.
     *
     * @param \App\Models\User $user
     * @param \App\Models\Application $application
     * @param array $attributes
     * @return \App\Models\Payment
     */
    protected function createPayment(User $user, Application $application, array $attributes = [])
    {
        $defaultAttributes = [
            'user_id' => $user->id,
            'application_id' => $application->id,
            'payment_type' => 'application_fee',
            'amount' => 75.00,
            'currency' => 'USD',
            'payment_method' => 'credit_card',
            'status' => 'pending',
        ];
        
        return \App\Models\Payment::create(array_merge($defaultAttributes, $attributes));
    }

    /**
     * Create a mock for a service class.
     *
     * @param string $class
     * @param array $methods
     * @return \Mockery\MockInterface
     */
    protected function mockService(string $class, array $methods = [])
    {
        $mock = Mockery::mock($class);
        
        foreach ($methods as $method => $returnValue) {
            if (is_callable($returnValue)) {
                $mock->shouldReceive($method)->andReturnUsing($returnValue);
            } else {
                $mock->shouldReceive($method)->andReturn($returnValue);
            }
        }
        
        $this->app->instance($class, $mock);
        
        return $mock;
    }

    /**
     * Set the currently logged in user for the application.
     *
     * @param \App\Models\User $user
     * @param string|null $guard
     * @return $this
     */
    public function actingAs($user, $guard = null)
    {
        return parent::actingAs($user, $guard);
    }

    /**
     * Set up a fake storage disk for testing file uploads.
     *
     * @param string $disk
     * @return \Illuminate\Contracts\Filesystem\Filesystem
     */
    protected function fakeStorage(string $disk = 'public')
    {
        return Storage::fake($disk);
    }

    /**
     * Fake all events except for the given array.
     *
     * @param array $eventsToAllow
     * @return void
     */
    protected function fakeEvents(array $eventsToAllow = [])
    {
        Event::fake($eventsToAllow);
    }

    /**
     * Fake all notifications.
     *
     * @return void
     */
    protected function fakeNotifications()
    {
        Notification::fake();
    }

    /**
     * Assert that the response has a given JSON structure.
     *
     * @param array $structure
     * @return $this
     */
    public function assertJsonStructure(array $structure)
    {
        $this->response->assertJsonStructure($structure);
        
        return $this;
    }

    /**
     * Assert that the response is a successful JSON response.
     *
     * @return $this
     */
    public function assertSuccessResponse()
    {
        $this->response->assertStatus(200)
            ->assertJsonStructure(['success'])
            ->assertJson(['success' => true]);
        
        return $this;
    }

    /**
     * Assert that the response is an error JSON response.
     *
     * @param int $statusCode
     * @return $this
     */
    public function assertErrorResponse(int $statusCode = 422)
    {
        $this->response->assertStatus($statusCode)
            ->assertJsonStructure(['success', 'error'])
            ->assertJson(['success' => false]);
        
        return $this;
    }

    /**
     * Create a test file for document upload testing.
     *
     * @param string $filename
     * @param string $mimeType
     * @param int $size
     * @return \Illuminate\Http\UploadedFile
     */
    protected function createTestFile(string $filename = 'document.pdf', string $mimeType = 'application/pdf', int $size = 1024)
    {
        return \Illuminate\Http\UploadedFile::fake()->create($filename, $size, $mimeType);
    }
}