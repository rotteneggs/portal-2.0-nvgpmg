<?php

return [
    /*
    |--------------------------------------------------------------------------
    | AI Services Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains configuration settings for AI-driven features in the
    | Student Admissions Enrollment Platform, including document analysis,
    | chatbot support, recommendation engine, and fraud detection.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | API Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for AI service providers including API keys and settings.
    |
    */
    'api' => [
        'openai_api_key' => env('OPENAI_API_KEY'),
        'openai_organization' => env('OPENAI_ORGANIZATION', null),
        'default_model' => 'gpt-4',
        'fallback_model' => 'gpt-3.5-turbo',
        'timeout' => 30,
        'max_retries' => 3,
    ],

    /*
    |--------------------------------------------------------------------------
    | Document Analysis
    |--------------------------------------------------------------------------
    |
    | Configuration for AI-powered document analysis and verification service.
    | Enables automatic extraction of data from uploaded documents and verification
    | of document authenticity.
    |
    */
    'document_analysis' => [
        'enabled' => true,
        'model' => 'gpt-4-vision-preview',
        'confidence_threshold' => 0.85,
        'supported_document_types' => [
            'transcript',
            'id_document',
            'recommendation_letter',
            'personal_statement',
            'financial_document',
        ],
        'max_file_size' => 10485760, // 10MB
        'ocr_enabled' => true,
        'tampering_detection' => true,
        'storage_path' => 'storage/app/document-analysis',
    ],

    /*
    |--------------------------------------------------------------------------
    | Chatbot Support Assistant
    |--------------------------------------------------------------------------
    |
    | Configuration for the AI-powered conversational assistant that helps users
    | with application questions and guidance.
    |
    */
    'chatbot' => [
        'enabled' => true,
        'model' => 'gpt-4',
        'temperature' => 0.7,
        'max_tokens' => 500,
        'context_window_size' => 10,
        'human_handoff_threshold' => 0.4,
        'knowledge_base_path' => 'storage/app/chatbot-knowledge',
        'default_prompts' => [
            'greeting' => "Hello! I'm your admissions assistant. How can I help you today?",
            'fallback' => "I'm sorry, I don't have enough information to answer that question. Would you like to speak with an admissions counselor?",
            'handoff' => "I'll connect you with an admissions counselor who can better assist you with this question.",
            'clarification' => 'Could you provide more details about your question?',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Recommendation Engine
    |--------------------------------------------------------------------------
    |
    | Configuration for AI-driven personalized recommendations and guidance for
    | completing application requirements.
    |
    */
    'recommendation_engine' => [
        'enabled' => true,
        'algorithm' => 'hybrid', // Options: collaborative_filtering, content_based, hybrid
        'min_confidence_score' => 0.6,
        'max_recommendations' => 5,
        'personalization_factors' => [
            'application_progress',
            'academic_interests',
            'document_status',
            'deadlines',
            'user_behavior',
        ],
        'storage_path' => 'storage/app/recommendations',
        'cache_ttl' => 3600, // 1 hour
    ],

    /*
    |--------------------------------------------------------------------------
    | Fraud Detection
    |--------------------------------------------------------------------------
    |
    | Configuration for AI-powered fraud detection to identify potentially
    | fraudulent applications or documents.
    |
    */
    'fraud_detection' => [
        'enabled' => true,
        'sensitivity' => 'medium', // Options: low, medium, high
        'risk_thresholds' => [
            'low' => 0.3,
            'medium' => 0.6,
            'high' => 0.8,
        ],
        'detection_features' => [
            'document_manipulation',
            'identity_verification',
            'application_consistency',
            'behavioral_patterns',
        ],
        'auto_flag' => true,
        'storage_path' => 'storage/app/fraud-detection',
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging
    |--------------------------------------------------------------------------
    |
    | Logging configuration for AI services to track usage, errors, and
    | performance metrics.
    |
    */
    'logging' => [
        'enabled' => true,
        'level' => 'info', // Options: debug, info, warning, error
        'channels' => [
            'document_analysis' => 'document-analysis',
            'chatbot' => 'chatbot',
            'recommendation' => 'recommendation',
            'fraud_detection' => 'fraud-detection',
        ],
        'include_request_data' => false,
        'include_response_data' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Rate limiting configuration to prevent abuse of AI services and manage
    | API usage costs.
    |
    */
    'rate_limiting' => [
        'enabled' => true,
        'document_analysis' => [
            'max_requests' => 100,
            'per_minutes' => 60,
        ],
        'chatbot' => [
            'max_requests' => 50,
            'per_minutes' => 10,
        ],
        'recommendation' => [
            'max_requests' => 100,
            'per_minutes' => 60,
        ],
        'fraud_detection' => [
            'max_requests' => 50,
            'per_minutes' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Caching
    |--------------------------------------------------------------------------
    |
    | Caching configuration for AI services to improve performance and reduce
    | API calls.
    |
    */
    'caching' => [
        'enabled' => true,
        'driver' => 'redis',
        'ttl' => [
            'document_analysis' => 86400, // 24 hours
            'chatbot_context' => 3600,    // 1 hour
            'recommendations' => 3600,    // 1 hour
            'fraud_detection' => 86400,   // 24 hours
        ],
    ],
];