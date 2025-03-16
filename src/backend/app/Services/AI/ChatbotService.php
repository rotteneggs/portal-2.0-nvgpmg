<?php

namespace App\Services\AI;

use App\Models\Application;
use App\Models\User;
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Cache; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use OpenAI; // openai-php/client ^1.0
use Exception; // php 8.2

class ChatbotService
{
    /**
     * The OpenAI client instance.
     */
    protected OpenAI $client;

    /**
     * The configuration for the chatbot service.
     */
    protected array $config;

    /**
     * The AI model to use for the chatbot.
     */
    protected string $model;

    /**
     * The temperature setting for response generation.
     */
    protected float $temperature;

    /**
     * The maximum number of tokens to generate.
     */
    protected int $maxTokens;

    /**
     * The number of conversation exchanges to include in context.
     */
    protected int $contextWindowSize;

    /**
     * The confidence threshold below which to recommend human handoff.
     */
    protected float $humanHandoffThreshold;

    /**
     * Default prompt templates for different situations.
     */
    protected array $defaultPrompts;

    /**
     * Path to the knowledge base content.
     */
    protected string $knowledgeBasePath;

    /**
     * Create a new chatbot service instance.
     *
     * @param OpenAI $client
     * @return void
     */
    public function __construct(OpenAI $client)
    {
        $this->client = $client;
        
        // Load configuration from config file
        $this->config = Config::get('ai.chatbot', []);
        
        // Set default values from configuration or use fallbacks
        $this->model = $this->config['model'] ?? 'gpt-4';
        $this->temperature = $this->config['temperature'] ?? 0.7;
        $this->maxTokens = $this->config['max_tokens'] ?? 500;
        $this->contextWindowSize = $this->config['context_window_size'] ?? 10;
        $this->humanHandoffThreshold = $this->config['human_handoff_threshold'] ?? 0.4;
        $this->defaultPrompts = $this->config['default_prompts'] ?? [];
        $this->knowledgeBasePath = $this->config['knowledge_base_path'] ?? storage_path('app/chatbot/knowledge');
    }

    /**
     * Get a response from the chatbot based on user message and context.
     *
     * @param string $message The user's message
     * @param array $conversationHistory Previous exchanges in the conversation
     * @param Application|null $application The user's application for context
     * @return array Response data including message text, confidence score, and handoff recommendation
     */
    public function getResponse(string $message, array $conversationHistory = [], ?Application $application = null): array
    {
        // Validate that message is not empty
        if (empty($message)) {
            return [
                'message' => $this->getDefaultResponse('clarification'),
                'confidence_score' => 0,
                'human_handoff' => true
            ];
        }

        try {
            // Prepare conversation context with application data if available
            $context = $this->prepareConversationContext($conversationHistory, $application);
            
            // Build system prompt with instructions and knowledge base content
            $systemPrompt = $this->buildSystemPrompt($context);
            
            // Build the complete conversation history for the API request
            $messages = [
                ['role' => 'system', 'content' => $systemPrompt]
            ];
            
            // Add conversation history
            foreach ($context['conversation_history'] as $exchange) {
                $messages[] = ['role' => $exchange['role'], 'content' => $exchange['content']];
            }
            
            // Add the current user message
            $messages[] = ['role' => 'user', 'content' => $message];
            
            // Get response from OpenAI
            $response = $this->client->chat()->create([
                'model' => $this->model,
                'messages' => $messages,
                'temperature' => $this->temperature,
                'max_tokens' => $this->maxTokens,
            ]);
            
            // Extract the assistant's response
            $responseContent = $response->choices[0]->message->content;
            
            // Calculate confidence score for the response
            $confidenceScore = $this->calculateConfidenceScore($responseContent, $message);
            
            // Determine if human handoff is needed
            $needsHumanHandoff = $this->needsHumanHandoff($confidenceScore, $message, $responseContent);
            
            // Log the interaction for improvement and analytics
            $this->logInteraction(
                $message, 
                $responseContent, 
                $confidenceScore, 
                $needsHumanHandoff,
                $application ? $application->user_id : null,
                $application ? $application->id : null
            );
            
            return [
                'message' => $responseContent,
                'confidence_score' => $confidenceScore,
                'human_handoff' => $needsHumanHandoff
            ];
        } catch (Exception $e) {
            // Log the error
            Log::error('Chatbot error: ' . $e->getMessage(), [
                'exception' => $e,
                'user_message' => $message
            ]);
            
            // Return a fallback response
            return [
                'message' => $this->getDefaultResponse('fallback'),
                'confidence_score' => 0,
                'human_handoff' => true
            ];
        }
    }

