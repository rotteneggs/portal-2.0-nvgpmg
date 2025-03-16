<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as email providers, payment processors, cloud storage, and other APIs
    | used by the Student Admissions Enrollment Platform.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Email Services
    |--------------------------------------------------------------------------
    |
    | Configure email service providers for sending transactional emails,
    | notifications, and communications to applicants and staff.
    |
    */

    'mailgun' => [ // Mailgun API v3.0
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => env('MAILGUN_SCHEME', 'https'),
    ],

    'postmark' => [ // Postmark API v1.0
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [ // Amazon SES API v2.0
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment Gateways
    |--------------------------------------------------------------------------
    |
    | Configure payment processors for handling application fees, enrollment
    | deposits, and other financial transactions securely.
    |
    */

    'stripe' => [ // Stripe API v2022-11-15
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook' => [
            'secret' => env('STRIPE_WEBHOOK_SECRET'),
            'tolerance' => 300, // Webhook signature tolerance in seconds
        ],
    ],

    'paypal' => [ // PayPal REST API v2.0
        'client_id' => env('PAYPAL_CLIENT_ID'),
        'client_secret' => env('PAYPAL_CLIENT_SECRET'),
        'sandbox' => env('PAYPAL_SANDBOX', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | SMS Services
    |--------------------------------------------------------------------------
    |
    | Configure SMS service providers for sending text notifications,
    | verification codes, and important alerts to applicants and staff.
    |
    */

    'twilio' => [ // Twilio API v2010-04-01
        'sid' => env('TWILIO_SID'),
        'token' => env('TWILIO_TOKEN'),
        'from' => env('TWILIO_FROM'),
    ],

    'vonage' => [ // Vonage API v2.0
        'key' => env('VONAGE_KEY'),
        'secret' => env('VONAGE_SECRET'),
        'from' => env('VONAGE_FROM'),
    ],

    /*
    |--------------------------------------------------------------------------
    | AWS Services
    |--------------------------------------------------------------------------
    |
    | Configure AWS services, including S3 for document storage, CloudFront
    | for content delivery, and other AWS services used by the platform.
    |
    */

    'aws' => [ // AWS SDK v3.0
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
        'bucket' => env('AWS_BUCKET'),
        'url' => env('AWS_URL'),
        'endpoint' => env('AWS_ENDPOINT'),
        'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | AI Services
    |--------------------------------------------------------------------------
    |
    | Configure AI services for document analysis, chatbot functionality,
    | and intelligent recommendations throughout the admissions process.
    |
    */

    'openai' => [ // OpenAI API v1.0
        'key' => env('OPENAI_API_KEY'),
        'organization' => env('OPENAI_ORGANIZATION'),
        'model' => env('OPENAI_MODEL', 'gpt-4'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Google Services
    |--------------------------------------------------------------------------
    |
    | Configure Google services including reCAPTCHA for form protection
    | and Google Analytics for user behavior tracking and analysis.
    |
    */

    'google' => [
        'recaptcha' => [ // Google reCAPTCHA v3.0
            'site_key' => env('GOOGLE_RECAPTCHA_SITE_KEY'),
            'secret_key' => env('GOOGLE_RECAPTCHA_SECRET_KEY'),
            'version' => env('GOOGLE_RECAPTCHA_VERSION', 'v3'),
        ],
        'analytics' => [ // Google Analytics v4.0
            'tracking_id' => env('GOOGLE_ANALYTICS_TRACKING_ID'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Monitoring and Error Tracking
    |--------------------------------------------------------------------------
    |
    | Configure services for application monitoring, error tracking, and
    | performance analysis to ensure system reliability and stability.
    |
    */

    'sentry' => [ // Sentry SDK v3.15
        'dsn' => env('SENTRY_DSN'),
        'traces_sample_rate' => env('SENTRY_TRACES_SAMPLE_RATE', 0.1),
    ],

    'new_relic' => [ // New Relic PHP Agent v9.21
        'license_key' => env('NEW_RELIC_LICENSE_KEY'),
        'app_name' => env('NEW_RELIC_APP_NAME', 'Student Admissions Enrollment Platform'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Document Verification
    |--------------------------------------------------------------------------
    |
    | Configure third-party services for document verification, identity
    | checking, and fraud detection for applicant-submitted materials.
    |
    */

    'document_verification' => [ // Custom integration v1.0
        'api_key' => env('DOC_VERIFY_API_KEY'),
        'api_url' => env('DOC_VERIFY_API_URL'),
        'webhook_secret' => env('DOC_VERIFY_WEBHOOK_SECRET'),
    ],
];