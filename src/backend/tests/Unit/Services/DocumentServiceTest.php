<?php

namespace Tests\Unit\Services;

use App\Exceptions\DocumentProcessingException;
use App\Events\DocumentUploadedEvent;
use App\Jobs\ProcessDocumentVerification;
use App\Models\Document;
use App\Models\DocumentVerification;
use App\Services\DocumentService;
use App\Services\StorageService;
use Illuminate\Http\UploadedFile; // Laravel ^10.0
use Illuminate\Support\Facades\Config; // Laravel ^10.0
use Illuminate\Support\Facades\Event; // Laravel ^10.0
use Illuminate\Support\Facades\Queue; // Laravel ^10.0
use Mockery; // Mockery ^1.5
use Tests\TestCase;

class DocumentServiceTest extends TestCase
{
    /**
     * @var StorageService|\Mockery\MockInterface
     */
    protected $storageService;

    /**
     * @var DocumentService
     */
    protected $documentService;

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

        // Create a mock of the StorageService using Mockery
        $this->storageService = Mockery::mock(StorageService::class);

        // Configure the mock to return appropriate test values for common methods
        $this->storageService->shouldReceive('generateUniqueFilename')->andReturn('unique_filename.pdf');
        $this->storageService->shouldReceive('getAllowedMimeTypes')->andReturn(['application/pdf']);
        $this->storageService->shouldReceive('getMaxFileSize')->andReturn(1024 * 1024); // 1MB
        $this->storageService->shouldReceive('storeDocumentFile')->andReturn('path/to/document.pdf');
        $this->storageService->shouldReceive('deleteFile')->andReturn(true);
        $this->storageService->shouldReceive('getTemporaryUrl')->andReturn('http://example.com/download');

        // Create an instance of DocumentService with the mocked StorageService
        $this->documentService = new DocumentService($this->storageService);

        // Fake events and queued jobs to verify dispatching without executing them
        Event::fake();
        Queue::fake();

