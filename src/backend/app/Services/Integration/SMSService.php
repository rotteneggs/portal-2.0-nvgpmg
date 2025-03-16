<?php

namespace App\Services\Integration;

use App\Models\Notification;
use App\Models\NotificationRecipient;
use App\Models\User;
use Illuminate\Support\Facades\Config; // Laravel ^10.0
use Illuminate\Support\Facades\Log; // Laravel ^10.0
use Exception; // php 8.2
use Twilio\Rest\Client as TwilioClient; // twilio/sdk ^7.0
use Vonage\Client as VonageClient; // vonage/client ^4.0
use Vonage\SMS\Message\SMS as VonageSMS; // vonage/client-core ^4.0

/**
 * Service class for handling SMS communications in the application
 */
class SMSService
{
    /**
     * Configuration for SMS service
     * 
     * @var array
     */
    protected $config;

    /**
     * Whether SMS service is enabled
     * 
     * @var bool
     */
    protected $enabled;

    /**
     * The default SMS provider to use
     * 
     * @var string
     */
    protected $provider;

    /**
     * Default phone number to send SMS from
     * 
     * @var string
     */
    protected $defaultFromNumber;

    /**
     * SMS templates
     * 
     * @var array
     */
    protected $templates;

    /**
     * Twilio API client instance
     * 
     * @var TwilioClient|null
     */
    protected $twilioClient;

    /**
     * Vonage API client instance
     * 
     * @var VonageClient|null
     */
    protected $vonageClient;

    /**
     * Whether SMS tracking is enabled
     * 
     * @var bool
     */
    protected $trackingEnabled;

    /**
     * Maximum length for SMS messages
     * 
     * @var int
     */
    protected $maxMessageLength;

    /**
     * Initialize the SMS service with configuration
     */
    public function __construct()
    {
        // Load SMS configuration from config/services.php
        $this->config = Config::get('services.sms', []);
        
        // Set enabled status from configuration
        $this->enabled = $this->config['enabled'] ?? false;
        
        // Set default provider from configuration (twilio or vonage)
        $this->provider = $this->config['default_provider'] ?? 'twilio';
        
        // Set default from number from configuration
        $this->defaultFromNumber = $this->config['from_number'] ?? '';
        
        // Load SMS templates from configuration
        $this->templates = $this->config['templates'] ?? [];
        
        // Set tracking preferences from configuration
        $this->trackingEnabled = $this->config['tracking_enabled'] ?? true;
        
        // Set maximum message length (160 for standard SMS)
        $this->maxMessageLength = $this->config['max_message_length'] ?? 160;
    }

    /**
     * Send an SMS to a recipient
     *
     * @param string $to
     * @param string $message
     * @param array $options
     * @return bool True if SMS was sent successfully, false otherwise
     */
    public function send($to, $message, array $options = [])
    {
        // Check if SMS service is enabled
        if (!$this->isEnabled()) {
            Log::info('SMS sending is disabled. Message not sent.', [
                'to' => $to,
                'message' => $message
            ]);
            return false;
        }
        
        // Validate phone number format
        if (!$this->validatePhoneNumber($to)) {
            Log::error('Invalid phone number format', ['phone' => $to]);
            return false;
        }
        
        // Format the phone number
        $to = $this->formatPhoneNumber($to);
        
        // Truncate message if it exceeds maximum length
        $message = $this->truncateMessage($message);
        
        // Merge provided options with defaults
        $options = array_merge([
            'from' => $this->defaultFromNumber,
            'provider' => $this->provider
        ], $options);
        
        // Determine which provider to use
        $provider = $options['provider'];
        
        // Send SMS using the selected provider
        $success = false;
        
        try {
            if ($provider === 'twilio') {
                $success = $this->sendViaTwilio($to, $message, $options);
            } elseif ($provider === 'vonage') {
                $success = $this->sendViaVonage($to, $message, $options);
            } else {
                Log::error('Unsupported SMS provider', ['provider' => $provider]);
                return false;
            }
            
            // Log SMS sending attempt
            $this->logSmsActivity($to, $message, $success);
            
            return $success;
        } catch (Exception $e) {
            $this->logSmsActivity($to, $message, false, $e->getMessage());
            return false;
        }
    }

    /**
     * Send an SMS using a predefined template
     *
     * @param string $to
     * @param string $templateKey
     * @param array $data
     * @param array $options
     * @return bool True if SMS was sent successfully, false otherwise
     */
    public function sendFromTemplate($to, $templateKey, array $data = [], array $options = [])
    {
        // Validate template key exists in configured templates
        $template = $this->getTemplate($templateKey);
        
        if (!$template) {
            Log::error('SMS template not found', ['template_key' => $templateKey]);
            return false;
        }
        
        // Get template content and default data
        $content = $template['content'] ?? '';
        $defaultData = $template['default_data'] ?? [];
        
        // Merge provided data with template default data
        $mergedData = array_merge($defaultData, $data);
        
        // Process template by replacing placeholders with data
        $processedMessage = $this->processTemplate($content, $mergedData);
        
        // Call send() method with processed template
        return $this->send($to, $processedMessage, $options);
    }

