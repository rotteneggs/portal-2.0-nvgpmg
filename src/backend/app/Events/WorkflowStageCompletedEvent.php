<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Broadcasting\PrivateChannel;
use App\Models\Application;
use App\Models\WorkflowStage;
use App\Models\ApplicationStatus;

class WorkflowStageCompletedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The application associated with the completed workflow stage.
     *
     * @var Application
     */
    public Application $application;

    /**
     * The workflow stage that has been completed.
     *
     * @var WorkflowStage
     */
    public WorkflowStage $completedStage;

    /**
     * The current status of the application.
     *
     * @var ApplicationStatus
     */
    public ApplicationStatus $applicationStatus;

    /**
     * Additional data about the completion.
     *
     * @var array
     */
    public array $completionData;

    /**
     * The channel to broadcast the event on.
     *
     * @var string
     */
    private string $broadcastChannel;

    /**
     * Create a new event instance.
     *
     * @param Application $application
     * @param WorkflowStage $completedStage
     * @param ApplicationStatus $applicationStatus
     * @param array $completionData
     * @return void
     */
    public function __construct(Application $application, WorkflowStage $completedStage, ApplicationStatus $applicationStatus, array $completionData = [])
    {
        $this->application = $application;
        $this->completedStage = $completedStage;
        $this->applicationStatus = $applicationStatus;
        $this->completionData = $completionData;
        $this->broadcastChannel = "application.{$application->id}";
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        return new PrivateChannel($this->broadcastChannel);
    }

    /**
     * The event name to broadcast.
     *
     * @return string
     */
    public function broadcastAs()
    {
        return 'workflow.stage.completed';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array
     */
    public function broadcastWith()
    {
        return [
            'application_id' => $this->application->id,
            'stage_id' => $this->completedStage->id,
            'stage_name' => $this->completedStage->name,
            'completed_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get a human-readable summary of the stage completion.
     *
     * @return string
     */
    public function getCompletionSummary()
    {
        $summary = "Stage {$this->completedStage->name} completed for application #{$this->application->id}";
        
        if (!empty($this->completionData)) {
            $summary .= " with additional data";
        }
        
        return $summary;
    }

    /**
     * Check if the completion data contains all required fields.
     *
     * @param array $requiredFields
     * @return bool
     */
    public function hasRequiredCompletionData(array $requiredFields)
    {
        foreach ($requiredFields as $field) {
            if (!array_key_exists($field, $this->completionData)) {
                return false;
            }
        }
        
        return true;
    }
}