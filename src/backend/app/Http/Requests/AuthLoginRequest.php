<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest; // Laravel's form request validation class ^10.0

class AuthLoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        // Allow anyone to attempt to login
        return true;
    }

    /**
     * Get the validation rules that apply to the login request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember_me' => ['boolean'],
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
            'email.required' => 'Please enter your email address.',
            'email.email' => 'Please enter a valid email address.',
            'password.required' => 'Please enter your password.',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation()
    {
        if ($this->has('email')) {
            $this->merge([
                'email' => trim($this->email),
            ]);
        }

        if ($this->has('remember_me')) {
            $this->merge([
                'remember_me' => (bool) $this->remember_me,
            ]);
        }
    }
}