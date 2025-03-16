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
class WorkflowEngineService
{
    /**
     * The workflow service instance.
     *
     * @var WorkflowService
     */
    protected WorkflowService $workflowService;

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
     * Initialize the workflow engine service with dependencies
     *
     * @param WorkflowService $workflowService
     * @param NotificationService $notificationService
     * @param AuditService $auditService
     * @return void
     */
    public function __construct(WorkflowService $workflowService, NotificationService $notificationService, AuditService $auditService)
    {
        // Assign the workflow service to the protected property
        $this->workflowService = $workflowService;
        // Assign the notification service to the protected property
        $this->notificationService = $notificationService;
        // Assign the audit service to the protected property
        $this->auditService = $auditService;
    }

    /**
     * Initialize a workflow for a newly submitted application
     *
     * @param Application $application
     * @param User $user
     * @return bool True if initialization was successful, false otherwise
     */
    public function initializeApplicationWorkflow(Application $application, User $user): bool
    {
        // Get the active workflow for the application's type using WorkflowService
        $workflow = $this->workflowService->getActiveWorkflowForType($application->application_type);

        // If no active workflow exists, log an error and return false
        if (!$workflow) {
            Log::error("No active workflow found for application type: {$application->application_type}", ['application_id' => $application->id]);
            return false;
        }

        // Get the initial stage of the workflow
        $initialStage = $workflow->getInitialStage();

        // Create a new ApplicationStatus record for the initial stage
        $applicationStatus = $this->createApplicationStatus($application, $initialStage, $user);

        // Update the application's current_status_id to the new status
        $application->updateStatus($applicationStatus->id);

        // Dispatch an ApplicationStatusChangedEvent
        Event::dispatch(new ApplicationStatusChangedEvent($application, $applicationStatus, null));

        // Log the workflow initialization in the audit log
        $this->logWorkflowAction(
            'initialize',
            'application',
            $application->id,
            $user,
            ['workflow_id' => $workflow->id, 'initial_stage_id' => $initialStage->id]
        );

        // Return true if successful
        return true;
    }

    /**
     * Process the completion of a workflow stage for an application
     *
     * @param Application $application
     * @param WorkflowStage $stage
     * @param User $user
     * @param array $completionData
     * @return bool True if the stage completion was processed successfully, false otherwise
     */
    public function processStageCompletion(Application $application, WorkflowStage $stage, User $user, array $completionData = []): bool
    {
        // Begin database transaction
        DB::beginTransaction();

        try {
            // Create a new ApplicationStatus record for the completed stage
            $applicationStatus = $this->createApplicationStatus($application, $stage, $user);

            // Update the application's current_status_id to the new status
            $application->updateStatus($applicationStatus->id);

            // Dispatch a WorkflowStageCompletedEvent with the application, stage, and completion data
            Event::dispatch(new WorkflowStageCompletedEvent($application, $stage, $applicationStatus, $completionData));

            // Check for automatic transitions from this stage
            $this->checkAutomaticTransitions($application);

            // Log the stage completion in the audit log
            $this->logWorkflowAction(
                'complete',
                'workflow_stage',
                $stage->id,
                $user,
                ['application_id' => $application->id, 'stage_name' => $stage->name, 'completion_data' => $completionData]
            );

            // Commit the transaction
            DB::commit();

            // Return true if successful
            return true;
        } catch (Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            Log::error("Failed to process stage completion for application {$application->id}, stage {$stage->id}: " . $e->getMessage(), [
                'application_id' => $application->id,
                'stage_id' => $stage->id,
                'user_id' => $user->id,
                'completion_data' => $completionData,
            ]);
            return false;
        }
    }

