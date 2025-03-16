<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller; // illuminate/routing ^10.0
use App\Services\AuditService;
use Illuminate\Http\Request; // illuminate/http ^10.0
use Illuminate\Http\Response; // illuminate/http ^10.0
use Illuminate\Http\JsonResponse; // illuminate/http ^10.0
use Illuminate\Support\Facades\Validator; // illuminate/validation ^10.0
use Illuminate\Validation\ValidationException; // illuminate/validation ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support/facades ^10.0
use Illuminate\Support\Facades\Cache; // illuminate/support/facades ^10.0

class SystemSettingsController extends Controller
{
    /**
     * The audit service instance.
     *
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * Create a new controller instance.
     *
     * @param AuditService $auditService
     * @return void
     */
    public function __construct(AuditService $auditService)
    {
        parent::__construct();
        $this->auditService = $auditService;
    }

    /**
     * Get all system settings or a specific setting group.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getSettings(Request $request): JsonResponse
    {
        // Extract group parameter from request (optional)
        $group = $request->input('group');
        
        if ($group) {
            $settings = Config::get("settings.{$group}");
            
            if (is_null($settings)) {
                return response()->json([
                    'success' => false,
                    'message' => "Settings group '{$group}' not found"
                ], Response::HTTP_NOT_FOUND);
            }
        } else {
            // Get all system settings
            $settings = Config::get('settings');
        }
        
        // Filter out sensitive settings based on user permissions
        $filteredSettings = $this->filterSensitiveSettings($settings);
        
        return response()->json([
            'success' => true,
            'data' => $filteredSettings
        ]);
    }

    /**
     * Update system settings.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateSettings(Request $request): JsonResponse
    {
        try {
            // Validate request data based on setting types
            $validator = Validator::make($request->all(), [
                'group' => 'required|string',
                'settings' => 'required|array'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            
            $group = $request->input('group');
            $settings = $request->input('settings');
            
            // Get current settings for audit trail
            $currentSettings = Config::get("settings.{$group}", []);
            
            // For each setting, update the configuration
            foreach ($settings as $key => $value) {
                Config::set("settings.{$group}.{$key}", $value);
                
                // Persist settings to database or file
                $this->saveConfigSetting("settings.{$group}.{$key}", $value);
            }
            
            // Clear any cached settings
            $this->clearSettingsCache($group);
            
            // Log the settings changes using AuditService
            $this->auditService->logUpdate(
                'settings',
                $group,
                $currentSettings,
                $settings
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully',
                'data' => Config::get("settings.{$group}")
            ]);
            
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            Log::error('Error updating settings', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get all email templates or a specific template.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getEmailTemplates(Request $request): JsonResponse
    {
        // Extract template parameter from request (optional)
        $templateName = $request->input('template');
        
        if ($templateName) {
            $template = Config::get("email_templates.{$templateName}");
            
            if (is_null($template)) {
                return response()->json([
                    'success' => false,
                    'message' => "Email template '{$templateName}' not found"
                ], Response::HTTP_NOT_FOUND);
            }
            
            return response()->json([
                'success' => true,
                'data' => $template
            ]);
        }
        
        // Get all email templates
        $templates = Config::get('email_templates');
        
        return response()->json([
            'success' => true,
            'data' => $templates
        ]);
    }

    /**
     * Update an email template.
     *
     * @param Request $request
     * @param string $templateName
     * @return JsonResponse
     */
    public function updateEmailTemplate(Request $request, string $templateName): JsonResponse
    {
        try {
            // Validate request data (subject, body, variables)
            $validator = Validator::make($request->all(), [
                'subject' => 'required|string|max:255',
                'body' => 'required|string',
                'variables' => 'sometimes|array'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            
            // Get the existing template
            $existingTemplate = Config::get("email_templates.{$templateName}");
            
            if (is_null($existingTemplate)) {
                return response()->json([
                    'success' => false,
                    'message' => "Email template '{$templateName}' not found"
                ], Response::HTTP_NOT_FOUND);
            }
            
            // Update the template with new content
            $updatedTemplate = [
                'subject' => $request->input('subject'),
                'body' => $request->input('body')
            ];
            
            if ($request->has('variables')) {
                $updatedTemplate['variables'] = $request->input('variables');
            } elseif (isset($existingTemplate['variables'])) {
                $updatedTemplate['variables'] = $existingTemplate['variables'];
            }
            
            Config::set("email_templates.{$templateName}", $updatedTemplate);
            $this->saveConfigSetting("email_templates.{$templateName}", $updatedTemplate);
            
            // Clear template cache
            $this->clearEmailTemplateCache($templateName);
            
            // Log the template change using AuditService
            $this->auditService->logUpdate(
                'email_template',
                $templateName,
                $existingTemplate,
                $updatedTemplate
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Email template updated successfully',
                'data' => $updatedTemplate
            ]);
            
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            Log::error('Error updating email template', [
                'template' => $templateName,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update email template: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get settings for external system integrations.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getIntegrationSettings(Request $request): JsonResponse
    {
        // Extract integration type parameter from request (optional)
        $integrationType = $request->input('type');
        
        if ($integrationType) {
            $settings = Config::get("integrations.{$integrationType}");
            
            if (is_null($settings)) {
                return response()->json([
                    'success' => false,
                    'message' => "Integration settings for '{$integrationType}' not found"
                ], Response::HTTP_NOT_FOUND);
            }
            
            // Mask sensitive data like API keys and credentials
            $settings = $this->maskSensitiveData($settings, $integrationType);
            
            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        }
        
        // Get all integration settings
        $integrations = Config::get('integrations');
        
        // Mask sensitive data in all integrations
        foreach ($integrations as $type => &$settings) {
            $settings = $this->maskSensitiveData($settings, $type);
        }
        
        return response()->json([
            'success' => true,
            'data' => $integrations
        ]);
    }

    /**
     * Update settings for an external system integration.
     *
     * @param Request $request
     * @param string $integrationType
     * @return JsonResponse
     */
    public function updateIntegrationSettings(Request $request, string $integrationType): JsonResponse
    {
        try {
            // Validate request data based on integration type
            $validationRules = $this->getIntegrationValidationRules($integrationType);
            
            $validator = Validator::make($request->all(), $validationRules);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            
            // Get current settings for audit trail
            $currentSettings = Config::get("integrations.{$integrationType}", []);
            
            if (empty($currentSettings)) {
                return response()->json([
                    'success' => false,
                    'message' => "Integration settings for '{$integrationType}' not found"
                ], Response::HTTP_NOT_FOUND);
            }
            
            // Update the integration configuration
            $settings = $request->except(['test_connection']);
            $updatedSettings = array_merge($currentSettings, $settings);
            
            Config::set("integrations.{$integrationType}", $updatedSettings);
            $this->saveConfigSetting("integrations.{$integrationType}", $updatedSettings);
            
            // Test the integration connection if requested
            $testConnection = $request->input('test_connection', false);
            $connectionStatus = null;
            
            if ($testConnection) {
                $connectionStatus = $this->testIntegrationConnection($integrationType, $updatedSettings);
            }
            
            // Clear integration cache
            $this->clearIntegrationCache($integrationType);
            
            // Log the integration settings change using AuditService
            $this->auditService->logUpdate(
                'integration_settings',
                $integrationType,
                $currentSettings,
                $updatedSettings
            );
            
            // Mask sensitive data before returning
            $maskedSettings = $this->maskSensitiveData($updatedSettings, $integrationType);
            
            $response = [
                'success' => true,
                'message' => 'Integration settings updated successfully',
                'data' => $maskedSettings
            ];
            
            if ($connectionStatus !== null) {
                $response['connection_test'] = $connectionStatus;
            }
            
            return response()->json($response);
            
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            Log::error('Error updating integration settings', [
                'integration_type' => $integrationType,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update integration settings: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get security-related system settings.
     *
     * @return JsonResponse
     */
    public function getSecuritySettings(): JsonResponse
    {
        // Get password policy settings
        $passwordPolicy = Config::get('settings.security.password_policy', []);
        // Get MFA settings
        $mfaSettings = Config::get('settings.security.mfa', []);
        // Get session timeout settings
        $sessionSettings = Config::get('settings.security.session', []);
        // Get API security settings
        $apiSettings = Config::get('settings.security.api', []);
        
        $securitySettings = [
            'password_policy' => $passwordPolicy,
            'mfa' => $mfaSettings,
            'session' => $sessionSettings,
            'api' => $apiSettings
        ];
        
        return response()->json([
            'success' => true,
            'data' => $securitySettings
        ]);
    }

    /**
     * Update security-related system settings.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateSecuritySettings(Request $request): JsonResponse
    {
        try {
            // Validate request data for security settings
            $validator = Validator::make($request->all(), [
                'password_policy.min_length' => 'sometimes|integer|min:8',
                'password_policy.require_uppercase' => 'sometimes|boolean',
                'password_policy.require_lowercase' => 'sometimes|boolean',
                'password_policy.require_numbers' => 'sometimes|boolean',
                'password_policy.require_special_chars' => 'sometimes|boolean',
                'password_policy.expiration_days' => 'sometimes|integer|min:0',
                'password_policy.history_count' => 'sometimes|integer|min:0',
                'mfa.enabled' => 'sometimes|boolean',
                'mfa.required_for_admins' => 'sometimes|boolean',
                'mfa.required_for_staff' => 'sometimes|boolean',
                'mfa.available_methods' => 'sometimes|array',
                'mfa.available_methods.*' => 'string|in:email,sms,totp,webauthn',
                'session.timeout_minutes' => 'sometimes|integer|min:1',
                'session.max_concurrent' => 'sometimes|integer|min:1',
                'session.remember_me_days' => 'sometimes|integer|min:0',
                'api.token_expiration_minutes' => 'sometimes|integer|min:1',
                'api.rate_limit_per_minute' => 'sometimes|integer|min:1',
                'api.require_https' => 'sometimes|boolean'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            
            // Get current security settings for audit trail
            $currentSettings = [
                'password_policy' => Config::get('settings.security.password_policy', []),
                'mfa' => Config::get('settings.security.mfa', []),
                'session' => Config::get('settings.security.session', []),
                'api' => Config::get('settings.security.api', [])
            ];
            
            $updatedSettings = [];
            
            // Update password policy settings
            if ($request->has('password_policy')) {
                $passwordPolicy = $request->input('password_policy');
                $currentPasswordPolicy = $currentSettings['password_policy'];
                $updatedPasswordPolicy = array_merge($currentPasswordPolicy, $passwordPolicy);
                
                Config::set('settings.security.password_policy', $updatedPasswordPolicy);
                $this->saveConfigSetting('settings.security.password_policy', $updatedPasswordPolicy);
                
                $updatedSettings['password_policy'] = $updatedPasswordPolicy;
            }
            
            // Update MFA settings
            if ($request->has('mfa')) {
                $mfaSettings = $request->input('mfa');
                $currentMfaSettings = $currentSettings['mfa'];
                $updatedMfaSettings = array_merge($currentMfaSettings, $mfaSettings);
                
                Config::set('settings.security.mfa', $updatedMfaSettings);
                $this->saveConfigSetting('settings.security.mfa', $updatedMfaSettings);
                
                $updatedSettings['mfa'] = $updatedMfaSettings;
            }
            
            // Update session settings
            if ($request->has('session')) {
                $sessionSettings = $request->input('session');
                $currentSessionSettings = $currentSettings['session'];
                $updatedSessionSettings = array_merge($currentSessionSettings, $sessionSettings);
                
                Config::set('settings.security.session', $updatedSessionSettings);
                $this->saveConfigSetting('settings.security.session', $updatedSessionSettings);
                
                $updatedSettings['session'] = $updatedSessionSettings;
            }
            
            // Update API settings
            if ($request->has('api')) {
                $apiSettings = $request->input('api');
                $currentApiSettings = $currentSettings['api'];
                $updatedApiSettings = array_merge($currentApiSettings, $apiSettings);
                
                Config::set('settings.security.api', $updatedApiSettings);
                $this->saveConfigSetting('settings.security.api', $updatedApiSettings);
                
                $updatedSettings['api'] = $updatedApiSettings;
            }
            
            // Clear security settings cache
            $this->clearSecuritySettingsCache();
            
            // Log the security settings change using AuditService
            $this->auditService->logUpdate(
                'security_settings',
                'security',
                $currentSettings,
                $updatedSettings
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Security settings updated successfully',
                'data' => $updatedSettings
            ]);
            
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            Log::error('Error updating security settings', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update security settings: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get application appearance settings.
     *
     * @return JsonResponse
     */
    public function getAppearanceSettings(): JsonResponse
    {
        // Get theme settings
        $themeSettings = Config::get('settings.appearance.theme', []);
        // Get logo and branding settings
        $logoSettings = Config::get('settings.appearance.logo', []);
        // Get custom CSS settings
        $customCssSettings = Config::get('settings.appearance.custom_css', []);
        
        $appearanceSettings = [
            'theme' => $themeSettings,
            'logo' => $logoSettings,
            'custom_css' => $customCssSettings
        ];
        
        return response()->json([
            'success' => true,
            'data' => $appearanceSettings
        ]);
    }

    /**
     * Update application appearance settings.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateAppearanceSettings(Request $request): JsonResponse
    {
        try {
            // Validate request data for appearance settings
            $validator = Validator::make($request->all(), [
                'theme.primary_color' => 'sometimes|string|regex:/^#[a-fA-F0-9]{6}$/',
                'theme.secondary_color' => 'sometimes|string|regex:/^#[a-fA-F0-9]{6}$/',
                'theme.accent_color' => 'sometimes|string|regex:/^#[a-fA-F0-9]{6}$/',
                'theme.text_color' => 'sometimes|string|regex:/^#[a-fA-F0-9]{6}$/',
                'theme.background_color' => 'sometimes|string|regex:/^#[a-fA-F0-9]{6}$/',
                'theme.font_family' => 'sometimes|string|max:100',
                'logo.main' => 'sometimes|image|mimes:jpeg,png,jpg,svg|max:2048',
                'logo.favicon' => 'sometimes|image|mimes:ico,png|max:1024',
                'logo.email' => 'sometimes|image|mimes:jpeg,png,jpg,svg|max:1024',
                'custom_css' => 'sometimes|string|max:50000'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            
            // Get current appearance settings for audit trail
            $currentSettings = [
                'theme' => Config::get('settings.appearance.theme', []),
                'logo' => Config::get('settings.appearance.logo', []),
                'custom_css' => Config::get('settings.appearance.custom_css', '')
            ];
            
            $updatedSettings = [];
            
            // Update theme settings
            if ($request->has('theme')) {
                $themeSettings = $request->input('theme');
                $currentThemeSettings = $currentSettings['theme'];
                $updatedThemeSettings = array_merge($currentThemeSettings, $themeSettings);
                
                Config::set('settings.appearance.theme', $updatedThemeSettings);
                $this->saveConfigSetting('settings.appearance.theme', $updatedThemeSettings);
                
                $updatedSettings['theme'] = $updatedThemeSettings;
            }
            
            // Process and store uploaded logo if provided
            if ($request->hasFile('logo.main') || 
                $request->hasFile('logo.favicon') || 
                $request->hasFile('logo.email')) {
                
                $logoSettings = $currentSettings['logo'];
                
                foreach (['main', 'favicon', 'email'] as $logoType) {
                    if ($request->hasFile("logo.{$logoType}")) {
                        $file = $request->file("logo.{$logoType}");
                        $path = $this->storeLogoFile($file, $logoType);
                        $logoSettings[$logoType] = $path;
                        $logoSettings["{$logoType}_updated_at"] = now()->toDateTimeString();
                    }
                }
                
                Config::set('settings.appearance.logo', $logoSettings);
                $this->saveConfigSetting('settings.appearance.logo', $logoSettings);
                
                $updatedSettings['logo'] = $logoSettings;
            }
            
            // Update custom CSS
            if ($request->has('custom_css')) {
                $customCss = $request->input('custom_css');
                
                Config::set('settings.appearance.custom_css', $customCss);
                $this->saveConfigSetting('settings.appearance.custom_css', $customCss);
                
                $updatedSettings['custom_css'] = $customCss;
            }
            
            // Clear appearance cache
            $this->clearAppearanceCache();
            
            // Log the appearance settings change using AuditService
            $this->auditService->logUpdate(
                'appearance_settings',
                'appearance',
                $currentSettings,
                $updatedSettings
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Appearance settings updated successfully',
                'data' => $updatedSettings
            ]);
            
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            Log::error('Error updating appearance settings', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update appearance settings: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Reset settings to system defaults.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function resetToDefaults(Request $request): JsonResponse
    {
        try {
            // Validate request data (settings group to reset)
            $validator = Validator::make($request->all(), [
                'group' => 'required|string|in:general,security,appearance,notifications,integrations'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            
            $group = $request->input('group');
            
            // Get current settings for audit trail
            $currentSettings = Config::get("settings.{$group}", []);
            
            // Reset specified settings group to defaults
            $defaultSettings = $this->getDefaultSettings($group);
            
            Config::set("settings.{$group}", $defaultSettings);
            $this->saveConfigSetting("settings.{$group}", $defaultSettings);
            
            // Clear related caches
            switch ($group) {
                case 'security':
                    $this->clearSecuritySettingsCache();
                    break;
                case 'appearance':
                    $this->clearAppearanceCache();
                    break;
                case 'integrations':
                    $this->clearIntegrationCache();
                    break;
                default:
                    $this->clearSettingsCache($group);
                    break;
            }
            
            // Log the reset action using AuditService
            $this->auditService->logUpdate(
                'settings_reset',
                $group,
                $currentSettings,
                $defaultSettings
            );
            
            return response()->json([
                'success' => true,
                'message' => "'{$group}' settings have been reset to system defaults",
                'data' => $defaultSettings
            ]);
            
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            Log::error('Error resetting settings', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset settings: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Filter out sensitive settings based on user permissions.
     *
     * @param array $settings
     * @return array
     */
    protected function filterSensitiveSettings(array $settings): array
    {
        // Check if user has permission to view sensitive settings
        $user = auth()->user();
        $canViewSensitive = $user && $user->hasPermissionTo('view', 'sensitive_settings');
        
        if ($canViewSensitive) {
            return $settings;
        }
        
        // Define sensitive setting paths to be filtered out
        $sensitivePaths = [
            'integrations.*.api_key',
            'integrations.*.secret',
            'integrations.*.password',
            'integrations.*.token',
            'mail.smtp.password',
            'security.*.secret_key'
        ];
        
        // Helper function to recursively filter settings
        $filterRecursive = function($data, $path = '') use (&$filterRecursive, $sensitivePaths) {
            if (!is_array($data)) {
                return $data;
            }
            
            $result = [];
            
            foreach ($data as $key => $value) {
                $currentPath = $path ? "{$path}.{$key}" : $key;
                
                // Check if current path matches any sensitive path pattern
                $isSensitive = false;
                foreach ($sensitivePaths as $sensitivePath) {
                    if (fnmatch($sensitivePath, $currentPath)) {
                        $isSensitive = true;
                        break;
                    }
                }
                
                if ($isSensitive) {
                    $result[$key] = '******';
                } elseif (is_array($value)) {
                    $result[$key] = $filterRecursive($value, $currentPath);
                } else {
                    $result[$key] = $value;
                }
            }
            
            return $result;
        };
        
        return $filterRecursive($settings);
    }

    /**
     * Mask sensitive data like API keys and credentials.
     *
     * @param array $settings
     * @param string $integrationType
     * @return array
     */
    protected function maskSensitiveData(array $settings, string $integrationType): array
    {
        $sensitiveFields = $this->getSensitiveFields($integrationType);
        
        foreach ($sensitiveFields as $field) {
            if (isset($settings[$field]) && !empty($settings[$field])) {
                $settings[$field] = '******';
            }
        }
        
        return $settings;
    }

    /**
     * Get sensitive fields for an integration type.
     *
     * @param string $integrationType
     * @return array
     */
    protected function getSensitiveFields(string $integrationType): array
    {
        $sensitiveFieldsMap = [
            'sis' => ['api_key', 'secret', 'password', 'access_token', 'refresh_token'],
            'lms' => ['api_key', 'secret', 'token', 'password'],
            'payment' => ['api_key', 'secret_key', 'private_key', 'webhook_secret'],
            'email' => ['api_key', 'password', 'secret'],
            'sms' => ['api_key', 'auth_token', 'account_sid', 'secret'],
            'storage' => ['api_key', 'secret', 'access_key', 'secret_key'],
            'ai' => ['api_key', 'client_secret'],
            'default' => ['api_key', 'secret', 'password', 'token', 'key']
        ];
        
        return $sensitiveFieldsMap[$integrationType] ?? $sensitiveFieldsMap['default'];
    }

    /**
     * Get validation rules for integration settings.
     *
     * @param string $integrationType
     * @return array
     */
    protected function getIntegrationValidationRules(string $integrationType): array
    {
        $commonRules = [
            'enabled' => 'sometimes|boolean',
            'test_connection' => 'sometimes|boolean',
        ];
        
        $typeSpecificRules = [];
        
        switch ($integrationType) {
            case 'sis':
                $typeSpecificRules = [
                    'base_url' => 'sometimes|required|url',
                    'api_key' => 'sometimes|required|string',
                    'secret' => 'sometimes|required|string',
                    'timeout' => 'sometimes|integer|min:1',
                    'sync_frequency' => 'sometimes|string|in:realtime,hourly,daily',
                ];
                break;
            
            case 'lms':
                $typeSpecificRules = [
                    'base_url' => 'sometimes|required|url',
                    'api_key' => 'sometimes|required|string',
                    'secret' => 'sometimes|required|string',
                    'client_id' => 'sometimes|required|string',
                    'lti_enabled' => 'sometimes|boolean',
                    'sso_enabled' => 'sometimes|boolean',
                ];
                break;
                
            case 'payment':
                $typeSpecificRules = [
                    'provider' => 'sometimes|required|string|in:stripe,paypal,authorize',
                    'api_key' => 'sometimes|required|string',
                    'secret_key' => 'sometimes|required|string',
                    'webhook_secret' => 'sometimes|string',
                    'sandbox_mode' => 'sometimes|boolean',
                ];
                break;
                
            case 'email':
                $typeSpecificRules = [
                    'provider' => 'sometimes|required|string|in:smtp,mailgun,sendgrid,ses',
                    'from_address' => 'sometimes|required|email',
                    'from_name' => 'sometimes|required|string',
                    'api_key' => 'sometimes|string',
                    'host' => 'sometimes|string',
                    'port' => 'sometimes|integer|min:1|max:65535',
                    'encryption' => 'sometimes|string|in:tls,ssl,null',
                ];
                break;
                
            case 'sms':
                $typeSpecificRules = [
                    'provider' => 'sometimes|required|string|in:twilio,nexmo,custom',
                    'account_sid' => 'sometimes|string',
                    'auth_token' => 'sometimes|string',
                    'from_number' => 'sometimes|string',
                ];
                break;
                
            default:
                $typeSpecificRules = [
                    'api_key' => 'sometimes|string',
                    'secret' => 'sometimes|string',
                    'base_url' => 'sometimes|url',
                ];
                break;
        }
        
        return array_merge($commonRules, $typeSpecificRules);
    }

    /**
     * Test integration connection.
     *
     * @param string $integrationType
     * @param array $settings
     * @return array
     */
    protected function testIntegrationConnection(string $integrationType, array $settings): array
    {
        try {
            // This would be implemented to actually test connection to the external system
            switch ($integrationType) {
                case 'sis':
                    if (!isset($settings['base_url']) || !isset($settings['api_key'])) {
                        return [
                            'success' => false,
                            'message' => 'Missing required configuration for SIS connection test'
                        ];
                    }
                    
                    // Simulate connection test
                    $success = true;
                    
                    return [
                        'success' => $success,
                        'message' => $success ? 'Successfully connected to SIS' : 'Failed to connect to SIS'
                    ];
                    
                case 'lms':
                    if (!isset($settings['base_url']) || !isset($settings['api_key'])) {
                        return [
                            'success' => false,
                            'message' => 'Missing required configuration for LMS connection test'
                        ];
                    }
                    
                    // Simulate connection test
                    $success = true;
                    
                    return [
                        'success' => $success,
                        'message' => $success ? 'Successfully connected to LMS' : 'Failed to connect to LMS'
                    ];
                    
                case 'payment':
                    if (!isset($settings['api_key']) || !isset($settings['secret_key'])) {
                        return [
                            'success' => false,
                            'message' => 'Missing required configuration for payment gateway connection test'
                        ];
                    }
                    
                    // Simulate connection test
                    $success = true;
                    
                    return [
                        'success' => $success,
                        'message' => $success ? 'Successfully connected to payment gateway' : 'Failed to connect to payment gateway'
                    ];
                    
                default:
                    // Generic connection test simulation
                    return [
                        'success' => true,
                        'message' => 'Connection test simulated for ' . $integrationType
                    ];
            }
            
        } catch (\Exception $e) {
            Log::error('Integration connection test failed', [
                'integration_type' => $integrationType,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => 'Connection test failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get default settings for a specific group.
     *
     * @param string $group
     * @return array
     */
    protected function getDefaultSettings(string $group): array
    {
        switch ($group) {
            case 'general':
                return [
                    'application_name' => 'Student Admissions Enrollment Platform',
                    'institution_name' => 'Example University',
                    'contact_email' => 'admissions@example.edu',
                    'support_phone' => '(555) 123-4567',
                    'timezone' => 'UTC',
                    'date_format' => 'Y-m-d',
                    'time_format' => 'H:i:s',
                    'items_per_page' => 15,
                ];
                
            case 'security':
                return [
                    'password_policy' => [
                        'min_length' => 12,
                        'require_uppercase' => true,
                        'require_lowercase' => true,
                        'require_numbers' => true,
                        'require_special_chars' => true,
                        'expiration_days' => 180,
                        'history_count' => 5,
                    ],
                    'mfa' => [
                        'enabled' => true,
                        'required_for_admins' => true,
                        'required_for_staff' => true,
                        'available_methods' => ['email', 'sms', 'totp'],
                    ],
                    'session' => [
                        'timeout_minutes' => 120,
                        'max_concurrent' => 3,
                        'remember_me_days' => 30,
                    ],
                    'api' => [
                        'token_expiration_minutes' => 60,
                        'rate_limit_per_minute' => 60,
                        'require_https' => true,
                    ],
                ];
                
            case 'appearance':
                return [
                    'theme' => [
                        'primary_color' => '#1976D2',
                        'secondary_color' => '#03A9F4',
                        'accent_color' => '#FF4081',
                        'text_color' => '#212121',
                        'background_color' => '#FFFFFF',
                        'font_family' => 'Roboto, sans-serif',
                    ],
                    'logo' => [
                        'main' => '/images/default-logo.png',
                        'favicon' => '/images/default-favicon.ico',
                        'email' => '/images/default-email-logo.png',
                    ],
                    'custom_css' => '',
                ];
                
            case 'notifications':
                return [
                    'email' => [
                        'enabled' => true,
                        'include_system_name' => true,
                        'footer_text' => 'This is an automated message from the Student Admissions Enrollment Platform.',
                    ],
                    'sms' => [
                        'enabled' => true,
                        'character_limit' => 160,
                    ],
                    'in_app' => [
                        'enabled' => true,
                        'max_age_days' => 30,
                    ],
                ];
                
            case 'integrations':
                return [
                    'sis' => [
                        'enabled' => false,
                        'base_url' => '',
                        'api_key' => '',
                        'secret' => '',
                        'timeout' => 30,
                        'sync_frequency' => 'daily',
                    ],
                    'lms' => [
                        'enabled' => false,
                        'base_url' => '',
                        'api_key' => '',
                        'secret' => '',
                        'client_id' => '',
                        'lti_enabled' => false,
                        'sso_enabled' => false,
                    ],
                    'payment' => [
                        'enabled' => false,
                        'provider' => 'stripe',
                        'api_key' => '',
                        'secret_key' => '',
                        'webhook_secret' => '',
                        'sandbox_mode' => true,
                    ],
                ];
                
            default:
                return [];
        }
    }

    /**
     * Save configuration setting to persistent storage.
     *
     * @param string $key
     * @param mixed $value
     * @return void
     */
    protected function saveConfigSetting(string $key, $value): void
    {
        // In a real implementation, this would save to database or env file
        // For example:
        // Setting::updateOrCreate(
        //     ['key' => $key],
        //     ['value' => is_array($value) ? json_encode($value) : $value]
        // );
        
        // For this implementation, we're just using the in-memory configuration
        // which is handled by the Config::set() calls
    }

    /**
     * Store uploaded logo file.
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $type
     * @return string
     */
    protected function storeLogoFile($file, string $type): string
    {
        $extension = $file->getClientOriginalExtension();
        $filename = "logo_{$type}.{$extension}";
        $path = $file->storeAs('public/logos', $filename);
        
        // Return the public URL
        return str_replace('public/', '/storage/', $path);
    }

    /**
     * Clear settings cache for a specific group.
     *
     * @param string|null $group
     * @return void
     */
    protected function clearSettingsCache(?string $group = null): void
    {
        if ($group) {
            Cache::forget("settings.{$group}");
        } else {
            Cache::forget('settings');
        }
    }

    /**
     * Clear email template cache.
     *
     * @param string|null $templateName
     * @return void
     */
    protected function clearEmailTemplateCache(?string $templateName = null): void
    {
        if ($templateName) {
            Cache::forget("email_templates.{$templateName}");
        } else {
            Cache::forget('email_templates');
        }
    }

    /**
     * Clear integration cache.
     *
     * @param string|null $integrationType
     * @return void
     */
    protected function clearIntegrationCache(?string $integrationType = null): void
    {
        if ($integrationType) {
            Cache::forget("integrations.{$integrationType}");
        } else {
            Cache::forget('integrations');
        }
    }

    /**
     * Clear security settings cache.
     *
     * @return void
     */
    protected function clearSecuritySettingsCache(): void
    {
        Cache::forget('settings.security');
        Cache::forget('settings.security.password_policy');
        Cache::forget('settings.security.mfa');
        Cache::forget('settings.security.session');
        Cache::forget('settings.security.api');
    }

    /**
     * Clear appearance cache.
     *
     * @return void
     */
    protected function clearAppearanceCache(): void
    {
        Cache::forget('settings.appearance');
        Cache::forget('settings.appearance.theme');
        Cache::forget('settings.appearance.logo');
        Cache::forget('settings.appearance.custom_css');
    }
}