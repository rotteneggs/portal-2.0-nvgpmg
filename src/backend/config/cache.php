<?php

/**
 * Cache Configuration for Student Admissions Enrollment Platform
 *
 * This file defines the caching system configuration, with Redis 7.0+ as the
 * primary caching solution for high performance, scalability, and real-time features.
 * 
 * The platform implements a multi-level caching strategy to optimize performance:
 * - Page Cache: Rendered HTML fragments with tag-based invalidation (60 min TTL)
 * - Query Cache: Frequent database query results (15 min TTL)
 * - Application State: Status information and counters (30 min TTL)
 * - API Responses: External and internal API responses (variable TTL)
 *
 * Invalidation strategies include:
 * - Tag-based invalidation: Cache::tags(['user:'.$userId, 'applications'])->flush()
 * - Key-based invalidation: Cache::forget('application_'.$applicationId)
 * - Time-based expiration: Cache::put('key', $value, $minutes)
 * - Event-driven invalidation: Event listeners that clear relevant cache on data changes
 *
 * @version 1.0.0
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Default Cache Store
    |--------------------------------------------------------------------------
    |
    | This option controls the default cache connection that gets used while
    | using this caching library. This connection is used when another is
    | not explicitly specified when executing a given caching function.
    |
    | For the Student Admissions Enrollment Platform, we use Redis as the
    | primary cache driver for high performance, scalability, and real-time
    | features.
    |
    */

    'default' => env('CACHE_DRIVER', 'redis'),

    /*
    |--------------------------------------------------------------------------
    | Cache Stores
    |--------------------------------------------------------------------------
    |
    | Here you may define all of the cache "stores" for your application as
    | well as their drivers. You may even define multiple stores for the
    | same cache driver to group types of items stored in your caches.
    |
    | Supported drivers: "apc", "array", "database", "file",
    |         "memcached", "redis", "dynamodb", "octane", "null"
    |
    */

    'stores' => [

        // Alternative cache driver for specific use cases
        'apc' => [
            'driver' => 'apc',
        ],

        // Used primarily for testing environments
        'array' => [
            'driver' => 'array',
            'serialize' => false,
        ],

        // Database-based caching (not recommended for production)
        'database' => [
            'driver' => 'database',
            'table' => 'cache',
            'connection' => 'mysql',
            'lock_connection' => null,
        ],

        // File-based caching (used in development environments)
        'file' => [
            'driver' => 'file',
            'path' => storage_path('framework/cache/data'),
        ],

        // Alternative caching solution
        'memcached' => [
            'driver' => 'memcached',
            'persistent_id' => env('MEMCACHED_PERSISTENT_ID'),
            'sasl' => [
                env('MEMCACHED_USERNAME'),
                env('MEMCACHED_PASSWORD'),
            ],
            'options' => [
                // Memcached::OPT_CONNECT_TIMEOUT => 2000,
            ],
            'servers' => [
                [
                    'host' => env('MEMCACHED_HOST', '127.0.0.1'),
                    'port' => env('MEMCACHED_PORT', 11211),
                    'weight' => 100,
                ],
            ],
        ],

        /*
        |--------------------------------------------------------------------------
        | Redis Cache Configuration (Primary)
        |--------------------------------------------------------------------------
        |
        | Redis 7.0+ is our primary caching solution for the Student Admissions
        | Enrollment Platform. It provides:
        | 
        | - High performance with in-memory operations
        | - Support for advanced data structures (lists, sets, sorted sets)
        | - Pub/Sub capabilities for real-time notifications
        | - Atomic operations for counters and distributed locks
        |
        | Caching Use Cases:
        | - Application Dashboard: User-specific dashboard data (80% reduction in load time)
        | - Document Library: Document metadata and listings (70% reduction in query time)
        | - Application Status: Real-time status information (near-instant status updates)
        | - Workflow Definitions: Active workflow configurations (consistent workflow processing)
        | - User Permissions: Role and permission data (faster authorization checks)
        |
        */
        'redis' => [
            'driver' => 'redis',
            'connection' => 'cache',
            'lock_connection' => 'default',
        ],

        // Alternative for AWS environments
        'dynamodb' => [
            'driver' => 'dynamodb',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'table' => env('DYNAMODB_CACHE_TABLE', 'cache'),
            'endpoint' => env('DYNAMODB_ENDPOINT'),
        ],

        // For Laravel Octane server
        'octane' => [
            'driver' => 'octane',
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Cache Key Prefix
    |--------------------------------------------------------------------------
    |
    | When utilizing the APC, database, memcached, Redis, or DynamoDB cache
    | stores there might be other applications using the same cache. For
    | that reason, you may prefix every cache key to avoid collisions.
    |
    | For the Student Admissions Enrollment Platform, we use a specific prefix
    | to easily identify and manage all related cache entries.
    |
    */

    'prefix' => env('CACHE_PREFIX', 'admissions_cache'),

];