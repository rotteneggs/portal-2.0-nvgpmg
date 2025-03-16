<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest; // Laravel's form request validation class, version ^10.0
use Illuminate\Validation\Rule; // For creating complex validation rules, version ^10.0

class AuthRegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        // Anyone can register, so this is always true
        return true;
    }

    /**
     * Get the validation rules that apply to the registration request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            // Email must be valid, unique in users table
            'email' => ['required', 'string', 'email', Rule::unique('users', 'email')],
            
            // Password requirements based on security specifications
            'password' => [
                'required', 
                'string', 
                'min:12', 
                'confirmed',
                // Must have at least one uppercase letter, one lowercase letter, 
                // one number, and one special character
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/',
            ],
            'password_confirmation' => ['required'],
            
            // Personal information
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            
            // Contact information
            'phone_number' => ['nullable', 'string', 'max:20'],
            
            // Address information (all optional)
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],
            
            // Terms of service must be accepted
            'terms_accepted' => ['required', 'boolean', 'accepted'],
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
            'email.required' => 'An email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email address is already registered.',
            
            'password.required' => 'A password is required.',
            'password.min' => 'Your password must be at least 12 characters long.',
            'password.confirmed' => 'The password confirmation does not match.',
            'password.regex' => 'Your password must include at least one uppercase letter, one lowercase letter, one number, and one special character.',
            
            'first_name.required' => 'Please provide your first name.',
            'last_name.required' => 'Please provide your last name.',
            
            'date_of_birth.before' => 'Date of birth must be a date in the past.',
            
            'terms_accepted.accepted' => 'You must accept the Terms of Service and Privacy Policy to register.',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation()
    {
        // Trim whitespace from inputs where appropriate
        if ($this->has('email')) {
            $this->merge([
                'email' => trim($this->email),
            ]);
        }
        
        if ($this->has('first_name')) {
            $this->merge([
                'first_name' => trim($this->first_name),
            ]);
        }
        
        if ($this->has('last_name')) {
            $this->merge([
                'last_name' => trim($this->last_name),
            ]);
        }
        
        // Ensure terms_accepted is treated as boolean
        if ($this->has('terms_accepted')) {
            $this->merge([
                'terms_accepted' => (bool) $this->terms_accepted,
            ]);
        }
        
        // Format phone number if provided
        if ($this->has('phone_number') && $this->phone_number) {
            $this->merge([
                'phone_number' => preg_replace('/[^0-9+()-]/', '', $this->phone_number),
            ]);
        }
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array
     */
    public function attributes()
    {
        return [
            'email' => 'email address',
            'password' => 'password',
            'password_confirmation' => 'password confirmation',
            'first_name' => 'first name',
            'last_name' => 'last name',
            'date_of_birth' => 'date of birth',
            'phone_number' => 'phone number',
            'address_line1' => 'address line 1',
            'address_line2' => 'address line 2',
            'city' => 'city',
            'state' => 'state/province',
            'postal_code' => 'postal/zip code',
            'country' => 'country',
            'terms_accepted' => 'terms and conditions',
        ];
    }
}