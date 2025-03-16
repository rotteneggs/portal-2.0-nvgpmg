<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest; // Laravel's base form request class for validation and authorization (^10.0)
use Illuminate\Validation\Rule; // Laravel's validation rule builder for complex validation rules (^10.0)
use Illuminate\Support\Facades\Auth; // Laravel's authentication facade to access the authenticated user (^10.0)

class ApplicationStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        // Only authenticated users can create applications
        return Auth::check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            // Basic application information
            'application_type' => ['required', 'string', Rule::in(['undergraduate', 'graduate', 'transfer'])],
            'academic_term' => ['required', 'string', Rule::in(['Fall', 'Spring', 'Summer'])],
            'academic_year' => ['required', 'string', 'regex:/^\d{4}-\d{4}$/'],
            'application_data' => ['required', 'array'],
            
            // Personal information validation rules
            'application_data.personal_information' => ['sometimes', 'required', 'array'],
            'application_data.personal_information.first_name' => ['required_with:application_data.personal_information', 'string', 'max:100'],
            'application_data.personal_information.last_name' => ['required_with:application_data.personal_information', 'string', 'max:100'],
            'application_data.personal_information.date_of_birth' => ['required_with:application_data.personal_information', 'date', 'before:today'],
            
            // Contact details validation rules
            'application_data.contact_details' => ['sometimes', 'required', 'array'],
            'application_data.contact_details.email' => ['required_with:application_data.contact_details', 'email', 'max:255'],
            'application_data.contact_details.phone' => ['required_with:application_data.contact_details', 'string', 'max:20'],
            'application_data.contact_details.address' => ['required_with:application_data.contact_details', 'string', 'max:255'],
            'application_data.contact_details.city' => ['required_with:application_data.contact_details', 'string', 'max:100'],
            'application_data.contact_details.state' => ['required_with:application_data.contact_details', 'string', 'max:100'],
            'application_data.contact_details.postal_code' => ['required_with:application_data.contact_details', 'string', 'max:20'],
            'application_data.contact_details.country' => ['required_with:application_data.contact_details', 'string', 'max:100'],
        ];
    }

    /**
     * Get custom validation error messages.
     *
     * @return array
     */
    public function messages()
    {
        return [
            // Application type validation messages
            'application_type.required' => 'The application type is required.',
            'application_type.in' => 'The selected application type is invalid. Please choose from undergraduate, graduate, or transfer.',
            
            // Academic term validation messages
            'academic_term.required' => 'The academic term is required.',
            'academic_term.in' => 'The selected academic term is invalid. Please choose from Fall, Spring, or Summer.',
            
            // Academic year validation messages
            'academic_year.required' => 'The academic year is required.',
            'academic_year.regex' => 'The academic year must be in the format YYYY-YYYY (e.g., 2023-2024).',
            
            // Application data validation messages
            'application_data.required' => 'Application data is required.',
            'application_data.array' => 'Application data must be an array.',
            
            // Personal information validation messages
            'application_data.personal_information.required' => 'Personal information is required.',
            'application_data.personal_information.first_name.required_with' => 'First name is required.',
            'application_data.personal_information.last_name.required_with' => 'Last name is required.',
            'application_data.personal_information.date_of_birth.required_with' => 'Date of birth is required.',
            'application_data.personal_information.date_of_birth.before' => 'Date of birth must be in the past.',
            
            // Contact details validation messages
            'application_data.contact_details.required' => 'Contact details are required.',
            'application_data.contact_details.email.required_with' => 'Email address is required.',
            'application_data.contact_details.email.email' => 'Please enter a valid email address.',
            'application_data.contact_details.phone.required_with' => 'Phone number is required.',
            'application_data.contact_details.address.required_with' => 'Address is required.',
            'application_data.contact_details.city.required_with' => 'City is required.',
            'application_data.contact_details.state.required_with' => 'State/Province is required.',
            'application_data.contact_details.postal_code.required_with' => 'Postal code is required.',
            'application_data.contact_details.country.required_with' => 'Country is required.',
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
            $this->merge([
                'application_data' => [$this->input('application_data')]
            ]);
        }
        
        // Trim string values to remove leading/trailing whitespace
        $fieldsToTrim = ['application_type', 'academic_term', 'academic_year'];
        
        foreach ($fieldsToTrim as $field) {
            if ($this->has($field)) {
                $this->merge([
                    $field => trim($this->input($field))
                ]);
            }
        }
        
        // Ensure academic_year is properly formatted if present
        if ($this->has('academic_year')) {
            $academicYear = $this->input('academic_year');
            
            // If year contains a single year, try to convert to YYYY-YYYY format
            if (preg_match('/^\d{4}$/', $academicYear)) {
                $nextYear = intval($academicYear) + 1;
                $this->merge([
                    'academic_year' => $academicYear . '-' . $nextYear
                ]);
            }
        }
    }
}