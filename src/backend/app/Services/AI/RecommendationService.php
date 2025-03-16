<?php

namespace App\Services\AI;

use App\Models\Application; // src/backend/app/Models/Application.php
use App\Models\User; // src/backend/app/Models/User.php
use App\Models\Document; // src/backend/app/Models/Document.php
use App\Services\WorkflowEngineService; // src/backend/app/Services/WorkflowEngineService.php
use App\Models\WorkflowStage; // src/backend/app/Models/WorkflowStage.php
use OpenAI; // openai-php/client ^1.0
use Illuminate\Support\Facades\Cache; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0

/**
 * Service class for generating personalized AI-driven recommendations
 */
class RecommendationService
{
    /**
     * OpenAI API client
     *
     * @var OpenAI
     */
    protected $openAIClient;

    /**
     * WorkflowEngineService instance
     *
     * @var WorkflowEngineService
     */
    protected $workflowEngineService;

    /**
     * AI model to use for recommendation generation
     *
     * @var string
     */
    protected string $model;

    /**
     * Minimum confidence score for recommendations
     *
     * @var float
     */
    protected float $minConfidenceScore;

    /**
     * Maximum number of recommendations to return
     *
     * @var int
     */
    protected int $maxRecommendations;

    /**
     * Personalization factors to consider
     *
     * @var array
     */
    protected array $personalizationFactors;

    /**
     * Storage path for recommendation data
     *
     * @var string
     */
    protected string $storagePath;

    /**
     * Cache TTL for recommendations
     *
     * @var int
     */
    protected int $cacheTtl;

    /**
     * Create a new recommendation service instance
     *
     * @param OpenAI $openAIClient
     * @param WorkflowEngineService $workflowEngineService
     * @return void
     */
    public function __construct(OpenAI $openAIClient, WorkflowEngineService $workflowEngineService)
    {
        // Set the OpenAI client instance
        $this->openAIClient = $openAIClient;

        // Set the WorkflowEngineService instance
        $this->workflowEngineService = $workflowEngineService;

        // Load configuration from config/ai.php recommendation_engine section
        $config = Config::get('ai.recommendation_engine', []);

        // Set AI model from configuration (default: gpt-4)
        $this->model = $config['model'] ?? 'gpt-4';

        // Set minimum confidence score from configuration (default: 0.6)
        $this->minConfidenceScore = $config['min_confidence_score'] ?? 0.6;

        // Set maximum recommendations from configuration (default: 5)
        $this->maxRecommendations = $config['max_recommendations'] ?? 5;

        // Set personalization factors from configuration
        $this->personalizationFactors = $config['personalization_factors'] ?? [];

        // Set storage path for recommendation data from configuration
        $this->storagePath = $config['storage_path'] ?? storage_path('app/recommendations');

        // Set cache TTL from configuration (default: 3600 seconds)
        $this->cacheTtl = $config['cache_ttl'] ?? 3600;
    }

    /**
     * Get personalized recommendations for a user
     *
     * @param User $user
     * @param Application|null $application
     * @return array Array of recommendation objects
     */
    public function getRecommendations(User $user, ?Application $application = null): array
    {
        // Check if recommendations are enabled in configuration
        if (!Config::get('ai.recommendation_engine.enabled', true)) {
            return [];
        }

        // Generate cache key
        $cacheKey = $this->getCacheKey('recommendations', $user, $application);

        // Check if recommendations are cached for this user/application
        if (Cache::has($cacheKey)) {
            // If cached, return cached recommendations
            return Cache::get($cacheKey);
        }

        // Gather user context data (profile, application history)
        $userContext = $this->prepareUserContext($user);

        // Gather application context if an application is provided
        $applicationContext = $application ? $this->prepareApplicationContext($application) : [];

        // Merge user and application context
        $context = array_merge($userContext, $applicationContext);

        // Generate recommendations using AI model
        $recommendations = $this->generateRecommendationsWithAI($context, 'general');

        // Filter recommendations by minimum confidence score
        $filteredRecommendations = array_filter($recommendations, function ($recommendation) {
            return $recommendation['confidence'] >= $this->minConfidenceScore;
        });

        // Limit to maximum number of recommendations
        $limitedRecommendations = array_slice($filteredRecommendations, 0, $this->maxRecommendations);

        // Cache the recommendations for future requests
        $this->cacheRecommendations($cacheKey, $limitedRecommendations);

        // Store recommendation data for analysis and improvement
        $this->storeRecommendationData($user, $limitedRecommendations, $context);

        // Log recommendation activity
        $this->logRecommendationActivity($user, 'general', count($limitedRecommendations));

        // Return the array of recommendation objects
        return $limitedRecommendations;
    }

