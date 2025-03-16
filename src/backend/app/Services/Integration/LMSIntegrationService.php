<?php

namespace App\Services\Integration;

use App\Models\Integration;
use App\Models\IntegrationLog;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Application;
use App\Exceptions\IntegrationException;
use Illuminate\Support\Facades\Http; // Laravel HTTP client for API requests to LMS, ^10.0
use Illuminate\Support\Facades\Log; // Laravel logging facade for error and activity logging, ^10.0
use Illuminate\Support\Facades\Config; // Laravel configuration facade for accessing LMS settings, ^10.0
use Illuminate\Support\Facades\DB; // Laravel database facade for transaction management, ^10.0
use Exception; // PHP Exception class for error handling, 8.2
use Carbon\Carbon; // Date and time manipulation library, ^2.0

class LMSIntegrationService
{
    /**
     * The integration model instance.
     *
     * @var Integration|null
     */
    protected ?Integration $integration = null;

    /**
     * The configuration data for the LMS integration.
     *
     * @var array
     */
    protected array $config = [];

    /**
     * The API base URL for the LMS.
     *
     * @var string
     */
    protected string $apiUrl = '';

    /**
     * The API key for the LMS.
     *
     * @var string
     */
    protected string $apiKey = '';

    /**
     * The API secret for the LMS.
     *
     * @var string
     */
    protected string $apiSecret = '';

    /**
     * The timeout for API requests in seconds.
     *
     * @var int
     */
    protected int $timeout = 30;

    /**
     * The number of retry attempts for failed API requests.
     *
     * @var int
     */
    protected int $retryAttempts = 3;

    /**
     * The delay between retry attempts in seconds.
     *
     * @var int
     */
    protected int $retryDelay = 2;

    /**
     * The endpoint paths for the LMS API.
     *
     * @var array
     */
    protected array $endpoints = [];

    /**
     * The field mappings between local system and LMS.
     *
     * @var array
     */
    protected array $mappings = [];

    /**
     * The ID of the orientation course in the LMS.
     *
     * @var string
     */
    protected string $orientationCourseId = '';

    /**
     * The SSO configuration.
     *
     * @var array
     */
    protected array $ssoConfig = [];

    /**
     * Create a new LMS integration service instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->initialize();
    }

    /**
     * Initialize the LMS integration with configuration.
     *
     * @return bool
     */
    public function initialize(): bool
    {
        try {
            // Load the LMS configuration from config file
            $this->config = Config::get('integrations.lms', []);

            // Find the active LMS integration from database
            $this->integration = Integration::scopeByType('lms')->active()->first();

            if (!$this->integration) {
                Log::warning('No active LMS integration found.');
                return false;
            }

            // Set up API credentials and configuration from integration record
            $this->apiUrl = $this->integration->getConfigValue('api_url', '');
            $this->apiKey = $this->integration->getConfigValue('api_key', '');
            $this->apiSecret = $this->integration->getConfigValue('api_secret', '');
            $this->timeout = $this->integration->getConfigValue('timeout', 30);
            $this->retryAttempts = $this->integration->getConfigValue('retry_attempts', 3);
            $this->retryDelay = $this->integration->getConfigValue('retry_delay', 2);
            
            // Set up endpoints
            $this->endpoints = $this->integration->getConfigValue('endpoints', [
                'users' => '/api/users',
                'users_search' => '/api/users/search',
                'courses' => '/api/courses',
                'enrollments' => '/api/enrollments',
                'sso' => '/api/auth/sso'
            ]);
            
            // Set up field mappings
            $this->mappings = $this->integration->getConfigValue('field_mappings', [
                'user' => [
                    'id' => 'id',
                    'email' => 'email',
                    'first_name' => 'first_name',
                    'last_name' => 'last_name',
                    'full_name' => 'name',
                    'status' => 'status'
                ]
            ]);
            
            // Set up orientation course ID
            $this->orientationCourseId = $this->integration->getConfigValue('orientation_course_id', '');
            
            // Set up SSO configuration
            $this->ssoConfig = $this->integration->getConfigValue('sso', [
                'enabled' => false,
                'method' => 'oauth', // oauth or saml
                'client_id' => '',
                'client_secret' => '',
                'auth_url' => '',
                'token_url' => '',
                'api_scope' => '',
                'redirect_uri' => '',
                'saml_idp_entity_id' => '',
                'saml_idp_sso_url' => '',
                'saml_idp_slo_url' => '',
                'saml_idp_x509cert' => '',
                'saml_sp_entity_id' => '',
                'saml_sp_acs_url' => '',
                'saml_sp_slo_url' => ''
            ]);

            return true;
        } catch (Exception $e) {
            Log::error('Failed to initialize LMS integration: ' . $e->getMessage(), [
                'exception' => $e
            ]);
            
            return false;
        }
    }

