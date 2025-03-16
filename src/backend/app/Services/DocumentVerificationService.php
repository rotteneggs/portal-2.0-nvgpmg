<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentVerification;
use App\Events\DocumentVerifiedEvent;
use App\Exceptions\DocumentProcessingException;
use App\Services\AI\DocumentAnalysisService;
use App\Services\Integration\ExternalDocumentVerificationService;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Config;
use Exception;

/**
 * Service class for managing document verification processes
 */
class DocumentVerificationService
{
    /**
     * The document analysis service instance.
     */
    protected DocumentAnalysisService $documentAnalysisService;

    /**
     * The external verification service instance.
     */
    protected ExternalDocumentVerificationService $externalVerificationService;

    /**
     * The audit service instance.
     */
    protected AuditService $auditService;

    /**
     * Whether AI verification is enabled.
     */
    protected bool $aiVerificationEnabled;

    /**
     * Whether external verification is enabled.
     */
    protected bool $externalVerificationEnabled;

    /**
     * The preferred verification methods by document type.
     */
    protected array $verificationMethodsByDocumentType;

    /**
     * The high confidence threshold for automatic verification.
     */
    protected float $highConfidenceThreshold;

    /**
     * The low confidence threshold for verification.
     */
    protected float $lowConfidenceThreshold;

    /**
     * Create a new document verification service instance
     *
     * @param DocumentAnalysisService $documentAnalysisService
     * @param ExternalDocumentVerificationService $externalVerificationService
     * @param AuditService $auditService
     */
    public function __construct(
        DocumentAnalysisService $documentAnalysisService,
        ExternalDocumentVerificationService $externalVerificationService,
        AuditService $auditService
    ) {
        // Set the document analysis service instance
        $this->documentAnalysisService = $documentAnalysisService;
        // Set the external verification service instance
        $this->externalVerificationService = $externalVerificationService;
        // Set the audit service instance
        $this->auditService = $auditService;
        
        // Load configuration from config/workflow.php
        $this->aiVerificationEnabled = Config::get('workflow.document_verification.ai_enabled', true);
        $this->externalVerificationEnabled = Config::get('workflow.document_verification.external_enabled', false);
        $this->verificationMethodsByDocumentType = Config::get('workflow.document_verification.preferred_methods', []);
        $this->highConfidenceThreshold = Config::get('workflow.document_verification.high_confidence_threshold', 0.9);
        $this->lowConfidenceThreshold = Config::get('workflow.document_verification.low_confidence_threshold', 0.6);
    }

