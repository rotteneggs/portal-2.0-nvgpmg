<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel's base Eloquent model class ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel trait for model factories ^10.0
use Illuminate\Database\Eloquent\Builder; // Laravel Eloquent query builder ^10.0
use Carbon\Carbon; // Date and time manipulation library ^2.0
use App\Models\IntegrationLog;

class Integration extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'integrations';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'system_name',
        'integration_type',
        'configuration',
        'is_active',
        'last_sync_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'configuration' => 'json',
        'is_active' => 'boolean',
        'last_sync_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    protected $timestamps = true;

    /**
     * Define relationship with IntegrationLog model
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function logs()
    {
        return $this->hasMany(IntegrationLog::class, 'integration_id');
    }

    /**
     * Scope query to only include active integrations
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope query to filter integrations by type
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string  $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('integration_type', $type);
    }

    /**
     * Scope query to filter integrations by system name
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string  $systemName
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeBySystem(Builder $query, string $systemName): Builder
    {
        return $query->where('system_name', $systemName);
    }

    /**
     * Accessor to get the configuration as a decoded array
     *
     * @param  string|null  $value
     * @return array
     */
    public function getConfigurationAttribute(?string $value): array
    {
        return $value ? json_decode($value, true) : [];
    }

    /**
     * Mutator to set the configuration as a JSON string
     *
     * @param  array  $value
     * @return void
     */
    public function setConfigurationAttribute(array $value): void
    {
        $this->attributes['configuration'] = json_encode($value);
    }

    /**
     * Check if the integration is active
     *
     * @return bool
     */
    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }

    /**
     * Activate the integration
     *
     * @return bool
     */
    public function activate(): bool
    {
        $this->is_active = true;
        return $this->save();
    }

    /**
     * Deactivate the integration
     *
     * @return bool
     */
    public function deactivate(): bool
    {
        $this->is_active = false;
        return $this->save();
    }

    /**
     * Update the last synchronization timestamp
     *
     * @return bool
     */
    public function updateLastSyncTime(): bool
    {
        $this->last_sync_at = now();
        return $this->save();
    }

    /**
     * Get a specific configuration value using dot notation
     *
     * @param  string  $key
     * @param  mixed  $default
     * @return mixed
     */
    public function getConfigValue(string $key, $default = null)
    {
        $config = $this->configuration;
        return data_get($config, $key, $default);
    }

    /**
     * Set a specific configuration value using dot notation
     *
     * @param  string  $key
     * @param  mixed  $value
     * @return bool
     */
    public function setConfigValue(string $key, $value): bool
    {
        $config = $this->configuration;
        data_set($config, $key, $value);
        $this->configuration = $config;
        return $this->save();
    }

    /**
     * Log an integration activity
     *
     * @param  string  $operation
     * @param  string  $status
     * @param  array|null  $requestData
     * @param  array|null  $responseData
     * @param  string|null  $errorMessage
     * @return \App\Models\IntegrationLog
     */
    public function logActivity(
        string $operation,
        string $status,
        ?array $requestData = null,
        ?array $responseData = null,
        ?string $errorMessage = null
    ): IntegrationLog {
        $log = new IntegrationLog([
            'integration_id' => $this->id,
            'operation' => $operation,
            'status' => $status,
            'request_data' => $requestData,
            'response_data' => $responseData,
            'error_message' => $errorMessage,
        ]);
        
        $log->save();
        return $log;
    }

    /**
     * Get recent integration logs
     *
     * @param  int  $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getRecentLogs(int $limit = 10)
    {
        return $this->logs()
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Calculate the success rate of integration operations
     *
     * @param  int  $days
     * @return float
     */
    public function getSuccessRate(int $days = 30): float
    {
        $startDate = Carbon::now()->subDays($days);
        
        $logs = $this->logs()
            ->where('created_at', '>=', $startDate)
            ->get();
            
        $totalCount = $logs->count();
        
        if ($totalCount === 0) {
            return 0;
        }
        
        $successCount = $logs->where('status', 'success')->count();
        
        return ($successCount / $totalCount) * 100;
    }
}