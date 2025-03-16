<?php

namespace App\Services;

use App\Exceptions\DocumentProcessingException;
use Illuminate\Support\Facades\Storage; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Http\UploadedFile; // illuminate/http ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use Exception; // php 8.2

/**
 * Service class for handling file storage operations across the application.
 * 
 * This service provides a centralized interface for storing, retrieving, and
 * managing files across different storage disks, with a focus on document
 * security and access control.
 */
class StorageService
{
    /**
     * The default disk to use for file operations.
     */
    protected string $defaultDisk;
    
    /**
     * The disk to use for document storage.
     */
    protected string $documentsDisk;
    
    /**
     * The disk to use for temporary file storage.
     */
    protected string $temporaryDisk;
    
    /**
     * The allowed MIME types for different file categories.
     */
    protected array $allowedMimeTypes;
    
    /**
     * The maximum file sizes for different file categories.
     */
    protected array $maxFileSizes;
    
    /**
     * Whether to use server-side encryption for file storage.
     */
    protected bool $useServerSideEncryption;
    
    /**
     * Create a new storage service instance.
     */
    public function __construct()
    {
        $this->defaultDisk = Config::get('filesystems.default', 'local');
        $this->documentsDisk = Config::get('filesystems.documents', $this->defaultDisk);
        $this->temporaryDisk = Config::get('filesystems.temporary', 'local');
        $this->allowedMimeTypes = Config::get('filesystems.allowed_mime_types', []);
        $this->maxFileSizes = Config::get('filesystems.max_file_sizes', []);
        $this->useServerSideEncryption = Config::get('filesystems.use_server_side_encryption', false);
    }
    
    /**
     * Store a file in the specified disk.
     *
     * @param \Illuminate\Http\UploadedFile $file The file to store
     * @param string $path The path where to store the file
     * @param string|null $disk The disk to store the file in (null for default)
     * @param array $options Additional options for file storage
     * @return string The path where the file was stored
     * @throws \App\Exceptions\DocumentProcessingException If the file cannot be stored
     */
    public function storeFile(UploadedFile $file, string $path, ?string $disk = null, array $options = []): string
    {
        if ($file->getSize() === 0) {
            throw DocumentProcessingException::createFromFormatError(
                'The uploaded file is empty',
                ['filename' => $file->getClientOriginalName()]
            );
        }
        
        $disk = $disk ?? $this->defaultDisk;
        
        if ($this->useServerSideEncryption && !isset($options['ServerSideEncryption'])) {
            $options['ServerSideEncryption'] = 'AES256';
        }
        
        try {
            $storedPath = Storage::disk($disk)->putFileAs(
                dirname($path),
                $file,
                basename($path),
                $options
            );
            
            $this->logStorageOperation(
                'store',
                $storedPath,
                $disk,
                'File stored successfully. Size: ' . $file->getSize() . ' bytes'
            );
            
            return $storedPath;
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromStorageError(
                'Failed to store file: ' . $e->getMessage(),
                [
                    'filename' => $file->getClientOriginalName(),
                    'path' => $path,
                    'disk' => $disk
                ],
                $e
            );
        }
    }
    
    /**
     * Store a document file in the documents disk.
     *
     * @param \Illuminate\Http\UploadedFile $file The document file to store
     * @param string $path The path where to store the document
     * @param array $options Additional options for document storage
     * @return string The path where the document was stored
     * @throws \App\Exceptions\DocumentProcessingException If the document cannot be stored
     */
    public function storeDocumentFile(UploadedFile $file, string $path, array $options = []): string
    {
        return $this->storeFile($file, $path, $this->documentsDisk, $options);
    }
    
    /**
     * Store a file temporarily for processing.
     *
     * @param \Illuminate\Http\UploadedFile $file The file to store temporarily
     * @param string $path The path where to store the temporary file
     * @return string The path where the temporary file was stored
     * @throws \App\Exceptions\DocumentProcessingException If the file cannot be stored
     */
    public function storeTemporaryFile(UploadedFile $file, string $path): string
    {
        return $this->storeFile($file, $path, $this->temporaryDisk);
    }
    
