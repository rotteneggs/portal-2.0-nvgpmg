<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel 10.0+
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel 10.0+
use Illuminate\Support\Collection; // Laravel 10.0+
use Illuminate\Database\Eloquent\Builder; // Laravel 10.0+
use App\Models\Role;

class WorkflowStage extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'workflow_id',
        'name',
        'description',
        'sequence',
        'required_documents',
        'required_actions',
        'notification_triggers',
        'assigned_role_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'required_documents' => 'json',
        'required_actions' => 'json',
        'notification_triggers' => 'json',
        'sequence' => 'integer',
    ];

    /**
     * The relationships that should be eager loaded.
     *
     * @var array
     */
    protected $with = [
        'assignedRole',
    ];

    /**
     * Define the relationship between a stage and its parent workflow.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function workflow()
    {
        return $this->belongsTo(\App\Models\Workflow::class);
    }

    /**
     * Define the relationship between a stage and its assigned role.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function assignedRole()
    {
        return $this->belongsTo(Role::class, 'assigned_role_id');
    }

    /**
     * Define the relationship between a stage and its incoming transitions.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function incomingTransitions()
    {
        return $this->hasMany(\App\Models\WorkflowTransition::class, 'target_stage_id');
    }

    /**
     * Define the relationship between a stage and its outgoing transitions.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function outgoingTransitions()
    {
        return $this->hasMany(\App\Models\WorkflowTransition::class, 'source_stage_id');
    }

    /**
     * Define the relationship between a stage and application statuses.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function applicationStatuses()
    {
        return $this->hasMany(\App\Models\ApplicationStatus::class, 'workflow_stage_id');
    }

    /**
     * Get the documents required for this stage.
     *
     * @return array
     */
    public function getRequiredDocuments()
    {
        return $this->required_documents ?? [];
    }

    /**
     * Get the actions required for this stage.
     *
     * @return array
     */
    public function getRequiredActions()
    {
        return $this->required_actions ?? [];
    }

    /**
     * Get the notification triggers for this stage.
     *
     * @return array
     */
    public function getNotificationTriggers()
    {
        return $this->notification_triggers ?? [];
    }

    /**
     * Check if this stage has any outgoing transitions.
     *
     * @return bool
     */
    public function hasOutgoingTransitions()
    {
        if (!$this->relationLoaded('outgoingTransitions')) {
            $this->load('outgoingTransitions');
        }
        
        return $this->outgoingTransitions->isNotEmpty();
    }

    /**
     * Check if this stage has any incoming transitions.
     *
     * @return bool
     */
    public function hasIncomingTransitions()
    {
        if (!$this->relationLoaded('incomingTransitions')) {
            $this->load('incomingTransitions');
        }
        
        return $this->incomingTransitions->isNotEmpty();
    }

    /**
     * Check if this stage is the initial stage in the workflow.
     *
     * @return bool
     */
    public function isInitialStage()
    {
        return !$this->hasIncomingTransitions() || $this->sequence === 1;
    }

    /**
     * Check if this stage is a final stage in the workflow (no outgoing transitions).
     *
     * @return bool
     */
    public function isFinalStage()
    {
        return !$this->hasOutgoingTransitions();
    }

    /**
     * Get transitions available for a specific application.
     *
     * @param object $application
     * @return \Illuminate\Support\Collection
     */
    public function getAvailableTransitions($application)
    {
        if (!$this->relationLoaded('outgoingTransitions')) {
            $this->load('outgoingTransitions');
        }
        
        return $this->outgoingTransitions->filter(function ($transition) use ($application) {
            // If there are no conditions, the transition is available
            if (empty($transition->transition_conditions)) {
                return true;
            }
            
            // Evaluate the conditions against the application
            $conditions = (array) $transition->transition_conditions;
            
            foreach ($conditions as $key => $value) {
                // Check if application has the property and if it matches the expected value
                if (!isset($application->$key) || $application->$key != $value) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Get automatic transitions for this stage.
     *
     * @return \Illuminate\Support\Collection
     */
    public function getAutomaticTransitions()
    {
        if (!$this->relationLoaded('outgoingTransitions')) {
            $this->load('outgoingTransitions');
        }
        
        return $this->outgoingTransitions->filter(function ($transition) {
            return $transition->is_automatic;
        });
    }

    /**
     * Scope query to filter stages by workflow ID.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $workflowId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByWorkflow($query, $workflowId)
    {
        return $query->where('workflow_id', $workflowId);
    }

    /**
     * Scope query to order stages by sequence.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $direction
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeBySequence($query, $direction = 'asc')
    {
        return $query->orderBy('sequence', $direction);
    }

    /**
     * Scope query to filter stages by assigned role ID.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $roleId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByAssignedRole($query, $roleId)
    {
        return $query->where('assigned_role_id', $roleId);
    }
}