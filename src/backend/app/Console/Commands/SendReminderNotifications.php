<?php

namespace App\Console\Commands;

use Illuminate\Console\Command; // illuminate/console ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use App\Models\Application; // src/backend/app/Models/Application.php
use App\Services\NotificationService; // src/backend/app/Services/NotificationService.php

/**
 * Console command to send automated reminder notifications to users based on application status, deadlines, and other criteria
 */
class SendReminderNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admissions:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send automated reminder notifications to users';

    /**
     * The notification service instance.
     *
     * @var NotificationService
     */
    protected $notificationService;

    /**
     * Array defining reminder types with their criteria and templates
     *
     * @var array
     */
    protected $reminderTypes;

    /**
     * Create a new command instance.
     *
     * @param  NotificationService  $notificationService
     * @return void
     */
    public function __construct(NotificationService $notificationService)
    {
        parent::__construct();

        // Set the notification service
        $this->notificationService = $notificationService;

        // Initialize reminder types with their criteria and templates
        $this->reminderTypes = [
            'deadline' => [
                'method' => 'sendDeadlineReminders',
            ],
            'incomplete' => [
                'method' => 'sendIncompleteApplicationReminders',
            ],
            'dormant' => [
                'method' => 'sendDormantApplicationReminders',
            ],
            'verification' => [
                'method' => 'sendDocumentVerificationReminders',
            ],
        ];
    }

    /**
     * Execute the console command to send reminder notifications
     *
     * @return int Command exit code (0 for success, 1 for failure)
     */
    public function handle(): int
    {
        // Log the start of the reminder notification process
        Log::info('Starting reminder notification process');

        $totalRemindersSent = 0;

        // For each reminder type, call the appropriate method to process reminders
        foreach ($this->reminderTypes as $type => $config) {
            $method = $config['method'];
            $remindersSent = $this->$method();
            $totalRemindersSent += $remindersSent;
            $this->info("Sent {$remindersSent} {$type} reminders.");
        }

        // Log the completion of the reminder notification process with statistics
        Log::info('Reminder notification process completed', ['total_reminders_sent' => $totalRemindersSent]);

        // Output summary to console
        $this->info("Sent a total of {$totalRemindersSent} reminders.");

        // Return success exit code (0)
        return Command::SUCCESS;
    }

    /**
     * Send reminders for applications with upcoming deadlines
     *
     * @return int Number of reminders sent
     */
    protected function sendDeadlineReminders(): int
    {
        // Calculate upcoming deadline dates (1 day, 3 days, 7 days from now)
        $upcomingDays = [1, 3, 7];

        $totalReminders = 0;

        foreach ($upcomingDays as $days) {
            // Query applications with deadlines matching these dates
            $applications = $this->getApplicationsWithUpcomingDeadlines($days);

            // Group applications by user to avoid multiple notifications
            $applicationsByUser = $applications->groupBy('user_id');

            foreach ($applicationsByUser as $userId => $userApplications) {
                // For each user, prepare personalized notification data with their deadlines
                $deadlines = $userApplications->pluck('academic_term')->toArray();

                // Send notifications using the appropriate template
                $this->notificationService->sendFromTemplate(
                    $userId,
                    'application.deadline_reminder',
                    ['deadlines' => implode(', ', $deadlines), 'days' => $days]
                );
                $totalReminders++;
            }
        }

        // Log the number of deadline reminders sent
        Log::info("Sent {$totalReminders} deadline reminders.");

        // Return the count of reminders sent
        return $totalReminders;
    }

    /**
     * Send reminders for incomplete applications missing required documents
     *
     * @return int Number of reminders sent
     */
    protected function sendIncompleteApplicationReminders(): int
    {
        // Query submitted applications that are incomplete (missing documents)
        $applications = $this->getIncompleteApplications();

        $remindersSent = 0;

        foreach ($applications as $application) {
            // For each application, prepare notification data with missing document details
            $missingDocuments = $application->getMissingDocuments();

            // Send notification to the application owner using the incomplete application template
            $this->notificationService->sendFromTemplate(
                $application->user_id,
                'application.incomplete_reminder',
                ['missing_documents' => implode(', ', $missingDocuments)]
            );

            // Log the notification and update the last reminder timestamp
            $this->logReminderSent($application, 'incomplete');
            $remindersSent++;
        }

        // Log the number of incomplete application reminders sent
        Log::info("Sent {$remindersSent} incomplete application reminders.");

        // Return the count of reminders sent
        return $remindersSent;
    }

    /**
     * Send reminders for draft applications that haven't been updated recently
     *
     * @return int Number of reminders sent
     */
    protected function sendDormantApplicationReminders(): int
    {
        // Query draft applications not updated since the threshold date
        $applications = $this->getDormantApplications();

        $remindersSent = 0;

        foreach ($applications as $application) {
            // For each application, prepare notification data with application details
            $applicationType = $application->application_type;

            // Send notification to the application owner using the dormant application template
            $this->notificationService->sendFromTemplate(
                $application->user_id,
                'application.dormant_reminder',
                ['application_type' => $applicationType]
            );

            // Log the notification and update the last reminder timestamp
            $this->logReminderSent($application, 'dormant');
            $remindersSent++;
        }

        // Log the number of dormant application reminders sent
        Log::info("Sent {$remindersSent} dormant application reminders.");

        // Return the count of reminders sent
        return $remindersSent;
    }

    /**
     * Send reminders for documents pending verification for an extended period
     *
     * @return int Number of reminders sent
     */
    protected function sendDocumentVerificationReminders(): int
    {
        // Query documents uploaded before the threshold date that are not yet verified
        $documents = $this->getPendingVerificationDocuments();

        $remindersSent = 0;

        foreach ($documents->groupBy('application_id') as $applicationId => $applicationDocuments) {
            $application = Application::find($applicationId);
            if (!$application) {
                Log::warning("Application not found for document verification reminder: {$applicationId}");
                continue;
            }

            // For each application, prepare notification data with pending document details
            $documentTypes = $applicationDocuments->pluck('document_type')->toArray();

            // Send notification to the application owner using the document verification template
            $this->notificationService->sendFromTemplate(
                $application->user_id,
                'document.verification_reminder',
                ['document_types' => implode(', ', $documentTypes)]
            );

            // Log the notification and update the last reminder timestamp
            $this->logReminderSent($application, 'verification');
            $remindersSent++;
        }

        // Log the number of document verification reminders sent
        Log::info("Sent {$remindersSent} document verification reminders.");

        // Return the count of reminders sent
        return $remindersSent;
    }

    /**
     * Get applications with deadlines within the specified days
     *
     * @param  int  $days
     * @return \Illuminate\Database\Eloquent\Collection Collection of applications with upcoming deadlines
     */
    protected function getApplicationsWithUpcomingDeadlines(int $days)
    {
        // Calculate the target date (current date plus specified days)
        $targetDate = Carbon::now()->addDays($days)->toDateString();

        // Query applications with deadlines matching the target date
        return Application::with('user')
            ->whereDate('submitted_at', '=', $targetDate)
            ->get();
    }

    /**
     * Get incomplete applications that need document reminders
     *
     * @return \Illuminate\Database\Eloquent\Collection Collection of incomplete applications
     */
    protected function getIncompleteApplications()
    {
        // Query submitted applications
        return Application::with(['user', 'documents'])
            ->submitted()
            ->get()
            ->filter(function ($application) {
                return !$application->isComplete();
            });
    }

    /**
     * Get draft applications that haven't been updated recently
     *
     * @return \Illuminate\Database\Eloquent\Collection Collection of dormant applications
     */
    protected function getDormantApplications()
    {
        // Calculate the dormant threshold date (14 days ago)
        $dormantThreshold = Carbon::now()->subDays(14);

        // Query draft (not submitted) applications
        return Application::with('user')
            ->draft()
            ->where('updated_at', '<=', $dormantThreshold)
            ->get();
    }

    /**
     * Get documents that have been pending verification for too long
     *
     * @return \Illuminate\Database\Eloquent\Collection Collection of pending verification documents
     */
    protected function getPendingVerificationDocuments()
    {
        // Calculate the verification threshold date (3 days ago)
        $verificationThreshold = Carbon::now()->subDays(3);

        // Query documents uploaded before the threshold date
        return Application::whereNotNull('submitted_at')
            ->where('submitted_at', '<=', $verificationThreshold)
            ->get()
            ->filter(function ($application) {
                return !$application->hasVerifiedDocuments();
            });
    }

    /**
     * Log that a reminder was sent for an application
     *
     * @param  \App\Models\Application  $application
     * @param  string  $reminderType
     * @return void No return value
     */
    protected function logReminderSent(Application $application, string $reminderType): void
    {
        // Update the application's metadata to record the reminder
        $application->application_data = array_merge(
            (array) $application->application_data,
            ["last_reminder_{$reminderType}" => now()]
        );

        // Save the application
        $application->save();

        // Log the reminder activity
        Log::info("Reminder sent for application {$application->id} ({$reminderType})");
    }
}