    /**
     * Get the contents of a file.
     *
     * @param string $path The path to the file
     * @param string|null $disk The disk where the file is stored (null for default)
     * @return string|null The file contents or null if the file doesn't exist
     * @throws \App\Exceptions\DocumentProcessingException If the file cannot be retrieved
     */
    public function getFile(string $path, ?string $disk = null): ?string
    {
        $disk = $disk ?? $this->defaultDisk;
        
        try {
            if (!Storage::disk($disk)->exists($path)) {
                return null;
            }
            
            return Storage::disk($disk)->get($path);
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromAccessError(
                'Failed to retrieve file: ' . $e->getMessage(),
                [
                    'path' => $path,
                    'disk' => $disk
                ],
                $e
            );
        }
    }
    
    /**
     * Check if a file exists.
     *
     * @param string $path The path to the file
     * @param string|null $disk The disk where to check (null for default)
     * @return bool True if the file exists, false otherwise
     * @throws \App\Exceptions\DocumentProcessingException If the check fails
     */
    public function fileExists(string $path, ?string $disk = null): bool
    {
        $disk = $disk ?? $this->defaultDisk;
        
        try {
            return Storage::disk($disk)->exists($path);
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromAccessError(
                'Failed to check if file exists: ' . $e->getMessage(),
                [
                    'path' => $path,
                    'disk' => $disk
                ],
                $e
            );
        }
    }
    
    /**
     * Delete a file from storage.
     *
     * @param string $path The path to the file to delete
     * @param string|null $disk The disk where the file is stored (null for default)
     * @return bool True if the file was deleted, false otherwise
     * @throws \App\Exceptions\DocumentProcessingException If the deletion fails
     */
    public function deleteFile(string $path, ?string $disk = null): bool
    {
        $disk = $disk ?? $this->defaultDisk;
        
        try {
            if (!Storage::disk($disk)->exists($path)) {
                return false;
            }
            
            $deleted = Storage::disk($disk)->delete($path);
            
            if ($deleted) {
                $this->logStorageOperation('delete', $path, $disk, 'File deleted successfully');
            }
            
            return $deleted;
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromStorageError(
                'Failed to delete file: ' . $e->getMessage(),
                [
                    'path' => $path,
                    'disk' => $disk
                ],
                $e
            );
        }
    }
    
    /**
     * Generate a temporary URL for a file.
     *
     * @param string $path The path to the file
     * @param int $expirationMinutes The number of minutes until the URL expires
     * @param string|null $disk The disk where the file is stored (null for default)
     * @return string|null The temporary URL or null if the file doesn't exist or the disk doesn't support temporary URLs
     * @throws \App\Exceptions\DocumentProcessingException If generating the URL fails
     */
    public function getTemporaryUrl(string $path, int $expirationMinutes = 60, ?string $disk = null): ?string
    {
        $disk = $disk ?? $this->defaultDisk;
        
        try {
            if (!Storage::disk($disk)->exists($path)) {
                return null;
            }
            
            $expiration = Carbon::now()->addMinutes($expirationMinutes);
            
            try {
                return Storage::disk($disk)->temporaryUrl($path, $expiration);
            } catch (\League\Flysystem\UnableToGenerateTemporaryUrl $e) {
                // If the driver doesn't support temporary URLs, try to fall back to a signed URL or other method
                // For now, just rethrow as an access error
                throw DocumentProcessingException::createFromAccessError(
                    'The storage disk does not support temporary URLs',
                    [
                        'path' => $path,
                        'disk' => $disk
                    ],
                    $e
                );
            }
        } catch (Exception $e) {
            if ($e instanceof DocumentProcessingException) {
                throw $e;
            }
            
            throw DocumentProcessingException::createFromAccessError(
                'Failed to generate temporary URL: ' . $e->getMessage(),
                [
                    'path' => $path,
                    'disk' => $disk,
                    'expiration' => $expirationMinutes
                ],
                $e
            );
        }
    }
    
    /**
     * Generate a temporary URL for a document.
     *
     * @param string $path The path to the document
     * @param int $expirationMinutes The number of minutes until the URL expires
     * @return string|null The temporary URL for the document
     * @throws \App\Exceptions\DocumentProcessingException If generating the URL fails
     */
    public function getDocumentUrl(string $path, int $expirationMinutes = 60): ?string
    {
        return $this->getTemporaryUrl($path, $expirationMinutes, $this->documentsDisk);
    }
    