        // Configure test application types and required documents
        Config::set('workflow.document_types', ['transcript', 'personal_statement', 'recommendation_letter']);
        Config::set('workflow.required_documents.undergraduate', ['transcript', 'personal_statement']);
    }

    /**
     * Clean up after each test
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
     * Test that a document can be successfully uploaded
     *
     * @return void
     */
    public function test_upload_document_success(): void
    {
        // Create a fake uploaded file using UploadedFile::fake()
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        // Set up the storage service mock to return a valid file path
        $this->storageService->shouldReceive('storeDocumentFile')->andReturn('path/to/document.pdf');

        // Call the uploadDocument method on the document service
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document = $this->documentService->uploadDocument($file, 'transcript', $application->id, $user->id);

        // Assert that the returned document has the expected properties
        $this->assertInstanceOf(Document::class, $document);
        $this->assertEquals($user->id, $document->user_id);
        $this->assertEquals($application->id, $document->application_id);
        $this->assertEquals('transcript', $document->document_type);
        $this->assertEquals('document.pdf', $document->file_name);
        $this->assertEquals('path/to/document.pdf', $document->file_path);
        $this->assertEquals('application/pdf', $document->mime_type);
        $this->assertEquals(100, $document->file_size);

        // Assert that the DocumentUploadedEvent was dispatched
        Event::assertDispatched(DocumentUploadedEvent::class, function ($event) use ($document) {
            return $event->document->id === $document->id;
        });

        // Assert that the ProcessDocumentVerification job was dispatched
        Queue::assertPushed(ProcessDocumentVerification::class, function ($job) use ($document) {
            return $job->documentId === $document->id;
        });
    }

    /**
     * Test that uploading a document with an invalid type throws an exception
     *
     * @return void
     */
    public function test_upload_document_invalid_type(): void
    {
        // Create a fake uploaded file
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        // Configure the test to expect a DocumentProcessingException
        $this->expectException(DocumentProcessingException::class);
        $this->expectExceptionCode(0);

        // Call the uploadDocument method with an invalid document type
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $this->documentService->uploadDocument($file, 'invalid_type', $application->id, $user->id);

        // Assert that the exception was thrown with the correct error code
        $this->fail('Expected exception was not thrown');
    }

    /**
     * Test that a storage error during upload is properly handled
     *
     * @return void
     */
    public function test_upload_document_storage_error(): void
    {
        // Create a fake uploaded file
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        // Set up the storage service mock to throw an exception during storeFile
        $this->storageService->shouldReceive('storeDocumentFile')->andThrow(new \Exception('Storage error'));

        // Configure the test to expect a DocumentProcessingException
        $this->expectException(DocumentProcessingException::class);
        $this->expectExceptionCode(0);

        // Call the uploadDocument method
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $this->documentService->uploadDocument($file, 'transcript', $application->id, $user->id);

        // Assert that the exception was thrown with the correct error code
        $this->fail('Expected exception was not thrown');
    }

    /**
     * Test retrieving a document by ID
     *
     * @return void
     */
    public function test_get_document_by_id(): void
    {
        // Create a test document in the database
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document = $this->createDocument($user, $application);

        // Call the getDocument method with the document ID
        $retrievedDocument = $this->documentService->getDocument($document->id);

        // Assert that the returned document matches the created document
        $this->assertInstanceOf(Document::class, $retrievedDocument);
        $this->assertEquals($document->id, $retrievedDocument->id);
    }

    /**
     * Test retrieving a document by ID with user ID authorization
     *
     * @return void
     */
    public function test_get_document_by_id_with_user_id(): void
    {
        // Create a test document in the database
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document = $this->createDocument($user, $application);

        // Call the getDocument method with the document ID and the correct user ID
        $retrievedDocument = $this->documentService->getDocument($document->id, $user->id);

        // Assert that the document is returned
        $this->assertInstanceOf(Document::class, $retrievedDocument);
        $this->assertEquals($document->id, $retrievedDocument->id);

        // Call the getDocument method with the document ID and an incorrect user ID
        $otherUser = $this->createUser();
        $retrievedDocument = $this->documentService->getDocument($document->id, $otherUser->id);

        // Assert that null is returned (unauthorized access)
        $this->assertNull($retrievedDocument);
    }

    /**
     * Test retrieving all documents for an application
     *
     * @return void
     */
    public function test_get_documents_by_application(): void
    {
        // Create multiple test documents for the same application
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document1 = $this->createDocument($user, $application);
        $document2 = $this->createDocument($user, $application);

        // Create a document for a different application
        $otherApplication = $this->createApplication($user);
        $this->createDocument($user, $otherApplication);

        // Call the getDocumentsByApplication method
        $documents = $this->documentService->getDocumentsByApplication($application->id);

        // Assert that all documents for the application are returned
        $this->assertCount(2, $documents);
        $this->assertEquals([$document1->id, $document2->id], $documents->pluck('id')->toArray());

        // Assert that documents for other applications are not returned
        $this->assertNotContains($otherApplication->id, $documents->pluck('application_id')->toArray());
    }

    /**
     * Test retrieving all documents for a user
     *
     * @return void
     */
    public function test_get_documents_by_user(): void
    {
        // Create multiple test documents for the same user
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document1 = $this->createDocument($user, $application);
        $document2 = $this->createDocument($user, $application);

        // Create a document for a different user
        $otherUser = $this->createUser();
        $otherApplication = $this->createApplication($otherUser);
        $this->createDocument($otherUser, $otherApplication);

        // Call the getDocumentsByUser method
        $documents = $this->documentService->getDocumentsByUser($user->id);

        // Assert that all documents for the user are returned
        $this->assertCount(2, $documents);
        $this->assertEquals([$document1->id, $document2->id], $documents->pluck('id')->toArray());

        // Assert that documents for other users are not returned
        $this->assertNotContains($otherUser->id, $documents->pluck('user_id')->toArray());
    }

    /**
     * Test retrieving documents by type for an application
     *
     * @return void
     */
    public function test_get_documents_by_type(): void
    {
        // Create multiple test documents of different types for the same application
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document1 = $this->createDocument($user, $application, ['document_type' => 'transcript']);
        $document2 = $this->createDocument($user, $application, ['document_type' => 'personal_statement']);
        $this->createDocument($user, $application, ['document_type' => 'recommendation_letter']);

        // Call the getDocumentsByType method for a specific document type
        $documents = $this->documentService->getDocumentsByType($application->id, 'transcript');

        // Assert that only documents of the specified type are returned
        $this->assertCount(1, $documents);
        $this->assertEquals($document1->id, $documents->first()->id);
    }

    /**
     * Test deleting a document
     *
     * @return void
     */
    public function test_delete_document(): void
    {
        // Create a test document in the database
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document = $this->createDocument($user, $application);

        // Set up the storage service mock to return true for deleteFile
        $this->storageService->shouldReceive('deleteFile')->with($document->file_path)->andReturn(true);

        // Call the deleteDocument method
        $result = $this->documentService->deleteDocument($document->id, $user->id);

        // Assert that the method returns true (successful deletion)
        $this->assertTrue($result);

        // Assert that the document no longer exists in the database
        $this->assertNull(Document::find($document->id));

        // Assert that the storage service deleteFile method was called with the correct path
        $this->storageService->shouldHaveReceived('deleteFile')->with($document->file_path);
    }

    /**
     * Test deleting a document that doesn't exist
     *
     * @return void
     */
    public function test_delete_document_not_found(): void
    {
        // Call the deleteDocument method with a non-existent document ID
        $result = $this->documentService->deleteDocument(999);

        // Assert that the method returns false (document not found)
        $this->assertFalse($result);
    }

    /**
     * Test deleting a document with incorrect user ID
     *
     * @return void
     */
    public function test_delete_document_unauthorized(): void
    {
        // Create a test document in the database
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document = $this->createDocument($user, $application);

        // Call the deleteDocument method with the document ID and an incorrect user ID
        $otherUser = $this->createUser();
        $result = $this->documentService->deleteDocument($document->id, $otherUser->id);

        // Assert that the method returns false (unauthorized)
        $this->assertFalse($result);

        // Assert that the document still exists in the database
        $this->assertNotNull(Document::find($document->id));
    }

    /**
     * Test replacing an existing document with a new file
     *
     * @return void
     */
    public function test_replace_document(): void
    {
        // Create a test document in the database
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document = $this->createDocument($user, $application);

        // Create a fake uploaded file for replacement
        $newFile = UploadedFile::fake()->create('new_document.pdf', 200, 'application/pdf');

        // Set up the storage service mock to handle file operations
        $this->storageService->shouldReceive('deleteFile')->with($document->file_path)->andReturn(true);
        $this->storageService->shouldReceive('storeDocumentFile')->andReturn('path/to/new_document.pdf');

        // Call the replaceDocument method
        $updatedDocument = $this->documentService->replaceDocument($document->id, $newFile, $user->id);

        // Assert that the returned document has updated properties
        $this->assertInstanceOf(Document::class, $updatedDocument);
        $this->assertEquals('new_document.pdf', $updatedDocument->file_name);
        $this->assertEquals('path/to/new_document.pdf', $updatedDocument->file_path);
        $this->assertEquals('application/pdf', $updatedDocument->mime_type);
        $this->assertEquals(200, $updatedDocument->file_size);
        $this->assertFalse($updatedDocument->is_verified);
        $this->assertNull($updatedDocument->verified_at);
        $this->assertNull($updatedDocument->verified_by_user_id);

        // Assert that the old file was deleted
        $this->storageService->shouldHaveReceived('deleteFile')->with($document->file_path);

        // Assert that the new file was stored
        $this->storageService->shouldHaveReceived('storeDocumentFile')->with($newFile, Mockery::any());

        // Assert that the DocumentUploadedEvent was dispatched
        Event::assertDispatched(DocumentUploadedEvent::class, function ($event) use ($updatedDocument) {
            return $event->document->id === $updatedDocument->id;
        });

        // Assert that the ProcessDocumentVerification job was dispatched
        Queue::assertPushed(ProcessDocumentVerification::class, function ($job) use ($updatedDocument) {
            return $job->documentId === $updatedDocument->id;
        });
    }

    /**
     * Test generating a download URL for a document
     *
     * @return void
     */
    public function test_get_document_download_url(): void
    {
        // Create a test document in the database
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $document = $this->createDocument($user, $application);

        // Set up the storage service mock to return a temporary URL
        $this->storageService->shouldReceive('getDocumentUrl')->with($document->file_path, 60)->andReturn('http://example.com/download');

        // Call the getDocumentDownloadUrl method
        $downloadUrl = $this->documentService->getDocumentDownloadUrl($document->id, $user->id);

        // Assert that the returned URL matches the expected URL
        $this->assertEquals('http://example.com/download', $downloadUrl);

        // Assert that the storage service getTemporaryUrl method was called with the correct parameters
        $this->storageService->shouldHaveReceived('getDocumentUrl')->with($document->file_path, 60);
    }

    /**
     * Test retrieving the list of required documents for an application type
     *
     * @return void
     */
    public function test_get_required_documents(): void
    {
        // Configure test application types and required documents
        Config::set('workflow.required_documents.undergraduate', ['transcript', 'personal_statement']);
        Config::set('workflow.required_documents.graduate', ['transcript', 'resume']);

        // Call the getRequiredDocuments method for a specific application type
        $requiredDocuments = $this->documentService->getRequiredDocuments('undergraduate');

        // Assert that the returned list matches the expected required documents
        $this->assertEquals(['transcript', 'personal_statement'], $requiredDocuments);
    }

    /**
     * Test retrieving the status of required documents for an application
     *
     * @return void
     */
    public function test_get_document_status(): void
    {
        // Configure test application types and required documents
        Config::set('workflow.required_documents.undergraduate', ['transcript', 'personal_statement']);

        // Create test documents with different verification statuses
        $user = $this->createUser();
        $application = $this->createApplication($user);
        $this->createDocument($user, $application, ['document_type' => 'transcript', 'is_verified' => true]);
        $this->createDocument($user, $application, ['document_type' => 'personal_statement', 'is_verified' => false]);

        // Call the getDocumentStatus method
        $documentStatus = $this->documentService->getDocumentStatus($application->id, 'undergraduate', $user->id);

        // Assert that the returned status correctly reflects uploaded and verified documents
        $this->assertArrayHasKey('transcript', $documentStatus);
        $this->assertTrue($documentStatus['transcript']['uploaded']);
        $this->assertTrue($documentStatus['transcript']['verified']);

        $this->assertArrayHasKey('personal_statement', $documentStatus);
        $this->assertTrue($documentStatus['personal_statement']['uploaded']);
        $this->assertFalse($documentStatus['personal_statement']['verified']);
    }

    /**
     * Test checking if all required documents for an application are complete
     *
     * @return void
     */
    public function test_is_document_complete(): void
    {
        // Configure test application types and required documents
        Config::set('workflow.required_documents.undergraduate', ['transcript', 'personal_statement']);

        // Create test scenarios with complete and incomplete document sets
        $user = $this->createUser();
        $application = $this->createApplication($user);

        // Scenario 1: All required documents uploaded
        $this->createDocument($user, $application, ['document_type' => 'transcript']);
        $this->createDocument($user, $application, ['document_type' => 'personal_statement']);
        $isComplete1 = $this->documentService->isDocumentComplete($application->id, 'undergraduate', $user->id);
        $this->assertTrue($isComplete1);

        // Scenario 2: Missing one required document
        $application2 = $this->createApplication($user);
        $this->createDocument($user, $application2, ['document_type' => 'transcript']);
        $isComplete2 = $this->documentService->isDocumentComplete($application2->id, 'undergraduate', $user->id);
        $this->assertFalse($isComplete2);

        // Scenario 3: No documents uploaded
        $application3 = $this->createApplication($user);
        $isComplete3 = $this->documentService->isDocumentComplete($application3->id, 'undergraduate', $user->id);
        $this->assertFalse($isComplete3);

        // Call the isDocumentComplete method for each scenario

        // Assert that the method correctly identifies complete and incomplete document sets
    }

    /**
     * Test retrieving the list of supported document types
     *
     * @return void
     */
    public function test_get_supported_document_types(): void
    {
        // Configure test supported document types
        Config::set('workflow.document_types', ['transcript', 'personal_statement', 'recommendation_letter']);

        // Call the getSupportedDocumentTypes method
        $supportedDocumentTypes = $this->documentService->getSupportedDocumentTypes();

        // Assert that the returned list matches the expected supported document types
        $this->assertEquals(['transcript', 'personal_statement', 'recommendation_letter'], $supportedDocumentTypes);
    }

    /**
     * Test validating document types
     *
     * @return void
     */
    public function test_validate_document_type(): void
    {
        // Configure test supported document types
        Config::set('workflow.document_types', ['transcript', 'personal_statement']);

        // Call the validateDocumentType method with a valid document type
        $result = $this->documentService->validateDocumentType('transcript');

        // Assert that the method returns true for valid types
        $this->assertTrue($result);

        // Configure the test to expect a DocumentProcessingException
        $this->expectException(DocumentProcessingException::class);
        $this->expectExceptionCode(0);

        // Call the validateDocumentType method with an invalid document type
        $this->documentService->validateDocumentType('invalid_type');

        // Assert that the exception was thrown with the correct error code
        $this->fail('Expected exception was not thrown');
    }
}