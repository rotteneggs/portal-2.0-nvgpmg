<?php

return [
    /*
    |--------------------------------------------------------------------------
    | External Integration Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains configuration for external system integrations used
    | by the Student Admissions Enrollment Platform. This includes settings
    | for SIS, LMS, payment gateways, communication services, and more.
    |
    */

    // Student Information System (SIS) integration
    'sis' => [
        'enabled' => true,
        'provider' => 'default', // default, banner, peoplesoft, etc.
        'api_url' => env('SIS_API_URL'),
        'api_key' => env('SIS_API_KEY'),
        'api_secret' => env('SIS_API_SECRET'),
        'timeout' => 30, // Request timeout in seconds
        'retry_attempts' => 3, // Number of retry attempts for failed requests
        'retry_delay' => 5, // Delay between retry attempts in seconds
        'endpoints' => [
            'students' => '/api/students',
            'courses' => '/api/courses',
            'enrollments' => '/api/enrollments',
            'programs' => '/api/programs',
            'terms' => '/api/terms',
        ],
        'field_mappings' => [
            'student_id' => 'sis_student_id',
            'first_name' => 'first_name',
            'last_name' => 'last_name',
            'email' => 'email',
            'phone' => 'phone_number',
            'address' => 'address_line1',
            'city' => 'city',
            'state' => 'state',
            'postal_code' => 'zip_code',
            'country' => 'country',
            'date_of_birth' => 'birth_date',
            'gender' => 'gender',
            'ethnicity' => 'ethnicity',
            'citizenship' => 'citizenship_status',
        ],
        'sync_schedule' => 'daily', // How often to synchronize data with SIS
        'webhook_secret' => env('SIS_WEBHOOK_SECRET'),
    ],

    // Learning Management System (LMS) integration
    'lms' => [
        'enabled' => true,
        'provider' => 'canvas', // canvas, moodle, blackboard, etc.
        'api_url' => env('LMS_API_URL'),
        'api_key' => env('LMS_API_KEY'),
        'api_secret' => env('LMS_API_SECRET'),
        'timeout' => 30, // Request timeout in seconds
        'retry_attempts' => 3, // Number of retry attempts for failed requests
        'retry_delay' => 5, // Delay between retry attempts in seconds
        'endpoints' => [
            'users' => '/api/v1/users',
            'courses' => '/api/v1/courses',
            'enrollments' => '/api/v1/enrollments',
            'sections' => '/api/v1/sections',
            'accounts' => '/api/v1/accounts',
        ],
        'sso' => [
            'enabled' => true,
            'protocol' => 'oauth2', // oauth2, saml, lti
            'client_id' => env('LMS_SSO_CLIENT_ID'),
            'client_secret' => env('LMS_SSO_CLIENT_SECRET'),
            'authorize_url' => env('LMS_SSO_AUTHORIZE_URL'),
            'token_url' => env('LMS_SSO_TOKEN_URL'),
            'redirect_uri' => env('LMS_SSO_REDIRECT_URI'),
            'scope' => 'read,write',
        ],
        'orientation_course_id' => env('LMS_ORIENTATION_COURSE_ID'),
    ],

    // Payment gateway integration
    'payment' => [
        'enabled' => true,
        'provider' => 'stripe', // stripe, paypal, etc.
        'sandbox_mode' => env('PAYMENT_SANDBOX_MODE', true),
        'providers' => [
            'stripe' => [
                'public_key' => env('STRIPE_PUBLIC_KEY'),
                'secret_key' => env('STRIPE_SECRET_KEY'),
                'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
                'payment_methods' => ['card', 'bank_transfer'],
                'statement_descriptor' => env('STRIPE_STATEMENT_DESCRIPTOR', 'ADMISSIONS'),
                'capture_method' => 'automatic', // automatic or manual
            ],
            'paypal' => [
                'client_id' => env('PAYPAL_CLIENT_ID'),
                'client_secret' => env('PAYPAL_CLIENT_SECRET'),
                'webhook_id' => env('PAYPAL_WEBHOOK_ID'),
                'return_url' => env('PAYPAL_RETURN_URL'),
                'cancel_url' => env('PAYPAL_CANCEL_URL'),
                'currency' => 'USD',
            ],
        ],
        'payment_types' => [
            'application_fee' => [
                'name' => 'Application Fee',
                'amount' => env('APPLICATION_FEE_AMOUNT', 75.00),
                'description' => 'Fee for processing your application',
                'refundable' => false,
            ],
            'enrollment_deposit' => [
                'name' => 'Enrollment Deposit',
                'amount' => env('ENROLLMENT_DEPOSIT_AMOUNT', 500.00),
                'description' => 'Deposit to secure your enrollment',
                'refundable' => true,
                'refund_policy' => 'Full refund if cancelled before May 1.',
            ],
        ],
        'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET'),
    ],

    // Email service integration
    'email' => [
        'enabled' => true,
        'provider' => 'smtp', // smtp, mailgun, sendgrid, etc.
        'from_address' => env('MAIL_FROM_ADDRESS'),
        'from_name' => env('MAIL_FROM_NAME'),
        'tracking_enabled' => true,
        'templates' => [
            'application_confirmation' => [
                'subject' => 'Application Received',
                'view' => 'emails.application.confirmation',
            ],
            'document_verification' => [
                'subject' => 'Document Verification Status',
                'view' => 'emails.documents.verification',
            ],
            'admission_decision' => [
                'subject' => 'Admission Decision',
                'view' => 'emails.admission.decision',
            ],
            'password_reset' => [
                'subject' => 'Reset Your Password',
                'view' => 'emails.auth.password_reset',
            ],
            'payment_confirmation' => [
                'subject' => 'Payment Confirmation',
                'view' => 'emails.payment.confirmation',
            ],
        ],
        'mailgun' => [
            'domain' => env('MAILGUN_DOMAIN'),
            'secret' => env('MAILGUN_SECRET'),
            'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
            'tracking' => [
                'opens' => true,
                'clicks' => true,
            ],
            'subaccount' => env('MAILGUN_SUBACCOUNT'),
        ],
        'sendgrid' => [
            'api_key' => env('SENDGRID_API_KEY'),
            'template_id' => env('SENDGRID_TEMPLATE_ID'),
            'tracking' => [
                'opens' => true,
                'clicks' => true,
            ],
            'categories' => ['admissions', 'enrollment'],
        ],
    ],

    // SMS service integration
    'sms' => [
        'enabled' => true,
        'provider' => 'twilio', // twilio, vonage, etc.
        'from_number' => env('SMS_FROM_NUMBER'),
        'templates' => [
            'application_confirmation' => 'Your application has been received. Reference: {{reference_number}}',
            'document_verification' => 'Your document {{document_name}} has been {{status}}.',
            'admission_decision' => 'A decision has been made on your application. Log in to view details.',
            'password_reset' => 'Your password reset code is {{code}}',
            'payment_confirmation' => 'Payment of {{amount}} received for {{payment_type}}. Reference: {{reference_number}}',
        ],
        'twilio' => [
            'account_sid' => env('TWILIO_ACCOUNT_SID'),
            'auth_token' => env('TWILIO_AUTH_TOKEN'),
            'verify_sid' => env('TWILIO_VERIFY_SID'),
        ],
        'vonage' => [
            'api_key' => env('VONAGE_API_KEY'),
            'api_secret' => env('VONAGE_API_SECRET'),
            'from' => env('VONAGE_SMS_FROM'),
        ],
    ],

    // Document verification service integration
    'document_verification' => [
        'enabled' => true,
        'provider' => 'default', // default or specific provider name
        'api_url' => env('DOC_VERIFY_API_URL'),
        'api_key' => env('DOC_VERIFY_API_KEY'),
        'timeout' => 60, // Request timeout in seconds
        'supported_document_types' => [
            'transcript' => [
                'name' => 'Academic Transcript',
                'verification_level' => 'detailed', // basic, standard, detailed
                'fields' => ['institution', 'student_name', 'completion_date', 'gpa', 'courses'],
            ],
            'id_document' => [
                'name' => 'Government ID',
                'verification_level' => 'detailed',
                'fields' => ['document_type', 'document_number', 'name', 'date_of_birth', 'expiry_date'],
            ],
            'recommendation_letter' => [
                'name' => 'Recommendation Letter',
                'verification_level' => 'basic',
                'fields' => ['author', 'institution', 'date'],
            ],
            'financial_document' => [
                'name' => 'Financial Document',
                'verification_level' => 'standard',
                'fields' => ['institution', 'account_holder', 'date', 'amount'],
            ],
        ],
        'webhook_secret' => env('DOC_VERIFY_WEBHOOK_SECRET'),
    ],

    // Integration logging configuration
    'logging' => [
        'enabled' => true,
        'level' => 'info', // debug, info, notice, warning, error, critical, alert, emergency
        'channel' => 'integration',
        'retention_days' => 30,
        'sensitive_fields' => [
            'password',
            'api_key',
            'api_secret',
            'auth_token',
            'secret_key',
            'client_secret',
            'webhook_secret',
            'ssn',
            'credit_card',
            'bank_account',
        ],
    ],
];