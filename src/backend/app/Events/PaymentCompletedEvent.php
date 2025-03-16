<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable; // Laravel ^10.0
use Illuminate\Broadcasting\InteractsWithSockets; // Laravel ^10.0
use Illuminate\Queue\SerializesModels; // Laravel ^10.0
use Illuminate\Broadcasting\PrivateChannel;
use App\Models\Payment;

class PaymentCompletedEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The payment instance.
     *
     * @var Payment
     */
    public $payment;

    /**
     * Create a new event instance.
     *
     * @param  Payment  $payment
     * @return void
     */
    public function __construct(Payment $payment)
    {
        $this->payment = $payment;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        return new PrivateChannel('user.' . $this->payment->user_id);
    }
}