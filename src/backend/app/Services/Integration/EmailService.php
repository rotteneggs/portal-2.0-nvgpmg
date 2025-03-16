<?php

namespace App\Services\Integration;

use App\Models\Notification;
use App\Models\NotificationRecipient;
use App\Models\User;
use Illuminate\Support\Facades\Mail; // Laravel ^10.0
use Illuminate\Support\Facades\Config; // Laravel ^10.0
use Illuminate\Support\Facades\Log; // Laravel ^10.0
use Exception; // PHP 8.2
use Illuminate\Mail\Mailable; // Laravel ^10.0
use Mailgun\Mailgun; // mailgun/mailgun-php ^3.5
use SendGrid; // sendgrid/sendgrid ^7.11

/**
 * Service class for handling email communications in the application
 */
class EmailService
{
    /**
     * Configuration settings
     * 
     * @var array
     */
    protected $config;

    /**
     * Whether the email service is enabled
     * 
     * @var bool
     */
    protected $enabled;

    /**
     * The default email provider to use
     * 
     * @var string
     */
    protected $provider;

    /**
     * Default sender email address
     * 
     * @var string
     */
    protected $defaultFromAddress;

    /**
     * Default sender name
     * 
     * @var string
     */
    protected $defaultFromName;

    /**
     * Email templates configuration
     * 
     * @var array
     */
    protected $templates;

    /**
     * Mailgun client instance
     * 
     * @var \Mailgun\Mailgun
     */
    protected $mailgunClient;

    /**
     * SendGrid client instance
     * 
     * @var \SendGrid
     */
    protected $sendgridClient;

    /**
     * Whether to enable email tracking
     * 
     * @var bool
     */
    protected $trackingEnabled;

    /**
     * Whether to queue emails instead of sending immediately
     * 
     * @var bool
     */
    protected $queueEnabled;

    /**
     * Initialize the email service with configuration
     */
    public function __construct()
    {
        // Load email configuration from config/integrations.php and config/mail.php
        $this->config = Config::get('integrations.email', []);
        $mailConfig = Config::get('mail', []);
        
        // Set enabled status from configuration
        $this->enabled = $this->config['enabled'] ?? true;
        
        // Set default provider from configuration
        $this->provider = $this->config['default_provider'] ?? $mailConfig['default'] ?? 'smtp';
        
        // Set default from address and name from configuration
        $this->defaultFromAddress = $this->config['from']['address'] ?? $mailConfig['from']['address'] ?? 'noreply@example.com';
        $this->defaultFromName = $this->config['from']['name'] ?? $mailConfig['from']['name'] ?? 'No Reply';
        
        // Load email templates from configuration
        $this->templates = $this->config['templates'] ?? [];
        
        // Set tracking and queue preferences from configuration
        $this->trackingEnabled = $this->config['tracking_enabled'] ?? false;
        $this->queueEnabled = $this->config['queue_enabled'] ?? true;
        
        // Initialize provider clients based on configuration if needed
        if ($this->provider === 'mailgun') {
            $this->initializeMailgunClient();
        } elseif ($this->provider === 'sendgrid') {
            $this->initializeSendgridClient();
        }
    }

