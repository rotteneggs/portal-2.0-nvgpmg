<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest; // -- illuminate/foundation/http ^10.0
use Illuminate\Support\Facades\Auth; // -- illuminate/support/facades ^10.0
use App\Models\Application; // src/backend/app/Models/Application.php
use App\Services\ApplicationService; // src/backend/app/Services/ApplicationService.php

class ApplicationSubmitRequest extends FormRequest
{
    /**
     * Inject the ApplicationService dependency
     *
     * @param  ApplicationService  $applicationService
     */
    public function __construct(protected ApplicationService $applicationService)
    {
        $this->applicationService = $applicationService;
    }
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        // Get the application ID from the route parameter
        $applicationId = $this->route('application');

        // Find the application in the database
        $application = Application::find($applicationId);

        // Return false if application not found
        if (!$application) {
            return false;
        }

        // Check if the current authenticated user is the owner of the application
        // Check if the application has not already been submitted
        return Auth::id() === $application->user_id && !$application->isSubmitted();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        // No specific input fields need validation for submission as this validates the state of the application
        return [];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        // Return an array of custom error messages:
        return [
            'application_incomplete' => 'The application is incomplete. Please complete all required sections before submitting.',
            'documents_missing' => 'Required documents are missing. Please upload all required documents before submitting.',
            'already_submitted' => 'This application has already been submitted and cannot be submitted again.',
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator): void
    {
        // Get the application ID from the route parameter
        $applicationId = $this->route('application');

        // Find the application in the database
        $application = Application::find($applicationId);

        $validator->after(function ($validator) use ($application) {
            if (!$application) {
                $validator->errors()->add('application', 'Application not found.');
                return;
            }

            // Add a custom validator to check if the application is complete with all required sections
            if (!$application->isComplete()) {
                $validator->errors()->add('application_incomplete', 'The application is incomplete. Please complete all required sections before submitting.');
            }

            // Add a custom validator to check if all required documents have been uploaded
            if (!empty($application->getMissingDocuments())) {
                $validator->errors()->add('documents_missing', 'Required documents are missing. Please upload all required documents before submitting.');
            }

            // Add a custom validator to check if the application has not already been submitted
            if ($application->isSubmitted()) {
                $validator->errors()->add('already_submitted', 'This application has already been submitted and cannot be submitted again.');
            }
        });
    }
}