    /**
     * Get recommendations for next steps in the application process
     *
     * @param Application $application
     * @return array Array of next step recommendation objects
     */
    public function getNextStepRecommendations(Application $application): array
    {
        // Check if recommendations are enabled in configuration
        if (!Config::get('ai.recommendation_engine.enabled', true)) {
            return [];
        }

        // Generate cache key
        $cacheKey = $this->getCacheKey('next_steps', $application->user, $application);

        // Check if next step recommendations are cached for this application
        if (Cache::has($cacheKey)) {
            // If cached, return cached recommendations
            return Cache::get($cacheKey);
        }

        // Get the current workflow stage for the application
        $currentStage = $this->workflowEngineService->getCurrentStage($application);

        // If no current stage exists, return an empty array
        if (!$currentStage) {
            return [];
        }

        // Get the stage requirement status from WorkflowEngineService
        $requirementStatus = $this->workflowEngineService->evaluateStageRequirements($application, $currentStage);

        // Identify incomplete requirements as potential next steps
        $nextSteps = [];

        if (!$requirementStatus['met']) {
            if (isset($requirementStatus['missing']['documents'])) {
                foreach ($requirementStatus['missing']['documents'] as $documentType) {
                    $nextSteps[] = [
                        'type' => 'document',
                        'document_type' => $documentType,
                        'description' => "Upload your {$documentType} document.",
                        'priority' => 1,
                    ];
                }
            }
        }

        // Get available transitions for potential future steps
        $availableTransitions = $this->workflowEngineService->getAvailableTransitions($application, $application->user);

        // Generate prioritized next steps based on deadlines and requirements
        $prioritizedNextSteps = $this->prioritizeRecommendations($nextSteps, []);

        // Add confidence scores and action information to each step
        $recommendations = array_map(function ($step) {
            $step['confidence'] = 0.8; // Assign a default confidence score
            return $this->addActionToRecommendation($step);
        }, $prioritizedNextSteps);

        // Cache the next step recommendations
        $this->cacheRecommendations($cacheKey, $recommendations);

        // Store recommendation data for analysis and improvement
        $this->storeRecommendationData($application->user, $recommendations, []);

        // Log recommendation activity
        $this->logRecommendationActivity($application->user, 'next_steps', count($recommendations));

        // Return the array of next step recommendation objects
        return $recommendations;
    }

    /**
     * Get recommendations for document preparation and submission
     *
     * @param Application $application
     * @return array Array of document recommendation objects
     */
    public function getDocumentRecommendations(Application $application): array
    {
        // Check if recommendations are enabled in configuration
        if (!Config::get('ai.recommendation_engine.enabled', true)) {
            return [];
        }

        // Generate cache key
        $cacheKey = $this->getCacheKey('document_recommendations', $application->user, $application);

        // Check if document recommendations are cached for this application
        if (Cache::has($cacheKey)) {
            // If cached, return cached recommendations
            return Cache::get($cacheKey);
        }

        // Get missing documents for the application
        $missingDocuments = $application->getMissingDocuments();

        // Get the current workflow stage for the application
        $currentStage = $this->workflowEngineService->getCurrentStage($application);

        // Get required documents for current and upcoming stages
        $requiredDocuments = $currentStage ? $currentStage->getRequiredDocuments() : [];

        // Generate document recommendations with preparation tips
        $documentRecommendations = [];
        foreach ($missingDocuments as $documentType) {
            $documentRecommendations[] = [
                'type' => 'document',
                'document_type' => $documentType,
                'description' => "Prepare and upload your {$documentType} document.",
                'priority' => in_array($documentType, $requiredDocuments) ? 2 : 1,
            ];
        }

        // Prioritize documents based on workflow requirements and deadlines
        $prioritizedRecommendations = $this->prioritizeRecommendations($documentRecommendations, []);

        // Add confidence scores and action information to each recommendation
        $recommendations = array_map(function ($recommendation) {
            $recommendation['confidence'] = 0.7; // Assign a default confidence score
            return $this->addActionToRecommendation($recommendation);
        }, $prioritizedRecommendations);

        // Cache the document recommendations
        $this->cacheRecommendations($cacheKey, $recommendations);

        // Store recommendation data for analysis and improvement
        $this->storeRecommendationData($application->user, $recommendations, []);

        // Log recommendation activity
        $this->logRecommendationActivity($application->user, 'document_recommendations', count($recommendations));

        // Return the array of document recommendation objects
        return $recommendations;
    }

