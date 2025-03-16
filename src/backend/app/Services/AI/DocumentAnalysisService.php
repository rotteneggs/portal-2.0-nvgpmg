<?php

namespace App\Services\AI;

use App\Exceptions\DocumentProcessingException;
use App\Models\Document;
use App\Models\DocumentVerification;
use Exception;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use OpenAI; // openai-php/client ^1.0

class DocumentAnalysisService
{
    /**
     * The OpenAI client instance.
     *
     * @var OpenAI
     */
    protected OpenAI $openAIClient;

    /**
     * The AI model to use for document analysis.
     *
     * @var string
     */
    protected string $model;

    /**
     * The confidence threshold for automatic verification.
     *
     * @var float
     */
    protected float $confidenceThreshold;

    /**
     * The document types supported for AI analysis.
     *
     * @var array
     */
    protected array $supportedDocumentTypes;

    /**
     * Flag indicating whether tampering detection is enabled.
     *
     * @var bool
     */
    protected bool $tamperingDetectionEnabled;

    /**
     * The storage path for analysis results.
     *
     * @var string
     */
    protected string $storagePath;

    /**
     * Create a new document analysis service instance.
     *
     * @param OpenAI $openAIClient
     * @return void
     */
    public function __construct(OpenAI $openAIClient)
    {
        $this->openAIClient = $openAIClient;
        
        // Load configuration values from config/ai.php
        $this->model = Config::get('ai.document_analysis.model', 'gpt-4-vision-preview');
        $this->confidenceThreshold = Config::get('ai.document_analysis.confidence_threshold', 0.85);
        $this->supportedDocumentTypes = Config::get('ai.document_analysis.supported_types', [
            'transcript', 
            'passport', 
            'drivers_license', 
            'id_card', 
            'academic_record', 
            'recommendation', 
            'personal_statement', 
            'financial_statement'
        ]);
        $this->tamperingDetectionEnabled = Config::get('ai.document_analysis.tampering_detection', true);
        $this->storagePath = Config::get('ai.document_analysis.storage_path', 'document_analysis');
    }

