<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\FinancialAidDocumentUploadRequest; // laravel/framework ^10.0
use App\Http\Resources\FinancialAidDocumentResource; // laravel/framework ^10.0
use App\Services\FinancialAidService; // Internal import
use Exception; // php 8.2
use Illuminate\Http\JsonResponse; // illuminate/http ^10.0
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Symfony\Component\HttpFoundation\Response;

/**
 * Controller for handling financial aid application-related API requests
 */
class FinancialAidController extends Controller
{
    /**
     * @var FinancialAidService
     */
    protected FinancialAidService $financialAidService;

    /**
     * Create a new FinancialAidController instance
     *
     * @param FinancialAidService $financialAidService
     */
    public function __construct(FinancialAidService $financialAidService)
    {
        // Inject the FinancialAidService dependency
        $this->financialAidService = $financialAidService;
    }

    /**
     * Get a list of financial aid applications for the authenticated user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with financial aid applications collection
     */
    public function index(Request $request): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Extract filter parameters from the request (aid_type, status, date range)
        $filters = $request->only(['aid_type', 'status', 'start_date', 'end_date', 'per_page']);

        // Call financialAidService->getUserFinancialAidApplications with user ID and filters
        $applications = $this->financialAidService->getUserFinancialAidApplications($userId, $filters);

