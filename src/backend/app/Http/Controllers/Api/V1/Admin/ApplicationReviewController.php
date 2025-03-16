<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller; // illuminate/routing ^10.0
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Http\Response; // illuminate/http ^10.0
use Illuminate\Http\JsonResponse; // illuminate/http ^10.0
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\DB; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0

use App\Models\Application;
use App\Models\ApplicationStatus;
use App\Models\Note;
use App\Models\WorkflowStage;
use App\Http\Resources\ApplicationResource;
use App\Services\DocumentVerificationService;
use App\Services\WorkflowEngineService;
use App\Services\NotificationService;

/**
 * Controller responsible for handling administrative review of student applications in the admissions platform.
 * This controller provides endpoints for admissions staff to review, evaluate, and make decisions on submitted applications,
 * including document verification, status updates, and adding review notes.
 */
class ApplicationReviewController extends Controller
{
    /**
     * @var WorkflowEngineService
     */
    protected WorkflowEngineService $workflowEngineService;

    /**
     * @var DocumentVerificationService
     */
    protected DocumentVerificationService $documentVerificationService;

    /**
     * @var NotificationService
     */
    protected NotificationService $notificationService;

    /**
     * Create a new ApplicationReviewController instance
     *
     * @param WorkflowEngineService $workflowEngineService
     * @param DocumentVerificationService $documentVerificationService
     * @param NotificationService $notificationService
     * @return void
     */
    public function __construct(
        WorkflowEngineService $workflowEngineService,
        DocumentVerificationService $documentVerificationService,
        NotificationService $notificationService
    ) {
        // Inject the WorkflowEngineService dependency
        $this->workflowEngineService = $workflowEngineService;
        // Inject the DocumentVerificationService dependency
        $this->documentVerificationService = $documentVerificationService;
        // Inject the NotificationService dependency
        $this->notificationService = $notificationService;

        // Assign the services to the protected properties
    }

    /**
     * Get a list of applications pending review
     *
     * @param Request $request
     * @return JsonResponse JSON response with paginated applications pending review
     */
    public function index(Request $request): JsonResponse
    {
        // Extract filter parameters from request (status, type, term, year)
        $status = $request->input('status');
        $type = $request->input('type');
        $term = $request->input('term');
        $year = $request->input('year');

        // Query applications that are submitted and in review stages
        $applications = Application::submitted()
            ->byStatus($status ?? 'Under Review')
            ->when($type, function ($query, $type) {
                return $query->byType($type);
            })
            ->when($term && $year, function ($query) use ($term, $year) {
                return $query->byTerm($term, $year);
            });

        // Paginate the results
        $applications = $applications->paginate(15);

        // Transform the applications using ApplicationResource collection
        $resource = ApplicationResource::collection($applications);

        // Return a JSON response with the transformed data
        return response()->json($resource);
    }

    /**
     * Get detailed information about an application for review
     *
     * @param int $id
     * @return JsonResponse JSON response with detailed application information
     */
    public function show(int $id): JsonResponse
    {
        // Find the application by ID
        $application = Application::findOrFail($id);

        // Check if the application exists
        if (!$application) {
            return response()->json(['message' => 'Application not found'], 404);
        }

        // Get the current workflow stage using workflowEngineService->getCurrentStage()
        $currentStage = $this->workflowEngineService->getCurrentStage($application);

        // Get available transitions using workflowEngineService->getAvailableTransitions()
        $availableTransitions = $this->workflowEngineService->getAvailableTransitions($application, Auth::user());

        // Get application status history using workflowEngineService->getApplicationStatusHistory()
        $statusHistory = $this->workflowEngineService->getApplicationStatusHistory($application);

        // Evaluate stage requirements using workflowEngineService->evaluateStageRequirements()
        $stageRequirements = $this->workflowEngineService->evaluateStageRequirements($application, $currentStage);

        // Transform the application using ApplicationResource with user, documents, and statuses
        $resource = (new ApplicationResource($application))
            ->withUser()
            ->withDocuments()
            ->withStatuses();

        // Add workflow information to the response (current stage, available transitions, requirements)
        $data = $resource->toArray(request());
        $data['workflow'] = [
            'current_stage' => $currentStage ? [
                'id' => $currentStage->id,
                'name' => $currentStage->name,
            ] : null,
            'available_transitions' => $availableTransitions->map(function ($transition) {
                return [
                    'id' => $transition->id,
                    'name' => $transition->name,
                ];
            }),
            'stage_requirements' => $stageRequirements,
        ];

        // Return a JSON response with the combined data
        return response()->json($data);
    }

