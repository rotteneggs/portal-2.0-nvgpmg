<?php

namespace Tests\Unit\Services\AI;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Config;
use App\Models\Document;
use App\Models\DocumentVerification;
use App\Exceptions\DocumentProcessingException;
use App\Services\AI\DocumentAnalysisService;
use OpenAI;

class DocumentAnalysisServiceTest extends TestCase
{
    protected DocumentAnalysisService $documentAnalysisService;
    protected Mockery\MockInterface $openAIClient;
    protected Document $document;
    protected array $mockConfig;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Mock the OpenAI client
        $this->openAIClient = Mockery::mock(OpenAI::class);
        
        // Create the service with mocked dependencies
        $this->documentAnalysisService = new DocumentAnalysisService($this->openAIClient);
        
        // Set up mock configuration for AI model, confidence threshold, etc.
        $this->mockConfig = [
            'model' => 'gpt-4-vision-preview',
            'confidence_threshold' => 0.85,
            'supported_types' => [
                'transcript', 'passport', 'drivers_license', 'id_card',
                'academic_record', 'recommendation', 'personal_statement', 'financial_statement'
            ],
            'tampering_detection' => true,
            'storage_path' => 'document_analysis'
        ];
        
        // Mock Config facade to return our test configuration
        Config::shouldReceive('get')
            ->with('ai.document_analysis.model', Mockery::any())
            ->andReturn($this->mockConfig['model']);
        Config::shouldReceive('get')
            ->with('ai.document_analysis.confidence_threshold', Mockery::any())
            ->andReturn($this->mockConfig['confidence_threshold']);
        Config::shouldReceive('get')
            ->with('ai.document_analysis.supported_types', Mockery::any())
            ->andReturn($this->mockConfig['supported_types']);
        Config::shouldReceive('get')
            ->with('ai.document_analysis.tampering_detection', Mockery::any())
            ->andReturn($this->mockConfig['tampering_detection']);
        Config::shouldReceive('get')
            ->with('ai.document_analysis.storage_path', Mockery::any())
            ->andReturn($this->mockConfig['storage_path']);
        
