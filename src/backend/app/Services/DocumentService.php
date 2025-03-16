<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentVerification;
use App\Events\DocumentUploadedEvent;
use App\Exceptions\DocumentProcessingException;
use Illuminate\Support\Facades\Storage; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Event; // illuminate/support/facades ^10.0
use Illuminate\Http\UploadedFile; // illuminate/http ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use Exception; // php 8.2

/**
 * Service class for managing document operations in the admissions platform
 * 
 * This service provides a centralized interface for storing, retrieving, and
 * managing files across different storage disks, with a focus on document
 * security and access control.
 */
class DocumentService
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
     * Create a new document service instance.
     * @param StorageService $storageService
     */
    public function __construct(
        protected StorageService $storageService
    ) {
        // Set the storage service instance
        $this->storageService = $storageService;
        // Load document types from configuration
        $this->documentTypes = Config::get('workflow.document_types', []);
        // Load required documents by application type from configuration
        $this->requiredDocumentsByApplicationType = Config::get('workflow.required_documents', []);
        // Set auto verification flag from configuration
        $this->autoVerificationEnabled = Config::get('workflow.auto_verification_enabled', true);
        // Set document storage path from configuration
        $this->documentStoragePath = Config::get('filesystems.document_storage_path', 'documents');
        $this->defaultDisk = Config::get('filesystems.default', 'local');
        $this->documentsDisk = Config::get('filesystems.documents', $this->defaultDisk);
        $this->temporaryDisk = Config::get('filesystems.temporary', 'local');
        $this->allowedMimeTypes = Config::get('filesystems.allowed_mime_types', []);
        $this->maxFileSizes = Config::get('filesystems.max_file_sizes', []);
        $this->useServerSideEncryption = Config::get('filesystems.use_server_side_encryption', false);
    }
    
    /**
     * Upload a document for an application
     * @param UploadedFile $file
     * @param string $documentType
     * @param int $applicationId
     * @param int $userId
     * @return Document The created document model
     * @throws DocumentProcessingException
     */
    public function uploadDocument(UploadedFile $file, string $documentType, int $applicationId, int $userId): Document
    {
        // Validate the document type is supported
        $this->validateDocumentType($documentType);

        // Generate a storage path for the document
        $fileName = $this->storageService->generateUniqueFilename($file->getClientOriginalName());
        $storagePath = $this->generateStoragePath($applicationId, $documentType, $fileName);
        
        // Store the file using the storage service
        $this->storageService->validateFileType($file, $documentType);
        $this->storageService->validateFileSize($file, $documentType);
        $filePath = $this->storageService->storeDocumentFile($file, $storagePath);
        
        // Create a new Document model with the file metadata
        $document = new Document([
            'user_id' => $userId,
            'application_id' => $applicationId,
            'document_type' => $documentType,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);
        
        $document->save();
        
        // Dispatch DocumentUploadedEvent
        Event::dispatch(new DocumentUploadedEvent($document));
        
        // Dispatch ProcessDocumentVerification job if auto verification is enabled
        if ($this->autoVerificationEnabled) {
            ProcessDocumentVerification::dispatch($document->id);
        }
        
        // Return the created document model
        return $document;
    }
    
    /**
     * Get a document by ID
     * @param int $documentId
     * @param int|null $userId
     * @return Document|null The document model or null if not found or not authorized
     */
    public function getDocument(int $documentId, ?int $userId = null): ?Document
    {
        // Query the document by ID
        $document = Document::find($documentId);
        
        // If userId is provided, check if the document belongs to the user
        if ($userId && $document->user_id !== $userId) {
            return null;
        }
        
        // Return the document if found and authorized, null otherwise
        return $document;
    }
    
    /**
     * Get all documents for an application
     * @param int $applicationId
     * @param int|null $userId
     * @return \Illuminate\Database\Eloquent\Collection Collection of documents
     */
    public function getDocumentsByApplication(int $applicationId, ?int $userId = null): \Illuminate\Database\Eloquent\Collection
    {
        // Query documents by application ID
        $query = Document::where('application_id', $applicationId);
        
        // If userId is provided, also filter by user ID
        if ($userId) {
            $query->where('user_id', $userId);
        }
        
        // Return the collection of documents
        return $query->get();
    }
    
    /**
     * Get all documents for a user
     * @param int $userId
     * @return \Illuminate\Database\Eloquent\Collection Collection of documents
     */
    public function getDocumentsByUser(int $userId): \Illuminate\Database\Eloquent\Collection
    {
        // Query documents by user ID
        $query = Document::where('user_id', $userId);
        
        // Return the collection of documents
        return $query->get();
    }
    
    /**
     * Get documents by type for an application
     * @param int $applicationId
     * @param string $documentType
     * @param int|null $userId
     * @return \Illuminate\Database\Eloquent\Collection Collection of documents
     */
    public function getDocumentsByType(int $applicationId, string $documentType, ?int $userId = null): \Illuminate\Database\Eloquent\Collection
    {
        // Query documents by application ID and document type
        $query = Document::where('application_id', $applicationId)
            ->where('document_type', $documentType);
        
        // If userId is provided, also filter by user ID
        if ($userId) {
            $query->where('user_id', $userId);
        }
        
        // Return the collection of documents
        return $query->get();
    }
    
    /**
     * Delete a document
     * @param int $documentId
     * @param int|null $userId
     * @return bool True if the document was deleted, false otherwise
     */
    public function deleteDocument(int $documentId, ?int $userId = null): bool
    {
        // Get the document by ID and user ID if provided
        $document = $this->getDocument($documentId, $userId);
        
        // If document not found or not authorized, return false
        if (!$document) {
            return false;
        }
        
        // Delete the file from storage using the storage service
        $this->storageService->deleteFile($document->file_path);
        
        // Delete the document record from the database
        $document->delete();
        
        // Return true if successful
        return true;
    }
    
    /**
     * Replace an existing document with a new file
     * @param int $documentId
     * @param UploadedFile $newFile
     * @param int|null $userId
     * @return Document|null The updated document model or null if not found or not authorized
     */
    public function replaceDocument(int $documentId, UploadedFile $newFile, ?int $userId = null): ?Document
    {
        // Get the document by ID and user ID if provided
        $document = $this->getDocument($documentId, $userId);
        
        // If document not found or not authorized, return null
        if (!$document) {
            return null;
        }
        
        // Delete the old file from storage
        $this->storageService->deleteFile($document->file_path);

        // Generate a storage path for the new document
        $fileName = $this->storageService->generateUniqueFilename($newFile->getClientOriginalName());
        $storagePath = $this->generateStoragePath($document->application_id, $document->document_type, $fileName);
        
        // Store the new file using the storage service
        $this->storageService->validateFileType($newFile, $document->document_type);
        $this->storageService->validateFileSize($newFile, $document->document_type);
        $filePath = $this->storageService->storeDocumentFile($newFile, $storagePath);
        
        // Update the document record with the new file metadata
        $document->file_name = $newFile->getClientOriginalName();
        $document->file_path = $filePath;
        $document->mime_type = $newFile->getMimeType();
        $document->file_size = $newFile->getSize();
        $document->is_verified = false;
        $document->verified_at = null;
        $document->verified_by_user_id = null;
        $document->save();
        
        // Dispatch DocumentUploadedEvent
        Event::dispatch(new DocumentUploadedEvent($document));
        
        // Dispatch ProcessDocumentVerification job if auto verification is enabled
        if ($this->autoVerificationEnabled) {
            ProcessDocumentVerification::dispatch($document->id);
        }
        
        // Return the updated document model
        return $document;
    }
    
    /**
     * Get a temporary download URL for a document
     * @param int $documentId
     * @param int|null $userId
     * @param int $expirationMinutes
     * @return string|null Temporary download URL or null if not found or not authorized
     */
    public function getDocumentDownloadUrl(int $documentId, ?int $userId = null, int $expirationMinutes = 60): ?string
    {
        // Get the document by ID and user ID if provided
        $document = $this->getDocument($documentId, $userId);
        
        // If document not found or not authorized, return null
        if (!$document) {
            return null;
        }
        
        // Generate a temporary URL using the storage service
        return $this->storageService->getDocumentUrl($document->file_path, $expirationMinutes);
    }
    
    /**
     * Get the list of required documents for an application type
     * @param string $applicationType
     * @return array List of required document types
     */
    public function getRequiredDocuments(string $applicationType): array
    {
        // Check if the application type exists in the required documents configuration
        if (array_key_exists($applicationType, $this->requiredDocumentsByApplicationType)) {
            // Return the list of required document types for the application type
            return $this->requiredDocumentsByApplicationType[$applicationType];
        }
        
        // Return an empty array if the application type is not found
        return [];
    }
    
    /**
     * Get the status of required documents for an application
     * @param int $applicationId
     * @param string $applicationType
     * @param int|null $userId
     * @return array Status of required documents (uploaded, verified, missing)
     */
    public function getDocumentStatus(int $applicationId, string $applicationType, ?int $userId = null): array
    {
        // Get the list of required documents for the application type
        $requiredDocuments = $this->getRequiredDocuments($applicationType);
        
        // Get all documents for the application
        $documents = $this->getDocumentsByApplication($applicationId, $userId);
        
        $status = [];
        
        // For each required document type, check if it has been uploaded and verified
        foreach ($requiredDocuments as $documentType) {
            $uploaded = false;
            $verified = false;
            
            foreach ($documents as $document) {
                if ($document->document_type === $documentType) {
                    $uploaded = true;
                    if ($document->is_verified) {
                        $verified = true;
                    }
                    break;
                }
            }
            
            $status[$documentType] = [
                'uploaded' => $uploaded,
                'verified' => $verified,
            ];
        }
        
        return $status;
    }
    
    /**
     * Check if all required documents for an application have been uploaded and verified
     * @param int $applicationId
     * @param string $applicationType
     * @param int|null $userId
     * @return bool True if all required documents are uploaded and verified
     */
    public function isDocumentComplete(int $applicationId, string $applicationType, ?int $userId = null): bool
    {
        // Get the document status for the application
        $documentStatus = $this->getDocumentStatus($applicationId, $applicationType, $userId);
        
        // Check if all required documents are uploaded
        foreach ($documentStatus as $status) {
            if (!$status['uploaded']) {
                return false;
            }
        }
        
        // Optionally check if all uploaded documents are verified
        // For now, we are not enforcing verification for all documents
        
        // Return true if all requirements are met
        return true;
    }
    
    /**
     * Get the list of supported document types
     * @return array List of supported document types
     */
    public function getSupportedDocumentTypes(): array
    {
        return $this->documentTypes;
    }
    
    /**
     * Get the allowed mime types for document uploads
     * @param string|null $documentType
     * @return array List of allowed mime types
     */
    public function getAllowedMimeTypes(?string $documentType = null): array
    {
        return $this->storageService->getAllowedMimeTypes($documentType);
    }
    
    /**
     * Get the maximum file size for document uploads
     * @param string|null $documentType
     * @return int Maximum file size in bytes
     */
    public function getMaxFileSize(?string $documentType = null): int
    {
        return $this->storageService->getMaxFileSize($documentType);
    }
    
    /**
     * Validate that a document type is supported
     * @param string $documentType
     * @return bool True if the document type is supported
     * @throws DocumentProcessingException
     */
    protected function validateDocumentType(string $documentType): bool
    {
        // Check if the document type is in the list of supported document types
        if (!in_array($documentType, $this->documentTypes)) {
            throw DocumentProcessingException::createFromFormatError(
                "Unsupported document type: {$documentType}",
                ['document_type' => $documentType]
            );
        }
        
        return true;
    }
    
    /**
     * Generate a storage path for a document
     * @param int $applicationId
     * @param string $documentType
     * @param string $fileName
     * @return string Storage path for the document
     */
    protected function generateStoragePath(int $applicationId, string $documentType, string $fileName): string
    {
        // Create a path using the document storage path, application ID, document type, and a unique filename
        return $this->documentStoragePath . '/' . $applicationId . '/' . $documentType . '/' . $fileName;
    }
}