    /**
     * Create a new user account in the LMS.
     *
     * @param User $user
     * @return array
     * @throws IntegrationException
     */
    public function createUser(User $user): array
    {
        // Ensure user profile is loaded
        if (!$user->relationLoaded('profile')) {
            $user->load('profile');
        }
        
        // Prepare user data from local user model
        $userData = [
            'email' => $user->email,
            'first_name' => $user->profile->first_name ?? '',
            'last_name' => $user->profile->last_name ?? '',
            'name' => $user->profile->full_name ?? "{$user->profile->first_name} {$user->profile->last_name}",
            'status' => 'active',
            'send_welcome' => true,
            'authentication_provider_id' => 'internal'
        ];

        // Add additional fields if configured in mappings
        if (isset($this->mappings['user_additional_fields']) && is_array($this->mappings['user_additional_fields'])) {
            foreach ($this->mappings['user_additional_fields'] as $localField => $lmsField) {
                // Handle nested properties using dot notation
                if (strpos($localField, '.') !== false) {
                    list($model, $field) = explode('.', $localField, 2);
                    if ($model === 'profile' && $user->profile) {
                        $userData[$lmsField] = $user->profile->$field ?? null;
                    }
                } else {
                    $userData[$lmsField] = $user->$localField ?? null;
                }
            }
        }

        // Map the data to LMS field names
        $mappedData = $this->mapDataToLMS($userData);
        
        try {
            // Send the request to create the user
            $response = $this->sendApiRequest('POST', $this->endpoints['users'], $mappedData);
            
            // Log the successful creation
            $this->logActivity('create_user', 'success', $mappedData, $response);
            
            return $response;
        } catch (IntegrationException $e) {
            // Check if the error is due to a duplicate user (already exists)
            if ($e->getErrorCode() === 'DUPLICATE_USER' || 
                (isset($e->getResponseData()['error']) && stripos($e->getResponseData()['error'], 'already exists') !== false)) {
                
                // Try to find the user by email instead
                try {
                    $existingUser = $this->findUserByEmail($user->email);
                    
                    if ($existingUser) {
                        // Log that we found an existing user instead of creating
                        $this->logActivity('create_user', 'success', $mappedData, [
                            'note' => 'User already exists in LMS, returned existing user data',
                            'user' => $existingUser
                        ]);
                        
                        return $existingUser;
                    }
                } catch (Exception $inner) {
                    // If finding by email also fails, rethrow the original exception
                    throw $e;
                }
            }
            
            // For other errors, log and rethrow
            $this->logActivity('create_user', 'error', $mappedData, $e->getResponseData(), $e->getMessage());
            throw $e;
        }
    }

