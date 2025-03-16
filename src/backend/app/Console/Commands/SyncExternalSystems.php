<?php

namespace App\Console\Commands;

use Illuminate\Console\Command; // Laravel base console command class, v10.0
use Illuminate\Support\Facades\Config; // Laravel configuration facade for accessing integration settings, v10.0
use Illuminate\Support\Facades\Log; // Laravel logging facade for error and activity logging, v10.0
use App\Services\Integration\SISIntegrationService; // Service for handling SIS integration operations
use App\Services\Integration\LMSIntegrationService; // Service for handling LMS integration operations
use App\Models\Integration; // Model for managing integration configurations and logging
use App\Jobs\SyncWithSIS; // Job for asynchronous SIS data synchronization
use App\Jobs\SyncWithLMS; // Job for asynchronous LMS data synchronization

class SyncExternalSystems extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'integrations:sync
                            {system? : The system to sync (sis, lms, or all). Defaults to all.}
                            {--direction=bidirectional : The direction of sync (import, export, bidirectional). Defaults to bidirectional.}
                            {--user-id= : The ID of a specific user to sync.}
                            {--application-id= : The ID of a specific application to sync.}
                            {--student-id= : The ID of a specific student to import from SIS.}
                            {--wait : Process the job immediately instead of queueing it.}
                            {--syncAcceptedStudents : Sync only accepted students.}
                            {--syncEnrolledStudents : Sync only enrolled students.}
                            {--lastSyncOnly : Sync only records updated since the last sync.}
                            {--skipErrors : Skip errors and continue processing.}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize data with external systems (SIS, LMS)';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @param  SISIntegrationService  $sisService
     * @param  LMSIntegrationService  $lmsService
     * @return int
     */
    public function handle(SISIntegrationService $sisService, LMSIntegrationService $lmsService): int
    {
        // Get command options (system, direction, user-id, etc.)
        $system = $this->argument('system') ?? 'all';
        $direction = $this->option('direction');
        $userId = $this->option('user-id');
        $applicationId = $this->option('application-id');
        $studentId = $this->option('student-id');
        $wait = $this->option('wait');
        $syncAcceptedStudents = $this->option('syncAcceptedStudents');
        $syncEnrolledStudents = $this->option('syncEnrolledStudents');
        $lastSyncOnly = $this->option('lastSyncOnly');
        $skipErrors = $this->option('skipErrors');

        // Validate command options
        if (!$this->validateOptions()) {
            return 1; // Indicate failure
        }

        // If system is 'all' or 'sis', synchronize with SIS
        if (in_array($system, ['all', 'sis'])) {
            $this->info('Starting SIS synchronization...');
            $options = $this->getSyncOptions();

            if ($userId) {
                $this->info("Syncing SIS for user ID: $userId");
            } elseif ($applicationId) {
                $this->info("Syncing SIS for application ID: $applicationId");
            } elseif ($studentId) {
                $this->info("Importing SIS for student ID: $studentId");
            } else {
                $this->info("Syncing all SIS records");
            }

            $success = $this->syncWithSIS($sisService);

            if (!$success) {
                $this->error('SIS synchronization failed. See logs for details.');
            }
        }

        // If system is 'all' or 'lms', synchronize with LMS
        if (in_array($system, ['all', 'lms'])) {
            $this->info('Starting LMS synchronization...');
            $options = $this->getSyncOptions();

            if ($userId) {
                $this->info("Syncing LMS for user ID: $userId");
            } else {
                $this->info("Syncing all LMS records");
            }

            $success = $this->syncWithLMS($lmsService);

            if (!$success) {
                $this->error('LMS synchronization failed. See logs for details.');
            }
        }

        // Display summary of synchronization results
        $this->info('Synchronization completed.');

        // Return command exit code (0 for success, 1 for failure)
        return 0;
    }

    /**
     * Synchronize data with the Student Information System.
     *
     * @param  SISIntegrationService  $sisService
     * @return bool True if synchronization was successful
     */
    protected function syncWithSIS(SISIntegrationService $sisService): bool
    {
        // Check if SIS integration is enabled and configured
        if (!$sisService->isEnabled()) {
            $this->error('SIS integration is not enabled. Check your configuration.');
            return false;
        }

        // Test connection to SIS
        if (!$sisService->testConnection()) {
            $this->error('Failed to connect to SIS. Check your API credentials and URL.');
            return false;
        }

        // Get synchronization options from command input
        $options = $this->getSyncOptions();

        // Dispatch SyncWithSIS job with appropriate options
        $job = new SyncWithSIS(
            $this->option('direction'),
            $options,
            $this->option('user-id'),
            $this->option('application-id'),
            $this->option('student-id')
        );

        // If --wait flag is set, process the job immediately
        if ($this->option('wait')) {
            $this->info('Processing SIS synchronization immediately...');
            $job->handle($sisService);
        } else {
            // Otherwise, inform user that job was queued
            $this->info('Queuing SIS synchronization job...');
            dispatch($job);
        }

        // Return true if job was dispatched successfully
        return true;
    }

    /**
     * Synchronize data with the Learning Management System.
     *
     * @param  LMSIntegrationService  $lmsService
     * @return bool True if synchronization was successful
     */
    protected function syncWithLMS(LMSIntegrationService $lmsService): bool
    {
        // Check if LMS integration is enabled and configured
        if (!$lmsService->isConfigured()) {
            $this->error('LMS integration is not configured. Check your configuration.');
            return false;
        }

        // Test connection to LMS
        if (!$lmsService->testConnection()) {
            $this->error('Failed to connect to LMS. Check your API credentials and URL.');
            return false;
        }

        // Get synchronization options from command input
        $options = $this->getSyncOptions();

        // Dispatch SyncWithLMS job with appropriate options
        $job = new SyncWithLMS($options);

        // If --wait flag is set, process the job immediately
        if ($this->option('wait')) {
            $this->info('Processing LMS synchronization immediately...');
            $job->handle($lmsService);
        } else {
            // Otherwise, inform user that job was queued
            $this->info('Queuing LMS synchronization job...');
            dispatch($job);
        }

        // Return true if job was dispatched successfully
        return true;
    }

    /**
     * Get synchronization options from command input.
     *
     * @return array Array of synchronization options
     */
    protected function getSyncOptions(): array
    {
        // Initialize options array
        $options = [];

        // Add direction option (import, export, bidirectional)
        $options['direction'] = $this->option('direction');

        // Add user-id option if provided
        if ($this->option('user-id')) {
            $options['userId'] = $this->option('user-id');
        }

        // Add application-id option if provided
        if ($this->option('application-id')) {
            $options['applicationId'] = $this->option('application-id');
        }

        // Add student-id option if provided
        if ($this->option('student-id')) {
            $options['studentId'] = $this->option('student-id');
        }

        // Add additional options based on command flags
        $options['syncAcceptedStudents'] = $this->option('syncAcceptedStudents');
        $options['syncEnrolledStudents'] = $this->option('syncEnrolledStudents');
        $options['lastSyncOnly'] = $this->option('lastSyncOnly');
        $options['skipErrors'] = $this->option('skipErrors');

        // Return the compiled options array
        return $options;
    }

    /**
     * Validate command options for consistency.
     *
     * @return bool True if options are valid
     */
    protected function validateOptions(): bool
    {
        // Check if system option is valid (sis, lms, or all)
        $system = $this->argument('system') ?? 'all';
        if (!in_array($system, ['sis', 'lms', 'all'])) {
            $this->error('Invalid system option. Must be sis, lms, or all.');
            return false;
        }

        // Check if direction option is valid (import, export, or bidirectional)
        $direction = $this->option('direction');
        if (!in_array($direction, ['import', 'export', 'bidirectional'])) {
            $this->error('Invalid direction option. Must be import, export, or bidirectional.');
            return false;
        }

        // Validate that user-id is provided if specified
        if ($this->option('user-id') && !is_numeric($this->option('user-id'))) {
            $this->error('Invalid user-id option. Must be a numeric value.');
            return false;
        }

        // Validate that application-id is provided if specified
        if ($this->option('application-id') && !is_numeric($this->option('application-id'))) {
            $this->error('Invalid application-id option. Must be a numeric value.');
            return false;
        }

        // Validate that student-id is provided if specified
        if ($this->option('student-id') && !is_string($this->option('student-id'))) {
            $this->error('Invalid student-id option. Must be a string value.');
            return false;
        }

        // Return true if all validations pass, false otherwise
        return true;
    }

    /**
     * Display synchronization results in the console.
     *
     * @param  array  $results
     * @param  string  $system
     * @return void
     */
    protected function displayResults(array $results, string $system): void
    {
        // Format results into a table structure
        $headers = ['Status', 'Count'];
        $rows = [
            ['Success', $results['success']],
            ['Created', $results['created']],
            ['Updated', $results['updated']],
            ['Failed', $results['failed']],
        ];

        // Display table with synchronization statistics
        $this->info("Synchronization Results for $system:");
        $this->table($headers, $rows);

        // Show success/error messages
        if (!empty($results['errors'])) {
            $this->error('The following errors occurred during synchronization:');
            foreach ($results['errors'] as $error) {
                $this->error("- $error");
            }
        }

        // Display any warnings or notices
        // @TODO Implement warning/notice messages
    }
}