<?php

use Illuminate\Support\Facades\Artisan; // Laravel facade for registering and executing console commands, ^10.0
use Closure; // PHP Closure type for defining anonymous functions, ^10.0

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of your Closure based console
| commands. Each Closure is bound to a command instance allowing a
| simple approach to interacting with each command's IO methods.
|
*/

Artisan::command('app:inspect-application {id}', function (int $id) {
    $this->info("Inspecting Application #{$id}");
    
    try {
        // Find the application by ID
        $application = app('App\Models\Application')->with([
            'user', 
            'documents', 
            'statuses', 
            'notes'
        ])->findOrFail($id);
        
        // Display application details
        $this->info('Application Details:');
        $this->table(
            ['ID', 'Type', 'Academic Term', 'Academic Year', 'Submitted', 'Created'],
            [[
                $application->id,
                $application->application_type,
                $application->academic_term,
                $application->academic_year,
                $application->is_submitted ? 'Yes' : 'No',
                $application->created_at->format('Y-m-d H:i:s')
            ]]
        );
        
        // Display applicant information
        $this->info('Applicant Information:');
        $this->table(
            ['ID', 'Name', 'Email'],
            [[
                $application->user->id,
                $application->user->name,
                $application->user->email
            ]]
        );
        
        // Display current status
        $this->info('Current Status:');
        if ($application->currentStatus) {
            $this->table(
                ['Status', 'Stage', 'Updated'],
                [[
                    $application->currentStatus->status,
                    $application->currentStatus->workflowStage ? $application->currentStatus->workflowStage->name : 'N/A',
                    $application->currentStatus->created_at->format('Y-m-d H:i:s')
                ]]
            );
        } else {
            $this->warn('No status information available');
        }
        
        // Display documents
        $this->info('Documents:');
        if ($application->documents->count() > 0) {
            $documents = $application->documents->map(function ($document) {
                return [
                    $document->id,
                    $document->document_type,
                    $document->file_name,
                    $document->is_verified ? 'Verified' : 'Pending',
                    $document->created_at->format('Y-m-d H:i:s')
                ];
            })->toArray();
            
            $this->table(
                ['ID', 'Type', 'Filename', 'Status', 'Uploaded'],
                $documents
            );
        } else {
            $this->warn('No documents uploaded');
        }
        
        // Display notes
        $this->info('Notes:');
        if ($application->notes->count() > 0) {
            $notes = $application->notes->map(function ($note) {
                return [
                    $note->id,
                    $note->user->name,
                    $note->is_internal ? 'Internal' : 'External',
                    substr($note->content, 0, 50) . (strlen($note->content) > 50 ? '...' : ''),
                    $note->created_at->format('Y-m-d H:i:s')
                ];
            })->toArray();
            
            $this->table(
                ['ID', 'Author', 'Type', 'Content', 'Created'],
                $notes
            );
        } else {
            $this->warn('No notes available');
        }
        
    } catch (\Exception $e) {
        $this->error("Failed to inspect application: {$e->getMessage()}");
    }
})->purpose('Inspect details of a specific application');

Artisan::command('app:send-test-notification {user} {--channel=email}', function (int $userId, string $channel) {
    $this->info("Sending test notification to user #{$userId} via {$channel}");
    
    try {
        // Find the user by ID
        $user = app('App\Models\User')->findOrFail($userId);
        
        // Validate the notification channel
        $validChannels = ['email', 'sms', 'in-app'];
        if (!in_array($channel, $validChannels)) {
            $this->error("Invalid channel. Please use one of: " . implode(', ', $validChannels));
            return;
        }
        
        // Create the test notification
        $timestamp = now()->format('Y-m-d H:i:s');
        $notification = new \App\Notifications\TestNotification($timestamp, $channel);
        
        // Send the notification
        if ($channel === 'in-app') {
            $user->notify($notification);
            $this->info("In-app notification sent successfully");
        } else {
            $user->notify($notification);
            $this->info("{$channel} notification sent successfully to {$user->email}");
        }
        
        $this->line("Test notification sent at {$timestamp}");
        
    } catch (\Exception $e) {
        $this->error("Failed to send test notification: {$e->getMessage()}");
    }
})->purpose('Send a test notification to a specific user');

