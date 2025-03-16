<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use App\Models\User;

class DocumentVerification extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'document_verifications';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'document_id',
        'verification_method',
        'verification_status',
        'verification_data',
        'confidence_score',
        'notes',
        'verified_by_user_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'verification_data' => 'array',
        'confidence_score' => 'float',
    ];

    /**
     * Verification method constants
     */
    public const METHOD_AI = 'ai';
    public const METHOD_MANUAL = 'manual';
    public const METHOD_EXTERNAL = 'external';
    public const METHODS = [self::METHOD_AI, self::METHOD_MANUAL, self::METHOD_EXTERNAL];

    /**
     * Verification status constants
     */
    public const STATUS_VERIFIED = 'verified';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_PENDING = 'pending';
    public const STATUSES = [self::STATUS_VERIFIED, self::STATUS_REJECTED, self::STATUS_PENDING];

    /**
     * Define the relationship between a verification record and its document
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function document()
    {
        return $this->belongsTo(\App\Models\Document::class);
    }

    /**
     * Define the relationship to the user who performed the verification
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }

    /**
     * Check if the verification status is 'verified'
     *
     * @return bool
     */
    public function isVerified()
    {
        return $this->verification_status === self::STATUS_VERIFIED;
    }

    /**
     * Check if the verification status is 'rejected'
     *
     * @return bool
     */
    public function isRejected()
    {
        return $this->verification_status === self::STATUS_REJECTED;
    }

    /**
     * Check if the verification status is 'pending'
     *
     * @return bool
     */
    public function isPending()
    {
        return $this->verification_status === self::STATUS_PENDING;
    }

    /**
     * Check if the verification method is AI
     *
     * @return bool
     */
    public function isAiVerification()
    {
        return $this->verification_method === self::METHOD_AI;
    }

    /**
     * Check if the verification method is manual
     *
     * @return bool
     */
    public function isManualVerification()
    {
        return $this->verification_method === self::METHOD_MANUAL;
    }

    /**
     * Check if the verification method is external
     *
     * @return bool
     */
    public function isExternalVerification()
    {
        return $this->verification_method === self::METHOD_EXTERNAL;
    }

    /**
     * Get the verification data as an array
     *
     * @return array
     */
    public function getVerificationDataAttribute($value)
    {
        return $value ? json_decode($value, true) : [];
    }

    /**
     * Get the confidence score as a percentage
     *
     * @return int
     */
    public function getConfidencePercentage()
    {
        return round($this->confidence_score * 100);
    }

    /**
     * Scope query to filter verification records by method
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $method
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByMethod($query, $method)
    {
        return $query->where('verification_method', $method);
    }

    /**
     * Scope query to filter verification records by status
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('verification_status', $status);
    }

    /**
     * Scope query to only include verified records
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeVerified($query)
    {
        return $query->where('verification_status', self::STATUS_VERIFIED);
    }

    /**
     * Scope query to only include rejected records
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeRejected($query)
    {
        return $query->where('verification_status', self::STATUS_REJECTED);
    }

    /**
     * Scope query to only include pending records
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePending($query)
    {
        return $query->where('verification_status', self::STATUS_PENDING);
    }

    /**
     * Scope query to filter verification records by document
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $documentId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByDocument($query, $documentId)
    {
        return $query->where('document_id', $documentId);
    }

    /**
     * Scope query to filter verification records by verifier
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $verifierId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByVerifier($query, $verifierId)
    {
        return $query->where('verified_by_user_id', $verifierId);
    }

    /**
     * Scope query to only include records with high confidence score
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param float $threshold
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeWithHighConfidence($query, $threshold = 0.8)
    {
        return $query->where('confidence_score', '>=', $threshold);
    }
}