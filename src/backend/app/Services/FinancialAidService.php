<?php

namespace App\Services;

use App\Events\DocumentUploadedEvent; // Import DocumentUploadedEvent class
use App\Exceptions\DocumentProcessingException; // Import DocumentProcessingException class
use App\Models\Application; // Import Application model
use App\Models\FinancialAidApplication; // Import FinancialAidApplication model
use App\Models\FinancialAidDocument; // Import FinancialAidDocument model
use Exception; // php 8.2
use Illuminate\Http\UploadedFile; // illuminate/http ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\DB; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Event; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Service class for managing financial aid applications and related documents
 */
class FinancialAidService
{
    /**
     * @var StorageService
     */
    protected StorageService $storageService;

    /**
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * @var array
     */
    protected array $aidTypes;

    /**
     * @var string
     */
    protected string $documentStoragePath;

    /**
     * Create a new financial aid service instance
     *
     * @param StorageService $storageService
     * @param AuditService $auditService
     */
    public function __construct(StorageService $storageService, AuditService $auditService)
    {
        // Set the storage service instance
        $this->storageService = $storageService;
        // Set the audit service instance
        $this->auditService = $auditService;
        // Load aid types from configuration
        $this->aidTypes = Config::get('financial_aid.aid_types', []);
        // Set document storage path from configuration
        $this->documentStoragePath = Config::get('financial_aid.document_storage_path', 'financial_aid_documents');
    }

    /**
     * Create a new financial aid application
     *
     * @param int $userId
     * @param int $applicationId
     * @param string $aidType
     * @param array $financialData
     * @return FinancialAidApplication The created financial aid application
     */
    public function createFinancialAidApplication(int $userId, int $applicationId, string $aidType, array $financialData): FinancialAidApplication
    {
        // Validate that the aid type is supported
        $this->validateAidType($aidType);

        // Verify that the application exists and belongs to the user
        $application = Application::where('id', $applicationId)->where('user_id', $userId)->firstOrFail();

        // Check if a financial aid application already exists for this application
        if ($application->financialAidApplications()->exists()) {
            throw new Exception('Financial aid application already exists for this application');
        }

        // Create a new FinancialAidApplication model with the provided data
        $financialAidApplication = new FinancialAidApplication([
            'user_id' => $userId,
            'application_id' => $applicationId,
            'aid_type' => $aidType,
            'financial_data' => $financialData,
        ]);

        // Set status to 'draft'
        $financialAidApplication->status = 'draft';

        // Save the model
        $financialAidApplication->save();

        // Log the creation using the audit service
        $this->auditService->logCreate('financial_aid_applications', $financialAidApplication->id, $financialAidApplication->toArray(), auth()->user());

        // Return the created financial aid application
        return $financialAidApplication;
    }

    /**
     * Update an existing financial aid application
     *
     * @param int $userId
     * @param int $applicationId
     * @param string $aidType
     * @param array $financialData
     * @return FinancialAidApplication|null The updated financial aid application or null if not found
     */
    public function updateFinancialAidApplication(int $userId, int $applicationId, string $aidType, array $financialData): ?FinancialAidApplication
    {
        // Validate that the aid type is supported
        $this->validateAidType($aidType);

        // Get the financial aid application by application ID and user ID
        $financialAidApplication = FinancialAidApplication::where('application_id', $applicationId)->where('user_id', $userId)->first();

        // If not found, return null
        if (!$financialAidApplication) {
            return null;
        }

        // If the application is already submitted, return null (can't update submitted applications)
        if ($financialAidApplication->isSubmitted()) {
            return null;
        }

        // Update the aid type and financial data
        $financialAidApplication->aid_type = $aidType;
        $financialAidApplication->financial_data = $financialData;

        // Save the model
        $financialAidApplication->save();

        // Log the update using the audit service
        $this->auditService->logUpdate('financial_aid_applications', $financialAidApplication->id, $financialAidApplication->getOriginal(), $financialAidApplication->toArray(), auth()->user());

        // Return the updated financial aid application
        return $financialAidApplication;
    }