    /**
     * Send an SMS notification and update notification status
     *
     * @param Notification $notification
     * @param NotificationRecipient $recipient
     * @param array $options
     * @return bool True if notification was sent successfully, false otherwise
     */
    public function sendNotification(Notification $notification, NotificationRecipient $recipient, array $options = [])
    {
        // Get user from notification recipient
        $user = $recipient->user;
        
        if (!$user) {
            Log::error('User not found for notification recipient', ['recipient_id' => $recipient->id]);
            return false;
        }
        
        // Get user's phone number from profile
        $phoneNumber = $user->profile->phone_number ?? null;
        
        // If phone number is not available, return false
        if (!$phoneNumber) {
            Log::info('User does not have a phone number', ['user_id' => $user->id]);
            return false;
        }
        
        // Prepare SMS data from notification content
        $subject = $notification->subject;
        $content = $notification->content;
        $data = $notification->data ?? [];
        $message = $subject ? "$subject: $content" : $content;
        
        // Determine template based on notification type if applicable
        $templateKey = null;
        if (isset($data['sms_template'])) {
            $templateKey = $data['sms_template'];
        } elseif (isset($this->config['notification_templates'][$notification->type])) {
            $templateKey = $this->config['notification_templates'][$notification->type];
        }
        
        // Send SMS using send() or sendFromTemplate()
        $success = false;
        
        if ($templateKey) {
            $success = $this->sendFromTemplate($phoneNumber, $templateKey, $data, $options);
        } else {
            $success = $this->send($phoneNumber, $message, $options);
        }
        
        // If successful, mark notification as sent for recipient
        if ($success) {
            $recipient->markAsSent();
        }
        
        return $success;
    }

    /**
     * Send the same SMS to multiple recipients
     *
     * @param array $recipients
     * @param string $message
     * @param array $options
     * @return array Array of results with phone numbers as keys and boolean success status as values
     */
    public function sendBulk(array $recipients, $message, array $options = [])
    {
        // Validate recipients array is not empty
        if (empty($recipients)) {
            Log::error('Recipients array is empty for bulk SMS');
            return [];
        }
        
        // Initialize results array
        $results = [];
        
        // Loop through recipients
        foreach ($recipients as $recipient) {
            // For each recipient, call send() method
            $success = $this->send($recipient, $message, $options);
            
            // Store result in results array
            $results[$recipient] = $success;
        }
        
        return $results;
    }

    /**
     * Send the same template-based SMS to multiple recipients
     *
     * @param array $recipients
     * @param string $templateKey
     * @param array $data
     * @param array $options
     * @return array Array of results with phone numbers as keys and boolean success status as values
     */
    public function sendBulkFromTemplate(array $recipients, $templateKey, array $data = [], array $options = [])
    {
        // Validate template key exists in configured templates
        $template = $this->getTemplate($templateKey);
        
        if (!$template) {
            Log::error('SMS template not found for bulk sending', ['template_key' => $templateKey]);
            return [];
        }
        
        // Get template content and default data
        $content = $template['content'] ?? '';
        $defaultData = $template['default_data'] ?? [];
        
        // Merge provided data with template default data
        $mergedData = array_merge($defaultData, $data);
        
        // Process template by replacing placeholders with data
        $processedMessage = $this->processTemplate($content, $mergedData);
        
        // Call sendBulk() method with processed template
        return $this->sendBulk($recipients, $processedMessage, $options);
    }

    /**
     * Send personalized SMS to multiple recipients with recipient-specific data
     *
     * @param array $recipientsWithData
     * @param string $templateKey
     * @param array $commonData
     * @param array $options
     * @return array Array of results with phone numbers as keys and boolean success status as values
     */
    public function sendPersonalized(array $recipientsWithData, $templateKey, array $commonData = [], array $options = [])
    {
        // Validate recipientsWithData array is not empty
        if (empty($recipientsWithData)) {
            Log::error('Recipients array is empty for personalized SMS');
            return [];
        }
        
        // Validate template key exists in configured templates
        $template = $this->getTemplate($templateKey);
        
        if (!$template) {
            Log::error('SMS template not found for personalized sending', ['template_key' => $templateKey]);
            return [];
        }
        
        // Initialize results array
        $results = [];
        
        // Loop through recipientsWithData
        foreach ($recipientsWithData as $recipient => $data) {
            // For each recipient, merge common data with recipient-specific data
            $mergedData = array_merge($commonData, $data);
            
            // Call sendFromTemplate() method with recipient phone and merged data
            $success = $this->sendFromTemplate($recipient, $templateKey, $mergedData, $options);
            
            // Store result in results array
            $results[$recipient] = $success;
        }
        
        return $results;
    }

