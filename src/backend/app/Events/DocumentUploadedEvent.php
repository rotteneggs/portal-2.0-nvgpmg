<?php

namespace App\Events;

use App\Models\Document;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DocumentUploadedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The document instance.
     *
     * @var Document
     */
    public $document;

    /**
     * Create a new event instance.
     *
     * @param Document $document
     * @return void
     */
    public function __construct(Document $document)
    {
        $this->document = $document;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        // Broadcasting on a private channel scoped to the application
        // This ensures only authorized users associated with the application can receive updates
        return new PrivateChannel('application.' . $this->document->application_id);
    }

    /**
     * The event name that should be broadcast.
     *
     * @return string
     */
    public function broadcastAs()
    {
        return 'document.uploaded';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array
     */
    public function broadcastWith()
    {
        // Return only necessary data to minimize payload size
        return [
            'id' => $this->document->id,
            'user_id' => $this->document->user_id,
            'document_type' => $this->document->document_type,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}