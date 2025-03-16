<?php

namespace App\Jobs;

use App\Models\Document;
use App\Models\DocumentVerification;
use App\Services\DocumentVerificationService;
use App\Events\DocumentVerifiedEvent;
use App\Exceptions\DocumentProcessingException;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Laravel job class responsible for asynchronous document verification processing
 * in the Student Admissions Enrollment Platform. This job handles the verification
 * of uploaded documents using AI analysis, external verification services, or
 * queuing for manual review based on confidence scores.
 */
class ProcessDocumentVerification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, SerializesModels;

    /**
     * The ID of the document to be verified.
     *
     * @var int
     */
    public int $documentId;

    /**
     * The verification method to use (ai, external, or null for automatic selection).
     *
     * @var string|null
     */
    public ?string $method;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public int $timeout = 300; // 5 minutes

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public int $backoff = 60; // Base delay of 1 minute before retries

    /**
     * Create a new job instance.
     *
     * @param int $documentId
     * @param string|null $method
     * @return void
     */
    public function __construct(int $documentId, ?string $method = null)
    {
        $this->documentId = $documentId;
        $this->method = $method;
    }

    /**
     * Execute the job to process document verification.
     *
     * @param DocumentVerificationService $verificationService
     * @return void
     */
    public function handle(DocumentVerificationService $verificationService): void
    {
        Log::info("Processing document verification", [
            'document_id' => $this->documentId,
            'method' => $this->method,
            'attempt' => $this->attempts(),
        ]);
        
        try {
            // Retrieve the document by ID
            $document = Document::find($this->documentId);
            
            if (!$document) {
                Log::error("Document not found for verification", ['document_id' => $this->documentId]);
                $this->fail(new \Exception("Document not found: {$this->documentId}"));
                return;
            }
            
            // Verify the document using the verification service
            // The service will handle the appropriate verification method and update the document status
            $verificationResult = $verificationService->verifyDocument($document, $this->method);
            
            Log::info("Document verification completed successfully", [
                'document_id' => $this->documentId,
                'verification_id' => $verificationResult->id,
                'method' => $verificationResult->verification_method,
                'status' => $verificationResult->verification_status,
                'confidence' => $verificationResult->confidence_score,
            ]);
            
        } catch (DocumentProcessingException $e) {
            // Handle document processing exceptions with detailed context
            Log::error("Document verification failed with processing error", [
                'document_id' => $this->documentId,
                'method' => $this->method,
                'error' => $e->getMessage(),
                'error_code' => $e->getErrorCode(),
                'context' => $e->getDocumentContext(),
                'attempt' => $this->attempts(),
            ]);
            
            throw $e; // Laravel will handle the retry based on $tries and $backoff
        } catch (\Exception $e) {
            // Handle generic exceptions
            Log::error("Document verification failed with unexpected error", [
                'document_id' => $this->documentId,
                'method' => $this->method,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);
            
            throw $e; // Laravel will handle the retry based on $tries and $backoff
        }
    }

    /**
     * Handle a job failure.
     *
     * @param \Throwable $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Document verification job failed permanently", [
            'document_id' => $this->documentId,
            'method' => $this->method,
            'error' => $exception->getMessage(),
            'class' => get_class($exception),
        ]);
        
        if ($exception instanceof DocumentProcessingException) {
            Log::error("Document processing error details", [
                'error_code' => $exception->getErrorCode(),
                'context' => $exception->getDocumentContext(),
            ]);
        }
        
        // Additional failure handling could be implemented here:
        // - Send notifications to administrators
        // - Update document status to indicate verification failure
        // - Create an internal support ticket for manual review
    }
}