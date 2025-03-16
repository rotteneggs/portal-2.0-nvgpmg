<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | This option controls the default mailer that is used to send any email
    | messages sent by your application. Alternative mailers may be setup
    | and used as needed; however, this mailer will be used by default.
    |
    */

    'default' => env('MAIL_MAILER', 'smtp'),

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | Here you may configure all of the mailers used by your application plus
    | their respective settings. Several examples have been configured for
    | you and you are free to add your own as your application requires.
    |
    | Laravel supports a variety of mail "transport" drivers to be used while
    | sending an e-mail. You will specify which one you are using for your
    | mailers below. You are free to add additional mailers as required.
    |
    | Supported: "smtp", "sendmail", "mailgun", "ses",
    |            "postmark", "log", "array", "failover"
    |
    */

    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'host' => env('MAIL_HOST', 'smtp.mailgun.org'),
            'port' => env('MAIL_PORT', 587),
            'encryption' => env('MAIL_ENCRYPTION', 'tls'),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
            'auth_mode' => null,
            'verify_peer' => true,
        ],

        'ses' => [
            'transport' => 'ses',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
        ],

        'mailgun' => [
            'transport' => 'mailgun',
            'domain' => env('MAILGUN_DOMAIN'),
            'secret' => env('MAILGUN_SECRET'),
            'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        ],

        'sendgrid' => [
            'transport' => 'sendgrid',
            'api_key' => env('SENDGRID_API_KEY'),
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    |
    | You may wish for all e-mails sent by your application to be sent from
    | the same address. Here, you may specify a name and address that is
    | used globally for all e-mails that are sent by your application.
    |
    */

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'admissions@institution.edu'),
        'name' => env('MAIL_FROM_NAME', 'Student Admissions'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Global "Reply-To" Address
    |--------------------------------------------------------------------------
    |
    | You may wish for all e-mails sent by your application to have a default
    | reply-to address. Here, you may specify a name and address that is
    | used for all reply-to configurations in your application.
    |
    */

    'reply_to' => [
        'address' => env('MAIL_REPLY_TO_ADDRESS', 'admissions@institution.edu'),
        'name' => env('MAIL_REPLY_TO_NAME', 'Admissions Office'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Markdown Mail Settings
    |--------------------------------------------------------------------------
    |
    | If you are using Markdown based email rendering, you may configure your
    | theme and component paths here, allowing you to customize the design
    | of the emails. Or, you may simply stick with the Laravel defaults!
    |
    */

    'markdown' => [
        'theme' => 'default',
        'paths' => [
            resource_path('views/vendor/mail'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Email Templates
    |--------------------------------------------------------------------------
    |
    | This section defines the configuration for email templates used by the
    | EmailService to send various types of notifications to users throughout
    | the admissions process, including confirmations and status updates.
    |
    */

    'templates' => [
        'application_confirmation' => [
            'view' => 'emails.application_confirmation',
            'subject' => 'Application Submission Confirmation',
        ],
        'document_verified' => [
            'view' => 'emails.document_verified',
            'subject' => 'Document Verification Update',
        ],
        'status_update' => [
            'view' => 'emails.status_update',
            'subject' => 'Application Status Update',
        ],
        'decision_notification' => [
            'view' => 'emails.decision_notification',
            'subject' => 'Admissions Decision',
        ],
        'message_notification' => [
            'view' => 'emails.message_notification',
            'subject' => 'New Message Received',
        ],
        'payment_receipt' => [
            'view' => 'emails.payment_receipt',
            'subject' => 'Payment Confirmation',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Email Tracking Settings
    |--------------------------------------------------------------------------
    |
    | This section configures email tracking features such as open rate tracking
    | and link tracking for analytics and effectiveness monitoring. This helps
    | measure engagement with important communications.
    |
    */

    'tracking' => [
        'enabled' => true,
        'pixel_url' => env('MAIL_TRACKING_PIXEL_URL', null),
        'link_tracking' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Queue Configuration
    |--------------------------------------------------------------------------
    |
    | Many emails can be sent quickly, others include potentially slow code
    | like API requests to third-party services. Queueing emails allows
    | long-running emails to be sent in the background, improving application
    | responsiveness.
    |
    */

    'queue' => [
        'enabled' => true,
        'connection' => env('MAIL_QUEUE_CONNECTION', 'redis'),
        'queue' => env('MAIL_QUEUE', 'emails'),
        'tries' => 3,
        'timeout' => 60,
    ],

    /*
    |--------------------------------------------------------------------------
    | Log Channel
    |--------------------------------------------------------------------------
    |
    | If you are using the "log" driver for mail, this option determines which
    | log channel will be used for writing email log messages. This is also
    | useful for debugging email delivery issues.
    |
    */

    'log_channel' => env('MAIL_LOG_CHANNEL', 'stack'),
];