    /**
     * Move a file from one location to another.
     *
     * @param string $fromPath The current path of the file
     * @param string $toPath The destination path for the file
     * @param string|null $fromDisk The disk where the file is currently stored (null for default)
     * @param string|null $toDisk The disk where to move the file (null for default)
     * @return bool True if the file was moved successfully, false otherwise
     * @throws \App\Exceptions\DocumentProcessingException If the move operation fails
     */
    public function moveFile(string $fromPath, string $toPath, ?string $fromDisk = null, ?string $toDisk = null): bool
    {
        $fromDisk = $fromDisk ?? $this->defaultDisk;
        $toDisk = $toDisk ?? $this->defaultDisk;
        
        try {
            if (!Storage::disk($fromDisk)->exists($fromPath)) {
                return false;
            }
            
            // If the source and destination disks are the same, use the move method
            if ($fromDisk === $toDisk) {
                $moved = Storage::disk($fromDisk)->move($fromPath, $toPath);
                
                if ($moved) {
                    $this->logStorageOperation(
                        'move',
                        "$fromPath to $toPath",
                        $fromDisk,
                        'File moved successfully'
                    );
                }
                
                return $moved;
            }
            
            // If the disks are different, we need to copy the file and then delete the original
            $fileContents = Storage::disk($fromDisk)->get($fromPath);
            
            Storage::disk($toDisk)->put($toPath, $fileContents);
            Storage::disk($fromDisk)->delete($fromPath);
            
            $this->logStorageOperation(
                'move',
                "$fromPath ($fromDisk) to $toPath ($toDisk)",
                $toDisk,
                'File moved successfully across disks'
            );
            
            return true;
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromStorageError(
                'Failed to move file: ' . $e->getMessage(),
                [
                    'fromPath' => $fromPath,
                    'toPath' => $toPath,
                    'fromDisk' => $fromDisk,
                    'toDisk' => $toDisk
                ],
                $e
            );
        }
    }
    
    /**
     * Copy a file from one location to another.
     *
     * @param string $fromPath The current path of the file
     * @param string $toPath The destination path for the copy
     * @param string|null $fromDisk The disk where the file is currently stored (null for default)
     * @param string|null $toDisk The disk where to copy the file (null for default)
     * @return bool True if the file was copied successfully, false otherwise
     * @throws \App\Exceptions\DocumentProcessingException If the copy operation fails
     */
    public function copyFile(string $fromPath, string $toPath, ?string $fromDisk = null, ?string $toDisk = null): bool
    {
        $fromDisk = $fromDisk ?? $this->defaultDisk;
        $toDisk = $toDisk ?? $this->defaultDisk;
        
        try {
            if (!Storage::disk($fromDisk)->exists($fromPath)) {
                return false;
            }
            
            // If the source and destination disks are the same, use the copy method
            if ($fromDisk === $toDisk) {
                $copied = Storage::disk($fromDisk)->copy($fromPath, $toPath);
                
                if ($copied) {
                    $this->logStorageOperation(
                        'copy',
                        "$fromPath to $toPath",
                        $fromDisk,
                        'File copied successfully'
                    );
                }
                
                return $copied;
            }
            
            // If the disks are different, we need to get the file contents and store them in the new location
            $fileContents = Storage::disk($fromDisk)->get($fromPath);
            Storage::disk($toDisk)->put($toPath, $fileContents);
            
            $this->logStorageOperation(
                'copy',
                "$fromPath ($fromDisk) to $toPath ($toDisk)",
                $toDisk,
                'File copied successfully across disks'
            );
            
            return true;
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromStorageError(
                'Failed to copy file: ' . $e->getMessage(),
                [
                    'fromPath' => $fromPath,
                    'toPath' => $toPath,
                    'fromDisk' => $fromDisk,
                    'toDisk' => $toDisk
                ],
                $e
            );
        }
    }
    