    /**
     * Prepare the conversation context with relevant information.
     *
     * @param array $conversationHistory Previous exchanges in the conversation
     * @param Application|null $application The user's application for context
     * @return array Prepared context with conversation history and application data
     */
    protected function prepareConversationContext(array $conversationHistory, ?Application $application): array
    {
        $context = [
            'conversation_history' => []
        ];

        // Limit conversation history to the configured window size
        if (count($conversationHistory) > $this->contextWindowSize) {
            // Keep the most recent exchanges within the window size
            $conversationHistory = array_slice($conversationHistory, -$this->contextWindowSize);
        }
        
        // Format conversation history
        $context['conversation_history'] = $conversationHistory;
        
        // Add application context if available
        if ($application) {
            $context['application'] = [
                'id' => $application->id,
                'type' => $application->application_type,
                'status' => $application->currentStatus ? $application->currentStatus->status : null,
                'submitted' => $application->is_submitted,
            ];
            
            // Add user information if available through the application
            if ($user = $application->user) {
                $context['user'] = [
                    'id' => $user->id,
                    'name' => $user->profile ? $user->profile->full_name : null,
                ];
            }
        }
        
        return $context;
    }

    /**
     * Build the system prompt with instructions and knowledge base.
     *
     * @param array $context The prepared conversation context
     * @return string Complete system prompt for the AI
     */
    protected function buildSystemPrompt(array $context): string
    {
        // Start with base instructions
        $systemPrompt = "You are an AI admissions assistant for a student admissions enrollment platform. ";
        $systemPrompt .= "Your role is to provide helpful, accurate information about the application process, ";
        $systemPrompt .= "answer questions, and provide guidance to prospective students. ";
        $systemPrompt .= "Be friendly, professional, and concise in your responses. ";
        
        // Add relevant knowledge base content based on the user's query/context
        if (isset($context['conversation_history']) && !empty($context['conversation_history'])) {
            // Get the last user message to inform knowledge base retrieval
            $lastUserMessage = '';
            foreach (array_reverse($context['conversation_history']) as $exchange) {
                if ($exchange['role'] === 'user') {
                    $lastUserMessage = $exchange['content'];
                    break;
                }
            }
            
            if (!empty($lastUserMessage)) {
                $knowledgeContent = $this->getKnowledgeBaseContent($lastUserMessage, $context);
                if (!empty($knowledgeContent)) {
                    $systemPrompt .= "\n\nRELEVANT INFORMATION:\n{$knowledgeContent}\n\n";
                }
            }
        }
        
        // Add application-specific information if available
        if (isset($context['application'])) {
            $systemPrompt .= "\nCURRENT APPLICATION CONTEXT:\n";
            $systemPrompt .= "Application Type: " . $context['application']['type'] . "\n";
            $systemPrompt .= "Application Status: " . ($context['application']['status'] ?? 'Not submitted') . "\n";
            $systemPrompt .= "Is Submitted: " . ($context['application']['submitted'] ? 'Yes' : 'No') . "\n";
            
            if (isset($context['user']) && isset($context['user']['name'])) {
                $systemPrompt .= "Applicant Name: " . $context['user']['name'] . "\n";
            }
        }
        
        // Add guidelines for response format and style
        $systemPrompt .= "\nGUIDELINES:\n";
        $systemPrompt .= "1. Provide accurate information about admissions processes and requirements.\n";
        $systemPrompt .= "2. If you don't know the answer, acknowledge this and suggest contacting admissions staff.\n";
        $systemPrompt .= "3. Be concise but thorough in your responses.\n";
        $systemPrompt .= "4. Personalize responses based on the applicant's context when available.\n";
        $systemPrompt .= "5. Don't make up information - stick to the facts in the knowledge base.\n";
        
        return $systemPrompt;
    }

    /**
     * Get relevant knowledge base content based on user query.
     *
     * @param string $query The user's query
     * @param array $context The conversation context
     * @return string Relevant knowledge base content
     */
    protected function getKnowledgeBaseContent(string $query, array $context): string
    {
        // Extract keywords from the user query
        $keywords = preg_split('/\W+/', strtolower($query), -1, PREG_SPLIT_NO_EMPTY);
        $keywords = array_filter($keywords, function($word) {
            // Filter out common stop words
            $stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'is', 'are', 'was', 'were'];
            return !in_array($word, $stopWords) && strlen($word) > 2;
        });
        
