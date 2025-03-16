<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Illuminate\Support\Collection; // Laravel ^10.0
use App\Models\User;
use App\Models\WorkflowStage;

class Workflow extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'description',
        'application_type',
        'is_active',
        'created_by_user_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Define the relationship between a workflow and its creator.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Define the relationship between a workflow and its stages.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function stages()
    {
        return $this->hasMany(WorkflowStage::class)->orderBy('sequence');
    }

    /**
     * Get the initial stage of the workflow (lowest sequence number).
     *
     * @return WorkflowStage|null
     */
    public function getInitialStage()
    {
        if (!$this->relationLoaded('stages')) {
            $this->load('stages');
        }

        return $this->stages->sortBy('sequence')->first();
    }

    /**
     * Get the final stages of the workflow (stages with no outgoing transitions).
     *
     * @return \Illuminate\Support\Collection
     */
    public function getFinalStages()
    {
        if (!$this->relationLoaded('stages')) {
            $this->load(['stages.outgoingTransitions']);
        }

        return $this->stages->filter(function ($stage) {
            return !$stage->hasOutgoingTransitions();
        });
    }

    /**
     * Activate this workflow.
     *
     * @return bool
     */
    public function activate()
    {
        $this->is_active = true;
        return $this->save();
    }

    /**
     * Deactivate this workflow.
     *
     * @return bool
     */
    public function deactivate()
    {
        $this->is_active = false;
        return $this->save();
    }

    /**
     * Check if this workflow is active.
     *
     * @return bool
     */
    public function isActive()
    {
        return $this->is_active;
    }

    /**
     * Create a duplicate of this workflow with a new name.
     *
     * @param string $newName
     * @return Workflow
     */
    public function duplicate(string $newName)
    {
        // Create a new workflow instance
        $duplicate = new Workflow();
        
        // Copy attributes
        $duplicate->description = $this->description;
        $duplicate->application_type = $this->application_type;
        $duplicate->created_by_user_id = $this->created_by_user_id;
        
        // Set the new name and make inactive by default
        $duplicate->name = $newName;
        $duplicate->is_active = false;
        
        // Save the new workflow
        $duplicate->save();
        
        // Load stages if not already loaded
        if (!$this->relationLoaded('stages')) {
            $this->load(['stages.outgoingTransitions', 'stages.incomingTransitions']);
        }
        
        // Create a mapping of old stage IDs to new stage IDs for transition creation
        $stageMapping = [];
        
        // Duplicate stages
        foreach ($this->stages as $stage) {
            $newStage = new WorkflowStage();
            $newStage->workflow_id = $duplicate->id;
            $newStage->name = $stage->name;
            $newStage->description = $stage->description;
            $newStage->sequence = $stage->sequence;
            $newStage->required_documents = $stage->required_documents;
            $newStage->required_actions = $stage->required_actions;
            $newStage->notification_triggers = $stage->notification_triggers;
            $newStage->assigned_role_id = $stage->assigned_role_id;
            $newStage->save();
            
            $stageMapping[$stage->id] = $newStage->id;
        }
        
        // Duplicate transitions with updated stage references
        foreach ($this->stages as $stage) {
            foreach ($stage->outgoingTransitions as $transition) {
                $newTransition = new \App\Models\WorkflowTransition();
                $newTransition->source_stage_id = $stageMapping[$transition->source_stage_id];
                $newTransition->target_stage_id = $stageMapping[$transition->target_stage_id];
                $newTransition->name = $transition->name;
                $newTransition->description = $transition->description;
                $newTransition->transition_conditions = $transition->transition_conditions;
                $newTransition->required_permissions = $transition->required_permissions;
                $newTransition->is_automatic = $transition->is_automatic;
                $newTransition->save();
            }
        }
        
        return $duplicate;
    }

    /**
     * Get the active workflow for a specific application type.
     *
     * @param string $applicationType
     * @return Workflow|null
     */
    public static function getActiveWorkflowForType(string $applicationType)
    {
        return static::where('application_type', $applicationType)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Scope query to only include active workflows.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope query to only include inactive workflows.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Scope query to filter workflows by application type.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|array $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByType($query, $type)
    {
        if (is_array($type)) {
            return $query->whereIn('application_type', $type);
        }
        
        return $query->where('application_type', $type);
    }

    /**
     * Scope query to filter workflows by creator.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByCreator($query, $userId)
    {
        return $query->where('created_by_user_id', $userId);
    }
}