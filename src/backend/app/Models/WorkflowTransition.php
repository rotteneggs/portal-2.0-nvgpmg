<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use App\Models\WorkflowStage;
use App\Models\User;

class WorkflowTransition extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'source_stage_id',
        'target_stage_id',
        'name',
        'description',
        'transition_conditions',
        'required_permissions',
        'is_automatic',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'transition_conditions' => 'json',
        'required_permissions' => 'json',
        'is_automatic' => 'boolean',
    ];

    /**
     * The relationships that should be eager loaded.
     *
     * @var array
     */
    protected $with = [
        'sourceStage',
        'targetStage',
    ];

    /**
     * Define the relationship between a transition and its source stage.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function sourceStage()
    {
        return $this->belongsTo(WorkflowStage::class, 'source_stage_id');
    }

    /**
     * Define the relationship between a transition and its target stage.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function targetStage()
    {
        return $this->belongsTo(WorkflowStage::class, 'target_stage_id');
    }

    /**
     * Get the conditions that must be met for this transition.
     *
     * @return array
     */
    public function getTransitionConditions()
    {
        return $this->transition_conditions ?? [];
    }

    /**
     * Get the permissions required to execute this transition.
     *
     * @return array
     */
    public function getRequiredPermissions()
    {
        return $this->required_permissions ?? [];
    }

    /**
     * Check if this transition happens automatically when conditions are met.
     *
     * @return bool
     */
    public function isAutomatic()
    {
        return $this->is_automatic;
    }

    /**
     * Check if this transition is available for a specific application.
     *
     * @param object $application
     * @return bool
     */
    public function isAvailableFor($application)
    {
        $conditions = $this->getTransitionConditions();

        // If there are no conditions, the transition is always available
        if (empty($conditions)) {
            return true;
        }

        // Evaluate each condition against the application data
        foreach ($conditions as $condition) {
            if (!$this->evaluateCondition($condition, $application)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if a user has permission to execute this transition.
     *
     * @param \App\Models\User $user
     * @return bool
     */
    public function userHasPermission(User $user)
    {
        $permissions = $this->getRequiredPermissions();

        // If there are no required permissions, any user can execute the transition
        if (empty($permissions)) {
            return true;
        }

        // Check if the user has all required permissions
        foreach ($permissions as $permission) {
            if (isset($permission['action']) && isset($permission['resource'])) {
                if (!$user->hasPermissionTo($permission['action'], $permission['resource'])) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Evaluate a single condition against application data.
     *
     * @param array $condition
     * @param object $application
     * @return bool
     */
    public function evaluateCondition($condition, $application)
    {
        if (!isset($condition['field']) || !isset($condition['operator']) || !isset($condition['value'])) {
            return false;
        }

        $field = $condition['field'];
        $operator = $condition['operator'];
        $expectedValue = $condition['value'];

        // Get the actual value from the application data
        $actualValue = data_get($application, $field);

        // Compare the values based on the operator
        switch ($operator) {
            case '=':
            case '==':
                return $actualValue == $expectedValue;
            case '!=':
            case '<>':
                return $actualValue != $expectedValue;
            case '<':
                return $actualValue < $expectedValue;
            case '<=':
                return $actualValue <= $expectedValue;
            case '>':
                return $actualValue > $expectedValue;
            case '>=':
                return $actualValue >= $expectedValue;
            case 'in':
                return in_array($actualValue, (array)$expectedValue);
            case 'not_in':
                return !in_array($actualValue, (array)$expectedValue);
            case 'contains':
                return is_array($actualValue) && in_array($expectedValue, $actualValue);
            case 'not_contains':
                return is_array($actualValue) && !in_array($expectedValue, $actualValue);
            case 'starts_with':
                return is_string($actualValue) && str_starts_with($actualValue, $expectedValue);
            case 'ends_with':
                return is_string($actualValue) && str_ends_with($actualValue, $expectedValue);
            default:
                return false;
        }
    }

    /**
     * Scope query to filter transitions by source stage ID.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $stageId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeBySourceStage($query, $stageId)
    {
        return $query->where('source_stage_id', $stageId);
    }

    /**
     * Scope query to filter transitions by target stage ID.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $stageId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByTargetStage($query, $stageId)
    {
        return $query->where('target_stage_id', $stageId);
    }

    /**
     * Scope query to filter transitions by automatic flag.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param bool $isAutomatic
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeAutomatic($query, $isAutomatic = true)
    {
        return $query->where('is_automatic', $isAutomatic);
    }
}