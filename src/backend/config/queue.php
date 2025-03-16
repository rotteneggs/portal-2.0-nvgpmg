<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Queue Connection Name
    |--------------------------------------------------------------------------
    |
    | Laravel's queue API supports an assortment of back-ends via a single
    | API, giving you convenient access to each back-end using the same
    | syntax for every one. Here you may define a default connection.
    |
    */

    'default' => env('QUEUE_CONNECTION', 'redis'),

    /*
    |--------------------------------------------------------------------------
    | Queue Connections
    |--------------------------------------------------------------------------
    |
    | Here you may configure the connection information for each server that
    | is used by your application. A default configuration has been added
    | for each back-end shipped with Laravel. You are free to add more.
    |
    | Drivers: "sync", "database", "redis", "beanstalkd", "sqs", "null"
    |
    */

    'connections' => [
        'sync' => [
            'driver' => 'sync',
            // Synchronous driver that processes jobs immediately (used primarily for testing)
        ],

        'database' => [
            'driver' => 'database',
            'table' => 'jobs',
            'queue' => 'default',
            'retry_after' => 90,
            'after_commit' => true,
            // Database driver that stores jobs in a database table
        ],

        'redis' => [
            'driver' => 'redis',
            'connection' => 'queue',
            'queue' => 'default',
            'retry_after' => 90,
            'block_for' => null,
            'after_commit' => true,
            // Redis driver for high-performance queue processing
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Failed Queue Jobs
    |--------------------------------------------------------------------------
    |
    | These options configure the behavior of failed queue job logging so you
    | can control which database and table are used to store the jobs that
    | have failed. You may change them to any database / table you wish.
    |
    */

    'failed' => [
        'driver' => 'database-uuids',
        'database' => 'mysql',
        'table' => 'failed_jobs',
        // Configuration for storing failed jobs for later inspection and retry
    ],

    /*
    |--------------------------------------------------------------------------
    | Job Batching
    |--------------------------------------------------------------------------
    |
    | The following options configure the database and table that store job
    | batching information. These options can be updated to any database
    | connection and table which has been defined by your application.
    |
    */

    'batching' => [
        'database' => 'mysql',
        'table' => 'job_batches',
        // Configuration for job batching functionality
    ],

    /*
    |--------------------------------------------------------------------------
    | Queue Workers Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure the number of workers for different queue types.
    | Workers can be assigned to specific queues to optimize resource usage
    | and processing efficiency for different types of jobs.
    |
    */

    'workers' => [
        'default' => [
            'processes' => env('QUEUE_WORKERS', 2),
            'queues' => ['default', 'emails', 'notifications'],
            // General-purpose workers for most background tasks
        ],
        'documents' => [
            'processes' => env('DOCUMENT_QUEUE_WORKERS', 2),
            'queues' => ['documents'],
            // Dedicated workers for resource-intensive document processing
        ],
        'integrations' => [
            'processes' => env('INTEGRATION_QUEUE_WORKERS', 1),
            'queues' => ['integrations'],
            // Workers for external system integrations
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Queue Priorities
    |--------------------------------------------------------------------------
    |
    | Define the priority levels for different queue types. Higher priority
    | queues will be processed before lower priority ones when using the
    | queue:work command with multiple queue names.
    |
    */

    'priorities' => [
        'high' => ['notifications', 'payments'],
        'medium' => ['default', 'emails'],
        'low' => ['reports', 'cleanup'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Laravel Horizon Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for Laravel Horizon version 5.x which provides a beautiful
    | dashboard for monitoring and managing Redis queues in the application.
    |
    */

    'horizon' => [
        'enabled' => env('HORIZON_ENABLED', true),
        'dashboard_auth' => env('HORIZON_DASHBOARD_AUTH', true),
        'notification_email' => env('HORIZON_NOTIFICATION_EMAIL', 'admin@example.com'),
        'metrics_retention_period' => env('HORIZON_METRICS_RETENTION_PERIOD', 1440), // in minutes
    ],

    /*
    |--------------------------------------------------------------------------
    | Retry Strategies
    |--------------------------------------------------------------------------
    |
    | Define custom retry strategies for different job types. These settings
    | control how many times a job should be retried before being considered
    | failed, and the backoff time between retry attempts.
    |
    */

    'retry_strategies' => [
        'default' => [
            'max_attempts' => 3,
            'backoff' => 60, // seconds
        ],
        'document_verification' => [
            'max_attempts' => 5,
            'backoff' => [60, 300, 600, 1800], // increasing backoff in seconds
        ],
        'external_integrations' => [
            'max_attempts' => 10,
            'backoff' => [60, 120, 300, 600, 1800, 3600], // increasing backoff in seconds
        ],
    ],
];