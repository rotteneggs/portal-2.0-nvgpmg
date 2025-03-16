<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Payment Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains the configuration settings for payment processing in the
    | Student Admissions Enrollment Platform. It defines payment providers,
    | gateway configurations, payment types, and supported payment methods.
    |
    */

    'description' => 'Main configuration array for payment settings',
    
    // Default payment provider to use
    'default_provider' => 'stripe',

    /*
    |--------------------------------------------------------------------------
    | Payment Providers
    |--------------------------------------------------------------------------
    |
    | Configure the payment gateway providers supported by the application.
    | Each provider has its own configuration settings.
    |
    */
    'providers' => [
        'stripe' => [
            'description' => 'Stripe payment gateway configuration',
            'api_key' => env('STRIPE_SECRET_KEY'),
            'public_key' => env('STRIPE_PUBLIC_KEY'),
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
            'sandbox_mode' => env('PAYMENT_SANDBOX_MODE', true),
            'supported_payment_methods' => [
                'credit_card',
                'debit_card',
                'bank_transfer',
                'apple_pay',
                'google_pay',
            ],
            'currency' => 'USD',
            'statement_descriptor' => 'Institution Admissions',
        ],
        'paypal' => [
            'description' => 'PayPal payment gateway configuration',
            'client_id' => env('PAYPAL_CLIENT_ID'),
            'client_secret' => env('PAYPAL_CLIENT_SECRET'),
            'sandbox_mode' => env('PAYMENT_SANDBOX_MODE', true),
            'supported_payment_methods' => [
                'paypal',
                'credit_card',
                'venmo',
            ],
            'currency' => 'USD',
            'return_url' => env('APP_URL') . '/payments/paypal/return',
            'cancel_url' => env('APP_URL') . '/payments/paypal/cancel',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment Types
    |--------------------------------------------------------------------------
    |
    | Define the types of payments accepted by the application.
    | Each payment type has its own configuration.
    |
    */
    'payment_types' => [
        'application_fee' => [
            'description' => 'Application submission fee',
            'amount' => 75.0,
            'currency' => 'USD',
            'supported_providers' => ['stripe', 'paypal'],
            'supported_payment_methods' => [
                'credit_card',
                'debit_card',
                'paypal',
            ],
            'refundable' => true,
            'refund_period_days' => 30,
            'partial_refund_allowed' => false,
        ],
        'enrollment_deposit' => [
            'description' => 'Enrollment confirmation deposit',
            'amount' => 500.0,
            'currency' => 'USD',
            'supported_providers' => ['stripe', 'paypal'],
            'supported_payment_methods' => [
                'credit_card',
                'debit_card',
                'bank_transfer',
                'paypal',
            ],
            'refundable' => true,
            'refund_period_days' => 60,
            'partial_refund_allowed' => true,
        ],
        'tuition_payment' => [
            'description' => 'Tuition payment',
            'amount' => null, // Variable amount, set at runtime
            'currency' => 'USD',
            'supported_providers' => ['stripe', 'paypal'],
            'supported_payment_methods' => [
                'credit_card',
                'debit_card',
                'bank_transfer',
                'paypal',
            ],
            'refundable' => true,
            'refund_period_days' => 90,
            'partial_refund_allowed' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment Methods
    |--------------------------------------------------------------------------
    |
    | Define the payment methods available in the application,
    | including display information and validation rules.
    |
    */
    'payment_methods' => [
        'credit_card' => [
            'display_name' => 'Credit Card',
            'icon' => 'credit-card',
            'fields' => [
                'card_number',
                'expiry_date',
                'cvv',
                'cardholder_name',
                'billing_address',
            ],
            'validation_rules' => [
                'card_number' => 'required|string|min:13|max:19',
                'expiry_date' => 'required|string|size:5',
                'cvv' => 'required|string|min:3|max:4',
                'cardholder_name' => 'required|string|max:255',
                'billing_address' => 'required|array',
            ],
        ],
        'debit_card' => [
            'display_name' => 'Debit Card',
            'icon' => 'debit-card',
            'fields' => [
                'card_number',
                'expiry_date',
                'cvv',
                'cardholder_name',
                'billing_address',
            ],
            'validation_rules' => [
                'card_number' => 'required|string|min:13|max:19',
                'expiry_date' => 'required|string|size:5',
                'cvv' => 'required|string|min:3|max:4',
                'cardholder_name' => 'required|string|max:255',
                'billing_address' => 'required|array',
            ],
        ],
        'bank_transfer' => [
            'display_name' => 'Bank Transfer (ACH)',
            'icon' => 'bank',
            'fields' => [
                'account_holder_name',
                'account_number',
                'routing_number',
                'account_type',
            ],
            'validation_rules' => [
                'account_holder_name' => 'required|string|max:255',
                'account_number' => 'required|string|min:4|max:17',
                'routing_number' => 'required|string|size:9',
                'account_type' => 'required|in:checking,savings',
            ],
        ],
        'paypal' => [
            'display_name' => 'PayPal',
            'icon' => 'paypal',
            'fields' => [],
            'validation_rules' => [],
        ],
        'apple_pay' => [
            'display_name' => 'Apple Pay',
            'icon' => 'apple-pay',
            'fields' => [],
            'validation_rules' => [],
        ],
        'google_pay' => [
            'display_name' => 'Google Pay',
            'icon' => 'google-pay',
            'fields' => [],
            'validation_rules' => [],
        ],
        'venmo' => [
            'display_name' => 'Venmo',
            'icon' => 'venmo',
            'fields' => [],
            'validation_rules' => [],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Receipt Settings
    |--------------------------------------------------------------------------
    |
    | Configure settings for payment receipts.
    |
    */
    'receipt_settings' => [
        'include_institution_logo' => true,
        'include_institution_address' => true,
        'include_payment_details' => true,
        'include_application_details' => true,
        'receipt_number_prefix' => 'RCPT-',
        'receipt_email_template' => 'emails.payment_receipt',
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment Security
    |--------------------------------------------------------------------------
    |
    | Configuration for payment security features.
    |
    */
    'security' => [
        'encrypt_payment_data' => true,
        'store_payment_methods' => false, // For PCI compliance, avoid storing payment data
        'pci_compliance_level' => 'SAQ A-EP',
        'fraud_detection' => [
            'enabled' => true,
            'max_attempts' => 5,
            'block_period_minutes' => 30,
            'high_risk_countries' => [],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment Notifications
    |--------------------------------------------------------------------------
    |
    | Configure notification settings for payment events.
    |
    */
    'notifications' => [
        'payment_success' => [
            'email' => true,
            'sms' => false,
            'in_app' => true,
            'template' => 'payment_success',
        ],
        'payment_failure' => [
            'email' => true,
            'sms' => false,
            'in_app' => true,
            'template' => 'payment_failure',
        ],
        'refund_processed' => [
            'email' => true,
            'sms' => false,
            'in_app' => true,
            'template' => 'refund_processed',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment Logging
    |--------------------------------------------------------------------------
    |
    | Configure logging settings for payment-related activities.
    |
    */
    'logging' => [
        'payment_attempts' => true,
        'payment_success' => true,
        'payment_failure' => true,
        'refund_requests' => true,
        'sensitive_fields' => [
            'card_number',
            'cvv',
            'account_number',
            'routing_number',
        ],
    ],
];