        // Return JSON response with the applications collection
        return response()->json($applications);
    }

    /**
     * Create a new financial aid application
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with the created financial aid application
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Get the authenticated user ID
            $userId = Auth::id();

            // Extract application data from the validated request (application_id, aid_type, financial_data)
            $validatedData = $request->validate([
                'application_id' => 'required|integer',
                'aid_type' => 'required|string',
                'financial_data' => 'required|array',
            ]);

            $applicationId = $validatedData['application_id'];
            $aidType = $validatedData['aid_type'];
            $financialData = $validatedData['financial_data'];

            // Call financialAidService->createFinancialAidApplication with the extracted data
            $application = $this->financialAidService->createFinancialAidApplication($userId, $applicationId, $aidType, $financialData);

            // Return JSON response with the created application and 201 status code
            return response()->json($application, Response::HTTP_CREATED);
        } catch (Exception $e) {
            Log::error('Error creating financial aid application: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Get a specific financial aid application by ID
     *
     * @param int $id
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with the financial aid application details
     */
    public function show(int $id, Request $request): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call financialAidService->getFinancialAidApplication with the application ID and user ID
        $application = $this->financialAidService->getFinancialAidApplication($id, $userId);

        // Return 404 if application not found
        if (!$application) {
            return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
        }

        // Determine which relationships to include based on request parameters
        $includeDocuments = $request->query('include_documents', false);

        if ($includeDocuments) {
            $application->load('documents');
        }

        // Return JSON response with the application details
        return response()->json($application);
    }

    /**
     * Get a financial aid application by parent application ID
     *
     * @param int $applicationId
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with the financial aid application details
     */
    public function showByApplication(int $applicationId, Request $request): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call financialAidService->getFinancialAidApplicationByApplication with the application ID and user ID
        $application = $this->financialAidService->getFinancialAidApplicationByApplication($applicationId, $userId);

        // Return 404 if application not found
        if (!$application) {
            return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
        }

        // Determine which relationships to include based on request parameters
        $includeDocuments = $request->query('include_documents', false);

        if ($includeDocuments) {
            $application->load('documents');
        }

        // Return JSON response with the application details
        return response()->json($application);
    }

    /**
     * Update an existing financial aid application
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with the updated financial aid application
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            // Get the authenticated user ID
            $userId = Auth::id();

            // Extract application data from the validated request (aid_type, financial_data)
            $validatedData = $request->validate([
                'aid_type' => 'required|string',
                'financial_data' => 'required|array',
            ]);

            $aidType = $validatedData['aid_type'];
            $financialData = $validatedData['financial_data'];

            // Call financialAidService->updateFinancialAidApplication with the application ID, data, and user ID
            $application = $this->financialAidService->updateFinancialAidApplication($userId, $id, $aidType, $financialData);

            // Return 404 if application not found
            if (!$application) {
                return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
            }

            // Return 422 if application is already submitted (can't update submitted applications)
            if ($application->isSubmitted()) {
                return response()->json(['message' => 'Cannot update a submitted application'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Return JSON response with the updated application
            return response()->json($application);
        } catch (Exception $e) {
            Log::error('Error updating financial aid application: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Submit a financial aid application for review
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with submission result
     */
    public function submit(Request $request, int $id): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call financialAidService->submitFinancialAidApplication with the application ID and user ID
        $submitted = $this->financialAidService->submitFinancialAidApplication($id, $userId);

        // Return 404 if application not found
        if (!$submitted) {
            return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
        }

        // Return 422 if application is already submitted
        if ($this->financialAidService->getFinancialAidApplication($id)->isSubmitted()) {
            return response()->json(['message' => 'Financial aid application already submitted'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Return 422 if application is missing required documents
        if (!$this->financialAidService->checkApplicationComplete($id, $userId)) {
            return response()->json(['message' => 'Financial aid application is missing required documents'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Get the updated application after submission
        $application = $this->financialAidService->getFinancialAidApplication($id, $userId);

        // Return JSON response with success message and the submitted application
        return response()->json(['message' => 'Financial aid application submitted successfully', 'application' => $application]);
    }

    /**
     * Delete a draft financial aid application
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with deletion result
     */
    public function destroy(int $id): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call financialAidService->deleteFinancialAidApplication with the application ID and user ID
        $deleted = $this->financialAidService->deleteFinancialAidApplication($id, $userId);

        // Return 404 if application not found
        if (!$deleted) {
            return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
        }

        // Return 422 if application is not in draft status (only drafts can be deleted)
        if ($this->financialAidService->getFinancialAidApplication($id)->isSubmitted()) {
            return response()->json(['message' => 'Only draft financial aid applications can be deleted'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Return JSON response with success message
        return response()->json(['message' => 'Financial aid application deleted successfully']);
    }

    /**
     * Upload a document for a financial aid application
     *
     * @param FinancialAidDocumentUploadRequest $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with the uploaded document
     */
    public function uploadDocument(FinancialAidDocumentUploadRequest $request, int $id): JsonResponse
    {
        try {
            // Get the authenticated user ID
            $userId = Auth::id();

            // Extract file and document_type from the validated request
            $file = $request->file('file');
            $documentType = $request->input('document_type');

            // Call financialAidService->uploadFinancialAidDocument with the file, document type, application ID, and user ID
            $document = $this->financialAidService->uploadFinancialAidDocument($file, $documentType, $id, $userId);

            // Return 404 if application not found
            if (!$document) {
                return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
            }

            // Return 422 if document type is not required for this aid type
            $application = $this->financialAidService->getFinancialAidApplication($id, $userId);
            if (!in_array($documentType, $application->getRequiredDocuments())) {
                return response()->json(['message' => 'Document type is not required for this aid type'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Transform the uploaded document using the response formatter
            $resource = new FinancialAidDocumentResource($document);

            // Return JSON response with the document resource and 201 Created status
            return (new JsonResponse($resource, Response::HTTP_CREATED))->header('Content-Type', 'application/json');
        } catch (Exception $e) {
            Log::error('Error uploading financial aid document: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Get all documents for a financial aid application
     *
     * @param int $id
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with documents collection
     */
    public function getDocuments(int $id, Request $request): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call financialAidService->getFinancialAidDocuments with the application ID and user ID
        $documents = $this->financialAidService->getFinancialAidDocuments($id, $userId);

        // Return 404 if application not found
        if ($documents->isEmpty()) {
            return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
        }

        // Transform the documents to appropriate format for response
        $resourceCollection = FinancialAidDocumentResource::collection($documents);

        // Include download URLs if requested
        $includeDownloadUrls = $request->query('include_download_urls', false);

        if ($includeDownloadUrls) {
            foreach ($resourceCollection as $resource) {
                $document = $resource->resource;
                $resource->download_url = $this->financialAidService->getDocumentDownloadUrl($document->id, $userId);
            }
        }

        // Return JSON response with the documents collection
        return response()->json($resourceCollection);
    }

    /**
     * Get a temporary download URL for a financial aid document
     *
     * @param int $applicationId
     * @param int $documentId
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse JSON response with download URL
     */
    public function downloadDocument(int $applicationId, int $documentId, Request $request): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Get expiration minutes from request (default to 60 if not provided)
        $expirationMinutes = $request->query('expires', 60);

        // Call financialAidService->getDocumentDownloadUrl with the document ID, user ID, and expiration minutes
        $downloadUrl = $this->financialAidService->getDocumentDownloadUrl($documentId, $userId, $expirationMinutes);

        // Return 404 if document not found
        if (!$downloadUrl) {
            return response()->json(['message' => 'Financial aid document not found'], Response::HTTP_NOT_FOUND);
        }

        // Return JSON response with the download URL
        return response()->json(['url' => $downloadUrl]);
    }

    /**
     * Delete a financial aid document
     *
     * @param int $applicationId
     * @param int $documentId
     * @return \Illuminate\Http\JsonResponse JSON response with deletion result
     */
    public function deleteDocument(int $applicationId, int $documentId): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call financialAidService->deleteFinancialAidDocument with the document ID and user ID
        $deleted = $this->financialAidService->deleteFinancialAidDocument($documentId, $userId);

        // Return 404 if document not found
        if (!$deleted) {
            return response()->json(['message' => 'Financial aid document not found'], Response::HTTP_NOT_FOUND);
        }

        // Return 422 if the associated application is not in draft status (only documents for drafts can be deleted)
        $application = $this->financialAidService->getFinancialAidApplication($applicationId, $userId);
        if ($application && $application->isSubmitted()) {
            return response()->json(['message' => 'Cannot delete documents from a submitted application'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Return JSON response with success message
        return response()->json(['message' => 'Financial aid document deleted successfully']);
    }

    /**
     * Get a list of required documents for a financial aid application
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with required documents
     */
    public function requiredDocuments(int $id): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call financialAidService->getRequiredDocuments with the application ID and user ID
        $requiredDocuments = $this->financialAidService->getRequiredDocuments($id, $userId);

        // Return 404 if application not found
        if (!$requiredDocuments) {
            return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
        }

        // Return JSON response with the list of required documents
        return response()->json($requiredDocuments);
    }

    /**
     * Get a list of missing documents for a financial aid application
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with missing documents
     */
    public function missingDocuments(int $id): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call financialAidService->getMissingDocuments with the application ID and user ID
        $missingDocuments = $this->financialAidService->getMissingDocuments($id, $userId);

        // Return 404 if application not found
        if (!$missingDocuments) {
            return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
        }

        // Return JSON response with the list of missing documents
        return response()->json($missingDocuments);
    }

    /**
     * Check if a financial aid application is complete with all required documents
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse JSON response with completion status
     */
    public function checkComplete(int $id): JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call financialAidService->checkApplicationComplete with the application ID and user ID
        $isComplete = $this->financialAidService->checkApplicationComplete($id, $userId);

        // Return 404 if application not found
        if ($isComplete === null) {
            return response()->json(['message' => 'Financial aid application not found'], Response::HTTP_NOT_FOUND);
        }

        // Return JSON response with completion status and any missing requirements
        return response()->json(['is_complete' => $isComplete]);
    }

    /**
     * Get a list of supported financial aid types
     *
     * @return \Illuminate\Http\JsonResponse JSON response with aid types
     */
    public function aidTypes(): JsonResponse
    {
        // Call financialAidService->getSupportedAidTypes to get the list of aid types
        $aidTypes = $this->financialAidService->getSupportedAidTypes();

        // Return JSON response with the aid types
        return response()->json($aidTypes);
    }
}