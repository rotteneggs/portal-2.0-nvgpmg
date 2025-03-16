<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\DocumentProcessingException; // Import the DocumentProcessingException class
use App\Http\Requests\DocumentUploadRequest; // Import the DocumentUploadRequest class
use App\Http\Resources\DocumentResource; // Import the DocumentResource class
use App\Services\DocumentService; // Import the DocumentService class
use Illuminate\Http\JsonResponse; // illuminate/http ^10.0
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Http\Response; // illuminate/http ^10.0
use Illuminate\Routing\Controller; // illuminate/routing ^10.0
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0

class DocumentController extends Controller
{
    /**
     * @var DocumentService
     */
    protected DocumentService $documentService;

    /**
     * Create a new DocumentController instance.
     *
     * @param DocumentService $documentService
     * @return void
     */
    public function __construct(DocumentService $documentService)
    {
        // Store the DocumentService instance for use in controller methods
        $this->documentService = $documentService;
    }

    /**
     * Get a list of documents for the authenticated user or by application ID
     *
     * @param Request $request
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public function index(Request $request): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Check if application_id is provided in the request
        $applicationId = $request->input('application_id');
        $documentType = $request->input('document_type');

        // If application_id is provided, get documents by application
        if ($applicationId) {
            if ($documentType) {
                $documents = $this->documentService->getDocumentsByType($applicationId, $documentType, $userId);
            } else {
                $documents = $this->documentService->getDocumentsByApplication($applicationId, $userId);
            }
        } else {
            // If no application_id, get all documents for the user
            $documents = $this->documentService->getDocumentsByUser($userId);
        }

        // Transform the documents using DocumentResource collection
        $resource = DocumentResource::collection($documents);

        // Return the resource collection with appropriate includes based on request parameters
        return $resource->withUser()->withApplication()->withVerification();
    }

    /**
     * Upload a new document
     *
     * @param DocumentUploadRequest $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(DocumentUploadRequest $request): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Extract file, document_type, and application_id from the validated request
        $file = $request->file('file');
        $documentType = $request->input('document_type');
        $applicationId = $request->input('application_id');

        // Call documentService->uploadDocument to process the upload
        $document = $this->documentService->uploadDocument($file, $documentType, $applicationId, $userId);

        // Transform the created document using DocumentResource
        $resource = new DocumentResource($document);

        // Return a JSON response with the document resource and 201 Created status
        return (new JsonResponse($resource->withUser()->withApplication()->withVerification(), Response::HTTP_CREATED))->header('Content-Type', 'application/json');
    }

    /**
     * Get a specific document by ID
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call documentService->getDocument to retrieve the document
        $document = $this->documentService->getDocument($id, $userId);

        // If document not found or user not authorized, return 404 Not Found
        if (!$document) {
            return response()->json(['message' => 'Document not found'], Response::HTTP_NOT_FOUND);
        }

        // Transform the document using DocumentResource with appropriate includes
        $resource = new DocumentResource($document);

        // Return a JSON response with the document resource
        return response()->json($resource->withUser()->withApplication()->withVerificationHistory())->header('Content-Type', 'application/json');
    }

    /**
     * Replace an existing document with a new file
     *
     * @param DocumentUploadRequest $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(DocumentUploadRequest $request, int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Extract file from the validated request
        $file = $request->file('file');

        // Call documentService->replaceDocument to replace the document
        $document = $this->documentService->replaceDocument($id, $file, $userId);

        // If document not found or user not authorized, return 404 Not Found
        if (!$document) {
            return response()->json(['message' => 'Document not found'], Response::HTTP_NOT_FOUND);
        }

        // Transform the updated document using DocumentResource
        $resource = new DocumentResource($document);

        // Return a JSON response with the document resource
        return response()->json($resource->withUser()->withApplication()->withVerification())->header('Content-Type', 'application/json');
    }

    /**
     * Delete a document
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Call documentService->deleteDocument to delete the document
        $deleted = $this->documentService->deleteDocument($id, $userId);

        // If document not found or user not authorized, return 404 Not Found
        if (!$deleted) {
            return response()->json(['message' => 'Document not found'], Response::HTTP_NOT_FOUND);
        }

        // If deletion successful, return 200 OK with success message
        return response()->json(['message' => 'Document deleted successfully'], Response::HTTP_OK)->header('Content-Type', 'application/json');
    }

    /**
     * Get a temporary download URL for a document
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function download(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Get expiration minutes from request (default to 60 if not provided)
        $expirationMinutes = $request->input('expires', 60);

        // Call documentService->getDocumentDownloadUrl to generate a download URL
        $url = $this->documentService->getDocumentDownloadUrl($id, $userId, $expirationMinutes);

        // If document not found or user not authorized, return 404 Not Found
        if (!$url) {
            return response()->json(['message' => 'Document not found'], Response::HTTP_NOT_FOUND);
        }

        // Return a JSON response with the download URL
        return response()->json(['url' => $url])->header('Content-Type', 'application/json');
    }

    /**
     * Get a list of supported document types
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function types(Request $request): \Illuminate\Http\JsonResponse
    {
        // Call documentService->getSupportedDocumentTypes to get the list of document types
        $types = $this->documentService->getSupportedDocumentTypes();

        // Return a JSON response with the document types
        return response()->json(['types' => $types])->header('Content-Type', 'application/json');
    }

    /**
     * Get the status of required documents for an application
     *
     * @param Request $request
     * @param int $applicationId
     * @return \Illuminate\Http\JsonResponse
     */
    public function status(Request $request, int $applicationId): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Get application_type from request
        $applicationType = $request->input('application_type');

        // Call documentService->getDocumentStatus to get the status of required documents
        $status = $this->documentService->getDocumentStatus($applicationId, $applicationType, $userId);

        // Return a JSON response with the document status
        return response()->json(['status' => $status])->header('Content-Type', 'application/json');
    }

    /**
     * Mark a document as verified (admin only)
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function verify(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Get notes from request (optional)
        $notes = $request->input('notes');

        // Call documentService->getDocument to retrieve the document
        $document = $this->documentService->getDocument($id);

        // If document not found, return 404 Not Found
        if (!$document) {
            return response()->json(['message' => 'Document not found'], Response::HTTP_NOT_FOUND);
        }

        // Call document->verify method to mark as verified
        $document->verify($userId, $notes);

        // Transform the updated document using DocumentResource with verification info
        $resource = new DocumentResource($document);

        // Return a JSON response with the document resource
        return response()->json($resource->withVerification())->header('Content-Type', 'application/json');
    }

    /**
     * Mark a document as rejected (admin only)
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function reject(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        // Get the authenticated user ID
        $userId = Auth::id();

        // Get reason from request (required)
        $reason = $request->input('reason');

        // Call documentService->getDocument to retrieve the document
        $document = $this->documentService->getDocument($id);

        // If document not found, return 404 Not Found
        if (!$document) {
            return response()->json(['message' => 'Document not found'], Response::HTTP_NOT_FOUND);
        }

        // Call document->reject method to mark as rejected
        $document->reject($userId);

        // Create a document verification record with the rejection reason
        $verification = new DocumentVerification();
        $verification->document_id = $document->id;
        $verification->verification_method = 'manual';
        $verification->verification_status = 'rejected';
        $verification->notes = $reason;
        $verification->verified_by_user_id = $userId;
        $verification->save();

        // Transform the updated document using DocumentResource with verification info
        $resource = new DocumentResource($document);

        // Return a JSON response with the document resource
        return response()->json($resource->withVerification())->header('Content-Type', 'application/json');
    }
}