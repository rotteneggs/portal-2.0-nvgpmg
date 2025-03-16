<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model; // Laravel ^10.0
use Illuminate\Database\Eloquent\Factories\HasFactory; // Laravel ^10.0
use Illuminate\Support\Facades\Storage; // Laravel ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use App\Models\User;
use App\Models\FinancialAidApplication;

class FinancialAidDocument extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'financial_aid_application_id',
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
     * Define the relationship between a financial aid document and its parent financial aid application.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function financialAidApplication()
    {
        return $this->belongsTo(FinancialAidApplication::class, 'financial_aid_application_id');
    }

    /**
     * Define the relationship to the user who verified the document.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }

    /**
     * Mark the document as verified.
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
     * Mark the document as rejected (not verified).
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
     * Generate a temporary URL for downloading the document.
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
     * Get the file extension from the file name.
     *
     * @return string
     */
    public function getFileExtension()
    {
        return strtolower(pathinfo($this->file_name, PATHINFO_EXTENSION));
    }

    /**
     * Check if the document is an image file.
     *
     * @return bool
     */
    public function isImage()
    {
        return strpos($this->mime_type, 'image/') === 0;
    }

    /**
     * Check if the document is a PDF file.
     *
     * @return bool
     */
    public function isPdf()
    {
        return $this->mime_type === 'application/pdf';
    }

    /**
     * Get the file size in a human-readable format.
     *
     * @return string
     */
    public function getFileSizeFormatted()
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Scope query to only include verified documents.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /**
     * Scope query to only include unverified documents.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeUnverified($query)
    {
        return $query->where('is_verified', false);
    }

    /**
     * Scope query to filter documents by type.
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
     * Scope query to filter documents by financial aid application.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $financialAidApplicationId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByApplication($query, int $financialAidApplicationId)
    {
        return $query->where('financial_aid_application_id', $financialAidApplicationId);
    }
}