<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use App\Models\WorkflowStage;
use App\Models\User;

class ApplicationStatus extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'application_id',
        'workflow_stage_id',
        'status',
        'notes',
        'created_by_user_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'created_at' => 'datetime',
    ];

    /**
     * The relationships that should be eager loaded.
     *
     * @var array
     */
    protected $with = [
        'workflowStage',
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
     * Define the relationship between a status and its application.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function application()
    {
        return $this->belongsTo('App\Models\Application');
    }

    /**
     * Define the relationship between a status and its workflow stage.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function workflowStage()
    {
        return $this->belongsTo(WorkflowStage::class);
    }

    /**
     * Define the relationship between a status and the user who created it.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Scope query to filter statuses by application ID.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $applicationId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByApplication($query, $applicationId)
    {
        return $query->where('application_id', $applicationId);
    }

    /**
     * Scope query to filter statuses by status name.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|array $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByStatus($query, $status)
    {
        if (is_array($status)) {
            return $query->whereIn('status', $status);
        }
        
        return $query->where('status', $status);
    }

    /**
     * Scope query to filter statuses by workflow stage ID.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $workflowStageId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByWorkflowStage($query, $workflowStageId)
    {
        return $query->where('workflow_stage_id', $workflowStageId);
    }

    /**
     * Scope query to filter statuses by creator user ID.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByCreator($query, $userId)
    {
        return $query->where('created_by_user_id', $userId);
    }

    /**
     * Scope query to order statuses by created_at in descending order.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Scope query to filter statuses by creation date range.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|\Carbon\Carbon $startDate
     * @param string|\Carbon\Carbon $endDate
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        // Convert string dates to Carbon instances if necessary
        if (is_string($startDate)) {
            $startDate = \Carbon\Carbon::parse($startDate);
        }
        
        if (is_string($endDate)) {
            $endDate = \Carbon\Carbon::parse($endDate);
        }
        
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }
}