    /**
     * Verify a document using the appropriate verification method
     *
     * @param Document $document
     * @param string|null $method
     * @return DocumentVerification The verification record with results
     * @throws DocumentProcessingException
     */
    public function verifyDocument(Document $document, ?string $method = null): DocumentVerification
    {
        try {
            // If method is not provided, determine the best verification method for the document type
            if ($method === null) {
                $method = $this->determineVerificationMethod($document->document_type);
            }

            // Validate that the document exists
            if (!$document || !$document->exists) {
                throw new Exception("Document not found or invalid");
            }

            // Based on the method, call the appropriate verification function (AI, external, or manual)
            $verification = match ($method) {
                DocumentVerification::METHOD_AI => $this->verifyDocumentWithAI($document),
                DocumentVerification::METHOD_EXTERNAL => $this->verifyDocumentWithExternalService($document),
                DocumentVerification::METHOD_MANUAL => $this->verifyDocumentManually($document, []),
                default => throw new Exception("Unsupported verification method: {$method}")
            };
            
            // Log the verification attempt using the audit service
            $this->auditService->log(
                'document_verification',
                'document',
                $document->id,
                null,
                [
                    'method' => $method,
                    'verification_id' => $verification->id,
                    'status' => $verification->verification_status
                ]
            );
            
            // Return the verification record
            return $verification;
        } catch (Exception $e) {
            Log::error("Document verification failed: {$e->getMessage()}", [
                'document_id' => $document->id,
                'document_type' => $document->document_type,
                'method' => $method,
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
     * Verify a document using AI analysis
     *
     * @param Document $document
     * @return DocumentVerification The verification record with results
     * @throws Exception
     */
    private function verifyDocumentWithAI(Document $document): DocumentVerification
    {
        // Check if AI verification is enabled
        if (!$this->aiVerificationEnabled) {
            throw new Exception("AI document verification is disabled");
        }
        
        // Check if the document type is supported by the AI service
        if (!$this->documentAnalysisService->isSupportedDocumentType($document->document_type)) {
            throw new Exception("Document type '{$document->document_type}' is not supported by AI verification");
        }
        
        // Call the document analysis service to verify the document
        $verification = $this->documentAnalysisService->verifyDocument($document);
        
        // Process the verification results based on confidence score
        if ($verification->confidence_score >= $this->highConfidenceThreshold) {
            // If confidence is above high threshold, automatically mark as verified
            $document->verify($verification->verified_by_user_id ?? 1);
        } else if ($verification->confidence_score < $this->lowConfidenceThreshold) {
            // If confidence is below low threshold, mark for manual review
            $verification->verification_status = DocumentVerification::STATUS_PENDING;
            $verification->save();
        } else {
            // If confidence is between thresholds, mark as pending for manual review
            $verification->verification_status = DocumentVerification::STATUS_PENDING;
            $verification->save();
        }
        
        // Return the verification record
        return $verification;
    }

    /**
     * Verify a document using an external verification service
     *
     * @param Document $document
     * @return DocumentVerification The verification record with results
     * @throws Exception
     */
    private function verifyDocumentWithExternalService(Document $document): DocumentVerification
    {
        // Check if external verification is enabled
        if (!$this->externalVerificationEnabled) {
            throw new Exception("External document verification is disabled");
        }
        
        // Check if the document type is supported by the external service
        if (!$this->externalVerificationService->isSupportedDocumentType($document->document_type)) {
            throw new Exception("Document type '{$document->document_type}' is not supported by external verification");
        }
        
        // Call the external verification service to verify the document
        $verification = $this->externalVerificationService->verifyDocument($document);
        
        // Process the verification results based on confidence score
        if ($verification->confidence_score >= $this->highConfidenceThreshold) {
            // If confidence is above threshold, automatically mark as verified
            $document->verify($verification->verified_by_user_id ?? 1);
        } else {
            // If confidence is below threshold, mark for manual review
            $verification->verification_status = DocumentVerification::STATUS_PENDING;
            $verification->save();
        }
        
        // Return the verification record
        return $verification;
    }

    /**
     * Create a pending verification record for manual review
     *
     * @param Document $document
     * @param array $verificationData
     * @return DocumentVerification The verification record with pending status
     */
    private function verifyDocumentManually(Document $document, array $verificationData = []): DocumentVerification
    {
        // Create a new DocumentVerification record
        $verification = new DocumentVerification();
        $verification->document_id = $document->id;
        $verification->verification_method = DocumentVerification::METHOD_MANUAL;
        $verification->verification_status = DocumentVerification::STATUS_PENDING;
        $verification->verification_data = $verificationData ?: [];
        $verification->confidence_score = 0; // requires human verification
        $verification->save();
        
        // Return the verification record
        return $verification;
    }

    /**
     * Manually verify a document by an administrator
     *
     * @param int $documentId
     * @param bool $isVerified
     * @param string|null $notes
     * @param int $verifierId
     * @return DocumentVerification The updated verification record
     * @throws DocumentProcessingException
     */
    public function manuallyVerifyDocument(
        int $documentId,
        bool $isVerified,
        ?string $notes = null,
        int $verifierId
    ): DocumentVerification {
        try {
            // Retrieve the document by ID
            $document = Document::findOrFail($documentId);
            
            // Create a new DocumentVerification record
            $verification = new DocumentVerification();
            $verification->document_id = $document->id;
            $verification->verification_method = DocumentVerification::METHOD_MANUAL;
            $verification->verification_status = $isVerified 
                ? DocumentVerification::STATUS_VERIFIED 
                : DocumentVerification::STATUS_REJECTED;
            $verification->notes = $notes;
            $verification->verified_by_user_id = $verifierId;
            $verification->confidence_score = $isVerified ? 1.0 : 0.0; // Manual verification has full confidence
            $verification->save();
            
            // Update the document's verification status using verify() or reject() method
            if ($isVerified) {
                $document->verify($verifierId, $notes);
            } else {
                $document->reject($verifierId);
            }
            
            // Dispatch DocumentVerifiedEvent
            Event::dispatch(new DocumentVerifiedEvent($document, $verification));
            
            // Log the manual verification using the audit service
            $this->auditService->log(
                'document_manually_verified',
                'document',
                $document->id,
                null,
                [
                    'verification_id' => $verification->id,
                    'verified_by' => $verifierId,
                    'status' => $verification->verification_status,
                    'notes' => $notes
                ]
            );
            
            // Return the verification record
            return $verification;
        } catch (Exception $e) {
            Log::error("Manual document verification failed: {$e->getMessage()}", [
                'document_id' => $documentId,
                'verifier_id' => $verifierId,
                'exception' => $e
            ]);
            
            throw DocumentProcessingException::createFromVerificationError(
                "Failed to manually verify document: {$e->getMessage()}",
                ['document_id' => $documentId],
                $e
            );
        }
    }

    /**
     * Get the verification history for a document
     *
     * @param int $documentId
     * @return \Illuminate\Database\Eloquent\Collection Collection of verification records
     */
    public function getVerificationHistory(int $documentId): \Illuminate\Database\Eloquent\Collection
    {
        // Query DocumentVerification records for the document
        return DocumentVerification::where('document_id', $documentId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get the latest verification record for a document
     *
     * @param int $documentId
     * @return DocumentVerification|null The latest verification record or null if none exists
     */
    public function getLatestVerification(int $documentId): ?DocumentVerification
    {
        // Query DocumentVerification records for the document
        return DocumentVerification::where('document_id', $documentId)
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Get the current verification status of a document
     *
     * @param int $documentId
     * @return string The verification status (verified, rejected, pending)
     */
    public function getVerificationStatus(int $documentId): string
    {
        // Get the latest verification record for the document
        $verification = $this->getLatestVerification($documentId);
        
        // If no verification record exists, return 'pending'
        if (!$verification) {
            return DocumentVerification::STATUS_PENDING;
        }
        
        // Return the verification_status from the record
        return $verification->verification_status;
    }

    /**
     * Get the verification method used for a document
     *
     * @param int $documentId
     * @return string|null The verification method or null if not verified
     */
    public function getVerificationMethod(int $documentId): ?string
    {
        // Get the latest verification record for the document
        $verification = $this->getLatestVerification($documentId);
        
        // If no verification record exists, return null
        if (!$verification) {
            return null;
        }
        
        // Return the verification_method from the record
        return $verification->verification_method;
    }

    /**
     * Get the confidence score of the document verification
     *
     * @param int $documentId
     * @return float|null The confidence score or null if not verified
     */
    public function getVerificationConfidence(int $documentId): ?float
    {
        // Get the latest verification record for the document
        $verification = $this->getLatestVerification($documentId);
        
        // If no verification record exists, return null
        if (!$verification) {
            return null;
        }
        
        // Return the confidence_score from the record
        return $verification->confidence_score;
    }

    /**
     * Get documents pending verification
     *
     * @param string|null $documentType
     * @param int $perPage
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated list of documents pending verification
     */
    public function getPendingVerifications(?string $documentType = null, int $perPage = 15): \Illuminate\Pagination\LengthAwarePaginator
    {
        // Query documents with pending verification status
        $query = Document::where(function($q) {
            $q->whereHas('verifications', function($subquery) {
                $subquery->where('verification_status', DocumentVerification::STATUS_PENDING)
                    ->whereRaw('id IN (SELECT MAX(id) FROM document_verifications GROUP BY document_id)');
            })->orWhereDoesntHave('verifications');
        })->where('is_verified', false);
        
        // If document type is provided, filter by type
        if ($documentType) {
            $query->where('document_type', $documentType);
        }
        
        // Join with latest verification records
        $query->with('latestVerification');
        
        // Order by created_at in ascending order (oldest first)
        $query->orderBy('created_at');
        
        // Paginate the results with the specified per page
        return $query->paginate($perPage);
    }

    /**
     * Get verified documents
     *
     * @param string|null $documentType
     * @param int $perPage
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated list of verified documents
     */
    public function getVerifiedDocuments(?string $documentType = null, int $perPage = 15): \Illuminate\Pagination\LengthAwarePaginator
    {
        // Query documents with verified status
        $query = Document::where('is_verified', true);
        
        // If document type is provided, filter by type
        if ($documentType) {
            $query->where('document_type', $documentType);
        }
        
        // Join with latest verification records
        $query->with('latestVerification');
        
        // Order by verified_at in descending order (newest first)
        $query->orderBy('verified_at', 'desc');
        
        // Paginate the results with the specified per page
        return $query->paginate($perPage);
    }

    /**
     * Get rejected documents
     *
     * @param string|null $documentType
     * @param int $perPage
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated list of rejected documents
     */
    public function getRejectedDocuments(?string $documentType = null, int $perPage = 15): \Illuminate\Pagination\LengthAwarePaginator
    {
        // Query documents with rejected status
        $query = Document::whereHas('verifications', function($q) {
            $q->where('verification_status', DocumentVerification::STATUS_REJECTED)
                ->whereRaw('id IN (SELECT MAX(id) FROM document_verifications GROUP BY document_id)');
        })->where('is_verified', false);
        
        // If document type is provided, filter by type
        if ($documentType) {
            $query->where('document_type', $documentType);
        }
        
        // Join with latest verification records
        $query->with('latestVerification');
        
        // Order by updated_at in descending order (newest first)
        $query->orderBy('updated_at', 'desc');
        
        // Paginate the results with the specified per page
        return $query->paginate($perPage);
    }

    /**
     * Get verification statistics
     *
     * @param string|null $documentType
     * @param string|null $startDate
     * @param string|null $endDate
     * @return array Statistics about document verifications
     */
    public function getVerificationStatistics(
        ?string $documentType = null,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        // Query document verification records
        $query = DocumentVerification::query();
        
        // If document type is provided, filter by type
        if ($documentType) {
            $query->whereHas('document', function($q) use ($documentType) {
                $q->where('document_type', $documentType);
            });
        }
        
        // If date range is provided, filter by created_at
        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [$startDate, $endDate]);
        }
        
        // Count total verifications
        $totalVerifications = $query->count();
        
        // Count verifications by status (verified, rejected, pending)
        $statusCounts = $query->select('verification_status', DB::raw('count(*) as count'))
            ->groupBy('verification_status')
            ->pluck('count', 'verification_status')
            ->toArray();
        
        // Count verifications by method (AI, manual, external)
        $methodCounts = $query->select('verification_method', DB::raw('count(*) as count'))
            ->groupBy('verification_method')
            ->pluck('count', 'verification_method')
            ->toArray();
        
        // Calculate average confidence score
        $averageConfidence = $query->avg('confidence_score') ?? 0;
        
        // Calculate average processing time
        $avgProcessingTime = DB::table('document_verifications as dv')
            ->join('documents as d', 'd.id', '=', 'dv.document_id')
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, d.created_at, dv.created_at)) as avg_minutes')
            ->first()
            ->avg_minutes ?? 0;
        
        // Return the statistics as an array
        return [
            'total_verifications' => $totalVerifications,
            'by_status' => $statusCounts,
            'by_method' => $methodCounts,
            'average_confidence' => round($averageConfidence, 2),
            'average_processing_time_minutes' => round($avgProcessingTime, 2),
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate
            ],
            'document_type' => $documentType
        ];
    }

    /**
     * Determine the best verification method for a document type
     *
     * @param string $documentType
     * @return string The verification method to use (ai, external, manual)
     */
    protected function determineVerificationMethod(string $documentType): string
    {
        // Check if the document type has a preferred verification method in configuration
        if (isset($this->verificationMethodsByDocumentType[$documentType])) {
            return $this->verificationMethodsByDocumentType[$documentType];
        }
        
        // If AI verification is enabled and the document type is supported by AI, use AI
        if ($this->aiVerificationEnabled && $this->documentAnalysisService->isSupportedDocumentType($documentType)) {
            return DocumentVerification::METHOD_AI;
        }
        
        // If external verification is enabled and the document type is supported by external service, use external
        if ($this->externalVerificationEnabled && $this->externalVerificationService->isSupportedDocumentType($documentType)) {
            return DocumentVerification::METHOD_EXTERNAL;
        }
        
        // Otherwise, default to manual verification
        return DocumentVerification::METHOD_MANUAL;
    }

    /**
     * Check if AI verification is enabled
     *
     * @return bool True if AI verification is enabled
     */
    public function isAIVerificationEnabled(): bool
    {
        return $this->aiVerificationEnabled;
    }

    /**
     * Check if external verification is enabled
     *
     * @return bool True if external verification is enabled
     */
    public function isExternalVerificationEnabled(): bool
    {
        return $this->externalVerificationEnabled;
    }

    /**
     * Get the high confidence threshold for automatic verification
     *
     * @return float High confidence threshold value
     */
    public function getHighConfidenceThreshold(): float
    {
        return $this->highConfidenceThreshold;
    }

    /**
     * Get the low confidence threshold for verification
     *
     * @return float Low confidence threshold value
     */
    public function getLowConfidenceThreshold(): float
    {
        return $this->lowConfidenceThreshold;
    }
}