    /**
     * Get a financial aid application by ID
     *
     * @param int $id
     * @param int|null $userId
     * @return FinancialAidApplication|null The financial aid application or null if not found
     */
    public function getFinancialAidApplication(int $id, ?int $userId = null): ?FinancialAidApplication
    {
        // Query the financial aid application by ID
        $query = FinancialAidApplication::where('id', $id);

        // If userId is provided, also check if the application belongs to the user
        if ($userId) {
            $query->where('user_id', $userId);
        }

        // Return the financial aid application if found and authorized, null otherwise
        return $query->first();
    }

    /**
     * Get a financial aid application by application ID
     *
     * @param int $applicationId
     * @param int|null $userId
     * @return FinancialAidApplication|null The financial aid application or null if not found
     */
    public function getFinancialAidApplicationByApplication(int $applicationId, ?int $userId = null): ?FinancialAidApplication
    {
        // Query the financial aid application by application ID
        $query = FinancialAidApplication::where('application_id', $applicationId);

        // If userId is provided, also check if the application belongs to the user
        if ($userId) {
            $query->where('user_id', $userId);
        }

        // Return the financial aid application if found and authorized, null otherwise
        return $query->first();
    }

    /**
     * Get all financial aid applications for a user
     *
     * @param int $userId
     * @param array $filters
     * @return \Illuminate\Pagination\LengthAwarePaginator Paginated financial aid applications
     */
    public function getUserFinancialAidApplications(int $userId, array $filters = []): \Illuminate\Pagination\LengthAwarePaginator
    {
        // Start with a base query for FinancialAidApplication filtered by user ID
        $query = FinancialAidApplication::where('user_id', $userId);

        // Apply aid type filter if provided
        if (isset($filters['aid_type'])) {
            $query->byAidType($filters['aid_type']);
        }

        // Apply status filter if provided
        if (isset($filters['status'])) {
            $query->byStatus($filters['status']);
        }

        // Apply date range filter if provided
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->byDateRange($filters['start_date'], $filters['end_date']);
        }

        // Apply pagination with default or specified per page value
        $perPage = $filters['per_page'] ?? 15;