        // Use application type as additional context for knowledge retrieval if available
        $applicationType = $context['application']['type'] ?? null;
        
        // Cache key for the knowledge base
        $cacheKey = 'chatbot_knowledge_base';
        
        // Try to get knowledge base from cache
        $knowledgeBase = Cache::remember($cacheKey, 3600, function() {
            // In a real implementation, this would load and process knowledge base files
            // For this implementation, we'll return a predefined set of knowledge items
            return [
                'application_process' => [
                    'keywords' => ['application', 'apply', 'process', 'how', 'start', 'submit', 'form'],
                    'content' => "The application process involves creating an account, filling out the application form, uploading required documents, and submitting your application. Application fees vary by program type. The admissions committee will review your application and notify you of their decision.",
                    'relevance' => ['undergraduate', 'graduate', 'transfer']
                ],
                'required_documents' => [
                    'keywords' => ['document', 'documents', 'required', 'upload', 'transcript', 'recommendation', 'letter', 'essay'],
                    'content' => "Required documents typically include academic transcripts, recommendation letters, and a personal statement or essay. Undergraduate applications require high school transcripts, while graduate applications require college transcripts. All documents must be uploaded in PDF, JPEG, or PNG format with a maximum size of 10MB per file.",
                    'relevance' => ['undergraduate', 'graduate', 'transfer']
                ],
                'application_deadlines' => [
                    'keywords' => ['deadline', 'deadlines', 'when', 'date', 'dates', 'due'],
                    'content' => "Application deadlines vary by program and term. For undergraduate programs, the fall term deadline is typically January 15 for early decision and March 31 for regular decision. For graduate programs, deadlines vary by department but are generally December 1 for fall admission and October 1 for spring admission.",
                    'relevance' => ['undergraduate', 'graduate', 'transfer']
                ],
                'admission_decisions' => [
                    'keywords' => ['decision', 'decisions', 'acceptance', 'reject', 'notification', 'when', 'result'],
                    'content' => "Admission decisions are typically sent within 4-6 weeks after all application materials have been received. Early decision applicants are notified by February 1, and regular decision applicants by April 15. Graduate program decisions vary by department.",
                    'relevance' => ['undergraduate', 'graduate', 'transfer']
                ],
                'financial_aid' => [
                    'keywords' => ['financial', 'aid', 'scholarship', 'scholarships', 'grant', 'grants', 'fafsa', 'loan', 'loans', 'money', 'cost', 'payment'],
                    'content' => "Financial aid options include scholarships, grants, and loans. To apply for financial aid, submit the FAFSA (Free Application for Federal Student Aid) and the institutional financial aid application. Merit scholarships are awarded based on academic achievement, while need-based aid requires financial documentation.",
                    'relevance' => ['undergraduate', 'graduate', 'transfer']
                ],
                'undergraduate_admissions' => [
                    'keywords' => ['undergraduate', 'freshmen', 'freshman', 'high', 'school', 'college'],
                    'content' => "Undergraduate admissions requirements include a completed application form, high school transcripts, standardized test scores (SAT or ACT), recommendation letters, and a personal statement. The average admitted student has a GPA of 3.5+ and SAT scores between 1200-1400.",
                    'relevance' => ['undergraduate']
                ],
                'graduate_admissions' => [
                    'keywords' => ['graduate', 'grad', 'master', 'masters', 'phd', 'doctorate', 'research'],
                    'content' => "Graduate admissions requirements include a bachelor's degree, college transcripts, standardized test scores (GRE, GMAT, etc. depending on program), letters of recommendation, statement of purpose, and sometimes a resume or CV. Some programs may require relevant work experience or specific prerequisite courses.",
                    'relevance' => ['graduate']
                ],
                'transfer_admissions' => [
                    'keywords' => ['transfer', 'college', 'university', 'credit', 'credits'],
                    'content' => "Transfer applicants must submit college transcripts from all previously attended institutions, as well as high school transcripts. A minimum college GPA of 2.5 is typically required, though competitive programs may have higher requirements. Transfer credit evaluation is completed after admission.",
                    'relevance' => ['transfer']
                ]
            ];
        });
        
