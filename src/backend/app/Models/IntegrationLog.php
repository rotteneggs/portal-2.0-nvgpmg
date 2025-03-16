<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel's base Eloquent model class ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel trait for model factories ^10.0
use Illuminate\Database\Eloquent\Builder; // Laravel Eloquent query builder ^10.0
use Carbon\Carbon; // Date and time manipulation library ^2.0

class IntegrationLog extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'integration_logs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'integration_id',
        'operation',
        'status',
        'request_data',
        'response_data',
        'error_message',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'request_data' => 'json',
        'response_data' => 'json',
        'created_at' => 'datetime',
    ];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    protected $timestamps = false;

    /**
     * Define relationship with Integration model
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function integration()
    {
        return $this->belongsTo(Integration::class, 'integration_id');
    }

    /**
     * Scope query to filter logs by integration ID
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  int  $integrationId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByIntegration(Builder $query, int $integrationId): Builder
    {
        return $query->where('integration_id', $integrationId);
    }

    /**
     * Scope query to filter logs by operation type
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string  $operation
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByOperation(Builder $query, string $operation): Builder
    {
        return $query->where('operation', $operation);
    }

    /**
     * Scope query to filter logs by status
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string  $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope query to only include successful operations
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSuccessful(Builder $query): Builder
    {
        return $query->where('status', 'success');
    }

    /**
     * Scope query to only include failed operations
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('status', 'error');
    }

    /**
     * Scope query to get recent logs with optional limit
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  int  $limit
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeRecent(Builder $query, int $limit = 10): Builder
    {
        return $query->orderBy('created_at', 'desc')->limit($limit);
    }

    /**
     * Scope query to filter logs within a specific time period
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  \Carbon\Carbon  $startDate
     * @param  \Carbon\Carbon|null  $endDate
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeWithinPeriod(Builder $query, Carbon $startDate, ?Carbon $endDate = null): Builder
    {
        $query->where('created_at', '>=', $startDate);
        
        if ($endDate) {
            $query->where('created_at', '<=', $endDate);
        }
        
        return $query;
    }

    /**
     * Accessor to get the request_data as a decoded array
     *
     * @param  string|null  $value
     * @return array
     */
    public function getRequestDataAttribute(?string $value): array
    {
        return $value ? json_decode($value, true) : [];
    }

    /**
     * Accessor to get the response_data as a decoded array
     *
     * @param  string|null  $value
     * @return array
     */
    public function getResponseDataAttribute(?string $value): array
    {
        return $value ? json_decode($value, true) : [];
    }

    /**
     * Mutator to set the request_data as a JSON string
     *
     * @param  array  $value
     * @return void
     */
    public function setRequestDataAttribute(array $value): void
    {
        $this->attributes['request_data'] = json_encode($value);
    }

    /**
     * Mutator to set the response_data as a JSON string
     *
     * @param  array  $value
     * @return void
     */
    public function setResponseDataAttribute(array $value): void
    {
        $this->attributes['response_data'] = json_encode($value);
    }

    /**
     * Check if the integration operation was successful
     *
     * @return bool
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'success';
    }

    /**
     * Check if the integration operation failed
     *
     * @return bool
     */
    public function isFailed(): bool
    {
        return $this->status === 'error';
    }

    /**
     * Get the created_at timestamp in a human-readable format
     *
     * @return string
     */
    public function getFormattedCreatedAtAttribute(): string
    {
        return $this->created_at->format('Y-m-d H:i:s');
    }

    /**
     * Get the duration since the log was created in a human-readable format
     *
     * @return string
     */
    public function getDurationSinceAttribute(): string
    {
        return $this->created_at->diffForHumans();
    }
}