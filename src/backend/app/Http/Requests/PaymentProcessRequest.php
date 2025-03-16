<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest; // illuminate/foundation/http ^10.0 - Laravel's base form request class for validation and authorization
use Illuminate\Validation\Rule; // illuminate/validation ^10.0 - Laravel's validation rule builder for complex validation rules
use Illuminate\Support\Facades\Auth; // illuminate/support/facades ^10.0 - Laravel's authentication facade to access the authenticated user
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0 - Laravel's configuration facade to access payment configuration
use App\Services\PaymentService; // Access payment service methods for validating payment types and methods

class PaymentProcessRequest extends FormRequest
{
    /**
     * @var PaymentService
     */
    protected PaymentService $paymentService;

    /**
     * Create a new payment process request instance
     *
     * @param PaymentService $paymentService
     */
    public function __construct(PaymentService $paymentService)
    {
        parent::__construct();

        // Assign the payment service to the protected property
        $this->paymentService = $paymentService;
    }

    /**
     * Determine if the user is authorized to make this request
     *
     * @return bool True if the user is authorized to process a payment
     */
    public function authorize(): bool
    {
        // Check if the user is authenticated
        return Auth::check();
    }

    /**
     * Get the validation rules that apply to the request
     *
     * @return array Array of validation rules for payment processing
     */
    public function rules(): array
    {
        // Define base validation rules for payment_type, payment_method, and amount
        $rules = [
            'payment_type' => ['required', 'string', Rule::in(array_keys(Config::get('payment.payment_types')))],
            'payment_method' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ];

        // Get payment type from request
        $paymentType = $this->input('payment_type');

        // If payment type is valid, get payment configuration
        if ($this->paymentService->validatePaymentType($paymentType)) {
            $paymentConfig = $this->paymentService->getPaymentConfig($paymentType);

            // Add application_id validation rule if payment is for an application
            if (isset($paymentConfig['requires_application']) && $paymentConfig['requires_application'] === true) {
                $rules['application_id'] = [
                    'required_if:payment_type,' . $paymentType,
                    'exists:applications,id,user_id,' . Auth::id(),
                ];
            }

            // Add payment method specific validation rules based on the selected payment method
            $paymentMethod = $this->input('payment_method');
            $paymentMethodRules = $this->getPaymentMethodRules($paymentMethod);
            $rules = array_merge($rules, $paymentMethodRules);
        }

        // Return the complete array of validation rules
        return $rules;
    }

    /**
     * Get custom validation error messages
     *
     * @return array Array of custom error messages for validation rules
     */
    public function messages(): array
    {
        // Define custom error messages for payment_type.required and payment_type.in
        $messages = [
            'payment_type.required' => 'The payment type is required.',
            'payment_type.in' => 'The selected payment type is invalid.',
        ];

        // Define custom error messages for payment_method.required and payment_method.in
        $messages['payment_method.required'] = 'The payment method is required.';
        $messages['payment_method.in'] = 'The selected payment method is invalid.';

        // Define custom error messages for amount.required, amount.numeric, and amount.min
        $messages['amount.required'] = 'The payment amount is required.';
        $messages['amount.numeric'] = 'The payment amount must be a number.';
        $messages['amount.min'] = 'The payment amount must be at least 0.01.';

        // Define custom error messages for application_id.required_if and application_id.exists
        $messages['application_id.required_if'] = 'The application ID is required for this payment type.';
        $messages['application_id.exists'] = 'The selected application is invalid.';

        // Define custom error messages for payment method specific fields
        $paymentMethod = $this->input('payment_method');
        $paymentMethodConfig = Config::get("payment.payment_methods.{$paymentMethod}.validation_messages", []);
        $messages = array_merge($messages, $paymentMethodConfig);

        // Return the complete array of custom error messages
        return $messages;
    }

    /**
     * Prepare the data for validation
     *
     * @return void No return value
     */
    protected function prepareForValidation(): void
    {
        // Format amount as a decimal if present
        if ($this->has('amount')) {
            $this->merge(['amount' => number_format($this->input('amount'), 2, '.', '')]);
        }

        // Ensure payment_data is an array if present
        if ($this->has('payment_data') && !is_array($this->input('payment_data'))) {
            $this->merge(['payment_data' => (array) $this->input('payment_data')]);
        }

        // Remove any sensitive payment data that shouldn't be stored (like CVV)
        $paymentMethod = $this->input('payment_method');
        $sensitiveFields = Config::get("payment.payment_methods.{$paymentMethod}.sensitive_fields", []);

        if ($this->has('payment_data') && is_array($this->input('payment_data'))) {
            $paymentData = $this->input('payment_data');
            foreach ($sensitiveFields as $field) {
                unset($paymentData[$field]);
            }
            $this->merge(['payment_data' => $paymentData]);
        }
    }

    /**
     * Configure the validator instance before validation
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void No return value
     */
    public function withValidator($validator): void
    {
        // Add custom validation rule to check if payment type is valid
        $validator->addRules([
            'payment_type' => [
                function ($attribute, $value, $fail) {
                    if (!$this->paymentService->validatePaymentType($value)) {
                        $fail('The selected payment type is invalid.');
                    }
                },
            ],
        ]);

        // Add custom validation rule to check if payment method is valid for the payment type
        $validator->addRules([
            'payment_method' => [
                function ($attribute, $value, $fail) {
                    $paymentType = $this->input('payment_type');
                    if (!$this->paymentService->validatePaymentMethod($value, $paymentType)) {
                        $fail('The selected payment method is invalid for the payment type.');
                    }
                },
            ],
        ]);

        // Add custom validation rule to check if application exists and belongs to the user if application_id is provided
         $validator->addRules([
            'application_id' => [
                function ($attribute, $value, $fail) {
                    if ($value && !empty($value)) {
                        $application = \App\Models\Application::where('id', $value)
                            ->where('user_id', Auth::id())
                            ->exists();

                        if (!$application) {
                            $fail('The selected application is invalid.');
                        }
                    }
                },
            ],
        ]);
    }

    /**
     * Get validation rules specific to the selected payment method
     *
     * @param  string  $paymentMethod
     * @return array Array of validation rules for the payment method
     */
    protected function getPaymentMethodRules(string $paymentMethod): array
    {
        // Get payment method configuration from config
        $paymentMethodConfig = Config::get("payment.payment_methods.{$paymentMethod}.validation_rules", []);

        // If payment method configuration exists and has validation rules, return those rules
        if ($paymentMethodConfig) {
            return $paymentMethodConfig;
        }

        // Otherwise return an empty array
        return [];
    }
}