<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource; // Laravel ^10.0
use Illuminate\Support\Collection; // Laravel ^10.0
use App\Http\Resources\UserResource;
use App\Http\Resources\ApplicationResource;
use App\Models\Payment;

class PaymentResource extends JsonResource
{
    /**
     * Flag to determine if user data should be included
     *
     * @var bool
     */
    protected bool $includeUser = false;

    /**
     * Flag to determine if application data should be included
     *
     * @var bool
     */
    protected bool $includeApplication = false;

    /**
     * Flag to determine if payment_data should be included
     *
     * @var bool
     */
    protected bool $includePaymentData = false;

    /**
     * Create a new resource instance.
     *
     * @param  mixed  $resource
     * @return void
     */
    public function __construct($resource)
    {
        parent::__construct($resource);
        $this->includeUser = false;
        $this->includeApplication = false;
        $this->includePaymentData = false;
    }

    /**
     * Transform the Payment model into an array for API response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        /** @var Payment $payment */
        $payment = $this->resource;

        $data = [
            'id' => $payment->id,
            'payment_type' => $payment->payment_type,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'payment_method' => $payment->payment_method,
            'status' => $payment->status,
            'transaction_id' => $payment->transaction_id,
            'formatted_amount' => $payment->getFormattedAmount(),
            'status_label' => $payment->getStatusLabel(),
            'created_at' => $payment->created_at->toIso8601String(),
            'updated_at' => $payment->updated_at->toIso8601String(),
            'paid_at' => $payment->paid_at ? $payment->paid_at->toIso8601String() : null,
        ];

        // Include user data if requested
        if ($this->includeUser) {
            $user = $payment->relationLoaded('user') 
                ? $payment->user 
                : $payment->user()->first();
                
            if ($user) {
                $data['user'] = (new UserResource($user))->withProfile();
            }
        }

        // Include application data if requested
        if ($this->includeApplication) {
            $application = $payment->relationLoaded('application') 
                ? $payment->application 
                : $payment->application()->first();
                
            if ($application) {
                $data['application'] = new ApplicationResource($application);
            }
        }

        // Include payment_data if requested
        if ($this->includePaymentData && $payment->payment_data) {
            $data['payment_data'] = $payment->getPaymentData();
        }

        return $data;
    }

    /**
     * Add a method to include user data in the resource response.
     *
     * @return $this
     */
    public function withUser()
    {
        $this->includeUser = true;
        return $this;
    }

    /**
     * Add a method to include application data in the resource response.
     *
     * @return $this
     */
    public function withApplication()
    {
        $this->includeApplication = true;
        return $this;
    }

    /**
     * Add a method to include payment_data in the resource response.
     *
     * @return $this
     */
    public function withPaymentData()
    {
        $this->includePaymentData = true;
        return $this;
    }
}