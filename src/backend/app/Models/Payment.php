<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0

class Payment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'application_id',
        'payment_type',
        'amount',
        'currency',
        'payment_method',
        'transaction_id',
        'status',
        'payment_data',
        'paid_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'payment_data' => 'array',
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'paid_at',
        'created_at',
        'updated_at',
    ];

    /**
     * Define the relationship between a payment and its user.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Define the relationship between a payment and its associated application.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function application()
    {
        return $this->belongsTo('App\Models\Application');
    }

    /**
     * Get the payment data as an array.
     *
     * @return array
     */
    public function getPaymentData()
    {
        return $this->payment_data;
    }

    /**
     * Set the payment data.
     *
     * @param array $data
     * @return void
     */
    public function setPaymentData(array $data)
    {
        $this->payment_data = $data;
    }

    /**
     * Mark the payment as completed.
     *
     * @param string $transactionId
     * @param array|null $paymentData
     * @return bool
     */
    public function markAsCompleted(string $transactionId, ?array $paymentData = null)
    {
        $this->status = 'completed';
        $this->transaction_id = $transactionId;
        $this->paid_at = now();

        if ($paymentData) {
            // Merge new payment data with existing data
            if ($this->payment_data) {
                $this->payment_data = array_merge($this->payment_data, $paymentData);
            } else {
                $this->payment_data = $paymentData;
            }
        }

        return $this->save();
    }

    /**
     * Mark the payment as failed.
     *
     * @param array|null $errorData
     * @return bool
     */
    public function markAsFailed(?array $errorData = null)
    {
        $this->status = 'failed';

        if ($errorData) {
            // Store error data
            if ($this->payment_data) {
                $this->payment_data = array_merge($this->payment_data, ['error' => $errorData]);
            } else {
                $this->payment_data = ['error' => $errorData];
            }
        }

        return $this->save();
    }

    /**
     * Mark the payment as refunded.
     *
     * @param string|null $refundId
     * @param array|null $refundData
     * @return bool
     */
    public function markAsRefunded(?string $refundId = null, ?array $refundData = null)
    {
        $this->status = 'refunded';

        $refundInfo = array_filter([
            'refund_id' => $refundId,
            'refund_data' => $refundData,
            'refunded_at' => now()->toDateTimeString(),
        ]);

        if ($this->payment_data) {
            $this->payment_data = array_merge($this->payment_data, ['refund' => $refundInfo]);
        } else {
            $this->payment_data = ['refund' => $refundInfo];
        }

        return $this->save();
    }

    /**
     * Check if the payment is completed.
     *
     * @return bool
     */
    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    /**
     * Check if the payment is pending.
     *
     * @return bool
     */
    public function isPending()
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the payment has failed.
     *
     * @return bool
     */
    public function isFailed()
    {
        return $this->status === 'failed';
    }

    /**
     * Check if the payment has been refunded.
     *
     * @return bool
     */
    public function isRefunded()
    {
        return $this->status === 'refunded';
    }

    /**
     * Get the formatted amount with currency symbol.
     *
     * @return string
     */
    public function getFormattedAmount()
    {
        $currencySymbols = [
            'USD' => '$',
            'EUR' => '€',
            'GBP' => '£',
            'CAD' => 'C$',
            'AUD' => 'A$',
            'JPY' => '¥',
            'CNY' => '¥',
            'INR' => '₹',
        ];

        $symbol = $currencySymbols[$this->currency] ?? $this->currency;
        return $symbol . number_format((float) $this->amount, 2);
    }

    /**
     * Get a human-readable status label.
     *
     * @return string
     */
    public function getStatusLabel()
    {
        $statusLabels = [
            'pending' => 'Pending',
            'completed' => 'Completed',
            'failed' => 'Failed',
            'refunded' => 'Refunded',
        ];

        return $statusLabels[$this->status] ?? ucfirst($this->status);
    }

    /**
     * Scope query to filter payments by user.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope query to filter payments by application.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $applicationId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByApplication($query, $applicationId)
    {
        return $query->where('application_id', $applicationId);
    }

    /**
     * Scope query to filter payments by type.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|array $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByType($query, $type)
    {
        if (is_array($type)) {
            return $query->whereIn('payment_type', $type);
        }

        return $query->where('payment_type', $type);
    }

    /**
     * Scope query to filter payments by status.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|array $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByStatus($query, $status)
    {
        if (is_array($status)) {
            return $query->whereIn('status', $status);
        }

        return $query->where('status', $status);
    }

    /**
     * Scope query to filter payments by date range.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|\Carbon\Carbon $startDate
     * @param string|\Carbon\Carbon $endDate
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        if (is_string($startDate)) {
            $startDate = Carbon::parse($startDate);
        }

        if (is_string($endDate)) {
            $endDate = Carbon::parse($endDate);
        }

        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope query to only include completed payments.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope query to only include pending payments.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope query to only include failed payments.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope query to only include refunded payments.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeRefunded($query)
    {
        return $query->where('status', 'refunded');
    }
}