        // Score each knowledge item for relevance
        $scoredItems = [];
        foreach ($knowledgeBase as $key => $item) {
            $score = 0;
            
            // Score based on keyword matches
            foreach ($keywords as $keyword) {
                if (in_array($keyword, $item['keywords'])) {
                    $score += 2;
                }
            }
            
            // Boost score if application type matches relevance
            if ($applicationType && in_array($applicationType, $item['relevance'])) {
                $score += 3;
            }
            
            if ($score > 0) {
                $scoredItems[$key] = [
                    'content' => $item['content'],
                    'score' => $score
                ];
            }
        }
        
        // Sort by score (highest first)
        uasort($scoredItems, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        // Get top 3 most relevant items
        $selectedItems = array_slice($scoredItems, 0, 3);
        
        // Combine the content from selected items
        $combinedContent = '';
        foreach ($selectedItems as $item) {
            $combinedContent .= $item['content'] . "\n\n";
        }
        
        return trim($combinedContent);
    }

    /**
     * Calculate confidence score for the chatbot response.
     *
     * @param string $response The chatbot's response
     * @param string $query The user's query
     * @return float Confidence score between 0 and 1
     */
    protected function calculateConfidenceScore(string $response, string $query): float
    {
        // Start with a default reasonable confidence
        $score = 0.7; 
        
        // Check for uncertainty indicators
        $uncertaintyPhrases = [
            "I'm not sure",
            "I don't know",
            "I'm uncertain",
            "I don't have information",
            "I don't have access",
            "I'm not able to",
            "cannot provide",
            "unable to determine",
            "would need more information",
            "It's unclear"
        ];
        
        foreach ($uncertaintyPhrases as $phrase) {
            if (stripos($response, $phrase) !== false) {
                $score -= 0.2; // Reduce score significantly for explicit uncertainty
                break; // Only penalize once for uncertainty
            }
        }
        
        // Check for vague or generic responses
        if (str_word_count($response) < 20) {
            $score -= 0.1; // Very short responses might be less helpful
        }
        
        // Check for specificity - does the response reference terms from the query?
        $queryKeywords = array_filter(
            preg_split('/\W+/', strtolower($query), -1, PREG_SPLIT_NO_EMPTY),
            function($word) {
                return strlen($word) > 3; // Only consider words with 4+ characters meaningful
            }
        );
        
        $keywordMatches = 0;
        foreach ($queryKeywords as $keyword) {
            if (stripos($response, $keyword) !== false) {
                $keywordMatches++;
            }
        }
        
        $keywordRatio = count($queryKeywords) > 0 ? $keywordMatches / count($queryKeywords) : 0;
        $score += $keywordRatio * 0.2; // Boost score for high keyword matches
        
        // Ensure score is between 0 and 1
        return max(0, min(1, $score));
    }

    /**
     * Determine if the conversation should be handed off to a human.
     *
     * @param float $confidenceScore The confidence score of the response
     * @param string $query The user's query
     * @param string $response The chatbot's response
     * @return bool True if human handoff is recommended
     */
    protected function needsHumanHandoff(float $confidenceScore, string $query, string $response): bool
    {
        // Check confidence threshold
        if ($confidenceScore < $this->humanHandoffThreshold) {
            return true;
        }
        
        // Check for explicit requests for human assistance
        $humanAssistancePhrases = [
            "speak to a human",
            "talk to a person",
            "talk to someone",
            "speak to someone",
            "real person",
            "customer service",
            "representative",
            "speak to an agent",
            "talk to an agent",
            "speak to support",
            "talk to support"
        ];
        
        foreach ($humanAssistancePhrases as $phrase) {
            if (stripos($query, $phrase) !== false) {
                return true;
            }
        }
        
        // Check for complex or sensitive topics
        $complexTopics = [
            "appeal",
            "complaint",
            "discrimination",
            "legal",
            "lawsuit",
            "disability",
            "accommodation",
            "exception",
            "waiver",
            "special circumstance",
            "financial hardship",
            "emergency"
        ];
        
        foreach ($complexTopics as $topic) {
            if (stripos($query, $topic) !== false) {
                return true;
            }
        }
        
        // Look for escalation indicators in the response
        $escalationPhrases = [
            "recommend speaking with",
            "suggest contacting",
            "contact the admissions office",
            "speak directly with",
            "best to consult with",
            "should talk to",
            "would need to speak with"
        ];
        
        foreach ($escalationPhrases as $phrase) {
            if (stripos($response, $phrase) !== false) {
                return true;
            }
        }
        
        // Default to not requiring handoff
        return false;
    }