    /**
     * Set the default from number for SMS
     *
     * @param string $number
     * @return self Returns $this for method chaining
     */
    public function setDefaultFromNumber($number)
    {
        // Validate phone number format
        if (!$this->validatePhoneNumber($number)) {
            Log::warning('Invalid from number format', ['phone' => $number]);
        } else {
            // Set defaultFromNumber property
            $this->defaultFromNumber = $this->formatPhoneNumber($number);
        }
        
        // Return $this for method chaining
        return $this;
    }

    /**
     * Set the SMS provider to use
     *
     * @param string $provider
     * @return self Returns $this for method chaining
     */
    public function setProvider($provider)
    {
        // Validate provider is supported (twilio, vonage)
        if (!in_array($provider, ['twilio', 'vonage'])) {
            Log::warning('Unsupported SMS provider', ['provider' => $provider]);
        } else {
            // Set provider property
            $this->provider = $provider;
        }
        
        // Return $this for method chaining
        return $this;
    }

    /**
     * Enable SMS sending
     *
     * @return self Returns $this for method chaining
     */
    public function enable()
    {
        // Set enabled property to true
        $this->enabled = true;
        
        // Return $this for method chaining
        return $this;
    }

    /**
     * Disable SMS sending
     *
     * @return self Returns $this for method chaining
     */
    public function disable()
    {
        // Set enabled property to false
        $this->enabled = false;
        
        // Return $this for method chaining
        return $this;
    }

    /**
     * Check if SMS service is enabled
     *
     * @return bool True if enabled, false otherwise
     */
    public function isEnabled()
    {
        // Return value of enabled property
        return $this->enabled;
    }

    /**
     * Enable SMS tracking
     *
     * @return self Returns $this for method chaining
     */
    public function enableTracking()
    {
        // Set trackingEnabled property to true
        $this->trackingEnabled = true;
        
        // Return $this for method chaining
        return $this;
    }

    /**
     * Disable SMS tracking
     *
     * @return self Returns $this for method chaining
     */
    public function disableTracking()
    {
        // Set trackingEnabled property to false
        $this->trackingEnabled = false;
        
        // Return $this for method chaining
        return $this;
    }

    /**
     * Get a template by key
     *
     * @param string $key
     * @return array|null Template configuration or null if not found
     */
    public function getTemplate($key)
    {
        // Check if template key exists in templates array
        if (isset($this->templates[$key])) {
            return $this->templates[$key];
        }
        
        // Return template configuration if found, null otherwise
        return null;
    }

    /**
     * Register a new SMS template
     *
     * @param string $key
     * @param string $content
     * @param array $defaultData
     * @return self Returns $this for method chaining
     */
    public function registerTemplate($key, $content, array $defaultData = [])
    {
        // Create template configuration array with content and default data
        $template = [
            'content' => $content,
            'default_data' => $defaultData
        ];
        
        // Add template to templates array
        $this->templates[$key] = $template;
        
        // Return $this for method chaining
        return $this;
    }

