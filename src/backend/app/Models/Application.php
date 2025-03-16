<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use Illuminate\Support\Collection; // Laravel ^10.0
use App\Models\User;
use App\Models\ApplicationStatus;
use App\Models\Document;
use App\Models\Payment;
use App\Models\Note;
use App\Models\FinancialAidApplication;

class Application extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'application_type',
        'academic_term',
        'academic_year',
        'current_status_id',
        'application_data',
        'is_submitted',
        'submitted_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'application_data' => 'array',
        'is_submitted' => 'boolean',
        'submitted_at' => 'datetime',
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'submitted_at',
        'created_at',
        'updated_at',
    ];

    /**
     * The relationships that should be eager loaded.
     *
     * @var array
     */
    protected $with = [
        'currentStatus',
    ];

    /**
     * Define the relationship between an application and its user (applicant)
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Define the relationship to the current status of the application
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function currentStatus()
    {
        return $this->belongsTo(ApplicationStatus::class, 'current_status_id');
    }

    /**
     * Define the relationship to all status records for this application
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function statuses()
    {
        return $this->hasMany(ApplicationStatus::class)->orderBy('created_at', 'desc');
    }

    /**
     * Define the relationship to documents uploaded for this application
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    /**
     * Define the relationship to payments made for this application
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Define the relationship to notes added to this application
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function notes()
    {
        return $this->hasMany(Note::class);
    }

    /**
     * Define the relationship to financial aid applications for this application
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function financialAidApplications()
    {
        return $this->hasMany(FinancialAidApplication::class);
    }

    /**
     * Get the application data as an array
     *
     * @return array
     */
    public function getApplicationData()
    {
        return $this->application_data;
    }

    /**
     * Set the application data
     *
     * @param array $data
     * @return void
     */
    public function setApplicationData(array $data)
    {
        $this->application_data = $data;
    }

    /**
     * Submit the application for review
     *
     * @return bool
     */
    public function submit()
    {
        if ($this->is_submitted) {
            return false;
        }

        $this->is_submitted = true;
        $this->submitted_at = now();
        
        return $this->save();
    }

    /**
     * Update the application status
     *
     * @param int $statusId
     * @return bool
     */
    public function updateStatus(int $statusId)
    {
        $this->current_status_id = $statusId;
        
        return $this->save();
    }

    /**
     * Check if the application has been submitted
     *
     * @return bool
     */
    public function isSubmitted()
    {
        return $this->is_submitted;
    }

    /**
     * Get a list of required documents for this application based on application type
     *
     * @return array
     */
    public function getRequiredDocuments()
    {
        switch ($this->application_type) {
            case 'undergraduate':
                return ['transcript', 'personal_statement', 'recommendation_letter'];
            case 'graduate':
                return ['transcript', 'resume', 'research_statement', 'recommendation_letter'];
            case 'transfer':
                return ['transcript', 'transfer_form', 'recommendation_letter'];
            default:
                return [];
        }
    }

    /**
     * Get a list of required documents that have not been uploaded yet
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
     * Check if the application is complete with all required documents
     *
     * @return bool
     */
    public function isComplete()
    {
        return count($this->getMissingDocuments()) === 0;
    }

    /**
     * Check if all uploaded documents have been verified
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
     * Get a human-readable status label
     *
     * @return string
     */
    public function getStatusLabel()
    {
        if ($this->currentStatus) {
            return $this->currentStatus->status;
        }
        
        return $this->is_submitted ? 'Submitted' : 'Draft';
    }

    /**
     * Scope query to filter applications by user
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
     * Scope query to filter applications by type
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|array $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByType($query, $type)
    {
        if (is_array($type)) {
            return $query->whereIn('application_type', $type);
        }
        
        return $query->where('application_type', $type);
    }

    /**
     * Scope query to filter applications by academic term
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $term
     * @param string $year
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByTerm($query, $term, $year)
    {
        return $query->where('academic_term', $term)
                     ->where('academic_year', $year);
    }

    /**
     * Scope query to only include submitted applications
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSubmitted($query)
    {
        return $query->where('is_submitted', true);
    }

    /**
     * Scope query to only include draft (unsubmitted) applications
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDraft($query)
    {
        return $query->where('is_submitted', false);
    }

    /**
     * Scope query to filter applications by status
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|array $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByStatus($query, $status)
    {
        return $query->join('application_statuses', 'applications.current_status_id', '=', 'application_statuses.id')
                     ->when(is_array($status), function ($query) use ($status) {
                         return $query->whereIn('application_statuses.status', $status);
                     }, function ($query) use ($status) {
                         return $query->where('application_statuses.status', $status);
                     });
    }

    /**
     * Scope query to filter applications by submission date range
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|\Carbon\Carbon $startDate
     * @param string|\Carbon\Carbon $endDate
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        // Convert string dates to Carbon instances if necessary
        if (is_string($startDate)) {
            $startDate = Carbon::parse($startDate);
        }
        
        if (is_string($endDate)) {
            $endDate = Carbon::parse($endDate);
        }
        
        return $query->whereBetween('submitted_at', [$startDate, $endDate]);
    }

    /**
     * Scope query to only include complete applications (all required documents uploaded)
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeComplete($query)
    {
        // This is a complex scope that requires subqueries to check document completeness
        // Use whereHas with a closure to check that all required documents exist
        return $query->whereHas('documents', function ($query) {
            // Additional logic would need to be implemented here to verify all required documents exist
            // This is a placeholder implementation
        });
    }
}