<?php

namespace App\Services\AI;

use App\Exceptions\DocumentProcessingException;
use App\Models\Application; // Import the Application model
use App\Models\User; // Import the User model
use App\Models\Document; // Import the Document model
use App\Services\AI\DocumentAnalysisService; // Import the DocumentAnalysisService
use App\Services\AuditService; // Import the AuditService
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Storage; // illuminate/support/facades ^10.0
use OpenAI; // openai-php/client ^1.0

/**
 * Service class for detecting potentially fraudulent applications and documents
 */
class FraudDetectionService
{
    /**
     * The DocumentAnalysisService instance.
     *
     * @var DocumentAnalysisService
     */
    protected DocumentAnalysisService $documentAnalysisService;

    /**
     * The AuditService instance.
     *
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * Flag indicating whether fraud detection is enabled.
     *
     * @var bool
     */
    protected bool $enabled;

    /**
     * Sensitivity level for fraud detection (low, medium, high).
     *
     * @var string
     */
    protected string $sensitivity;

    /**
     * Risk thresholds for determining risk level.
     *
     * @var array
     */
    protected array $riskThresholds;

    /**
     * List of enabled detection features.
     *
     * @var array
     */
    protected array $detectionFeatures;

    /**
     * Flag indicating whether to automatically flag suspicious applications.
     *
     * @var bool
     */
    protected bool $autoFlag;

    /**
     * The storage path for fraud detection data.
     *
     * @var string
     */
    protected string $storagePath;

    /**
     * Create a new fraud detection service instance.
     *
     * @param DocumentAnalysisService $documentAnalysisService
     * @param AuditService $auditService
     * @return void
     */
    public function __construct(DocumentAnalysisService $documentAnalysisService, AuditService $auditService)
    {
        // Set the DocumentAnalysisService instance
        $this->documentAnalysisService = $documentAnalysisService;

        // Set the AuditService instance
        $this->auditService = $auditService;

        // Load configuration from config/ai.php
        $config = Config::get('ai.fraud_detection');

        // Set enabled flag from configuration (default: true)
        $this->enabled = $config['enabled'] ?? true;

        // Set sensitivity level from configuration (default: medium)
        $this->sensitivity = $config['sensitivity'] ?? 'medium';

        // Set risk thresholds from configuration
        $this->riskThresholds = $config['risk_thresholds'] ?? [
            'low' => 0.3,
            'medium' => 0.6,
            'high' => 0.8,
        ];

        // Set detection features from configuration
        $this->detectionFeatures = $config['detection_features'] ?? [
            'data_consistency',
            'identity_verification',
            'behavioral_patterns',
            'document_analysis',
        ];

        // Set auto-flag setting from configuration
        $this->autoFlag = $config['auto_flag'] ?? false;

        // Set storage path for fraud detection data from configuration
        $this->storagePath = $config['storage_path'] ?? 'fraud_detection';
    }

    /**
     * Analyze an application for potential fraud indicators
     *
     * @param Application $application
     * @return array Analysis results with risk score and detected issues
     */
    public function analyzeApplication(Application $application): array
    {
        // Check if fraud detection is enabled
        if (!$this->isEnabled()) {
            return [
                'risk_score' => 0,
                'risk_level' => 'low',
                'detected_issues' => [],
                'message' => 'Fraud detection is disabled.',
            ];
        }

        // Initialize results array with default values
        $results = [
            'risk_score' => 0,
            'risk_level' => 'low',
            'detected_issues' => [],
            'data_consistency' => [],
            'identity_information' => [],
            'behavioral_patterns' => [],
            'document_analysis' => [],
        ];

        // Analyze application data consistency
        if ($this->isFeatureEnabled('data_consistency')) {
            $results['data_consistency'] = $this->analyzeApplicationDataConsistency($application);
            $results['detected_issues'] = array_merge($results['detected_issues'], $results['data_consistency']['detected_inconsistencies'] ?? []);
        }

        // Analyze identity information
        if ($this->isFeatureEnabled('identity_verification')) {
            $results['identity_information'] = $this->analyzeIdentityInformation($application);
            $results['detected_issues'] = array_merge($results['detected_issues'], $results['identity_information']['detected_issues'] ?? []);
        }

        // Analyze application behavior patterns
        if ($this->isFeatureEnabled('behavioral_patterns')) {
            $results['behavioral_patterns'] = $this->analyzeBehavioralPatterns($application);
            $results['detected_issues'] = array_merge($results['detected_issues'], $results['behavioral_patterns']['detected_patterns'] ?? []);
        }

        // Analyze documents if available
        if ($this->isFeatureEnabled('document_analysis') && $application->documents()->exists()) {
            foreach ($application->documents as $document) {
                $results['document_analysis'][$document->id] = $this->analyzeDocument($document);
                $results['detected_issues'] = array_merge($results['detected_issues'], $results['document_analysis'][$document->id]['detected_issues'] ?? []);
            }
        }

        // Calculate overall risk score based on individual analyses
        $results['risk_score'] = $this->calculateRiskScore($results);

        // Determine risk level (low, medium, high) based on thresholds
        $results['risk_level'] = $this->determineRiskLevel($results['risk_score']);

        // Log high-risk applications as security events
        if ($results['risk_level'] === 'high') {
            $this->auditService->logSecurityEvent(
                'high_risk_application',
                [
                    'application_id' => $application->id,
                    'risk_score' => $results['risk_score'],
                    'detected_issues' => $results['detected_issues'],
                ],
                $application->user
            );
        }

        // Store analysis results for future reference
        $this->storeDetectionResults('application', $application->id, $results);

        // Return analysis results with risk score and detected issues
        return $results;
    }