Artisan::command('app:health-check', function () {
    $this->info('Running system health check...');
    $issues = 0;
    
    // Check database connectivity
    $this->line('Checking database connection...');
    try {
        $dbStatus = \DB::connection()->getPdo() ? 'Connected' : 'Failed';
        $this->info("Database: {$dbStatus}");
        
        // Test a simple query for performance
        $startTime = microtime(true);
        \DB::select('SELECT 1');
        $queryTime = round((microtime(true) - $startTime) * 1000, 2);
        $this->info("Database query time: {$queryTime}ms");
        
        if ($queryTime > 100) {
            $this->warn('Database query time is high (>100ms)');
            $issues++;
        }
    } catch (\Exception $e) {
        $this->error("Database connection failed: {$e->getMessage()}");
        $issues++;
    }
    
    // Check Redis connection
    $this->line('Checking Redis connection...');
    try {
        $redis = app('redis');
        $redis->ping();
        $this->info('Redis: Connected');
        
        // Test Redis performance
        $startTime = microtime(true);
        $redis->set('health_check_test', 'test_value');
        $redis->get('health_check_test');
        $redis->del('health_check_test');
        $redisTime = round((microtime(true) - $startTime) * 1000, 2);
        $this->info("Redis operation time: {$redisTime}ms");
        
        if ($redisTime > 50) {
            $this->warn('Redis operation time is high (>50ms)');
            $issues++;
        }
    } catch (\Exception $e) {
        $this->error("Redis connection failed: {$e->getMessage()}");
        $issues++;
    }
    
    // Check storage accessibility
    $this->line('Checking storage service...');
    try {
        $disk = \Storage::disk('public');
        $testFile = 'health_check_test.txt';
        $disk->put($testFile, 'Health check test file');
        $fileExists = $disk->exists($testFile);
        $disk->delete($testFile);
        $this->info("Storage: " . ($fileExists ? 'Accessible' : 'Failed'));
    } catch (\Exception $e) {
        $this->error("Storage service failed: {$e->getMessage()}");
        $issues++;
    }
    
    // Check external services
    $services = [
        'SIS Integration' => config('services.sis.url'),
        'LMS Integration' => config('services.lms.url'),
        'Payment Gateway' => config('services.payment.url')
    ];
    
    $this->line('Checking external services...');
    foreach ($services as $name => $url) {
        if (empty($url)) {
            $this->warn("{$name}: Not configured");
            continue;
        }
        
        try {
            $client = new \GuzzleHttp\Client(['timeout' => 5]);
            $response = $client->request('GET', $url);
            $statusCode = $response->getStatusCode();
            $this->info("{$name}: Connected (Status {$statusCode})");
        } catch (\Exception $e) {
            $this->error("{$name}: Failed ({$e->getMessage()})");
            $issues++;
        }
    }
    
    // Check queue processing
    $this->line('Checking queue processing...');
    try {
        $failedCount = app('queue.failer')->count();
        $this->info("Failed jobs: {$failedCount}");
        
        if ($failedCount > 0) {
            $this->warn("There are {$failedCount} failed jobs in the queue");
            $issues++;
        }
    } catch (\Exception $e) {
        $this->error("Queue check failed: {$e->getMessage()}");
        $issues++;
    }
    
    // Check system resources
    $this->line('Checking system resources...');
    if (function_exists('disk_free_space') && function_exists('disk_total_space')) {
        $diskFree = round(disk_free_space(base_path()) / 1024 / 1024 / 1024, 2);
        $diskTotal = round(disk_total_space(base_path()) / 1024 / 1024 / 1024, 2);
        $diskUsedPercent = round(100 - ($diskFree / $diskTotal * 100), 2);
        $this->info("Disk usage: {$diskUsedPercent}% ({$diskFree}GB free of {$diskTotal}GB)");
        
        if ($diskUsedPercent > 85) {
            $this->error('Disk usage is critical (>85%)');
            $issues++;
        } elseif ($diskUsedPercent > 70) {
            $this->warn('Disk usage is high (>70%)');
            $issues++;
        }
    }
    
    // Overall health status
    $this->line("\nHealth check summary:");
    if ($issues > 0) {
        $this->error("Found {$issues} issues that require attention");
    } else {
        $this->info("All systems operational");
    }
})->purpose('Check the health of system components');

Artisan::command('app:clear-cache {type?}', function (string $type = 'all') {
    $validTypes = ['all', 'config', 'routes', 'views', 'application'];
    
    if (!in_array($type, $validTypes)) {
        $this->error("Invalid cache type. Available types: " . implode(', ', $validTypes));
        return;
    }
    
    $cleared = [];
    
    if ($type === 'all' || $type === 'config') {
        Artisan::call('config:clear');
        $cleared[] = 'configuration';
    }
    
    if ($type === 'all' || $type === 'routes') {
        Artisan::call('route:clear');
        $cleared[] = 'routes';
    }
    
    if ($type === 'all' || $type === 'views') {
        Artisan::call('view:clear');
        $cleared[] = 'views';
    }
    
    if ($type === 'all' || $type === 'application') {
        // Clear application-specific Redis cache
        try {
            $redis = app('redis');
            $appKeys = $redis->keys('app:*');
            
            if (count($appKeys) > 0) {
                $redis->del($appKeys);
                $this->info("Cleared {count($appKeys)} application cache entries from Redis");
            } else {
                $this->info('No application cache entries found in Redis');
            }
            
            $cleared[] = 'application';
        } catch (\Exception $e) {
            $this->error("Failed to clear application cache: {$e->getMessage()}");
        }
    }
    
    if (count($cleared) > 0) {
        $this->info('Successfully cleared ' . implode(', ', $cleared) . ' cache');
    }
})->purpose('Clear application-specific cache entries');