    /**
     * Send an email to a recipient
     *
     * @param string $to Recipient email address
     * @param string $subject Email subject
     * @param string $view View template to use
     * @param array $data Data to pass to the view
     * @param array $options Additional options for sending email
     * @return bool True if email was sent successfully, false otherwise
     */
    public function send($to, $subject, $view, array $data = [], array $options = [])
    {
        // Check if email service is enabled
        if (!$this->enabled) {
            Log::info('Email sending skipped: service disabled');
            return false;
        }

        // Validate email address format
        if (!$this->validateEmailAddress($to)) {
            Log::error('Email sending failed: invalid recipient address', ['to' => $to]);
            return false;
        }

        // Merge provided options with defaults
        $options = array_merge([
            'from_address' => $this->defaultFromAddress,
            'from_name' => $this->defaultFromName,
            'tracking_enabled' => $this->trackingEnabled,
            'queue' => $this->queueEnabled,
            'cc' => null,
            'bcc' => null,
            'reply_to' => null,
            'attachments' => [],
            'provider' => $this->provider,
        ], $options);

        // Determine which provider to use
        $provider = $options['provider'];

        try {
            $success = false;
            
            // Send email using Laravel's Mail facade or direct provider API
            switch ($provider) {
                case 'mailgun':
                    $success = $this->sendViaMailgun($to, $subject, $view, $data, $options);
                    break;
                
                case 'sendgrid':
                    $success = $this->sendViaSendgrid($to, $subject, $view, $data, $options);
                    break;
                
                case 'smtp':
                default:
                    $success = $this->sendViaSmtp($to, $subject, $view, $data, $options);
                    break;
            }

            // Log email sending attempt
            $this->logEmailActivity($to, $subject, $success);
            
            return $success;
        } catch (Exception $e) {
            Log::error('Exception caught when sending email', [
                'to' => $to,
                'subject' => $subject,
                'provider' => $provider,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return false;
        }
    }

    /**
     * Send an email using a predefined template
     *
     * @param string $to Recipient email address
     * @param string $templateKey Template key from configuration
     * @param array $data Data to pass to the template
     * @param array $options Additional options for sending email
     * @return bool True if email was sent successfully, false otherwise
     */
    public function sendFromTemplate($to, $templateKey, array $data = [], array $options = [])
    {
        // Validate template key exists in configured templates
        $template = $this->getTemplate($templateKey);
        if (!$template) {
            Log::error('Email template not found', ['template' => $templateKey]);
            return false;
        }

        // Get template view, subject, and default data
        $view = $template['view'];
        $subject = $template['subject'];
        $defaultData = $template['data'] ?? [];

        // Merge provided data with template default data
        $mergedData = array_merge($defaultData, $data);

        // Call send() method with template view, subject, and merged data
        return $this->send($to, $subject, $view, $mergedData, $options);
    }

    /**
     * Send an email notification and update notification status
     *
     * @param \App\Models\Notification $notification The notification to send
     * @param \App\Models\NotificationRecipient $recipient The notification recipient
     * @param array $options Additional options for sending email
     * @return bool True if notification was sent successfully, false otherwise
     */
    public function sendNotification(Notification $notification, NotificationRecipient $recipient, array $options = [])
    {
        // Get user from notification recipient
        $user = $recipient->user;
        if (!$user) {
            Log::error('Email notification failed: user not found', [
                'notification_id' => $notification->id,
                'recipient_id' => $recipient->id
            ]);
            return false;
        }

        // Get user's email address
        $to = $user->email;
        if (!$this->validateEmailAddress($to)) {
            Log::error('Email notification failed: invalid user email address', [
                'user_id' => $user->id,
                'email' => $to
            ]);
            return false;
        }

        // Prepare email data from notification content
        $subject = $notification->subject;
        $data = [
            'notification' => $notification,
            'recipient' => $recipient,
            'user' => $user,
            'content' => $notification->content,
            'data' => $notification->data
        ];

        // Determine template based on notification type
        $templateKey = 'notification.' . $notification->type;
        $template = $this->getTemplate($templateKey);
        
        $success = false;
        
        if ($template) {
            // Send email using template
            $success = $this->sendFromTemplate($to, $templateKey, $data, $options);
        } else {
            // Fallback to generic notification template
            $view = $this->getTemplate('notification.default')['view'] ?? 'emails.notification';
            $success = $this->send($to, $subject, $view, $data, $options);
        }

        // If successful, mark notification as sent for recipient
        if ($success) {
            $recipient->markAsSent();
        }

        return $success;
    }

    /**
     * Send the same email to multiple recipients
     *
     * @param array $recipients Array of recipient email addresses
     * @param string $subject Email subject
     * @param string $view View template to use
     * @param array $data Data to pass to the view
     * @param array $options Additional options
     * @return array Array of results with email addresses as keys and boolean success status as values
     */
    public function sendBulk(array $recipients, $subject, $view, array $data = [], array $options = [])
    {
        // Validate recipients array is not empty
        if (empty($recipients)) {
            Log::warning('Bulk email sending skipped: no recipients specified');
            return [];
        }

        // Initialize results array
        $results = [];

        // Loop through recipients
        foreach ($recipients as $recipient) {
            // For each recipient, call send() method
            $results[$recipient] = $this->send($recipient, $subject, $view, $data, $options);
        }

        return $results;
    }

    /**
     * Send the same template-based email to multiple recipients
     *
     * @param array $recipients Array of recipient email addresses
     * @param string $templateKey Template key from configuration
     * @param array $data Data to pass to the template
     * @param array $options Additional options
     * @return array Array of results with email addresses as keys and boolean success status as values
     */
    public function sendBulkFromTemplate(array $recipients, $templateKey, array $data = [], array $options = [])
    {
        // Validate template key exists in configured templates
        $template = $this->getTemplate($templateKey);
        if (!$template) {
            Log::error('Email template not found for bulk sending', ['template' => $templateKey]);
            return array_fill_keys($recipients, false);
        }

        // Get template view, subject, and default data
        $view = $template['view'];
        $subject = $template['subject'];
        $defaultData = $template['data'] ?? [];

        // Merge provided data with template default data
        $mergedData = array_merge($defaultData, $data);

        // Call sendBulk() method with template view, subject, and merged data
        return $this->sendBulk($recipients, $subject, $view, $mergedData, $options);
    }

    /**
     * Send personalized emails to multiple recipients with recipient-specific data
     *
     * @param array $recipientsWithData Array with email addresses as keys and recipient-specific data as values
     * @param string $templateKey Template key from configuration
     * @param array $commonData Data common to all recipients
     * @param array $options Additional options
     * @return array Array of results with email addresses as keys and boolean success status as values
     */
    public function sendPersonalized(array $recipientsWithData, $templateKey, array $commonData = [], array $options = [])
    {
        // Validate recipientsWithData array is not empty
        if (empty($recipientsWithData)) {
            Log::warning('Personalized email sending skipped: no recipients specified');
            return [];
        }

        // Validate template key exists in configured templates
        $template = $this->getTemplate($templateKey);
        if (!$template) {
            Log::error('Email template not found for personalized sending', ['template' => $templateKey]);
            return array_fill_keys(array_keys($recipientsWithData), false);
        }

        // Initialize results array
        $results = [];

        // Loop through recipientsWithData
        foreach ($recipientsWithData as $email => $recipientData) {
            // For each recipient, merge common data with recipient-specific data
            $mergedData = array_merge($commonData, $recipientData);
            
            // Call sendFromTemplate() method with recipient email and merged data
            $results[$email] = $this->sendFromTemplate($email, $templateKey, $mergedData, $options);
        }

        return $results;
    }

    /**
     * Set the default from address for emails
     *
     * @param string $address Email address to use as default sender
     * @param string|null $name Name to use as default sender
     * @return $this Returns $this for method chaining
     */
    public function setDefaultFromAddress($address, $name = null)
    {
        // Validate email address format
        if ($this->validateEmailAddress($address)) {
            $this->defaultFromAddress = $address;
            
            // Set defaultFromName property if provided
            if ($name !== null) {
                $this->defaultFromName = $name;
            }
        } else {
            Log::warning('Invalid email address format for default sender', ['address' => $address]);
        }

        return $this;
    }

    /**
     * Set the email provider to use
     *
     * @param string $provider Provider name (smtp, mailgun, sendgrid)
     * @return $this Returns $this for method chaining
     */
    public function setProvider($provider)
    {
        // Validate provider is supported (smtp, mailgun, sendgrid, etc.)
        $validProviders = ['smtp', 'mailgun', 'sendgrid'];
        
        if (in_array($provider, $validProviders)) {
            $this->provider = $provider;
            
            // Initialize provider client if needed
            if ($provider === 'mailgun' && !$this->mailgunClient) {
                $this->initializeMailgunClient();
            } elseif ($provider === 'sendgrid' && !$this->sendgridClient) {
                $this->initializeSendgridClient();
            }
        } else {
            Log::warning('Invalid email provider specified, using default', ['provider' => $provider]);
        }

        return $this;
    }

    /**
     * Enable email sending
     *
     * @return $this Returns $this for method chaining
     */
    public function enable()
    {
        // Set enabled property to true
        $this->enabled = true;
        return $this;
    }

    /**
     * Disable email sending
     *
     * @return $this Returns $this for method chaining
     */
    public function disable()
    {
        // Set enabled property to false
        $this->enabled = false;
        return $this;
    }

    /**
     * Check if email service is enabled
     *
     * @return bool True if enabled, false otherwise
     */
    public function isEnabled()
    {
        // Return value of enabled property
        return $this->enabled;
    }

    /**
     * Enable email tracking
     *
     * @return $this Returns $this for method chaining
     */
    public function enableTracking()
    {
        // Set trackingEnabled property to true
        $this->trackingEnabled = true;
        return $this;
    }

    /**
     * Disable email tracking
     *
     * @return $this Returns $this for method chaining
     */
    public function disableTracking()
    {
        // Set trackingEnabled property to false
        $this->trackingEnabled = false;
        return $this;
    }

    /**
     * Enable email queueing
     *
     * @return $this Returns $this for method chaining
     */
    public function enableQueue()
    {
        // Set queueEnabled property to true
        $this->queueEnabled = true;
        return $this;
    }

    /**
     * Disable email queueing
     *
     * @return $this Returns $this for method chaining
     */
    public function disableQueue()
    {
        // Set queueEnabled property to false
        $this->queueEnabled = false;
        return $this;
    }

    /**
     * Get a template by key
     *
     * @param string $key Template key to retrieve
     * @return array|null Template configuration or null if not found
     */
    public function getTemplate($key)
    {
        // Check if template key exists in templates array
        // Return template configuration if found, null otherwise
        return $this->templates[$key] ?? null;
    }

    /**
     * Register a new email template
     *
     * @param string $key Template key
     * @param string $view View template to use
     * @param string $subject Default subject
     * @param array $defaultData Default data for the template
     * @return $this Returns $this for method chaining
     */
    public function registerTemplate($key, $view, $subject, array $defaultData = [])
    {
        // Create template configuration array with view, subject, and default data
        $this->templates[$key] = [
            'view' => $view,
            'subject' => $subject,
            'data' => $defaultData
        ];

        return $this;
    }

    /**
     * Send email using Mailgun provider
     *
     * @param string $to Recipient email address
     * @param string $subject Email subject
     * @param string $view View template to use
     * @param array $data Data to pass to the view
     * @param array $options Additional options
     * @return bool True if successful, false otherwise
     */
    protected function sendViaMailgun($to, $subject, $view, array $data = [], array $options = [])
    {
        // Initialize Mailgun client if not already done
        if (!$this->mailgunClient) {
            $this->initializeMailgunClient();
        }

        if (!$this->mailgunClient) {
            Log::error('Mailgun client not initialized');
            return false;
        }

        try {
            // Prepare email message with HTML and text versions
            $html = $this->renderView($view, $data);
            $text = strip_tags($html);

            // Set from address, subject, and recipient
            $message = [
                'from' => $options['from_name'] . ' <' . $options['from_address'] . '>',
                'to' => $to,
                'subject' => $subject,
                'html' => $html,
                'text' => $text
            ];

            // Add CC, BCC, ReplyTo if provided
            if (!empty($options['cc'])) {
                $message['cc'] = $options['cc'];
            }

            if (!empty($options['bcc'])) {
                $message['bcc'] = $options['bcc'];
            }

            if (!empty($options['reply_to'])) {
                $message['h:Reply-To'] = $options['reply_to'];
            }

            // Add tracking options if enabled
            if ($options['tracking_enabled']) {
                $message['o:tracking'] = 'yes';
                $message['o:tracking-clicks'] = 'yes';
                $message['o:tracking-opens'] = 'yes';
            }

            // Add attachments if provided
            if (!empty($options['attachments']) && is_array($options['attachments'])) {
                foreach ($options['attachments'] as $attachment) {
                    if (is_string($attachment)) {
                        $message['attachment'] = [
                            '@type' => 'file',
                            '@path' => $attachment
                        ];
                    } else if (is_array($attachment) && isset($attachment['path'])) {
                        $message['attachment'] = [
                            '@type' => 'file',
                            '@path' => $attachment['path'],
                            'filename' => $attachment['name'] ?? basename($attachment['path'])
                        ];
                    }
                }
            }

            // Send message using Mailgun client
            $domain = $this->config['mailgun']['domain'] ?? '';
            $response = $this->mailgunClient->messages()->send($domain, $message);

            return !empty($response->getId());
        } catch (Exception $e) {
            Log::error('Mailgun API error', [
                'error' => $e->getMessage(),
                'to' => $to,
                'subject' => $subject
            ]);
            
            return false;
        }
    }

    /**
     * Send email using SendGrid provider
     *
     * @param string $to Recipient email address
     * @param string $subject Email subject
     * @param string $view View template to use
     * @param array $data Data to pass to the view
     * @param array $options Additional options
     * @return bool True if successful, false otherwise
     */
    protected function sendViaSendgrid($to, $subject, $view, array $data = [], array $options = [])
    {
        // Initialize SendGrid client if not already done
        if (!$this->sendgridClient) {
            $this->initializeSendgridClient();
        }

        if (!$this->sendgridClient) {
            Log::error('SendGrid client not initialized');
            return false;
        }

        try {
            // Prepare email message with HTML and text versions
            $html = $this->renderView($view, $data);
            $text = strip_tags($html);

            // Set from address, subject, and recipient
            $email = new \SendGrid\Mail\Mail();
            $email->setFrom($options['from_address'], $options['from_name']);
            $email->setSubject($subject);
            $email->addTo($to);
            $email->addContent("text/plain", $text);
            $email->addContent("text/html", $html);

            // Add CC if provided
            if (!empty($options['cc'])) {
                if (is_array($options['cc'])) {
                    foreach ($options['cc'] as $cc) {
                        $email->addCc($cc);
                    }
                } else {
                    $email->addCc($options['cc']);
                }
            }

            // Add BCC if provided
            if (!empty($options['bcc'])) {
                if (is_array($options['bcc'])) {
                    foreach ($options['bcc'] as $bcc) {
                        $email->addBcc($bcc);
                    }
                } else {
                    $email->addBcc($options['bcc']);
                }
            }

            // Add Reply-To if provided
            if (!empty($options['reply_to'])) {
                $email->setReplyTo($options['reply_to']);
            }

            // Add tracking options if enabled
            if ($options['tracking_enabled']) {
                $trackingSettings = new \SendGrid\Mail\TrackingSettings();
                
                $clickTracking = new \SendGrid\Mail\ClickTracking();
                $clickTracking->setEnable(true);
                $clickTracking->setEnableText(true);
                $trackingSettings->setClickTracking($clickTracking);
                
                $openTracking = new \SendGrid\Mail\OpenTracking();
                $openTracking->setEnable(true);
                $trackingSettings->setOpenTracking($openTracking);
                
                $email->setTrackingSettings($trackingSettings);
            }

            // Add attachments if provided
            if (!empty($options['attachments']) && is_array($options['attachments'])) {
                foreach ($options['attachments'] as $attachment) {
                    if (is_string($attachment)) {
                        $email->addAttachment(
                            base64_encode(file_get_contents($attachment)),
                            mime_content_type($attachment),
                            basename($attachment),
                            'attachment'
                        );
                    } else if (is_array($attachment) && isset($attachment['path'])) {
                        $email->addAttachment(
                            base64_encode(file_get_contents($attachment['path'])),
                            mime_content_type($attachment['path']),
                            $attachment['name'] ?? basename($attachment['path']),
                            'attachment'
                        );
                    }
                }
            }

            // Send message using SendGrid client
            $response = $this->sendgridClient->send($email);
            
            return $response->statusCode() >= 200 && $response->statusCode() < 300;
        } catch (Exception $e) {
            Log::error('SendGrid API error', [
                'error' => $e->getMessage(),
                'to' => $to,
                'subject' => $subject
            ]);
            
            return false;
        }
    }

    /**
     * Send email using Laravel's Mail facade (SMTP)
     *
     * @param string $to Recipient email address
     * @param string $subject Email subject
     * @param string $view View template to use
     * @param array $data Data to pass to the view
     * @param array $options Additional options
     * @return bool True if successful, false otherwise
     */
    protected function sendViaSmtp($to, $subject, $view, array $data = [], array $options = [])
    {
        try {
            // Prepare mail data with view and variables
            $mailData = $data;
            
            // Set from address and name
            $fromAddress = $options['from_address'];
            $fromName = $options['from_name'];
            
            // Determine if email should be queued
            $shouldQueue = $options['queue'] ?? $this->queueEnabled;
            
            // Send email using Laravel's Mail facade
            $method = $shouldQueue ? 'queue' : 'send';
            
            Mail::$method($view, $mailData, function ($message) use ($to, $subject, $fromAddress, $fromName, $options) {
                $message->to($to)
                        ->subject($subject)
                        ->from($fromAddress, $fromName);
                
                // Add CC if provided
                if (!empty($options['cc'])) {
                    $message->cc($options['cc']);
                }
                
                // Add BCC if provided
                if (!empty($options['bcc'])) {
                    $message->bcc($options['bcc']);
                }
                
                // Add Reply-To if provided
                if (!empty($options['reply_to'])) {
                    $message->replyTo($options['reply_to']);
                }
                
                // Add attachments if provided
                if (!empty($options['attachments']) && is_array($options['attachments'])) {
                    foreach ($options['attachments'] as $attachment) {
                        if (is_string($attachment)) {
                            $message->attach($attachment);
                        } else if (is_array($attachment) && isset($attachment['path'])) {
                            $message->attach(
                                $attachment['path'],
                                $attachment['options'] ?? []
                            );
                        }
                    }
                }
            });
            
            return true;
        } catch (Exception $e) {
            Log::error('SMTP email error', [
                'error' => $e->getMessage(),
                'to' => $to,
                'subject' => $subject
            ]);
            
            return false;
        }
    }

    /**
     * Initialize the Mailgun client
     *
     * @return void No return value
     */
    protected function initializeMailgunClient()
    {
        try {
            // Get Mailgun credentials from configuration
            $apiKey = $this->config['mailgun']['api_key'] ?? null;
            
            if ($apiKey) {
                // Create new Mailgun\Mailgun instance
                $this->mailgunClient = Mailgun::create($apiKey);
            } else {
                Log::error('Mailgun API key not configured');
            }
        } catch (Exception $e) {
            Log::error('Failed to initialize Mailgun client', [
                'error' => $e->getMessage()
            ]);
            
            $this->mailgunClient = null;
        }
    }

    /**
     * Initialize the SendGrid client
     *
     * @return void No return value
     */
    protected function initializeSendgridClient()
    {
        try {
            // Get SendGrid credentials from configuration
            $apiKey = $this->config['sendgrid']['api_key'] ?? null;
            
            if ($apiKey) {
                // Create new SendGrid instance
                $this->sendgridClient = new SendGrid($apiKey);
            } else {
                Log::error('SendGrid API key not configured');
            }
        } catch (Exception $e) {
            Log::error('Failed to initialize SendGrid client', [
                'error' => $e->getMessage()
            ]);
            
            $this->sendgridClient = null;
        }
    }

    /**
     * Validate an email address format
     *
     * @param string $email Email address to validate
     * @return bool True if valid, false otherwise
     */
    protected function validateEmailAddress($email)
    {
        // Use filter_var with FILTER_VALIDATE_EMAIL to validate email format
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Render an email view with data
     *
     * @param string $view View template to render
     * @param array $data Data to pass to the view
     * @return string Rendered HTML content
     */
    protected function renderView($view, array $data = [])
    {
        // Use Laravel's view() helper to render the view with data
        return view($view, $data)->render();
    }

    /**
     * Process a template by replacing placeholders with data
     *
     * @param string $template Template with placeholders
     * @param array $data Data to replace placeholders with
     * @return string Processed template with placeholders replaced
     */
    protected function processTemplate($template, array $data = [])
    {
        // Replace each {key} placeholder with corresponding value
        return preg_replace_callback('/{([^}]+)}/', function ($matches) use ($data) {
            $key = $matches[1];
            return $data[$key] ?? '';
        }, $template);
    }

    /**
     * Log email sending activity
     *
     * @param string $to Recipient email address
     * @param string $subject Email subject
     * @param bool $success Whether the email was sent successfully
     * @param string|null $error Error message if sending failed
     * @return void No return value
     */
    protected function logEmailActivity($to, $subject, $success, $error = null)
    {
        // Prepare log data array with email details
        $logData = [
            'to' => $to,
            'subject' => $subject,
            'success' => $success
        ];

        if ($error) {
            $logData['error'] = $error;
        }

        // Determine log level based on success
        if ($success) {
            Log::info('Email sent successfully', $logData);
        } else {
            Log::warning('Email sending failed', $logData);
        }
    }
}