        // Create a test document for use in tests
        $this->document = new Document([
            'id' => 1,
            'user_id' => 1,
            'application_id' => 1,
            'document_type' => 'transcript',
            'file_name' => 'transcript.pdf',
            'file_path' => 'documents/1/transcript.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'is_verified' => false
        ]);
    }

    protected function tearDown(): void
    {
        // Close and verify all Mockery expectations
        Mockery::close();
        
        parent::tearDown();
    }

    public function test_analyze_document_returns_extracted_data()
    {
        // Set up a test document (transcript, ID, etc.)
        $document = $this->document;
        
        // Mock the Storage facade to return true for file existence
        Storage::shouldReceive('exists')
            ->with($document->file_path)
            ->andReturn(true);
        
        // Mock file operations needed for document preparation
        Storage::shouldReceive('path')
            ->with($document->file_path)
            ->andReturn('/tmp/test/transcript.pdf');
            
        // We'll need to mock file_get_contents using a mock implementation in the service
        // that we'll intercept with our mock
        $mockFileContent = base64_encode('mock pdf content');
        
        // Set up chat response chain for OpenAI client
        $chatMock = Mockery::mock('stdClass');
        $responseMock = Mockery::mock('stdClass');
        
        // Expected analysis results
        $expectedData = [
            'institution_name' => 'Example University',
            'student_name' => 'John Doe',
            'student_id' => '12345',
            'gpa' => '3.8',
            'graduation_date' => '2023-05-15',
            'courses' => [
                ['course_code' => 'MATH101', 'course_name' => 'Calculus I', 'grade' => 'A', 'credits' => 4],
                ['course_code' => 'ENG101', 'course_name' => 'English Composition', 'grade' => 'B+', 'credits' => 3]
            ],
            'document_type' => 'transcript'
        ];
        
        // Configure the OpenAI client to return a predefined analysis response
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($chatMock);
            
        $chatMock->shouldReceive('create')
            ->once()
            ->with(Mockery::on(function($arg) {
                // Verify the request contains the right model and response format
                return $arg['model'] === 'gpt-4-vision-preview' && 
                       $arg['response_format']['type'] === 'json_object';
            }))
            ->andReturn($responseMock);
            
        $responseMock->shouldReceive('toArray')
            ->once()
            ->andReturn([
                'choices' => [
                    [
                        'message' => [
                            'content' => json_encode($expectedData)
                        ]
                    ]
                ]
            ]);
        
        // Mock storage operations for caching results
        Storage::shouldReceive('exists')
            ->with($this->mockConfig['storage_path'] . '/analysis_1_' . md5($document->file_path) . '.json')
            ->andReturn(false);
            
        Storage::shouldReceive('put')
            ->once()
            ->with(Mockery::type('string'), Mockery::type('string'))
            ->andReturn(true);
        
        // Call the analyzeDocument method on the service
        $result = $this->documentAnalysisService->analyzeDocument($document);
        
        // Assert that the returned data matches the expected structure
        $this->assertIsArray($result);
        $this->assertEquals($expectedData, $result);
        
        // Assert that the extracted data contains the expected fields
        $this->assertArrayHasKey('institution_name', $result);
        $this->assertArrayHasKey('student_name', $result);
        $this->assertArrayHasKey('gpa', $result);
        $this->assertArrayHasKey('courses', $result);
    }

    public function test_verify_document_returns_verification_record()
    {
        // Set up a test document
        $document = $this->document;
        
        // Mock the Storage facade to return true for file existence
        Storage::shouldReceive('exists')
            ->with($document->file_path)
            ->andReturn(true);
        
        // Mock file operations needed for document preparation
        Storage::shouldReceive('path')
            ->with($document->file_path)
            ->andReturn('/tmp/test/transcript.pdf');
        
        // Set up chat response chain for OpenAI client
        $chatMock = Mockery::mock('stdClass');
        $responseMock = Mockery::mock('stdClass');
        
        // Expected verification results
        $verificationData = [
            'appears_authentic' => true,
            'completeness' => 0.95,
            'consistency' => 0.92,
            'formatting_matches_standard' => true,
            'issues_found' => [],
            'confidence_score' => 0.90,
            'summary' => 'Document appears to be an authentic transcript from Example University.'
        ];
        
        // Mock the OpenAI client to return a predefined verification response
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($chatMock);
            
        $chatMock->shouldReceive('create')
            ->once()
            ->andReturn($responseMock);
            
        $responseMock->shouldReceive('toArray')
            ->once()
            ->andReturn([
                'choices' => [
                    [
                        'message' => [
                            'content' => json_encode($verificationData)
                        ]
                    ]
                ]
            ]);
            
        // For tampering detection (since it's enabled)
        $tamperingChatMock = Mockery::mock('stdClass');
        $tamperingResponseMock = Mockery::mock('stdClass');
        $tamperingMessageMock = Mockery::mock('stdClass');
        
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($tamperingChatMock);
            
        $tamperingChatMock->shouldReceive('create')
            ->once()
            ->andReturn($tamperingResponseMock);
            
        $tamperingResponseMock->shouldReceive('choices')
            ->andReturn([
                (object)[
                    'message' => $tamperingMessageMock
                ]
            ]);
            
        $tamperingMessageMock->shouldReceive('content')
            ->andReturn(json_encode([
                'tampering_detected' => false,
                'confidence' => 0.95,
                'details' => [],
                'explanation' => 'No signs of tampering detected.'
            ]));
        
        // Call the verifyDocument method on the service
        $verification = $this->documentAnalysisService->verifyDocument($document);
        
        // Assert that the returned object is a DocumentVerification instance
        $this->assertInstanceOf(DocumentVerification::class, $verification);
        
        // Assert that the verification method is METHOD_AI
        $this->assertEquals(DocumentVerification::METHOD_AI, $verification->verification_method);
        
        // Assert that the verification status is set correctly based on confidence score
        $this->assertEquals(DocumentVerification::STATUS_VERIFIED, $verification->verification_status);
        
        // Assert that the confidence score is set correctly
        $this->assertEquals(0.90, $verification->confidence_score);
    }

    public function test_extract_text_from_document()
    {
        // Set up a test document (PDF or image)
        $document = $this->document;
        
        // Mock the Storage facade to return true for file existence
        Storage::shouldReceive('exists')
            ->with($document->file_path)
            ->andReturn(true);
        
        // Mock file operations needed for document preparation
        Storage::shouldReceive('path')
            ->with($document->file_path)
            ->andReturn('/tmp/test/transcript.pdf');
        
        // Set up chat response chain for OpenAI client
        $chatMock = Mockery::mock('stdClass');
        $responseMock = Mockery::mock('stdClass');
        $choicesMock = [
            (object)[
                'message' => (object)[
                    'content' => 'Extracted text content from the document.'
                ]
            ]
        ];
        
        // Mock the OpenAI client to return a predefined text extraction response
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($chatMock);
            
        $chatMock->shouldReceive('create')
            ->once()
            ->andReturn($responseMock);
            
        $responseMock->shouldReceive('choices')
            ->andReturn($choicesMock);
        
        // Call the extractTextFromDocument method on the service
        $extractedText = $this->documentAnalysisService->extractTextFromDocument($document);
        
        // Assert that the returned text matches the expected content
        $this->assertEquals('Extracted text content from the document.', $extractedText);
    }

    public function test_detect_document_tampering()
    {
        // Set up a test document
        $document = $this->document;
        
        // Mock the Storage facade to return true for file existence
        Storage::shouldReceive('exists')
            ->with($document->file_path)
            ->andReturn(true);
        
        // Mock file operations needed for document preparation
        Storage::shouldReceive('path')
            ->with($document->file_path)
            ->andReturn('/tmp/test/transcript.pdf');
        
        // Set up chat response chain for OpenAI client
        $chatMock = Mockery::mock('stdClass');
        $responseMock = Mockery::mock('stdClass');
        $choicesMock = [
            (object)[
                'message' => (object)[
                    'content' => json_encode([
                        'tampering_detected' => true,
                        'confidence' => 0.85,
                        'details' => [
                            'Inconsistent font usage detected in the GPA section',
                            'Digital artifacts around the institution seal'
                        ],
                        'explanation' => 'The document shows signs of digital manipulation.'
                    ])
                ]
            ]
        ];
        
        // Mock the OpenAI client to return a predefined tampering detection response
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($chatMock);
            
        $chatMock->shouldReceive('create')
            ->once()
            ->andReturn($responseMock);
            
        $responseMock->shouldReceive('choices')
            ->andReturn($choicesMock);
        
        // Call the detectDocumentTampering method on the service
        $tamperingResults = $this->documentAnalysisService->detectDocumentTampering($document);
        
        // Assert that the returned results contain tampering indicators
        $this->assertTrue($tamperingResults['tampering_detected']);
        $this->assertEquals(0.85, $tamperingResults['confidence']);
        $this->assertCount(2, $tamperingResults['details']);
    }

    public function test_validate_document_content()
    {
        // Set up a test document
        $document = $this->document;
        
        // Define expected data values for comparison
        $expectedData = [
            'student_name' => 'John Doe',
            'student_id' => '12345',
            'gpa' => '3.8'
        ];
        
        // Mock the analyzeDocument method to return extracted data
        $extractedData = [
            'student_name' => 'John Doe',
            'student_id' => '12345',
            'gpa' => '3.8',
            'institution_name' => 'Example University',
            'graduation_date' => '2023-05-15'
        ];
        
        // Create a partial mock to override just the analyzeDocument method
        $partialMock = Mockery::mock(DocumentAnalysisService::class, [$this->openAIClient])->makePartial();
        $partialMock->shouldReceive('analyzeDocument')
            ->once()
            ->with($document)
            ->andReturn($extractedData);
        
        // Call the validateDocumentContent method on the service
        $validationResults = $partialMock->validateDocumentContent($document, $expectedData);
        
        // Assert that the validation results contain match indicators
        $this->assertTrue($validationResults['validation_passed']);
        $this->assertEquals(1.0, $validationResults['confidence_score']);
        $this->assertEquals(3, $validationResults['total_fields']);
        $this->assertEquals(3, $validationResults['matched_fields']);
        $this->assertEquals(0, $validationResults['mismatches']);
    }

    public function test_is_supported_document_type()
    {
        // Call isSupportedDocumentType with various document types
        $this->assertTrue($this->documentAnalysisService->isSupportedDocumentType('transcript'));
        $this->assertTrue($this->documentAnalysisService->isSupportedDocumentType('passport'));
        $this->assertTrue($this->documentAnalysisService->isSupportedDocumentType('drivers_license'));
        $this->assertFalse($this->documentAnalysisService->isSupportedDocumentType('unknown_type'));
        $this->assertFalse($this->documentAnalysisService->isSupportedDocumentType('invalid'));
    }

    public function test_get_supported_document_types()
    {
        // Call getSupportedDocumentTypes method
        $supportedTypes = $this->documentAnalysisService->getSupportedDocumentTypes();
        
        // Assert that the returned array contains all expected document types
        $this->assertIsArray($supportedTypes);
        $this->assertContains('transcript', $supportedTypes);
        $this->assertContains('passport', $supportedTypes);
        $this->assertContains('drivers_license', $supportedTypes);
        $this->assertContains('personal_statement', $supportedTypes);
        
        // Assert that the array does not contain unsupported types
        $this->assertNotContains('unknown_type', $supportedTypes);
        $this->assertNotContains('invalid', $supportedTypes);
    }

    public function test_get_confidence_threshold()
    {
        // Call getConfidenceThreshold method
        $threshold = $this->documentAnalysisService->getConfidenceThreshold();
        
        // Assert that the returned value matches the configured threshold
        $this->assertEquals(0.85, $threshold);
    }

    public function test_analyze_document_throws_exception_for_unsupported_type()
    {
        // Set up a test document with an unsupported type
        $document = new Document([
            'id' => 2,
            'user_id' => 1,
            'application_id' => 1,
            'document_type' => 'unsupported_type',
            'file_name' => 'document.pdf',
            'file_path' => 'documents/1/document.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'is_verified' => false
        ]);
        
        // Set expectation for DocumentProcessingException to be thrown
        $this->expectException(DocumentProcessingException::class);
        
        // Call analyzeDocument method with the unsupported document
        $this->documentAnalysisService->analyzeDocument($document);
    }

    public function test_analyze_document_throws_exception_for_missing_file()
    {
        // Set up a test document
        $document = $this->document;
        
        // Mock the Storage facade to return false for file existence
        Storage::shouldReceive('exists')
            ->with($document->file_path)
            ->andReturn(false);
        
        // Set expectation for DocumentProcessingException to be thrown
        $this->expectException(DocumentProcessingException::class);
        
        // Call analyzeDocument method
        $this->documentAnalysisService->analyzeDocument($document);
    }

    public function test_analyze_document_throws_exception_for_api_error()
    {
        // Set up a test document
        $document = $this->document;
        
        // Mock the Storage facade to return true for file existence
        Storage::shouldReceive('exists')
            ->with($document->file_path)
            ->andReturn(true);
        
        // Mock file operations needed for document preparation
        Storage::shouldReceive('path')
            ->with($document->file_path)
            ->andReturn('/tmp/test/transcript.pdf');
            
        Storage::shouldReceive('exists')
            ->with($this->mockConfig['storage_path'] . '/analysis_1_' . md5($document->file_path) . '.json')
            ->andReturn(false);
        
        // Set up the OpenAI client to throw an exception
        $chatMock = Mockery::mock('stdClass');
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($chatMock);
            
        $chatMock->shouldReceive('create')
            ->once()
            ->andThrow(new \Exception('API error occurred'));
        
        // Set expectation for DocumentProcessingException to be thrown
        $this->expectException(DocumentProcessingException::class);
        
        // Call analyzeDocument method
        $this->documentAnalysisService->analyzeDocument($document);
    }

    public function test_verify_document_with_high_confidence()
    {
        // Set up a test document
        $document = $this->document;
        
        // Mock the Storage facade to return true for file existence
        Storage::shouldReceive('exists')
            ->with($document->file_path)
            ->andReturn(true);
        
        // Mock file operations needed for document preparation
        Storage::shouldReceive('path')
            ->with($document->file_path)
            ->andReturn('/tmp/test/transcript.pdf');
        
        // Set up chat response chain for OpenAI client
        $chatMock = Mockery::mock('stdClass');
        $responseMock = Mockery::mock('stdClass');
        
        // High confidence verification results
        $verificationData = [
            'appears_authentic' => true,
            'completeness' => 0.98,
            'consistency' => 0.97,
            'formatting_matches_standard' => true,
            'issues_found' => [],
            'confidence_score' => 0.95,
            'summary' => 'Document appears to be an authentic transcript from Example University.'
        ];
        
        // Mock the OpenAI client to return a high confidence verification response
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($chatMock);
            
        $chatMock->shouldReceive('create')
            ->once()
            ->andReturn($responseMock);
            
        $responseMock->shouldReceive('toArray')
            ->once()
            ->andReturn([
                'choices' => [
                    [
                        'message' => [
                            'content' => json_encode($verificationData)
                        ]
                    ]
                ]
            ]);
            
        // For tampering detection (since it's enabled)
        $tamperingChatMock = Mockery::mock('stdClass');
        $tamperingResponseMock = Mockery::mock('stdClass');
        $tamperingMessageMock = Mockery::mock('stdClass');
        
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($tamperingChatMock);
            
        $tamperingChatMock->shouldReceive('create')
            ->once()
            ->andReturn($tamperingResponseMock);
            
        $tamperingResponseMock->shouldReceive('choices')
            ->andReturn([
                (object)[
                    'message' => $tamperingMessageMock
                ]
            ]);
            
        $tamperingMessageMock->shouldReceive('content')
            ->andReturn(json_encode([
                'tampering_detected' => false,
                'confidence' => 0.98,
                'details' => [],
                'explanation' => 'No signs of tampering detected.'
            ]));
        
        // Call the verifyDocument method on the service
        $verification = $this->documentAnalysisService->verifyDocument($document);
        
        // Assert that the verification status is STATUS_VERIFIED
        $this->assertEquals(DocumentVerification::STATUS_VERIFIED, $verification->verification_status);
        
        // Assert that the confidence score is above the threshold
        $this->assertGreaterThanOrEqual($this->mockConfig['confidence_threshold'], $verification->confidence_score);
    }

    public function test_verify_document_with_low_confidence()
    {
        // Set up a test document
        $document = $this->document;
        
        // Mock the Storage facade to return true for file existence
        Storage::shouldReceive('exists')
            ->with($document->file_path)
            ->andReturn(true);
        
        // Mock file operations needed for document preparation
        Storage::shouldReceive('path')
            ->with($document->file_path)
            ->andReturn('/tmp/test/transcript.pdf');
        
        // Set up chat response chain for OpenAI client
        $chatMock = Mockery::mock('stdClass');
        $responseMock = Mockery::mock('stdClass');
        
        // Low confidence verification results
        $verificationData = [
            'appears_authentic' => false,
            'completeness' => 0.65,
            'consistency' => 0.70,
            'formatting_matches_standard' => false,
            'issues_found' => ['Missing institution seal', 'Inconsistent formatting'],
            'confidence_score' => 0.60,
            'summary' => 'Document has several issues that require manual verification.'
        ];
        
        // Mock the OpenAI client to return a low confidence verification response
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($chatMock);
            
        $chatMock->shouldReceive('create')
            ->once()
            ->andReturn($responseMock);
            
        $responseMock->shouldReceive('toArray')
            ->once()
            ->andReturn([
                'choices' => [
                    [
                        'message' => [
                            'content' => json_encode($verificationData)
                        ]
                    ]
                ]
            ]);
            
        // For tampering detection (since it's enabled)
        $tamperingChatMock = Mockery::mock('stdClass');
        $tamperingResponseMock = Mockery::mock('stdClass');
        $tamperingMessageMock = Mockery::mock('stdClass');
        
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($tamperingChatMock);
            
        $tamperingChatMock->shouldReceive('create')
            ->once()
            ->andReturn($tamperingResponseMock);
            
        $tamperingResponseMock->shouldReceive('choices')
            ->andReturn([
                (object)[
                    'message' => $tamperingMessageMock
                ]
            ]);
            
        $tamperingMessageMock->shouldReceive('content')
            ->andReturn(json_encode([
                'tampering_detected' => false,
                'confidence' => 0.70,
                'details' => [],
                'explanation' => 'No clear signs of tampering, but document quality is questionable.'
            ]));
        
        // Call the verifyDocument method on the service
        $verification = $this->documentAnalysisService->verifyDocument($document);
        
        // Assert that the verification status is STATUS_PENDING
        $this->assertEquals(DocumentVerification::STATUS_PENDING, $verification->verification_status);
        
        // Assert that the confidence score is below the threshold
        $this->assertLessThan($this->mockConfig['confidence_threshold'], $verification->confidence_score);
    }

    public function test_verify_document_with_detected_tampering()
    {
        // Set up a test document
        $document = $this->document;
        
        // Mock the Storage facade to return true for file existence
        Storage::shouldReceive('exists')
            ->with($document->file_path)
            ->andReturn(true);
        
        // Mock file operations needed for document preparation
        Storage::shouldReceive('path')
            ->with($document->file_path)
            ->andReturn('/tmp/test/transcript.pdf');
        
        // Set up chat response chain for OpenAI client
        $chatMock = Mockery::mock('stdClass');
        $responseMock = Mockery::mock('stdClass');
        
        // Verification results with medium confidence
        $verificationData = [
            'appears_authentic' => true,
            'completeness' => 0.90,
            'consistency' => 0.85,
            'formatting_matches_standard' => true,
            'issues_found' => [],
            'confidence_score' => 0.88,
            'summary' => 'Document appears mostly authentic but requires further review.'
        ];
        
        // Mock the OpenAI client to return a verification response with tampering detected
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($chatMock);
            
        $chatMock->shouldReceive('create')
            ->once()
            ->andReturn($responseMock);
            
        $responseMock->shouldReceive('toArray')
            ->once()
            ->andReturn([
                'choices' => [
                    [
                        'message' => [
                            'content' => json_encode($verificationData)
                        ]
                    ]
                ]
            ]);
            
        // For tampering detection with positive result
        $tamperingChatMock = Mockery::mock('stdClass');
        $tamperingResponseMock = Mockery::mock('stdClass');
        $tamperingMessageMock = Mockery::mock('stdClass');
        
        $this->openAIClient->shouldReceive('chat')
            ->once()
            ->andReturn($tamperingChatMock);
            
        $tamperingChatMock->shouldReceive('create')
            ->once()
            ->andReturn($tamperingResponseMock);
            
        $tamperingResponseMock->shouldReceive('choices')
            ->andReturn([
                (object)[
                    'message' => $tamperingMessageMock
                ]
            ]);
            
        $tamperingMessageMock->shouldReceive('content')
            ->andReturn(json_encode([
                'tampering_detected' => true,
                'confidence' => 0.92,
                'details' => [
                    'Digital manipulation around the GPA value',
                    'Inconsistent pixel patterns in signature area'
                ],
                'explanation' => 'Document shows clear signs of digital manipulation.'
            ]));
        
        // Call the verifyDocument method on the service
        $verification = $this->documentAnalysisService->verifyDocument($document);
        
        // Assert that the verification status is STATUS_REJECTED due to tampering
        $this->assertEquals(DocumentVerification::STATUS_REJECTED, $verification->verification_status);
        
        // Assert that the verification data contains tampering indicators
        $this->assertTrue($verification->verification_data['tampering_detected']);
    }

    /**
     * Data provider for supported document type tests
     */
    public function provideSupportedDocumentTypes()
    {
        return [
            ['transcript', true],
            ['passport', true],
            ['drivers_license', true],
            ['id_card', true],
            ['academic_record', true],
            ['recommendation', true],
            ['personal_statement', true],
            ['financial_statement', true],
            ['unknown_type', false],
            ['invalid', false],
            ['', false],
        ];
    }

    /**
     * Test isSupportedDocumentType with various document types using data provider
     * 
     * @dataProvider provideSupportedDocumentTypes
     */
    public function test_is_supported_document_type_with_data_provider(string $documentType, bool $expectedResult)
    {
        // Call isSupportedDocumentType with the provided document type
        $result = $this->documentAnalysisService->isSupportedDocumentType($documentType);
        
        // Assert that the result matches the expected boolean value
        $this->assertEquals($expectedResult, $result);
    }
}