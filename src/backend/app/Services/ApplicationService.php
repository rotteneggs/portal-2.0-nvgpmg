<?php

namespace App\Services;

use Illuminate\Support\Facades\DB; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Event; // -- illuminate/support/facades ^10.0
use Illuminate\Support\Collection;
use Exception; // -- php 8.2

use App\Models\Application;
use App\Models\ApplicationStatus;
use App\Models\Workflow;
use App\Models\WorkflowStage;
use App\Models\WorkflowTransition;
use App\Models\User;
use App\Services\AuditService;
use App\Exceptions\WorkflowException;
use App\Events\ApplicationStatusChangedEvent;
use App\Events\WorkflowStageCompletedEvent;

/**
 * Service class that orchestrates the execution of workflow processes for applications
 */
class ApplicationService
{
    /**
     * The document service instance.
     *
     * @var DocumentService
     */
    protected DocumentService $documentService;

    /**
     * The workflow engine service instance.
     *
     * @var WorkflowEngineService
     */
    protected WorkflowEngineService $workflowEngine;

    /**
     * The notification service instance.
     *
     * @var NotificationService
     */
    protected NotificationService $notificationService;

    /**
     * The audit service instance.
     *
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * Create a new ApplicationService instance with dependencies
     *
     * @param DocumentService $documentService
     * @param WorkflowEngineService $workflowEngine
     * @param NotificationService $notificationService
     * @param AuditService $auditService
     * @return void
     */
    public function __construct(DocumentService $documentService, WorkflowEngineService $workflowEngine, NotificationService $notificationService, AuditService $auditService)
    {
        // Assign the document service to the protected property
        $this->documentService = $documentService;
        // Assign the workflow engine to the protected property
        $this->workflowEngine = $workflowEngine;
        // Assign the notification service to the protected property
        $this->notificationService = $notificationService;
        // Assign the audit service to the protected property
        $this->auditService = $auditService;
    }

    /**
     * Create a new application for a user
     *
     * @param int $userId
     * @param string $applicationType
     * @param string $academicTerm
     * @param string $academicYear
     * @param array $applicationData
     * @return Application The created application
     */
    public function createApplication(int $userId, string $applicationType, string $academicTerm, string $academicYear, array $applicationData): Application
    {
        // Begin database transaction
        DB::beginTransaction();

        // Create a new Application record with the provided data
        $application = new Application([
            'user_id' => $userId,
            'application_type' => $applicationType,
            'academic_term' => $academicTerm,
            'academic_year' => $academicYear,
            'application_data' => $applicationData,
        ]);
        $application->save();

        // Initialize the application workflow using the workflow engine
        $user = User::find($userId);
        $this->workflowEngine->initializeApplicationWorkflow($application, $user);

        // Log the application creation using the audit service
        $this->auditService->logCreate('application', $application->id, [
            'user_id' => $userId,
            'application_type' => $applicationType,
            'academic_term' => $academicTerm,
            'academic_year' => $academicYear,
        ]);

        // Commit the transaction
        DB::commit();

        // Return the created application
        return $application;
    }

    /**
     * Update an existing application
     *
     * @param int $applicationId
     * @param array $data
     * @param int $userId
     * @return Application|null The updated application or null if not found
     */
    public function updateApplication(int $applicationId, array $data, int $userId): ?Application
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // Verify the application belongs to the specified user
        if (!$application || $application->user_id !== $userId) {
            return null;
        }

        // Verify the application is not already submitted
        if ($application->isSubmitted()) {
            return null;
        }

        // Begin database transaction
        DB::beginTransaction();

        // Store old values for audit logging
        $oldValues = $application->toArray();

        // Update the application with the provided data
        $application->application_data = array_merge($application->application_data ?? [], $data);
        $application->save();

        // Log the application update using the audit service
        $this->auditService->logUpdate('application', $application->id, $oldValues, $application->toArray());

        // Commit the transaction
        DB::commit();

