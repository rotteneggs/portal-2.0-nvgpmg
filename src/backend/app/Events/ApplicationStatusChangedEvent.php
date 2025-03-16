<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Application;
use App\Models\ApplicationStatus;

class ApplicationStatusChangedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The application instance.
     *
     * @var \App\Models\Application
     */
    public $application;

    /**
     * The new application status.
     *
     * @var \App\Models\ApplicationStatus
     */
    public $newStatus;

    /**
     * The previous application status, if available.
     *
     * @var \App\Models\ApplicationStatus|null
     */
    public $previousStatus;

    /**
     * The channel to broadcast on.
     * 
     * @var string
     */
    private $broadcastChannel;

    /**
     * Create a new event instance.
     *
     * @param  \App\Models\Application  $application
     * @param  \App\Models\ApplicationStatus  $newStatus
     * @param  \App\Models\ApplicationStatus|null  $previousStatus
     * @return void
     */
    public function __construct(Application $application, ApplicationStatus $newStatus, ?ApplicationStatus $previousStatus = null)
    {
        $this->application = $application;
        $this->newStatus = $newStatus;
        $this->previousStatus = $previousStatus;
        $this->broadcastChannel = 'application.' . $application->id;
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
        return 'application.status.changed';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array
     */
    public function broadcastWith()
    {
        $data = [
            'application_id' => $this->application->id,
            'new_status' => $this->newStatus->status
        ];

        if ($this->previousStatus) {
            $data['previous_status'] = $this->previousStatus->status;
        }

        return $data;
    }

    /**
     * Get a human-readable description of the status change.
     *
     * @return string
     */
    public function getStatusChangeDescription()
    {
        $newStatusLabel = $this->application->getStatusLabel();
        
        if ($this->previousStatus) {
            $previousStatusLabel = $this->previousStatus->status;
            return "Status changed from {$previousStatusLabel} to {$newStatusLabel}";
        }
        
        return "Status set to {$newStatusLabel}";
    }
}