    /**
     * Log chatbot interaction for analytics and improvement.
     *
     * @param string $query The user's query
     * @param string $response The chatbot's response
     * @param float $confidenceScore The confidence score
     * @param bool $handoffRecommended Whether handoff was recommended
     * @param int|null $userId The user ID if available
     * @param int|null $applicationId The application ID if available
     * @return void
     */
    protected function logInteraction(
        string $query,
        string $response,
        float $confidenceScore,
        bool $handoffRecommended,
        ?int $userId = null,
        ?int $applicationId = null
    ): void {
        // Prepare log data
        $logData = [
            'query' => $query,
            'response' => $response,
            'confidence_score' => $confidenceScore,
            'handoff_recommended' => $handoffRecommended,
            'user_id' => $userId,
            'application_id' => $applicationId,
            'timestamp' => now()->toDateTimeString(),
            'model' => $this->model,
        ];
        
        // Determine log level based on handoff and confidence
        $logLevel = 'info';
        if ($handoffRecommended) {
            $logLevel = 'warning'; // Log potential issues for review
        }
        
        // Log to the chatbot channel
        Log::channel('chatbot')->{$logLevel}('Chatbot interaction', $logData);
    }

    /**
     * Get a default response when AI processing fails.
     *
     * @param string $type The type of default response needed
     * @return string Default response message
     */
    protected function getDefaultResponse(string $type = 'fallback'): string
    {
        switch ($type) {
            case 'greeting':
                return $this->defaultPrompts['greeting'] ?? 'Hello! I\'m your admissions assistant. How can I help you today?';
                
            case 'fallback':
                return $this->defaultPrompts['fallback'] ?? 'I apologize, but I\'m having trouble processing your request right now. Please try again or contact our admissions team for assistance.';
                
            case 'handoff':
                return $this->defaultPrompts['handoff'] ?? 'I think your question would be better answered by a member of our admissions team. Would you like me to connect you with a human assistant?';
                
            case 'clarification':
                return $this->defaultPrompts['clarification'] ?? 'I'm not sure I understood your question. Could you please provide more details or rephrase your question?';
                
            default:
                return $this->defaultPrompts['fallback'] ?? 'I apologize, but I\'m having trouble processing your request right now. Please try again or contact our admissions team for assistance.';
        }
    }

    /**
     * Update the chatbot knowledge base with new information.
     *
     * @param string $category The knowledge category
     * @param string $content The content to add
     * @return bool True if knowledge base was updated successfully
     */
    public function updateKnowledgeBase(string $category, string $content): bool
    {
        try {
            // Validate category and content
            if (empty($category) || empty($content)) {
                return false;
            }
            
            // In a production system, this would update the knowledge base files or database
            // For this implementation, we'll just log the update attempt
            
            Log::info('Knowledge base update requested', [
                'category' => $category,
                'content' => mb_substr($content, 0, 100) . '...' // Log preview of content
            ]);
            
            // Clear knowledge base cache to ensure updates are reflected
            Cache::forget('chatbot_knowledge_base');
            
            return true;
        } catch (Exception $e) {
            Log::error('Failed to update knowledge base', [
                'exception' => $e,
                'category' => $category
            ]);
            
            return false;
        }
    }

    /**
     * Get the current AI model being used.
     *
     * @return string Model name
     */
    public function getModel(): string
    {
        return $this->model;
    }

    /**
     * Set the AI model to use.
     *
     * @param string $model
     * @return void
     */
    public function setModel(string $model): void
    {
        // Validate that the model is supported
        $supportedModels = $this->config['supported_models'] ?? ['gpt-4', 'gpt-3.5-turbo'];
        
        if (!in_array($model, $supportedModels)) {
            throw new Exception("Unsupported model: {$model}");
        }
        
        $this->model = $model;
    }

    /**
     * Get the current temperature setting.
     *
     * @return float Temperature value
     */
    public function getTemperature(): float
    {
        return $this->temperature;
    }

    /**
     * Set the temperature for response generation.
     *
     * @param float $temperature
     * @return void
     */
    public function setTemperature(float $temperature): void
    {
        // Validate temperature range
        if ($temperature < 0 || $temperature > 1) {
            throw new Exception("Temperature must be between 0 and 1");
        }
        
        $this->temperature = $temperature;
    }
}