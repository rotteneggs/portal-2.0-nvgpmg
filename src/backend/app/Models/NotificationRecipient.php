<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0

class NotificationRecipient extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'notification_recipients';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'notification_id',
        'user_id',
        'is_sent',
        'is_read',
        'sent_at',
        'read_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'is_sent' => 'boolean',
        'is_read' => 'boolean',
        'sent_at' => 'datetime',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    /**
     * The attributes that should be treated as dates.
     *
     * @var array
     */
    protected $dates = [
        'sent_at',
        'read_at',
        'created_at',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'is_new',
    ];

    /**
     * Define the belongs-to relationship with the Notification model.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function notification()
    {
        return $this->belongsTo(Notification::class);
    }

    /**
     * Define the belongs-to relationship with the User model.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Mark the notification as sent to the recipient.
     *
     * @return bool
     */
    public function markAsSent()
    {
        $this->is_sent = true;
        $this->sent_at = Carbon::now();
        return $this->save();
    }

    /**
     * Mark the notification as read by the recipient.
     *
     * @return bool
     */
    public function markAsRead()
    {
        $this->is_read = true;
        $this->read_at = Carbon::now();
        return $this->save();
    }

    /**
     * Scope query to get notification recipients for a specific user.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope query to get unread notification recipients.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope query to get unsent notification recipients.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeUnsent($query)
    {
        return $query->where('is_sent', false);
    }

    /**
     * Scope query to get recent notification recipients.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $days
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', Carbon::now()->subDays($days));
    }

    /**
     * Determine if the notification is new (sent but not read).
     *
     * @return bool
     */
    public function getIsNewAttribute()
    {
        return $this->is_sent && !$this->is_read;
    }
}