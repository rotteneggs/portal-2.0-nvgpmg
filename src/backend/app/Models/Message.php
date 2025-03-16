<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Illuminate\Database\Eloquent\SoftDeletes; // Laravel ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use App\Models\User;
use App\Models\Application;
use App\Models\MessageAttachment;

class Message extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'sender_user_id',
        'recipient_user_id',
        'application_id',
        'subject',
        'message_body',
        'is_read',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'read_at',
        'created_at',
        'updated_at',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'read_status',
        'formatted_created_at',
    ];

    /**
     * The relationships that should be eager loaded.
     *
     * @var array
     */
    protected $with = [
        'sender',
        'recipient',
    ];

    /**
     * Define the relationship between a message and its sender
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }

    /**
     * Define the relationship between a message and its recipient
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    /**
     * Define the relationship between a message and its related application
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function application()
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * Define the relationship between a message and its attachments
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function attachments()
    {
        return $this->hasMany(MessageAttachment::class);
    }

    /**
     * Mark the message as read by the recipient
     *
     * @return bool
     */
    public function markAsRead()
    {
        $this->is_read = true;
        $this->read_at = now();
        
        return $this->save();
    }

    /**
     * Mark the message as unread by the recipient
     *
     * @return bool
     */
    public function markAsUnread()
    {
        $this->is_read = false;
        $this->read_at = null;
        
        return $this->save();
    }

    /**
     * Check if the message has any attachments
     *
     * @return bool
     */
    public function hasAttachments()
    {
        if (!$this->relationLoaded('attachments')) {
            $this->load('attachments');
        }
        
        return $this->attachments->isNotEmpty();
    }

    /**
     * Get a short preview of the message body
     *
     * @param int $length
     * @return string
     */
    public function getPreview($length = 100)
    {
        if (strlen($this->message_body) <= $length) {
            return $this->message_body;
        }
        
        return substr($this->message_body, 0, $length) . '...';
    }

    /**
     * Scope query to include messages where the user is either sender or recipient
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where(function ($query) use ($userId) {
            $query->where('sender_user_id', $userId)
                  ->orWhere('recipient_user_id', $userId);
        });
    }

    /**
     * Scope query to include messages related to a specific application
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $applicationId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForApplication($query, $applicationId)
    {
        return $query->where('application_id', $applicationId);
    }

    /**
     * Scope query to include only unread messages
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope query to search for messages containing specific text
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $searchTerm
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSearch($query, $searchTerm)
    {
        return $query->whereRaw('MATCH(subject, message_body) AGAINST(?)', [$searchTerm]);
    }

    /**
     * Get a human-readable status of whether the message has been read
     *
     * @return string
     */
    public function getReadStatusAttribute()
    {
        return $this->is_read ? 'Read' : 'Unread';
    }

    /**
     * Get the created_at timestamp in a human-readable format
     *
     * @return string
     */
    public function getFormattedCreatedAtAttribute()
    {
        return $this->created_at->format('M d, Y - g:i A');
    }
}