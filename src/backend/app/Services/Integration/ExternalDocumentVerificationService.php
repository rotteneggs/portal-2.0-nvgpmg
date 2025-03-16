<?php

namespace App\Services\Integration;

use App\Models\Document;
use App\Models\DocumentVerification;
use App\Events\DocumentVerifiedEvent;
use App\Exceptions\DocumentProcessingException;
use Illuminate\Support\Facades\Http; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Event; // illuminate/support/facades ^10.0
use Exception; // php 8.2

class ExternalDocumentVerificationService
{
    /**
     * The base URL for the external verification service API.
     */
    protected string $apiUrl;

    /**
     * The API key for authenticating with the external verification service.
     */
    protected string $apiKey;

    /**
     * The timeout for API requests in seconds.
     */
    protected int $timeout;

    /**
     * List of document types supported by the external verification service.
     */
    protected array $supportedDocumentTypes;

    /**
     * Whether external verification is enabled.
     */
    protected bool $enabled;

    /**
     * Create a new external document verification service instance.
     *
     * @return void
     */
    public function __construct()
    {
        // Load configuration from config/integrations.php
        $this->enabled = Config::get('integrations.document_verification.external.enabled', false);
        $this->apiUrl = Config::get('integrations.document_verification.external.api_url', '');
        $this->apiKey = Config::get('integrations.document_verification.external.api_key', '');
        $this->timeout = Config::get('integrations.document_verification.external.timeout', 60);
        $this->supportedDocumentTypes = Config::get('integrations.document_verification.external.supported_document_types', []);
    }

    /**
     * Verify a document using an external verification service.
     *
     * @param Document $document The document to verify
     * @return DocumentVerification The verification record with results
     *
     * @throws DocumentProcessingException When the verification process fails
     */
    public function verifyDocument(Document $document): DocumentVerification
    {
        try {
            // Check if external verification is enabled
            if (!$this->enabled) {
                throw new Exception('External document verification is disabled.');
            }

            // Validate that the document type is supported
            if (!$this->isSupportedDocumentType($document->document_type)) {
                throw new Exception("Document type '{$document->document_type}' is not supported for external verification.");
            }

            // Prepare the document for external verification
            $documentData = $this->prepareDocumentForVerification($document);

            // Send the document to the external verification service
            $response = $this->sendVerificationRequest($documentData);

            // Process the verification response
            $verificationResults = $this->processVerificationResponse($response, $document);

            // Create a DocumentVerification record with the results
            $verification = $this->createVerificationRecord($document, $verificationResults);

            // If verification is successful and confidence is high, mark document as verified
            if (
                $verification->verification_status === DocumentVerification::STATUS_VERIFIED && 
                $verification->confidence_score >= 0.8
            ) {
                $document->verify($verification->verified_by_user_id ?? 1, 'Verified by external service');
            }

            // Dispatch DocumentVerifiedEvent
            Event::dispatch(new DocumentVerifiedEvent($document, $verification));

            return $verification;
        } catch (Exception $exception) {
            return $this->handleVerificationError($exception, $document);
        }
    }

    /**
     * Prepare a document for submission to the external verification service.
     *
     * @param Document $document The document to prepare
     * @return array Prepared document data for API request
     */
    protected function prepareDocumentForVerification(Document $document): array
    {
        // Generate a temporary download URL for the document
        $downloadUrl = $document->getDownloadUrl(60); // URL valid for 60 minutes

        // Prepare document metadata (type, ID, etc.)
        return [
            'document_id' => $document->id,
            'document_type' => $document->document_type,
            'file_url' => $downloadUrl,
            'file_name' => $document->file_name ?? basename($document->file_path),
            'mime_type' => $document->mime_type ?? null,
            'callback_url' => $this->getWebhookEndpoint(),
            'metadata' => [
                'application_id' => $document->application_id,
                'user_id' => $document->user_id,
            ],
        ];
    }