    /**
     * Get personalized guidance based on application progress and user behavior
     *
     * @param User $user
     * @param Application|null $application
     * @return array Array of guidance recommendation objects
     */
    public function getPersonalizedGuidance(User $user, ?Application $application = null): array
    {
        // Check if recommendations are enabled in configuration
        if (!Config::get('ai.recommendation_engine.enabled', true)) {
            return [];
        }

        // Generate cache key
        $cacheKey = $this->getCacheKey('personalized_guidance', $user, $application);

        // Check if guidance recommendations are cached for this user/application
        if (Cache::has($cacheKey)) {
            // If cached, return cached guidance
            return Cache::get($cacheKey);
        }

        // Gather user context data (profile, application history, behavior)
        $userContext = $this->prepareUserContext($user);

        // Gather application context if an application is provided
        $applicationContext = $application ? $this->prepareApplicationContext($application) : [];

        // Merge user and application context
        $context = array_merge($userContext, $applicationContext);

        // Identify areas where the user might need additional guidance
        // (e.g., incomplete sections, low confidence scores, approaching deadlines)

        // Generate personalized guidance recommendations using AI model
        $guidanceRecommendations = $this->generateRecommendationsWithAI($context, 'guidance');

        // Filter guidance by minimum confidence score
        $filteredGuidance = array_filter($guidanceRecommendations, function ($recommendation) {
            return $recommendation['confidence'] >= $this->minConfidenceScore;
        });

        // Cache the guidance recommendations
        $this->cacheRecommendations($cacheKey, $filteredGuidance);

        // Store recommendation data for analysis and improvement
        $this->storeRecommendationData($user, $filteredGuidance, $context);

        // Log recommendation activity
        $this->logRecommendationActivity($user, 'personalized_guidance', count($filteredGuidance));

        // Return the array of guidance recommendation objects
        return $filteredGuidance;
    }

    /**
     * Generate recommendations using the OpenAI API
     *
     * @param array $context
     * @param string $type
     * @return array Array of AI-generated recommendations
     */
    protected function generateRecommendationsWithAI(array $context, string $type): array
    {
        // Prepare the prompt based on recommendation type and context
        $prompt = "Generate recommendations for {$type} with the following context: " . json_encode($context);

        // Call the OpenAI API with the prepared prompt
        $response = $this->openAIClient->chat()->create([
            'model' => $this->model,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
        ]);

        // Parse the API response to extract structured recommendations
        $recommendations = json_decode($response->choices[0]->message->content, true) ?? [];

        // Add confidence scores based on AI model's confidence
        foreach ($recommendations as &$recommendation) {
            $recommendation['confidence'] = 0.9; // Example confidence score
        }

        // Format the recommendations into a standardized structure
        $formattedRecommendations = [];
        foreach ($recommendations as $recommendation) {
            $formattedRecommendations[] = [
                'type' => $type,
                'description' => $recommendation['description'] ?? 'No description available',
                'priority' => $recommendation['priority'] ?? 1,
                'confidence' => $recommendation['confidence'] ?? 0.7,
            ];
        }

        // Return the array of recommendations
        return $formattedRecommendations;
    }

    /**
     * Prepare user context data for recommendation generation
     *
     * @param User $user
     * @return array User context data
     */
    protected function prepareUserContext(User $user): array
    {
        // Load the user's profile data
        $profile = $user->profile;

        // Get the user's application history
        $applicationHistory = $user->applications->toArray();

        // Get the user's document submission history
        $documentHistory = $user->documents->toArray();

        // Get the user's interaction patterns if available
        $interactionPatterns = []; // Placeholder for future implementation

        // Compile the context data into a structured array
        $context = [
            'profile' => $profile,
            'application_history' => $applicationHistory,
            'document_history' => $documentHistory,
            'interaction_patterns' => $interactionPatterns,
        ];

        // Return the user context data
        return $context;
    }

