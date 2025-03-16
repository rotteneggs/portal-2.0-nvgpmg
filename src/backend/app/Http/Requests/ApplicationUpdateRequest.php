<?php

namespace App\Http\Requests;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest; // Laravel ^10.0
use Illuminate\Validation\Rule; // Laravel ^10.0
use Illuminate\Support\Facades\Auth; // Laravel ^10.0

class ApplicationUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        $applicationId = $this->route('application');
        $application = Application::find($applicationId);
        
        if (!$application) {
            return false;
        }
        
        // Check if the user owns the application and it's not submitted
        return Auth::id() === $application->user_id && !$application->isSubmitted();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        return [
            'application_data' => 'sometimes|array',
            
            // Personal Information
            'application_data.personal_information' => 'sometimes|array',
            'application_data.personal_information.first_name' => 'sometimes|string|max:100',
            'application_data.personal_information.last_name' => 'sometimes|string|max:100',
            'application_data.personal_information.date_of_birth' => 'sometimes|date|before:today',
            
            // Contact Details
            'application_data.contact_details' => 'sometimes|array',
            'application_data.contact_details.email' => 'sometimes|email|max:255',
            'application_data.contact_details.phone' => 'sometimes|string|max:20',
            'application_data.contact_details.address_line1' => 'sometimes|string|max:255',
            'application_data.contact_details.address_line2' => 'sometimes|string|max:255',
            'application_data.contact_details.city' => 'sometimes|string|max:100',
            'application_data.contact_details.state' => 'sometimes|string|max:100',
            'application_data.contact_details.postal_code' => 'sometimes|string|max:20',
            'application_data.contact_details.country' => 'sometimes|string|max:100',
            
            // Academic History
            'application_data.academic_history' => 'sometimes|array',
            'application_data.academic_history.institutions' => 'sometimes|array',
            'application_data.academic_history.institutions.*.name' => 'required_with:application_data.academic_history.institutions|string|max:255',
            'application_data.academic_history.institutions.*.start_date' => 'required_with:application_data.academic_history.institutions|date',
            'application_data.academic_history.institutions.*.end_date' => 'sometimes|date|after_or_equal:application_data.academic_history.institutions.*.start_date',
            'application_data.academic_history.institutions.*.gpa' => 'sometimes|numeric|min:0|max:4.0',
            
            // Test Scores
            'application_data.test_scores' => 'sometimes|array',
            'application_data.test_scores.*.test_type' => 'required_with:application_data.test_scores|string|in:SAT,ACT,GRE,GMAT,TOEFL,IELTS',
            'application_data.test_scores.*.test_date' => 'required_with:application_data.test_scores|date|before_or_equal:today',
            'application_data.test_scores.*.score' => 'required_with:application_data.test_scores|numeric',
            
            // Personal Statement
            'application_data.personal_statement' => 'sometimes|string|max:5000',
        ];
    }

    /**
     * Get custom validation error messages.
     *
     * @return array<string, string>
     */
    public function messages()
    {
        return [
            'application_data.array' => 'Application data must be an array.',
            
            // Personal Information
            'application_data.personal_information.array' => 'Personal information must be an array.',
            'application_data.personal_information.first_name.string' => 'First name must be a string.',
            'application_data.personal_information.first_name.max' => 'First name cannot exceed 100 characters.',
            'application_data.personal_information.last_name.string' => 'Last name must be a string.',
            'application_data.personal_information.last_name.max' => 'Last name cannot exceed 100 characters.',
            'application_data.personal_information.date_of_birth.date' => 'Date of birth must be a valid date.',
            'application_data.personal_information.date_of_birth.before' => 'Date of birth must be in the past.',
            
            // Contact Details
            'application_data.contact_details.array' => 'Contact details must be an array.',
            'application_data.contact_details.email.email' => 'Please enter a valid email address.',
            'application_data.contact_details.email.max' => 'Email address cannot exceed 255 characters.',
            'application_data.contact_details.phone.string' => 'Phone number must be a string.',
            'application_data.contact_details.phone.max' => 'Phone number cannot exceed 20 characters.',
            'application_data.contact_details.address_line1.string' => 'Address line 1 must be a string.',
            'application_data.contact_details.address_line1.max' => 'Address line 1 cannot exceed 255 characters.',
            'application_data.contact_details.address_line2.string' => 'Address line 2 must be a string.',
            'application_data.contact_details.address_line2.max' => 'Address line 2 cannot exceed 255 characters.',
            'application_data.contact_details.city.string' => 'City must be a string.',
            'application_data.contact_details.city.max' => 'City cannot exceed 100 characters.',
            'application_data.contact_details.state.string' => 'State must be a string.',
            'application_data.contact_details.state.max' => 'State cannot exceed 100 characters.',
            'application_data.contact_details.postal_code.string' => 'Postal code must be a string.',
            'application_data.contact_details.postal_code.max' => 'Postal code cannot exceed 20 characters.',
            'application_data.contact_details.country.string' => 'Country must be a string.',
            'application_data.contact_details.country.max' => 'Country cannot exceed 100 characters.',
            
            // Academic History
            'application_data.academic_history.array' => 'Academic history must be an array.',
            'application_data.academic_history.institutions.array' => 'Institutions must be an array.',
            'application_data.academic_history.institutions.*.name.required_with' => 'Institution name is required.',
            'application_data.academic_history.institutions.*.name.string' => 'Institution name must be a string.',
            'application_data.academic_history.institutions.*.name.max' => 'Institution name cannot exceed 255 characters.',
            'application_data.academic_history.institutions.*.start_date.required_with' => 'Start date is required.',
            'application_data.academic_history.institutions.*.start_date.date' => 'Start date must be a valid date.',
            'application_data.academic_history.institutions.*.end_date.date' => 'End date must be a valid date.',
            'application_data.academic_history.institutions.*.end_date.after_or_equal' => 'End date must be after or equal to start date.',
            'application_data.academic_history.institutions.*.gpa.numeric' => 'GPA must be a number.',
            'application_data.academic_history.institutions.*.gpa.min' => 'GPA must be at least 0.',
            'application_data.academic_history.institutions.*.gpa.max' => 'GPA cannot exceed 4.0.',
            
            // Test Scores
            'application_data.test_scores.array' => 'Test scores must be an array.',
            'application_data.test_scores.*.test_type.required_with' => 'Test type is required.',
            'application_data.test_scores.*.test_type.string' => 'Test type must be a string.',
            'application_data.test_scores.*.test_type.in' => 'Test type must be one of: SAT, ACT, GRE, GMAT, TOEFL, IELTS.',
            'application_data.test_scores.*.test_date.required_with' => 'Test date is required.',
            'application_data.test_scores.*.test_date.date' => 'Test date must be a valid date.',
            'application_data.test_scores.*.test_date.before_or_equal' => 'Test date must be in the past or today.',
            'application_data.test_scores.*.score.required_with' => 'Test score is required.',
            'application_data.test_scores.*.score.numeric' => 'Test score must be a number.',
            
            // Personal Statement
            'application_data.personal_statement.string' => 'Personal statement must be a string.',
            'application_data.personal_statement.max' => 'Personal statement cannot exceed 5000 characters.',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation()
    {
        // If application_data is present but not an array, convert it to an array
        if ($this->has('application_data') && !is_array($this->input('application_data'))) {
            $this->merge(['application_data' => (array) $this->input('application_data')]);
        }
    }
}