    /**
     * Send a verification request to the external service.
     *
     * @param array $documentData Data to send to the verification service
     * @return array Response from the external verification service
     *
     * @throws Exception When the API request fails
     */
    protected function sendVerificationRequest(array $documentData): array
    {
        try {
            // Prepare the API request with proper headers and authentication
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])
            ->timeout($this->timeout)
            ->post($this->apiUrl . '/verify', $documentData);

            // Handle potential connection errors and timeouts
            if ($response->failed()) {
                throw new Exception(
                    'External verification service request failed: ' . 
                    $response->status() . ' ' . 
                    $response->body()
                );
            }

            // Parse and return the API response
            return $response->json();
        } catch (Exception $exception) {
            Log::error('External verification service request failed', [
                'exception' => $exception->getMessage(),
                'document_data' => array_diff_key($documentData, ['file_url' => '']), // Don't log the URL for security
            ]);

            throw $exception;
        }
    }

    /**
     * Process the response from the external verification service.
     *
     * @param array $response The API response
     * @param Document $document The document being verified
     * @return array Processed verification results with confidence score
     */
    protected function processVerificationResponse(array $response, Document $document): array
    {
        // Extract verification status from the response
        $status = $response['status'] ?? null;
        $confidence = $response['confidence'] ?? 0;
        
        // Extract confidence score from the response
        $verificationStatus = match ($status) {
            'verified', 'approved', 'valid' => DocumentVerification::STATUS_VERIFIED,
            'rejected', 'invalid', 'failed' => DocumentVerification::STATUS_REJECTED,
            default => DocumentVerification::STATUS_PENDING,
        };

        // Format the results in a standardized structure
        return [
            'verification_status' => $verificationStatus,
            'confidence_score' => (float) $confidence,
            'verification_data' => [
                'service_response' => $response,
                'verified_at' => now()->toIso8601String(),
                'document_type' => $document->document_type,
            ],
            'notes' => $response['notes'] ?? null,
        ];
    }

    /**
     * Create a verification record for the document.
     *
     * @param Document $document The document being verified
     * @param array $verificationResults The verification results
     * @return DocumentVerification The created verification record
     */
    protected function createVerificationRecord(Document $document, array $verificationResults): DocumentVerification
    {
        // Create a new DocumentVerification instance
        $verification = new DocumentVerification();
        $verification->document_id = $document->id;
        $verification->verification_method = DocumentVerification::METHOD_EXTERNAL;
        $verification->verification_status = $verificationResults['verification_status'];
        $verification->verification_data = $verificationResults['verification_data'];
        $verification->confidence_score = $verificationResults['confidence_score'];
        
        // Set notes if available in the results
        if (isset($verificationResults['notes'])) {
            $verification->notes = $verificationResults['notes'];
        }
        
        $verification->save();
        
        return $verification;
    }

    /**
     * Handle errors during the external verification process.
     *
     * @param Exception $exception The exception that occurred
     * @param Document $document The document being verified
     * @return DocumentVerification A verification record with error status
     */
    protected function handleVerificationError(Exception $exception, Document $document): DocumentVerification
    {
        // Log the error details
        Log::error('External document verification failed', [
            'document_id' => $document->id,
            'document_type' => $document->document_type,
            'exception' => $exception->getMessage(),
        ]);

        // Create a verification record with STATUS_PENDING
        $verification = new DocumentVerification();
        $verification->document_id = $document->id;
        $verification->verification_method = DocumentVerification::METHOD_EXTERNAL;
        $verification->verification_status = DocumentVerification::STATUS_PENDING;
        $verification->verification_data = [
            'error' => $exception->getMessage(),
            'error_time' => now()->toIso8601String(),
            'document_type' => $document->document_type,
        ];
        $verification->confidence_score = 0;
        $verification->notes = 'External verification failed: ' . $exception->getMessage();
        $verification->save();
        
        return $verification;
    }

    /**
     * Check if a document type is supported for external verification.
     *
     * @param string $documentType The document type to check
     * @return bool True if the document type is supported, false otherwise
     */
    public function isSupportedDocumentType(string $documentType): bool
    {
        return in_array($documentType, $this->supportedDocumentTypes);
    }

    /**
     * Get the list of document types supported for external verification.
     *
     * @return array List of supported document types
     */
    public function getSupportedDocumentTypes(): array
    {
        return $this->supportedDocumentTypes;
    }

    /**
     * Check if external document verification is enabled.
     *
     * @return bool True if enabled, false otherwise
     */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * Get the webhook endpoint URL for receiving verification updates.
     *
     * @return string The webhook endpoint URL
     */
    public function getWebhookEndpoint(): string
    {
        $baseUrl = Config::get('app.url');
        $webhookPath = '/api/v1/integration/document-verification/webhook';
        
        return rtrim($baseUrl, '/') . $webhookPath;
    }

    /**
     * Process a webhook update from the external verification service.
     *
     * @param array $data The webhook data
     * @return bool True if the update was processed successfully, false otherwise
     */
    public function processWebhookUpdate(array $data): bool
    {
        try {
            // Validate the webhook signature
            $this->validateWebhookSignature($data);
            
            // Extract the document ID from the webhook data
            $documentId = $data['document_id'] ?? null;
            
            if (!$documentId) {
                Log::error('External verification webhook missing document_id', ['data' => $data]);
                return false;
            }
            
            // Retrieve the document from the database
            $document = Document::find($documentId);
            
            if (!$document) {
                Log::error('External verification webhook for non-existent document', [
                    'document_id' => $documentId
                ]);
                return false;
            }
            
            // Update the verification status based on the webhook data
            $verificationResults = [
                'verification_status' => $this->mapWebhookStatus($data['status'] ?? 'pending'),
                'confidence_score' => (float) ($data['confidence'] ?? 0),
                'verification_data' => [
                    'webhook_data' => $data,
                    'received_at' => now()->toIso8601String(),
                    'document_type' => $document->document_type,
                ],
                'notes' => $data['notes'] ?? 'Updated via webhook from external verification service',
            ];
            
            // Create or update the verification record
            $verification = $this->createVerificationRecord($document, $verificationResults);
            
            // If verified with high confidence, update document status
            if (
                $verification->verification_status === DocumentVerification::STATUS_VERIFIED && 
                $verification->confidence_score >= 0.8
            ) {
                $document->verify($verification->verified_by_user_id ?? 1, 'Verified by external service via webhook');
            }
            
            // Dispatch appropriate events based on the verification result
            Event::dispatch(new DocumentVerifiedEvent($document, $verification));
            
            return true;
        } catch (Exception $exception) {
            Log::error('Failed to process external verification webhook', [
                'exception' => $exception->getMessage(),
                'data' => $data,
            ]);
            
            return false;
        }
    }
    
    /**
     * Validate the signature of the incoming webhook.
     *
     * @param array $data The webhook data
     * @return bool True if the signature is valid
     * 
     * @throws Exception If the signature is invalid
     */
    protected function validateWebhookSignature(array $data): bool
    {
        // Get the signature from the request header
        $providedSignature = request()->header('X-Verification-Signature');
        
        if (!$providedSignature) {
            Log::warning('Missing webhook signature header');
            return true; // For now, don't enforce signatures
        }
        
        // Compute expected signature using HMAC
        $payload = json_encode($data);
        $expectedSignature = hash_hmac('sha256', $payload, $this->apiKey);
        
        if (!hash_equals($expectedSignature, $providedSignature)) {
            throw new Exception('Invalid webhook signature');
        }
        
        return true;
    }
    
    /**
     * Map the webhook status to our internal verification status.
     *
     * @param string $webhookStatus The status from the webhook
     * @return string The internal verification status
     */
    protected function mapWebhookStatus(string $webhookStatus): string
    {
        return match (strtolower($webhookStatus)) {
            'verified', 'approved', 'valid', 'accepted' => DocumentVerification::STATUS_VERIFIED,
            'rejected', 'invalid', 'failed', 'declined' => DocumentVerification::STATUS_REJECTED,
            default => DocumentVerification::STATUS_PENDING,
        };
    }
}