    /**
     * Prepare application context data for recommendation generation
     *
     * @param Application $application
     * @return array Application context data
     */
    protected function prepareApplicationContext(Application $application): array
    {
        // Get the application's current status and stage
        $currentStatus = $application->currentStatus;
        $currentStage = $currentStatus ? $currentStatus->workflowStage : null;

        // Get the application's completion status
        $isComplete = $application->isComplete();

        // Get the application's document status
        $missingDocuments = $application->getMissingDocuments();

        // Get the application's workflow progress
        $workflowProgress = []; // Placeholder for future implementation

        // Get relevant deadlines for the application
        $deadlines = []; // Placeholder for future implementation

        // Compile the context data into a structured array
        $context = [
            'current_status' => $currentStatus,
            'current_stage' => $currentStage,
            'is_complete' => $isComplete,
            'missing_documents' => $missingDocuments,
            'workflow_progress' => $workflowProgress,
            'deadlines' => $deadlines,
        ];

        // Return the application context data
        return $context;
    }

    /**
     * Prioritize recommendations based on deadlines, requirements, and user context
     *
     * @param array $recommendations
     * @param array $context
     * @return array Prioritized recommendations
     */
    protected function prioritizeRecommendations(array $recommendations, array $context): array
    {
        // Assign priority scores to each recommendation based on:
        // - Deadline proximity (higher priority for closer deadlines)
        // - Requirement criticality (higher priority for required items)
        // - User context (higher priority for items matching user needs)
        // - Workflow progression (higher priority for blocking items)

        // Sort recommendations by priority score
        usort($recommendations, function ($a, $b) {
            return $b['priority'] <=> $a['priority'];
        });

        // Return the prioritized recommendations
        return $recommendations;
    }

    /**
     * Add action information to a recommendation
     *
     * @param array $recommendation
     * @return array Recommendation with action information
     */
    protected function addActionToRecommendation(array $recommendation): array
    {
        // Determine the appropriate action based on recommendation type
        switch ($recommendation['type']) {
            case 'document':
                // Add document upload action
                $recommendation['action_label'] = 'Upload Document';
                $recommendation['action_url'] = '/documents/upload';
                break;
            case 'next_step':
                // Add relevant action based on step type
                $recommendation['action_label'] = 'Take Action';
                $recommendation['action_url'] = '/applications/next-steps';
                break;
            case 'guidance':
                // Add appropriate guidance action
                $recommendation['action_label'] = 'View Guidance';
                $recommendation['action_url'] = '/guidance';
                break;
            default:
                $recommendation['action_label'] = 'View Details';
                $recommendation['action_url'] = '/details';
                break;
        }

        // Return the recommendation with action information
        return $recommendation;
    }

    /**
     * Cache recommendations for future requests
     *
     * @param string $cacheKey
     * @param array $recommendations
     * @return void
     */
    protected function cacheRecommendations(string $cacheKey, array $recommendations): void
    {
        // Use Laravel Cache facade to store recommendations
        Cache::put($cacheKey, $recommendations, $this->cacheTtl);
    }

    /**
     * Generate a cache key for recommendations
     *
     * @param string $type
     * @param User $user
     * @param Application|null $application
     * @return string Cache key for recommendations
     */
    protected function getCacheKey(string $type, User $user, ?Application $application = null): string
    {
        // Generate a unique cache key based on recommendation type
        $cacheKey = "recommendations:{$type}:user_{$user->id}";

        // Include application ID in the cache key if an application is provided
        if ($application) {
            $cacheKey .= ":application_{$application->id}";
        }

        // Return the generated cache key
        return $cacheKey;
    }

    /**
     * Store recommendation data for analysis and improvement
     *
     * @param User $user
     * @param array $recommendations
     * @param array $context
     * @return bool True if storage was successful, false otherwise
     */
    protected function storeRecommendationData(User $user, array $recommendations, array $context): bool
    {
        // Generate a unique filename for the recommendation data
        $filename = "recommendations_user_{$user->id}_" . uniqid() . '.json';
        $filePath = $this->storagePath . '/' . $filename;

        // Prepare data structure with recommendations, context, and metadata
        $data = [
            'user_id' => $user->id,
            'recommendations' => $recommendations,
            'context' => $context,
            'timestamp' => now()->toDateTimeString(),
        ];

        // Store the data as JSON in the configured storage path
        if (!is_dir($this->storagePath)) {
            mkdir($this->storagePath, 0777, true);
        }

        $success = file_put_contents($filePath, json_encode($data));

        // Return true if storage was successful, false otherwise
        return $success !== false;
    }

    /**
     * Log recommendation generation activity
     *
     * @param User $user
     * @param string $type
     * @param int $count
     * @return void
     */
    protected function logRecommendationActivity(User $user, string $type, int $count): void
    {
        // Use Laravel Log facade to log recommendation activity
        Log::info("Generated {$count} {$type} recommendations for user {$user->id}");
    }
}