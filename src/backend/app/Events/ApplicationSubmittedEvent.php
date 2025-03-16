<?php

namespace App\Events;

use App\Models\Application;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ApplicationSubmittedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The application that was submitted.
     *
     * @var \App\Models\Application
     */
    public $application;

    /**
     * The broadcast channel name.
     *
     * @var string
     */
    private $broadcastChannel;

    /**
     * Create a new event instance.
     *
     * @param  \App\Models\Application  $application
     * @return void
     */
    public function __construct(Application $application)
    {
        $this->application = $application;
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
        return 'application.submitted';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array
     */
    public function broadcastWith()
    {
        return [
            'id' => $this->application->id,
            'application_type' => $this->application->application_type,
            'academic_term' => $this->application->academic_term,
            'academic_year' => $this->application->academic_year,
            'submitted_at' => $this->application->submitted_at,
        ];
    }
}