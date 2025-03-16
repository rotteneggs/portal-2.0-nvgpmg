<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;
use Exception;

use App\Models\Workflow;
use App\Models\WorkflowStage;
use App\Models\WorkflowTransition;
use App\Models\User;
use App\Services\AuditService;
use App\Exceptions\WorkflowException;

class WorkflowService
{
    /**
     * The audit service instance.
     *
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * Create a new workflow service instance.
     *
     * @param AuditService $auditService
     * @return void
     */
    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Get a list of workflows with optional filtering.
     *
     * @param array $filters
     * @param int $perPage
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getWorkflows(array $filters = [], int $perPage = 15)
    {
        $query = Workflow::query();
        
        // Apply filters if provided
        if (isset($filters['application_type'])) {
            $query->byType($filters['application_type']);
        }
        
        if (isset($filters['is_active'])) {
            if ($filters['is_active']) {
                $query->active();
            } else {
                $query->inactive();
            }
        }
        
        if (isset($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $query->where(function ($query) use ($term) {
                $query->where('name', 'LIKE', $term)
                      ->orWhere('description', 'LIKE', $term);
            });
        }
        
        // Order by created date, newest first
        $query->orderBy('created_at', 'desc');
        
        // Paginate the results
        return $query->paginate($perPage);
    }

    /**
     * Get a specific workflow by ID.
     *
     * @param int $id
     * @return Workflow|null
     */
    public function getWorkflowById(int $id)
    {
        return Workflow::find($id);
    }

    /**
     * Get the active workflow for a specific application type.
     *
     * @param string $applicationType
     * @return Workflow|null
     */
    public function getActiveWorkflowForType(string $applicationType)
    {
        return Workflow::getActiveWorkflowForType($applicationType);
    }

    /**
     * Create a new workflow.
     *
     * @param array $data
     * @param User $user
     * @return Workflow
     */
    public function createWorkflow(array $data, User $user)
    {
        DB::beginTransaction();
        
        try {
            // Create a new workflow instance
            $workflow = new Workflow();
            $workflow->name = $data['name'];
            $workflow->description = $data['description'] ?? null;
            $workflow->application_type = $data['application_type'];
            $workflow->is_active = false; // New workflows are inactive by default
            $workflow->created_by_user_id = $user->id;
            $workflow->save();
            
            // Log the workflow creation
            $this->logWorkflowAction(
                'create', 
                'workflow', 
                $workflow->id, 
                $user,
                ['name' => $workflow->name, 'application_type' => $workflow->application_type]
            );
            
            DB::commit();
            return $workflow;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to create workflow: ' . $e->getMessage(), ['user_id' => $user->id, 'data' => $data]);
            throw $e;
        }
    }

    /**
     * Update an existing workflow.
     *
     * @param Workflow $workflow
     * @param array $data
     * @param User $user
     * @return Workflow
     */
    public function updateWorkflow(Workflow $workflow, array $data, User $user)
    {
        DB::beginTransaction();
        
        try {
            $oldValues = [
                'name' => $workflow->name,
                'description' => $workflow->description,
                'application_type' => $workflow->application_type
            ];
            
            // Update workflow attributes
            $workflow->name = $data['name'] ?? $workflow->name;
            $workflow->description = $data['description'] ?? $workflow->description;
            $workflow->application_type = $data['application_type'] ?? $workflow->application_type;
            $workflow->save();
            
            $newValues = [
                'name' => $workflow->name,
                'description' => $workflow->description,
                'application_type' => $workflow->application_type
            ];
            
            // Log the workflow update
            $this->logWorkflowAction(
                'update', 
                'workflow', 
                $workflow->id, 
                $user,
                ['old' => $oldValues, 'new' => $newValues]
            );
            
            DB::commit();
            return $workflow;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to update workflow: ' . $e->getMessage(), ['workflow_id' => $workflow->id, 'user_id' => $user->id, 'data' => $data]);
            throw $e;
        }
    }

    /**
     * Delete a workflow and all its stages and transitions.
     *
     * @param Workflow $workflow
     * @param User $user
     * @return bool
     * @throws WorkflowException
     */
    public function deleteWorkflow(Workflow $workflow, User $user)
    {
        // Cannot delete an active workflow
        if ($workflow->isActive()) {
            throw WorkflowException::activeWorkflowModificationError($workflow->name, $workflow->id);
        }
        
        DB::beginTransaction();
        
        try {
            // Get all stages
            $stages = $workflow->stages;
            
            // Delete all transitions first
            foreach ($stages as $stage) {
                WorkflowTransition::where('source_stage_id', $stage->id)
                    ->orWhere('target_stage_id', $stage->id)
                    ->delete();
            }
            
            // Delete all stages
            WorkflowStage::where('workflow_id', $workflow->id)->delete();
            
            // Delete the workflow
            $workflow->delete();
            
            // Log the workflow deletion
            $this->logWorkflowAction(
                'delete', 
                'workflow', 
                $workflow->id, 
                $user,
                ['name' => $workflow->name, 'application_type' => $workflow->application_type]
            );
            
            DB::commit();
            return true;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete workflow: ' . $e->getMessage(), ['workflow_id' => $workflow->id, 'user_id' => $user->id]);
            throw $e;
        }
    }

    /**
     * Activate a workflow, making it the active workflow for its type.
     *
     * @param Workflow $workflow
     * @param User $user
     * @return Workflow
     */
    public function activateWorkflow(Workflow $workflow, User $user)
    {
        DB::beginTransaction();
        
        try {
            // Check if there's already an active workflow for this type
            $currentActive = Workflow::getActiveWorkflowForType($workflow->application_type);
            
            // If there's an active workflow and it's not the one we're activating
            if ($currentActive && $currentActive->id !== $workflow->id) {
                // Deactivate the current active workflow
                $currentActive->deactivate();
                
                // Log the deactivation
                $this->logWorkflowAction(
                    'deactivate', 
                    'workflow', 
                    $currentActive->id, 
                    $user,
                    ['name' => $currentActive->name, 'replaced_by' => $workflow->name]
                );
            }
            
            // Activate the workflow
            $workflow->activate();
            
            // Log the activation
            $this->logWorkflowAction(
                'activate', 
                'workflow', 
                $workflow->id, 
                $user,
                ['name' => $workflow->name, 'application_type' => $workflow->application_type]
            );
            
            DB::commit();
            return $workflow;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to activate workflow: ' . $e->getMessage(), ['workflow_id' => $workflow->id, 'user_id' => $user->id]);
            throw $e;
        }
    }

    /**
     * Deactivate a workflow.
     *
     * @param Workflow $workflow
     * @param User $user
     * @return Workflow
     */
    public function deactivateWorkflow(Workflow $workflow, User $user)
    {
        DB::beginTransaction();
        
        try {
            // Deactivate the workflow
            $workflow->deactivate();
            
            // Log the deactivation
            $this->logWorkflowAction(
                'deactivate', 
                'workflow', 
                $workflow->id, 
                $user,
                ['name' => $workflow->name, 'application_type' => $workflow->application_type]
            );
            
            DB::commit();
            return $workflow;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to deactivate workflow: ' . $e->getMessage(), ['workflow_id' => $workflow->id, 'user_id' => $user->id]);
            throw $e;
        }
    }

    /**
     * Create a duplicate of an existing workflow with a new name.
     *
     * @param Workflow $workflow
     * @param string $newName
     * @param User $user
     * @return Workflow
     */
    public function duplicateWorkflow(Workflow $workflow, string $newName, User $user)
    {
        DB::beginTransaction();
        
        try {
            // Duplicate the workflow
            $duplicate = $workflow->duplicate($newName);
            $duplicate->created_by_user_id = $user->id;
            $duplicate->save();
            
            // Log the duplication
            $this->logWorkflowAction(
                'duplicate', 
                'workflow', 
                $duplicate->id, 
                $user,
                ['name' => $duplicate->name, 'original_id' => $workflow->id, 'original_name' => $workflow->name]
            );
            
            DB::commit();
            return $duplicate;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to duplicate workflow: ' . $e->getMessage(), ['workflow_id' => $workflow->id, 'user_id' => $user->id, 'new_name' => $newName]);
            throw $e;
        }
    }

    /**
     * Validate a workflow for completeness and correctness.
     *
     * @param Workflow $workflow
     * @return array
     */
    public function validateWorkflow(Workflow $workflow)
    {
        $results = [
            'valid' => true,
            'issues' => []
        ];
        
        // Load the stages if not already loaded
        if (!$workflow->relationLoaded('stages')) {
            $workflow->load(['stages.outgoingTransitions', 'stages.incomingTransitions']);
        }
        
        // Check if the workflow has at least one stage
        if ($workflow->stages->isEmpty()) {
            $results['valid'] = false;
            $results['issues'][] = 'Workflow must have at least one stage.';
        }
        
        // Check if the workflow has an initial stage
        $initialStage = $workflow->getInitialStage();
        if (!$initialStage) {
            $results['valid'] = false;
            $results['issues'][] = 'Workflow must have an initial stage.';
        }
        
        // Check if the workflow has at least one final stage
        $finalStages = $workflow->getFinalStages();
        if ($finalStages->isEmpty()) {
            $results['valid'] = false;
            $results['issues'][] = 'Workflow must have at least one final stage.';
        }
        
        // Check if all stages (except initial and final) have at least one incoming and one outgoing transition
        $isolatedStages = $workflow->stages->filter(function ($stage) {
            // Skip initial and final stages from this check
            if ($stage->isInitialStage() || $stage->isFinalStage()) {
                return false;
            }
            
            // Check if the stage has at least one incoming and one outgoing transition
            return !$stage->hasIncomingTransitions() || !$stage->hasOutgoingTransitions();
        });
        
        if ($isolatedStages->isNotEmpty()) {
            $results['valid'] = false;
            $stageNames = $isolatedStages->pluck('name')->implode(', ');
            $results['issues'][] = "The following stages are isolated (no incoming or outgoing transitions): {$stageNames}";
        }
        
        return $results;
    }

    /**
     * Get all stages for a specific workflow.
     *
     * @param Workflow $workflow
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getWorkflowStages(Workflow $workflow)
    {
        return WorkflowStage::byWorkflow($workflow->id)
            ->bySequence()
            ->with('assignedRole')
            ->get();
    }

    /**
     * Create a new workflow stage.
     *
     * @param Workflow $workflow
     * @param array $data
     * @param User $user
     * @return WorkflowStage
     */
    public function createWorkflowStage(Workflow $workflow, array $data, User $user)
    {
        DB::beginTransaction();
        
        try {
            // Create a new stage
            $stage = new WorkflowStage();
            $stage->workflow_id = $workflow->id;
            $stage->name = $data['name'];
            $stage->description = $data['description'] ?? null;
            $stage->required_documents = $data['required_documents'] ?? null;
            $stage->required_actions = $data['required_actions'] ?? null;
            $stage->notification_triggers = $data['notification_triggers'] ?? null;
            $stage->assigned_role_id = $data['assigned_role_id'] ?? null;
            
            // Calculate the next sequence number
            $maxSequence = WorkflowStage::byWorkflow($workflow->id)->max('sequence') ?? 0;
            $stage->sequence = $maxSequence + 1;
            
            $stage->save();
            
            // Log the stage creation
            $this->logWorkflowAction(
                'create', 
                'workflow_stage', 
                $stage->id, 
                $user,
                ['name' => $stage->name, 'workflow_id' => $workflow->id, 'workflow_name' => $workflow->name]
            );
            
            DB::commit();
            return $stage;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to create workflow stage: ' . $e->getMessage(), ['workflow_id' => $workflow->id, 'user_id' => $user->id, 'data' => $data]);
            throw $e;
        }
    }

    /**
     * Update an existing workflow stage.
     *
     * @param WorkflowStage $stage
     * @param array $data
     * @param User $user
     * @return WorkflowStage
     */
    public function updateWorkflowStage(WorkflowStage $stage, array $data, User $user)
    {
        DB::beginTransaction();
        
        try {
            $oldValues = [
                'name' => $stage->name,
                'description' => $stage->description,
                'required_documents' => $stage->required_documents,
                'required_actions' => $stage->required_actions,
                'notification_triggers' => $stage->notification_triggers,
                'assigned_role_id' => $stage->assigned_role_id
            ];
            
            // Update stage attributes
            $stage->name = $data['name'] ?? $stage->name;
            $stage->description = $data['description'] ?? $stage->description;
            $stage->required_documents = $data['required_documents'] ?? $stage->required_documents;
            $stage->required_actions = $data['required_actions'] ?? $stage->required_actions;
            $stage->notification_triggers = $data['notification_triggers'] ?? $stage->notification_triggers;
            $stage->assigned_role_id = $data['assigned_role_id'] ?? $stage->assigned_role_id;
            $stage->save();
            
            $newValues = [
                'name' => $stage->name,
                'description' => $stage->description,
                'required_documents' => $stage->required_documents,
                'required_actions' => $stage->required_actions,
                'notification_triggers' => $stage->notification_triggers,
                'assigned_role_id' => $stage->assigned_role_id
            ];
            
            // Log the stage update
            $this->logWorkflowAction(
                'update', 
                'workflow_stage', 
                $stage->id, 
                $user,
                ['old' => $oldValues, 'new' => $newValues, 'workflow_id' => $stage->workflow_id]
            );
            
            DB::commit();
            return $stage;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to update workflow stage: ' . $e->getMessage(), ['stage_id' => $stage->id, 'user_id' => $user->id, 'data' => $data]);
            throw $e;
        }
    }

    /**
     * Delete a workflow stage and its transitions.
     *
     * @param WorkflowStage $stage
     * @param User $user
     * @return bool
     */
    public function deleteWorkflowStage(WorkflowStage $stage, User $user)
    {
        DB::beginTransaction();
        
        try {
            $workflowId = $stage->workflow_id;
            $stageSequence = $stage->sequence;
            
            // Delete all incoming transitions to this stage
            WorkflowTransition::where('target_stage_id', $stage->id)->delete();
            
            // Delete all outgoing transitions from this stage
            WorkflowTransition::where('source_stage_id', $stage->id)->delete();
            
            // Delete the stage
            $stage->delete();
            
            // Reorder the remaining stages to ensure sequential numbering
            $this->reorderStagesAfterDeletion($workflowId, $stageSequence);
            
            // Log the stage deletion
            $this->logWorkflowAction(
                'delete', 
                'workflow_stage', 
                $stage->id, 
                $user,
                ['name' => $stage->name, 'workflow_id' => $workflowId]
            );
            
            DB::commit();
            return true;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete workflow stage: ' . $e->getMessage(), ['stage_id' => $stage->id, 'user_id' => $user->id]);
            throw $e;
        }
    }

    /**
     * Reorder stages after a stage deletion to maintain sequential numbering.
     *
     * @param int $workflowId
     * @param int $deletedSequence
     * @return void
     */
    private function reorderStagesAfterDeletion(int $workflowId, int $deletedSequence)
    {
        // Get all stages with sequence > deletedSequence
        $stages = WorkflowStage::byWorkflow($workflowId)
            ->where('sequence', '>', $deletedSequence)
            ->bySequence()
            ->get();
        
        // Decrement the sequence for each stage
        foreach ($stages as $stage) {
            $stage->sequence = $stage->sequence - 1;
            $stage->save();
        }
    }

    /**
     * Reorder the stages of a workflow.
     *
     * @param Workflow $workflow
     * @param array $stageOrder
     * @param User $user
     * @return bool
     */
    public function reorderWorkflowStages(Workflow $workflow, array $stageOrder, User $user)
    {
        DB::beginTransaction();
        
        try {
            // Validate that all stages belong to the workflow
            $stages = WorkflowStage::byWorkflow($workflow->id)->get();
            $validStageIds = $stages->pluck('id')->toArray();
            
            foreach ($stageOrder as $stageId) {
                if (!in_array($stageId, $validStageIds)) {
                    throw new WorkflowException("Stage ID {$stageId} does not belong to workflow {$workflow->id}");
                }
            }
            
            // Update the sequence numbers
            foreach ($stageOrder as $sequence => $stageId) {
                $stage = WorkflowStage::find($stageId);
                $stage->sequence = $sequence + 1; // +1 since sequences are 1-based
                $stage->save();
            }
            
            // Log the reordering
            $this->logWorkflowAction(
                'reorder', 
                'workflow_stages', 
                $workflow->id, 
                $user,
                ['workflow_id' => $workflow->id, 'new_order' => $stageOrder]
            );
            
            DB::commit();
            return true;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to reorder workflow stages: ' . $e->getMessage(), ['workflow_id' => $workflow->id, 'user_id' => $user->id, 'stage_order' => $stageOrder]);
            throw $e;
        }
    }

    /**
     * Get transitions for a specific workflow with optional filtering.
     *
     * @param Workflow $workflow
     * @param array $filters
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getWorkflowTransitions(Workflow $workflow, array $filters = [])
    {
        // Get all stage IDs for this workflow
        $stageIds = WorkflowStage::byWorkflow($workflow->id)->pluck('id')->toArray();
        
        $query = WorkflowTransition::whereIn('source_stage_id', $stageIds);
        
        // Apply filters if provided
        if (isset($filters['source_stage_id'])) {
            $query->bySourceStage($filters['source_stage_id']);
        }
        
        if (isset($filters['target_stage_id'])) {
            $query->byTargetStage($filters['target_stage_id']);
        }
        
        if (isset($filters['is_automatic'])) {
            $query->automatic($filters['is_automatic']);
        }
        
        // Eager load stages
        $query->with(['sourceStage', 'targetStage']);
        
        return $query->get();
    }

    /**
     * Create a new workflow transition between stages.
     *
     * @param WorkflowStage $sourceStage
     * @param WorkflowStage $targetStage
     * @param array $data
     * @param User $user
     * @return WorkflowTransition
     * @throws WorkflowException
     */
    public function createWorkflowTransition(WorkflowStage $sourceStage, WorkflowStage $targetStage, array $data, User $user)
    {
        // Verify that source and target stages belong to the same workflow
        if ($sourceStage->workflow_id !== $targetStage->workflow_id) {
            throw new WorkflowException(
                'Source and target stages must belong to the same workflow.',
                [
                    'source_stage_id' => $sourceStage->id,
                    'target_stage_id' => $targetStage->id,
                    'source_workflow_id' => $sourceStage->workflow_id,
                    'target_workflow_id' => $targetStage->workflow_id
                ]
            );
        }
        
        DB::beginTransaction();
        
        try {
            // Create a new transition
            $transition = new WorkflowTransition();
            $transition->source_stage_id = $sourceStage->id;
            $transition->target_stage_id = $targetStage->id;
            $transition->name = $data['name'];
            $transition->description = $data['description'] ?? null;
            $transition->transition_conditions = $data['transition_conditions'] ?? null;
            $transition->required_permissions = $data['required_permissions'] ?? null;
            $transition->is_automatic = $data['is_automatic'] ?? false;
            $transition->save();
            
            // Log the transition creation
            $this->logWorkflowAction(
                'create', 
                'workflow_transition', 
                $transition->id, 
                $user,
                [
                    'name' => $transition->name,
                    'source_stage_id' => $sourceStage->id,
                    'source_stage_name' => $sourceStage->name,
                    'target_stage_id' => $targetStage->id,
                    'target_stage_name' => $targetStage->name,
                    'workflow_id' => $sourceStage->workflow_id
                ]
            );
            
            DB::commit();
            return $transition;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to create workflow transition: ' . $e->getMessage(), ['source_stage_id' => $sourceStage->id, 'target_stage_id' => $targetStage->id, 'user_id' => $user->id, 'data' => $data]);
            throw $e;
        }
    }

    /**
     * Update an existing workflow transition.
     *
     * @param WorkflowTransition $transition
     * @param array $data
     * @param User $user
     * @return WorkflowTransition
     */
    public function updateWorkflowTransition(WorkflowTransition $transition, array $data, User $user)
    {
        DB::beginTransaction();
        
        try {
            $oldValues = [
                'name' => $transition->name,
                'description' => $transition->description,
                'transition_conditions' => $transition->transition_conditions,
                'required_permissions' => $transition->required_permissions,
                'is_automatic' => $transition->is_automatic
            ];
            
            // Update transition attributes
            $transition->name = $data['name'] ?? $transition->name;
            $transition->description = $data['description'] ?? $transition->description;
            $transition->transition_conditions = $data['transition_conditions'] ?? $transition->transition_conditions;
            $transition->required_permissions = $data['required_permissions'] ?? $transition->required_permissions;
            $transition->is_automatic = $data['is_automatic'] ?? $transition->is_automatic;
            $transition->save();
            
            $newValues = [
                'name' => $transition->name,
                'description' => $transition->description,
                'transition_conditions' => $transition->transition_conditions,
                'required_permissions' => $transition->required_permissions,
                'is_automatic' => $transition->is_automatic
            ];
            
            // Log the transition update
            $this->logWorkflowAction(
                'update', 
                'workflow_transition', 
                $transition->id, 
                $user,
                [
                    'old' => $oldValues,
                    'new' => $newValues,
                    'source_stage_id' => $transition->source_stage_id,
                    'target_stage_id' => $transition->target_stage_id
                ]
            );
            
            DB::commit();
            return $transition;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to update workflow transition: ' . $e->getMessage(), ['transition_id' => $transition->id, 'user_id' => $user->id, 'data' => $data]);
            throw $e;
        }
    }

    /**
     * Delete a workflow transition.
     *
     * @param WorkflowTransition $transition
     * @param User $user
     * @return bool
     */
    public function deleteWorkflowTransition(WorkflowTransition $transition, User $user)
    {
        DB::beginTransaction();
        
        try {
            // Store transition details for logging
            $transitionDetails = [
                'id' => $transition->id,
                'name' => $transition->name,
                'source_stage_id' => $transition->source_stage_id,
                'target_stage_id' => $transition->target_stage_id
            ];
            
            // Delete the transition
            $transition->delete();
            
            // Log the transition deletion
            $this->logWorkflowAction(
                'delete', 
                'workflow_transition', 
                $transition->id, 
                $user,
                $transitionDetails
            );
            
            DB::commit();
            return true;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete workflow transition: ' . $e->getMessage(), ['transition_id' => $transition->id, 'user_id' => $user->id]);
            throw $e;
        }
    }

    /**
     * Log a workflow action in the audit log.
     *
     * @param string $action
     * @param string $resourceType
     * @param int $resourceId
     * @param User $user
     * @param array $additionalData
     * @return void
     */
    protected function logWorkflowAction(string $action, string $resourceType, int $resourceId, User $user, array $additionalData = [])
    {
        $this->auditService->log(
            $action,
            $resourceType,
            $resourceId,
            null,
            $additionalData,
            $user
        );
    }
}