    /**
     * Execute a workflow transition for an application
     *
     * @param Application $application
     * @param WorkflowTransition $transition
     * @param User $user
     * @param array $transitionData
     * @return bool True if the transition was executed successfully, false otherwise
     */
    public function executeTransition(Application $application, WorkflowTransition $transition, User $user, array $transitionData = []): bool
    {
        // Verify that the transition is available for the application using isAvailableFor()
        if (!$transition->isAvailableFor($application)) {
            Log::warning("Transition {$transition->id} is not available for application {$application->id}");
            return false;
        }

        // Verify that the user has permission to execute the transition using userHasPermission()
        if (!$transition->userHasPermission($user)) {
            Log::warning("User {$user->id} does not have permission to execute transition {$transition->id}");
            return false;
        }

        // Begin database transaction
        DB::beginTransaction();

        try {
            // Get the target stage from the transition
            $targetStage = $transition->targetStage;

            // Create a new ApplicationStatus record for the target stage
            $applicationStatus = $this->createApplicationStatus($application, $targetStage, $user);

            // Update the application's current_status_id to the new status
            $application->updateStatus($applicationStatus->id);

            // Get the previous status for event dispatching
            $previousStatus = $application->currentStatus;

            // Dispatch an ApplicationStatusChangedEvent with the application, new status, and previous status
            Event::dispatch(new ApplicationStatusChangedEvent($application, $applicationStatus, $previousStatus));

            // Log the transition execution in the audit log
            $this->logWorkflowAction(
                'transition',
                'application',
                $application->id,
                $user,
                [
                    'transition_id' => $transition->id,
                    'source_stage_id' => $transition->source_stage_id,
                    'target_stage_id' => $transition->target_stage_id,
                ]
            );

            // Commit the transaction
            DB::commit();

            // Return true if successful
            return true;
        } catch (Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            Log::error("Failed to execute transition {$transition->id} for application {$application->id}: " . $e->getMessage(), [
                'application_id' => $application->id,
                'transition_id' => $transition->id,
                'user_id' => $user->id,
            ]);
            return false;
        }
    }

    /**
     * Get transitions available for an application from its current stage
     *
     * @param Application $application
     * @param User $user
     * @return \Illuminate\Support\Collection Collection of available transitions
     */
    public function getAvailableTransitions(Application $application, User $user): Collection
    {
        // Get the application's current status
        $currentStatus = $application->currentStatus;

        // If no current status exists, return an empty collection
        if (!$currentStatus) {
            return collect();
        }

        // Get the current workflow stage from the status
        $currentStage = $currentStatus->workflowStage;

        // Get all transitions from the current stage using getAvailableTransitions()
        $transitions = $currentStage->outgoingTransitions;

        // Filter transitions to only include those where the user has permission
        $availableTransitions = $transitions->filter(function ($transition) use ($application, $user) {
            return $transition->isAvailableFor($application) && $transition->userHasPermission($user);
        });

        // Return the filtered collection of transitions
        return $availableTransitions;
    }

    /**
     * Check and execute automatic transitions for an application if conditions are met
     *
     * @param Application $application
     * @return bool True if an automatic transition was executed, false otherwise
     */
    public function checkAutomaticTransitions(Application $application): bool
    {
        // Get the application's current status
        $currentStatus = $application->currentStatus;

        // If no current status exists, return false
        if (!$currentStatus) {
            return false;
        }

        // Get the current workflow stage from the status
        $currentStage = $currentStatus->workflowStage;

        // Get automatic transitions from the current stage using getAutomaticTransitions()
        $automaticTransitions = $currentStage->outgoingTransitions()->where('is_automatic', true)->get();

        // For each automatic transition, check if it's available for the application
        foreach ($automaticTransitions as $transition) {
            if ($transition->isAvailableFor($application)) {
                // Execute it with system user
                $systemUser = User::find(1); // Assuming system user has ID 1
                $this->executeTransition($application, $transition, $systemUser);
                return true;
            }
        }

        // Return false if no transition was executed
        return false;
    }

    /**
     * Get the current workflow stage for an application
     *
     * @param Application $application
     * @return WorkflowStage|null The current workflow stage or null if not found
     */
    public function getCurrentStage(Application $application): ?WorkflowStage
    {
        // Get the application's current status
        $currentStatus = $application->currentStatus;

        // If no current status exists, return null
        if (!$currentStatus) {
            return null;
        }

        // Return the workflow stage associated with the current status
        return $currentStatus->workflowStage;
    }

    /**
     * Get the status history for an application
     *
     * @param Application $application
     * @return \Illuminate\Support\Collection Collection of application status records
     */
    public function getApplicationStatusHistory(Application $application): Collection
    {
        // Query ApplicationStatus model
        $query = ApplicationStatus::query();

        // Filter by application_id
        $query->byApplication($application->id);

        // Order by created_at in descending order
        $query->latest();

        // Load relationships (workflowStage, createdBy)
        $query->with(['workflowStage', 'createdBy']);

        // Return the collection of status records
        return $query->get();
    }

