<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller; // -- laravel/framework ^10.0
use Illuminate\Http\Request; // -- illuminate/http ^10.0
use Illuminate\Http\Response; // -- illuminate/http ^10.0
use Illuminate\Support\Facades\Auth; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // -- illuminate/support/facades ^10.0
use Exception; // -- php 8.2

use App\Services\ApplicationService; // src/backend/app/Services/ApplicationService.php
use App\Http\Resources\ApplicationResource; // src/backend/app/Http/Resources/ApplicationResource.php
use App\Http\Requests\ApplicationStoreRequest; // src/backend/app/Http/Requests/ApplicationStoreRequest.php
use App\Http\Requests\ApplicationUpdateRequest; // src/backend/app/Http/Requests/ApplicationUpdateRequest.php
use App\Http\Requests\ApplicationSubmitRequest; // src/backend/app/Http/Requests/ApplicationSubmitRequest.php
use App\Models\Application; // src/backend/app/Models/Application.php

/**
 * Controller for handling application-related API requests
 */
class ApplicationController extends Controller
{
    /**
     * @var ApplicationService
     */
    protected ApplicationService $applicationService;

    /**
     * Create a new ApplicationController instance
     * @param ApplicationService $applicationService
     */
    public function __construct(ApplicationService $applicationService)
    {
        // Inject the ApplicationService dependency
        $this->applicationService = $applicationService;
        // Assign the applicationService to the protected property
    }

    /**
     * Get a list of applications for the authenticated user
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with applications collection
     */
    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Extract filter parameters from the request (type, term, year, status)
        $filters = $request->only(['type', 'term', 'year', 'status']);

        // Call applicationService->getUserApplications with user ID and filters
        $applications = $this->applicationService->getUserApplications($userId, $filters);

        // Transform the applications using ApplicationResource collection
        $resource = ApplicationResource::collection($applications);

