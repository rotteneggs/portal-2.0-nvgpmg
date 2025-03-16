<?php

namespace App\Listeners;

use App\Jobs\ProcessDocumentVerification;
use App\Events\DocumentUploadedEvent;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Queue\ShouldQueue;

class ProcessDocumentVerificationListener implements ShouldQueue
{
    /**
     * The number of seconds to delay the job processing.
     *
     * @var int
     */
    protected int $queueDelay;

    /**
     * Create a new event listener instance.
     *
     * @return void
     */
    public function __construct()
    {
        // Set a delay to allow for batched operations or other documents to be uploaded
        $this->queueDelay = 10; // 10 seconds
    }

    /**
     * Handle the document uploaded event.
     *
     * @param  DocumentUploadedEvent  $event
     * @return void
     */
    public function handle(DocumentUploadedEvent $event): void
    {
        // Get the document from the event
        $document = $event->document;

        Log::info('Document verification processing initiated', [
            'document_id' => $document->id,
            'document_type' => $document->document_type,
        ]);

        // Dispatch the ProcessDocumentVerification job to the queue
        ProcessDocumentVerification::dispatch($document->id)
            ->onQueue('documents') // Set the queue name
            ->delay(now()->addSeconds($this->queueDelay)); // Add a delay

        Log::info('Document verification job dispatched successfully', [
            'document_id' => $document->id,
            'document_type' => $document->document_type,
        ]);
    }

    /**
     * Determine whether the listener should be queued.
     *
     * @param  DocumentUploadedEvent  $event
     * @return bool
     */
    public function shouldQueue(DocumentUploadedEvent $event): bool
    {
        // Always queue this listener
        return true;
    }
}