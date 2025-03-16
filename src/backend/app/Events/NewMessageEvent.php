<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast; // Laravel ^10.0
use Illuminate\Foundation\Events\Dispatchable; // Laravel ^10.0
use Illuminate\Queue\SerializesModels; // Laravel ^10.0
use App\Models\Message;

class NewMessageEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The message instance.
     *
     * @var \App\Models\Message
     */
    public $message;

    /**
     * Create a new event instance.
     *
     * @param  \App\Models\Message  $message
     * @return void
     */
    public function __construct(Message $message)
    {
        $this->message = $message;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        // Create a private channel for the message recipient
        return new PrivateChannel('user.' . $this->message->recipient->id);
    }

    /**
     * The event name to broadcast.
     *
     * @return string
     */
    public function broadcastAs()
    {
        return 'new-message';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array
     */
    public function broadcastWith()
    {
        // Return an array containing message details
        return [
            'id' => $this->message->id,
            'subject' => $this->message->subject,
            'preview' => $this->message->getPreview(),
            'sender' => [
                'id' => $this->message->sender->id,
                'name' => $this->message->sender->full_name,
            ],
            'created_at' => $this->message->created_at->toIso8601String(),
            'is_read' => $this->message->is_read,
            'has_attachments' => $this->message->hasAttachments(),
        ];
    }
}