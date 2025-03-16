<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use Illuminate\Support\Collection; // Laravel ^10.0
use App\Models\User;

class FinancialAidApplication extends Model
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
        'aid_type',
        'financial_data',
        'status',
        'submitted_at',
        'reviewed_at',
        'reviewed_by_user_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'financial_data' => 'array',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'submitted_at',
        'reviewed_at',
        'created_at',
        'updated_at',
    ];

    /**
     * The relationships that should be eager loaded.
     *
     * @var array
     */
    protected $with = [
        'documents',
    ];

    /**
     * Define the relationship between a financial aid application and its user (applicant).
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Define the relationship between a financial aid application and its parent application.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function application()
    {
        return $this->belongsTo('App\Models\Application');
    }

    /**
     * Define the relationship between a financial aid application and its documents.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function documents()
    {
        return $this->hasMany('App\Models\FinancialAidDocument', 'financial_aid_application_id');
    }

    /**
     * Define the relationship between a financial aid application and the user who reviewed it.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    /**
     * Get the financial data as an array.
     *
     * @return array
     */
    public function getFinancialData()
    {
        return $this->financial_data;
    }

    /**
     * Set the financial data.
     *
     * @param array $data
     * @return void
     */
    public function setFinancialData(array $data)
    {
        $this->financial_data = $data;
    }

    /**
     * Submit the financial aid application for review.
     *
     * @return bool
     */
    public function submit()
    {
        if ($this->isSubmitted()) {
            return false;
        }

        $this->status = 'submitted';
        $this->submitted_at = now();
        
        return $this->save();
    }

    /**
     * Review the financial aid application and update its status.
     *
     * @param int $reviewerId
     * @param string $status
     * @param array|null $additionalData
     * @return bool
     */
    public function review(int $reviewerId, string $status, ?array $additionalData = null)
    {
        $validStatuses = ['approved', 'denied', 'additional_info_required'];
        
        if (!in_array($status, $validStatuses)) {
            return false;
        }
        
        $this->status = $status;
        $this->reviewed_at = now();
        $this->reviewed_by_user_id = $reviewerId;
        
        if ($additionalData) {
            $this->financial_data = array_merge($this->getFinancialData(), $additionalData);
        }
        
        return $this->save();
    }

    /**
     * Check if the financial aid application has been submitted.
     *
     * @return bool
     */
    public function isSubmitted()
    {
        return $this->status !== 'draft';
    }

    /**
     * Check if the financial aid application has been approved.
     *
     * @return bool
     */
    public function isApproved()
    {
        return $this->status === 'approved';
    }

    /**
     * Check if the financial aid application has been denied.
     *
     * @return bool
     */
    public function isDenied()
    {
        return $this->status === 'denied';
    }

    /**
     * Check if the financial aid application needs additional information.
     *
     * @return bool
     */
    public function needsMoreInfo()
    {
        return $this->status === 'additional_info_required';
    }

    /**
     * Get a list of required documents for this financial aid application based on aid type.
     *
     * @return array
     */
    public function getRequiredDocuments()
    {
        switch ($this->aid_type) {
            case 'need_based':
                return ['tax_return', 'financial_statement', 'fafsa_confirmation'];
            case 'merit_based':
                return ['transcript', 'achievement_evidence', 'recommendation_letter'];
            case 'scholarship':
                return ['essay', 'resume', 'recommendation_letter'];
            default:
                return [];
        }
    }

    /**
     * Get a list of required documents that have not been uploaded yet.
     *
     * @return array
     */
    public function getMissingDocuments()
    {
        $requiredDocuments = $this->getRequiredDocuments();
        $uploadedDocuments = $this->documents->pluck('document_type')->toArray();
        
        return array_diff($requiredDocuments, $uploadedDocuments);
    }

    /**
     * Check if the financial aid application is complete with all required documents.
     *
     * @return bool
     */
    public function isComplete()
    {
        return count($this->getMissingDocuments()) === 0;
    }

    /**
     * Check if all uploaded documents have been verified.
     *
     * @return bool
     */
    public function hasVerifiedDocuments()
    {
        if (!$this->relationLoaded('documents')) {
            $this->load('documents');
        }
        
        if ($this->documents->isEmpty()) {
            return false;
        }
        
        return $this->documents->every(function ($document) {
            return $document->is_verified;
        });
    }

    /**
     * Scope query to filter financial aid applications by user.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope query to filter financial aid applications by parent application.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $applicationId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByApplication($query, int $applicationId)
    {
        return $query->where('application_id', $applicationId);
    }

    /**
     * Scope query to filter financial aid applications by aid type.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|array $aidType
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByAidType($query, $aidType)
    {
        if (is_array($aidType)) {
            return $query->whereIn('aid_type', $aidType);
        }
        
        return $query->where('aid_type', $aidType);
    }

    /**
     * Scope query to filter financial aid applications by status.
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
     * Scope query to only include submitted financial aid applications.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSubmitted($query)
    {
        return $query->where('status', '!=', 'draft');
    }

    /**
     * Scope query to only include draft financial aid applications.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /**
     * Scope query to only include reviewed financial aid applications.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeReviewed($query)
    {
        return $query->whereNotNull('reviewed_at');
    }

    /**
     * Scope query to only include pending (submitted but not reviewed) financial aid applications.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePending($query)
    {
        return $query->where('status', 'submitted')->whereNull('reviewed_at');
    }

    /**
     * Scope query to only include complete financial aid applications (all required documents uploaded).
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeComplete($query)
    {
        // This is a complex scope that requires custom implementation to check document completeness
        // In a production environment, a more sophisticated approach would involve:
        // 1. Creating a specific database view or stored procedure for this query
        // 2. Using a subquery that compares available document types with required ones
        // 3. Implementing custom SQL to handle the dynamic nature of required documents
        
        // For this implementation, we'll pre-filter applications with documents
        // and rely on post-query filtering for complete verification
        return $query->has('documents')->with('documents');
    }

    /**
     * Scope query to filter financial aid applications by submission date range.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|\Carbon\Carbon $startDate
     * @param string|\Carbon\Carbon $endDate
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        if (!$startDate instanceof Carbon) {
            $startDate = Carbon::parse($startDate);
        }
        
        if (!$endDate instanceof Carbon) {
            $endDate = Carbon::parse($endDate);
        }
        
        return $query->whereBetween('submitted_at', [$startDate, $endDate]);
    }
}