    /**
     * Analyze a document for signs of tampering or fraud
     *
     * @param Document $document
     * @param array|null $expectedData
     * @return array Analysis results with risk score and detected issues
     */
    public function analyzeDocument(Document $document, array $expectedData = null): array
    {
        // Check if fraud detection is enabled
        if (!$this->isEnabled()) {
            return [
                'risk_score' => 0,
                'risk_level' => 'low',
                'detected_issues' => [],
                'message' => 'Fraud detection is disabled.',
            ];
        }

        // Initialize results array with default values
        $results = [
            'risk_score' => 0,
            'risk_level' => 'low',
            'detected_issues' => [],
            'tampering_detection' => [],
            'content_validation' => [],
        ];

        // Use DocumentAnalysisService to detect tampering
        if ($this->isFeatureEnabled('tampering_detection')) {
            try {
                $results['tampering_detection'] = $this->documentAnalysisService->detectDocumentTampering($document);
                if ($results['tampering_detection']['tampering_detected']) {
                    $results['detected_issues'][] = 'Document tampering detected';
                }
            } catch (\Exception $e) {
                Log::warning("Tampering detection failed for document {$document->id}: " . $e->getMessage());
                $results['detected_issues'][] = 'Tampering detection failed: ' . $e->getMessage();
            }
        }

        // Validate document content against expected data if provided
        if ($expectedData && $this->isFeatureEnabled('content_validation')) {
            try {
                $results['content_validation'] = $this->documentAnalysisService->validateDocumentContent($document, $expectedData);
                if (!$results['content_validation']['validation_passed']) {
                    $results['detected_issues'][] = 'Document content validation failed';
                }
            } catch (\Exception $e) {
                Log::warning("Content validation failed for document {$document->id}: " . $e->getMessage());
                $results['detected_issues'][] = 'Content validation failed: ' . $e->getMessage();
            }
        }

        // Check document metadata for inconsistencies
        // (Implementation depends on how metadata is stored and accessed)

        // Calculate document risk score based on findings
        $results['risk_score'] = $this->calculateRiskScore($results);

        // Determine risk level (low, medium, high) based on thresholds
        $results['risk_level'] = $this->determineRiskLevel($results['risk_score']);

        // Log high-risk documents as security events
        if ($results['risk_level'] === 'high') {
            $this->auditService->logSecurityEvent(
                'high_risk_document',
                [
                    'document_id' => $document->id,
                    'risk_score' => $results['risk_score'],
                    'detected_issues' => $results['detected_issues'],
                ],
                $document->user
            );
        }

        // Store analysis results for future reference
        $this->storeDetectionResults('document', $document->id, $results);

        // Return analysis results with risk score and detected issues
        return $results;
    }

    /**
     * Analyze application data for internal consistency and potential misrepresentations
     *
     * @param Application $application
     * @return array Consistency analysis results with confidence score
     */
    protected function analyzeApplicationDataConsistency(Application $application): array
    {
        // Extract application data using getApplicationData()
        $data = $application->getApplicationData();

        // Check for inconsistencies between related fields
        $inconsistencies = [];

        // Verify timeline consistency (dates, academic history)
        // (Implementation depends on the structure of application data)

        // Check for unusual patterns in application data
        // (Implementation depends on the structure of application data)

        // Calculate consistency confidence score
        $confidenceScore = 1.0; // Default to 1.0 (no inconsistencies found)
        if (count($inconsistencies) > 0) {
            $confidenceScore = max(0, 1 - (count($inconsistencies) / 5)); // Reduce confidence based on number of inconsistencies
        }

        // Return results with detected inconsistencies and confidence score
        return [
            'confidence_score' => $confidenceScore,
            'detected_inconsistencies' => $inconsistencies,
        ];
    }

