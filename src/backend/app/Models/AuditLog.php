<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0

class AuditLog extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'audit_logs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'action',
        'resource_type',
        'resource_id',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Actions that are considered security events.
     */
    public const SECURITY_ACTIONS = [
        'login',
        'logout',
        'security_event',
        'permission_change',
        'role_change',
    ];

    /**
     * Define the belongsTo relationship with the User model.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope query to include audit logs for a specific user.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int|User $user
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByUser($query, $user)
    {
        $userId = $user instanceof User ? $user->id : $user;
        return $query->where('user_id', $userId);
    }

    /**
     * Scope query to include audit logs for a specific action type.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $action
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope query to include audit logs for a specific resource.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $resourceType
     * @param int|string|null $resourceId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByResource($query, $resourceType, $resourceId = null)
    {
        $query = $query->where('resource_type', $resourceType);
        
        if ($resourceId !== null) {
            $query = $query->where('resource_id', $resourceId);
        }
        
        return $query;
    }

    /**
     * Scope query to include audit logs within a specific date range.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|Carbon $startDate
     * @param string|Carbon $endDate
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        if (!$startDate instanceof Carbon) {
            $startDate = Carbon::parse($startDate);
        }
        
        if (!$endDate instanceof Carbon) {
            $endDate = Carbon::parse($endDate);
        }
        
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope query to include only security-related events.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSecurityEvents($query)
    {
        return $query->whereIn('action', self::SECURITY_ACTIONS);
    }

    /**
     * Get the old_values attribute as a decoded array.
     *
     * @param string|null $value
     * @return array|null
     */
    public function getOldValuesAttribute($value)
    {
        return $value ? json_decode($value, true) : null;
    }

    /**
     * Get the new_values attribute as a decoded array.
     *
     * @param string|null $value
     * @return array|null
     */
    public function getNewValuesAttribute($value)
    {
        return $value ? json_decode($value, true) : null;
    }

    /**
     * Set the old_values attribute by encoding the array to JSON.
     *
     * @param array|null $value
     * @return void
     */
    public function setOldValuesAttribute($value)
    {
        $this->attributes['old_values'] = $value ? json_encode($value) : null;
    }

    /**
     * Set the new_values attribute by encoding the array to JSON.
     *
     * @param array|null $value
     * @return void
     */
    public function setNewValuesAttribute($value)
    {
        $this->attributes['new_values'] = $value ? json_encode($value) : null;
    }
}