    /**
     * Update an existing user account in the LMS.
     *
     * @param User $user
     * @param string $lmsUserId
     * @return array
     * @throws IntegrationException
     */
    public function updateUser(User $user, string $lmsUserId): array
    {
        // Ensure user profile is loaded
        if (!$user->relationLoaded('profile')) {
            $user->load('profile');
        }
        
        // Prepare user data for update
        $userData = [
            'email' => $user->email,
            'first_name' => $user->profile->first_name ?? '',
            'last_name' => $user->profile->last_name ?? '',
            'name' => $user->profile->full_name ?? "{$user->profile->first_name} {$user->profile->last_name}",
            'status' => $user->is_active ? 'active' : 'inactive'
        ];

        // Add additional fields if configured in mappings
        if (isset($this->mappings['user_additional_fields']) && is_array($this->mappings['user_additional_fields'])) {
            foreach ($this->mappings['user_additional_fields'] as $localField => $lmsField) {
                // Handle nested properties using dot notation
                if (strpos($localField, '.') !== false) {
                    list($model, $field) = explode('.', $localField, 2);
                    if ($model === 'profile' && $user->profile) {
                        $userData[$lmsField] = $user->profile->$field ?? null;
                    }
                } else {
                    $userData[$lmsField] = $user->$localField ?? null;
                }
            }
        }

        // Map the data to LMS field names
        $mappedData = $this->mapDataToLMS($userData);
        
        try {
            // Send the request to update the user
            $response = $this->sendApiRequest('PUT', $this->endpoints['users'] . '/' . $lmsUserId, $mappedData);
            
            // Log the successful update
            $this->logActivity('update_user', 'success', $mappedData, $response);
            
            return $response;
        } catch (IntegrationException $e) {
            // Log the error and rethrow
            $this->logActivity('update_user', 'error', $mappedData, $e->getResponseData(), $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get user information from the LMS.
     *
     * @param string $lmsUserId
     * @return array|null
     * @throws IntegrationException
     */
    public function getUser(string $lmsUserId): ?array
    {
        try {
            // Send the request to get the user
            $response = $this->sendApiRequest('GET', $this->endpoints['users'] . '/' . $lmsUserId);
            
            // Log the successful retrieval
            $this->logActivity('get_user', 'success', ['id' => $lmsUserId], $response);
            
            // Map the data from LMS field names to local field names
            return $this->mapDataFromLMS($response);
        } catch (IntegrationException $e) {
            // If user not found, return null instead of throwing an exception
            if ($e->getErrorCode() === 'RESOURCE_NOT_FOUND' || 
                ($e->getCode() === 404 || 
                (isset($e->getResponseData()['status']) && $e->getResponseData()['status'] === 404))) {
                
                $this->logActivity('get_user', 'error', ['id' => $lmsUserId], $e->getResponseData(), 'User not found in LMS');
                return null;
            }
            
            // For other errors, log and rethrow
            $this->logActivity('get_user', 'error', ['id' => $lmsUserId], $e->getResponseData(), $e->getMessage());
            throw $e;
        }
    }

    /**
     * Find a user in the LMS by email address.
     *
     * @param string $email
     * @return array|null
     * @throws IntegrationException
     */
    public function findUserByEmail(string $email): ?array
    {
        try {
            // Send the request to search for the user by email
            $response = $this->sendApiRequest('GET', $this->endpoints['users_search'], ['email' => $email]);
            
            // Log the successful search
            $this->logActivity('find_user_by_email', 'success', ['email' => $email], $response);
            
            // Handle different response formats from different LMS systems
            if (isset($response['users']) && is_array($response['users'])) {
                // If response contains a 'users' array
                $users = $response['users'];
                
                // Find the exact email match
                foreach ($users as $user) {
                    if (strtolower($user['email']) === strtolower($email)) {
                        return $this->mapDataFromLMS($user);
                    }
                }
                
                return null;
            } elseif (isset($response['data']) && is_array($response['data'])) {
                // If response contains a 'data' array
                $users = $response['data'];
                
                // Find the exact email match
                foreach ($users as $user) {
                    if (strtolower($user['email']) === strtolower($email)) {
                        return $this->mapDataFromLMS($user);
                    }
                }
                
                return null;
            } elseif (is_array($response) && !empty($response)) {
                // If response is a direct array of users
                // Find the exact email match
                foreach ($response as $user) {
                    if (isset($user['email']) && strtolower($user['email']) === strtolower($email)) {
                        return $this->mapDataFromLMS($user);
                    }
                }
                
                return null;
            } else {
                // If response is a single user object
                if (isset($response['email']) && strtolower($response['email']) === strtolower($email)) {
                    return $this->mapDataFromLMS($response);
                }
                
                return null;
            }
        } catch (IntegrationException $e) {
            // Log the error and rethrow
            $this->logActivity('find_user_by_email', 'error', ['email' => $email], $e->getResponseData(), $e->getMessage());
            throw $e;
        }
    }

    /**
     * Enroll a user in a specific course in the LMS.
     *
     * @param string $lmsUserId
     * @param string $courseId
     * @param string $role
     * @return bool
     * @throws IntegrationException
     */
    public function enrollUserInCourse(string $lmsUserId, string $courseId, string $role = 'student'): bool
    {
        // Prepare enrollment data
        $enrollmentData = [
            'user_id' => $lmsUserId,
            'course_id' => $courseId,
            'role' => $role,
            'status' => 'active',
            'enrollment_type' => 'manual'
        ];
        
        try {
            // Send the request to create the enrollment
            $response = $this->sendApiRequest('POST', $this->endpoints['enrollments'], $enrollmentData);
            
            // Log the successful enrollment
            $this->logActivity('enroll_user_in_course', 'success', $enrollmentData, $response);
            
            return true;
        } catch (IntegrationException $e) {
            // Check if the error is due to a duplicate enrollment (already enrolled)
            if ($e->getErrorCode() === 'DUPLICATE_ENROLLMENT' || 
                (isset($e->getResponseData()['error']) && stripos($e->getResponseData()['error'], 'already enrolled') !== false)) {
                
                // Log that the user is already enrolled and return success
                $this->logActivity('enroll_user_in_course', 'success', $enrollmentData, [
                    'note' => 'User already enrolled in course',
                    'user_id' => $lmsUserId,
                    'course_id' => $courseId
                ]);
                
                return true;
            }
            
            // For other errors, log and rethrow
            $this->logActivity('enroll_user_in_course', 'error', $enrollmentData, $e->getResponseData(), $e->getMessage());
            throw $e;
        }
    }

    /**
     * Remove a user's enrollment from a course in the LMS.
     *
     * @param string $lmsUserId
     * @param string $courseId
     * @return bool
     * @throws IntegrationException
     */
    public function unenrollUserFromCourse(string $lmsUserId, string $courseId): bool
    {
        try {
            // Prepare the request data
            $data = [
                'user_id' => $lmsUserId,
                'course_id' => $courseId
            ];
            
            // Send the request to remove the enrollment
            // Different LMS systems might have different API patterns for unenrollment
            $response = $this->sendApiRequest('DELETE', $this->endpoints['enrollments'], $data);
            
            // Log the successful unenrollment
            $this->logActivity('unenroll_user_from_course', 'success', $data, $response);
            
            return true;
        } catch (IntegrationException $e) {
            // Check if the error is because the enrollment doesn't exist
            if ($e->getErrorCode() === 'RESOURCE_NOT_FOUND' || 
                ($e->getCode() === 404 || 
                (isset($e->getResponseData()['status']) && $e->getResponseData()['status'] === 404))) {
                
                // Log that the enrollment doesn't exist and return success
                $this->logActivity('unenroll_user_from_course', 'success', [
                    'user_id' => $lmsUserId,
                    'course_id' => $courseId
                ], [
                    'note' => 'User not enrolled in course or enrollment already removed'
                ]);
                
                return true;
            }
            
            // For other errors, log and rethrow
            $this->logActivity('unenroll_user_from_course', 'error', [
                'user_id' => $lmsUserId,
                'course_id' => $courseId
            ], $e->getResponseData(), $e->getMessage());
            
            throw $e;
        }
    }

    /**
     * Get a list of courses a user is enrolled in.
     *
     * @param string $lmsUserId
     * @return array
     * @throws IntegrationException
     */
    public function getUserEnrollments(string $lmsUserId): array
    {
        try {
            // Send the request to get the user's enrollments
            $response = $this->sendApiRequest('GET', $this->endpoints['users'] . '/' . $lmsUserId . '/enrollments');
            
            // Log the successful retrieval
            $this->logActivity('get_user_enrollments', 'success', ['id' => $lmsUserId], $response);
            
            // Process and return the enrollments
            if (isset($response['enrollments']) && is_array($response['enrollments'])) {
                return $response['enrollments'];
            } elseif (isset($response['data']) && is_array($response['data'])) {
                return $response['data'];
            } else {
                return is_array($response) ? $response : [];
            }
        } catch (IntegrationException $e) {
            // Log the error and rethrow
            $this->logActivity('get_user_enrollments', 'error', ['id' => $lmsUserId], $e->getResponseData(), $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get a list of courses from the LMS.
     *
     * @param array $filters
     * @return array
     * @throws IntegrationException
     */
    public function getCourses(array $filters = []): array
    {
        try {
            // Send the request to get courses with optional filters
            $response = $this->sendApiRequest('GET', $this->endpoints['courses'], $filters);
            
            // Log the successful retrieval
            $this->logActivity('get_courses', 'success', $filters, $response);
            
            // Process and return the courses
            if (isset($response['courses']) && is_array($response['courses'])) {
                return $response['courses'];
            } elseif (isset($response['data']) && is_array($response['data'])) {
                return $response['data'];
            } else {
                return is_array($response) ? $response : [];
            }
        } catch (IntegrationException $e) {
            // Log the error and rethrow
            $this->logActivity('get_courses', 'error', $filters, $e->getResponseData(), $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get detailed information about a specific course.
     *
     * @param string $courseId
     * @return array|null
     * @throws IntegrationException
     */
    public function getCourse(string $courseId): ?array
    {
        try {
            // Send the request to get the course
            $response = $this->sendApiRequest('GET', $this->endpoints['courses'] . '/' . $courseId);
            
            // Log the successful retrieval
            $this->logActivity('get_course', 'success', ['id' => $courseId], $response);
            
            return $response;
        } catch (IntegrationException $e) {
            // If course not found, return null instead of throwing an exception
            if ($e->getErrorCode() === 'RESOURCE_NOT_FOUND' || 
                ($e->getCode() === 404 || 
                (isset($e->getResponseData()['status']) && $e->getResponseData()['status'] === 404))) {
                
                $this->logActivity('get_course', 'error', ['id' => $courseId], $e->getResponseData(), 'Course not found in LMS');
                return null;
            }
            
            // For other errors, log and rethrow
            $this->logActivity('get_course', 'error', ['id' => $courseId], $e->getResponseData(), $e->getMessage());
            throw $e;
        }
    }

    /**
     * Create a user account and enroll in orientation course.
     *
     * @param User $user
     * @return array
     * @throws IntegrationException
     */
    public function provisionUserForOrientation(User $user): array
    {
        try {
            // Begin a transaction to ensure both operations succeed or fail together
            DB::beginTransaction();
            
            // First, check if the user already exists in the LMS by email
            $existingUser = $this->findUserByEmail($user->email);
            
            // Track if we created a new user or found an existing one
            $userCreated = false;
            
            // If user doesn't exist, create a new one
            if (!$existingUser) {
                $lmsUser = $this->createUser($user);
                $userCreated = true;
            } else {
                $lmsUser = $existingUser;
            }
            
            // Get the LMS user ID
            $lmsUserId = $lmsUser['id'] ?? null;
            
            if (!$lmsUserId) {
                throw new IntegrationException('Failed to obtain LMS user ID after provisioning user');
            }
            
            // Next, enroll the user in the orientation course if it's configured
            $enrollmentResult = false;
            if (!empty($this->orientationCourseId)) {
                $enrollmentResult = $this->enrollUserInCourse($lmsUserId, $this->orientationCourseId, 'student');
            }
            
            // If everything succeeded, commit the transaction
            DB::commit();
            
            // Log the successful provisioning
            $this->logActivity('provision_user_for_orientation', 'success', [
                'user_id' => $user->id,
                'email' => $user->email
            ], [
                'lms_user_id' => $lmsUserId,
                'user_created' => $userCreated,
                'enrolled_in_orientation' => $enrollmentResult
            ]);
            
            // Return the results
            return [
                'lms_user_id' => $lmsUserId,
                'user_created' => $userCreated,
                'enrolled_in_orientation' => $enrollmentResult,
                'lms_user_data' => $lmsUser
            ];
        } catch (Exception $e) {
            // If anything goes wrong, roll back the transaction
            DB::rollBack();
            
            // If it's already an IntegrationException, rethrow it
            if ($e instanceof IntegrationException) {
                $this->logActivity('provision_user_for_orientation', 'error', [
                    'user_id' => $user->id,
                    'email' => $user->email
                ], $e->getResponseData(), $e->getMessage());
                
                throw $e;
            }
            
            // Otherwise, wrap it in an IntegrationException
            $message = 'Failed to provision user for orientation: ' . $e->getMessage();
            Log::error($message, ['exception' => $e]);
            
            throw IntegrationException::createFromConfigurationError(
                $message,
                'lms',
                ['user_id' => $user->id, 'email' => $user->email],
                'PROVISIONING_ERROR'
            );
        }
    }

    /**
     * Synchronize multiple users with the LMS.
     *
     * @param array $users
     * @param array $options
     * @return array
     * @throws IntegrationException
     */
    public function syncUsers(array $users, array $options = []): array
    {
        // Set default options
        $options = array_merge([
            'enrollInOrientation' => true,
            'updateExisting' => true,
            'batchSize' => 50,
            'skipErrors' => false
        ], $options);
        
        // Initialize result counters
        $results = [
            'total' => count($users),
            'processed' => 0,
            'created' => 0,
            'updated' => 0,
            'enrolled' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        // Process users in batches to avoid overwhelming the LMS API
        $batches = array_chunk($users, $options['batchSize']);
        
        foreach ($batches as $batch) {
            foreach ($batch as $user) {
                try {
                    // If user is provided as an ID, load the user model
                    if (is_numeric($user)) {
                        $user = User::with('profile')->find($user);
                        if (!$user) {
                            $results['failed']++;
                            if (!$options['skipErrors']) {
                                $results['errors'][] = "User with ID {$user} not found";
                            }
                            continue;
                        }
                    }
                    
                    // Check if the user already exists in the LMS by email
                    $existingUser = $this->findUserByEmail($user->email);
                    
                    if (!$existingUser) {
                        // Create new user in LMS
                        $lmsUser = $this->createUser($user);
                        $results['created']++;
                    } else if ($options['updateExisting']) {
                        // Update existing user in LMS
                        $lmsUser = $this->updateUser($user, $existingUser['id']);
                        $results['updated']++;
                    } else {
                        // Skip update but use existing user data
                        $lmsUser = $existingUser;
                    }
                    
                    // Get the LMS user ID
                    $lmsUserId = $lmsUser['id'] ?? null;
                    
                    if ($lmsUserId && $options['enrollInOrientation'] && !empty($this->orientationCourseId)) {
                        // Enroll the user in the orientation course
                        $this->enrollUserInCourse($lmsUserId, $this->orientationCourseId, 'student');
                        $results['enrolled']++;
                    }
                    
                    $results['processed']++;
                } catch (Exception $e) {
                    $results['failed']++;
                    
                    $errorMessage = $e instanceof IntegrationException 
                        ? $e->getMessage() 
                        : 'Unexpected error: ' . $e->getMessage();
                    
                    if (!$options['skipErrors']) {
                        $results['errors'][] = "Failed to sync user {$user->id} ({$user->email}): {$errorMessage}";
                    }
                    
                    // Log the error
                    $this->logActivity('sync_users', 'error', [
                        'user_id' => $user->id,
                        'email' => $user->email
                    ], $e instanceof IntegrationException ? $e->getResponseData() : null, $errorMessage);
                    
                    // If not skipping errors, throw the exception
                    if (!$options['skipErrors']) {
                        throw $e;
                    }
                }
            }
        }
        
        // Log the sync summary
        $this->logActivity('sync_users', 'success', [
            'total_users' => $results['total'],
            'options' => $options
        ], [
            'processed' => $results['processed'],
            'created' => $results['created'],
            'updated' => $results['updated'],
            'enrolled' => $results['enrolled'],
            'failed' => $results['failed']
        ]);
        
        return $results;
    }

    /**
     * Generate a single sign-on URL for direct LMS access.
     *
     * @param User $user
     * @param string|null $destination
     * @return string
     * @throws IntegrationException
     */
    public function generateSsoUrl(User $user, ?string $destination = null): string
    {
        // Check if SSO is configured and enabled
        if (!isset($this->ssoConfig['enabled']) || !$this->ssoConfig['enabled']) {
            throw IntegrationException::createFromConfigurationError(
                'SSO is not enabled in the LMS integration configuration',
                'lms',
                ['sso_config' => $this->ssoConfig],
                'SSO_NOT_ENABLED'
            );
        }
        
        try {
            // First, ensure the user exists in the LMS
            $lmsUser = $this->findUserByEmail($user->email);
            
            if (!$lmsUser) {
                // If the user doesn't exist, create them
                $lmsUser = $this->createUser($user);
            }
            
            $lmsUserId = $lmsUser['id'] ?? null;
            
            if (!$lmsUserId) {
                throw new IntegrationException("Failed to get LMS user ID for SSO");
            }
            
            // Generate the SSO URL based on the configured method
            if ($this->ssoConfig['method'] === 'oauth') {
                // OAuth-based SSO
                $params = [
                    'client_id' => $this->ssoConfig['client_id'],
                    'response_type' => 'code',
                    'redirect_uri' => $this->ssoConfig['redirect_uri'] ?? config('app.url') . '/auth/lms/callback',
                    'scope' => $this->ssoConfig['api_scope'] ?? 'read',
                    'state' => encrypt(json_encode([
                        'user_id' => $user->id,
                        'timestamp' => time()
                    ])),
                    'login_hint' => $user->email
                ];
                
                if ($destination) {
                    $params['destination'] = $destination;
                }
                
                $url = $this->ssoConfig['auth_url'] . '?' . http_build_query($params);
                
                // Log the SSO request
                $this->logActivity('generate_sso_url', 'success', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'method' => 'oauth'
                ], [
                    'lms_user_id' => $lmsUserId,
                    'destination' => $destination
                ]);
                
                return $url;
            } elseif ($this->ssoConfig['method'] === 'saml') {
                // SAML-based SSO
                // This would typically use a SAML library like OneLogin\SAML2
                // For implementation purposes, we'll return a placeholder URL
                // In a real implementation, this would generate a SAML request
                
                $samlUrl = $this->ssoConfig['saml_idp_sso_url'] . '?' . http_build_query([
                    'user' => $user->email,
                    'destination' => $destination,
                    'token' => hash_hmac('sha256', $user->email, $this->apiSecret)
                ]);
                
                // Log the SSO request
                $this->logActivity('generate_sso_url', 'success', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'method' => 'saml'
                ], [
                    'lms_user_id' => $lmsUserId,
                    'destination' => $destination
                ]);
                
                return $samlUrl;
            } elseif ($this->ssoConfig['method'] === 'token') {
                // Token-based SSO (custom implementation for some LMS systems)
                $token = [
                    'user_id' => $lmsUserId,
                    'email' => $user->email,
                    'timestamp' => time(),
                    'expires' => time() + 300 // 5 minute token
                ];
                
                $signature = hash_hmac('sha256', json_encode($token), $this->apiSecret);
                $encodedToken = base64_encode(json_encode($token));
                
                $params = [
                    'token' => $encodedToken,
                    'signature' => $signature
                ];
                
                if ($destination) {
                    $params['destination'] = $destination;
                }
                
                $url = $this->apiUrl . $this->endpoints['sso'] . '?' . http_build_query($params);
                
                // Log the SSO request
                $this->logActivity('generate_sso_url', 'success', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'method' => 'token'
                ], [
                    'lms_user_id' => $lmsUserId,
                    'destination' => $destination
                ]);
                
                return $url;
            } else {
                throw IntegrationException::createFromConfigurationError(
                    'Unsupported SSO method: ' . $this->ssoConfig['method'],
                    'lms',
                    ['sso_config' => $this->ssoConfig],
                    'UNSUPPORTED_SSO_METHOD'
                );
            }
        } catch (Exception $e) {
            // If it's already an IntegrationException, rethrow it
            if ($e instanceof IntegrationException) {
                $this->logActivity('generate_sso_url', 'error', [
                    'user_id' => $user->id,
                    'email' => $user->email
                ], $e->getResponseData(), $e->getMessage());
                
                throw $e;
            }
            
            // Otherwise, wrap it in an IntegrationException
            $message = 'Failed to generate SSO URL: ' . $e->getMessage();
            Log::error($message, ['exception' => $e]);
            
            throw IntegrationException::createFromConfigurationError(
                $message,
                'lms',
                ['user_id' => $user->id, 'email' => $user->email],
                'SSO_GENERATION_ERROR'
            );
        }
    }

    /**
     * Validate an incoming SSO request from the LMS.
     *
     * @param array $request
     * @return bool
     * @throws IntegrationException
     */
    public function validateSsoRequest(array $request): bool
    {
        // Check if SSO is configured and enabled
        if (!isset($this->ssoConfig['enabled']) || !$this->ssoConfig['enabled']) {
            throw IntegrationException::createFromConfigurationError(
                'SSO is not enabled in the LMS integration configuration',
                'lms',
                ['sso_config' => $this->ssoConfig],
                'SSO_NOT_ENABLED'
            );
        }
        
        try {
            // Validate based on the configured SSO method
            if ($this->ssoConfig['method'] === 'oauth') {
                // OAuth validation
                if (!isset($request['code'])) {
                    throw new IntegrationException("Missing authorization code in OAuth callback");
                }
                
                if (isset($request['state'])) {
                    $state = json_decode(decrypt($request['state']), true);
                    
                    // Verify the state contains a user ID and timestamp
                    if (!isset($state['user_id']) || !isset($state['timestamp'])) {
                        throw new IntegrationException("Invalid state parameter in OAuth callback");
                    }
                    
                    // Verify the timestamp is not too old (prevent replay attacks)
                    if (time() - $state['timestamp'] > 3600) { // 1 hour expiration
                        throw new IntegrationException("Expired state parameter in OAuth callback");
                    }
                } else {
                    throw new IntegrationException("Missing state parameter in OAuth callback");
                }
                
                // Log the successful validation
                $this->logActivity('validate_sso_request', 'success', [
                    'method' => 'oauth'
                ], [
                    'has_code' => isset($request['code']),
                    'has_state' => isset($request['state'])
                ]);
                
                return true;
            } elseif ($this->ssoConfig['method'] === 'saml') {
                // SAML validation
                // This would typically use a SAML library like OneLogin\SAML2
                // For implementation purposes, we'll perform a simplified validation
                
                if (!isset($request['SAMLResponse'])) {
                    throw new IntegrationException("Missing SAMLResponse parameter in SAML callback");
                }
                
                // In a real implementation, this would validate the SAML response
                // For now, we'll just log the activity and return true
                
                // Log the successful validation
                $this->logActivity('validate_sso_request', 'success', [
                    'method' => 'saml'
                ], [
                    'has_saml_response' => isset($request['SAMLResponse'])
                ]);
                
                return true;
            } elseif ($this->ssoConfig['method'] === 'token') {
                // Token-based validation
                if (!isset($request['token']) || !isset($request['signature'])) {
                    throw new IntegrationException("Missing token or signature in token callback");
                }
                
                $token = json_decode(base64_decode($request['token']), true);
                $signature = $request['signature'];
                
                // Verify the token structure
                if (!isset($token['email']) || !isset($token['timestamp']) || !isset($token['expires'])) {
                    throw new IntegrationException("Invalid token structure in token callback");
                }
                
                // Verify the token is not expired
                if (time() > $token['expires']) {
                    throw new IntegrationException("Expired token in token callback");
                }
                
                // Verify the signature
                $expectedSignature = hash_hmac('sha256', json_encode($token), $this->apiSecret);
                if (!hash_equals($expectedSignature, $signature)) {
                    throw new IntegrationException("Invalid signature in token callback");
                }
                
                // Log the successful validation
                $this->logActivity('validate_sso_request', 'success', [
                    'method' => 'token'
                ], [
                    'email' => $token['email'],
                    'timestamp' => $token['timestamp']
                ]);
                
                return true;
            } else {
                throw IntegrationException::createFromConfigurationError(
                    'Unsupported SSO method: ' . $this->ssoConfig['method'],
                    'lms',
                    ['sso_config' => $this->ssoConfig],
                    'UNSUPPORTED_SSO_METHOD'
                );
            }
        } catch (Exception $e) {
            // If it's already an IntegrationException, rethrow it
            if ($e instanceof IntegrationException) {
                $this->logActivity('validate_sso_request', 'error', [
                    'method' => $this->ssoConfig['method'] ?? 'unknown'
                ], $e->getResponseData(), $e->getMessage());
                
                throw $e;
            }
            
            // Otherwise, wrap it in an IntegrationException
            $message = 'Failed to validate SSO request: ' . $e->getMessage();
            Log::error($message, ['exception' => $e]);
            
            throw IntegrationException::createFromConfigurationError(
                $message,
                'lms',
                ['request' => $request],
                'SSO_VALIDATION_ERROR'
            );
        }
    }

    /**
     * Process incoming webhook notifications from LMS.
     *
     * @param array $payload
     * @return bool
     * @throws IntegrationException
     */
    public function handleWebhook(array $payload): bool
    {
        try {
            // Validate the webhook signature if provided
            if (isset($payload['signature']) && isset($payload['timestamp'])) {
                $signature = $payload['signature'];
                $timestamp = $payload['timestamp'];
                
                // Remove signature from payload for verification
                $payloadForVerification = $payload;
                unset($payloadForVerification['signature']);
                
                // Verify the signature
                $expectedSignature = hash_hmac('sha256', json_encode($payloadForVerification) . $timestamp, $this->apiSecret);
                if (!hash_equals($expectedSignature, $signature)) {
                    throw new IntegrationException("Invalid webhook signature");
                }
            }
            
            // Determine the webhook event type
            $eventType = $payload['event_type'] ?? $payload['event'] ?? null;
            
            if (!$eventType) {
                throw new IntegrationException("Missing event type in webhook payload");
            }
            
            // Process the webhook based on the event type
            switch ($eventType) {
                case 'user.created':
                case 'user.updated':
                    // Handle user creation/update events
                    $userData = $payload['user'] ?? $payload['data'] ?? null;
                    if (!$userData) {
                        throw new IntegrationException("Missing user data in webhook payload");
                    }
                    
                    // Process user data as needed
                    // This might involve updating our local user record
                    
                    break;
                
                case 'course_enrollment.created':
                case 'enrollment.created':
                    // Handle enrollment creation events
                    $enrollmentData = $payload['enrollment'] ?? $payload['data'] ?? null;
                    if (!$enrollmentData) {
                        throw new IntegrationException("Missing enrollment data in webhook payload");
                    }
                    
                    // Process enrollment data as needed
                    
                    break;
                
                case 'course_enrollment.deleted':
                case 'enrollment.deleted':
                    // Handle enrollment deletion events
                    $enrollmentData = $payload['enrollment'] ?? $payload['data'] ?? null;
                    if (!$enrollmentData) {
                        throw new IntegrationException("Missing enrollment data in webhook payload");
                    }
                    
                    // Process enrollment deletion as needed
                    
                    break;
                
                case 'course.completed':
                case 'module.completed':
                    // Handle course/module completion events
                    $completionData = $payload['completion'] ?? $payload['data'] ?? null;
                    if (!$completionData) {
                        throw new IntegrationException("Missing completion data in webhook payload");
                    }
                    
                    // Process completion data as needed
                    
                    break;
                
                default:
                    // Log unknown event types but don't fail
                    $this->logActivity('handle_webhook', 'warning', [
                        'event_type' => $eventType
                    ], $payload, "Unknown webhook event type: {$eventType}");
                    
                    return true;
            }
            
            // Log the successful webhook processing
            $this->logActivity('handle_webhook', 'success', [
                'event_type' => $eventType
            ], $payload);
            
            return true;
        } catch (Exception $e) {
            // If it's already an IntegrationException, rethrow it
            if ($e instanceof IntegrationException) {
                $this->logActivity('handle_webhook', 'error', [
                    'event_type' => $payload['event_type'] ?? $payload['event'] ?? 'unknown'
                ], $payload, $e->getMessage());
                
                throw $e;
            }
            
            // Otherwise, wrap it in an IntegrationException
            $message = 'Failed to process webhook: ' . $e->getMessage();
            Log::error($message, ['exception' => $e, 'payload' => $payload]);
            
            throw IntegrationException::createFromConfigurationError(
                $message,
                'lms',
                ['payload' => $payload],
                'WEBHOOK_PROCESSING_ERROR'
            );
        }
    }

    /**
     * Send an API request to the LMS with error handling and retries.
     *
     * @param string $method
     * @param string $endpoint
     * @param array $data
     * @param array $headers
     * @return array
     * @throws IntegrationException
     */
    public function sendApiRequest(string $method, string $endpoint, array $data = [], array $headers = []): array
    {
        // Ensure the endpoint has a leading slash
        if (!empty($endpoint) && $endpoint[0] !== '/') {
            $endpoint = '/' . $endpoint;
        }
        
        // Prepare the request URL
        $url = $this->apiUrl . $endpoint;
        
        // Prepare default headers
        $defaultHeaders = [
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];
        
        // Merge default headers with provided headers
        $headers = array_merge($defaultHeaders, $headers);
        
        // Initialize retry counter
        $attempt = 0;
        
        // Initialize exception to capture the last error
        $lastException = null;
        
        // Retry loop
        while ($attempt < $this->retryAttempts) {
            try {
                $attempt++;
                
                // Create the HTTP request
                $request = Http::withHeaders($headers);
                
                // Set timeout
                $request->timeout($this->timeout);
                
                // Send the request based on the method
                $response = match (strtoupper($method)) {
                    'GET' => $request->get($url, $data),
                    'POST' => $request->post($url, $data),
                    'PUT' => $request->put($url, $data),
                    'PATCH' => $request->patch($url, $data),
                    'DELETE' => $request->delete($url, $data),
                    default => throw new IntegrationException("Unsupported HTTP method: {$method}")
                };
                
                // Check if the request was successful
                if ($response->successful()) {
                    // Return the response data
                    return $response->json() ?: [];
                }
                
                // If we got here, the request failed
                $statusCode = $response->status();
                $responseData = $response->json() ?: [];
                
                // Determine if this error is retryable
                $retryable = in_array($statusCode, [429, 500, 502, 503, 504]);
                
                // Build a descriptive error message
                $errorMessage = "LMS API request failed with status code {$statusCode}";
                
                if (isset($responseData['error']) && is_string($responseData['error'])) {
                    $errorMessage .= ": {$responseData['error']}";
                } elseif (isset($responseData['message']) && is_string($responseData['message'])) {
                    $errorMessage .= ": {$responseData['message']}";
                } elseif (isset($responseData['error_description']) && is_string($responseData['error_description'])) {
                    $errorMessage .= ": {$responseData['error_description']}";
                }
                
                // Determine the error code
                $errorCode = match ($statusCode) {
                    400 => 'BAD_REQUEST',
                    401 => 'UNAUTHORIZED',
                    403 => 'FORBIDDEN',
                    404 => 'RESOURCE_NOT_FOUND',
                    409 => 'CONFLICT',
                    422 => 'VALIDATION_ERROR',
                    429 => 'RATE_LIMITED',
                    500, 502, 503, 504 => 'SERVER_ERROR',
                    default => 'API_ERROR'
                };
                
                // Create an IntegrationException with the appropriate error information
                $exception = IntegrationException::createFromApiError(
                    $errorMessage,
                    'lms',
                    "{$method} {$endpoint}",
                    $data,
                    $responseData,
                    $errorCode,
                    $statusCode
                );
                
                // If the error is retryable and we haven't exceeded retry attempts, retry
                if ($retryable && $attempt < $this->retryAttempts) {
                    // Calculate backoff delay
                    $delay = min(pow(2, $attempt), 30);
                    
                    // If rate limited and response includes a Retry-After header, use that
                    if ($statusCode === 429 && $response->header('Retry-After')) {
                        $delay = max((int) $response->header('Retry-After'), $delay);
                    }
                    
                    // Log retry attempt
                    Log::warning("LMS API request failed (attempt {$attempt}/{$this->retryAttempts}). Retrying in {$delay} seconds...", [
                        'url' => $url,
                        'method' => $method,
                        'status_code' => $statusCode,
                        'response' => $responseData
                    ]);
                    
                    // Wait before retrying
                    sleep($delay);
                    
                    // Save the exception in case all retries fail
                    $lastException = $exception;
                    
                    // Continue to next retry attempt
                    continue;
                }
                
                // If we got here, the error is not retryable or we've exhausted retries
                throw $exception;
            } catch (IntegrationException $e) {
                // Rethrow IntegrationExceptions directly
                throw $e;
            } catch (Exception $e) {
                // Capture the last exception
                $lastException = $e;
                
                // Determine if this error is retryable
                $retryable = $e instanceof \Illuminate\Http\Client\ConnectionException || 
                             $e instanceof \Illuminate\Http\Client\RequestException;
                
                // If retryable and we haven't exceeded retry attempts, retry
                if ($retryable && $attempt < $this->retryAttempts) {
                    // Calculate backoff delay
                    $delay = min(pow(2, $attempt), 30);
                    
                    // Log retry attempt
                    Log::warning("LMS API request failed with exception (attempt {$attempt}/{$this->retryAttempts}). Retrying in {$delay} seconds...", [
                        'url' => $url,
                        'method' => $method,
                        'exception' => $e->getMessage()
                    ]);
                    
                    // Wait before retrying
                    sleep($delay);
                    
                    // Continue to next retry attempt
                    continue;
                }
                
                // If we got here, the error is not retryable or we've exhausted retries
                throw IntegrationException::createFromConnectionError(
                    "LMS API request failed with exception: {$e->getMessage()}",
                    'lms',
                    "{$method} {$endpoint}",
                    $data,
                    'CONNECTION_ERROR',
                    0,
                    $e
                );
            }
        }
        
        // If we got here, all retry attempts failed
        if ($lastException) {
            // If the last exception was an IntegrationException, rethrow it
            if ($lastException instanceof IntegrationException) {
                throw $lastException;
            }
            
            // Otherwise, wrap it in an IntegrationException
            throw IntegrationException::createFromConnectionError(
                "LMS API request failed after {$this->retryAttempts} attempts: {$lastException->getMessage()}",
                'lms',
                "{$method} {$endpoint}",
                $data,
                'MAX_RETRIES_EXCEEDED',
                0,
                $lastException
            );
        }
        
        // This should never be reached, but just in case
        throw IntegrationException::createFromConnectionError(
            "LMS API request failed due to an unknown error",
            'lms',
            "{$method} {$endpoint}",
            $data,
            'UNKNOWN_ERROR'
        );
    }

    /**
     * Check if the LMS integration is properly configured.
     *
     * @return bool
     */
    public function isConfigured(): bool
    {
        // Check if integration has been initialized
        if (!$this->integration) {
            return false;
        }
        
        // Check if the integration is active
        if (!$this->integration->isActive()) {
            return false;
        }
        
        // Check if all required configuration values exist
        if (empty($this->apiUrl) || empty($this->apiKey)) {
            return false;
        }
        
        // Check if endpoints are configured
        if (empty($this->endpoints) || !isset($this->endpoints['users']) || !isset($this->endpoints['courses'])) {
            return false;
        }
        
        return true;
    }

    /**
     * Test the connection to the LMS API.
     *
     * @return bool
     */
    public function testConnection(): bool
    {
        try {
            // Try a simple API request, like getting a list of courses with limit=1
            $response = $this->sendApiRequest('GET', $this->endpoints['courses'], ['limit' => 1]);
            
            // Log the successful test
            $this->logActivity('test_connection', 'success', [], [
                'note' => 'Connection test successful'
            ]);
            
            return true;
        } catch (Exception $e) {
            // Log the failed test
            $errorMessage = $e instanceof IntegrationException 
                ? $e->getMessage() 
                : 'Unexpected error: ' . $e->getMessage();
            
            $this->logActivity('test_connection', 'error', [], [
                'note' => 'Connection test failed'
            ], $errorMessage);
            
            return false;
        }
    }

    /**
     * Log an integration activity.
     *
     * @param string $operation
     * @param string $status
     * @param array|null $requestData
     * @param array|null $responseData
     * @param string|null $errorMessage
     * @return IntegrationLog
     */
    public function logActivity(
        string $operation,
        string $status,
        ?array $requestData = null,
        ?array $responseData = null,
        ?string $errorMessage = null
    ): IntegrationLog {
        // Sanitize request and response data to remove sensitive information
        $requestData = $this->sanitizeLogData($requestData);
        $responseData = $this->sanitizeLogData($responseData);
        
        // Use the Integration model to log the activity
        if ($this->integration) {
            return $this->integration->logActivity($operation, $status, $requestData, $responseData, $errorMessage);
        } else {
            // If no integration is set up, create a log record directly
            $log = new IntegrationLog([
                'operation' => $operation,
                'status' => $status,
                'request_data' => $requestData,
                'response_data' => $responseData,
                'error_message' => $errorMessage,
            ]);
            
            $log->save();
            return $log;
        }
    }

    /**
     * Map local data fields to LMS field names.
     *
     * @param array $data
     * @return array
     */
    public function mapDataToLMS(array $data): array
    {
        // If no mappings defined, return data as is
        if (empty($this->mappings) || !isset($this->mappings['user'])) {
            return $data;
        }
        
        $mappedData = [];
        
        // Apply field mappings from local to LMS
        foreach ($data as $localField => $value) {
            // Find the corresponding LMS field name
            $lmsField = array_search($localField, $this->mappings['user']);
            
            // If a mapping exists, use the LMS field name, otherwise keep the local field name
            $mappedData[$lmsField !== false ? $lmsField : $localField] = $value;
        }
        
        return $mappedData;
    }

    /**
     * Map LMS data fields to local field names.
     *
     * @param array $data
     * @return array
     */
    public function mapDataFromLMS(array $data): array
    {
        // If no mappings defined, return data as is
        if (empty($this->mappings) || !isset($this->mappings['user'])) {
            return $data;
        }
        
        $mappedData = [];
        
        // Apply field mappings from LMS to local
        foreach ($data as $lmsField => $value) {
            // Find the corresponding local field name
            $localField = $this->mappings['user'][$lmsField] ?? null;
            
            // If a mapping exists, use the local field name, otherwise keep the LMS field name
            $mappedData[$localField ?: $lmsField] = $value;
        }
        
        return $mappedData;
    }

    /**
     * Sanitize log data to remove sensitive information.
     *
     * @param array|null $data
     * @return array|null
     */
    private function sanitizeLogData(?array $data): ?array
    {
        if (!$data) {
            return null;
        }
        
        $result = [];
        
        // Define sensitive field names to be redacted
        $sensitiveFields = [
            'password', 'secret', 'token', 'key', 'api_key', 'apikey', 'api_secret', 'apisecret',
            'access_token', 'refresh_token', 'private_key', 'client_secret', 'authorization'
        ];
        
        // Recursively process the data
        foreach ($data as $key => $value) {
            // Check if the key contains a sensitive field name
            $isSensitive = false;
            foreach ($sensitiveFields as $sensitiveField) {
                if (stripos($key, $sensitiveField) !== false) {
                    $isSensitive = true;
                    break;
                }
            }
            
            if ($isSensitive) {
                // Redact sensitive values
                $result[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                // Recursively process nested arrays
                $result[$key] = $this->sanitizeLogData($value);
            } else {
                // Keep non-sensitive values as is
                $result[$key] = $value;
            }
        }
        
        return $result;
    }
}