    /**
     * Send SMS using Twilio provider
     *
     * @param string $to
     * @param string $message
     * @param array $options
     * @return bool True if successful, false otherwise
     */
    protected function sendViaTwilio($to, $message, array $options = [])
    {
        // Initialize Twilio client if not already done
        if (!$this->twilioClient) {
            $this->initializeTwilioClient();
        }
        
        try {
            // Prepare message parameters with to, from, and body
            $params = [
                'from' => $options['from'] ?? $this->defaultFromNumber,
                'body' => $message
            ];
            
            // Add tracking options if enabled
            if ($this->trackingEnabled && isset($options['tracking_reference'])) {
                $params['statusCallback'] = $options['status_callback'] ?? $this->config['twilio']['status_callback'] ?? null;
            }
            
            // Send message using Twilio client
            $this->twilioClient->messages->create($to, $params);
            
            return true;
        } catch (Exception $e) {
            Log::error('Twilio SMS sending failed', [
                'to' => $to,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Send SMS using Vonage provider
     *
     * @param string $to
     * @param string $message
     * @param array $options
     * @return bool True if successful, false otherwise
     */
    protected function sendViaVonage($to, $message, array $options = [])
    {
        // Initialize Vonage client if not already done
        if (!$this->vonageClient) {
            $this->initializeVonageClient();
        }
        
        try {
            // Create new SMS message with to, from, and text
            $from = $options['from'] ?? $this->defaultFromNumber;
            $sms = new VonageSMS($to, $from, $message);
            
            // Add tracking options if enabled
            if ($this->trackingEnabled && isset($options['tracking_reference'])) {
                $sms->setClientRef($options['tracking_reference']);
            }
            
            // Send message using Vonage client
            $response = $this->vonageClient->sms()->send($sms);
            
            // Check if any message was successful
            foreach ($response->getMessages() as $msg) {
                if ($msg->getStatus() === 0) {
                    return true;
                }
            }
            
            // If we get here, all messages failed
            Log::warning('Vonage SMS sending failed', [
                'to' => $to,
                'response' => $response->toArray()
            ]);
            
            return false;
        } catch (Exception $e) {
            Log::error('Vonage SMS sending failed', [
                'to' => $to,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Initialize the Twilio client
     *
     * @return void No return value
     */
    protected function initializeTwilioClient()
    {
        // Get Twilio credentials from configuration
        $accountSid = $this->config['twilio']['account_sid'] ?? null;
        $authToken = $this->config['twilio']['auth_token'] ?? null;
        
        if (!$accountSid || !$authToken) {
            throw new Exception('Twilio credentials not configured');
        }
        
        // Create new Twilio\Rest\Client instance
        $this->twilioClient = new TwilioClient($accountSid, $authToken);
    }

    /**
     * Initialize the Vonage client
     *
     * @return void No return value
     */
    protected function initializeVonageClient()
    {
        // Get Vonage credentials from configuration
        $apiKey = $this->config['vonage']['api_key'] ?? null;
        $apiSecret = $this->config['vonage']['api_secret'] ?? null;
        
        if (!$apiKey || !$apiSecret) {
            throw new Exception('Vonage credentials not configured');
        }
        
        // Create new Vonage\Client instance
        $this->vonageClient = new VonageClient(new VonageClient\Credentials\Basic($apiKey, $apiSecret));
    }

    /**
     * Validate a phone number format
     *
     * @param string $phoneNumber
     * @return bool True if valid, false otherwise
     */
    protected function validatePhoneNumber($phoneNumber)
    {
        // Use regex pattern to validate international phone number format
        $pattern = '/^\+?[1-9]\d{1,14}$/';
        
        // Return validation result
        return preg_match($pattern, $phoneNumber) === 1;
    }

    /**
     * Format a phone number for SMS delivery
     *
     * @param string $phoneNumber
     * @return string Formatted phone number
     */
    protected function formatPhoneNumber($phoneNumber)
    {
        // Remove any non-numeric characters except leading +
        $formatted = preg_replace('/[^\d+]/', '', $phoneNumber);
        
        // Ensure number has country code (add +1 for US if needed)
        if (substr($formatted, 0, 1) !== '+') {
            // If number starts with 1, add + prefix
            if (substr($formatted, 0, 1) === '1') {
                $formatted = '+' . $formatted;
            } else {
                // Default to US country code if none provided
                $formatted = '+1' . $formatted;
            }
        }
        
        return $formatted;
    }

    /**
     * Process a template by replacing placeholders with data
     *
     * @param string $template
     * @param array $data
     * @return string Processed template with placeholders replaced
     */
    protected function processTemplate($template, array $data)
    {
        // Loop through data array
        foreach ($data as $key => $value) {
            // Replace each {key} placeholder with corresponding value
            $template = str_replace('{' . $key . '}', $value, $template);
        }
        
        // Return processed template
        return $template;
    }

    /**
     * Truncate message to maximum SMS length
     *
     * @param string $message
     * @return string Truncated message
     */
    protected function truncateMessage($message)
    {
        // Check if message length exceeds maxMessageLength
        if (mb_strlen($message) > $this->maxMessageLength) {
            // If so, truncate to maxMessageLength - 3 and add ellipsis
            return mb_substr($message, 0, $this->maxMessageLength - 3) . '...';
        }
        
        // Return original or truncated message
        return $message;
    }

    /**
     * Log SMS sending activity
     *
     * @param string $to
     * @param string $message
     * @param bool $success
     * @param string|null $error
     * @return void No return value
     */
    protected function logSmsActivity($to, $message, $success, $error = null)
    {
        // Prepare log data array with SMS details
        $logData = [
            'to' => $to,
            'message_length' => mb_strlen($message),
            'provider' => $this->provider,
            'success' => $success
        ];
        
        // Add error info if available
        if ($error) {
            $logData['error'] = $error;
        }
        
        // Determine log level based on success
        if ($success) {
            Log::info('SMS sent successfully', $logData);
        } else {
            Log::error('SMS sending failed', $logData);
        }
    }
}