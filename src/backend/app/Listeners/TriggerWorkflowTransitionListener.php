<?php

namespace App\Listeners;

use App\Events\WorkflowStageCompletedEvent; // Access the event data containing application and completed stage information
use App\Services\WorkflowEngineService; // Execute workflow transitions and evaluate transition conditions
use App\Models\Application; // Access application data for transition evaluation
use App\Models\WorkflowStage; // Access workflow stage data and available transitions
use App\Models\WorkflowTransition; // Evaluate transition conditions for applications
use App\Models\User; // Find system user for automatic transitions
use Illuminate\Support\Facades\Log; // Logging workflow transition activities and errors

/**
 * Listener that triggers workflow transitions when a workflow stage is completed
 */
class TriggerWorkflowTransitionListener
{
    /**
     * @var WorkflowEngineService
     */
    private WorkflowEngineService $workflowEngine;

    /**
     * @var int
     */
    private int $systemUserId = 1; // Assuming system user has ID 1

    /**
     * Create a new event listener instance
     *
     * @param WorkflowEngineService $workflowEngine
     * @return void
     */
    public function __construct(WorkflowEngineService $workflowEngine)
    {
        // Assign the workflow engine service to the private property
        $this->workflowEngine = $workflowEngine;
        // Set the system user ID to 1 (typically the admin/system user)
    }

    /**
     * Handle the event by evaluating and executing appropriate workflow transitions
     *
     * @param WorkflowStageCompletedEvent $event
     * @return void
     */
    public function handle(WorkflowStageCompletedEvent $event): void
    {
        // Extract the application from the event
        $application = $event->application;
        // Extract the completed stage from the event
        $completedStage = $event->completedStage;
        // Extract the completion data from the event
        $completionData = $event->completionData;

        // Log the stage completion event
        $this->logTransitionActivity("Workflow stage {$completedStage->name} completed for application {$application->id}", [
            'application_id' => $application->id,
            'stage_id' => $completedStage->id,
            'completion_data' => $completionData,
        ]);

        // Check for automatic transitions from the completed stage
        $transitions = $this->evaluateAutomaticTransitions($application, $completedStage, $completionData);

        // If automatic transitions exist, evaluate each transition
        if (!empty($transitions)) {
            // Execute the transitions
            $success = $this->executeTransitions($application, $transitions, $completionData);

            // Log the transition execution result
            if ($success) {
                $this->logTransitionActivity("Successfully executed at least one automatic transition for application {$application->id}", [
                    'application_id' => $application->id,
                    'stage_id' => $completedStage->id,
                ]);
            } else {
                $this->logTransitionActivity("No automatic transitions were executed for application {$application->id}", [
                    'application_id' => $application->id,
                    'stage_id' => $completedStage->id,
                ]);
            }
        }
    }

    /**
     * Evaluate automatic transitions from a completed stage for an application
     *
     * @param Application $application
     * @param WorkflowStage $completedStage
     * @param array $completionData
     * @return array Array of valid transitions
     */
    private function evaluateAutomaticTransitions(Application $application, WorkflowStage $completedStage, array $completionData): array
    {
        // Get automatic transitions from the completed stage
        $automaticTransitions = $completedStage->getAutomaticTransitions();
        // Initialize an array for valid transitions
        $validTransitions = [];

        // For each automatic transition, check if it's available for the application
        foreach ($automaticTransitions as $transition) {
            if ($transition->isAvailableFor($application)) {
                // If a transition is available, add it to the valid transitions array
                $validTransitions[] = $transition;
            }
        }

        // Return the array of valid transitions
        return $validTransitions;
    }

    /**
     * Execute workflow transitions for an application
     *
     * @param Application $application
     * @param array $transitions
     * @param array $completionData
     * @return bool True if at least one transition was executed successfully
     */
    private function executeTransitions(Application $application, array $transitions, array $completionData): bool
    {
        // Get the system user for automatic transitions
        $systemUser = $this->getSystemUser();

        // Initialize a success flag as false
        $success = false;

        // For each transition, attempt to execute it using the workflow engine
        foreach ($transitions as $transition) {
            if ($this->workflowEngine->executeTransition($application, $transition, $systemUser, $completionData)) {
                // If any transition executes successfully, set the success flag to true
                $success = true;
            }
        }

        // Return the success flag
        return $success;
    }

    /**
     * Get the system user for automatic transitions
     *
     * @return User The system user
     */
    private function getSystemUser(): User
    {
        // Find the user with the system user ID
        $systemUser = User::find($this->systemUserId);

        // If the user is not found, log an error
        if (!$systemUser) {
            Log::error("System user not found with ID {$this->systemUserId}");
        }

        // Return the system user
        return $systemUser;
    }

    /**
     * Log workflow transition activity
     *
     * @param string $message
     * @param array $context
     * @return void
     */
    private function logTransitionActivity(string $message, array $context): void
    {
        // Log the message with the provided context using the Log facade
        Log::info($message, $context);
        // No return value
    }
}