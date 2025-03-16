<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue; // Laravel interface for queueable jobs, ^10.0
use Illuminate\Foundation\Bus\Dispatchable; // Laravel trait for dispatching jobs, ^10.0
use Illuminate\Queue\InteractsWithQueue; // Laravel trait for queue interaction, ^10.0
use Illuminate\Queue\SerializesModels; // Laravel trait for serializing models in queued jobs, ^10.0
use Illuminate\Support\Facades\Log; // Laravel facade for logging, ^10.0
use Illuminate\Support\Facades\Config; // Laravel facade for accessing configuration, ^10.0
use Illuminate\Support\Collection; // Laravel collection for handling arrays of data, ^10.0
use App\Services\Integration\SISIntegrationService; // Service for handling SIS integration operations
use App\Models\User; // User model for synchronizing student data with SIS
use App\Models\Application; // Application model for accessing application and enrollment data
use App\Models\Integration; // Integration model for tracking SIS integration status and logs
use App\Exceptions\IntegrationException; // Exception handling for SIS integration errors
use Throwable; // PHP interface for catching exceptions

class SyncWithSIS implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff;

    /**
     * The synchronization direction ('import', 'export', or 'bidirectional').
     *
     * @var string
     */
    public string $direction;

    /**
     * The options array for customizing synchronization behavior.
     *
     * @var array
     */
    public array $options;

    /**
     * The user ID if synchronizing a single user.
     *
     * @var int|null
     */
    public ?int $userId;

    /**
     * The application ID if synchronizing based on an application.
     *
     * @var int|null
     */
    public ?int $applicationId;

    /**
     * The SIS student ID if importing a specific student from SIS.
     *
     * @var string|null
     */
    public ?string $sisStudentId;

    /**
     * The array of user IDs if synchronizing multiple users.
     *
     * @var array
     */
    public array $userIds;

    /**
     * Create a new job instance.
     *
     * @param string $direction
     * @param array $options
     * @param int|null $userId
     * @param int|null $applicationId
     * @param string|null $sisStudentId
     * @param array $userIds
     * @return void
     */
    public function __construct(
        string $direction,
        array $options = [],
        ?int $userId = null,
        ?int $applicationId = null,
        ?string $sisStudentId = null,
        array $userIds = []
    ) {
        // Set the synchronization direction ('import', 'export', or 'bidirectional')
        $this->direction = $direction;

        // Set the options array for customizing synchronization behavior
        $this->options = $options;

        // Set the user ID if synchronizing a single user
        $this->userId = $userId;

        // Set the application ID if synchronizing based on an application
        $this->applicationId = $applicationId;

        // Set the SIS student ID if importing a specific student from SIS
        $this->sisStudentId = $sisStudentId;

        // Set the array of user IDs if synchronizing multiple users
        $this->userIds = $userIds;

        // Set default job configuration (timeout, tries, backoff)
        $this->tries = Config::get('queue.sis_sync.tries', 3);
        $this->backoff = Config::get('queue.sis_sync.backoff', 60);
    }

    /**
     * Execute the job to synchronize data with SIS.
     *
     * @param SISIntegrationService $sisService
     * @return void
     */
    public function handle(SISIntegrationService $sisService): void
    {
        // Log the start of SIS synchronization
        Log::info("Starting SIS synchronization job. Direction: {$this->direction}, User ID: {$this->userId}, Application ID: {$this->applicationId}, SIS Student ID: {$this->sisStudentId}");

        // Check if SIS integration is enabled and configured
        if (!$sisService->isEnabled() || !$sisService->isConfigured()) {
            Log::error('SIS integration is not enabled or configured. Job will not be processed.');
            $this->fail(new \Exception('SIS integration is not enabled or configured.'));
            return;
        }

        // Get the active SIS integration from the database
        $integration = Integration::scopeByType('sis')->active()->first();

        if (!$integration) {
            Log::error('No active SIS integration found. Job will not be processed.');
            $this->fail(new \Exception('No active SIS integration found.'));
            return;
        }

        try {
            // Based on direction, perform the appropriate synchronization:
            if ($this->direction === 'export') {
                // For 'export': Export data from admissions platform to SIS
                $results = $this->exportToSIS($sisService, $integration);
            } elseif ($this->direction === 'import') {
                // For 'import': Import data from SIS to admissions platform
                $results = $this->importFromSIS($sisService, $integration);
            } elseif ($this->direction === 'bidirectional') {
                // For 'bidirectional': Perform both export and import
                $exportResults = $this->exportToSIS($sisService, $integration);
                $importResults = $this->importFromSIS($sisService, $integration);
                $results = [
                    'export' => $exportResults,
                    'import' => $importResults,
                ];
            } else {
                throw new \InvalidArgumentException("Invalid synchronization direction: {$this->direction}");
            }

            // Update the last sync time for the integration
            $integration->updateLastSyncTime();

            // Log the completion of synchronization with summary statistics
            Log::info("SIS synchronization job completed. Direction: {$this->direction}, Results: " . json_encode($results));
        } catch (IntegrationException $e) {
            // If an exception occurs, log the error and handle retry logic
            Log::error("SIS synchronization job failed: " . $e->getMessage() . " - " . json_encode($e->toArray()));
            throw $e;
        }
    }

    /**
     * Export data from the admissions platform to SIS.
     *
     * @param SISIntegrationService $sisService
     * @param Integration $integration
     * @return array
     */
    protected function exportToSIS(SISIntegrationService $sisService, Integration $integration): array
    {
        // Initialize results array with counters for tracking
        $results = [
            'success' => true,
            'total' => 0,
            'created' => 0,
            'updated' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        // If a single user ID is provided:
        if ($this->userId) {
            $results['total'] = 1;

            // Retrieve the user and related application
            $user = User::with('profile')->find($this->userId);
            $application = Application::where('user_id', $this->userId)->first();

            if (!$user) {
                $results['failed']++;
                $results['errors'][] = "User with ID {$this->userId} not found.";
                return $results;
            }

            try {
                // Call syncStudentData on the SIS service to export the user
                $syncResult = $sisService->syncStudentData($user, null, $this->options);

                if ($syncResult['success']) {
                    if ($syncResult['created']) {
                        $results['created']++;
                    } elseif ($syncResult['updated']) {
                        $results['updated']++;
                    }
                } else {
                    $results['failed']++;
                    $results['errors'][] = "Failed to sync user {$this->userId}.";
                }
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = "Error syncing user {$this->userId}: " . $e->getMessage();
            }
        } elseif (!empty($this->userIds)) {
            // If multiple user IDs are provided:
            $results['total'] = count($this->userIds);
            $successCount = 0;
            $failedCount = 0;
            $errors = [];

            // Retrieve all users in chunks to avoid memory issues
            $userChunks = array_chunk($this->userIds, 200);

            foreach ($userChunks as $userIds) {
                $users = User::with('profile')->whereIn('id', $userIds)->get();

                // For each chunk, call syncMultipleStudents on the SIS service
                $chunkResults = $sisService->syncMultipleStudents($users->toArray(), $this->options);

                $successCount += $chunkResults['created'] + $chunkResults['updated'];
                $failedCount += $chunkResults['failed'];
                $errors = array_merge($errors, $chunkResults['errors']);
            }

            $results['created'] = $successCount;
            $results['updated'] = $successCount;
            $results['failed'] = $failedCount;
            $results['errors'] = $errors;
        }

        // Log activity in the integration log
        $integration->logActivity(
            'export_to_sis',
            $results['failed'] > 0 ? 'partial' : 'success',
            [
                'user_id' => $this->userId,
                'user_ids' => $this->userIds,
                'options' => $this->options,
            ],
            $results
        );

        // Return the results array with statistics
        return $results;
    }

    /**
     * Import data from SIS to the admissions platform.
     *
     * @param SISIntegrationService $sisService
     * @param Integration $integration
     * @return array
     */
    protected function importFromSIS(SISIntegrationService $sisService, Integration $integration): array
    {
        // Initialize results array with counters for tracking
        $results = [
            'success' => true,
            'total' => 0,
            'created' => 0,
            'updated' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        // If a SIS student ID is provided:
        if ($this->sisStudentId) {
            $results['total'] = 1;

            try {
                // If a user ID is also provided, retrieve the user
                $user = $this->userId ? User::find($this->userId) : null;

                // Call importStudentData on the SIS service
                $importResult = $sisService->importStudentData($this->sisStudentId, $user);

                if ($importResult['success']) {
                    if ($importResult['user_id']) {
                        $results['created'] = 1;
                    } else {
                        $results['updated'] = 1;
                    }
                } else {
                    $results['failed'] = 1;
                    $results['errors'][] = "Failed to import student {$this->sisStudentId}.";
                }
            } catch (\Exception $e) {
                $results['failed'] = 1;
                $results['errors'][] = "Error importing student {$this->sisStudentId}: " . $e->getMessage();
            }
        } elseif (!empty($this->options['bulk_import'])) {
            // If no specific student ID is provided and options include bulk import:
            // Retrieve a list of students from SIS based on criteria
            // Process each student in chunks
            // For each student, find matching user or create new user
            // Import the student data using importStudentData
            // Aggregate the results
            Log::info("Starting bulk import from SIS");
            $results['total'] = 'unknown'; // Indicate that the total number is not known beforehand
            // @TODO Implement bulk import logic here
            Log::warning("Bulk import from SIS is not yet implemented.");
        }

        // Log activity in the integration log
        $integration->logActivity(
            'import_from_sis',
            $results['failed'] > 0 ? 'partial' : 'success',
            [
                'sis_student_id' => $this->sisStudentId,
                'options' => $this->options,
            ],
            $results
        );

        // Return the results array with statistics
        return $results;
    }

    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(Throwable $exception): void
    {
        // Log detailed information about the failed job
        Log::error("SIS synchronization job failed permanently. Direction: {$this->direction}, User ID: {$this->userId}, Application ID: {$this->applicationId}, SIS Student ID: {$this->sisStudentId}");
        Log::error("Exception: " . $exception->getMessage());
        Log::error("Stack trace: " . $exception->getTraceAsString());

        $context = [
            'direction' => $this->direction,
            'user_id' => $this->userId,
            'application_id' => $this->applicationId,
            'sis_student_id' => $this->sisStudentId,
            'options' => $this->options,
        ];

        // If it's an IntegrationException, include error code and context
        if ($exception instanceof IntegrationException) {
            $context['integration_error'] = $exception->toArray();
        }

        // Log the failure in the integration log
        $integration = Integration::scopeByType('sis')->active()->first();
        if ($integration) {
            $integration->logActivity(
                'sync_with_sis_failed',
                'error',
                $context,
                null,
                $exception->getMessage()
            );
        }

        // Notify administrators about critical SIS synchronization failures
        // @TODO Implement notification system for critical failures
        Log::critical("Critical SIS synchronization failure. Review logs for details.");
    }
}