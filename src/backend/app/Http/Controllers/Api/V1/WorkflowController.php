<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller; // Illuminate Routing, v10.0
use App\Http\Resources\WorkflowResource; // Path: src/backend/app/Http/Resources/WorkflowResource.php
use App\Models\Application; // Path: src/backend/app/Models/Application.php
use App\Models\Workflow; // Path: src/backend/app/Models/Workflow.php
use App\Services\WorkflowService; // Path: src/backend/app/Services/WorkflowService.php
use Illuminate\Http\JsonResponse; // Illuminate HTTP, v10.0
use Illuminate\Http\Request; // Illuminate HTTP, v10.0
use Illuminate\Http\Response; // Illuminate HTTP, v10.0
use Illuminate\Support\Facades\Auth; // Illuminate Support Facades, v10.0

/**
 * Controller responsible for handling API requests related to workflow operations
 * for non-administrative users in the Student Admissions Enrollment Platform.
 * This controller provides endpoints for retrieving workflow information and
 * application status transitions that are relevant to applicants and staff members
 * without administrative privileges.
 */
class WorkflowController extends Controller
{
    /**
     * @var WorkflowService
     */
    protected WorkflowService $workflowService;

    /**
     * WorkflowController constructor.
     *
     * @param WorkflowService $workflowService
     */
    public function __construct(WorkflowService $workflowService)
    {
        // Assign the workflow service to the protected property
        $this->workflowService = $workflowService;
    }

    /**
     * Get the active workflow for a specific application type.
     *
     * @param Request $request
     * @return JsonResponse JSON response with the active workflow
     */
    public function getActiveWorkflow(Request $request): JsonResponse
    {
        // Validate request parameters for 'application_type' (required, string)
        $validatedData = $request->validate([
            'application_type' => 'required|string',
        ]);

        // Get the application type from the request
        $applicationType = $validatedData['application_type'];

        // Call workflowService->getActiveWorkflowForType() with the application type
        $workflow = $this->workflowService->getActiveWorkflowForType($applicationType);

        // If no active workflow found, return 404 response
        if (!$workflow) {
            return response()->json(['message' => 'No active workflow found for this application type.'], 404);
        }

        // Transform the workflow using WorkflowResource with stages
        $transformedWorkflow = (new WorkflowResource($workflow))->withStages();

        // Return JSON response with the transformed workflow
        return response()->json($transformedWorkflow);
    }

    /**
     * Get the workflow associated with a specific application.
     *
     * @param int $applicationId
     * @return JsonResponse JSON response with the application's workflow
     */
    public function getApplicationWorkflow(int $applicationId): JsonResponse
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // If application not found, return 404 response
        if (!$application) {
            return response()->json(['message' => 'Application not found.'], 404);
        }

        // Authorize that the current user can view this application
        if (Auth::id() !== $application->user_id) {
            abort(403, 'Unauthorized action.');
        }

        // Get the application type from the application
        $applicationType = $application->application_type;

        // Call workflowService->getActiveWorkflowForType() with the application type
        $workflow = $this->workflowService->getActiveWorkflowForType($applicationType);

        // If no active workflow found, return 404 response
        if (!$workflow) {
            return response()->json(['message' => 'No active workflow found for this application type.'], 404);
        }

        // Transform the workflow using WorkflowResource with stages
        $transformedWorkflow = (new WorkflowResource($workflow))->withStages();

        // Return JSON response with the transformed workflow
        return response()->json($transformedWorkflow);
    }

    /**
     * Get all stages for a specific workflow.
     *
     * @param int $workflowId
     * @return JsonResponse JSON response with workflow stages
     */
    public function getWorkflowStages(int $workflowId): JsonResponse
    {
        // Call workflowService->getWorkflowById() with the workflow ID
        $workflow = $this->workflowService->getWorkflowById($workflowId);

        // If workflow not found, return 404 response
        if (!$workflow) {
            return response()->json(['message' => 'Workflow not found.'], 404);
        }

        // Call workflowService->getWorkflowStages() with the workflow
        $stages = $this->workflowService->getWorkflowStages($workflow);

        // Transform the stages using a resource collection
        $transformedStages = WorkflowResource::collection($stages);

        // Return JSON response with the transformed stages
        return response()->json($transformedStages);
    }

    /**
     * Get the current status and possible transitions for an application.
     *
     * @param int $applicationId
     * @return JsonResponse JSON response with application status information
     */
    public function getApplicationStatus(int $applicationId): JsonResponse
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // If application not found, return 404 response
        if (!$application) {
            return response()->json(['message' => 'Application not found.'], 404);
        }

        // Authorize that the current user can view this application
        if (Auth::id() !== $application->user_id) {
            abort(403, 'Unauthorized action.');
        }

        // Get the current application status
        $currentStatus = $application->currentStatus;

        // Get the workflow stage associated with the current status
        $workflowStage = $currentStatus->workflowStage;

        // Get possible transitions from the current stage
        $possibleTransitions = $workflowStage->outgoingTransitions;

        // Filter transitions based on user permissions
        $filteredTransitions = $possibleTransitions->filter(function ($transition) {
            return $transition->userHasPermission(Auth::user());
        });

        // Transform the data into a structured response
        $responseData = [
            'application_id' => $application->id,
            'status' => $currentStatus->status,
            'stage_name' => $workflowStage->name,
            'transitions' => $filteredTransitions->map(function ($transition) {
                return [
                    'id' => $transition->id,
                    'name' => $transition->name,
                    'target_stage_id' => $transition->target_stage_id,
                ];
            }),
        ];

        // Return JSON response with the status information
        return response()->json($responseData);
    }

    /**
     * Get transitions for a specific workflow with optional filtering.
     *
     * @param Request $request
     * @param int $workflowId
     * @return JsonResponse JSON response with workflow transitions
     */
    public function getWorkflowTransitions(Request $request, int $workflowId): JsonResponse
    {
        // Extract filter parameters from the request (source_stage_id, target_stage_id, is_automatic)
        $filters = $request->only(['source_stage_id', 'target_stage_id', 'is_automatic']);

        // Call workflowService->getWorkflowById() with the workflow ID
        $workflow = $this->workflowService->getWorkflowById($workflowId);

        // If workflow not found, return 404 response
        if (!$workflow) {
            return response()->json(['message' => 'Workflow not found.'], 404);
        }

        // Call workflowService->getWorkflowTransitions() with the workflow and filters
        $transitions = $this->workflowService->getWorkflowTransitions($workflow, $filters);

        // Transform the transitions using a resource collection
        $transformedTransitions = WorkflowResource::collection($transitions);

        // Return JSON response with the transformed transitions
        return response()->json($transformedTransitions);
    }
}