    /**
     * Update the status of an application by executing a workflow transition
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse JSON response with the updated application
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        // Find the application by ID
        $application = Application::findOrFail($id);

        // Check if the application exists
        if (!$application) {
            return response()->json(['message' => 'Application not found'], 404);
        }

        // Extract transition ID and notes from request
        $transitionId = $request->input('transition_id');
        $notes = $request->input('notes');

        // Get the transition from the workflow engine
        $transition = WorkflowTransition::findOrFail($transitionId);

        // Begin database transaction
        DB::beginTransaction();

        try {
            // Execute the transition using workflowEngineService->executeTransition()
            $success = $this->workflowEngineService->executeTransition($application, $transition, Auth::user(), ['notes' => $notes]);

            // If notes are provided, create a new Note record
            if ($notes) {
                $note = new Note([
                    'application_id' => $application->id,
                    'user_id' => Auth::id(),
                    'content' => $notes,
                    'is_internal' => true,
                ]);
                $note->save();
            }

            // Commit the transaction
            DB::commit();

            // Get the updated application with its new status
            $application = Application::findOrFail($id);

            // Transform the application using ApplicationResource
            $resource = new ApplicationResource($application);

            // Return a JSON response with the transformed data and success message
            return response()->json([
                'success' => true,
                'message' => 'Application status updated successfully',
                'data' => $resource,
            ]);
        } catch (\Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            Log::error('Failed to update application status: ' . $e->getMessage(), [
                'application_id' => $id,
                'transition_id' => $transitionId,
                'user_id' => Auth::id(),
            ]);
            return response()->json(['message' => 'Failed to update application status', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Add a review note to an application
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse JSON response with the created note
     */
    public function addNote(Request $request, int $id): JsonResponse
    {
        // Find the application by ID
        $application = Application::findOrFail($id);

        // Check if the application exists
        if (!$application) {
            return response()->json(['message' => 'Application not found'], 404);
        }

        // Extract note content and visibility (internal/external) from request
        $content = $request->input('content');
        $isInternal = $request->input('is_internal', true);

        // Create a new Note record with the application ID, user ID, content, and visibility
        $note = new Note([
            'application_id' => $application->id,
            'user_id' => Auth::id(),
            'content' => $content,
            'is_internal' => $isInternal,
        ]);

        // Save the note
        $note->save();

        // Return a JSON response with the created note and success message
        return response()->json([
            'success' => true,
            'message' => 'Note added successfully',
            'data' => $note,
        ]);
    }

    /**
     * Get review notes for an application
     *
     * @param int $id
     * @param Request $request
     * @return JsonResponse JSON response with application notes
     */
    public function getNotes(int $id, Request $request): JsonResponse
    {
        // Find the application by ID
        $application = Application::findOrFail($id);

        // Check if the application exists
        if (!$application) {
            return response()->json(['message' => 'Application not found'], 404);
        }

        // Extract filter parameters (internal/external) from request
        $isInternal = $request->input('is_internal');

        // Query notes for the application with appropriate filters
        $notes = $application->notes();
        if ($isInternal !== null) {
            $notes = $isInternal ? $notes->internal() : $notes->external();
        }

        // Order notes by created_at in descending order
        $notes = $notes->orderBy('created_at', 'desc')->get();

        // Return a JSON response with the notes
        return response()->json($notes);
    }

