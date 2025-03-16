<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use App\Models\User;

class Notification extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'notifications';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'type',
        'channel',
        'subject',
        'content',
        'data',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'data' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * The attributes that should be treated as dates.
     *
     * @var array
     */
    protected $dates = [
        'created_at',
    ];

    /**
     * Define the one-to-many relationship with NotificationRecipient.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function recipients()
    {
        return $this->hasMany('App\Models\NotificationRecipient');
    }

    /**
     * Define the many-to-many relationship with User through NotificationRecipient.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'notification_recipients', 'notification_id', 'user_id');
    }

    /**
     * Scope query to filter notifications by type.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope query to filter notifications by channel.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $channel
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOfChannel($query, $channel)
    {
        return $query->where('channel', $channel);
    }

    /**
     * Scope query to get recent notifications.
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
     * Scope query to get notifications for a specific user.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForUser($query, $userId)
    {
        return $query->join('notification_recipients', 'notifications.id', '=', 'notification_recipients.notification_id')
                     ->where('notification_recipients.user_id', $userId);
    }

    /**
     * Scope query to get unread notifications.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeUnread($query)
    {
        return $query->join('notification_recipients', 'notifications.id', '=', 'notification_recipients.notification_id')
                     ->where('notification_recipients.is_read', false);
    }

    /**
     * Get the data attribute with JSON decoding.
     *
     * @param string $value
     * @return array
     */
    public function getDataAttribute($value)
    {
        return json_decode($value, true);
    }

    /**
     * Set the data attribute with JSON encoding.
     *
     * @param array $value
     * @return void
     */
    public function setDataAttribute($value)
    {
        $this->attributes['data'] = json_encode($value);
    }

    /**
     * Add a recipient to this notification.
     *
     * @param int $userId
     * @return mixed
     */
    public function addRecipient($userId)
    {
        return $this->recipients()->create([
            'user_id' => $userId,
            'is_sent' => false,
            'is_read' => false,
        ]);
    }

    /**
     * Add multiple recipients to this notification.
     *
     * @param array $userIds
     * @return array
     */
    public function addRecipients(array $userIds)
    {
        $results = [];
        
        foreach ($userIds as $userId) {
            $results[] = $this->addRecipient($userId);
        }
        
        return $results;
    }

    /**
     * Get the count of recipients for this notification.
     *
     * @return int
     */
    public function getRecipientCount()
    {
        return $this->recipients()->count();
    }

    /**
     * Get the count of recipients who have been sent this notification.
     *
     * @return int
     */
    public function getSentCount()
    {
        return $this->recipients()->where('is_sent', true)->count();
    }

    /**
     * Get the count of recipients who have read this notification.
     *
     * @return int
     */
    public function getReadCount()
    {
        return $this->recipients()->where('is_read', true)->count();
    }
}