    /**
     * Get the size of a file in bytes.
     *
     * @param string $path The path to the file
     * @param string|null $disk The disk where the file is stored (null for default)
     * @return int|null The file size in bytes or null if the file doesn't exist
     * @throws \App\Exceptions\DocumentProcessingException If getting the file size fails
     */
    public function getFileSize(string $path, ?string $disk = null): ?int
    {
        $disk = $disk ?? $this->defaultDisk;
        
        try {
            if (!Storage::disk($disk)->exists($path)) {
                return null;
            }
            
            return Storage::disk($disk)->size($path);
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromAccessError(
                'Failed to get file size: ' . $e->getMessage(),
                [
                    'path' => $path,
                    'disk' => $disk
                ],
                $e
            );
        }
    }
    
    /**
     * Get the MIME type of a file.
     *
     * @param string $path The path to the file
     * @param string|null $disk The disk where the file is stored (null for default)
     * @return string|null The MIME type or null if the file doesn't exist
     * @throws \App\Exceptions\DocumentProcessingException If getting the MIME type fails
     */
    public function getFileMimeType(string $path, ?string $disk = null): ?string
    {
        $disk = $disk ?? $this->defaultDisk;
        
        try {
            if (!Storage::disk($disk)->exists($path)) {
                return null;
            }
            
            return Storage::disk($disk)->mimeType($path);
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromAccessError(
                'Failed to get file MIME type: ' . $e->getMessage(),
                [
                    'path' => $path,
                    'disk' => $disk
                ],
                $e
            );
        }
    }
    
    /**
     * Get the last modified timestamp of a file.
     *
     * @param string $path The path to the file
     * @param string|null $disk The disk where the file is stored (null for default)
     * @return int|null The last modified timestamp or null if the file doesn't exist
     * @throws \App\Exceptions\DocumentProcessingException If getting the last modified timestamp fails
     */
    public function getFileLastModified(string $path, ?string $disk = null): ?int
    {
        $disk = $disk ?? $this->defaultDisk;
        
        try {
            if (!Storage::disk($disk)->exists($path)) {
                return null;
            }
            
            return Storage::disk($disk)->lastModified($path);
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromAccessError(
                'Failed to get file last modified timestamp: ' . $e->getMessage(),
                [
                    'path' => $path,
                    'disk' => $disk
                ],
                $e
            );
        }
    }
    
    /**
     * Get the allowed MIME types for a specific category.
     *
     * @param string|null $category The category of files (null for all categories)
     * @return array Array of allowed MIME types
     */
    public function getAllowedMimeTypes(?string $category = null): array
    {
        if ($category !== null && isset($this->allowedMimeTypes[$category])) {
            return $this->allowedMimeTypes[$category];
        }
        
        return $this->allowedMimeTypes;
    }
    
    /**
     * Get the maximum file size for a specific category in bytes.
     *
     * @param string|null $category The category of files (null for default maximum)
     * @return int Maximum file size in bytes
     */
    public function getMaxFileSize(?string $category = null): int
    {
        $defaultMaxSize = 10 * 1024 * 1024; // 10MB default
        
        if ($category !== null && isset($this->maxFileSizes[$category])) {
            return $this->maxFileSizes[$category] * 1024; // Convert KB to bytes
        }
        
        return $defaultMaxSize;
    }
    
    /**
     * Validate that a file's MIME type is allowed for a specific category.
     *
     * @param \Illuminate\Http\UploadedFile|string $file The file to validate (either UploadedFile object or path)
     * @param string $category The category to validate against
     * @return bool True if the file type is allowed, throws exception otherwise
     * @throws \App\Exceptions\DocumentProcessingException If the file type is not allowed
     */
    public function validateFileType($file, string $category): bool
    {
        $mimeType = null;
        $fileName = null;
        
        if ($file instanceof UploadedFile) {
            $mimeType = $file->getMimeType();
            $fileName = $file->getClientOriginalName();
        } else {
            $mimeType = $this->getFileMimeType($file);
            $fileName = basename($file);
        }
        
        $allowedTypes = $this->getAllowedMimeTypes($category);
        
        if (empty($allowedTypes) || in_array($mimeType, $allowedTypes)) {
            return true;
        }
        
        throw DocumentProcessingException::createFromFormatError(
            "File type not allowed for $category. Allowed types: " . implode(', ', $allowedTypes),
            [
                'filename' => $fileName,
                'mimeType' => $mimeType,
                'category' => $category,
                'allowedTypes' => $allowedTypes
            ]
        );
    }
    
