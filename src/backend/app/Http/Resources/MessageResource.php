<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource; // Laravel's base resource class for API response transformation ^10.0
use Illuminate\Support\Collection; // Laravel collection for handling arrays of data ^10.0
use App\Models\Message;
use App\Http\Resources\UserResource;
use App\Http\Resources\ApplicationResource;

class MessageResource extends JsonResource
{
    /**
     * Flag to determine if sender data should be included
     *
     * @var bool
     */
    protected bool $includeSender = false;

    /**
     * Flag to determine if recipient data should be included
     *
     * @var bool
     */
    protected bool $includeRecipient = false;

    /**
     * Flag to determine if application data should be included
     *
     * @var bool
     */
    protected bool $includeApplication = false;

    /**
     * Flag to determine if attachments should be included
     *
     * @var bool
     */
    protected bool $includeAttachments = false;

    /**
     * Flag to determine if message preview should be used instead of full body
     *
     * @var bool
     */
    protected bool $usePreview = false;

    /**
     * Length for message preview
     *
     * @var int
     */
    protected int $previewLength = 100;

    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     * @return void
     */
    public function __construct($resource)
    {
        parent::__construct($resource);
        $this->includeSender = false;
        $this->includeRecipient = false;
        $this->includeApplication = false;
        $this->includeAttachments = false;
        $this->usePreview = false;
        $this->previewLength = 100;
    }

    /**
     * Transform the Message model into an array for API response.
     *
     * @param \Illuminate\Http\Request $request
     * @return array
     */
    public function toArray($request)
    {
        /** @var Message $message */
        $message = $this->resource;

        $data = [
            'id' => $message->id,
            'subject' => $message->subject,
            'message_body' => $this->usePreview ? $message->getPreview($this->previewLength) : $message->message_body,
            'is_read' => (bool) $message->is_read,
            'read_at' => $message->read_at ? $message->read_at->toIso8601String() : null,
            'has_attachments' => $message->hasAttachments(),
            'created_at' => $message->created_at->toIso8601String(),
            'updated_at' => $message->updated_at->toIso8601String(),
        ];

        // Add attachment count if attachments are loaded
        if ($message->relationLoaded('attachments')) {
            $data['attachment_count'] = $message->attachments->count();
        }

        // Include sender data if requested
        if ($this->includeSender) {
            $sender = $message->relationLoaded('sender') 
                ? $message->sender 
                : $message->sender()->first();
                
            if ($sender) {
                $data['sender'] = (new UserResource($sender))->withProfile();
            }
        }

        // Include recipient data if requested
        if ($this->includeRecipient) {
            $recipient = $message->relationLoaded('recipient') 
                ? $message->recipient 
                : $message->recipient()->first();
                
            if ($recipient) {
                $data['recipient'] = (new UserResource($recipient))->withProfile();
            }
        }

        // Include application data if requested and available
        if ($this->includeApplication && $message->application_id) {
            $application = $message->relationLoaded('application') 
                ? $message->application 
                : $message->application()->first();
                
            if ($application) {
                $data['application'] = new ApplicationResource($application);
            }
        }

        // Include attachments if requested
        if ($this->includeAttachments) {
            $attachments = $message->relationLoaded('attachments')
                ? $message->attachments
                : $message->attachments()->get();
                
            $data['attachments'] = $attachments->map(function ($attachment) {
                return [
                    'id' => $attachment->id,
                    'file_name' => $attachment->file_name,
                    'file_path' => $attachment->file_path,
                    'mime_type' => $attachment->mime_type,
                    'file_size' => $attachment->file_size,
                    'formatted_file_size' => $attachment->formatted_file_size,
                    'icon_class' => $attachment->icon_class,
                    'url' => $attachment->url,
                    'created_at' => $attachment->created_at->toIso8601String(),
                ];
            });
        }

        return $data;
    }

    /**
     * Add a method to include sender data in the resource response.
     *
     * @return $this
     */
    public function withSender()
    {
        $this->includeSender = true;
        
        // Eager load the sender relationship if not already loaded
        if (!$this->resource->relationLoaded('sender')) {
            $this->resource->load('sender');
        }
        
        return $this;
    }

    /**
     * Add a method to include recipient data in the resource response.
     *
     * @return $this
     */
    public function withRecipient()
    {
        $this->includeRecipient = true;
        
        // Eager load the recipient relationship if not already loaded
        if (!$this->resource->relationLoaded('recipient')) {
            $this->resource->load('recipient');
        }
        
        return $this;
    }

    /**
     * Add a method to include application data in the resource response.
     *
     * @return $this
     */
    public function withApplication()
    {
        $this->includeApplication = true;
        
        // Eager load the application relationship if not already loaded
        if (!$this->resource->relationLoaded('application')) {
            $this->resource->load('application');
        }
        
        return $this;
    }

    /**
     * Add a method to include attachments in the resource response.
     *
     * @return $this
     */
    public function withAttachments()
    {
        $this->includeAttachments = true;
        
        // Eager load the attachments relationship if not already loaded
        if (!$this->resource->relationLoaded('attachments')) {
            $this->resource->load('attachments');
        }
        
        return $this;
    }

    /**
     * Add a method to include a message preview instead of full content.
     *
     * @param int $length
     * @return $this
     */
    public function withPreview($length = 100)
    {
        $this->usePreview = true;
        $this->previewLength = $length ?: 100;
        
        return $this;
    }
}