    /**
     * Analyze a document to extract relevant information.
     *
     * @param Document $document
     * @return array Extracted data from the document
     * @throws DocumentProcessingException
     */
    public function analyzeDocument(Document $document): array
    {
        // Check if document type is supported
        if (!$this->isSupportedDocumentType($document->document_type)) {
            throw DocumentProcessingException::createFromAnalysisError(
                "Document type '{$document->document_type}' is not supported for AI analysis",
                ['document_id' => $document->id, 'document_type' => $document->document_type]
            );
        }

        // Check if file exists
        if (!Storage::exists($document->file_path)) {
            throw DocumentProcessingException::createFromAccessError(
                "Document file not found at path: {$document->file_path}",
                ['document_id' => $document->id, 'file_path' => $document->file_path]
            );
        }

        // Check if we have already analyzed this document
        $cachedResults = $this->getStoredAnalysisResults($document);
        if ($cachedResults !== null) {
            Log::info("Using cached analysis results for document ID: {$document->id}");
            return $cachedResults;
        }

        try {
            // Prepare document for analysis
            $preparedDocument = $this->prepareDocumentForAnalysis($document);
            
            // Get the appropriate analysis prompt
            $prompt = $this->getAnalysisPrompt($document->document_type);
            
            // Call the OpenAI API
            $response = $this->openAIClient->chat()->create([
                'model' => $this->model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a highly accurate document analysis assistant that extracts structured information from documents.'
                    ],
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => $prompt
                            ],
                            $preparedDocument
                        ]
                    ]
                ],
                'response_format' => ['type' => 'json_object']
            ]);
            
            // Parse the response to extract structured data
            $results = $this->parseAnalysisResponse($response->toArray(), $document->document_type);
            
            // Store the results for future reference
            $this->storeAnalysisResults($document, $results);
            
            return $results;
        } catch (Exception $e) {
            Log::error("Error analyzing document: {$e->getMessage()}", [
                'document_id' => $document->id,
                'exception' => $e
            ]);
            
            throw DocumentProcessingException::createFromAnalysisError(
                "Failed to analyze document: {$e->getMessage()}",
                ['document_id' => $document->id, 'document_type' => $document->document_type],
                $e
            );
        }
    }

    /**
     * Verify a document's authenticity and content.
     *
     * @param Document $document
     * @return DocumentVerification The verification record with results
     * @throws DocumentProcessingException
     */
    public function verifyDocument(Document $document): DocumentVerification
    {
        // Check if document type is supported
        if (!$this->isSupportedDocumentType($document->document_type)) {
            throw DocumentProcessingException::createFromVerificationError(
                "Document type '{$document->document_type}' is not supported for AI verification",
                ['document_id' => $document->id, 'document_type' => $document->document_type]
            );
        }

        // Check if file exists
        if (!Storage::exists($document->file_path)) {
            throw DocumentProcessingException::createFromAccessError(
                "Document file not found at path: {$document->file_path}",
                ['document_id' => $document->id, 'file_path' => $document->file_path]
            );
        }

        try {
            // Prepare document for verification
            $preparedDocument = $this->prepareDocumentForAnalysis($document);
            
            // Get the appropriate verification prompt
            $prompt = $this->getVerificationPrompt($document->document_type);
            
            // Call the OpenAI API
            $response = $this->openAIClient->chat()->create([
                'model' => $this->model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a highly accurate document verification assistant that checks documents for authenticity and completeness.'
                    ],
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => $prompt
                            ],
                            $preparedDocument
                        ]
                    ]
                ],
                'response_format' => ['type' => 'json_object']
            ]);
            
            // Parse the response to extract verification results
            $verificationResults = $this->parseVerificationResponse($response->toArray(), $document->document_type);
            
            // Check for tampering if enabled
            if ($this->tamperingDetectionEnabled) {
                $tamperingResults = $this->detectDocumentTampering($document);
                $verificationResults['tampering_detected'] = $tamperingResults['tampering_detected'];
                $verificationResults['tampering_details'] = $tamperingResults['details'];
                
                // Adjust confidence score based on tampering detection
                if ($tamperingResults['tampering_detected']) {
                    $verificationResults['confidence_score'] *= (1 - $tamperingResults['confidence']);
                }
            }
            
            // Calculate overall confidence score
            $confidenceScore = $this->calculateConfidenceScore($verificationResults);
            
            // Determine verification status based on confidence score
            $status = $confidenceScore >= $this->confidenceThreshold 
                ? DocumentVerification::STATUS_VERIFIED 
                : DocumentVerification::STATUS_PENDING;
            
            // Create and return a DocumentVerification record
            $verification = new DocumentVerification([
                'document_id' => $document->id,
                'verification_method' => DocumentVerification::METHOD_AI,
                'verification_status' => $status,
                'verification_data' => $verificationResults,
                'confidence_score' => $confidenceScore,
                'notes' => $verificationResults['summary'] ?? 'AI document verification'
            ]);
            
            $verification->save();
            
            // If document was verified automatically, update the document status
            if ($status === DocumentVerification::STATUS_VERIFIED) {
                $document->is_verified = true;
                $document->verified_at = now();
                $document->save();
            }
            
            return $verification;
        } catch (Exception $e) {
            Log::error("Error verifying document: {$e->getMessage()}", [
                'document_id' => $document->id,
                'exception' => $e
            ]);
            
            throw DocumentProcessingException::createFromVerificationError(
                "Failed to verify document: {$e->getMessage()}",
                ['document_id' => $document->id, 'document_type' => $document->document_type],
                $e
            );
        }
    }

    /**
     * Extract text content from a document.
     *
     * @param Document $document
     * @return string Extracted text content
     * @throws DocumentProcessingException
     */
    public function extractTextFromDocument(Document $document): string
    {
        // Check if file exists
        if (!Storage::exists($document->file_path)) {
            throw DocumentProcessingException::createFromAccessError(
                "Document file not found at path: {$document->file_path}",
                ['document_id' => $document->id, 'file_path' => $document->file_path]
            );
        }

        try {
            // Different approaches based on document type
            if ($document->isPdf()) {
                // For PDFs, use OpenAI to extract text
                $preparedDocument = $this->prepareDocumentForAnalysis($document);
                
                $response = $this->openAIClient->chat()->create([
                    'model' => $this->model,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are a text extraction assistant. Extract all text content from the document.'
                        ],
                        [
                            'role' => 'user',
                            'content' => [
                                [
                                    'type' => 'text',
                                    'text' => 'Extract all text content from this document. Return only the extracted text without any additional comments.'
                                ],
                                $preparedDocument
                            ]
                        ]
                    ]
                ]);
                
                return $response->choices[0]->message->content;
            } elseif ($document->isImage()) {
                // For images, use OpenAI to perform OCR
                $preparedDocument = $this->prepareDocumentForAnalysis($document);
                
                $response = $this->openAIClient->chat()->create([
                    'model' => $this->model,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are an OCR assistant. Extract all text content from the image.'
                        ],
                        [
                            'role' => 'user',
                            'content' => [
                                [
                                    'type' => 'text',
                                    'text' => 'Extract all text visible in this image. Return only the extracted text without any additional comments.'
                                ],
                                $preparedDocument
                            ]
                        ]
                    ]
                ]);
                
                return $response->choices[0]->message->content;
            } else {
                throw DocumentProcessingException::createFromFormatError(
                    "Unsupported file format for text extraction: {$document->mime_type}",
                    ['document_id' => $document->id, 'mime_type' => $document->mime_type]
                );
            }
        } catch (Exception $e) {
            Log::error("Error extracting text from document: {$e->getMessage()}", [
                'document_id' => $document->id,
                'exception' => $e
            ]);
            
            throw DocumentProcessingException::createFromAnalysisError(
                "Failed to extract text from document: {$e->getMessage()}",
                ['document_id' => $document->id, 'mime_type' => $document->mime_type],
                $e
            );
        }
    }

    /**
     * Detect signs of tampering or manipulation in a document.
     *
     * @param Document $document
     * @return array Tampering detection results with confidence score
     * @throws DocumentProcessingException
     */
    public function detectDocumentTampering(Document $document): array
    {
        if (!$this->tamperingDetectionEnabled) {
            return [
                'tampering_detected' => false,
                'confidence' => 0,
                'details' => []
            ];
        }

        // Check if file exists
        if (!Storage::exists($document->file_path)) {
            throw DocumentProcessingException::createFromAccessError(
                "Document file not found at path: {$document->file_path}",
                ['document_id' => $document->id, 'file_path' => $document->file_path]
            );
        }

        try {
            // Prepare document for analysis
            $preparedDocument = $this->prepareDocumentForAnalysis($document);
            
            // Call the OpenAI API with a tampering detection prompt
            $response = $this->openAIClient->chat()->create([
                'model' => $this->model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a document forensics specialist who examines documents for signs of tampering, manipulation, or forgery.'
                    ],
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => "Analyze this document for any signs of tampering or manipulation. Look for inconsistencies in text, irregular patterns, digital artifacts, misaligned elements, font inconsistencies, or anything that suggests the document may have been altered. Provide a detailed analysis with a confidence score (0-1) on whether the document shows signs of tampering. Format your response as JSON with the following structure: {\"tampering_detected\": boolean, \"confidence\": float, \"details\": [list of specific issues found], \"explanation\": string}."
                            ],
                            $preparedDocument
                        ]
                    ]
                ],
                'response_format' => ['type' => 'json_object']
            ]);
            
            // Parse the response
            $result = json_decode($response->choices[0]->message->content, true);
            
            if (!is_array($result) || !isset($result['tampering_detected']) || !isset($result['confidence'])) {
                throw new Exception('Invalid response format from tampering detection');
            }
            
            return [
                'tampering_detected' => (bool) $result['tampering_detected'],
                'confidence' => (float) $result['confidence'],
                'details' => $result['details'] ?? [],
                'explanation' => $result['explanation'] ?? ''
            ];
        } catch (Exception $e) {
            Log::error("Error detecting document tampering: {$e->getMessage()}", [
                'document_id' => $document->id,
                'exception' => $e
            ]);
            
            throw DocumentProcessingException::createFromAnalysisError(
                "Failed to detect document tampering: {$e->getMessage()}",
                ['document_id' => $document->id, 'document_type' => $document->document_type],
                $e
            );
        }
    }

    /**
     * Validate the content of a document against expected values.
     *
     * @param Document $document
     * @param array $expectedData
     * @return array Validation results with confidence score
     * @throws DocumentProcessingException
     */
    public function validateDocumentContent(Document $document, array $expectedData): array
    {
        try {
            // Extract data from the document
            $extractedData = $this->analyzeDocument($document);
            
            // Compare extracted data with expected values
            $matchResults = [];
            $totalFields = 0;
            $matchedFields = 0;
            
            foreach ($expectedData as $field => $expectedValue) {
                if (isset($extractedData[$field])) {
                    $totalFields++;
                    $extractedValue = $extractedData[$field];
                    
                    // Calculate similarity/match for this field
                    $similarity = $this->calculateFieldSimilarity($expectedValue, $extractedValue);
                    
                    $matchResults[$field] = [
                        'expected' => $expectedValue,
                        'extracted' => $extractedValue,
                        'match' => $similarity >= 0.8,
                        'similarity' => $similarity
                    ];
                    
                    if ($similarity >= 0.8) {
                        $matchedFields++;
                    }
                }
            }
            
            // Calculate overall confidence score
            $confidenceScore = $totalFields > 0 ? ($matchedFields / $totalFields) : 0;
            
            return [
                'validation_passed' => $confidenceScore >= $this->confidenceThreshold,
                'confidence_score' => $confidenceScore,
                'field_matches' => $matchResults,
                'total_fields' => $totalFields,
                'matched_fields' => $matchedFields,
                'mismatches' => $totalFields - $matchedFields
            ];
        } catch (Exception $e) {
            Log::error("Error validating document content: {$e->getMessage()}", [
                'document_id' => $document->id,
                'exception' => $e
            ]);
            
            throw DocumentProcessingException::createFromAnalysisError(
                "Failed to validate document content: {$e->getMessage()}",
                ['document_id' => $document->id, 'document_type' => $document->document_type],
                $e
            );
        }
    }

    /**
     * Prepare a document for analysis by the AI model.
     *
     * @param Document $document
     * @return array Prepared document data for API request
     * @throws DocumentProcessingException
     */
    protected function prepareDocumentForAnalysis(Document $document): array
    {
        try {
            $filePath = Storage::path($document->file_path);
            
            if ($document->isImage()) {
                // For images, we can use base64 encoding or a URL
                $imageData = base64_encode(file_get_contents($filePath));
                return [
                    'type' => 'image_url',
                    'image_url' => [
                        'url' => "data:{$document->mime_type};base64,{$imageData}"
                    ]
                ];
            } elseif ($document->isPdf()) {
                // For PDFs, OpenAI API may require conversion to images or extracting specific pages
                // This is a simplified approach - in production, you might want to extract and process pages individually
                $imageData = base64_encode(file_get_contents($filePath));
                return [
                    'type' => 'image_url',
                    'image_url' => [
                        'url' => "data:application/pdf;base64,{$imageData}"
                    ]
                ];
            } else {
                throw DocumentProcessingException::createFromFormatError(
                    "Unsupported file format for analysis: {$document->mime_type}",
                    ['document_id' => $document->id, 'mime_type' => $document->mime_type]
                );
            }
        } catch (Exception $e) {
            Log::error("Error preparing document for analysis: {$e->getMessage()}", [
                'document_id' => $document->id,
                'exception' => $e
            ]);
            
            throw DocumentProcessingException::createFromAnalysisError(
                "Failed to prepare document for analysis: {$e->getMessage()}",
                ['document_id' => $document->id, 'mime_type' => $document->mime_type],
                $e
            );
        }
    }

    /**
     * Get the appropriate analysis prompt for a document type.
     *
     * @param string $documentType
     * @return string Analysis prompt for the AI model
     */
    protected function getAnalysisPrompt(string $documentType): string
    {
        $basePrompt = "Extract all relevant information from this {$documentType} document. Analyze the content and structure to identify key data fields. Format your response as a JSON object with appropriate field names and values.";
        
        // Customize prompt based on document type
        switch ($documentType) {
            case 'transcript':
            case 'academic_record':
                return $basePrompt . " Include the following fields if present: institution_name, student_name, student_id, issue_date, graduation_date, gpa, courses (as an array of objects with course_code, course_name, grade, credits), total_credits, degree_earned, and any additional relevant academic information.";
                
            case 'passport':
                return $basePrompt . " Include the following fields if present: document_type, issuing_country, passport_number, surname, given_names, nationality, date_of_birth, place_of_birth, gender, issue_date, expiry_date, authority, and any machine-readable zone (MRZ) information.";
                
            case 'drivers_license':
            case 'id_card':
                return $basePrompt . " Include the following fields if present: document_type, issuing_authority, id_number, full_name, address, date_of_birth, issue_date, expiry_date, class/type, restrictions, and any additional identifying information.";
                
            case 'recommendation':
                return $basePrompt . " Include the following fields if present: recommender_name, recommender_title, recommender_institution, recommender_relationship, student_name, date_written, content_summary, strengths_mentioned, areas_of_improvement, overall_recommendation_level (e.g., highly recommend, recommend, etc.).";
                
            case 'personal_statement':
                return $basePrompt . " Include the following fields if present: author_name, title, date, target_program, word_count, main_themes, key_experiences, key_qualities, goals_mentioned, writing_quality_assessment.";
                
            case 'financial_statement':
                return $basePrompt . " Include the following fields if present: institution_name, account_holder, account_type, account_number (last 4 digits only), statement_date, beginning_balance, ending_balance, currency, transaction_period, and any relevant financial information that indicates financial capacity.";
                
            default:
                return $basePrompt . " Extract all key information fields and values present in the document.";
        }
    }

    /**
     * Get the appropriate verification prompt for a document type.
     *
     * @param string $documentType
     * @return string Verification prompt for the AI model
     */
    protected function getVerificationPrompt(string $documentType): string
    {
        $basePrompt = "Verify the authenticity and integrity of this {$documentType} document. Analyze it for completeness, consistency, and standard formatting. Format your response as a JSON object with the following structure: {\"appears_authentic\": boolean, \"completeness\": float, \"consistency\": float, \"formatting_matches_standard\": boolean, \"issues_found\": [array of specific issues], \"confidence_score\": float, \"summary\": string}.";
        
        if ($this->tamperingDetectionEnabled) {
            $basePrompt .= " Also check for any signs of tampering or manipulation such as irregular patterns, inconsistent fonts, digital artifacts, or misaligned elements, and include this in your assessment.";
        }
        
        // Customize prompt based on document type
        switch ($documentType) {
            case 'transcript':
            case 'academic_record':
                return $basePrompt . " For academic documents, verify for institutional formatting, proper header/footer, consistent course listing, appropriate grading scheme, and official signatures or watermarks if visible.";
                
            case 'passport':
            case 'drivers_license':
            case 'id_card':
                return $basePrompt . " For identification documents, check for standard security features (where visible), consistent formatting, appropriate issuing authority marks, and proper layout of personal information.";
                
            case 'recommendation':
                return $basePrompt . " For recommendation letters, verify for proper letterhead (if applicable), signature, consistent formatting, and appropriate professional tone.";
                
            case 'personal_statement':
                return $basePrompt . " For personal statements, verify for consistent formatting, appropriate length, and coherent structure.";
                
            case 'financial_statement':
                return $basePrompt . " For financial documents, verify for institutional formatting, consistent calculation, appropriate headers/footers, and standard financial statement structure.";
                
            default:
                return $basePrompt;
        }
    }

    /**
     * Parse the AI model response for document analysis.
     *
     * @param array $response
     * @param string $documentType
     * @return array Structured data extracted from the response
     * @throws Exception
     */
    protected function parseAnalysisResponse(array $response, string $documentType): array
    {
        try {
            $content = $response['choices'][0]['message']['content'] ?? '';
            
            if (empty($content)) {
                throw new Exception("Empty response from AI model");
            }
            
            // Response should be JSON
            $data = json_decode($content, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                // If not valid JSON, try to extract JSON from text
                preg_match('/\{.*\}/s', $content, $matches);
                if (!empty($matches[0])) {
                    $data = json_decode($matches[0], true);
                }
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception("Invalid JSON in AI response: " . json_last_error_msg());
                }
            }
            
            // Add document type to the extracted data
            $data['document_type'] = $documentType;
            
            return $data;
        } catch (Exception $e) {
            Log::error("Error parsing analysis response: {$e->getMessage()}", [
                'document_type' => $documentType,
                'response' => $response,
                'exception' => $e
            ]);
            
            throw new Exception("Failed to parse analysis response: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Parse the AI model response for document verification.
     *
     * @param array $response
     * @param string $documentType
     * @return array Verification results with confidence scores
     * @throws Exception
     */
    protected function parseVerificationResponse(array $response, string $documentType): array
    {
        try {
            $content = $response['choices'][0]['message']['content'] ?? '';
            
            if (empty($content)) {
                throw new Exception("Empty response from AI model");
            }
            
            // Response should be JSON
            $data = json_decode($content, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                // If not valid JSON, try to extract JSON from text
                preg_match('/\{.*\}/s', $content, $matches);
                if (!empty($matches[0])) {
                    $data = json_decode($matches[0], true);
                }
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception("Invalid JSON in AI response: " . json_last_error_msg());
                }
            }
            
            // Ensure we have all required fields with defaults if missing
            $result = [
                'appears_authentic' => $data['appears_authentic'] ?? false,
                'completeness' => $data['completeness'] ?? 0.0,
                'consistency' => $data['consistency'] ?? 0.0,
                'formatting_matches_standard' => $data['formatting_matches_standard'] ?? false,
                'issues_found' => $data['issues_found'] ?? [],
                'confidence_score' => $data['confidence_score'] ?? 0.0,
                'summary' => $data['summary'] ?? 'Document verification completed',
                'document_type' => $documentType
            ];
            
            return $result;
        } catch (Exception $e) {
            Log::error("Error parsing verification response: {$e->getMessage()}", [
                'document_type' => $documentType,
                'response' => $response,
                'exception' => $e
            ]);
            
            throw new Exception("Failed to parse verification response: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Store document analysis results for future reference.
     *
     * @param Document $document
     * @param array $results
     * @return string Path to the stored results
     */
    protected function storeAnalysisResults(Document $document, array $results): string
    {
        $filename = "analysis_{$document->id}_" . md5($document->file_path) . '.json';
        $path = $this->storagePath . '/' . $filename;
        
        Storage::put($path, json_encode($results, JSON_PRETTY_PRINT));
        
        return $path;
    }

    /**
     * Retrieve previously stored analysis results for a document.
     *
     * @param Document $document
     * @return array|null Previously stored analysis results or null if not found
     */
    protected function getStoredAnalysisResults(Document $document): ?array
    {
        $filename = "analysis_{$document->id}_" . md5($document->file_path) . '.json';
        $path = $this->storagePath . '/' . $filename;
        
        if (Storage::exists($path)) {
            $content = Storage::get($path);
            return json_decode($content, true);
        }
        
        return null;
    }

    /**
     * Calculate an overall confidence score for document verification.
     *
     * @param array $verificationResults
     * @return float Confidence score between 0 and 1
     */
    protected function calculateConfidenceScore(array $verificationResults): float
    {
        // Use provided confidence score if available and valid
        if (isset($verificationResults['confidence_score']) && 
            is_numeric($verificationResults['confidence_score']) && 
            $verificationResults['confidence_score'] >= 0 && 
            $verificationResults['confidence_score'] <= 1) {
            return (float) $verificationResults['confidence_score'];
        }
        
        // Otherwise calculate from component scores with weights
        $weights = [
            'appears_authentic' => 0.4,
            'completeness' => 0.2,
            'consistency' => 0.2,
            'formatting_matches_standard' => 0.2
        ];
        
        $score = 0;
        
        if (isset($verificationResults['appears_authentic'])) {
            $score += ($verificationResults['appears_authentic'] ? 1 : 0) * $weights['appears_authentic'];
        }
        
        if (isset($verificationResults['completeness']) && is_numeric($verificationResults['completeness'])) {
            $score += min(max((float) $verificationResults['completeness'], 0), 1) * $weights['completeness'];
        }
        
        if (isset($verificationResults['consistency']) && is_numeric($verificationResults['consistency'])) {
            $score += min(max((float) $verificationResults['consistency'], 0), 1) * $weights['consistency'];
        }
        
        if (isset($verificationResults['formatting_matches_standard'])) {
            $score += ($verificationResults['formatting_matches_standard'] ? 1 : 0) * $weights['formatting_matches_standard'];
        }
        
        // Apply penalty for issues found
        if (isset($verificationResults['issues_found']) && is_array($verificationResults['issues_found'])) {
            $issueCount = count($verificationResults['issues_found']);
            // Up to 50% reduction based on number of issues (capped at 5 issues)
            $penalty = min($issueCount / 10, 0.5);
            $score *= (1 - $penalty);
        }
        
        // Apply penalty for tampering if detected
        if (isset($verificationResults['tampering_detected']) && $verificationResults['tampering_detected']) {
            $tamperingConfidence = $verificationResults['tampering_confidence'] ?? 0.5;
            $score *= (1 - $tamperingConfidence);
        }
        
        return max(min($score, 1.0), 0.0);
    }

    /**
     * Calculate similarity between expected and extracted field values.
     *
     * @param mixed $expected
     * @param mixed $extracted
     * @return float Similarity score between 0 and 1
     */
    protected function calculateFieldSimilarity($expected, $extracted): float
    {
        // Convert both to strings for comparison
        $expectedStr = is_array($expected) ? json_encode($expected) : (string) $expected;
        $extractedStr = is_array($extracted) ? json_encode($extracted) : (string) $extracted;
        
        // Exact match
        if ($expectedStr === $extractedStr) {
            return 1.0;
        }
        
        // Numeric comparison
        if (is_numeric($expected) && is_numeric($extracted)) {
            $diff = abs($expected - $extracted);
            $max = max(abs($expected), abs($extracted));
            
            if ($max === 0) {
                return 1.0; // Both are zero
            }
            
            return max(0, 1 - ($diff / $max));
        }
        
        // Date comparison
        if ($this->isDateString($expectedStr) && $this->isDateString($extractedStr)) {
            try {
                $date1 = new \DateTime($expectedStr);
                $date2 = new \DateTime($extractedStr);
                $diff = abs($date1->getTimestamp() - $date2->getTimestamp());
                
                // Consider dates within 1 day (86400 seconds) to be similar
                return max(0, 1 - min($diff / 86400, 1));
            } catch (\Exception $e) {
                // Continue to string comparison if date parsing fails
            }
        }
        
        // String similarity using Levenshtein distance
        $maxLen = max(strlen($expectedStr), strlen($extractedStr));
        
        if ($maxLen === 0) {
            return 1.0; // Both are empty strings
        }
        
        $levenshtein = levenshtein($expectedStr, $extractedStr);
        return max(0, 1 - ($levenshtein / $maxLen));
    }

    /**
     * Check if a string appears to be a date.
     *
     * @param string $str
     * @return bool
     */
    protected function isDateString(string $str): bool
    {
        // Check for common date formats
        return preg_match('/^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/', $str) ||
               preg_match('/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/', $str) ||
               strtotime($str) !== false;
    }

    /**
     * Check if a document type is supported for AI analysis.
     *
     * @param string $documentType
     * @return bool True if the document type is supported, false otherwise
     */
    public function isSupportedDocumentType(string $documentType): bool
    {
        return in_array($documentType, $this->supportedDocumentTypes);
    }

    /**
     * Get the list of document types supported for AI analysis.
     *
     * @return array List of supported document types
     */
    public function getSupportedDocumentTypes(): array
    {
        return $this->supportedDocumentTypes;
    }

    /**
     * Get the confidence threshold for automatic verification.
     *
     * @return float Confidence threshold value
     */
    public function getConfidenceThreshold(): float
    {
        return $this->confidenceThreshold;
    }
}