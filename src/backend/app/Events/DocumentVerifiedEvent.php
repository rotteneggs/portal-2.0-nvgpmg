<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Document;
use App\Models\DocumentVerification;

class DocumentVerifiedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The document that was verified.
     *
     * @var Document
     */
    public $document;

    /**
     * The verification record.
     *
     * @var DocumentVerification
     */
    public $verification;

    /**
     * Whether the document is verified or rejected.
     *
     * @var bool
     */
    public $isVerified;

    /**
     * Create a new event instance.
     *
     * @param Document $document
     * @param DocumentVerification $verification
     * @return void
     */
    public function __construct(Document $document, DocumentVerification $verification)
    {
        $this->document = $document;
        $this->verification = $verification;
        $this->isVerified = $document->is_verified;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        return new PrivateChannel('application.' . $this->document->application_id);
    }

    /**
     * The event name that should be broadcast.
     *
     * @return string
     */
    public function broadcastAs()
    {
        return 'document.verified';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array
     */
    public function broadcastWith()
    {
        return [
            'document_id' => $this->document->id,
            'document_type' => $this->document->document_type,
            'verification_status' => $this->verification->verification_status,
            'verification_method' => $this->verification->verification_method,
            'confidence_score' => $this->verification->confidence_score,
            'is_verified' => $this->isVerified,
            'user_id' => $this->document->user_id,
            'application_id' => $this->document->application_id,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}