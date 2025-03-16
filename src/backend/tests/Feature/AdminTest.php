<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Workflow;
use App\Models\WorkflowStage;
use App\Models\WorkflowTransition;
use App\Models\Application;
use App\Models\Document;

class AdminTest extends TestCase
{
    use RefreshDatabase, WithFaker, MockeryPHPUnitIntegration;
    
    /**
     * Indicates whether the default seeder should run before each test.
     *
     * @var bool
     */
    protected bool $seed = true;
    
    /**
     * Base API URL for admin endpoints.
     *
     * @var string
     */
    protected string $baseUrl;
    
    /**
     * Set up the test environment before each test.
     *
     * @return void
     */
    protected function setUp(): void
    {
        parent::setUp();
        $this->baseUrl = '/api/v1/admin';
    }
    
    /**
     * Test that an admin can list all users.
     *
     * @return void
     */
    public function testUserManagementIndex()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create several regular users
        $users = User::factory()->count(5)->create();
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/users");
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Assert that the response contains the expected users
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'email',
                    'is_active',
                    'profile' => [
                        'first_name',
                        'last_name'
                    ],
                    'roles'
                ]
            ],
            'meta' => [
                'pagination' => [
                    'total',
                    'per_page',
                    'current_page',
                    'last_page',
                ]
            ]
        ]);
        
        // Verify success flag is true
        $response->assertJson([
            'success' => true
        ]);
    }
    
    /**
     * Test that an admin can view a specific user.
     *
     * @return void
     */
    public function testUserManagementShow()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a regular user
        $user = $this->createUser();
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/users/{$user->id}");
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Assert that the response contains the expected user data
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'email',
                'is_active',
                'profile' => [
                    'first_name',
                    'last_name',
                    'date_of_birth',
                    'phone_number',
                ],
                'roles',
                'created_at',
                'last_login_at'
            ]
        ]);
        
        // Verify the user ID matches
        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'email' => $user->email
            ]
        ]);
    }
    
    /**
     * Test that an admin can create a new user.
     *
     * @return void
     */
    public function testUserManagementStore()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Prepare user data for creation
        $userData = [
            'email' => $this->faker->unique()->safeEmail,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'is_active' => true,
            'profile' => [
                'first_name' => $this->faker->firstName,
                'last_name' => $this->faker->lastName,
                'phone_number' => $this->faker->phoneNumber,
                'date_of_birth' => $this->faker->date
            ],
            'roles' => ['applicant']
        ];
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/users", $userData);
        
        // Assert that the response has a 201 status code
        $response->assertStatus(201);
        
        // Assert that the response contains the created user data
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'email',
                'is_active',
                'profile' => [
                    'first_name',
                    'last_name'
                ],
                'roles'
            ]
        ]);
        
        // Verify the user was actually created in the database
        $this->assertDatabaseHas('users', [
            'email' => $userData['email'],
            'is_active' => $userData['is_active']
        ]);
        
        // Verify the profile was created
        $this->assertDatabaseHas('user_profiles', [
            'first_name' => $userData['profile']['first_name'],
            'last_name' => $userData['profile']['last_name']
        ]);
    }
    
    /**
     * Test that an admin can update an existing user.
     *
     * @return void
     */
    public function testUserManagementUpdate()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a regular user
        $user = $this->createUser();
        
        // Prepare updated user data
        $updatedData = [
            'email' => $this->faker->unique()->safeEmail,
            'is_active' => false,
            'profile' => [
                'first_name' => 'Updated',
                'last_name' => 'User',
                'phone_number' => '555-123-4567'
            ],
            'roles' => ['applicant', 'student']
        ];
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/users/{$user->id}", $updatedData);
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Assert that the response contains the updated user data
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'email',
                'is_active',
                'profile' => [
                    'first_name',
                    'last_name'
                ],
                'roles'
            ]
        ]);
        
        // Verify the user was actually updated in the database
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => $updatedData['email'],
            'is_active' => $updatedData['is_active']
        ]);
        
        // Verify the profile was updated
        $this->assertDatabaseHas('user_profiles', [
            'user_id' => $user->id,
            'first_name' => $updatedData['profile']['first_name'],
            'last_name' => $updatedData['profile']['last_name']
        ]);
    }
    
    /**
     * Test that an admin can delete a user.
     *
     * @return void
     */
    public function testUserManagementDestroy()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a regular user
        $user = $this->createUser();
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->deleteJson("{$this->baseUrl}/users/{$user->id}");
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Verify success message
        $response->assertJson([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
        
        // Verify the user was actually deleted from the database
        // Depending on implementation, this could be a soft delete or hard delete
        // For soft delete:
        $this->assertSoftDeleted('users', ['id' => $user->id]);
        // For hard delete:
        // $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }
    
    /**
     * Test that an admin can assign roles to users.
     *
     * @return void
     */
    public function testUserManagementRoleAssignment()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a regular user
        $user = $this->createUser();
        
        // Create a role
        $role = Role::findOrCreate('reviewer', 'Application reviewer role');
        
        // Prepare role assignment data
        $roleData = [
            'roles' => ['reviewer']
        ];
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/users/{$user->id}/roles", $roleData);
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Verify success message
        $response->assertJson([
            'success' => true,
            'message' => 'Roles assigned successfully'
        ]);
        
        // Verify the role was actually assigned to the user in the database
        $this->assertDatabaseHas('user_roles', [
            'user_id' => $user->id,
            'role_id' => $role->id
        ]);
    }
    
    /**
     * Test that an admin can list all workflows.
     *
     * @return void
     */
    public function testWorkflowEditorIndex()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create several workflows
        $workflows = Workflow::factory()->count(3)->create([
            'created_by_user_id' => $admin->id
        ]);
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/workflows");
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Assert that the response contains the expected workflows
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'description',
                    'application_type',
                    'is_active',
                    'created_at',
                    'created_by' => [
                        'id',
                        'full_name'
                    ]
                ]
            ],
            'meta' => [
                'pagination'
            ]
        ]);
        
        // Verify success flag is true
        $response->assertJson([
            'success' => true
        ]);
    }
    
    /**
     * Test that an admin can view a specific workflow.
     *
     * @return void
     */
    public function testWorkflowEditorShow()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a workflow with stages and transitions
        $workflow = $this->createWorkflow($admin);
        
        // Create stages
        $stage1 = $this->createWorkflowStage($workflow, ['name' => 'Stage 1', 'sequence' => 1]);
        $stage2 = $this->createWorkflowStage($workflow, ['name' => 'Stage 2', 'sequence' => 2]);
        
        // Create transition
        $transition = $this->createWorkflowTransition($stage1, $stage2, [
            'name' => 'Submit',
            'is_automatic' => false
        ]);
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/workflows/{$workflow->id}");
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Assert that the response contains the expected workflow data
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'name',
                'description',
                'application_type',
                'is_active',
                'created_at',
                'created_by' => [
                    'id',
                    'full_name'
                ],
                'stages' => [
                    '*' => [
                        'id',
                        'name',
                        'description',
                        'sequence',
                        'required_documents',
                        'required_actions',
                        'notification_triggers',
                        'assigned_role'
                    ]
                ],
                'transitions' => [
                    '*' => [
                        'id',
                        'name',
                        'description',
                        'source_stage_id',
                        'target_stage_id',
                        'transition_conditions',
                        'is_automatic'
                    ]
                ]
            ]
        ]);
        
        // Verify workflow ID and stages count
        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $workflow->id,
                'name' => $workflow->name
            ]
        ]);
    }
    
    /**
     * Test that an admin can create a new workflow.
     *
     * @return void
     */
    public function testWorkflowEditorStore()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Prepare workflow data for creation
        $workflowData = [
            'name' => 'Test Workflow',
            'description' => 'A test workflow for admissions',
            'application_type' => 'undergraduate',
            'is_active' => true,
            'stages' => [
                [
                    'name' => 'Application Submission',
                    'description' => 'Initial application submission',
                    'sequence' => 1,
                    'required_documents' => ['transcript', 'personal_statement'],
                    'required_actions' => ['submit_application'],
                    'notification_triggers' => [
                        'on_enter' => ['applicant']
                    ],
                    'assigned_role_id' => null // No role assignment for automated stage
                ],
                [
                    'name' => 'Document Verification',
                    'description' => 'Verify uploaded documents',
                    'sequence' => 2,
                    'required_documents' => [],
                    'required_actions' => ['verify_documents'],
                    'notification_triggers' => [
                        'on_enter' => ['staff'],
                        'on_complete' => ['applicant']
                    ],
                    'assigned_role_id' => Role::where('name', 'staff')->first()->id
                ]
            ],
            'transitions' => [
                [
                    'name' => 'Submit Application',
                    'description' => 'Submit application for review',
                    'source_stage_index' => 0, // References stages array index
                    'target_stage_index' => 1, // References stages array index
                    'transition_conditions' => [
                        ['field' => 'is_submitted', 'operator' => '==', 'value' => true]
                    ],
                    'is_automatic' => true
                ]
            ]
        ];
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/workflows", $workflowData);
        
        // Assert that the response has a 201 status code
        $response->assertStatus(201);
        
        // Assert that the response contains the created workflow data
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'name',
                'description',
                'application_type',
                'is_active',
                'stages',
                'transitions'
            ]
        ]);
        
        // Verify the workflow was actually created in the database
        $this->assertDatabaseHas('workflows', [
            'name' => $workflowData['name'],
            'application_type' => $workflowData['application_type'],
            'is_active' => $workflowData['is_active'],
            'created_by_user_id' => $admin->id
        ]);
        
        // Verify the stages were created
        $workflowId = $response->json('data.id');
        $this->assertDatabaseHas('workflow_stages', [
            'workflow_id' => $workflowId,
            'name' => $workflowData['stages'][0]['name'],
            'sequence' => $workflowData['stages'][0]['sequence']
        ]);
        
        $this->assertDatabaseHas('workflow_stages', [
            'workflow_id' => $workflowId,
            'name' => $workflowData['stages'][1]['name'],
            'sequence' => $workflowData['stages'][1]['sequence']
        ]);
    }
    
    /**
     * Test that an admin can update an existing workflow.
     *
     * @return void
     */
    public function testWorkflowEditorUpdate()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a workflow
        $workflow = $this->createWorkflow($admin);
        
        // Prepare updated workflow data
        $updatedData = [
            'name' => 'Updated Workflow',
            'description' => 'Updated workflow description',
            'is_active' => false
        ];
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/workflows/{$workflow->id}", $updatedData);
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Assert that the response contains the updated workflow data
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'name',
                'description',
                'application_type',
                'is_active',
                'created_at',
                'updated_at'
            ]
        ]);
        
        // Verify the workflow was actually updated in the database
        $this->assertDatabaseHas('workflows', [
            'id' => $workflow->id,
            'name' => $updatedData['name'],
            'description' => $updatedData['description'],
            'is_active' => $updatedData['is_active']
        ]);
    }
    
    /**
     * Test that an admin can delete a workflow.
     *
     * @return void
     */
    public function testWorkflowEditorDestroy()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a workflow
        $workflow = $this->createWorkflow($admin);
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->deleteJson("{$this->baseUrl}/workflows/{$workflow->id}");
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Verify success message
        $response->assertJson([
            'success' => true,
            'message' => 'Workflow deleted successfully'
        ]);
        
        // Verify the workflow was actually deleted from the database
        $this->assertDatabaseMissing('workflows', [
            'id' => $workflow->id
        ]);
    }
    
    /**
     * Test that an admin can manage workflow stages.
     *
     * @return void
     */
    public function testWorkflowStageManagement()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a workflow
        $workflow = $this->createWorkflow($admin);
        
        // Test creating a new stage
        $stageData = [
            'name' => 'New Stage',
            'description' => 'A new workflow stage',
            'sequence' => 1,
            'required_documents' => ['transcript', 'personal_statement'],
            'required_actions' => ['review_application'],
            'notification_triggers' => [
                'on_enter' => ['applicant', 'staff']
            ],
            'assigned_role_id' => Role::where('name', 'staff')->first()->id
        ];
        
        $createResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/workflows/{$workflow->id}/stages", $stageData);
        
        $createResponse->assertStatus(201);
        $stageId = $createResponse->json('data.id');
        
        // Verify the stage was created
        $this->assertDatabaseHas('workflow_stages', [
            'id' => $stageId,
            'workflow_id' => $workflow->id,
            'name' => $stageData['name']
        ]);
        
        // Test updating a stage
        $updateData = [
            'name' => 'Updated Stage',
            'description' => 'Updated description',
            'sequence' => 2
        ];
        
        $updateResponse = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/workflows/{$workflow->id}/stages/{$stageId}", $updateData);
        
        $updateResponse->assertStatus(200);
        
        // Verify the stage was updated
        $this->assertDatabaseHas('workflow_stages', [
            'id' => $stageId,
            'name' => $updateData['name'],
            'sequence' => $updateData['sequence']
        ]);
        
        // Test reordering stages
        // First, create another stage
        $stage2 = $this->createWorkflowStage($workflow, [
            'name' => 'Another Stage',
            'sequence' => 3
        ]);
        
        $reorderData = [
            'stages' => [
                ['id' => $stage2->id, 'sequence' => 1],
                ['id' => $stageId, 'sequence' => 2]
            ]
        ];
        
        $reorderResponse = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/workflows/{$workflow->id}/stages/reorder", $reorderData);
        
        $reorderResponse->assertStatus(200);
        
        // Verify the sequences were updated
        $this->assertDatabaseHas('workflow_stages', [
            'id' => $stage2->id,
            'sequence' => 1
        ]);
        
        $this->assertDatabaseHas('workflow_stages', [
            'id' => $stageId,
            'sequence' => 2
        ]);
        
        // Test deleting a stage
        $deleteResponse = $this->actingAs($admin)
            ->deleteJson("{$this->baseUrl}/workflows/{$workflow->id}/stages/{$stageId}");
        
        $deleteResponse->assertStatus(200);
        
        // Verify the stage was deleted
        $this->assertDatabaseMissing('workflow_stages', [
            'id' => $stageId
        ]);
    }
    
    /**
     * Test that an admin can manage workflow transitions.
     *
     * @return void
     */
    public function testWorkflowTransitionManagement()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a workflow with multiple stages
        $workflow = $this->createWorkflow($admin);
        $stage1 = $this->createWorkflowStage($workflow, ['name' => 'Stage 1', 'sequence' => 1]);
        $stage2 = $this->createWorkflowStage($workflow, ['name' => 'Stage 2', 'sequence' => 2]);
        
        // Test creating a new transition
        $transitionData = [
            'source_stage_id' => $stage1->id,
            'target_stage_id' => $stage2->id,
            'name' => 'New Transition',
            'description' => 'A new workflow transition',
            'transition_conditions' => [
                ['field' => 'is_submitted', 'operator' => '==', 'value' => true]
            ],
            'is_automatic' => false
        ];
        
        $createResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/workflows/{$workflow->id}/transitions", $transitionData);
        
        $createResponse->assertStatus(201);
        $transitionId = $createResponse->json('data.id');
        
        // Verify the transition was created
        $this->assertDatabaseHas('workflow_transitions', [
            'id' => $transitionId,
            'source_stage_id' => $transitionData['source_stage_id'],
            'target_stage_id' => $transitionData['target_stage_id'],
            'name' => $transitionData['name']
        ]);
        
        // Test updating a transition
        $updateData = [
            'name' => 'Updated Transition',
            'description' => 'Updated description',
            'is_automatic' => true
        ];
        
        $updateResponse = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/workflows/{$workflow->id}/transitions/{$transitionId}", $updateData);
        
        $updateResponse->assertStatus(200);
        
        // Verify the transition was updated
        $this->assertDatabaseHas('workflow_transitions', [
            'id' => $transitionId,
            'name' => $updateData['name'],
            'is_automatic' => $updateData['is_automatic']
        ]);
        
        // Test deleting a transition
        $deleteResponse = $this->actingAs($admin)
            ->deleteJson("{$this->baseUrl}/workflows/{$workflow->id}/transitions/{$transitionId}");
        
        $deleteResponse->assertStatus(200);
        
        // Verify the transition was deleted
        $this->assertDatabaseMissing('workflow_transitions', [
            'id' => $transitionId
        ]);
    }
    
    /**
     * Test that an admin can list applications pending review.
     *
     * @return void
     */
    public function testApplicationReviewIndex()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a workflow with appropriate stages for testing
        $workflow = $this->createWorkflow($admin);
        $submittedStage = $this->createWorkflowStage($workflow, [
            'name' => 'Submitted', 
            'sequence' => 1
        ]);
        $reviewStage = $this->createWorkflowStage($workflow, [
            'name' => 'Under Review', 
            'sequence' => 2
        ]);
        
        // Create several users with submitted applications
        $users = [];
        $applications = [];
        for ($i = 0; $i < 3; $i++) {
            $users[$i] = $this->createUser();
            $applications[$i] = $this->createSubmittedApplication($users[$i], [
                'application_type' => 'undergraduate',
                'academic_term' => 'Fall',
                'academic_year' => date('Y')
            ]);
            
            // Update application status to indicate it's under review
            $reviewStatus = $this->createApplicationStatus($applications[$i], $admin, [
                'status' => 'under_review',
                'workflow_stage_id' => $reviewStage->id
            ]);
            $applications[$i]->current_status_id = $reviewStatus->id;
            $applications[$i]->save();
        }
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/applications/review");
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Assert that the response contains the expected applications
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'user_id',
                    'application_type',
                    'academic_term',
                    'academic_year',
                    'submitted_at',
                    'current_status' => [
                        'id',
                        'status',
                        'created_at'
                    ],
                    'user' => [
                        'id',
                        'email',
                        'profile' => [
                            'first_name',
                            'last_name'
                        ]
                    ]
                ]
            ],
            'meta' => [
                'pagination'
            ]
        ]);
        
        // Verify success flag is true
        $response->assertJson([
            'success' => true
        ]);
        
        // Verify that the correct number of applications is returned
        $responseData = $response->json('data');
        $this->assertCount(3, $responseData);
    }
    
    /**
     * Test that an admin can view a specific application for review.
     *
     * @return void
     */
    public function testApplicationReviewShow()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a workflow with appropriate stages for testing
        $workflow = $this->createWorkflow($admin);
        $submittedStage = $this->createWorkflowStage($workflow, [
            'name' => 'Submitted', 
            'sequence' => 1
        ]);
        $reviewStage = $this->createWorkflowStage($workflow, [
            'name' => 'Under Review', 
            'sequence' => 2
        ]);
        
        // Create transition between stages
        $this->createWorkflowTransition($submittedStage, $reviewStage, [
            'name' => 'Begin Review',
            'is_automatic' => false
        ]);
        
        // Create a user with a submitted application and documents
        $user = $this->createUser();
        $application = $this->createSubmittedApplication($user, [
            'application_type' => 'undergraduate',
            'academic_term' => 'Fall',
            'academic_year' => date('Y')
        ]);
        
        // Add documents to the application
        $document1 = $this->createDocument($user, $application, [
            'document_type' => 'transcript',
            'is_verified' => false
        ]);
        
        $document2 = $this->createDocument($user, $application, [
            'document_type' => 'personal_statement',
            'is_verified' => false
        ]);
        
        // Update application status to indicate it's under review
        $reviewStatus = $this->createApplicationStatus($application, $admin, [
            'status' => 'under_review',
            'workflow_stage_id' => $reviewStage->id
        ]);
        $application->current_status_id = $reviewStatus->id;
        $application->save();
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/applications/review/{$application->id}");
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Assert that the response contains the expected application data
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'user_id',
                'application_type',
                'academic_term',
                'academic_year',
                'application_data',
                'is_submitted',
                'submitted_at',
                'current_status' => [
                    'id',
                    'status',
                    'created_at',
                    'workflow_stage' => [
                        'id',
                        'name'
                    ]
                ],
                'user' => [
                    'id',
                    'email',
                    'profile' => [
                        'first_name',
                        'last_name'
                    ]
                ],
                'documents' => [
                    '*' => [
                        'id',
                        'document_type',
                        'file_name',
                        'is_verified'
                    ]
                ],
                'status_history' => [
                    '*' => [
                        'id',
                        'status',
                        'created_at'
                    ]
                ],
                'available_transitions' => [
                    '*' => [
                        'id',
                        'name',
                        'target_stage_id'
                    ]
                ]
            ]
        ]);
        
        // Verify application ID
        $response->assertJson([
            'success' => true,
            'data' => [
                'id' => $application->id
            ]
        ]);
        
        // Verify that documents are included
        $responseData = $response->json('data');
        $this->assertCount(2, $responseData['documents']);
    }
    
    /**
     * Test that an admin can update an application's status.
     *
     * @return void
     */
    public function testApplicationStatusUpdate()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a workflow with appropriate stages for testing
        $workflow = $this->createWorkflow($admin);
        $submittedStage = $this->createWorkflowStage($workflow, [
            'name' => 'Submitted', 
            'sequence' => 1
        ]);
        $reviewStage = $this->createWorkflowStage($workflow, [
            'name' => 'Under Review', 
            'sequence' => 2
        ]);
        
        // Create transition between stages
        $transition = $this->createWorkflowTransition($submittedStage, $reviewStage, [
            'name' => 'Begin Review',
            'is_automatic' => false
        ]);
        
        // Create a user with a submitted application
        $user = $this->createUser();
        $application = $this->createSubmittedApplication($user);
        
        // Set initial status to submitted stage
        $submittedStatus = $this->createApplicationStatus($application, $admin, [
            'status' => 'submitted',
            'workflow_stage_id' => $submittedStage->id
        ]);
        $application->current_status_id = $submittedStatus->id;
        $application->save();
        
        // Prepare status update data
        $statusUpdateData = [
            'transition_id' => $transition->id,
            'notes' => 'Moving application to review stage'
        ];
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/applications/{$application->id}/status", $statusUpdateData);
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Verify success message
        $response->assertJson([
            'success' => true,
            'message' => 'Application status updated successfully'
        ]);
        
        // Verify that a new status was created
        $this->assertDatabaseHas('application_statuses', [
            'application_id' => $application->id,
            'workflow_stage_id' => $reviewStage->id,
            'created_by_user_id' => $admin->id
        ]);
        
        // Verify the application's current status was updated
        $application->refresh();
        $this->assertEquals($reviewStage->id, $application->currentStatus->workflow_stage_id);
    }
    
    /**
     * Test that an admin can add and retrieve notes for an application.
     *
     * @return void
     */
    public function testApplicationNoteManagement()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a user with a submitted application
        $user = $this->createUser();
        $application = $this->createSubmittedApplication($user);
        
        // Test adding a note
        $noteData = [
            'content' => 'This is a test note for the application',
            'is_internal' => true
        ];
        
        $createResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/applications/{$application->id}/notes", $noteData);
        
        $createResponse->assertStatus(201);
        
        // Verify the note was created
        $this->assertDatabaseHas('notes', [
            'application_id' => $application->id,
            'user_id' => $admin->id,
            'content' => $noteData['content'],
            'is_internal' => $noteData['is_internal']
        ]);
        
        // Test retrieving notes
        $getResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/applications/{$application->id}/notes");
        
        $getResponse->assertStatus(200);
        
        // Verify that the note is in the response
        $getResponse->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'content',
                    'is_internal',
                    'created_at',
                    'user' => [
                        'id',
                        'full_name'
                    ]
                ]
            ]
        ]);
        
        // Verify the content of the first note
        $getResponse->assertJson([
            'success' => true,
            'data' => [
                [
                    'content' => $noteData['content'],
                    'is_internal' => $noteData['is_internal']
                ]
            ]
        ]);
    }
    
    /**
     * Test that an admin can verify documents.
     *
     * @return void
     */
    public function testDocumentVerification()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a user with an application and unverified documents
        $user = $this->createUser();
        $application = $this->createSubmittedApplication($user);
        $document = $this->createDocument($user, $application, [
            'document_type' => 'transcript',
            'is_verified' => false
        ]);
        
        // Prepare verification data
        $verificationData = [
            'verification_status' => 'verified',
            'notes' => 'Document verified during testing',
            'verification_method' => 'manual',
            'confidence_score' => 1.0
        ];
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/documents/{$document->id}/verify", $verificationData);
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Verify success message
        $response->assertJson([
            'success' => true,
            'message' => 'Document verified successfully'
        ]);
        
        // Verify the document was actually marked as verified in the database
        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'is_verified' => true,
            'verified_by_user_id' => $admin->id
        ]);
        
        // Verify that a verification record was created
        $this->assertDatabaseHas('document_verifications', [
            'document_id' => $document->id,
            'verification_status' => $verificationData['verification_status'],
            'verification_method' => $verificationData['verification_method'],
            'verified_by_user_id' => $admin->id
        ]);
    }
    
    /**
     * Test that an admin can list documents pending verification.
     *
     * @return void
     */
    public function testPendingDocumentsList()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create multiple applications with unverified documents
        $users = [];
        $applications = [];
        $pendingDocuments = [];
        
        for ($i = 0; $i < 3; $i++) {
            $users[$i] = $this->createUser();
            $applications[$i] = $this->createSubmittedApplication($users[$i]);
            
            // Create two documents per application, one verified and one unverified
            $pendingDocuments[$i] = $this->createDocument($users[$i], $applications[$i], [
                'document_type' => 'transcript',
                'is_verified' => false
            ]);
            
            // Create a verified document
            $this->createVerifiedDocument($users[$i], $applications[$i], $admin, [
                'document_type' => 'personal_statement',
                'is_verified' => true
            ]);
        }
        
        // Act as the admin user
        $response = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/documents/pending");
        
        // Assert that the response has a 200 status code
        $response->assertStatus(200);
        
        // Assert that the response contains the expected pending documents
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'user_id',
                    'application_id',
                    'document_type',
                    'file_name',
                    'mime_type',
                    'file_size',
                    'created_at',
                    'user' => [
                        'id',
                        'email',
                        'profile' => [
                            'first_name',
                            'last_name'
                        ]
                    ],
                    'application' => [
                        'id',
                        'application_type',
                        'academic_term',
                        'academic_year'
                    ]
                ]
            ],
            'meta' => [
                'pagination'
            ]
        ]);
        
        // Verify success flag is true
        $response->assertJson([
            'success' => true
        ]);
        
        // Verify that only unverified documents are returned
        $responseData = $response->json('data');
        $pendingDocumentIds = array_column($responseData, 'id');
        
        foreach ($pendingDocuments as $doc) {
            $this->assertContains($doc->id, $pendingDocumentIds);
        }
    }
    
    /**
     * Test that an admin can make final decisions on applications.
     *
     * @return void
     */
    public function testApplicationDecisionMaking()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create a workflow with appropriate stages for testing
        $workflow = $this->createWorkflow($admin);
        $reviewStage = $this->createWorkflowStage($workflow, [
            'name' => 'Under Review', 
            'sequence' => 1
        ]);
        $acceptedStage = $this->createWorkflowStage($workflow, [
            'name' => 'Accepted', 
            'sequence' => 2
        ]);
        $rejectedStage = $this->createWorkflowStage($workflow, [
            'name' => 'Rejected', 
            'sequence' => 3
        ]);
        $waitlistedStage = $this->createWorkflowStage($workflow, [
            'name' => 'Waitlisted', 
            'sequence' => 4
        ]);
        
        // Create transitions
        $acceptTransition = $this->createWorkflowTransition($reviewStage, $acceptedStage, [
            'name' => 'Accept Application',
            'is_automatic' => false
        ]);
        
        $rejectTransition = $this->createWorkflowTransition($reviewStage, $rejectedStage, [
            'name' => 'Reject Application',
            'is_automatic' => false
        ]);
        
        $waitlistTransition = $this->createWorkflowTransition($reviewStage, $waitlistedStage, [
            'name' => 'Waitlist Application',
            'is_automatic' => false
        ]);
        
        // Create applications for testing decisions
        $users = [];
        $applications = [];
        
        for ($i = 0; $i < 3; $i++) {
            $users[$i] = $this->createUser();
            $applications[$i] = $this->createSubmittedApplication($users[$i]);
            
            // Set initial status to review stage
            $reviewStatus = $this->createApplicationStatus($applications[$i], $admin, [
                'status' => 'under_review',
                'workflow_stage_id' => $reviewStage->id
            ]);
            $applications[$i]->current_status_id = $reviewStatus->id;
            $applications[$i]->save();
        }
        
        // Test making an accept decision
        $acceptData = [
            'decision' => 'accept',
            'transition_id' => $acceptTransition->id,
            'notes' => 'Applicant accepted based on qualifications'
        ];
        
        $acceptResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/applications/{$applications[0]->id}/decision", $acceptData);
        
        $acceptResponse->assertStatus(200);
        
        // Verify the application status was updated to accepted
        $this->assertDatabaseHas('application_statuses', [
            'application_id' => $applications[0]->id,
            'workflow_stage_id' => $acceptedStage->id,
            'created_by_user_id' => $admin->id
        ]);
        
        // Test making a reject decision
        $rejectData = [
            'decision' => 'reject',
            'transition_id' => $rejectTransition->id,
            'notes' => 'Application does not meet requirements'
        ];
        
        $rejectResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/applications/{$applications[1]->id}/decision", $rejectData);
        
        $rejectResponse->assertStatus(200);
        
        // Verify the application status was updated to rejected
        $this->assertDatabaseHas('application_statuses', [
            'application_id' => $applications[1]->id,
            'workflow_stage_id' => $rejectedStage->id,
            'created_by_user_id' => $admin->id
        ]);
        
        // Test making a waitlist decision
        $waitlistData = [
            'decision' => 'waitlist',
            'transition_id' => $waitlistTransition->id,
            'notes' => 'Application placed on waitlist'
        ];
        
        $waitlistResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/applications/{$applications[2]->id}/decision", $waitlistData);
        
        $waitlistResponse->assertStatus(200);
        
        // Verify the application status was updated to waitlisted
        $this->assertDatabaseHas('application_statuses', [
            'application_id' => $applications[2]->id,
            'workflow_stage_id' => $waitlistedStage->id,
            'created_by_user_id' => $admin->id
        ]);
    }
    
    /**
     * Test that an admin can access reporting endpoints.
     *
     * @return void
     */
    public function testReportingEndpoints()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Create test data for reports
        $users = [];
        $applications = [];
        
        for ($i = 0; $i < 5; $i++) {
            $users[$i] = $this->createUser();
            $applications[$i] = $this->createSubmittedApplication($users[$i], [
                'application_type' => $i % 2 == 0 ? 'undergraduate' : 'graduate',
                'academic_term' => $i % 3 == 0 ? 'Fall' : 'Spring',
                'academic_year' => date('Y')
            ]);
            
            // Create documents
            $document = $this->createDocument($users[$i], $applications[$i]);
            
            // Create payments
            $payment = $this->createPayment($users[$i], $applications[$i], [
                'amount' => 75.00,
                'status' => 'completed',
                'paid_at' => now()
            ]);
        }
        
        // Test application statistics endpoint
        $appStatsResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/reports/applications/stats");
        
        $appStatsResponse->assertStatus(200);
        $appStatsResponse->assertJsonStructure([
            'success',
            'data' => [
                'total_applications',
                'submitted_applications',
                'applications_by_type',
                'applications_by_term',
                'applications_by_status',
                'applications_over_time'
            ]
        ]);
        
        // Test document statistics endpoint
        $docStatsResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/reports/documents/stats");
        
        $docStatsResponse->assertStatus(200);
        $docStatsResponse->assertJsonStructure([
            'success',
            'data' => [
                'total_documents',
                'verified_documents',
                'verification_backlog',
                'documents_by_type',
                'verification_time_avg'
            ]
        ]);
        
        // Test payment statistics endpoint
        $paymentStatsResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/reports/payments/stats");
        
        $paymentStatsResponse->assertStatus(200);
        $paymentStatsResponse->assertJsonStructure([
            'success',
            'data' => [
                'total_payments',
                'total_amount',
                'payments_by_type',
                'payments_by_status',
                'payments_over_time'
            ]
        ]);
        
        // Test conversion funnel endpoint
        $funnelResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/reports/conversion-funnel");
        
        $funnelResponse->assertStatus(200);
        $funnelResponse->assertJsonStructure([
            'success',
            'data' => [
                'started',
                'submitted',
                'under_review',
                'accepted',
                'enrolled',
                'conversion_rates'
            ]
        ]);
    }
    
    /**
     * Test that an admin can manage roles and permissions.
     *
     * @return void
     */
    public function testRolePermissionManagement()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Test listing roles
        $rolesResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/roles");
        
        $rolesResponse->assertStatus(200);
        $rolesResponse->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'description',
                    'is_system_role',
                    'created_at'
                ]
            ]
        ]);
        
        // Test creating a role
        $roleData = [
            'name' => 'test_role',
            'description' => 'A test role for testing',
            'is_system_role' => false
        ];
        
        $createRoleResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/roles", $roleData);
        
        $createRoleResponse->assertStatus(201);
        $roleId = $createRoleResponse->json('data.id');
        
        // Verify the role was created
        $this->assertDatabaseHas('roles', [
            'id' => $roleId,
            'name' => $roleData['name'],
            'description' => $roleData['description']
        ]);
        
        // Test updating a role
        $updateRoleData = [
            'name' => 'updated_test_role',
            'description' => 'Updated test role description'
        ];
        
        $updateRoleResponse = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/roles/{$roleId}", $updateRoleData);
        
        $updateRoleResponse->assertStatus(200);
        
        // Verify the role was updated
        $this->assertDatabaseHas('roles', [
            'id' => $roleId,
            'name' => $updateRoleData['name'],
            'description' => $updateRoleData['description']
        ]);
        
        // Test listing permissions
        $permissionsResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/permissions");
        
        $permissionsResponse->assertStatus(200);
        $permissionsResponse->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'description',
                    'resource',
                    'action'
                ]
            ]
        ]);
        
        // Test creating a permission
        $permissionData = [
            'name' => 'test.permission',
            'description' => 'A test permission',
            'resource' => 'test',
            'action' => 'permission'
        ];
        
        $createPermissionResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/permissions", $permissionData);
        
        $createPermissionResponse->assertStatus(201);
        $permissionId = $createPermissionResponse->json('data.id');
        
        // Verify the permission was created
        $this->assertDatabaseHas('permissions', [
            'id' => $permissionId,
            'name' => $permissionData['name'],
            'resource' => $permissionData['resource'],
            'action' => $permissionData['action']
        ]);
        
        // Test assigning permissions to a role
        $assignPermissionsData = [
            'permission_ids' => [$permissionId]
        ];
        
        $assignPermissionsResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/roles/{$roleId}/permissions", $assignPermissionsData);
        
        $assignPermissionsResponse->assertStatus(200);
        
        // Verify the permission was assigned to the role
        $this->assertDatabaseHas('role_permissions', [
            'role_id' => $roleId,
            'permission_id' => $permissionId
        ]);
        
        // Test assigning a role to a user
        $user = $this->createUser();
        $assignRoleData = [
            'roles' => [$roleId]
        ];
        
        $assignRoleResponse = $this->actingAs($admin)
            ->postJson("{$this->baseUrl}/users/{$user->id}/roles", $assignRoleData);
        
        $assignRoleResponse->assertStatus(200);
        
        // Verify the role was assigned to the user
        $this->assertDatabaseHas('user_roles', [
            'user_id' => $user->id,
            'role_id' => $roleId
        ]);
    }
    
    /**
     * Test that an admin can manage system settings.
     *
     * @return void
     */
    public function testSystemSettingsManagement()
    {
        // Create an admin user
        $admin = $this->createAdminUser();
        
        // Test getting settings
        $getSettingsResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/settings");
        
        $getSettingsResponse->assertStatus(200);
        $getSettingsResponse->assertJsonStructure([
            'success',
            'data' => [
                'application_fees',
                'enrollment_deposit',
                'academic_terms',
                'academic_years',
                'document_types',
                'application_types',
                'notification_settings',
                'system_email'
            ]
        ]);
        
        // Test updating settings
        $updateSettingsData = [
            'application_fees' => [
                'undergraduate' => 85.00,
                'graduate' => 100.00,
                'transfer' => 75.00
            ],
            'enrollment_deposit' => 500.00,
            'academic_terms' => ['Fall', 'Spring', 'Summer'],
            'system_email' => 'admissions@example.edu'
        ];
        
        $updateSettingsResponse = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/settings", $updateSettingsData);
        
        $updateSettingsResponse->assertStatus(200);
        $updateSettingsResponse->assertJson([
            'success' => true,
            'message' => 'Settings updated successfully'
        ]);
        
        // Test getting email templates
        $getTemplatesResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/settings/email-templates");
        
        $getTemplatesResponse->assertStatus(200);
        $getTemplatesResponse->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'name',
                    'subject',
                    'body',
                    'variables'
                ]
            ]
        ]);
        
        // Test updating an email template
        $updateTemplateData = [
            'subject' => 'Updated: Your Application Status',
            'body' => 'Dear {{name}}, Your application status has been updated to: {{status}}.'
        ];
        
        $updateTemplateResponse = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/settings/email-templates/status_change", $updateTemplateData);
        
        $updateTemplateResponse->assertStatus(200);
        $updateTemplateResponse->assertJson([
            'success' => true,
            'message' => 'Email template updated successfully'
        ]);
        
        // Test getting security settings
        $getSecurityResponse = $this->actingAs($admin)
            ->getJson("{$this->baseUrl}/settings/security");
        
        $getSecurityResponse->assertStatus(200);
        $getSecurityResponse->assertJsonStructure([
            'success',
            'data' => [
                'password_policy',
                'session_timeout',
                'mfa_required_roles',
                'login_attempt_limit'
            ]
        ]);
        
        // Test updating security settings
        $updateSecurityData = [
            'password_policy' => [
                'min_length' => 12,
                'require_uppercase' => true,
                'require_lowercase' => true,
                'require_number' => true,
                'require_special' => true,
                'max_age_days' => 90
            ],
            'session_timeout' => 60,
            'mfa_required_roles' => ['administrator', 'staff']
        ];
        
        $updateSecurityResponse = $this->actingAs($admin)
            ->putJson("{$this->baseUrl}/settings/security", $updateSecurityData);
        
        $updateSecurityResponse->assertStatus(200);
        $updateSecurityResponse->assertJson([
            'success' => true,
            'message' => 'Security settings updated successfully'
        ]);
    }
    
    /**
     * Test that non-admin users cannot access admin endpoints.
     *
     * @return void
     */
    public function testNonAdminAccessDenied()
    {
        // Create a regular user (non-admin)
        $user = $this->createUser();
        
        // Define admin endpoints to test
        $adminEndpoints = [
            "{$this->baseUrl}/users",
            "{$this->baseUrl}/workflows",
            "{$this->baseUrl}/applications/review",
            "{$this->baseUrl}/reports/applications/stats",
            "{$this->baseUrl}/roles",
            "{$this->baseUrl}/settings",
        ];
        
        // Act as the regular user
        foreach ($adminEndpoints as $endpoint) {
            $response = $this->actingAs($user)->getJson($endpoint);
            
            // Assert that all responses have a 403 status code (Forbidden)
            $response->assertStatus(403);
            
            // Verify the error response
            $response->assertJson([
                'success' => false,
                'error' => [
                    'message' => 'Access denied. You do not have permission to access this resource.'
                ]
            ]);
        }
    }
    
    /**
     * Test that unauthenticated requests to admin endpoints are denied.
     *
     * @return void
     */
    public function testUnauthenticatedAccessDenied()
    {
        // Define admin endpoints to test
        $adminEndpoints = [
            "{$this->baseUrl}/users",
            "{$this->baseUrl}/workflows",
            "{$this->baseUrl}/applications/review",
            "{$this->baseUrl}/reports/applications/stats",
            "{$this->baseUrl}/roles",
            "{$this->baseUrl}/settings",
        ];
        
        // Make unauthenticated requests
        foreach ($adminEndpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            
            // Assert that all responses have a 401 status code (Unauthorized)
            $response->assertStatus(401);
            
            // Verify the error response
            $response->assertJson([
                'success' => false,
                'error' => [
                    'message' => 'Unauthenticated.'
                ]
            ]);
        }
    }
}