    /**
     * Analyze user identity information for potential misrepresentation
     *
     * @param Application $application
     * @return array Identity verification results with confidence score
     */
    protected function analyzeIdentityInformation(Application $application): array
    {
        // Get user and profile data from the application
        $user = $application->user;
        $profile = $user->profile;

        // Check for identity inconsistencies across application components
        $issues = [];

        // Verify contact information validity
        // (Implementation depends on external validation services)

        // Check for known fraud patterns in identity data
        // (Implementation depends on access to fraud databases)

        // Calculate identity verification confidence score
        $confidenceScore = 1.0; // Default to 1.0 (no issues found)
        if (count($issues) > 0) {
            $confidenceScore = max(0, 1 - (count($issues) / 3)); // Reduce confidence based on number of issues
        }

        // Return results with detected issues and confidence score
        return [
            'confidence_score' => $confidenceScore,
            'detected_issues' => $issues,
        ];
    }

    /**
     * Analyze user behavior patterns for suspicious activities
     *
     * @param Application $application
     * @return array Behavioral analysis results with confidence score
     */
    protected function analyzeBehavioralPatterns(Application $application): array
    {
        // Analyze application submission patterns
        $patterns = [];

        // Check for unusual access patterns (if available)
        // (Implementation depends on access to user activity logs)

        // Analyze timing of document uploads and changes
        // (Implementation depends on access to document history)

        // Look for patterns matching known fraud behaviors
        // (Implementation depends on access to fraud databases)

        // Calculate behavioral confidence score
        $confidenceScore = 1.0; // Default to 1.0 (no suspicious patterns found)
        if (count($patterns) > 0) {
            $confidenceScore = max(0, 1 - (count($patterns) / 4)); // Reduce confidence based on number of patterns
        }

        // Return results with detected patterns and confidence score
        return [
            'confidence_score' => $confidenceScore,
            'detected_patterns' => $patterns,
        ];
    }

    /**
     * Calculate an overall risk score based on multiple analysis factors
     *
     * @param array $analysisResults
     * @return float Risk score between 0 and 1
     */
    protected function calculateRiskScore(array $analysisResults): float
    {
        // Extract confidence scores from each analysis component
        $dataConsistencyScore = $analysisResults['data_consistency']['confidence_score'] ?? 1.0;
        $identityInformationScore = $analysisResults['identity_information']['confidence_score'] ?? 1.0;
        $behavioralPatternsScore = $analysisResults['behavioral_patterns']['confidence_score'] ?? 1.0;
        $documentAnalysisScores = array_column($analysisResults['document_analysis'], 'risk_score') ?? [];
        $documentAnalysisScore = !empty($documentAnalysisScores) ? array_sum($documentAnalysisScores) / count($documentAnalysisScores) : 1.0;

        // Apply weights to different factors based on sensitivity setting
        $weights = [
            'data_consistency' => 0.2,
            'identity_information' => 0.3,
            'behavioral_patterns' => 0.1,
            'document_analysis' => 0.4,
        ];

        // Adjust weights based on sensitivity
        if ($this->sensitivity === 'low') {
            $weights['data_consistency'] = 0.1;
            $weights['identity_information'] = 0.2;
            $weights['behavioral_patterns'] = 0.05;
            $weights['document_analysis'] = 0.65;
        } elseif ($this->sensitivity === 'high') {
            $weights['data_consistency'] = 0.3;
            $weights['identity_information'] = 0.4;
            $weights['behavioral_patterns'] = 0.15;
            $weights['document_analysis'] = 0.15;
        }

        // Calculate weighted average risk score
        $riskScore = (
            ($dataConsistencyScore * $weights['data_consistency']) +
            ($identityInformationScore * $weights['identity_information']) +
            ($behavioralPatternsScore * $weights['behavioral_patterns']) +
            ($documentAnalysisScore * $weights['document_analysis'])
        );

        // Apply any penalty factors for critical issues
        if (in_array('critical_issue', $analysisResults['detected_issues'])) {
            $riskScore = max(0, $riskScore - 0.2); // Reduce risk score by 20% for critical issues
        }

        // Ensure the final score is between 0 and 1
        return min(max($riskScore, 0), 1);
    }

