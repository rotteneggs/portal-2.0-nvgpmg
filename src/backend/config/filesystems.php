<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application. Just store away!
    |
    */

    'default' => env('FILESYSTEM_DISK', 's3'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Here you may configure as many filesystem "disks" as you wish, and you
    | may even configure multiple disks of the same driver. Defaults have
    | been set up for each driver as an example of the required values.
    |
    | Supported Drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => true,
            'options' => [
                'ServerSideEncryption' => 'AES256',
            ],
        ],
        
        'documents' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'bucket' => env('AWS_DOCUMENTS_BUCKET', env('AWS_BUCKET')),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => true,
            'options' => [
                'ServerSideEncryption' => 'AES256',
            ],
        ],
        
        'temporary' => [
            'driver' => 'local',
            'root' => storage_path('app/temp'),
            'throw' => false,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
    
    /*
    |--------------------------------------------------------------------------
    | Document Types
    |--------------------------------------------------------------------------
    |
    | Here you may configure the folder structure for different document types.
    | This mapping is used to organize uploaded documents in the appropriate
    | directories based on their type.
    |
    */
    
    'document_types' => [
        'transcript' => 'transcripts',
        'identification' => 'identification',
        'recommendation' => 'recommendations',
        'personal_statement' => 'personal_statements',
        'financial' => 'financial',
        'other' => 'other_documents',
    ],
    
    /*
    |--------------------------------------------------------------------------
    | Allowed MIME Types
    |--------------------------------------------------------------------------
    |
    | Here you may configure the allowed MIME types for different file categories.
    | This ensures that only appropriate file types can be uploaded for each
    | purpose.
    |
    */
    
    'allowed_mime_types' => [
        'documents' => [
            'application/pdf',
            'image/jpeg',
            'image/png',
        ],
        'attachments' => [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        'financial_aid' => [
            'application/pdf',
            'image/jpeg',
            'image/png',
        ],
    ],
    
    /*
    |--------------------------------------------------------------------------
    | Maximum File Sizes
    |--------------------------------------------------------------------------
    |
    | Here you may configure the maximum file sizes (in KB) for different
    | file categories. This helps prevent excessively large files from
    | being uploaded and consuming too much storage.
    |
    */
    
    'max_file_sizes' => [
        'documents' => 10240,      // 10MB
        'attachments' => 5120,     // 5MB
        'financial_aid' => 10240,  // 10MB
    ],
];