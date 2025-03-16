<?php

use Monolog\Handler\NullHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\SyslogUdpHandler;
use Monolog\Processor\PsrLogMessageProcessor;
use Monolog\Formatter\JsonFormatter;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Log Channel
    |--------------------------------------------------------------------------
    |
    | This option defines the default log channel that gets used when writing
    | messages to the logs. The name specified in this option should match
    | one of the channels defined in the "channels" configuration array.
    |
    */

    'default' => env('LOG_CHANNEL', 'stack'),

    /*
    |--------------------------------------------------------------------------
    | Deprecations Log Channel
    |--------------------------------------------------------------------------
    |
    | This option controls the log channel that should be used to log warnings
    | regarding deprecated PHP and library features. This allows you to get
    | your application ready for upcoming major versions of dependencies.
    |
    */

    'deprecations' => env('LOG_DEPRECATIONS_CHANNEL', 'null'),

    /*
    |--------------------------------------------------------------------------
    | Log Channels
    |--------------------------------------------------------------------------
    |
    | Here you may configure the log channels for your application. Out of
    | the box, Laravel uses the Monolog PHP logging library. This gives
    | you a variety of powerful log handlers / formatters to utilize.
    |
    | Available Drivers: "single", "daily", "slack", "syslog",
    |                    "errorlog", "monolog", "custom", "stack"
    |
    */

    'channels' => [
        // Stack channel that sends logs to multiple channels
        'stack' => [
            'driver' => 'stack',
            'channels' => ['daily', 'slack'],
            'ignore_exceptions' => false,
        ],

        // Single file log channel
        'single' => [
            'driver' => 'single',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        // Daily rotating log files
        'daily' => [
            'driver' => 'daily',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'days' => 14,
            'replace_placeholders' => true,
        ],

        // Slack notification channel for critical errors
        'slack' => [
            'driver' => 'slack',
            'url' => env('LOG_SLACK_WEBHOOK_URL'),
            'username' => 'Student Admissions Error',
            'emoji' => ':boom:',
            'level' => 'critical',
        ],

        // Papertrail log service integration
        'papertrail' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => SyslogUdpHandler::class,
            'handler_with' => [
                'host' => env('PAPERTRAIL_URL'),
                'port' => env('PAPERTRAIL_PORT'),
            ],
        ],

        // Standard error output channel with JSON formatting
        'stderr' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => StreamHandler::class,
            'formatter' => JsonFormatter::class,
            'with' => [
                'stream' => 'php://stderr',
            ],
        ],

        // System log channel
        'syslog' => [
            'driver' => 'syslog',
            'level' => env('LOG_LEVEL', 'debug'),
            'facility' => 'local6',
            'replace_placeholders' => true,
        ],

        // Error log channel using PHP's error_log function
        'errorlog' => [
            'driver' => 'errorlog',
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        // Null channel that discards all logs
        'null' => [
            'driver' => 'monolog',
            'handler' => NullHandler::class,
        ],

        // Emergency-only log channel
        'emergency' => [
            'driver' => 'single',
            'path' => storage_path('logs/emergency.log'),
            'level' => 'emergency',
        ],

        // Security events log channel with extended retention for compliance
        'security' => [
            'driver' => 'daily',
            'path' => storage_path('logs/security.log'),
            'level' => 'info',
            'days' => 365,
            'formatter' => JsonFormatter::class,
        ],

        // Audit log channel with 2-year retention for compliance requirements
        'audit' => [
            'driver' => 'daily',
            'path' => storage_path('logs/audit.log'),
            'level' => 'info',
            'days' => 730,
            'formatter' => JsonFormatter::class,
        ],

        // Application-specific log channel for business events
        'application' => [
            'driver' => 'daily',
            'path' => storage_path('logs/application.log'),
            'level' => 'debug',
            'days' => 30,
            'formatter' => JsonFormatter::class,
        ],

        // Integration log channel for external system interactions
        'integration' => [
            'driver' => 'daily',
            'path' => storage_path('logs/integration.log'),
            'level' => 'debug',
            'days' => 60,
            'formatter' => JsonFormatter::class,
        ],

        // Queue processing log channel
        'queue' => [
            'driver' => 'daily',
            'path' => storage_path('logs/queue.log'),
            'level' => 'debug',
            'days' => 14,
            'formatter' => JsonFormatter::class,
        ],
    ],
];