<?php

namespace App\Http\Controllers\Api\V1\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Exception;
use App\Http\Controllers\Controller;

use App\Services\WorkflowService;
use App\Models\Workflow;
use App\Models\WorkflowStage;
use App\Models\WorkflowTransition;
use App\Http\Resources\WorkflowResource;
use App\Http\Requests\WorkflowStoreRequest;
use App\Http\Requests\WorkflowUpdateRequest;
use App\Exceptions\WorkflowException;

class WorkflowEditorController extends Controller
{
    /**
     * The workflow service instance.
     *
     * @var WorkflowService
     */
    protected WorkflowService $workflowService;

    /**
     * Create a new controller instance with dependencies.
     *
     * @param WorkflowService $workflowService
     * @return void
     */
    public function __construct(WorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    /**
     * Get a paginated list of workflows with optional filtering.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $filters = [
            'application_type' => $request->input('application_type'),
            'is_active' => $request->boolean('is_active', null),
            'search' => $request->input('search')
        ];

        $perPage = $request->input('per_page', 15);
        $workflows = $this->workflowService->getWorkflows($filters, $perPage);

        return response()->json([
            'success' => true,
            'data' => WorkflowResource::collection($workflows),
            'meta' => [
                'pagination' => [
                    'total' => $workflows->total(),
                    'per_page' => $workflows->perPage(),
                    'current_page' => $workflows->currentPage(),
                    'last_page' => $workflows->lastPage(),
                    'from' => $workflows->firstItem(),
                    'to' => $workflows->lastItem()
                ]
            ]
        ]);
    }

    /**
     * Get a specific workflow by ID.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(int $id)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => (new WorkflowResource($workflow))->withStages()->withCreator()
        ]);
    }

    /**
     * Create a new workflow.
     *
     * @param WorkflowStoreRequest $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(WorkflowStoreRequest $request)
    {
        $data = $request->validated();
        $user = Auth::user();

        $workflow = $this->workflowService->createWorkflow($data, $user);

        return response()->json([
            'success' => true,
            'data' => new WorkflowResource($workflow),
            'message' => 'Workflow created successfully'
        ], 201);
    }

    /**
     * Update an existing workflow.
     *
     * @param WorkflowUpdateRequest $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(WorkflowUpdateRequest $request, int $id)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $data = $request->validated();
        $user = Auth::user();

        $updatedWorkflow = $this->workflowService->updateWorkflow($workflow, $data, $user);

        return response()->json([
            'success' => true,
            'data' => (new WorkflowResource($updatedWorkflow))->withStages(),
            'message' => 'Workflow updated successfully'
        ]);
    }

    /**
     * Delete a workflow.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(int $id)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $user = Auth::user();

        try {
            $this->workflowService->deleteWorkflow($workflow, $user);

            return response()->json([
                'success' => true,
                'message' => 'Workflow deleted successfully'
            ]);
        } catch (WorkflowException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => $e->getErrorCode(),
                    'message' => $e->getMessage(),
                    'details' => $e->getContext()
                ]
            ], 422);
        } catch (Exception $e) {
            Log::error('Failed to delete workflow: ' . $e->getMessage(), [
                'workflow_id' => $id,
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'SERVER_ERROR',
                    'message' => 'An error occurred while deleting the workflow'
                ]
            ], 500);
        }
    }

    /**
     * Activate a workflow.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function activate(int $id)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $user = Auth::user();
        $activatedWorkflow = $this->workflowService->activateWorkflow($workflow, $user);

        return response()->json([
            'success' => true,
            'data' => new WorkflowResource($activatedWorkflow),
            'message' => 'Workflow activated successfully'
        ]);
    }

    /**
     * Deactivate a workflow.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function deactivate(int $id)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $user = Auth::user();
        $deactivatedWorkflow = $this->workflowService->deactivateWorkflow($workflow, $user);

        return response()->json([
            'success' => true,
            'data' => new WorkflowResource($deactivatedWorkflow),
            'message' => 'Workflow deactivated successfully'
        ]);
    }

    /**
     * Create a duplicate of an existing workflow.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function duplicate(Request $request, int $id)
    {
        $request->validate([
            'name' => 'required|string|max:100'
        ]);

        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $user = Auth::user();
        $newName = $request->input('name');
        $duplicatedWorkflow = $this->workflowService->duplicateWorkflow($workflow, $newName, $user);

        return response()->json([
            'success' => true,
            'data' => (new WorkflowResource($duplicatedWorkflow))->withStages(),
            'message' => 'Workflow duplicated successfully'
        ], 201);
    }

    /**
     * Validate a workflow for completeness and correctness.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function validate(int $id)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $validationResults = $this->workflowService->validateWorkflow($workflow);

        return response()->json([
            'success' => true,
            'data' => $validationResults
        ]);
    }

    /**
     * Get all stages for a specific workflow.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function stages(int $id)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $stages = $this->workflowService->getWorkflowStages($workflow);

        return response()->json([
            'success' => true,
            'data' => $stages
        ]);
    }

    /**
     * Create a new workflow stage.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeStage(Request $request, int $id)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'required_documents' => 'nullable|array',
            'required_actions' => 'nullable|array',
            'notification_triggers' => 'nullable|array',
            'assigned_role_id' => 'nullable|exists:roles,id'
        ]);

        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $user = Auth::user();
        $stageData = $request->only([
            'name',
            'description',
            'required_documents',
            'required_actions',
            'notification_triggers',
            'assigned_role_id'
        ]);

        $stage = $this->workflowService->createWorkflowStage($workflow, $stageData, $user);

        return response()->json([
            'success' => true,
            'data' => $stage,
            'message' => 'Workflow stage created successfully'
        ], 201);
    }

    /**
     * Update an existing workflow stage.
     *
     * @param Request $request
     * @param int $id
     * @param int $stageId
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateStage(Request $request, int $id, int $stageId)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'required_documents' => 'nullable|array',
            'required_actions' => 'nullable|array',
            'notification_triggers' => 'nullable|array',
            'assigned_role_id' => 'nullable|exists:roles,id'
        ]);

        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $stages = $this->workflowService->getWorkflowStages($workflow);
        $stage = $stages->firstWhere('id', $stageId);

        if (!$stage) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'STAGE_NOT_FOUND',
                    'message' => 'Stage not found in this workflow'
                ]
            ], 404);
        }

        $user = Auth::user();
        $stageData = $request->only([
            'name',
            'description',
            'required_documents',
            'required_actions',
            'notification_triggers',
            'assigned_role_id'
        ]);

        $updatedStage = $this->workflowService->updateWorkflowStage($stage, $stageData, $user);

        return response()->json([
            'success' => true,
            'data' => $updatedStage,
            'message' => 'Workflow stage updated successfully'
        ]);
    }

    /**
     * Delete a workflow stage.
     *
     * @param int $id
     * @param int $stageId
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroyStage(int $id, int $stageId)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $stages = $this->workflowService->getWorkflowStages($workflow);
        $stage = $stages->firstWhere('id', $stageId);

        if (!$stage) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'STAGE_NOT_FOUND',
                    'message' => 'Stage not found in this workflow'
                ]
            ], 404);
        }

        $user = Auth::user();
        $this->workflowService->deleteWorkflowStage($stage, $user);

        return response()->json([
            'success' => true,
            'message' => 'Workflow stage deleted successfully'
        ]);
    }

    /**
     * Reorder the stages of a workflow.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function reorderStages(Request $request, int $id)
    {
        $request->validate([
            'stages' => 'required|array',
            'stages.*' => 'required|integer|exists:workflow_stages,id'
        ]);

        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $user = Auth::user();
        $stageOrder = $request->input('stages');
        $this->workflowService->reorderWorkflowStages($workflow, $stageOrder, $user);

        return response()->json([
            'success' => true,
            'message' => 'Workflow stages reordered successfully'
        ]);
    }

    /**
     * Get transitions for a specific workflow with optional filtering.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function transitions(Request $request, int $id)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $filters = [
            'source_stage_id' => $request->input('source_stage_id'),
            'target_stage_id' => $request->input('target_stage_id'),
            'is_automatic' => $request->boolean('is_automatic', null)
        ];

        $transitions = $this->workflowService->getWorkflowTransitions($workflow, $filters);

        return response()->json([
            'success' => true,
            'data' => $transitions
        ]);
    }

    /**
     * Create a new workflow transition between stages.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeTransition(Request $request, int $id)
    {
        $request->validate([
            'source_stage_id' => 'required|integer|exists:workflow_stages,id',
            'target_stage_id' => 'required|integer|exists:workflow_stages,id|different:source_stage_id',
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'transition_conditions' => 'nullable|array',
            'required_permissions' => 'nullable|array',
            'is_automatic' => 'nullable|boolean'
        ]);

        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $stages = $this->workflowService->getWorkflowStages($workflow);
        $sourceStage = $stages->firstWhere('id', $request->input('source_stage_id'));
        $targetStage = $stages->firstWhere('id', $request->input('target_stage_id'));

        if (!$sourceStage || !$targetStage) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'STAGE_NOT_FOUND',
                    'message' => 'One or both stages not found in this workflow'
                ]
            ], 404);
        }

        $user = Auth::user();
        $transitionData = $request->only([
            'name',
            'description',
            'transition_conditions',
            'required_permissions',
            'is_automatic'
        ]);

        $transition = $this->workflowService->createWorkflowTransition($sourceStage, $targetStage, $transitionData, $user);

        return response()->json([
            'success' => true,
            'data' => $transition,
            'message' => 'Workflow transition created successfully'
        ], 201);
    }

    /**
     * Update an existing workflow transition.
     *
     * @param Request $request
     * @param int $id
     * @param int $transitionId
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateTransition(Request $request, int $id, int $transitionId)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'transition_conditions' => 'nullable|array',
            'required_permissions' => 'nullable|array',
            'is_automatic' => 'nullable|boolean'
        ]);

        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $transitions = $this->workflowService->getWorkflowTransitions($workflow);
        $transition = $transitions->firstWhere('id', $transitionId);

        if (!$transition) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TRANSITION_NOT_FOUND',
                    'message' => 'Transition not found in this workflow'
                ]
            ], 404);
        }

        $user = Auth::user();
        $transitionData = $request->only([
            'name',
            'description',
            'transition_conditions',
            'required_permissions',
            'is_automatic'
        ]);

        $updatedTransition = $this->workflowService->updateWorkflowTransition($transition, $transitionData, $user);

        return response()->json([
            'success' => true,
            'data' => $updatedTransition,
            'message' => 'Workflow transition updated successfully'
        ]);
    }

    /**
     * Delete a workflow transition.
     *
     * @param int $id
     * @param int $transitionId
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroyTransition(int $id, int $transitionId)
    {
        $workflow = $this->workflowService->getWorkflowById($id);

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'WORKFLOW_NOT_FOUND',
                    'message' => 'Workflow not found'
                ]
            ], 404);
        }

        $transitions = $this->workflowService->getWorkflowTransitions($workflow);
        $transition = $transitions->firstWhere('id', $transitionId);

        if (!$transition) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TRANSITION_NOT_FOUND',
                    'message' => 'Transition not found in this workflow'
                ]
            ], 404);
        }

        $user = Auth::user();
        $this->workflowService->deleteWorkflowTransition($transition, $user);

        return response()->json([
            'success' => true,
            'message' => 'Workflow transition deleted successfully'
        ]);
    }
}