    /**
     * Validate that a file's size is within the allowed limit for a specific category.
     *
     * @param \Illuminate\Http\UploadedFile|string $file The file to validate (either UploadedFile object or path)
     * @param string $category The category to validate against
     * @return bool True if the file size is allowed, throws exception otherwise
     * @throws \App\Exceptions\DocumentProcessingException If the file size exceeds the limit
     */
    public function validateFileSize($file, string $category): bool
    {
        $fileSize = null;
        $fileName = null;
        
        if ($file instanceof UploadedFile) {
            $fileSize = $file->getSize();
            $fileName = $file->getClientOriginalName();
        } else {
            $fileSize = $this->getFileSize($file);
            $fileName = basename($file);
        }
        
        $maxSize = $this->getMaxFileSize($category);
        
        if ($fileSize <= $maxSize) {
            return true;
        }
        
        throw DocumentProcessingException::createFromFormatError(
            "File size exceeds the maximum allowed for $category (" . ($maxSize / 1024 / 1024) . "MB)",
            [
                'filename' => $fileName,
                'fileSize' => $fileSize,
                'maxSize' => $maxSize,
                'category' => $category
            ]
        );
    }
    
    /**
     * Generate a unique filename to prevent collisions.
     *
     * @param string $originalFilename The original filename
     * @return string Unique filename with timestamp and random string
     */
    public function generateUniqueFilename(string $originalFilename): string
    {
        $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
        $timestamp = Carbon::now()->timestamp;
        $random = bin2hex(random_bytes(4)); // 8 character random string
        
        return $timestamp . '_' . $random . '.' . $extension;
    }
    
    /**
     * Sanitize a filename to remove invalid characters.
     *
     * @param string $filename The filename to sanitize
     * @return string Sanitized filename
     */
    public function sanitizeFilename(string $filename): string
    {
        // Remove directory traversal attempts
        $filename = basename($filename);
        
        // Remove any characters that could cause issues in filesystems
        $filename = preg_replace('/[^a-zA-Z0-9_\-.]/', '_', $filename);
        
        // Replace spaces with underscores
        $filename = str_replace(' ', '_', $filename);
        
        // Ensure the filename is not empty
        if (empty($filename)) {
            return 'file_' . Carbon::now()->timestamp;
        }
        
        return $filename;
    }
    
    /**
     * Get the public URL for a file (for publicly accessible files).
     *
     * @param string $path The path to the file
     * @param string|null $disk The disk where the file is stored (null for default)
     * @return string|null The public URL or null if the file doesn't exist or isn't public
     * @throws \App\Exceptions\DocumentProcessingException If getting the URL fails
     */
    public function getStorageUrl(string $path, ?string $disk = null): ?string
    {
        $disk = $disk ?? $this->defaultDisk;
        
        try {
            if (!Storage::disk($disk)->exists($path)) {
                return null;
            }
            
            return Storage::disk($disk)->url($path);
        } catch (Exception $e) {
            throw DocumentProcessingException::createFromAccessError(
                'Failed to get storage URL: ' . $e->getMessage(),
                [
                    'path' => $path,
                    'disk' => $disk
                ],
                $e
            );
        }
    }
    
    /**
     * Log a storage operation for auditing and debugging.
     *
     * @param string $operation The operation being performed (store, delete, etc.)
     * @param string $path The path to the file
     * @param string $disk The disk where the operation is performed
     * @param string|null $details Additional details about the operation
     * @return void
     */
    protected function logStorageOperation(string $operation, string $path, string $disk, ?string $details = null): void
    {
        $logData = [
            'timestamp' => Carbon::now()->toIso8601String(),
            'operation' => $operation,
            'path' => $path,
            'disk' => $disk
        ];
        
        if ($details) {
            $logData['details'] = $details;
        }
        
        Log::info('Storage operation: ' . $operation, $logData);
    }
}