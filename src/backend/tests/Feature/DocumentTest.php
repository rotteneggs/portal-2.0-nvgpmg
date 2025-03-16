<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase; // Laravel ^10.0
use Illuminate\Foundation\Testing\WithFaker; // Laravel ^10.0
use App\Models\User;
use App\Models\Application;
use App\Models\Document;
use App\Models\ApplicationStatus;
use App\Models\DocumentVerification;
use App\Services\DocumentService;
use App\Services\StorageService;
use App\Exceptions\DocumentProcessingException;
use Illuminate\Support\Facades\Storage; // Laravel ^10.0
use Illuminate\Support\Facades\Event; // Laravel ^10.0
use Illuminate\Support\Facades\Queue; // Laravel ^10.0
use Illuminate\Http\Testing\File; // illuminate/http ^10.0
use Mockery; // Mockery ^1.5
use Tests\TestCase;

class DocumentTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Indicates whether the default seeder should run before each test.
     */
    protected bool $seed = false;

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
        
        // Configure Storage facade to use fake storage
        Storage::fake('documents');
        Storage::fake('temporary');
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
     * Test that a user can upload a document
     *
     * @return void
     */
    public function test_user_can_upload_document(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a fake uploaded file
        $file = File::fake()->create('document.pdf', 100, 'application/pdf');

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a POST request to /api/v1/documents with the file, document_type, and application_id
        $response = $this->postJson('/api/v1/documents', [
            'file' => $file,
            'document_type' => 'transcript',
            'application_id' => $application->id,
        ]);

        // Assert that the response has a 201 status code
        $response->assertStatus(201);

        // Assert that the response has the expected JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'user_id',
                'application_id',
                'document_type',
                'file_name',
                'file_path',
                'mime_type',
                'file_size',
                'is_verified',
                'created_at',
                'updated_at',
            ],
            'message',
        ]);

        // Assert that the document was stored in the database
        $this->assertDatabaseHas('documents', [
            'user_id' => $user->id,
            'application_id' => $application->id,
            'document_type' => 'transcript',
            'file_name' => 'document.pdf',
            'mime_type' => 'application/pdf',
        ]);

        // Assert that the file was stored in the storage
        $document = Document::first();
        Storage::disk('documents')->assertExists($document->file_path);
    }

    /**
     * Test that a user cannot upload a document with an invalid type
     *
     * @return void
     */
    public function test_user_cannot_upload_document_with_invalid_type(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a fake uploaded file
        $file = File::fake()->create('document.pdf', 100, 'application/pdf');

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a POST request to /api/v1/documents with the file, an invalid document_type, and application_id
        $response = $this->postJson('/api/v1/documents', [
            'file' => $file,
            'document_type' => 'invalid_type',
            'application_id' => $application->id,
        ]);

        // Assert that the response has a 422 status code
        $response->assertStatus(422);

        // Assert that the response contains validation errors for document_type
        $response->assertJsonValidationErrors(['document_type']);
    }

    /**
     * Test that a user cannot upload a document with an invalid file type
     *
     * @return void
     */
    public function test_user_cannot_upload_document_with_invalid_file_type(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a fake uploaded file with an invalid mime type
        $file = File::fake()->create('document.txt', 100, 'text/plain');

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a POST request to /api/v1/documents with the file, document_type, and application_id
        $response = $this->postJson('/api/v1/documents', [
            'file' => $file,
            'document_type' => 'transcript',
            'application_id' => $application->id,
        ]);

        // Assert that the response has a 422 status code
        $response->assertStatus(422);

        // Assert that the response contains validation errors for file
        $response->assertJsonValidationErrors(['file']);
    }

    /**
     * Test that a user cannot upload a document for another user's application
     *
     * @return void
     */
    public function test_user_cannot_upload_document_for_another_users_application(): void
    {
        // Create two users
        $user1 = $this->createUser();
        $user2 = $this->createUser();

        // Create an application for the first user
        $application = $this->createApplication($user1);

        // Create a fake uploaded file
        $file = File::fake()->create('document.pdf', 100, 'application/pdf');

        // Act as the second user
        $this->actingAs($user2);

        // Make a POST request to /api/v1/documents with the file, document_type, and the first user's application_id
        $response = $this->postJson('/api/v1/documents', [
            'file' => $file,
            'document_type' => 'transcript',
            'application_id' => $application->id,
        ]);

        // Assert that the response has a 403 status code
        $response->assertStatus(403);
    }

    /**
     * Test that a user can get a list of their documents
     *
     * @return void
     */
    public function test_user_can_get_document_list(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create multiple documents for the application
        $this->createDocument($user, $application, ['document_type' => 'transcript']);
        $this->createDocument($user, $application, ['document_type' => 'personal_statement']);

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a GET request to /api/v1/documents
        $response = $this->getJson('/api/v1/documents');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains all the user's documents
        $response->assertJsonCount(2, 'data');

        // Assert that the response has the expected JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'user_id',
                    'application_id',
                    'document_type',
                    'file_name',
                    'file_path',
                    'mime_type',
                    'file_size',
                    'is_verified',
                    'created_at',
                    'updated_at',
                ],
            ],
            'message',
        ]);
    }

    /**
     * Test that a user can get documents for a specific application
     *
     * @return void
     */
    public function test_user_can_get_documents_by_application(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create multiple applications for the user
        $application1 = $this->createApplication($user);
        $application2 = $this->createApplication($user);

        // Create documents for each application
        $this->createDocument($user, $application1, ['document_type' => 'transcript']);
        $this->createDocument($user, $application2, ['document_type' => 'personal_statement']);

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a GET request to /api/v1/documents?application_id={id}
        $response = $this->getJson('/api/v1/documents?application_id=' . $application1->id);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response only contains documents for the specified application
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['application_id' => $application1->id]);

        // Assert that the response has the expected JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'user_id',
                    'application_id',
                    'document_type',
                    'file_name',
                    'file_path',
                    'mime_type',
                    'file_size',
                    'is_verified',
                    'created_at',
                    'updated_at',
                ],
            ],
            'message',
        ]);
    }

    /**
     * Test that a user can get documents of a specific type
     *
     * @return void
     */
    public function test_user_can_get_documents_by_type(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create documents of different types for the application
        $this->createDocument($user, $application, ['document_type' => 'transcript']);
        $this->createDocument($user, $application, ['document_type' => 'personal_statement']);

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a GET request to /api/v1/documents?application_id={id}&document_type={type}
        $response = $this->getJson('/api/v1/documents?application_id=' . $application->id . '&document_type=transcript');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response only contains documents of the specified type
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['document_type' => 'transcript']);

        // Assert that the response has the expected JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'user_id',
                    'application_id',
                    'document_type',
                    'file_name',
                    'file_path',
                    'mime_type',
                    'file_size',
                    'is_verified',
                    'created_at',
                    'updated_at',
                ],
            ],
            'message',
        ]);
    }

    /**
     * Test that a user can get a specific document by ID
     *
     * @return void
     */
    public function test_user_can_get_document_by_id(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a document for the application
        $document = $this->createDocument($user, $application, ['document_type' => 'transcript']);

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a GET request to /api/v1/documents/{id}
        $response = $this->getJson('/api/v1/documents/' . $document->id);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the correct document data
        $response->assertJsonFragment(['id' => $document->id]);

        // Assert that the response has the expected JSON structure
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'user_id',
                'application_id',
                'document_type',
                'file_name',
                'file_path',
                'mime_type',
                'file_size',
                'is_verified',
                'created_at',
                'updated_at',
            ],
            'message',
        ]);
    }

    /**
     * Test that a user cannot get another user's document
     *
     * @return void
     */
    public function test_user_cannot_get_another_users_document(): void
    {
        // Create two users
        $user1 = $this->createUser();
        $user2 = $this->createUser();

        // Create an application for the first user
        $application = $this->createApplication($user1);

        // Create a document for the first user's application
        $document = $this->createDocument($user1, $application, ['document_type' => 'transcript']);

        // Act as the second user
        $this->actingAs($user2);

        // Make a GET request to /api/v1/documents/{id}
        $response = $this->getJson('/api/v1/documents/' . $document->id);

        // Assert that the response has a 404 status code
        $response->assertStatus(404);
    }

    /**
     * Test that a user can delete their own document
     *
     * @return void
     */
    public function test_user_can_delete_document(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a document for the application
        $document = $this->createDocument($user, $application, ['document_type' => 'transcript']);

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a DELETE request to /api/v1/documents/{id}
        $response = $this->deleteJson('/api/v1/documents/' . $document->id);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the document was removed from the database
        $this->assertDatabaseMissing('documents', ['id' => $document->id]);

        // Assert that the file was removed from storage
        Storage::disk('documents')->assertMissing($document->file_path);
    }

    /**
     * Test that a user cannot delete another user's document
     *
     * @return void
     */
    public function test_user_cannot_delete_another_users_document(): void
    {
        // Create two users
        $user1 = $this->createUser();
        $user2 = $this->createUser();

        // Create an application for the first user
        $application = $this->createApplication($user1);

        // Create a document for the first user's application
        $document = $this->createDocument($user1, $application, ['document_type' => 'transcript']);

        // Act as the second user
        $this->actingAs($user2);

        // Make a DELETE request to /api/v1/documents/{id}
        $response = $this->deleteJson('/api/v1/documents/' . $document->id);

        // Assert that the response has a 404 status code
        $response->assertStatus(404);

        // Assert that the document still exists in the database
        $this->assertDatabaseHas('documents', ['id' => $document->id]);
    }

    /**
     * Test that a user can replace their document with a new file
     *
     * @return void
     */
    public function test_user_can_replace_document(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a document for the application
        $document = $this->createDocument($user, $application, ['document_type' => 'transcript']);
        $oldFilePath = $document->file_path;

        // Create a new fake uploaded file
        $newFile = File::fake()->create('new_document.pdf', 200, 'application/pdf');

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a PUT request to /api/v1/documents/{id} with the new file
        $response = $this->putJson('/api/v1/documents/' . $document->id, [
            'file' => $newFile,
        ]);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the document in the database has been updated
        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'file_name' => 'new_document.pdf',
            'mime_type' => 'application/pdf',
        ]);

        // Assert that the old file was removed from storage
        Storage::disk('documents')->assertMissing($oldFilePath);

        // Assert that the new file was stored in storage
        $document->refresh();
        Storage::disk('documents')->assertExists($document->file_path);
    }

    /**
     * Test that a user can get a download URL for their document
     *
     * @return void
     */
    public function test_user_can_get_document_download_url(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a document for the application
        $document = $this->createDocument($user, $application, ['document_type' => 'transcript']);

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a GET request to /api/v1/documents/{id}/download
        $response = $this->getJson('/api/v1/documents/' . $document->id . '/download');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains a download URL
        $response->assertJsonStructure(['success', 'data' => ['url'], 'message']);

        // Assert that the URL is valid and temporary
        $url = $response['data']['url'];
        $this->assertStringContainsString('X-Amz-Signature', $url);
    }

    /**
     * Test that an admin can verify a document
     *
     * @return void
     */
    public function test_admin_can_verify_document(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an admin user
        $admin = $this->createAdminUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a document for the application
        $document = $this->createDocument($user, $application, ['document_type' => 'transcript']);

        // Act as the admin user
        $this->actingAs($admin);

        // Make a POST request to /api/v1/documents/{id}/verify
        $response = $this->postJson('/api/v1/documents/' . $document->id . '/verify');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the document is marked as verified in the database
        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'is_verified' => true,
        ]);

        // Assert that a verification record was created with the correct status
        $this->assertDatabaseHas('document_verifications', [
            'document_id' => $document->id,
            'verification_status' => 'verified',
        ]);
    }

    /**
     * Test that an admin can reject a document
     *
     * @return void
     */
    public function test_admin_can_reject_document(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an admin user
        $admin = $this->createAdminUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a document for the application
        $document = $this->createDocument($user, $application, ['document_type' => 'transcript']);

        // Act as the admin user
        $this->actingAs($admin);

        // Make a POST request to /api/v1/documents/{id}/reject with a reason
        $response = $this->postJson('/api/v1/documents/' . $document->id . '/reject', [
            'reason' => 'Illegible',
        ]);

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the document is marked as not verified in the database
        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'is_verified' => false,
        ]);

        // Assert that a verification record was created with the correct status and reason
        $this->assertDatabaseHas('document_verifications', [
            'document_id' => $document->id,
            'verification_status' => 'rejected',
            'notes' => 'Illegible',
        ]);
    }

    /**
     * Test that a regular user cannot verify a document
     *
     * @return void
     */
    public function test_regular_user_cannot_verify_document(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a document for the application
        $document = $this->createDocument($user, $application, ['document_type' => 'transcript']);

        // Act as the user
        $this->actingAs($user);

        // Make a POST request to /api/v1/documents/{id}/verify
        $response = $this->postJson('/api/v1/documents/' . $document->id . '/verify');

        // Assert that the response has a 403 status code
        $response->assertStatus(403);

        // Assert that the document is not marked as verified in the database
        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'is_verified' => false,
        ]);
    }

    /**
     * Test that a user can get the list of supported document types
     *
     * @return void
     */
    public function test_user_can_get_document_types(): void
    {
        // Create a user
        $user = $this->createUser();

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a GET request to /api/v1/documents/types
        $response = $this->getJson('/api/v1/documents/types');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the list of supported document types
        $response->assertJsonStructure([
            'success',
            'data' => [],
            'message',
        ]);
    }

    /**
     * Test that a user can get the status of required documents for an application
     *
     * @return void
     */
    public function test_user_can_get_document_status_for_application(): void
    {
        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user, ['application_type' => 'undergraduate']);

        // Create some required documents for the application
        $this->createDocument($user, $application, ['document_type' => 'transcript']);
        $this->createDocument($user, $application, ['document_type' => 'personal_statement', 'is_verified' => true]);

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a GET request to /api/v1/documents/status/{applicationId}?application_type={type}
        $response = $this->getJson('/api/v1/documents/status/' . $application->id . '?application_type=undergraduate');

        // Assert that the response has a 200 status code
        $response->assertStatus(200);

        // Assert that the response contains the status of all required documents
        $response->assertJsonStructure([
            'success',
            'data' => [
                'transcript' => ['uploaded', 'verified'],
                'personal_statement' => ['uploaded', 'verified'],
                'recommendation_letter' => ['uploaded', 'verified'],
            ],
            'message',
        ]);

        // Assert that uploaded documents are marked as uploaded
        $response->assertJsonFragment(['transcript' => ['uploaded' => true, 'verified' => false]]);
        $response->assertJsonFragment(['personal_statement' => ['uploaded' => true, 'verified' => true]]);

        // Assert that missing documents are marked as missing
        $response->assertJsonFragment(['recommendation_letter' => ['uploaded' => false, 'verified' => false]]);
    }

    /**
     * Test that document upload dispatches the expected events and jobs
     *
     * @return void
     */
    public function test_document_upload_dispatches_events_and_jobs(): void
    {
        // Fake the Event facade
        Event::fake();

        // Fake the Queue facade
        Queue::fake();

        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a fake uploaded file
        $file = File::fake()->create('document.pdf', 100, 'application/pdf');

        // Act as the authenticated user
        $this->actingAs($user);

        // Make a POST request to /api/v1/documents with the file, document_type, and application_id
        $this->postJson('/api/v1/documents', [
            'file' => $file,
            'document_type' => 'transcript',
            'application_id' => $application->id,
        ]);

        // Assert that DocumentUploadedEvent was dispatched
        Event::assertDispatched(\App\Events\DocumentUploadedEvent::class);

        // Assert that ProcessDocumentVerification job was dispatched
        Queue::assertPushed(\App\Jobs\ProcessDocumentVerification::class);
    }

    /**
     * Test the AI verification process for documents
     *
     * @return void
     */
    public function test_ai_verification_process(): void
    {
        // Mock the AI document analysis service
        $mockAnalysisService = Mockery::mock(\App\Services\AI\DocumentAnalysisService::class);

        // Configure the mock to return a successful verification result
        $mockAnalysisService->shouldReceive('verifyDocument')
            ->once()
            ->andReturn((object) [
                'id' => 123,
                'document_id' => 1,
                'verification_method' => 'ai',
                'verification_status' => 'verified',
                'verification_data' => [],
                'confidence_score' => 0.95,
            ]);

        // Replace the actual service with the mock
        $this->app->instance(\App\Services\AI\DocumentAnalysisService::class, $mockAnalysisService);

        // Create a user
        $user = $this->createUser();

        // Create an application for the user
        $application = $this->createApplication($user);

        // Create a document for the application
        $document = $this->createDocument($user, $application, ['document_type' => 'transcript']);

        // Trigger the AI verification process
        $verificationService = $this->app->make(\App\Services\DocumentVerificationService::class);
        $verificationService->verifyDocument($document);

        // Assert that the document verification status is updated correctly
        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'is_verified' => true,
        ]);

        // Assert that the verification record contains the AI analysis results
        $this->assertDatabaseHas('document_verifications', [
            'document_id' => $document->id,
            'verification_method' => 'ai',
            'verification_status' => 'verified',
            'confidence_score' => 0.95,
        ]);
    }
}