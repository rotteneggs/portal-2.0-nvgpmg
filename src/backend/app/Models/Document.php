<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Illuminate\Support\Facades\Storage; // Laravel ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use App\Models\User;
use App\Models\DocumentVerification;

class Document extends Model
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
        'document_type',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'is_verified',
        'verified_at',
        'verified_by_user_id',
    ];
    
    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'file_size' => 'integer',
    ];
    
    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'verified_at',
        'created_at',
        'updated_at',
    ];
    
    /**
     * The relationships that should always be loaded.
     *
     * @var array
     */
    protected $with = [];
    
    /**
     * Define the relationship between a document and its owner (uploader)
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    /**
     * Define the relationship between a document and its associated application
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function application()
    {
        return $this->belongsTo(\App\Models\Application::class);
    }
    
    /**
     * Define the relationship to the user who verified the document
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }
    
    /**
     * Define the relationship to verification records for this document
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function verifications()
    {
        return $this->hasMany(DocumentVerification::class)->orderBy('created_at', 'desc');
    }
    
    /**
     * Define the relationship to the most recent verification record
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function latestVerification()
    {
        return $this->hasOne(DocumentVerification::class)->orderBy('created_at', 'desc');
    }
    
    /**
     * Mark the document as verified
     *
     * @param int $verifierId
     * @param string|null $notes
     * @return bool
     */
    public function verify(int $verifierId, ?string $notes = null)
    {
        $this->is_verified = true;
        $this->verified_at = now();
        $this->verified_by_user_id = $verifierId;
        
        return $this->save();
    }
    
    /**
     * Mark the document as rejected (not verified)
     *
     * @param int $verifierId
     * @return bool
     */
    public function reject(int $verifierId)
    {
        $this->is_verified = false;
        $this->verified_at = null;
        $this->verified_by_user_id = $verifierId;
        
        return $this->save();
    }
    
    /**
     * Generate a temporary URL for downloading the document
     *
     * @param int $expirationMinutes
     * @return string
     */
    public function getDownloadUrl(int $expirationMinutes = 60)
    {
        $expiration = Carbon::now()->addMinutes($expirationMinutes);
        
        return Storage::temporaryUrl($this->file_path, $expiration);
    }
    
    /**
     * Get the file extension from the file name
     *
     * @return string
     */
    public function getFileExtension()
    {
        return strtolower(pathinfo($this->file_name, PATHINFO_EXTENSION));
    }
    
    /**
     * Check if the document is an image file
     *
     * @return bool
     */
    public function isImage()
    {
        return strpos($this->mime_type, 'image/') === 0;
    }
    
    /**
     * Check if the document is a PDF file
     *
     * @return bool
     */
    public function isPdf()
    {
        return $this->mime_type === 'application/pdf';
    }
    
    /**
     * Get the file size in a human-readable format
     *
     * @return string
     */
    public function getFileSizeFormatted()
    {
        $bytes = $this->file_size;
        
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }
    
    /**
     * Scope query to only include verified documents
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }
    
    /**
     * Scope query to only include unverified documents
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeUnverified($query)
    {
        return $query->where('is_verified', false);
    }
    
    /**
     * Scope query to filter documents by type
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string|array $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByType($query, $type)
    {
        if (is_array($type)) {
            return $query->whereIn('document_type', $type);
        }
        
        return $query->where('document_type', $type);
    }
    
    /**
     * Scope query to filter documents by application
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
     * Scope query to filter documents by user
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}