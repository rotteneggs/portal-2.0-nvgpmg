<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model; // Laravel's Eloquent ORM base model class ^10.0
use Illuminate\Support\Facades\Storage; // Laravel facade for file storage operations ^10.0

class MessageAttachment extends Model
{
    use HasFactory; // Laravel trait for model factories ^10.0

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'message_id',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'file_size' => 'integer',
        'created_at' => 'datetime',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'formatted_file_size',
        'icon_class',
        'url',
    ];

    /**
     * Define the relationship between an attachment and its parent message.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function message()
    {
        return $this->belongsTo(\App\Models\Message::class);
    }

    /**
     * Get the URL for accessing the attachment.
     *
     * @return string
     */
    public function getUrl()
    {
        return Storage::url($this->file_path);
    }

    /**
     * Get a temporary download URL for the attachment.
     *
     * @param int $expirationMinutes Default expiration time of 60 minutes
     * @return string
     */
    public function getDownloadUrl($expirationMinutes = 60)
    {
        return Storage::temporaryUrl(
            $this->file_path,
            now()->addMinutes($expirationMinutes)
        );
    }

    /**
     * Get the file size in a human-readable format.
     *
     * @return string
     */
    public function getFileSize()
    {
        $bytes = $this->file_size;
        
        if ($bytes < 1024) {
            return $bytes . ' B';
        } elseif ($bytes < 1048576) {
            return round($bytes / 1024, 2) . ' KB';
        } elseif ($bytes < 1073741824) {
            return round($bytes / 1048576, 2) . ' MB';
        } else {
            return round($bytes / 1073741824, 2) . ' GB';
        }
    }

    /**
     * Get the appropriate icon class based on file type.
     *
     * @return string
     */
    public function getIconClass()
    {
        $mimeType = $this->mime_type;
        
        if (strpos($mimeType, 'image/') === 0) {
            return 'fa-file-image';
        } elseif (strpos($mimeType, 'application/pdf') === 0) {
            return 'fa-file-pdf';
        } elseif (strpos($mimeType, 'application/msword') === 0 || 
                  strpos($mimeType, 'application/vnd.openxmlformats-officedocument.wordprocessingml') === 0) {
            return 'fa-file-word';
        } elseif (strpos($mimeType, 'application/vnd.ms-excel') === 0 || 
                  strpos($mimeType, 'application/vnd.openxmlformats-officedocument.spreadsheetml') === 0) {
            return 'fa-file-excel';
        } elseif (strpos($mimeType, 'application/vnd.ms-powerpoint') === 0 || 
                  strpos($mimeType, 'application/vnd.openxmlformats-officedocument.presentationml') === 0) {
            return 'fa-file-powerpoint';
        } elseif (strpos($mimeType, 'text/') === 0) {
            return 'fa-file-alt';
        } elseif (strpos($mimeType, 'video/') === 0) {
            return 'fa-file-video';
        } elseif (strpos($mimeType, 'audio/') === 0) {
            return 'fa-file-audio';
        } elseif (strpos($mimeType, 'application/zip') === 0 || 
                  strpos($mimeType, 'application/x-rar') === 0 ||
                  strpos($mimeType, 'application/x-7z-compressed') === 0) {
            return 'fa-file-archive';
        } else {
            return 'fa-file';
        }
    }

    /**
     * Accessor for human-readable file size.
     *
     * @return string
     */
    public function getFormattedFileSizeAttribute()
    {
        return $this->getFileSize();
    }

    /**
     * Accessor for file type icon class.
     *
     * @return string
     */
    public function getIconClassAttribute()
    {
        return $this->getIconClass();
    }

    /**
     * Accessor for file URL.
     *
     * @return string
     */
    public function getUrlAttribute()
    {
        return $this->getUrl();
    }
}