    /**
     * Determine the risk level based on the calculated risk score
     *
     * @param float $riskScore
     * @return string Risk level (low, medium, high)
     */
    protected function determineRiskLevel(float $riskScore): string
    {
        // Compare risk score against configured thresholds
        if ($riskScore >= $this->riskThresholds['high']) {
            return 'high';
        } elseif ($riskScore >= $this->riskThresholds['medium']) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Flag an application as suspicious for manual review
     *
     * @param Application $application
     * @param array $detectionResults
     * @return bool True if the application was successfully flagged
     */
    public function flagSuspiciousApplication(Application $application, array $detectionResults): bool
    {
        // Check if auto-flagging is enabled
        if (!$this->autoFlag) {
            return false;
        }

        // Create a note on the application about the suspicious activity
        $noteContent = "Application flagged as suspicious by AI fraud detection:\n" .
                       "Risk Score: " . $detectionResults['risk_score'] . "\n" .
                       "Detected Issues: " . implode(', ', $detectionResults['detected_issues']);

        $application->notes()->create([
            'user_id' => Auth::id(),
            'content' => $noteContent,
            'is_internal' => true,
        ]);

        // Update application metadata to indicate fraud review required
        $application->application_data['fraud_review_required'] = true;
        $application->save();

        // Log the flagging action using AuditService
        $this->auditService->log(
            'flagged_for_fraud',
            'application',
            $application->id,
            null,
            ['reason' => 'AI fraud detection', 'risk_score' => $detectionResults['risk_score']],
            Auth::user()
        );

        return true;
    }

    /**
     * Store fraud detection results for future reference
     *
     * @param string $resourceType
     * @param int $resourceId
     * @param array $results
     * @return string Path to the stored results
     */
    protected function storeDetectionResults(string $resourceType, int $resourceId, array $results): string
    {
        $filename = "{$resourceType}_{$resourceId}_" . uniqid() . '.json';
        $path = $this->storagePath . '/' . $filename;

        // Ensure the storage directory exists
        if (!Storage::exists($this->storagePath)) {
            Storage::makeDirectory($this->storagePath);
        }

        // Format the results as JSON with timestamp
        $data = [
            'timestamp' => now()->toDateTimeString(),
            'results' => $results,
        ];

        // Store the results in the configured storage path
        Storage::put($path, json_encode($data, JSON_PRETTY_PRINT));

        // Return the path to the stored results
        return $path;
    }

    /**
     * Retrieve previously stored detection results
     *
     * @param string $resourceType
     * @param int $resourceId
     * @return array|null Previously stored detection results or null if not found
     */
    protected function getDetectionResults(string $resourceType, int $resourceId): ?array
    {
        $files = Storage::files($this->storagePath);
        $pattern = "/{$resourceType}_{$resourceId}_(.*)\.json/";

        foreach ($files as $file) {
            if (preg_match($pattern, $file)) {
                $content = Storage::get($file);
                if ($content) {
                    $data = json_decode($content, true);
                    return $data['results'] ?? null;
                }
            }
        }

        return null;
    }

    /**
     * Check if fraud detection is enabled
     *
     * @return bool True if fraud detection is enabled
     */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * Get the current sensitivity level for fraud detection
     *
     * @return string Sensitivity level (low, medium, high)
     */
    public function getSensitivity(): string
    {
        return $this->sensitivity;
    }

    /**
     * Set the sensitivity level for fraud detection
     *
     * @param string $level
     * @return void No return value
     */
    public function setSensitivity(string $level): void
    {
        // Validate that level is one of: low, medium, high
        if (!in_array($level, ['low', 'medium', 'high'])) {
            throw new \InvalidArgumentException("Invalid sensitivity level: {$level}");
        }

        // Set the sensitivity property to the provided level
        $this->sensitivity = $level;

        // Adjust risk thresholds based on the new sensitivity level
        // (Implementation depends on the specific risk model)
    }

    /**
     * Get the list of enabled detection features
     *
     * @return array List of enabled detection features
     */
    public function getDetectionFeatures(): array
    {
        return $this->detectionFeatures;
    }

    /**
     * Check if a specific detection feature is enabled
     *
     * @param string $feature
     * @return bool True if the feature is enabled
     */
    public function isFeatureEnabled(string $feature): bool
    {
        return in_array($feature, $this->detectionFeatures);
    }
}