    /**
     * Manually verify or reject a document during application review
     *
     * @param Request $request
     * @param int $documentId
     * @return JsonResponse JSON response with the verification result
     */
    public function verifyDocument(Request $request, int $documentId): JsonResponse
    {
        // Extract verification decision (approve/reject) and notes from request
        $isVerified = $request->input('is_verified', false);
        $notes = $request->input('notes');

        // Get the authenticated user's ID
        $verifierId = Auth::id();

        try {
            // Call documentVerificationService->manuallyVerifyDocument() with the document ID, decision, notes, and user ID
            $verification = $this->documentVerificationService->manuallyVerifyDocument($documentId, $isVerified, $notes, $verifierId);

            // Return a JSON response with the verification result and appropriate message
            return response()->json([
                'success' => true,
                'message' => 'Document verification updated successfully',
                'data' => $verification,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to manually verify document: ' . $e->getMessage(), [
                'document_id' => $documentId,
                'user_id' => $verifierId,
            ]);
            return response()->json(['message' => 'Failed to verify document', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get a list of documents pending verification
     *
     * @param Request $request
     * @return JsonResponse JSON response with paginated documents pending verification
     */
    public function getPendingDocuments(Request $request): JsonResponse
    {
        // Extract filter parameters (document type) from request
        $documentType = $request->input('document_type');

        // Call documentVerificationService->getPendingVerifications() with filters
        $pendingDocuments = $this->documentVerificationService->getPendingVerifications($documentType);

        // Return a JSON response with the paginated pending documents
        return response()->json($pendingDocuments);
    }

    /**
     * Get the verification history for a document
     *
     * @param int $documentId
     * @return JsonResponse JSON response with document verification history
     */
    public function getDocumentVerificationHistory(int $documentId): JsonResponse
    {
        // Call documentVerificationService->getVerificationHistory() with the document ID
        $verificationHistory = $this->documentVerificationService->getVerificationHistory($documentId);

        // Return a JSON response with the verification history
        return response()->json($verificationHistory);
    }

    /**
     * Make a final decision on an application (accept/reject/waitlist)
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse JSON response with the decision result
     */
    public function makeDecision(Request $request, int $id): JsonResponse
    {
        // Find the application by ID
        $application = Application::findOrFail($id);

        // Check if the application exists
        if (!$application) {
            return response()->json(['message' => 'Application not found'], 404);
        }

        // Extract decision type (accept/reject/waitlist) and notes from request
        $decisionType = $request->input('decision_type');
        $notes = $request->input('notes');

        // Begin database transaction
        DB::beginTransaction();

        try {
            // Determine the appropriate workflow transition based on the decision
            $transitionName = null;
            switch ($decisionType) {
                case 'accept':
                    $transitionName = 'Accept Application';
                    break;
                case 'reject':
                    $transitionName = 'Reject Application';
                    break;
                case 'waitlist':
                    $transitionName = 'Waitlist Application';
                    break;
                default:
                    return response()->json(['message' => 'Invalid decision type'], 400);
            }

            // Find the transition
            $transition = WorkflowTransition::whereHas('sourceStage', function ($query) use ($application) {
                $query->where('workflow_id', $application->workflow_id);
            })->where('name', $transitionName)->firstOrFail();

            // Execute the transition using workflowEngineService->executeTransition()
            $success = $this->workflowEngineService->executeTransition($application, $transition, Auth::user(), ['notes' => $notes]);

            // Create a new Note record with the decision details
            $note = new Note([
                'application_id' => $application->id,
                'user_id' => Auth::id(),
                'content' => "Application {$decisionType}ed. Notes: {$notes}",
                'is_internal' => true,
            ]);
            $note->save();

            // Prepare notification data based on the decision
            $notificationData = [
                'decision_type' => $decisionType,
                'notes' => $notes,
            ];

            // Send notification to the applicant using notificationService->sendFromTemplate()
            $this->notificationService->sendFromTemplate($application->user_id, "application.decision.{$decisionType}", $notificationData);

            // Commit the transaction
            DB::commit();

            // Return a JSON response with the decision result and success message
            return response()->json([
                'success' => true,
                'message' => "Application {$decisionType}ed successfully",
            ]);
        } catch (\Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            Log::error('Failed to make decision on application: ' . $e->getMessage(), [
                'application_id' => $id,
                'decision_type' => $decisionType,
                'user_id' => Auth::id(),
            ]);
            return response()->json(['message' => 'Failed to make decision on application', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Request additional information from an applicant
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse JSON response with the request result
     */
    public function requestAdditionalInformation(Request $request, int $id): JsonResponse
    {
        // Find the application by ID
        $application = Application::findOrFail($id);

        // Check if the application exists
        if (!$application) {
            return response()->json(['message' => 'Application not found'], 404);
        }

        // Extract request details (information needed, deadline) from request
        $informationNeeded = $request->input('information_needed');
        $deadline = $request->input('deadline');

        // Begin database transaction
        DB::beginTransaction();

        try {
            // Find the 'Additional Information Requested' workflow transition
            $transition = WorkflowTransition::whereHas('sourceStage', function ($query) use ($application) {
                $query->where('workflow_id', $application->workflow_id);
            })->where('name', 'Additional Information Requested')->firstOrFail();

            // Execute the transition using workflowEngineService->executeTransition()
            $success = $this->workflowEngineService->executeTransition($application, $transition, Auth::user(), [
                'information_needed' => $informationNeeded,
                'deadline' => $deadline,
            ]);

            // Create a new Note record with the request details (set as external note)
            $note = new Note([
                'application_id' => $application->id,
                'user_id' => Auth::id(),
                'content' => "Additional information requested: {$informationNeeded}. Deadline: {$deadline}",
                'is_internal' => false,
            ]);
            $note->save();

            // Prepare notification data with the request details
            $notificationData = [
                'information_needed' => $informationNeeded,
                'deadline' => $deadline,
            ];

            // Send notification to the applicant using notificationService->sendFromTemplate()
            $this->notificationService->sendFromTemplate($application->user_id, 'application.additional_information_requested', $notificationData);

            // Commit the transaction
            DB::commit();

            // Return a JSON response with the request result and success message
            return response()->json([
                'success' => true,
                'message' => 'Additional information requested successfully',
            ]);
        } catch (\Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            Log::error('Failed to request additional information: ' . $e->getMessage(), [
                'application_id' => $id,
                'information_needed' => $informationNeeded,
                'deadline' => $deadline,
                'user_id' => Auth::id(),
            ]);
            return response()->json(['message' => 'Failed to request additional information', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Assign an application to committee review
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse JSON response with the assignment result
     */
    public function assignToCommittee(Request $request, int $id): JsonResponse
    {
        // Find the application by ID
        $application = Application::findOrFail($id);

        // Check if the application exists
        if (!$application) {
            return response()->json(['message' => 'Application not found'], 404);
        }

        // Extract committee details (committee name, review date) from request
        $committeeName = $request->input('committee_name');
        $reviewDate = $request->input('review_date');

        // Begin database transaction
        DB::beginTransaction();

        try {
            // Find the 'Committee Review' workflow transition
            $transition = WorkflowTransition::whereHas('sourceStage', function ($query) use ($application) {
                $query->where('workflow_id', $application->workflow_id);
            })->where('name', 'Committee Review')->firstOrFail();

            // Execute the transition using workflowEngineService->executeTransition()
            $success = $this->workflowEngineService->executeTransition($application, $transition, Auth::user(), [
                'committee_name' => $committeeName,
                'review_date' => $reviewDate,
            ]);

            // Create a new Note record with the committee assignment details
            $note = new Note([
                'application_id' => $application->id,
                'user_id' => Auth::id(),
                'content' => "Application assigned to {$committeeName} for review on {$reviewDate}",
                'is_internal' => true,
            ]);
            $note->save();

            // Commit the transaction
            DB::commit();

            // Return a JSON response with the assignment result and success message
            return response()->json([
                'success' => true,
                'message' => 'Application assigned to committee successfully',
            ]);
        } catch (\Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            Log::error('Failed to assign application to committee: ' . $e->getMessage(), [
                'application_id' => $id,
                'committee_name' => $committeeName,
                'review_date' => $reviewDate,
                'user_id' => Auth::id(),
            ]);
            return response()->json(['message' => 'Failed to assign application to committee', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get statistics about applications in the review process
     *
     * @param Request $request
     * @return JsonResponse JSON response with application statistics
     */
    public function getApplicationStatistics(Request $request): JsonResponse
    {
        // Extract filter parameters (date range, application type) from request
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $applicationType = $request->input('application_type');

        // Query applications with appropriate filters
        $applications = Application::query()
            ->when($applicationType, function ($query, $applicationType) {
                return $query->byType($applicationType);
            })
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->byDateRange($startDate, $endDate);
            })
            ->get();

        // Calculate statistics (total applications, by status, by type, average processing time)
        $totalApplications = $applications->count();
        $applicationsByStatus = $applications->groupBy('current_status_id')->map->count();
        $applicationsByType = $applications->groupBy('application_type')->map->count();

        // Calculate average processing time (example, adjust as needed)
        $averageProcessingTime = $applications->avg(function ($application) {
            if ($application->submitted_at && $application->currentStatus && $application->currentStatus->created_at) {
                return $application->currentStatus->created_at->diffInDays($application->submitted_at);
            }
            return 0;
        });

        // Return a JSON response with the calculated statistics
        return response()->json([
            'total_applications' => $totalApplications,
            'applications_by_status' => $applicationsByStatus,
            'applications_by_type' => $applicationsByType,
            'average_processing_time' => round($averageProcessingTime, 2),
        ]);
    }
}