Artisan::command('app:generate-demo {count=10} {type=all}', function (int $count, string $type) {
    $this->info("Generating {$count} demo records of type: {$type}");
    
    $validTypes = ['users', 'applications', 'documents', 'all'];
    
    if (!in_array($type, $validTypes)) {
        $this->error("Invalid type. Available types: " . implode(', ', $validTypes));
        return;
    }
    
    try {
        if ($type === 'users' || $type === 'all') {
            $this->line('Generating demo users...');
            $factory = app('App\Models\User')->factory();
            $usersCreated = $factory->count($count)->create();
            $this->info("Created {$usersCreated->count()} demo users");
            
            if ($type !== 'all') {
                $this->table(
                    ['ID', 'Name', 'Email', 'Created At'],
                    $usersCreated->map(function ($user) {
                        return [
                            $user->id,
                            $user->name,
                            $user->email,
                            $user->created_at->format('Y-m-d H:i:s')
                        ];
                    })->toArray()
                );
            }
        }
        
        if ($type === 'applications' || $type === 'all') {
            $this->line('Generating demo applications...');
            
            // Get existing users or create new ones if needed
            $users = app('App\Models\User')->take($count)->get();
            if ($users->count() < $count) {
                $additionalUsers = app('App\Models\User')->factory()->count($count - $users->count())->create();
                $users = $users->merge($additionalUsers);
            }
            
            $factory = app('App\Models\Application')->factory();
            $applicationsCreated = collect();
            
            foreach ($users as $user) {
                $app = $factory->create(['user_id' => $user->id]);
                $applicationsCreated->push($app);
            }
            
            $this->info("Created {$applicationsCreated->count()} demo applications");
            
            if ($type !== 'all') {
                $this->table(
                    ['ID', 'User', 'Type', 'Status', 'Created At'],
                    $applicationsCreated->map(function ($app) {
                        return [
                            $app->id,
                            $app->user->name,
                            $app->application_type,
                            $app->currentStatus ? $app->currentStatus->status : 'New',
                            $app->created_at->format('Y-m-d H:i:s')
                        ];
                    })->toArray()
                );
            }
        }
        
        if ($type === 'documents' || $type === 'all') {
            $this->line('Generating demo documents...');
            
            // Get existing applications or create new ones if needed
            $applications = app('App\Models\Application')->take($count)->get();
            if ($applications->count() < $count && $type !== 'all') {
                $this->error('Insufficient applications found. Please create applications first.');
                return;
            }
            
            $factory = app('App\Models\Document')->factory();
            $documentsCreated = collect();
            
            $documentTypes = ['transcript', 'id_card', 'recommendation', 'personal_statement'];
            
            foreach ($applications as $application) {
                foreach ($documentTypes as $docType) {
                    $doc = $factory->create([
                        'application_id' => $application->id,
                        'user_id' => $application->user_id,
                        'document_type' => $docType
                    ]);
                    $documentsCreated->push($doc);
                }
            }
            
            $this->info("Created {$documentsCreated->count()} demo documents");
            
            if ($type !== 'all') {
                $this->table(
                    ['ID', 'Application ID', 'Type', 'Verified', 'Created At'],
                    $documentsCreated->take(20)->map(function ($doc) {
                        return [
                            $doc->id,
                            $doc->application_id,
                            $doc->document_type,
                            $doc->is_verified ? 'Yes' : 'No',
                            $doc->created_at->format('Y-m-d H:i:s')
                        ];
                    })->toArray()
                );
                
                if ($documentsCreated->count() > 20) {
                    $this->line('... and ' . ($documentsCreated->count() - 20) . ' more documents');
                }
            }
        }
        
        if ($type === 'all') {
            $this->info("Successfully generated demo data");
        }
    } catch (\Exception $e) {
        $this->error("Failed to generate demo data: {$e->getMessage()}");
        $this->line($e->getTraceAsString());
    }
})->purpose('Generate demo data for testing and development');