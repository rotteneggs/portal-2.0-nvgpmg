<?php

namespace App\Http\Requests;

use App\Services\DocumentService; // Import the DocumentService class
use Illuminate\Foundation\Http\FormRequest; // Import the FormRequest class from Laravel
use Illuminate\Validation\Rule; // Import the Rule class from Laravel for complex validation rules
use Illuminate\Support\Facades\Auth; // Import the Auth facade from Laravel for authentication

class DocumentUploadRequest extends FormRequest
{
    /**
     * @var DocumentService
     */
    protected DocumentService $documentService;

    /**
     * Create a new DocumentUploadRequest instance.
     *
     * @param  DocumentService  $documentService
     * @return void
     */
    public function __construct(DocumentService $documentService)
    {
        parent::__construct();

        $this->documentService = $documentService;
    }

    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        // Check if the user is authenticated using Auth::check()
        // Return true if the user is authenticated, false otherwise
        return Auth::check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        // Get allowed mime types from $this->documentService->getAllowedMimeTypes()
        $allowedMimeTypes = $this->documentService->getAllowedMimeTypes();

        // Get maximum file size from $this->documentService->getMaxFileSize()
        $maxFileSize = $this->documentService->getMaxFileSize();

        // Return an array of validation rules:
        // file: required, file, mimes:pdf,jpg,jpeg,png, max:{maxFileSize}
        // document_type: required, string
        // application_id: required, integer, exists:applications,id
        return [
            'file' => 'required|file|mimes:' . implode(',', $allowedMimeTypes) . '|max:' . $maxFileSize,
            'document_type' => 'required|string',
            'application_id' => 'required|integer|exists:applications,id',
        ];
    }

    /**
     * Get custom validation error messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        // Get maximum file size from $this->documentService->getMaxFileSize()
        $maxFileSize = $this->documentService->getMaxFileSize() / 1024;

        // Return an array of custom error messages:
        // file.required: A file is required.
        // file.file: The uploaded file is invalid.
        // file.mimes: The file must be a PDF, JPG, or PNG.
        // file.max: The file size must not exceed {maxFileSize} kilobytes.
        // document_type.required: The document type is required.
        // application_id.required: The application ID is required.
        // application_id.exists: The selected application does not exist.
        return [
            'file.required' => 'A file is required.',
            'file.file' => 'The uploaded file is invalid.',
            'file.mimes' => 'The file must be one of the following types: pdf, jpg, jpeg, png.',
            'file.max' => "The file size must not exceed {$maxFileSize} kilobytes.",
            'document_type.required' => 'The document type is required.',
            'application_id.required' => 'The application ID is required.',
            'application_id.exists' => 'The selected application does not exist.',
        ];
    }
}