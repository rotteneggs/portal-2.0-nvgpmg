<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource; // Laravel ^10.0
use Illuminate\Support\Collection; // Laravel ^10.0
use App\Models\Notification;
use App\Models\NotificationRecipient;
use App\Http\Resources\UserResource;

class NotificationResource extends JsonResource
{
    /**
     * Flag to determine if recipients data should be included
     *
     * @var bool
     */
    protected bool $includeRecipients = false;

    /**
     * Flag to determine if user data should be included
     *
     * @var bool
     */
    protected bool $includeUser = false;

    /**
     * Transform the Notification model into an array for API response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        /** @var Notification $notification */
        $notification = $this->resource;

        $data = [
            'id' => $notification->id,
            'type' => $notification->type,
            'channel' => $notification->channel,
            'subject' => $notification->subject,
            'content' => $notification->content,
            'data' => $notification->data,
            'created_at' => $notification->created_at->toIso8601String(),
        ];

        // Include recipients data if requested
        if ($this->includeRecipients && $notification->relationLoaded('recipients')) {
            $data['recipients'] = $notification->recipients->map(function ($recipient) {
                $recipientData = [
                    'id' => $recipient->id,
                    'user_id' => $recipient->user_id,
                    'is_sent' => $recipient->is_sent,
                    'is_read' => $recipient->is_read,
                    'sent_at' => $recipient->sent_at ? $recipient->sent_at->toIso8601String() : null,
                    'read_at' => $recipient->read_at ? $recipient->read_at->toIso8601String() : null,
                    'is_new' => $recipient->is_new,
                ];

                // Include user data if requested and available
                if ($this->includeUser && $recipient->relationLoaded('user') && $recipient->user) {
                    $recipientData['user'] = new UserResource($recipient->user);
                }

                return $recipientData;
            });
        }

        return $data;
    }

    /**
     * Add a method to include recipients in the resource response.
     *
     * @return $this
     */
    public function withRecipients()
    {
        $this->includeRecipients = true;
        
        // Load the recipients relationship if not already loaded
        if ($this->resource instanceof Notification && !$this->resource->relationLoaded('recipients')) {
            $this->resource->load('recipients');
        }
        
        return $this;
    }

    /**
     * Add a method to include user data in the resource response.
     *
     * @return $this
     */
    public function withUser()
    {
        $this->includeUser = true;
        
        // Ensure recipients are loaded first
        if (!$this->includeRecipients) {
            $this->withRecipients();
        }
        
        // Load users through recipients if not already loaded
        if ($this->resource instanceof Notification) {
            $this->resource->load('recipients.user');
        }
        
        return $this;
    }
}