        // Return JSON response with the applications collection
        return response()->json($resource);
    }

    /**
     * Create a new application
     * @param ApplicationStoreRequest $request
     * @return \Illuminate\Http\JsonResponse JSON response with the created application
     */
    public function store(ApplicationStoreRequest $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Extract application data from the validated request (application_type, academic_term, academic_year, application_data)
        $applicationType = $request->input('application_type');
        $academicTerm = $request->input('academic_term');
        $academicYear = $request->input('academic_year');
        $applicationData = $request->input('application_data');

        // Call applicationService->createApplication with the extracted data
        $application = $this->applicationService->createApplication($userId, $applicationType, $academicTerm, $academicYear, $applicationData);

        // Transform the created application using ApplicationResource
        $resource = new ApplicationResource($application);

        // Return JSON response with the created application and 201 status code
        return response()->json($resource, Response::HTTP_CREATED);
    }

    /**
     * Get a specific application by ID
     * @param int $id
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with the application details
     */
    public function show(int $id, Request $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call applicationService->getApplication with the application ID and user ID
        $application = $this->applicationService->getApplication($id, $userId);

        // Return 404 if application not found
        if (!$application) {
            return response()->json(['message' => 'Application not found'], Response::HTTP_NOT_FOUND);
        }

        // Determine which relationships to include based on request parameters
        $resource = (new ApplicationResource($application));

        if ($request->query('include') === 'user') {
            $resource->withUser();
        }

        if ($request->query('include') === 'documents') {
            $resource->withDocuments();
        }

        if ($request->query('include') === 'statuses') {
            $resource->withStatuses();
        }

        // Transform the application using ApplicationResource with appropriate includes
        // Return JSON response with the application details
        return response()->json($resource);
    }

    /**
     * Update an existing application
     * @param ApplicationUpdateRequest $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with the updated application
     */
    public function update(ApplicationUpdateRequest $request, int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Extract application data from the validated request
        $applicationData = $request->input('application_data');

        // Call applicationService->updateApplication with the application ID, data, and user ID
        $application = $this->applicationService->updateApplication($id, $applicationData, $userId);

        // Return 404 if application not found
        if (!$application) {
            return response()->json(['message' => 'Application not found'], Response::HTTP_NOT_FOUND);
        }

        // Transform the updated application using ApplicationResource
        $resource = new ApplicationResource($application);

        // Return JSON response with the updated application
        return response()->json($resource);
    }

    /**
     * Submit an application for review
     * @param ApplicationSubmitRequest $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with submission result
     */
    public function submit(ApplicationSubmitRequest $request, int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call applicationService->submitApplication with the application ID and user ID
        $success = $this->applicationService->submitApplication($id, $userId);

        // Return appropriate error response if submission fails
        if (!$success) {
            return response()->json(['message' => 'Application submission failed. Please check for any errors.'], Response::HTTP_BAD_REQUEST);
        }

        // Get the updated application after submission
        $application = $this->applicationService->getApplication($id, $userId);

        // Transform the application using ApplicationResource
        $resource = new ApplicationResource($application);

        // Return JSON response with success message and the submitted application
        return response()->json(['message' => 'Application submitted successfully', 'application' => $resource]);
    }

    /**
     * Delete a draft application
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with deletion result
     */
    public function destroy(int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call applicationService->deleteApplication with the application ID and user ID
        $success = $this->applicationService->deleteApplication($id, $userId);

        // Return appropriate error response if deletion fails
        if (!$success) {
            return response()->json(['message' => 'Application deletion failed'], Response::HTTP_BAD_REQUEST);
        }

        // Return JSON response with success message
        return response()->json(['message' => 'Application deleted successfully']);
    }

    /**
     * Get a list of required documents for an application
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with required documents
     */
    public function requiredDocuments(int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call applicationService->getRequiredDocuments with the application ID and user ID
        $requiredDocuments = $this->applicationService->getRequiredDocuments($id, $userId);

        // Return 404 if application not found
        if (!$requiredDocuments) {
            return response()->json(['message' => 'Application not found'], Response::HTTP_NOT_FOUND);
        }

        // Return JSON response with the list of required documents
        return response()->json(['required_documents' => $requiredDocuments]);
    }

    /**
     * Get a list of missing documents for an application
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with missing documents
     */
    public function missingDocuments(int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call applicationService->getMissingDocuments with the application ID and user ID
        $missingDocuments = $this->applicationService->getMissingDocuments($id, $userId);

        // Return 404 if application not found
        if (!$missingDocuments) {
            return response()->json(['message' => 'Application not found'], Response::HTTP_NOT_FOUND);
        }

        // Return JSON response with the list of missing documents
        return response()->json(['missing_documents' => $missingDocuments]);
    }

    /**
     * Check if an application is complete with all required information and documents
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with completion status
     */
    public function checkComplete(int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call applicationService->checkApplicationComplete with the application ID and user ID
        $completionStatus = $this->applicationService->checkApplicationComplete($id, $userId);

        // Return 404 if application not found
        if (!$completionStatus) {
            return response()->json(['message' => 'Application not found'], Response::HTTP_NOT_FOUND);
        }

        // Return JSON response with completion status and any missing requirements
        return response()->json($completionStatus);
    }

    /**
     * Get the status timeline for an application
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with application timeline
     */
    public function timeline(int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call applicationService->getApplicationTimeline with the application ID and user ID
        $timeline = $this->applicationService->getApplicationTimeline($id, $userId);

        // Return 404 if application not found
        if (!$timeline) {
            return response()->json(['message' => 'Application not found'], Response::HTTP_NOT_FOUND);
        }

        // Transform the timeline data into a structured format
        $timelineData = $timeline->map(function ($status) {
            return [
                'status' => $status->status,
                'created_at' => $status->created_at->toIso8601String(),
                'notes' => $status->notes,
                'workflow_stage' => $status->workflowStage ? [
                    'id' => $status->workflowStage->id,
                    'name' => $status->workflowStage->name,
                ] : null,
            ];
        });

        // Return JSON response with the application timeline
        return response()->json(['timeline' => $timelineData]);
    }
}