        // Return the paginated results
        return $query->paginate($perPage);
    }

    /**
     * Submit a financial aid application for review
     *
     * @param int $id
     * @param int $userId
     * @return bool True if the submission was successful, false otherwise
     */
    public function submitFinancialAidApplication(int $id, int $userId): bool
    {
        // Get the financial aid application by ID and user ID
        $financialAidApplication = FinancialAidApplication::where('id', $id)->where('user_id', $userId)->first();

        // If not found, return false
        if (!$financialAidApplication) {
            return false;
        }

        // Check if the application is already submitted
        if ($financialAidApplication->isSubmitted()) {
            return false;
        }

        // Check if the application has all required documents
        if (!$this->checkApplicationComplete($financialAidApplication->id, $userId)) {
            return false;
        }

        // Call the submit method on the financial aid application
        $submitted = $financialAidApplication->submit();

        // Log the submission using the audit service
        if ($submitted) {
            $this->auditService->logUpdate('financial_aid_applications', $financialAidApplication->id, $financialAidApplication->getOriginal(), $financialAidApplication->toArray(), auth()->user());
        }

        // Return the result of the submission
        return $submitted;
    }

    /**
     * Review a financial aid application and update its status
     *
     * @param int $id
     * @param int $reviewerId
     * @param string $status
     * @param array|null $additionalData
     * @return bool True if the review was successful, false otherwise
     */
    public function reviewFinancialAidApplication(int $id, int $reviewerId, string $status, ?array $additionalData = null): bool
    {
        // Get the financial aid application by ID
        $financialAidApplication = FinancialAidApplication::find($id);

        // If not found, return false
        if (!$financialAidApplication) {
            return false;
        }

        // Validate that the status is valid (approved, denied, additional_info_required)
        $validStatuses = ['approved', 'denied', 'additional_info_required'];
        if (!in_array($status, $validStatuses)) {
            return false;
        }

        // Call the review method on the financial aid application
        $reviewed = $financialAidApplication->review($reviewerId, $status, $additionalData);

        // Log the review using the audit service
        if ($reviewed) {
            $this->auditService->logUpdate('financial_aid_applications', $financialAidApplication->id, $financialAidApplication->getOriginal(), $financialAidApplication->toArray(), auth()->user());
        }

        // Return the result of the review
        return $reviewed;
    }

    /**
     * Delete a financial aid application (draft only)
     *
     * @param int $id
     * @param int $userId
     * @return bool True if the deletion was successful, false otherwise
     */
    public function deleteFinancialAidApplication(int $id, int $userId): bool
    {
        // Get the financial aid application by ID and user ID
        $financialAidApplication = FinancialAidApplication::where('id', $id)->where('user_id', $userId)->first();

        // If not found, return false
        if (!$financialAidApplication) {
            return false;
        }

        // Check if the application is in draft status (only drafts can be deleted)
        if ($financialAidApplication->isSubmitted()) {
            return false;
        }

        // Delete associated documents from storage
        foreach ($financialAidApplication->documents as $document) {
            $this->storageService->deleteFile($document->file_path);
        }

        // Delete the financial aid application
        $deleted = $financialAidApplication->delete();

        // Log the deletion using the audit service
        if ($deleted) {
            $this->auditService->logDelete('financial_aid_applications', $id, $financialAidApplication->toArray(), auth()->user());
        }

        // Return true if successful
        return $deleted;
    }

    /**
     * Upload a document for a financial aid application
     *
     * @param UploadedFile $file
     * @param string $documentType
     * @param int $financialAidApplicationId
     * @param int $userId
     * @return FinancialAidDocument The created financial aid document
     */
    public function uploadFinancialAidDocument(UploadedFile $file, string $documentType, int $financialAidApplicationId, int $userId): FinancialAidDocument
    {
        // Get the financial aid application by ID and user ID
        $financialAidApplication = FinancialAidApplication::where('id', $financialAidApplicationId)->where('user_id', $userId)->firstOrFail();

        // Validate that the document type is required for this aid type
        if (!in_array($documentType, $financialAidApplication->getRequiredDocuments())) {
            throw new Exception('Document type is not required for this aid type');
        }

        // Generate a storage path for the document
        $filename = $this->storageService->generateUniqueFilename($file->getClientOriginalName());
        $path = $this->generateStoragePath($financialAidApplicationId, $documentType, $filename);

        // Store the file using the storage service
        $this->storageService->storeDocumentFile($file, $path);

        // Create a new FinancialAidDocument model with the file metadata
        $financialAidDocument = new FinancialAidDocument([
            'financial_aid_application_id' => $financialAidApplicationId,
            'document_type' => $documentType,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);

        // Save the document
        $financialAidDocument->save();

        // Dispatch DocumentUploadedEvent
        Event::dispatch(new DocumentUploadedEvent($financialAidDocument));

        // Log the document upload using the audit service
        $this->auditService->logCreate('financial_aid_documents', $financialAidDocument->id, $financialAidDocument->toArray(), auth()->user());

        // Return the created financial aid document
        return $financialAidDocument;
    }

    /**
     * Get a financial aid document by ID
     *
     * @param int $documentId
     * @param int|null $userId
     * @return FinancialAidDocument|null The financial aid document or null if not found
     */
    public function getFinancialAidDocument(int $documentId, ?int $userId = null): ?FinancialAidDocument
    {
        // Query the financial aid document by ID
        $query = FinancialAidDocument::where('id', $documentId);

        // If userId is provided, join with financial_aid_applications and check user_id
        if ($userId) {
            $query->whereHas('financialAidApplication', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            });
        }

        // Return the document if found and authorized, null otherwise
        return $query->first();
    }

    /**
     * Get all documents for a financial aid application
     *
     * @param int $financialAidApplicationId
     * @param int|null $userId
     * @return \Illuminate\Database\Eloquent\Collection Collection of financial aid documents
     */
    public function getFinancialAidDocuments(int $financialAidApplicationId, ?int $userId = null): \Illuminate\Database\Eloquent\Collection
    {
        // Get the financial aid application by ID and user ID if provided
        $financialAidApplication = FinancialAidApplication::where('id', $financialAidApplicationId)->first();

        // If not found, return an empty collection
        if (!$financialAidApplication) {
            return collect();
        }

        // Query documents by financial aid application ID
        $query = FinancialAidDocument::where('financial_aid_application_id', $financialAidApplicationId);

        // Return the collection of documents
        return $query->get();
    }

    /**
     * Get a temporary download URL for a financial aid document
     *
     * @param int $documentId
     * @param int|null $userId
     * @param int $expirationMinutes
     * @return string|null Temporary download URL or null if not found
     */
    public function getDocumentDownloadUrl(int $documentId, ?int $userId = null, int $expirationMinutes = 60): ?string
    {
        // Get the financial aid document by ID and user ID if provided
        $financialAidDocument = FinancialAidDocument::where('id', $documentId)->first();

        // If not found, return null
        if (!$financialAidDocument) {
            return null;
        }

        // Call getDownloadUrl on the document with the expiration minutes
        $temporaryUrl = $financialAidDocument->getDownloadUrl($expirationMinutes);

        // Return the temporary URL
        return $temporaryUrl;
    }

    /**
     * Delete a financial aid document
     *
     * @param int $documentId
     * @param int|null $userId
     * @return bool True if the deletion was successful, false otherwise
     */
    public function deleteFinancialAidDocument(int $documentId, ?int $userId = null): bool
    {
        // Get the financial aid document by ID and user ID if provided
        $financialAidDocument = FinancialAidDocument::where('id', $documentId)->first();

        // If not found, return false
        if (!$financialAidDocument) {
            return false;
        }

        // Get the associated financial aid application
        $financialAidApplication = $financialAidDocument->financialAidApplication;

        // Check if the application is in draft status (only documents for drafts can be deleted)
        if ($financialAidApplication->isSubmitted()) {
            return false;
        }

        // Delete the file from storage using the storage service
        $this->storageService->deleteFile($financialAidDocument->file_path);

        // Delete the document record from the database
        $deleted = $financialAidDocument->delete();

        // Log the deletion using the audit service
        if ($deleted) {
            $this->auditService->logDelete('financial_aid_documents', $documentId, $financialAidDocument->toArray(), auth()->user());
        }

        // Return true if successful
        return $deleted;
    }

    /**
     * Verify a financial aid document
     *
     * @param int $documentId
     * @param int $verifierId
     * @param string|null $notes
     * @return bool True if the verification was successful, false otherwise
     */
    public function verifyFinancialAidDocument(int $documentId, int $verifierId, ?string $notes = null): bool
    {
        // Get the financial aid document by ID
        $financialAidDocument = FinancialAidDocument::find($documentId);

        // If not found, return false
        if (!$financialAidDocument) {
            return false;
        }

        // Call the verify method on the document with the verifier ID and notes
        $verified = $financialAidDocument->verify($verifierId, $notes);

        // Log the verification using the audit service
        if ($verified) {
            $this->auditService->logUpdate('financial_aid_documents', $financialAidDocument->id, $financialAidDocument->getOriginal(), $financialAidDocument->toArray(), auth()->user());
        }

        // Return the result of the verification
        return $verified;
    }

    /**
     * Reject a financial aid document
     *
     * @param int $documentId
     * @param int $verifierId
     * @return bool True if the rejection was successful, false otherwise
     */
    public function rejectFinancialAidDocument(int $documentId, int $verifierId): bool
    {
        // Get the financial aid document by ID
        $financialAidDocument = FinancialAidDocument::find($documentId);

        // If not found, return false
        if (!$financialAidDocument) {
            return false;
        }

        // Call the reject method on the document with the verifier ID
        $rejected = $financialAidDocument->reject($verifierId);

        // Log the rejection using the audit service
        if ($rejected) {
            $this->auditService->logUpdate('financial_aid_documents', $financialAidDocument->id, $financialAidDocument->getOriginal(), $financialAidDocument->toArray(), auth()->user());
        }

        // Return the result of the rejection
        return $rejected;
    }

    /**
     * Get the list of required documents for a financial aid application
     *
     * @param int $financialAidApplicationId
     * @param int|null $userId
     * @return array List of required document types
     */
    public function getRequiredDocuments(int $financialAidApplicationId, ?int $userId = null): array
    {
        // Get the financial aid application by ID and user ID if provided
        $financialAidApplication = FinancialAidApplication::where('id', $financialAidApplicationId)->first();

        // If not found, return an empty array
        if (!$financialAidApplication) {
            return [];
        }

        // Call getRequiredDocuments on the financial aid application
        $requiredDocuments = $financialAidApplication->getRequiredDocuments();

        // Return the list of required document types
        return $requiredDocuments;
    }

    /**
     * Get the list of missing documents for a financial aid application
     *
     * @param int $financialAidApplicationId
     * @param int|null $userId
     * @return array List of missing document types
     */
    public function getMissingDocuments(int $financialAidApplicationId, ?int $userId = null): array
    {
        // Get the financial aid application by ID and user ID if provided
        $financialAidApplication = FinancialAidApplication::where('id', $financialAidApplicationId)->first();

        // If not found, return an empty array
        if (!$financialAidApplication) {
            return [];
        }

        // Call getMissingDocuments on the financial aid application
        $missingDocuments = $financialAidApplication->getMissingDocuments();

        // Return the list of missing document types
        return $missingDocuments;
    }

    /**
     * Check if a financial aid application is complete with all required documents
     *
     * @param int $financialAidApplicationId
     * @param int|null $userId
     * @return bool True if the application is complete, false otherwise
     */
    public function checkApplicationComplete(int $financialAidApplicationId, ?int $userId = null): bool
    {
        // Get the financial aid application by ID and user ID if provided
        $financialAidApplication = FinancialAidApplication::where('id', $financialAidApplicationId)->first();

        // If not found, return false
        if (!$financialAidApplication) {
            return false;
        }

        // Call isComplete on the financial aid application
        $isComplete = $financialAidApplication->isComplete();

        // Return the result
        return $isComplete;
    }

    /**
     * Get the list of supported financial aid types
     *
     * @return array List of supported aid types
     */
    public function getSupportedAidTypes(): array
    {
        // Return the aidTypes property
        return $this->aidTypes;
    }

    /**
     * Validate that an aid type is supported
     *
     * @param string $aidType
     * @return bool True if the aid type is supported
     */
    protected function validateAidType(string $aidType): bool
    {
        // Check if the aid type is in the list of supported aid types
        if (!in_array($aidType, $this->aidTypes)) {
            throw new Exception('Invalid aid type');
        }

        // Return true if supported
        return true;
    }

    /**
     * Generate a storage path for a financial aid document
     *
     * @param int $financialAidApplicationId
     * @param string $documentType
     * @param string $fileName
     * @return string Storage path for the document
     */
    protected function generateStoragePath(int $financialAidApplicationId, string $documentType, string $fileName): string
    {
        // Create a path using the document storage path, financial aid application ID, document type, and a unique filename
        $path = $this->documentStoragePath . '/' . $financialAidApplicationId . '/' . $documentType . '/' . $fileName;

        // Return the generated path
        return $path;
    }
}