<?php

namespace App\Jobs;

use App\Models\Application; // src/backend/app/Models/Application.php
use App\Services\ApplicationService; // src/backend/app/Services/ApplicationService.php
use App\Services\StorageService; // src/backend/app/Services/StorageService.php
use App\Services\NotificationService; // src/backend/app/Services/NotificationService.php
use Illuminate\Contracts\Queue\ShouldQueue; // illuminate/contracts ^10.0
use Illuminate\Bus\Queueable; // illuminate/bus ^10.0
use Illuminate\Queue\InteractsWithQueue; // illuminate/queue ^10.0
use Illuminate\Queue\SerializesModels; // illuminate/queue ^10.0
use Illuminate\Foundation\Bus\Dispatchable; // illuminate/foundation ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support ^10.0
use Illuminate\Support\Facades\DB; // illuminate/support ^10.0
use Illuminate\Support\Str; // illuminate/support ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use PhpOffice\PhpSpreadsheet\Spreadsheet; // phpoffice/phpspreadsheet ^1.28
use PhpOffice\PhpSpreadsheet\Writer\Xlsx; // phpoffice/phpspreadsheet ^1.28
use PhpOffice\PhpSpreadsheet\Writer\Csv; // phpoffice/phpspreadsheet ^1.28
use Dompdf\Dompdf; // dompdf/dompdf ^2.0
use Exception; // php 8.2

class GenerateApplicationReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The type of report to generate (e.g., 'application_list', 'statistics').
     *
     * @var string
     */
    public string $reportType;

    /**
     * The filters to apply to the report data.
     *
     * @var array
     */
    public array $filters;

    /**
     * The format of the report to generate (e.g., 'pdf', 'csv', 'xlsx').
     *
     * @var string
     */
    public string $format;

    /**
     * The ID of the user who requested the report.
     *
     * @var int
     */
    public int $userId;

    /**
     * The unique ID of the report generation process.
     *
     * @var string
     */
    public string $reportId;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public int $timeout = 600;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public int $tries = 2;

    /**
     * The ApplicationService instance.
     *
     * @var ApplicationService
     */
    protected ApplicationService $applicationService;

    /**
     * The StorageService instance.
     *
     * @var StorageService
     */
    protected StorageService $storageService;

    /**
     * The NotificationService instance.
     *
     * @var NotificationService
     */
    protected NotificationService $notificationService;

    /**
     * Create a new job instance.
     *
     * @param string $reportType The type of report to generate.
     * @param array $filters The filters to apply to the report data.
     * @param string $format The format of the report to generate (pdf, csv, xlsx).
     * @param int $userId The ID of the user who requested the report.
     * @return void
     */
    public function __construct(string $reportType, array $filters, string $format, int $userId)
    {
        // Set the report type property
        $this->reportType = $reportType;
        // Set the filters property
        $this->filters = $filters;
        // Set the format property (pdf, csv, xlsx)
        $this->format = $format;
        // Set the user ID property
        $this->userId = $userId;
        // Generate a unique report ID using Str::uuid()
        $this->reportId = Str::uuid();
    }

    /**
     * Execute the job to generate the application report.
     *
     * @param ApplicationService $applicationService The application service instance.
     * @param StorageService $storageService The storage service instance.
     * @param NotificationService $notificationService The notification service instance.
     * @return void
     */
    public function handle(ApplicationService $applicationService, StorageService $storageService, NotificationService $notificationService): void
    {
        // Set the service dependencies
        $this->applicationService = $applicationService;
        $this->storageService = $storageService;
        $this->notificationService = $notificationService;

        // Log the start of report generation process
        Log::info("Generating application report", [
            'report_id' => $this->reportId,
            'report_type' => $this->reportType,
            'format' => $this->format,
            'user_id' => $this->userId,
            'filters' => $this->filters,
        ]);

        try {
            // Determine the report generation method based on reportType
            $reportGenerationMethod = match ($this->reportType) {
                'application_list' => 'generateApplicationListReport',
                'statistics' => 'generateApplicationStatisticsReport',
                'document_verification' => 'generateDocumentVerificationReport',
                'workflow_progress' => 'generateWorkflowProgressReport',
                'conversion_funnel' => 'generateConversionFunnelReport',
                default => throw new Exception("Unsupported report type: {$this->reportType}"),
            };

            // Call the appropriate report generation method
            $filePath = $this->{$reportGenerationMethod}();

            // Get the report file name
            $fileName = $this->getReportFileName();

            // Store report metadata in the database
            $this->storeReportMetadata($filePath, $fileName);

            // Send notification to the user that the report is ready
            $this->notificationService->send(
                $this->userId,
                'report_ready',
                'Application Report Ready',
                "Your application report ({$fileName}) is now available for download.",
                ['report_url' => $filePath]
            );

            // Log successful report generation
            Log::info("Application report generated successfully", [
                'report_id' => $this->reportId,
                'file_path' => $filePath,
                'file_name' => $fileName,
            ]);
        } catch (Exception $e) {
            // Log errors and mark the job as failed if necessary
            Log::error("Failed to generate application report: " . $e->getMessage(), [
                'report_id' => $this->reportId,
                'report_type' => $this->reportType,
                'format' => $this->format,
                'user_id' => $this->userId,
                'filters' => $this->filters,
                'exception' => $e,
            ]);

            // Send notification to the user about the report generation failure
            $this->notificationService->send(
                $this->userId,
                'report_failed',
                'Application Report Generation Failed',
                "There was an error generating your application report. Please try again later.",
                ['error_message' => $e->getMessage()]
            );

            // Mark the job as failed
            $this->failed($e);
        }
    }

    /**
     * Generate a report listing applications based on filters.
     *
     * @return string Path to the generated report file
     */
    protected function generateApplicationListReport(): string
    {
        // Retrieve applications using applicationService->searchApplications() with the provided filters
        $applications = $this->applicationService->searchApplications($this->filters);

        // Format the application data for the report
        $data = [];
        foreach ($applications as $application) {
            $data[] = [
                'ID' => $application->id,
                'Type' => $application->application_type,
                'Term' => $application->academic_term,
                'Year' => $application->academic_year,
                'Status' => $application->currentStatus->status ?? 'N/A',
                'Submitted At' => $application->submitted_at ? $application->submitted_at->format('Y-m-d H:i:s') : 'N/A',
            ];
        }

        // Define the column headers
        $columns = ['ID', 'Type', 'Term', 'Year', 'Status', 'Submitted At'];

        // Generate the report file in the requested format (PDF, CSV, Excel)
        if ($this->format === 'pdf') {
            $filePath = $this->generatePdfReport('Application List Report', $data, 'reports.application_list');
        } elseif ($this->format === 'csv') {
            $filePath = $this->generateCsvReport($data, $columns);
        } elseif ($this->format === 'xlsx') {
            $filePath = $this->generateExcelReport('Application List Report', $data, $columns);
        } else {
            throw new Exception("Unsupported report format: {$this->format}");
        }

        // Return the path to the stored file
        return $filePath;
    }

    /**
     * Generate a statistical report on applications.
     *
     * @return string Path to the generated report file
     */
    protected function generateApplicationStatisticsReport(): string
    {
        // Retrieve application statistics using applicationService->getApplicationStatistics() with the provided filters
        $statistics = $this->applicationService->getApplicationStatistics($this->filters);

        // Format the statistics data for the report
        $data = [
            'Total Applications' => $statistics['total_applications'],
            'Submitted Applications' => $statistics['submitted_applications'],
            'Draft Applications' => $statistics['draft_applications'],
        ];

        // Define the column headers
        $columns = ['Statistic', 'Value'];

        // Format the data for the report
        $reportData = [];
        foreach ($data as $statistic => $value) {
            $reportData[] = ['Statistic' => $statistic, 'Value' => $value];
        }

        // Generate the report file in the requested format (PDF, CSV, Excel)
        if ($this->format === 'pdf') {
            $filePath = $this->generatePdfReport('Application Statistics Report', $reportData, 'reports.application_statistics');
        } elseif ($this->format === 'csv') {
            $filePath = $this->generateCsvReport($reportData, $columns);
        } elseif ($this->format === 'xlsx') {
            $filePath = $this->generateExcelReport('Application Statistics Report', $reportData, $columns);
        } else {
            throw new Exception("Unsupported report format: {$this->format}");
        }

        // Return the path to the stored file
        return $filePath;
    }

    /**
     * Generate a report on document verification status.
     *
     * @return string Path to the generated report file
     */
    protected function generateDocumentVerificationReport(): string
    {
        // Retrieve applications with document data using eager loading
        $applications = Application::with('documents')->get();

        // Calculate document verification metrics (verification rate, time, etc.)
        $data = [];
        foreach ($applications as $application) {
            $verifiedCount = $application->documents()->where('is_verified', true)->count();
            $totalCount = $application->documents()->count();
            $verificationRate = $totalCount > 0 ? ($verifiedCount / $totalCount) * 100 : 0;

            $data[] = [
                'Application ID' => $application->id,
                'Verification Rate' => number_format($verificationRate, 2) . '%',
                'Total Documents' => $totalCount,
                'Verified Documents' => $verifiedCount,
            ];
        }

        // Define the column headers
        $columns = ['Application ID', 'Verification Rate', 'Total Documents', 'Verified Documents'];

        // Generate the report file in the requested format (PDF, CSV, Excel)
        if ($this->format === 'pdf') {
            $filePath = $this->generatePdfReport('Document Verification Report', $data, 'reports.document_verification');
        } elseif ($this->format === 'csv') {
            $filePath = $this->generateCsvReport($data, $columns);
        } elseif ($this->format === 'xlsx') {
            $filePath = $this->generateExcelReport('Document Verification Report', $data, $columns);
        } else {
            throw new Exception("Unsupported report format: {$this->format}");
        }

        // Return the path to the stored file
        return $filePath;
    }

    /**
     * Generate a report on application workflow progress.
     *
     * @return string Path to the generated report file
     */
    protected function generateWorkflowProgressReport(): string
    {
        // Retrieve applications with status history data using eager loading
        $applications = Application::with('statuses')->get();

        // Calculate workflow metrics (time in each stage, bottlenecks, etc.)
        $data = [];
        foreach ($applications as $application) {
            $statusCounts = $application->statuses()->select('status', DB::raw('count(*) as count'))->groupBy('status')->pluck('count', 'status')->toArray();

            $data[] = [
                'Application ID' => $application->id,
                'Status Counts' => json_encode($statusCounts),
            ];
        }

        // Define the column headers
        $columns = ['Application ID', 'Status Counts'];

        // Generate the report file in the requested format (PDF, CSV, Excel)
        if ($this->format === 'pdf') {
            $filePath = $this->generatePdfReport('Workflow Progress Report', $data, 'reports.workflow_progress');
        } elseif ($this->format === 'csv') {
            $filePath = $this->generateCsvReport($data, $columns);
        } elseif ($this->format === 'xlsx') {
            $filePath = $this->generateExcelReport('Workflow Progress Report', $data, $columns);
        } else {
            throw new Exception("Unsupported report format: {$this->format}");
        }

        // Return the path to the stored file
        return $filePath;
    }

    /**
     * Generate a report on application conversion funnel.
     *
     * @return string Path to the generated report file
     */
    protected function generateConversionFunnelReport(): string
    {
        // Retrieve application counts at each stage of the funnel
        $applicationCounts = [
            'Started' => Application::count(),
            'Submitted' => Application::submitted()->count(),
            'Accepted' => Application::whereHas('currentStatus', function ($query) {
                $query->where('status', 'accepted');
            })->count(),
            'Enrolled' => Application::whereHas('currentStatus', function ($query) {
                $query->where('status', 'enrolled');
            })->count(),
        ];

        // Calculate conversion rates between stages
        $conversionRates = [];
        $stages = array_keys($applicationCounts);
        for ($i = 0; $i < count($stages) - 1; $i++) {
            $currentStage = $stages[$i];
            $nextStage = $stages[$i + 1];
            $conversionRates[$currentStage . ' to ' . $nextStage] = $applicationCounts[$currentStage] > 0
                ? ($applicationCounts[$nextStage] / $applicationCounts[$currentStage]) * 100
                : 0;
        }

        // Format the conversion data for the report
        $data = [];
        foreach ($applicationCounts as $stage => $count) {
            $data[] = ['Stage' => $stage, 'Count' => $count];
        }
        foreach ($conversionRates as $rate => $value) {
            $data[] = ['Stage' => $rate, 'Count' => number_format($value, 2) . '%'];
        }

        // Define the column headers
        $columns = ['Stage', 'Count'];

        // Generate the report file in the requested format (PDF, CSV, Excel)
        if ($this->format === 'pdf') {
            $filePath = $this->generatePdfReport('Conversion Funnel Report', $data, 'reports.conversion_funnel');
        } elseif ($this->format === 'csv') {
            $filePath = $this->generateCsvReport($data, $columns);
        } elseif ($this->format === 'xlsx') {
            $filePath = $this->generateExcelReport('Conversion Funnel Report', $data, $columns);
        } else {
            throw new Exception("Unsupported report format: {$this->format}");
        }

        // Return the path to the stored file
        return $filePath;
    }

    /**
     * Generate a PDF format report.
     *
     * @param string $title The title of the report.
     * @param array $data The data to include in the report.
     * @param string $template The blade template to use for rendering the report.
     * @return string Path to the generated PDF file
     */
    protected function generatePdfReport(string $title, array $data, string $template): string
    {
        // Create a new Dompdf instance
        $dompdf = new Dompdf();

        // Render the HTML template with the provided data
        $html = view($template, ['title' => $title, 'data' => $data])->render();

        // Load HTML to Dompdf
        $dompdf->loadHtml($html);

        // (Optional) Setup the paper size and orientation
        $dompdf->setPaper('A4', 'landscape');

        // Render the HTML as PDF
        $dompdf->render();

        // Generate a unique file name
        $fileName = $this->getReportFileName();

        // Save the PDF to a temporary file
        $filePath = sys_get_temp_dir() . '/' . $fileName;
        file_put_contents($filePath, $dompdf->output());

        // Return the path to the temporary file
        return $filePath;
    }

    /**
     * Generate an Excel format report.
     *
     * @param string $title The title of the report.
     * @param array $data The data to include in the report.
     * @param array $columns The column headers for the report.
     * @return string Path to the generated Excel file
     */
    protected function generateExcelReport(string $title, array $data, array $columns): string
    {
        // Create a new Spreadsheet instance
        $spreadsheet = new Spreadsheet();

        // Set up the worksheet with title and column headers
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', $title);
        $sheet->fromArray([$columns], null, 'A2');

        // Populate the worksheet with the provided data
        $sheet->fromArray($data, null, 'A3');

        // Apply formatting (column widths, styles, etc.)
        $columnCount = count($columns);
        for ($i = 1; $i <= $columnCount; $i++) {
            $sheet->getColumnDimensionByColumn($i)->setAutoSize(true);
        }

        // Generate a unique file name
        $fileName = $this->getReportFileName();

        // Save the spreadsheet to a temporary file
        $writer = new Xlsx($spreadsheet);
        $filePath = sys_get_temp_dir() . '/' . $fileName;
        $writer->save($filePath);

        // Return the path to the temporary file
        return $filePath;
    }

    /**
     * Generate a CSV format report.
     *
     * @param array $data The data to include in the report.
     * @param array $columns The column headers for the report.
     * @return string Path to the generated CSV file
     */
    protected function generateCsvReport(array $data, array $columns): string
    {
        // Create a new Spreadsheet instance
        $spreadsheet = new Spreadsheet();

        // Set up the worksheet with column headers
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray([$columns], null, 'A1');

        // Populate the worksheet with the provided data
        $sheet->fromArray($data, null, 'A2');

        // Generate a unique file name
        $fileName = $this->getReportFileName();

        // Save the spreadsheet to a temporary file
        $writer = new Csv($spreadsheet);
        $filePath = sys_get_temp_dir() . '/' . $fileName;
        $writer->save($filePath);

        // Return the path to the temporary file
        return $filePath;
    }

    /**
     * Store metadata about the generated report.
     *
     * @param string $filePath The path to the generated report file.
     * @param string $fileName The name of the generated report file.
     * @return bool True if successful, false otherwise
     */
    protected function storeReportMetadata(string $filePath, string $fileName): bool
    {
        // Create a record in the reports table with metadata
        // Include report ID, user ID, report type, file path, file name, format, generation time, etc.
        // (Placeholder for database interaction)
        Log::info("Storing report metadata (placeholder)", [
            'report_id' => $this->reportId,
            'file_path' => $filePath,
            'file_name' => $fileName,
            'user_id' => $this->userId,
            'report_type' => $this->reportType,
            'format' => $this->format,
        ]);

        // Return true if the record was created successfully
        return true;
    }

    /**
     * Generate a standardized file name for the report.
     *
     * @return string Generated file name
     */
    protected function getReportFileName(): string
    {
        // Combine report type, date, user ID, and format into a standardized file name
        $fileName = Str::slug($this->reportType) . '-' . Carbon::now()->format('YmdHis') . '-' . $this->userId . '.' . $this->format;

        // Sanitize the file name to remove invalid characters
        $fileName = preg_replace('/[^a-zA-Z0-9\\._\\-]/', '', $fileName);

        // Return the sanitized file name
        return $fileName;
    }

    /**
     * Handle a job failure.
     *
     * @param Exception $exception The exception that caused the failure.
     * @return void
     */
    public function failed(Exception $exception): void
    {
        // Log the job failure with report type and exception message
        Log::error("GenerateApplicationReport job failed", [
            'report_id' => $this->reportId,
            'report_type' => $this->reportType,
            'format' => $this->format,
            'user_id' => $this->userId,
            'filters' => $this->filters,
            'exception' => $exception,
        ]);

        // Clean up any temporary files that may have been created
        $tempFiles = glob(sys_get_temp_dir() . '/' . Str::slug($this->reportType) . '-' . Carbon::now()->format('YmdHis') . '-' . $this->userId . '.*');
        foreach ($tempFiles as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }
}