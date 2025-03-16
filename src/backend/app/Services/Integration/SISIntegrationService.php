<?php

namespace App\Services\Integration;

use App\Models\Integration;
use App\Models\IntegrationLog;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Application;
use App\Exceptions\IntegrationException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Exception;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SISIntegrationService
{
    /**
     * The integration model instance.
     *
     * @var Integration
     */
    protected $integration;

    /**
     * The integration configuration.
     *
     * @var array
     */
    protected $config;

    /**
     * The SIS API URL.
     *
     * @var string
     */
    protected $apiUrl;

    /**
     * The SIS API key.
     *
     * @var string
     */
    protected $apiKey;

    /**
     * The SIS API secret.
     *
     * @var string
     */
    protected $apiSecret;

    /**
     * The API request timeout in seconds.
     *
     * @var int
     */
    protected $timeout;

    /**
     * The number of retry attempts for failed requests.
     *
     * @var int
     */
    protected $retryAttempts;

    /**
     * The delay between retry attempts in seconds.
     *
     * @var int
     */
    protected $retryDelay;

    /**
     * The SIS API endpoints.
     *
     * @var array
     */
    protected $endpoints;

    /**
     * The field mappings between local and SIS fields.
     *
     * @var array
     */
    protected $fieldMappings;

    /**
     * The SIS provider name.
     *
     * @var string
     */
    protected $provider;

    /**
     * Whether the integration is enabled.
     *
     * @var bool
     */
    protected $enabled = false;

    /**
     * Create a new SIS integration service instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->initialize();
    }

    /**
     * Initialize the SIS integration with configuration.
     *
     * @return bool
     */
    public function initialize()
    {
        try {
            // Load configuration from config file
            $config = Config::get('integrations.sis', []);
            
            // Find active SIS integration from database
            $this->integration = Integration::scopeByType('sis')->active()->first();
            
            if (!$this->integration) {
                Log::warning('No active SIS integration found');
                return false;
            }
            
            // Merge config with database configuration
            $this->config = array_merge($config, $this->integration->getConfigValue('settings', []));
            
            // Set API credentials and configuration properties
            $this->apiUrl = $this->config['api_url'] ?? null;
            $this->apiKey = $this->config['api_key'] ?? null;
            $this->apiSecret = $this->config['api_secret'] ?? null;
            $this->timeout = $this->config['timeout'] ?? 30;
            $this->retryAttempts = $this->config['retry_attempts'] ?? 3;
            $this->retryDelay = $this->config['retry_delay'] ?? 2;
            $this->endpoints = $this->config['endpoints'] ?? [];
            $this->fieldMappings = $this->config['field_mappings'] ?? [];
            $this->provider = $this->config['provider'] ?? 'generic';
            $this->enabled = $this->config['enabled'] ?? false;
            
            // Validate required configuration
            if (!$this->apiUrl || !$this->apiKey) {
                Log::error('SIS integration configuration is incomplete');
                return false;
            }
            
            return true;
        } catch (Exception $e) {
            Log::error('Failed to initialize SIS integration: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Create a new student record in the SIS.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\Application  $application
     * @return array
     * @throws \App\Exceptions\IntegrationException
     */
    public function createStudent(User $user, Application $application)
    {
        try {
            // Prepare student data from user model and application
            $studentData = $this->prepareStudentData($user, $application);
            
            // Map fields to SIS format
            $mappedData = $this->mapDataToSIS($studentData);
            
            // Send API request to create student in SIS
            $response = $this->sendApiRequest(
                'POST',
                $this->endpoints['students'] ?? 'students',
                $mappedData
            );
            
            // Log the successful creation
            $this->integration->logActivity(
                'create_student', 
                'success', 
                $mappedData, 
                $response
            );
            
            // Return response with SIS student ID
            return [
                'sis_student_id' => $response['id'] ?? $response['student_id'] ?? null,
                'success' => true,
                'data' => $response
            ];
        } catch (IntegrationException $e) {
            // Log the error
            $this->integration->logActivity(
                'create_student', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Log the unexpected error
            $this->integration->logActivity(
                'create_student', 
                'error', 
                ['user_id' => $user->id, 'application_id' => $application->id], 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromConnectionError(
                'Failed to create student in SIS: ' . $e->getMessage(),
                $this->provider,
                'create_student',
                ['user_id' => $user->id, 'application_id' => $application->id]
            );
        }
    }

    /**
     * Update an existing student record in the SIS.
     *
     * @param  \App\Models\User  $user
     * @param  string  $sisStudentId
     * @param  array  $data
     * @return array
     * @throws \App\Exceptions\IntegrationException
     */
    public function updateStudent(User $user, string $sisStudentId, array $data = [])
    {
        try {
            // Prepare student data from user model and additional data
            $studentData = $this->prepareStudentData($user, null, $data);
            
            // Map fields to SIS format
            $mappedData = $this->mapDataToSIS($studentData);
            
            // Send API request to update student in SIS
            $response = $this->sendApiRequest(
                'PUT',
                $this->endpoints['students'] . '/' . $sisStudentId,
                $mappedData
            );
            
            // Log the successful update
            $this->integration->logActivity(
                'update_student', 
                'success', 
                $mappedData, 
                $response
            );
            
            // Return response
            return [
                'success' => true,
                'data' => $response
            ];
        } catch (IntegrationException $e) {
            // Log the error
            $this->integration->logActivity(
                'update_student', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Log the unexpected error
            $this->integration->logActivity(
                'update_student', 
                'error', 
                ['user_id' => $user->id, 'sis_student_id' => $sisStudentId], 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromConnectionError(
                'Failed to update student in SIS: ' . $e->getMessage(),
                $this->provider,
                'update_student',
                ['user_id' => $user->id, 'sis_student_id' => $sisStudentId]
            );
        }
    }

    /**
     * Get student information from the SIS.
     *
     * @param  string  $sisStudentId
     * @return array|null
     * @throws \App\Exceptions\IntegrationException
     */
    public function getStudent(string $sisStudentId)
    {
        try {
            // Send API request to get student from SIS
            $response = $this->sendApiRequest(
                'GET',
                $this->endpoints['students'] . '/' . $sisStudentId
            );
            
            // Map fields from SIS format to local format
            $mappedData = $this->mapDataFromSIS($response);
            
            // Log the successful retrieval
            $this->integration->logActivity(
                'get_student', 
                'success', 
                ['sis_student_id' => $sisStudentId], 
                $response
            );
            
            return $mappedData;
        } catch (IntegrationException $e) {
            // Log the error
            $this->integration->logActivity(
                'get_student', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // If the student doesn't exist, return null instead of throwing
            if (
                $e->getErrorCode() === 'RESOURCE_NOT_FOUND' || 
                ($e->getResponseData() && isset($e->getResponseData()['status']) && $e->getResponseData()['status'] === 404)
            ) {
                return null;
            }
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Log the unexpected error
            $this->integration->logActivity(
                'get_student', 
                'error', 
                ['sis_student_id' => $sisStudentId], 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromConnectionError(
                'Failed to get student from SIS: ' . $e->getMessage(),
                $this->provider,
                'get_student',
                ['sis_student_id' => $sisStudentId]
            );
        }
    }

    /**
     * Find a student in the SIS by email address.
     *
     * @param  string  $email
     * @return array|null
     * @throws \App\Exceptions\IntegrationException
     */
    public function findStudentByEmail(string $email)
    {
        try {
            // Send API request to search for student by email
            $response = $this->sendApiRequest(
                'GET',
                $this->endpoints['students_search'] ?? $this->endpoints['students'],
                ['email' => $email]
            );
            
            // If response is an array of students, find the matching one
            if (isset($response['data']) && is_array($response['data'])) {
                foreach ($response['data'] as $student) {
                    if (strtolower($student['email']) === strtolower($email)) {
                        // Map fields from SIS format to local format
                        $mappedData = $this->mapDataFromSIS($student);
                        
                        // Log the successful retrieval
                        $this->integration->logActivity(
                            'find_student_by_email', 
                            'success', 
                            ['email' => $email], 
                            $student
                        );
                        
                        return $mappedData;
                    }
                }
                return null;
            }
            
            // If response is a single student object
            if (isset($response['email']) && strtolower($response['email']) === strtolower($email)) {
                // Map fields from SIS format to local format
                $mappedData = $this->mapDataFromSIS($response);
                
                // Log the successful retrieval
                $this->integration->logActivity(
                    'find_student_by_email', 
                    'success', 
                    ['email' => $email], 
                    $response
                );
                
                return $mappedData;
            }
            
            // No matching student found
            return null;
        } catch (IntegrationException $e) {
            // Log the error
            $this->integration->logActivity(
                'find_student_by_email', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // If the search fails but it's because no matching students, return null
            if (
                $e->getErrorCode() === 'RESOURCE_NOT_FOUND' || 
                ($e->getResponseData() && isset($e->getResponseData()['status']) && $e->getResponseData()['status'] === 404)
            ) {
                return null;
            }
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Log the unexpected error
            $this->integration->logActivity(
                'find_student_by_email', 
                'error', 
                ['email' => $email], 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromConnectionError(
                'Failed to find student in SIS: ' . $e->getMessage(),
                $this->provider,
                'find_student_by_email',
                ['email' => $email]
            );
        }
    }

    /**
     * Update a student's enrollment status in the SIS.
     *
     * @param  string  $sisStudentId
     * @param  string  $status
     * @param  array  $additionalData
     * @return bool
     * @throws \App\Exceptions\IntegrationException
     */
    public function updateEnrollmentStatus(string $sisStudentId, string $status, array $additionalData = [])
    {
        try {
            // Prepare enrollment data
            $enrollmentData = array_merge([
                'status' => $status,
                'updated_at' => Carbon::now()->toIso8601String()
            ], $additionalData);
            
            // Send API request to update enrollment status in SIS
            $response = $this->sendApiRequest(
                'PUT',
                $this->endpoints['enrollment'] . '/' . $sisStudentId,
                $enrollmentData
            );
            
            // Log the successful update
            $this->integration->logActivity(
                'update_enrollment_status', 
                'success', 
                $enrollmentData, 
                $response
            );
            
            return true;
        } catch (IntegrationException $e) {
            // Log the error
            $this->integration->logActivity(
                'update_enrollment_status', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Log the unexpected error
            $this->integration->logActivity(
                'update_enrollment_status', 
                'error', 
                ['sis_student_id' => $sisStudentId, 'status' => $status], 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromConnectionError(
                'Failed to update enrollment status in SIS: ' . $e->getMessage(),
                $this->provider,
                'update_enrollment_status',
                ['sis_student_id' => $sisStudentId, 'status' => $status]
            );
        }
    }

    /**
     * Get a student's enrollment status from the SIS.
     *
     * @param  string  $sisStudentId
     * @return string|null
     * @throws \App\Exceptions\IntegrationException
     */
    public function getEnrollmentStatus(string $sisStudentId)
    {
        try {
            // Send API request to get enrollment status from SIS
            $response = $this->sendApiRequest(
                'GET',
                $this->endpoints['enrollment'] . '/' . $sisStudentId
            );
            
            // Log the successful retrieval
            $this->integration->logActivity(
                'get_enrollment_status', 
                'success', 
                ['sis_student_id' => $sisStudentId], 
                $response
            );
            
            return $response['status'] ?? null;
        } catch (IntegrationException $e) {
            // Log the error
            $this->integration->logActivity(
                'get_enrollment_status', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // If the enrollment doesn't exist, return null instead of throwing
            if (
                $e->getErrorCode() === 'RESOURCE_NOT_FOUND' || 
                ($e->getResponseData() && isset($e->getResponseData()['status']) && $e->getResponseData()['status'] === 404)
            ) {
                return null;
            }
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Log the unexpected error
            $this->integration->logActivity(
                'get_enrollment_status', 
                'error', 
                ['sis_student_id' => $sisStudentId], 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromConnectionError(
                'Failed to get enrollment status from SIS: ' . $e->getMessage(),
                $this->provider,
                'get_enrollment_status',
                ['sis_student_id' => $sisStudentId]
            );
        }
    }

    /**
     * Get a list of academic programs from the SIS.
     *
     * @param  array  $filters
     * @return array
     * @throws \App\Exceptions\IntegrationException
     */
    public function getAcademicPrograms(array $filters = [])
    {
        try {
            // Send API request to get academic programs from SIS
            $response = $this->sendApiRequest(
                'GET',
                $this->endpoints['programs'] ?? 'programs',
                $filters
            );
            
            // Map the program data to local format
            $programs = [];
            
            if (isset($response['data']) && is_array($response['data'])) {
                foreach ($response['data'] as $program) {
                    $programs[] = $this->mapDataFromSIS($program, 'program');
                }
            } elseif (is_array($response)) {
                foreach ($response as $program) {
                    $programs[] = $this->mapDataFromSIS($program, 'program');
                }
            }
            
            // Log the successful retrieval
            $this->integration->logActivity(
                'get_academic_programs', 
                'success', 
                $filters, 
                $response
            );
            
            return $programs;
        } catch (IntegrationException $e) {
            // Log the error
            $this->integration->logActivity(
                'get_academic_programs', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Log the unexpected error
            $this->integration->logActivity(
                'get_academic_programs', 
                'error', 
                $filters, 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromConnectionError(
                'Failed to get academic programs from SIS: ' . $e->getMessage(),
                $this->provider,
                'get_academic_programs',
                $filters
            );
        }
    }

    /**
     * Get a list of academic terms from the SIS.
     *
     * @param  array  $filters
     * @return array
     * @throws \App\Exceptions\IntegrationException
     */
    public function getAcademicTerms(array $filters = [])
    {
        try {
            // Send API request to get academic terms from SIS
            $response = $this->sendApiRequest(
                'GET',
                $this->endpoints['terms'] ?? 'terms',
                $filters
            );
            
            // Map the term data to local format
            $terms = [];
            
            if (isset($response['data']) && is_array($response['data'])) {
                foreach ($response['data'] as $term) {
                    $terms[] = $this->mapDataFromSIS($term, 'term');
                }
            } elseif (is_array($response)) {
                foreach ($response as $term) {
                    $terms[] = $this->mapDataFromSIS($term, 'term');
                }
            }
            
            // Log the successful retrieval
            $this->integration->logActivity(
                'get_academic_terms', 
                'success', 
                $filters, 
                $response
            );
            
            return $terms;
        } catch (IntegrationException $e) {
            // Log the error
            $this->integration->logActivity(
                'get_academic_terms', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Log the unexpected error
            $this->integration->logActivity(
                'get_academic_terms', 
                'error', 
                $filters, 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromConnectionError(
                'Failed to get academic terms from SIS: ' . $e->getMessage(),
                $this->provider,
                'get_academic_terms',
                $filters
            );
        }
    }

    /**
     * Synchronize student data between the admissions platform and SIS.
     *
     * @param  \App\Models\User  $user
     * @param  string|null  $sisStudentId
     * @param  array  $options
     * @return array
     * @throws \App\Exceptions\IntegrationException
     */
    public function syncStudentData(User $user, string $sisStudentId = null, array $options = [])
    {
        $result = [
            'success' => false,
            'created' => false,
            'updated' => false,
            'sis_student_id' => $sisStudentId
        ];
        
        try {
            // Start a database transaction
            DB::beginTransaction();
            
            // If no SIS student ID provided, check if student exists in SIS by email
            if (!$sisStudentId) {
                $existingStudent = $this->findStudentByEmail($user->email);
                
                if ($existingStudent && isset($existingStudent['id'])) {
                    $sisStudentId = $existingStudent['id'];
                    $result['sis_student_id'] = $sisStudentId;
                }
            }
            
            // Get the user's active application if needed for the sync
            $application = null;
            if (!empty($options['include_application']) && $options['include_application'] === true) {
                $application = $user->applications()
                    ->where('is_submitted', true)
                    ->orderBy('submitted_at', 'desc')
                    ->first();
            }
            
            // If we have a SIS student ID, update the existing student
            if ($sisStudentId) {
                $updateResponse = $this->updateStudent($user, $sisStudentId);
                $result['updated'] = $updateResponse['success'] ?? false;
            } else {
                // If no SIS student ID, create a new student
                if ($application) {
                    $createResponse = $this->createStudent($user, $application);
                    $result['sis_student_id'] = $createResponse['sis_student_id'] ?? null;
                    $result['created'] = true;
                } else {
                    throw IntegrationException::createFromDataSyncError(
                        'Cannot create student in SIS without an application',
                        $this->provider,
                        'student',
                        ['user_id' => $user->id]
                    );
                }
            }
            
            // Update enrollment status if needed
            if (!empty($options['enrollment_status']) && $result['sis_student_id']) {
                $this->updateEnrollmentStatus(
                    $result['sis_student_id'],
                    $options['enrollment_status'],
                    $options['enrollment_data'] ?? []
                );
            }
            
            // Log the synchronization
            $this->integration->logActivity(
                'sync_student_data', 
                'success', 
                [
                    'user_id' => $user->id,
                    'sis_student_id' => $result['sis_student_id'],
                    'options' => $options
                ], 
                $result
            );
            
            // Update the last sync time
            $this->integration->updateLastSyncTime();
            
            // Commit the transaction
            DB::commit();
            
            $result['success'] = true;
            return $result;
        } catch (IntegrationException $e) {
            // Rollback the transaction
            DB::rollBack();
            
            // Log the error
            $this->integration->logActivity(
                'sync_student_data', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            
            // Log the unexpected error
            $this->integration->logActivity(
                'sync_student_data', 
                'error', 
                [
                    'user_id' => $user->id,
                    'sis_student_id' => $sisStudentId,
                    'options' => $options
                ], 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromDataSyncError(
                'Failed to sync student data with SIS: ' . $e->getMessage(),
                $this->provider,
                'student',
                ['user_id' => $user->id, 'sis_student_id' => $sisStudentId]
            );
        }
    }

    /**
     * Synchronize multiple students with the SIS.
     *
     * @param  array  $users
     * @param  array  $options
     * @return array
     * @throws \App\Exceptions\IntegrationException
     */
    public function syncMultipleStudents(array $users, array $options = [])
    {
        $results = [
            'success' => true,
            'total' => count($users),
            'created' => 0,
            'updated' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        foreach ($users as $user) {
            try {
                // If user is an ID, load the user model
                if (is_numeric($user)) {
                    $user = User::find($user);
                    
                    if (!$user) {
                        $results['failed']++;
                        $results['errors'][] = "User with ID {$user} not found";
                        continue;
                    }
                }
                
                // Sync the student data
                $syncResult = $this->syncStudentData($user, null, $options);
                
                if ($syncResult['success']) {
                    if ($syncResult['created']) {
                        $results['created']++;
                    } elseif ($syncResult['updated']) {
                        $results['updated']++;
                    }
                } else {
                    $results['failed']++;
                    $results['errors'][] = "Failed to sync user {$user->id}";
                }
            } catch (Exception $e) {
                $results['failed']++;
                $results['errors'][] = "Error syncing user {$user->id}: " . $e->getMessage();
            }
        }
        
        // Log the batch synchronization
        $this->integration->logActivity(
            'sync_multiple_students', 
            $results['failed'] > 0 ? 'partial' : 'success', 
            ['user_count' => count($users), 'options' => $options], 
            $results
        );
        
        // Update the last sync time
        $this->integration->updateLastSyncTime();
        
        return $results;
    }

    /**
     * Import student data from SIS to the admissions platform.
     *
     * @param  string  $sisStudentId
     * @param  \App\Models\User|null  $user
     * @return array
     * @throws \App\Exceptions\IntegrationException
     */
    public function importStudentData(string $sisStudentId, User $user = null)
    {
        try {
            // Start a database transaction
            DB::beginTransaction();
            
            // Get the student data from SIS
            $studentData = $this->getStudent($sisStudentId);
            
            if (!$studentData) {
                throw IntegrationException::createFromDataSyncError(
                    'Student not found in SIS',
                    $this->provider,
                    'student',
                    ['sis_student_id' => $sisStudentId]
                );
            }
            
            // If a user object is provided, update it with SIS data
            if ($user) {
                // Update user email if different
                if (isset($studentData['email']) && $studentData['email'] !== $user->email) {
                    $user->email = $studentData['email'];
                    $user->save();
                }
                
                // Update user profile with SIS data
                $profile = $user->profile;
                
                if (!$profile) {
                    $profile = new UserProfile(['user_id' => $user->id]);
                }
                
                // Map profile fields
                if (isset($studentData['first_name'])) {
                    $profile->first_name = $studentData['first_name'];
                }
                
                if (isset($studentData['last_name'])) {
                    $profile->last_name = $studentData['last_name'];
                }
                
                if (isset($studentData['date_of_birth'])) {
                    $profile->date_of_birth = Carbon::parse($studentData['date_of_birth']);
                }
                
                if (isset($studentData['phone_number'])) {
                    $profile->phone_number = $studentData['phone_number'];
                }
                
                if (isset($studentData['address'])) {
                    $profile->address_line1 = $studentData['address']['line1'] ?? null;
                    $profile->address_line2 = $studentData['address']['line2'] ?? null;
                    $profile->city = $studentData['address']['city'] ?? null;
                    $profile->state = $studentData['address']['state'] ?? null;
                    $profile->postal_code = $studentData['address']['postal_code'] ?? null;
                    $profile->country = $studentData['address']['country'] ?? null;
                }
                
                $profile->save();
            } else {
                // Create a new user with SIS data
                $user = new User();
                $user->email = $studentData['email'] ?? '';
                $user->password = bcrypt(str_random(16)); // Random password, user will need to reset
                $user->is_active = true;
                $user->save();
                
                // Create user profile
                $profile = new UserProfile([
                    'user_id' => $user->id,
                    'first_name' => $studentData['first_name'] ?? '',
                    'last_name' => $studentData['last_name'] ?? '',
                ]);
                
                if (isset($studentData['date_of_birth'])) {
                    $profile->date_of_birth = Carbon::parse($studentData['date_of_birth']);
                }
                
                if (isset($studentData['phone_number'])) {
                    $profile->phone_number = $studentData['phone_number'];
                }
                
                if (isset($studentData['address'])) {
                    $profile->address_line1 = $studentData['address']['line1'] ?? null;
                    $profile->address_line2 = $studentData['address']['line2'] ?? null;
                    $profile->city = $studentData['address']['city'] ?? null;
                    $profile->state = $studentData['address']['state'] ?? null;
                    $profile->postal_code = $studentData['address']['postal_code'] ?? null;
                    $profile->country = $studentData['address']['country'] ?? null;
                }
                
                $profile->save();
                
                // Assign default role
                $user->assignRole('student');
            }
            
            // Log the import
            $this->integration->logActivity(
                'import_student_data', 
                'success', 
                ['sis_student_id' => $sisStudentId], 
                ['user_id' => $user->id]
            );
            
            // Commit the transaction
            DB::commit();
            
            // Return the imported student data
            return [
                'success' => true,
                'user_id' => $user->id,
                'sis_student_id' => $sisStudentId,
                'data' => $studentData
            ];
        } catch (IntegrationException $e) {
            // Rollback the transaction
            DB::rollBack();
            
            // Log the error
            $this->integration->logActivity(
                'import_student_data', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Rollback the transaction
            DB::rollBack();
            
            // Log the unexpected error
            $this->integration->logActivity(
                'import_student_data', 
                'error', 
                ['sis_student_id' => $sisStudentId], 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromDataSyncError(
                'Failed to import student data from SIS: ' . $e->getMessage(),
                $this->provider,
                'student',
                ['sis_student_id' => $sisStudentId]
            );
        }
    }

    /**
     * Process incoming webhook notifications from SIS.
     *
     * @param  array  $payload
     * @return bool
     * @throws \App\Exceptions\IntegrationException
     */
    public function handleWebhook(array $payload)
    {
        try {
            // Validate webhook signature or authentication if required
            if (isset($this->config['webhook_secret'])) {
                // Implementation of webhook signature verification would go here
                // This depends on how the SIS provider implements webhook security
            }
            
            // Determine webhook event type
            $eventType = $payload['event'] ?? $payload['type'] ?? 'unknown';
            
            // Log the webhook receipt
            $this->integration->logActivity(
                'webhook_received', 
                'info', 
                ['event_type' => $eventType], 
                $payload
            );
            
            // Process different event types
            switch ($eventType) {
                case 'student.updated':
                    // Process student update
                    $sisStudentId = $payload['student_id'] ?? $payload['id'] ?? null;
                    
                    if (!$sisStudentId) {
                        throw new Exception('Webhook payload missing student ID');
                    }
                    
                    // Get the student data from SIS
                    $studentData = $this->getStudent($sisStudentId);
                    
                    if (!$studentData) {
                        throw new Exception('Student not found in SIS');
                    }
                    
                    // Find the corresponding user in our system
                    $user = User::where('email', $studentData['email'] ?? '')->first();
                    
                    if ($user) {
                        // Update the user with SIS data
                        $this->importStudentData($sisStudentId, $user);
                    }
                    break;
                    
                case 'enrollment.updated':
                    // Process enrollment update
                    $sisStudentId = $payload['student_id'] ?? null;
                    $enrollmentStatus = $payload['status'] ?? null;
                    
                    if (!$sisStudentId || !$enrollmentStatus) {
                        throw new Exception('Webhook payload missing required enrollment data');
                    }
                    
                    // Get the student data from SIS
                    $studentData = $this->getStudent($sisStudentId);
                    
                    if (!$studentData) {
                        throw new Exception('Student not found in SIS');
                    }
                    
                    // Find the corresponding user in our system
                    $user = User::where('email', $studentData['email'] ?? '')->first();
                    
                    if ($user) {
                        // Update the user's application with new enrollment status
                        $application = $user->applications()
                            ->where('is_submitted', true)
                            ->orderBy('submitted_at', 'desc')
                            ->first();
                            
                        if ($application) {
                            // Logic to update application status based on enrollment status
                            // This would involve mapping SIS enrollment statuses to application statuses
                        }
                    }
                    break;
                    
                // Add other event types as needed
                    
                default:
                    // Log unknown event type but don't treat as error
                    Log::info('Received unknown webhook event type: ' . $eventType);
                    break;
            }
            
            // Log the successful processing
            $this->integration->logActivity(
                'webhook_processed', 
                'success', 
                ['event_type' => $eventType], 
                $payload
            );
            
            return true;
        } catch (IntegrationException $e) {
            // Log the error
            $this->integration->logActivity(
                'webhook_processed', 
                'error', 
                $e->getRequestData(), 
                $e->getResponseData(),
                $e->getMessage()
            );
            
            // Re-throw the exception
            throw $e;
        } catch (Exception $e) {
            // Log the unexpected error
            $this->integration->logActivity(
                'webhook_processed', 
                'error', 
                ['payload' => $payload], 
                null,
                $e->getMessage()
            );
            
            // Convert to integration exception and throw
            throw IntegrationException::createFromDataSyncError(
                'Failed to process SIS webhook: ' . $e->getMessage(),
                $this->provider,
                'webhook',
                ['event_type' => $eventType ?? 'unknown']
            );
        }
    }

    /**
     * Send an API request to the SIS with error handling and retries.
     *
     * @param  string  $method
     * @param  string  $endpoint
     * @param  array  $data
     * @param  array  $headers
     * @return array
     * @throws \App\Exceptions\IntegrationException
     */
    public function sendApiRequest(string $method, string $endpoint, array $data = [], array $headers = [])
    {
        // Check if integration is enabled
        if (!$this->enabled) {
            throw IntegrationException::createFromConfigurationError(
                'SIS integration is disabled',
                $this->provider
            );
        }
        
        // Prepare full API URL
        $url = rtrim($this->apiUrl, '/') . '/' . ltrim($endpoint, '/');
        
        // Set common headers
        $defaultHeaders = [
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];
        
        $headers = array_merge($defaultHeaders, $headers);
        
        // Initialize retry counter
        $attempts = 0;
        $maxAttempts = $this->retryAttempts;
        
        do {
            $attempts++;
            $retry = false;
            
            try {
                // Send the HTTP request
                $response = Http::withHeaders($headers)
                    ->timeout($this->timeout);
                    
                // Execute the appropriate HTTP method
                if ($method === 'GET') {
                    $response = $response->get($url, $data);
                } elseif ($method === 'POST') {
                    $response = $response->post($url, $data);
                } elseif ($method === 'PUT') {
                    $response = $response->put($url, $data);
                } elseif ($method === 'DELETE') {
                    $response = $response->delete($url, $data);
                } else {
                    throw new Exception("Unsupported HTTP method: {$method}");
                }
                
                // Check for HTTP errors
                if ($response->failed()) {
                    $statusCode = $response->status();
                    $responseData = $response->json() ?: ['status' => $statusCode];
                    
                    // Determine if the error is retryable
                    $retryable = in_array($statusCode, [408, 429, 502, 503, 504]);
                    
                    // Handle rate limiting
                    if ($statusCode === 429) {
                        // Get retry-after header if available
                        $retryAfter = $response->header('Retry-After');
                        
                        throw IntegrationException::createFromRateLimitError(
                            'Rate limit exceeded for SIS API',
                            $this->provider,
                            $method . ' ' . $endpoint,
                            $responseData,
                            $retryAfter ? (int) $retryAfter : $this->retryDelay
                        );
                    }
                    
                    // For authentication errors
                    if ($statusCode === 401) {
                        throw IntegrationException::createFromAuthenticationError(
                            'Authentication failed for SIS API',
                            $this->provider,
                            $method . ' ' . $endpoint,
                            $method === 'GET' ? $data : [],
                            $responseData
                        );
                    }
                    
                    // For other errors
                    $errorCode = 'API_ERROR_' . $statusCode;
                    $errorMessage = $responseData['message'] ?? 'API request failed with status code ' . $statusCode;
                    
                    throw IntegrationException::createFromApiError(
                        $errorMessage,
                        $this->provider,
                        $method . ' ' . $endpoint,
                        $method === 'GET' ? $data : [],
                        $responseData,
                        $errorCode
                    );
                }
                
                // Return the response data
                return $response->json() ?: [];
                
            } catch (IntegrationException $e) {
                // For integration exceptions, retry only if the exception is flagged as retryable
                if ($attempts < $maxAttempts && $e->isRetryable()) {
                    $retry = true;
                    $delay = $e->getRetryDelay($attempts);
                    
                    Log::warning("SIS API request failed, retrying in {$delay} seconds. Attempt {$attempts}/{$maxAttempts}: " . $e->getMessage());
                    
                    // Wait before retrying
                    sleep($delay);
                } else {
                    // Rethrow the exception
                    throw $e;
                }
            } catch (Exception $e) {
                // For general exceptions (like connection errors), retry if attempts remain
                if ($attempts < $maxAttempts) {
                    $retry = true;
                    $delay = min(pow(2, $attempts), 30); // Exponential backoff with max of 30 seconds
                    
                    Log::warning("SIS API request failed, retrying in {$delay} seconds. Attempt {$attempts}/{$maxAttempts}: " . $e->getMessage());
                    
                    // Wait before retrying
                    sleep($delay);
                } else {
                    // Convert to integration exception and throw
                    throw IntegrationException::createFromConnectionError(
                        'SIS API request failed after ' . $maxAttempts . ' attempts: ' . $e->getMessage(),
                        $this->provider,
                        $method . ' ' . $endpoint,
                        $method === 'GET' ? $data : []
                    );
                }
            }
        } while ($retry);
        
        // This code should never be reached, but included for completeness
        throw IntegrationException::createFromConnectionError(
            'Unexpected error in SIS API request',
            $this->provider,
            $method . ' ' . $endpoint,
            $method === 'GET' ? $data : []
        );
    }

    /**
     * Check if the SIS integration is properly configured.
     *
     * @return bool
     */
    public function isConfigured()
    {
        // Check if required configuration parameters are set
        if (empty($this->apiUrl) || empty($this->apiKey)) {
            return false;
        }
        
        // Check if field mappings are configured
        if (empty($this->fieldMappings)) {
            return false;
        }
        
        // Check if endpoints are configured
        if (empty($this->endpoints) || 
            !isset($this->endpoints['students']) || 
            !isset($this->endpoints['enrollment'])) {
            return false;
        }
        
        return true;
    }

    /**
     * Check if the SIS integration is enabled.
     *
     * @return bool
     */
    public function isEnabled()
    {
        return $this->enabled && $this->isConfigured();
    }

    /**
     * Test the connection to the SIS API.
     *
     * @return bool
     */
    public function testConnection()
    {
        try {
            // Send a simple API request to test connectivity
            $testEndpoint = $this->endpoints['test'] ?? 'ping';
            $response = $this->sendApiRequest('GET', $testEndpoint);
            
            // Log the test result
            $this->integration->logActivity(
                'test_connection', 
                'success', 
                [], 
                $response
            );
            
            return true;
        } catch (Exception $e) {
            // Log the error
            $this->integration->logActivity(
                'test_connection', 
                'error', 
                [], 
                null,
                $e->getMessage()
            );
            
            return false;
        }
    }

    /**
     * Log an integration activity.
     *
     * @param  string  $operation
     * @param  string  $status
     * @param  array|null  $requestData
     * @param  array|null  $responseData
     * @param  string|null  $errorMessage
     * @return \App\Models\IntegrationLog
     */
    public function logActivity(string $operation, string $status, ?array $requestData = null, ?array $responseData = null, ?string $errorMessage = null)
    {
        // Sanitize request and response data to remove sensitive information
        if ($requestData) {
            // Remove sensitive data like API keys, passwords, etc.
            unset($requestData['password']);
            unset($requestData['api_key']);
            unset($requestData['api_secret']);
            
            // Truncate large data fields if necessary
            if (isset($requestData['application_data']) && is_array($requestData['application_data'])) {
                $requestData['application_data'] = ['data_size' => 'large_data_truncated'];
            }
        }
        
        if ($responseData) {
            // Truncate large response data if necessary
            if (is_array($responseData) && count($responseData) > 100) {
                $responseData = array_slice($responseData, 0, 100);
                $responseData['_truncated'] = true;
            }
        }
        
        // If integration object is available, use it to log activity
        if ($this->integration) {
            return $this->integration->logActivity($operation, $status, $requestData, $responseData, $errorMessage);
        }
        
        // If no integration object is available, create a log entry directly
        $log = new IntegrationLog([
            'integration_id' => 0, // Unknown integration ID
            'operation' => $operation,
            'status' => $status,
            'request_data' => $requestData,
            'response_data' => $responseData,
            'error_message' => $errorMessage,
        ]);
        
        $log->save();
        return $log;
    }

    /**
     * Map local data fields to SIS field names.
     *
     * @param  array  $data
     * @param  string  $entityType
     * @return array
     */
    public function mapDataToSIS(array $data, string $entityType = 'student')
    {
        $mappedData = [];
        $mappings = $this->fieldMappings[$entityType] ?? [];
        
        if (empty($mappings)) {
            // If no mappings defined, return data as is
            return $data;
        }
        
        // Map fields using the defined mappings
        foreach ($mappings as $localField => $sisField) {
            if (isset($data[$localField])) {
                // Handle nested fields with dot notation
                if (strpos($sisField, '.') !== false) {
                    $this->setNestedValue($mappedData, $sisField, $data[$localField]);
                } else {
                    $mappedData[$sisField] = $data[$localField];
                }
            }
        }
        
        // Add any unmapped fields if they might be needed
        foreach ($data as $key => $value) {
            if (!in_array($key, array_keys($mappings)) && !isset($mappedData[$key])) {
                $mappedData[$key] = $value;
            }
        }
        
        return $mappedData;
    }

    /**
     * Map SIS data fields to local field names.
     *
     * @param  array  $data
     * @param  string  $entityType
     * @return array
     */
    public function mapDataFromSIS(array $data, string $entityType = 'student')
    {
        $mappedData = [];
        $mappings = $this->fieldMappings[$entityType] ?? [];
        
        if (empty($mappings)) {
            // If no mappings defined, return data as is
            return $data;
        }
        
        // Reverse the mappings for SIS to local
        $reverseMappings = array_flip($mappings);
        
        // Map fields using the reversed mappings
        foreach ($reverseMappings as $sisField => $localField) {
            // Handle nested fields with dot notation
            if (strpos($sisField, '.') !== false) {
                $value = $this->getNestedValue($data, $sisField);
                if ($value !== null) {
                    $mappedData[$localField] = $value;
                }
            } elseif (isset($data[$sisField])) {
                $mappedData[$localField] = $data[$sisField];
            }
        }
        
        // Include the SIS ID if available
        if (isset($data['id'])) {
            $mappedData['id'] = $data['id'];
        } elseif (isset($data['student_id'])) {
            $mappedData['id'] = $data['student_id'];
        }
        
        return $mappedData;
    }

    /**
     * Prepare student data for SIS integration.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\Application|null  $application
     * @param  array  $additionalData
     * @return array
     */
    public function prepareStudentData(User $user, ?Application $application = null, array $additionalData = [])
    {
        // Start with basic user data
        $data = [
            'email' => $user->email,
        ];
        
        // Add profile data if available
        if ($user->profile) {
            $data['first_name'] = $user->profile->first_name;
            $data['last_name'] = $user->profile->last_name;
            $data['full_name'] = $user->profile->full_name;
            
            if ($user->profile->date_of_birth) {
                $data['date_of_birth'] = $user->profile->date_of_birth->format('Y-m-d');
            }
            
            if ($user->profile->phone_number) {
                $data['phone_number'] = $user->profile->phone_number;
            }
            
            // Add address information
            if ($user->profile->address_line1) {
                $data['address'] = [
                    'line1' => $user->profile->address_line1,
                    'line2' => $user->profile->address_line2,
                    'city' => $user->profile->city,
                    'state' => $user->profile->state,
                    'postal_code' => $user->profile->postal_code,
                    'country' => $user->profile->country,
                ];
            }
        }
        
        // Add application data if available
        if ($application) {
            $data['application_id'] = $application->id;
            $data['application_type'] = $application->application_type;
            $data['academic_term'] = $application->academic_term;
            $data['academic_year'] = $application->academic_year;
            
            // Add application status if available
            if ($application->currentStatus) {
                $data['application_status'] = $application->currentStatus->status;
            }
            
            // Add application submission date if submitted
            if ($application->is_submitted && $application->submitted_at) {
                $data['submitted_at'] = $application->submitted_at->toIso8601String();
            }
            
            // Add application data fields
            $applicationData = $application->getApplicationData();
            if (is_array($applicationData)) {
                $data['application_data'] = $applicationData;
            }
        }
        
        // Add any additional data provided
        $data = array_merge($data, $additionalData);
        
        return $data;
    }

    /**
     * Get the webhook endpoint URL for receiving SIS updates.
     *
     * @return string
     */
    public function getWebhookEndpoint()
    {
        $baseUrl = config('app.url');
        $endpoint = config('integrations.sis.webhook_endpoint', 'api/webhooks/sis');
        
        return rtrim($baseUrl, '/') . '/' . ltrim($endpoint, '/');
    }

    /**
     * Set a nested value using dot notation.
     *
     * @param  array  &$array
     * @param  string  $key
     * @param  mixed  $value
     * @return void
     */
    private function setNestedValue(array &$array, string $key, $value)
    {
        $keys = explode('.', $key);
        $current = &$array;
        
        while (count($keys) > 1) {
            $currentKey = array_shift($keys);
            
            if (!isset($current[$currentKey]) || !is_array($current[$currentKey])) {
                $current[$currentKey] = [];
            }
            
            $current = &$current[$currentKey];
        }
        
        $current[array_shift($keys)] = $value;
    }

    /**
     * Get a nested value using dot notation.
     *
     * @param  array  $array
     * @param  string  $key
     * @param  mixed  $default
     * @return mixed
     */
    private function getNestedValue(array $array, string $key, $default = null)
    {
        $keys = explode('.', $key);
        $current = $array;
        
        foreach ($keys as $segment) {
            if (!is_array($current) || !array_key_exists($segment, $current)) {
                return $default;
            }
            
            $current = $current[$segment];
        }
        
        return $current;
    }
}