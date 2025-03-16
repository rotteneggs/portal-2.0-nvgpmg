<?php

namespace App\Console\Commands;

use App\Services\StorageService;
use Illuminate\Console\Command; // illuminate/console ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support ^10.0
use Illuminate\Support\Facades\Storage; // illuminate/support ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0

/**
 * Console command to clean up temporary files that are older than a specified threshold.
 * 
 * This command identifies and removes temporary files that haven't been modified
 * for a specified period, helping to maintain storage efficiency and system performance.
 */
class CleanupTempFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'files:cleanup-temp {--hours=24 : Hours threshold for file age} {--dry-run : Run without actually deleting files}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up temporary files that are older than the specified threshold';

    /**
     * The storage service instance.
     *
     * @var \App\Services\StorageService
     */
    protected StorageService $storageService;

    /**
     * The file age threshold in hours.
     *
     * @var int
     */
    protected int $fileAgeThresholdHours;

    /**
     * The name of the temporary storage disk.
     *
     * @var string
     */
    protected string $temporaryDisk;

    /**
     * Create a new command instance.
     *
     * @param  \App\Services\StorageService  $storageService
     * @return void
     */
    public function __construct(StorageService $storageService)
    {
        parent::__construct();
        
        $this->storageService = $storageService;
        $this->fileAgeThresholdHours = config('filesystems.temp_file_threshold_hours', 24);
        $this->temporaryDisk = config('filesystems.temporary', 'temporary');
    }

    /**
     * Execute the console command to clean up temporary files.
     *
     * @return int
     */
    public function handle(): int
    {
        $hours = $this->option('hours') ?: $this->fileAgeThresholdHours;
        $dryRun = $this->option('dry-run') ?: false;
        
        $this->info("Starting temporary file cleanup (threshold: {$hours} hours)" . ($dryRun ? ' [DRY RUN]' : ''));
        Log::info("Starting temporary file cleanup", [
            'threshold_hours' => $hours,
            'dry_run' => $dryRun,
            'disk' => $this->temporaryDisk
        ]);

        // Calculate cutoff timestamp (current time minus threshold hours)
        $cutoffTimestamp = Carbon::now()->subHours($hours)->timestamp;
        
        try {
            // Get old files
            $oldFiles = $this->getFilesOlderThan($cutoffTimestamp);
            
            $totalFiles = count($oldFiles);
            $this->info("Found {$totalFiles} file(s) older than {$hours} hours");
            
            if ($totalFiles === 0) {
                $this->info("No files to clean up.");
                return 0;
            }
            
            $deleted = 0;
            $failures = 0;
            
            $this->output->progressStart($totalFiles);
            
            // Process each file
            foreach ($oldFiles as $filePath) {
                $this->output->progressAdvance();
                
                if ($dryRun) {
                    $this->line("Would delete: {$filePath}");
                    $deleted++;
                    continue;
                }
                
                $success = $this->deleteTemporaryFile($filePath);
                
                if ($success) {
                    $deleted++;
                } else {
                    $failures++;
                    $this->warn("Failed to delete: {$filePath}");
                }
            }
            
            $this->output->progressFinish();
            
            // Report results
            Log::info("Temporary file cleanup completed", [
                'total_files' => $totalFiles,
                'deleted' => $deleted,
                'failures' => $failures,
                'dry_run' => $dryRun
            ]);
            
            $actionText = $dryRun ? "Would have deleted" : "Deleted";
            $this->info("{$actionText} {$deleted} out of {$totalFiles} file(s)");
            
            if ($failures > 0) {
                $this->warn("{$failures} file(s) could not be deleted");
            }
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error("Error during file cleanup: " . $e->getMessage());
            Log::error("Error during temporary file cleanup", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return 1;
        }
    }

    /**
     * Get all files older than the specified timestamp.
     *
     * @param  int  $timestamp
     * @return array
     */
    protected function getFilesOlderThan(int $timestamp): array
    {
        $allFiles = Storage::disk($this->temporaryDisk)->allFiles();
        $oldFiles = [];
        
        foreach ($allFiles as $file) {
            try {
                $lastModified = $this->storageService->getFileLastModified($file, $this->temporaryDisk);
                
                if ($lastModified !== null && $lastModified < $timestamp) {
                    $oldFiles[] = $file;
                }
            } catch (\Exception $e) {
                Log::warning("Could not check last modified time for file: {$file}", [
                    'error' => $e->getMessage()
                ]);
                // Skip files that can't be properly checked
                continue;
            }
        }
        
        return $oldFiles;
    }

    /**
     * Delete a file from the temporary storage.
     *
     * @param  string  $filePath
     * @return bool
     */
    protected function deleteTemporaryFile(string $filePath): bool
    {
        try {
            $result = $this->storageService->deleteFile($filePath, $this->temporaryDisk);
            
            Log::info("Temporary file deletion " . ($result ? "successful" : "failed"), [
                'file' => $filePath,
                'disk' => $this->temporaryDisk
            ]);
            
            return $result;
        } catch (\Exception $e) {
            Log::error("Error deleting temporary file", [
                'file' => $filePath,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }
}