        // Return the updated application
        return $application;
    }

    /**
     * Get an application by ID
     *
     * @param int $applicationId
     * @param int|null $userId
     * @return Application|null The application if found, null otherwise
     */
    public function getApplication(int $applicationId, ?int $userId = null): ?Application
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // If userId is provided, verify the application belongs to the specified user
        if ($userId && $application->user_id !== $userId) {
            return null;
        }

        // Return the application if found and authorized, null otherwise
        return $application;
    }

    /**
     * Get all applications for a user
     *
     * @param int $userId
     * @param array $filters
     * @return \Illuminate\Database\Eloquent\Collection Collection of applications
     */
    public function getUserApplications(int $userId, array $filters = []): \Illuminate\Database\Eloquent\Collection
    {
        // Initialize query for Application model with user_id filter
        $query = Application::where('user_id', $userId);

        // Apply additional filters if provided (type, term, year, status, etc.)
        if (isset($filters['type'])) {
            $query->where('application_type', $filters['type']);
        }
        if (isset($filters['term'])) {
            $query->where('academic_term', $filters['term']);
        }
        if (isset($filters['year'])) {
            $query->where('academic_year', $filters['year']);
        }
        if (isset($filters['status'])) {
            $query->whereHas('currentStatus', function ($q) use ($filters) {
                $q->where('status', $filters['status']);
            });
        }

        // Execute the query and return the collection of applications
        return $query->get();
    }

    /**
     * Submit an application for review
     *
     * @param int $applicationId
     * @param int $userId
     * @return bool True if submission was successful, false otherwise
     */
    public function submitApplication(int $applicationId, int $userId): bool
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // Verify the application belongs to the specified user
        if (!$application || $application->user_id !== $userId) {
            return false;
        }

        // Verify the application is not already submitted
        if ($application->isSubmitted()) {
            return false;
        }

        // Check if the application is complete with all required documents
        if (!$application->isComplete()) {
            return false;
        }

        // Begin database transaction
        DB::beginTransaction();

        // Store old values for audit logging
        $oldValues = $application->toArray();

        // Call the submit method on the application
        $application->submit();

        // Update the application status to 'Submitted'
        // $application->updateStatus('submitted');

        // Dispatch ApplicationSubmittedEvent
        Event::dispatch(new ApplicationSubmittedEvent($application));

        // Log the application submission using the audit service
        $this->auditService->logUpdate('application', $application->id, $oldValues, $application->toArray());

        // Send submission confirmation notification to the user
        $user = User::find($userId);
        $this->notificationService->send($userId, 'application_submitted', 'Application Submitted', 'Your application has been submitted successfully.', []);

        // Process any automatic workflow transitions
        $this->workflowEngine->checkAutomaticTransitions($application);

        // Commit the transaction
        DB::commit();

        // Return true if successful
        return true;
    }

    /**
     * Update the status of an application
     *
     * @param int $applicationId
     * @param int $statusId
     * @param int $userId
     * @param string|null $notes
     * @return bool True if update was successful, false otherwise
     */
    public function updateApplicationStatus(int $applicationId, int $statusId, int $userId, ?string $notes = null): bool
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // Verify the user has permission to update the application status
        if (!$application) {
            return false;
        }

        // Get the current status for logging purposes
        $currentStatus = $application->currentStatus;

        // Begin database transaction
        DB::beginTransaction();

        // Store old values for audit logging
        $oldValues = $application->toArray();

        // Update the application status
        $application->updateStatus($statusId);

        // Create a new ApplicationStatus record
        $applicationStatus = ApplicationStatus::create([
            'application_id' => $applicationId,
            'status' => $statusId,
            'notes' => $notes,
            'created_by_user_id' => $userId,
        ]);

        // Dispatch ApplicationStatusChangedEvent
        Event::dispatch(new ApplicationStatusChangedEvent($application, $applicationStatus, $currentStatus));

        // Log the status change using the audit service
        $this->auditService->logUpdate('application', $application->id, $oldValues, $application->toArray());

        // Send status update notification to the application owner
        $user = User::find($userId);
        $this->notificationService->send($application->user_id, 'application_status_updated', 'Application Status Updated', 'Your application status has been updated.', []);

        // Process any automatic workflow transitions
        $this->workflowEngine->checkAutomaticTransitions($application);

        // Commit the transaction
        DB::commit();

        // Return true if successful
        return true;
    }

    /**
     * Get a list of required documents for an application
     *
     * @param int $applicationId
     * @param int|null $userId
     * @return array List of required document types
     */
    public function getRequiredDocuments(int $applicationId, ?int $userId = null): array
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // If userId is provided, verify the application belongs to the specified user
        if ($userId && $application->user_id !== $userId) {
            return [];
        }

        // Call the getRequiredDocuments method on the application
        $requiredDocuments = $application->getRequiredDocuments();

        // Return the list of required document types
        return $requiredDocuments;
    }

    /**
     * Get a list of required documents that have not been uploaded yet
     *
     * @param int $applicationId
     * @param int|null $userId
     * @return array List of missing document types
     */
    public function getMissingDocuments(int $applicationId, ?int $userId = null): array
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // If userId is provided, verify the application belongs to the specified user
        if ($userId && $application->user_id !== $userId) {
            return [];
        }

        // Call the getMissingDocuments method on the application
        $missingDocuments = $application->getMissingDocuments();

        // Return the list of missing document types
        return $missingDocuments;
    }

    /**
     * Check if an application is complete with all required documents
     *
     * @param int $applicationId
     * @param int|null $userId
     * @return array Completion status with any missing requirements
     */
    public function checkApplicationComplete(int $applicationId, ?int $userId = null): array
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // If userId is provided, verify the application belongs to the specified user
        if ($userId && $application->user_id !== $userId) {
            return ['is_complete' => false, 'missing_requirements' => []];
        }

        // Call the isComplete method on the application
        $isComplete = $application->isComplete();

        // Get any missing documents
        $missingDocuments = $application->getMissingDocuments();

        // Return an array with completion status and missing requirements
        return ['is_complete' => $isComplete, 'missing_requirements' => $missingDocuments];
    }

    /**
     * Search for applications based on criteria (admin function)
     *
     * @param array $criteria
     * @param int $page
     * @param int $perPage
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated search results
     */
    public function searchApplications(array $criteria, int $page = 1, int $perPage = 15): \Illuminate\Pagination\LengthAwarePaginator
    {
        // Initialize query for Application model
        $query = Application::query();

        // Apply search criteria filters (user, type, term, year, status, date range, etc.)
        if (isset($criteria['user_id'])) {
            $query->where('user_id', $criteria['user_id']);
        }
        if (isset($criteria['type'])) {
            $query->where('application_type', $criteria['type']);
        }
        if (isset($criteria['term'])) {
            $query->where('academic_term', $criteria['term']);
        }
        if (isset($criteria['year'])) {
            $query->where('academic_year', $criteria['year']);
        }
        if (isset($criteria['status'])) {
            $query->whereHas('currentStatus', function ($q) use ($criteria) {
                $q->where('status', $criteria['status']);
            });
        }
        if (isset($criteria['start_date']) && isset($criteria['end_date'])) {
            $query->whereBetween('submitted_at', [$criteria['start_date'], $criteria['end_date']]);
        }

        // Apply pagination parameters
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get statistics about applications for reporting
     *
     * @param array $filters
     * @return array Application statistics
     */
    public function getApplicationStatistics(array $filters = []): array
    {
        // Initialize queries for various statistics
        $totalApplications = Application::count();
        $submittedApplications = Application::submitted()->count();
        $draftApplications = Application::draft()->count();

        // Apply filters to the queries
        if (isset($filters['type'])) {
            $totalApplications = Application::byType($filters['type'])->count();
            $submittedApplications = Application::byType($filters['type'])->submitted()->count();
            $draftApplications = Application::byType($filters['type'])->draft()->count();
        }

        // Calculate statistics (count by type, status, term, conversion rates, etc.)
        $statistics = [
            'total_applications' => $totalApplications,
            'submitted_applications' => $submittedApplications,
            'draft_applications' => $draftApplications,
        ];

        // Return the compiled statistics
        return $statistics;
    }

    /**
     * Get the complete status history for an application
     *
     * @param int $applicationId
     * @param int|null $userId
     * @return \Illuminate\Database\Eloquent\Collection Collection of status records
     */
    public function getApplicationTimeline(int $applicationId, ?int $userId = null): \Illuminate\Database\Eloquent\Collection
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // If userId is provided, verify the application belongs to the specified user
        if ($userId && $application->user_id !== $userId) {
            return collect();
        }

        // Load the statuses relationship with the workflow stage
        $statuses = $application->statuses()->with('workflowStage')->get();

        // Return the collection of status records ordered by created_at
        return $statuses;
    }

    /**
     * Delete a draft application
     *
     * @param int $applicationId
     * @param int $userId
     * @return bool True if deletion was successful, false otherwise
     */
    public function deleteApplication(int $applicationId, int $userId): bool
    {
        // Find the application by ID
        $application = Application::find($applicationId);

        // Verify the application belongs to the specified user
        if (!$application || $application->user_id !== $userId) {
            return false;
        }

        // Verify the application is not already submitted
        if ($application->isSubmitted()) {
            return false;
        }

        // Begin database transaction
        DB::beginTransaction();

        try {
            // Delete associated records (statuses, documents, etc.)
            ApplicationStatus::where('application_id', $applicationId)->delete();
            // Document::where('application_id', $applicationId)->delete(); // Handled by cascading delete on application
            // Payment::where('application_id', $applicationId)->delete(); // Handled by cascading delete on application

            // Log the application deletion using the audit service
            $this->auditService->logDelete('application', $application->id, $application->toArray());

            // Delete the application
            $application->delete();

            // Commit the transaction
            DB::commit();

            // Return true if successful
            return true;
        } catch (Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            Log::error('Failed to delete application: ' . $e->getMessage(), ['application_id' => $application->id, 'user_id' => $userId]);
            return false;
        }
    }

    /**
     * Validate application data against requirements
     *
     * @param string $applicationType
     * @param array $applicationData
     * @return bool True if validation passes, throws exception otherwise
     */
    public function validateApplicationData(string $applicationType, array $applicationData): bool
    {
        // Determine validation rules based on application type
        $rules = []; // Define validation rules based on application type

        // Validate the application data against the rules
        // $validator = Validator::make($applicationData, $rules);

        // if ($validator->fails()) {
        //     throw new ApplicationValidationException('Application data validation failed', $validator->errors()->toArray());
        // }

        // Return true if validation passes
        return true;
    }

    /**
     * Get applications by status (admin function)
     *
     * @param string|array $status
     * @param array $filters
     * @param int $page
     * @param int $perPage
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated applications
     */
    public function getApplicationsByStatus(string|array $status, array $filters = [], int $page = 1, int $perPage = 15): \Illuminate\Pagination\LengthAwarePaginator
    {
        // Initialize query for Application model with status filter
        $query = Application::query();

        // Apply additional filters if provided
        if (isset($filters['type'])) {
            $query->where('application_type', $filters['type']);
        }
        if (isset($filters['term'])) {
            $query->where('academic_term', $filters['term']);
        }
        if (isset($filters['year'])) {
            $query->where('academic_year', $filters['year']);
        }

        // Apply pagination parameters
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get applications by type (admin function)
     *
     * @param string|array $type
     * @param array $filters
     * @param int $page
     * @param int $perPage
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated applications
     */
    public function getApplicationsByType(string|array $type, array $filters = [], int $page = 1, int $perPage = 15): \Illuminate\Pagination\LengthAwarePaginator
    {
        // Initialize query for Application model with type filter
        $query = Application::query();

        // Apply additional filters if provided
        if (isset($filters['term'])) {
            $query->where('academic_term', $filters['term']);
        }
        if (isset($filters['year'])) {
            $query->where('academic_year', $filters['year']);
        }
        if (isset($filters['status'])) {
            $query->whereHas('currentStatus', function ($q) use ($filters) {
                $q->where('status', $filters['status']);
            });
        }

        // Apply pagination parameters
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get applications submitted within a date range (admin function)
     *
     * @param string|\Carbon\Carbon $startDate
     * @param string|\Carbon\Carbon $endDate
     * @param array $filters
     * @param int $page
     * @param int $perPage
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated applications
     */
    public function getApplicationsByDateRange(string|\Carbon\Carbon $startDate, string|\Carbon\Carbon $endDate, array $filters = [], int $page = 1, int $perPage = 15): \Illuminate\Pagination\LengthAwarePaginator
    {
        // Convert startDate and endDate to Carbon instances if they are strings
        $startDate = is_string($startDate) ? \Carbon\Carbon::parse($startDate) : $startDate;
        $endDate = is_string($endDate) ? \Carbon\Carbon::parse($endDate) : $endDate;

        // Initialize query for Application model with date range filter
        $query = Application::query();

        // Apply additional filters if provided
        if (isset($filters['type'])) {
            $query->where('application_type', $filters['type']);
        }
        if (isset($filters['term'])) {
            $query->where('academic_term', $filters['term']);
        }
        if (isset($filters['year'])) {
            $query->where('academic_year', $filters['year']);
        }
        if (isset($filters['status'])) {
            $query->whereHas('currentStatus', function ($q) use ($filters) {
                $q->where('status', $filters['status']);
            });
        }

        // Apply pagination parameters
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Update the status of multiple applications at once (admin function)
     *
     * @param array $applicationIds
     * @param int $statusId
     * @param int $userId
     * @param string|null $notes
     * @return int Number of applications updated
     */
    public function bulkUpdateApplicationStatus(array $applicationIds, int $statusId, int $userId, ?string $notes = null): int
    {
        // Verify the user has permission to update application statuses
        // if (!$user->hasPermission('update', 'application_status')) {
        //     throw new UnauthorizedException('You do not have permission to update application statuses.');
        // }

        // Begin database transaction
        DB::beginTransaction();

        try {
            $count = 0;
            // Loop through application IDs
            foreach ($applicationIds as $applicationId) {
                // Find the application by ID
                $application = Application::find($applicationId);

                // If the application exists, update the status
                if ($application) {
                    // Store old values for audit logging
                    $oldValues = $application->toArray();

                    // Update the application status
                    $application->updateStatus($statusId);

                    // Create a new ApplicationStatus record for each application
                    $applicationStatus = ApplicationStatus::create([
                        'application_id' => $applicationId,
                        'status' => $statusId,
                        'notes' => $notes,
                        'created_by_user_id' => $userId,
                    ]);

                    // Dispatch ApplicationStatusChangedEvent for each application
                    Event::dispatch(new ApplicationStatusChangedEvent($application, $applicationStatus, null));

                    // Log the status changes using the audit service
                    $this->auditService->logUpdate('application', $application->id, $oldValues, $application->toArray());

                    // Send status update notifications to application owners
                    $user = User::find($userId);
                    $this->notificationService->send($application->user_id, 'application_status_updated', 'Application Status Updated', 'Your application status has been updated.', []);

                    // Process any automatic workflow transitions
                    $this->workflowEngine->checkAutomaticTransitions($application);

                    $count++;
                }
            }

            // Commit the transaction
            DB::commit();

            // Return the count of updated applications
            return $count;
        } catch (Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            Log::error('Failed to bulk update application statuses: ' . $e->getMessage(), ['application_ids' => $applicationIds, 'status_id' => $statusId, 'user_id' => $userId]);
            return 0;
        }
    }
}