    /**
     * Evaluate if an application meets all requirements for a workflow stage
     *
     * @param Application $application
     * @param WorkflowStage $stage
     * @return array Array with 'met' (boolean) and 'missing' (array of missing requirements)
     */
    public function evaluateStageRequirements(Application $application, WorkflowStage $stage): array
    {
        // Initialize results array with 'met' => true and 'missing' => []
        $results = [
            'met' => true,
            'missing' => [],
        ];

        // Check if the application has all required documents for the stage
        $requiredDocuments = $stage->getRequiredDocuments();
        $missingDocuments = array_diff($requiredDocuments, $application->documents->pluck('document_type')->toArray());

        // If documents are missing, add them to the missing requirements and set 'met' to false
        if (!empty($missingDocuments)) {
            $results['met'] = false;
            $results['missing']['documents'] = $missingDocuments;
        }

        // Check if all uploaded documents are verified
        if (!$application->hasVerifiedDocuments()) {
            $results['met'] = false;
            $results['missing']['verification'] = 'Some documents are not yet verified.';
        }

        // Check for any additional stage-specific requirements
        // (Placeholder for future implementation)

        // Return the results array
        return $results;
    }

    /**
     * Get possible next stages for an application based on available transitions
     *
     * @param Application $application
     * @param User $user
     * @return \Illuminate\Support\Collection Collection of possible next stages
     */
    public function getNextStages(Application $application, User $user): Collection
    {
        // Get available transitions for the application and user
        $availableTransitions = $this->getAvailableTransitions($application, $user);

        // Map the transitions to their target stages
        $nextStages = $availableTransitions->map(function ($transition) {
            return $transition->targetStage;
        });

        // Return the collection of target stages
        return $nextStages;
    }

    /**
     * Create a new application status record
     *
     * @param Application $application
     * @param WorkflowStage $stage
     * @param User $user
     * @param string|null $notes
     * @return ApplicationStatus The newly created application status
     */
    protected function createApplicationStatus(Application $application, WorkflowStage $stage, User $user, ?string $notes = null): ApplicationStatus
    {
        // Create a new ApplicationStatus instance
        $applicationStatus = new ApplicationStatus();

        // Set application_id, workflow_stage_id, status (from stage name), notes, and created_by_user_id
        $applicationStatus->application_id = $application->id;
        $applicationStatus->workflow_stage_id = $stage->id;
        $applicationStatus->status = $stage->name;
        $applicationStatus->notes = $notes;
        $applicationStatus->created_by_user_id = $user->id;

        // Save the application status
        $applicationStatus->save();

        // Return the created application status
        return $applicationStatus;
    }

    /**
     * Send notifications based on a workflow stage's notification triggers
     *
     * @param Application $application
     * @param WorkflowStage $stage
     * @param string $event
     * @return bool True if notifications were sent successfully, false otherwise
     */
    protected function sendStageNotifications(Application $application, WorkflowStage $stage, string $event): bool
    {
        // Get notification triggers for the stage
        $notificationTriggers = $stage->getNotificationTriggers();

        // Filter triggers to match the specified event
        $matchingTriggers = collect($notificationTriggers)->filter(function ($trigger) use ($event) {
            return $trigger['event'] === $event;
        });

        // For each matching trigger, determine the notification template and recipients
        foreach ($matchingTriggers as $trigger) {
            $templateKey = $trigger['template'];
            $recipients = $trigger['recipients'];

            // Prepare notification data with application and stage details
            $data = [
                'application_id' => $application->id,
                'application_type' => $application->application_type,
                'stage_name' => $stage->name,
            ];

            // Send notifications using the NotificationService
            if (in_array('applicant', $recipients)) {
                $this->notificationService->sendFromTemplate($application->user_id, $templateKey, $data);
            }

            if (in_array('staff', $recipients)) {
                // Implementation depends on specific staff notification requirements
                // Example: $this->notificationService->sendToStaff($templateKey, $data);
            }
        }

        // Return true if all notifications were sent successfully, false otherwise
        return true;
    }

    /**
     * Log a workflow action in the audit log
     *
     * @param string $action
     * @param string $resourceType
     * @param int $resourceId
     * @param User $user
     * @param array $additionalData
     * @return void
     */
    protected function logWorkflowAction(string $action, string $resourceType, int $resourceId, User $user, array $additionalData = []): void
    {
        // Prepare log data with application ID, stage ID (if provided), and additional data
        $logData = [
            'resource_id' => $resourceId,
            'user_id' => $user->id,
            'action' => $action,
            'resource_type' => $resourceType,
            'additional_data' => $additionalData,
        ];

        // Call the AuditService's log method with the action, 'workflow' as resource type, application ID, and log data
        $this->auditService->log(
            $action,
            $resourceType,
            $resourceId,
            $additionalData,
            [],
            $user
        );
    }
}