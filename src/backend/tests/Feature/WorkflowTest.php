<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase; // Laravel ^10.0
use Illuminate\Foundation\Testing\WithFaker; // Laravel ^10.0
use App\Models\Workflow;
use App\Models\WorkflowStage;
use App\Models\WorkflowTransition;
use App\Services\WorkflowService;
use App\Models\Application;
use App\Models\User;
use Tests\TestCase;

class WorkflowTest extends TestCase
{
    /**
     * The audit service instance.
     *
     * @var WorkflowService
     */
    protected WorkflowService $workflowService;

    /**
     * @var User
     */
    protected User $adminUser;

    /**
     * @var User
     */
    protected User $regularUser;

    /**
     * Default constructor provided by PHPUnit
     */
    public function __construct(?string $name = null, array $data = [], $dataName = '')
    {
        parent::__construct($name, $data, $dataName);
    }

    /**
     * Set up the test environment before each test
     *
     * @return void
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Resolve the WorkflowService from the container
        $this->workflowService = $this->app->make(WorkflowService::class);

        // Create an admin user for testing admin endpoints
        $this->adminUser = $this->createAdminUser();

        // Create a regular user for testing non-admin endpoints
        $this->regularUser = $this->createUser();
    }

    /**
     * Create a test workflow with stages and transitions
     *
     * @param User $user
     * @param array $attributes
     * @return Workflow The created workflow with stages and transitions
     */
    protected function createTestWorkflow(User $user, array $attributes = []): Workflow
    {
        // Create a workflow using the WorkflowService
        $workflow = $this->workflowService->createWorkflow([
            'name' => 'Test Workflow',
            'description' => 'A test workflow for admissions process',
            'application_type' => 'undergraduate',
        ], $user);

        // Create initial stage (e.g., 'Application Submission')
        $initialStage = $this->workflowService->createWorkflowStage($workflow, [
            'name' => 'Application Submission',
            'sequence' => 1,
        ], $user);

        // Create middle stage (e.g., 'Document Verification')
        $middleStage = $this->workflowService->createWorkflowStage($workflow, [
            'name' => 'Document Verification',
            'sequence' => 2,
        ], $user);

        // Create final stage (e.g., 'Review')
        $finalStage = $this->workflowService->createWorkflowStage($workflow, [
            'name' => 'Review',
            'sequence' => 3,
        ], $user);

        // Create transitions between stages
        $this->workflowService->createWorkflowTransition($initialStage, $middleStage, [
            'name' => 'To Verification',
        ], $user);

        $this->workflowService->createWorkflowTransition($middleStage, $finalStage, [
            'name' => 'To Review',
        ], $user);

        return $workflow;
    }

    /**
     * Test that an admin can list all workflows
     *
     * @return void
     */
    public function test_admin_can_list_workflows(): void
    {
        // Create multiple test workflows
        $this->createTestWorkflow($this->adminUser, ['name' => 'Workflow 1']);
        $this->createTestWorkflow($this->adminUser, ['name' => 'Workflow 2']);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Make GET request to /api/v1/admin/workflows
        $response = $this->getJson('/api/v1/admin/workflows');

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the created workflows
        $response->assertJsonFragment(['name' => 'Workflow 1']);
        $response->assertJsonFragment(['name' => 'Workflow 2']);

        // Assert response has the correct structure
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'description',
                    'application_type',
                    'is_active',
                    'created_by_user_id',
                    'created_at',
                    'updated_at',
                ],
            ],
            'links',
            'meta',
        ]);
    }

    /**
     * Test that an admin can create a new workflow
     *
     * @return void
     */
    public function test_admin_can_create_workflow(): void
    {
        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Prepare workflow data
        $workflowData = [
            'name' => 'New Workflow',
            'description' => 'A new workflow for testing',
            'application_type' => 'graduate',
        ];

        // Make POST request to /api/v1/admin/workflows with data
        $response = $this->postJson('/api/v1/admin/workflows', $workflowData);

        // Assert response status is 201
        $response->assertStatus(201);

        // Assert response contains the created workflow
        $response->assertJsonFragment(['name' => 'New Workflow']);

        // Assert workflow exists in database
        $this->assertDatabaseHas('workflows', ['name' => 'New Workflow']);
    }

    /**
     * Test that an admin can view a specific workflow
     *
     * @return void
     */
    public function test_admin_can_view_workflow(): void
    {
        // Create a test workflow
        $workflow = $this->createTestWorkflow($this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Make GET request to /api/v1/admin/workflows/{id}
        $response = $this->getJson("/api/v1/admin/workflows/{$workflow->id}");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the workflow details
        $response->assertJsonFragment(['name' => 'Test Workflow']);

        // Assert response includes stages and transitions
        $response->assertJsonStructure([
            'data' => [
                'id',
                'name',
                'description',
                'application_type',
                'is_active',
                'created_by_user_id',
                'created_at',
                'updated_at',
                'stages' => [
                    '*' => [
                        'id',
                        'workflow_id',
                        'name',
                        'description',
                        'sequence',
                        'required_documents',
                        'required_actions',
                        'notification_triggers',
                        'assigned_role_id',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Test that an admin can update a workflow
     *
     * @return void
     */
    public function test_admin_can_update_workflow(): void
    {
        // Create a test workflow
        $workflow = $this->createTestWorkflow($this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Prepare updated workflow data
        $updatedData = [
            'name' => 'Updated Workflow Name',
            'description' => 'Updated workflow description',
            'application_type' => 'graduate',
        ];

        // Make PUT request to /api/v1/admin/workflows/{id} with data
        $response = $this->putJson("/api/v1/admin/workflows/{$workflow->id}", $updatedData);

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the updated workflow
        $response->assertJsonFragment(['name' => 'Updated Workflow Name']);

        // Assert workflow is updated in database
        $this->assertDatabaseHas('workflows', ['id' => $workflow->id, 'name' => 'Updated Workflow Name']);
    }

    /**
     * Test that an admin can delete a workflow
     *
     * @return void
     */
    public function test_admin_can_delete_workflow(): void
    {
        // Create a test workflow
        $workflow = $this->createTestWorkflow($this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Make DELETE request to /api/v1/admin/workflows/{id}
        $response = $this->deleteJson("/api/v1/admin/workflows/{$workflow->id}");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert workflow is deleted from database
        $this->assertDatabaseMissing('workflows', ['id' => $workflow->id]);
    }

    /**
     * Test that an admin cannot delete an active workflow
     *
     * @return void
     */
    public function test_admin_cannot_delete_active_workflow(): void
    {
        // Create a test workflow
        $workflow = $this->createTestWorkflow($this->adminUser);

        // Activate the workflow
        $workflow->activate();

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Make DELETE request to /api/v1/admin/workflows/{id}
        $response = $this->deleteJson("/api/v1/admin/workflows/{$workflow->id}");

        // Assert response status is 422
        $response->assertStatus(422);

        // Assert workflow still exists in database
        $this->assertDatabaseHas('workflows', ['id' => $workflow->id]);
    }

    /**
     * Test that an admin can activate a workflow
     *
     * @return void
     */
    public function test_admin_can_activate_workflow(): void
    {
        // Create a test workflow
        $workflow = $this->createTestWorkflow($this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Make POST request to /api/v1/admin/workflows/{id}/activate
        $response = $this->postJson("/api/v1/admin/workflows/{$workflow->id}/activate");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert workflow is active in database
        $this->assertDatabaseHas('workflows', ['id' => $workflow->id, 'is_active' => true]);

        // Assert it is the active workflow for its type
        $this->assertEquals($workflow->id, Workflow::getActiveWorkflowForType('undergraduate')->id);
    }

    /**
     * Test that an admin can deactivate a workflow
     *
     * @return void
     */
    public function test_admin_can_deactivate_workflow(): void
    {
        // Create and activate a test workflow
        $workflow = $this->createTestWorkflow($this->adminUser);
        $workflow->activate();

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Make POST request to /api/v1/admin/workflows/{id}/deactivate
        $response = $this->postJson("/api/v1/admin/workflows/{$workflow->id}/deactivate");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert workflow is not active in database
        $this->assertDatabaseHas('workflows', ['id' => $workflow->id, 'is_active' => false]);
    }

    /**
     * Test that an admin can duplicate a workflow
     *
     * @return void
     */
    public function test_admin_can_duplicate_workflow(): void
    {
        // Create a test workflow with stages and transitions
        $workflow = $this->createTestWorkflow($this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Prepare duplication data with new name
        $duplicateData = ['name' => 'Duplicated Workflow'];

        // Make POST request to /api/v1/admin/workflows/{id}/duplicate with data
        $response = $this->postJson("/api/v1/admin/workflows/{$workflow->id}/duplicate", $duplicateData);

        // Assert response status is 201
        $response->assertStatus(201);

        // Assert response contains the duplicated workflow
        $response->assertJsonFragment(['name' => 'Duplicated Workflow']);

        // Assert duplicated workflow exists in database
        $duplicatedWorkflow = Workflow::where('name', 'Duplicated Workflow')->first();
        $this->assertNotNull($duplicatedWorkflow);

        // Assert duplicated workflow has the same stages and transitions
        $this->assertEquals($workflow->stages()->count(), $duplicatedWorkflow->stages()->count());
    }

    /**
     * Test that an admin can validate a workflow
     *
     * @return void
     */
    public function test_admin_can_validate_workflow(): void
    {
        // Create a test workflow with stages and transitions
        $workflow = $this->createTestWorkflow($this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Make GET request to /api/v1/admin/workflows/{id}/validate
        $response = $this->getJson("/api/v1/admin/workflows/{$workflow->id}/validate");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains validation results
        $response->assertJsonStructure([
            'data' => [
                'valid',
                'issues',
            ],
        ]);

        // Assert validation is successful for a valid workflow
        $response->assertJson(['data' => ['valid' => true]]);
    }

    /**
     * Test that an admin can create a workflow stage
     *
     * @return void
     */
    public function test_admin_can_create_workflow_stage(): void
    {
        // Create a test workflow
        $workflow = $this->createTestWorkflow($this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Prepare stage data
        $stageData = [
            'name' => 'New Stage',
            'description' => 'A new stage for testing',
        ];

        // Make POST request to /api/v1/admin/workflows/{id}/stages with data
        $response = $this->postJson("/api/v1/admin/workflows/{$workflow->id}/stages", $stageData);

        // Assert response status is 201
        $response->assertStatus(201);

        // Assert response contains the created stage
        $response->assertJsonFragment(['name' => 'New Stage']);

        // Assert stage exists in database
        $this->assertDatabaseHas('workflow_stages', ['workflow_id' => $workflow->id, 'name' => 'New Stage']);
    }

    /**
     * Test that an admin can update a workflow stage
     *
     * @return void
     */
    public function test_admin_can_update_workflow_stage(): void
    {
        // Create a test workflow with stages
        $workflow = $this->createTestWorkflow($this->adminUser);
        $stage = $workflow->stages()->first();

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Prepare updated stage data
        $updatedData = [
            'name' => 'Updated Stage Name',
            'description' => 'Updated stage description',
        ];

        // Make PUT request to /api/v1/admin/workflows/{id}/stages/{stageId} with data
        $response = $this->putJson("/api/v1/admin/workflows/{$workflow->id}/stages/{$stage->id}", $updatedData);

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the updated stage
        $response->assertJsonFragment(['name' => 'Updated Stage Name']);

        // Assert stage is updated in database
        $this->assertDatabaseHas('workflow_stages', ['id' => $stage->id, 'name' => 'Updated Stage Name']);
    }

    /**
     * Test that an admin can delete a workflow stage
     *
     * @return void
     */
    public function test_admin_can_delete_workflow_stage(): void
    {
        // Create a test workflow with stages
        $workflow = $this->createTestWorkflow($this->adminUser);
        $stage = $workflow->stages()->first();

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Make DELETE request to /api/v1/admin/workflows/{id}/stages/{stageId}
        $response = $this->deleteJson("/api/v1/admin/workflows/{$workflow->id}/stages/{$stage->id}");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert stage is deleted from database
        $this->assertDatabaseMissing('workflow_stages', ['id' => $stage->id]);
    }

    /**
     * Test that an admin can reorder workflow stages
     *
     * @return void
     */
    public function test_admin_can_reorder_workflow_stages(): void
    {
        // Create a test workflow with multiple stages
        $workflow = $this->createTestWorkflow($this->adminUser);
        $stage1 = $workflow->stages()->first();
        $stage2 = $this->workflowService->createWorkflowStage($workflow, ['name' => 'Second Stage', 'sequence' => 2], $this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Prepare reordering data with new sequence
        $reorderData = [
            $stage2->id,
            $stage1->id,
        ];

        // Make POST request to /api/v1/admin/workflows/{id}/stages/reorder with data
        $response = $this->postJson("/api/v1/admin/workflows/{$workflow->id}/stages/reorder", $reorderData);

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert stages have the new sequence in database
        $this->assertDatabaseHas('workflow_stages', ['id' => $stage1->id, 'sequence' => 2]);
        $this->assertDatabaseHas('workflow_stages', ['id' => $stage2->id, 'sequence' => 1]);
    }

    /**
     * Test that an admin can create a workflow transition
     *
     * @return void
     */
    public function test_admin_can_create_workflow_transition(): void
    {
        // Create a test workflow with stages
        $workflow = $this->createTestWorkflow($this->adminUser);
        $stage1 = $workflow->stages()->first();
        $stage2 = $this->workflowService->createWorkflowStage($workflow, ['name' => 'Second Stage', 'sequence' => 2], $this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Prepare transition data
        $transitionData = [
            'name' => 'New Transition',
            'target_stage_id' => $stage2->id,
        ];

        // Make POST request to /api/v1/admin/workflows/{id}/transitions with data
        $response = $this->postJson("/api/v1/admin/workflows/{$workflow->id}/transitions", $transitionData);

        // Assert response status is 201
        $response->assertStatus(201);

        // Assert response contains the created transition
        $response->assertJsonFragment(['name' => 'New Transition']);

        // Assert transition exists in database
        $this->assertDatabaseHas('workflow_transitions', ['source_stage_id' => $stage1->id, 'target_stage_id' => $stage2->id, 'name' => 'New Transition']);
    }

    /**
     * Test that an admin can update a workflow transition
     *
     * @return void
     */
    public function test_admin_can_update_workflow_transition(): void
    {
        // Create a test workflow with stages and transitions
        $workflow = $this->createTestWorkflow($this->adminUser);
        $stage1 = $workflow->stages()->first();
        $stage2 = $this->workflowService->createWorkflowStage($workflow, ['name' => 'Second Stage', 'sequence' => 2], $this->adminUser);
        $transition = $this->workflowService->createWorkflowTransition($stage1, $stage2, ['name' => 'Initial Transition'], $this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Prepare updated transition data
        $updatedData = [
            'name' => 'Updated Transition Name',
            'description' => 'Updated transition description',
        ];

        // Make PUT request to /api/v1/admin/workflows/{id}/transitions/{transitionId} with data
        $response = $this->putJson("/api/v1/admin/workflows/{$workflow->id}/transitions/{$transition->id}", $updatedData);

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the updated transition
        $response->assertJsonFragment(['name' => 'Updated Transition Name']);

        // Assert transition is updated in database
        $this->assertDatabaseHas('workflow_transitions', ['id' => $transition->id, 'name' => 'Updated Transition Name']);
    }

    /**
     * Test that an admin can delete a workflow transition
     *
     * @return void
     */
    public function test_admin_can_delete_workflow_transition(): void
    {
        // Create a test workflow with stages and transitions
        $workflow = $this->createTestWorkflow($this->adminUser);
        $stage1 = $workflow->stages()->first();
        $stage2 = $this->workflowService->createWorkflowStage($workflow, ['name' => 'Second Stage', 'sequence' => 2], $this->adminUser);
        $transition = $this->workflowService->createWorkflowTransition($stage1, $stage2, ['name' => 'Initial Transition'], $this->adminUser);

        // Authenticate as admin user
        $this->actingAs($this->adminUser);

        // Make DELETE request to /api/v1/admin/workflows/{id}/transitions/{transitionId}
        $response = $this->deleteJson("/api/v1/admin/workflows/{$workflow->id}/transitions/{$transition->id}");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert transition is deleted from database
        $this->assertDatabaseMissing('workflow_transitions', ['id' => $transition->id]);
    }

    /**
     * Test that a user can get the active workflow for an application type
     *
     * @return void
     */
    public function test_user_can_get_active_workflow(): void
    {
        // Create and activate a test workflow
        $workflow = $this->createTestWorkflow($this->adminUser);
        $workflow->activate();

        // Authenticate as regular user
        $this->actingAs($this->regularUser);

        // Make GET request to /api/v1/workflows/active with application_type parameter
        $response = $this->getJson("/api/v1/workflows/active?application_type=undergraduate");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the active workflow
        $response->assertJsonFragment(['name' => 'Test Workflow']);

        // Assert response includes stages
        $response->assertJsonStructure([
            'data' => [
                'id',
                'name',
                'description',
                'application_type',
                'is_active',
                'created_by_user_id',
                'created_at',
                'updated_at',
                'stages' => [
                    '*' => [
                        'id',
                        'workflow_id',
                        'name',
                        'description',
                        'sequence',
                        'required_documents',
                        'required_actions',
                        'notification_triggers',
                        'assigned_role_id',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Test that a user can get the workflow for a specific application
     *
     * @return void
     */
    public function test_user_can_get_application_workflow(): void
    {
        // Create and activate a test workflow
        $workflow = $this->createTestWorkflow($this->adminUser);
        $workflow->activate();

        // Create an application with the same application type
        $application = $this->createApplication($this->regularUser, ['application_type' => 'undergraduate']);

        // Authenticate as the application owner
        $this->actingAs($this->regularUser);

        // Make GET request to /api/v1/applications/{id}/workflow
        $response = $this->getJson("/api/v1/applications/{$application->id}/workflow");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the workflow
        $response->assertJsonFragment(['name' => 'Test Workflow']);

        // Assert response includes stages
        $response->assertJsonStructure([
            'data' => [
                'id',
                'name',
                'description',
                'application_type',
                'is_active',
                'created_by_user_id',
                'created_at',
                'updated_at',
                'stages' => [
                    '*' => [
                        'id',
                        'workflow_id',
                        'name',
                        'description',
                        'sequence',
                        'required_documents',
                        'required_actions',
                        'notification_triggers',
                        'assigned_role_id',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Test that a user can get the current status and possible transitions for an application
     *
     * @return void
     */
    public function test_user_can_get_application_status(): void
    {
        // Create and activate a test workflow with stages and transitions
        $workflow = $this->createTestWorkflow($this->adminUser);
        $workflow->activate();
        $initialStage = $workflow->getInitialStage();
        $middleStage = $workflow->stages()->where('sequence', 2)->first();
        $transition = $initialStage->outgoingTransitions()->first();

        // Create an application with the same application type
        $application = $this->createApplication($this->regularUser, ['application_type' => 'undergraduate']);

        // Set the application status to a specific workflow stage
        $application->update(['current_status_id' => $initialStage->id]);

        // Authenticate as the application owner
        $this->actingAs($this->regularUser);

        // Make GET request to /api/v1/applications/{id}/status
        $response = $this->getJson("/api/v1/applications/{$application->id}/status");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the current status
        $response->assertJsonFragment(['status' => 'draft']);

        // Assert response includes possible transitions
        $response->assertJsonStructure([
            'data' => [
                'current_status' => [
                    'id',
                    'application_id',
                    'workflow_stage_id',
                    'status',
                    'notes',
                    'created_by_user_id',
                    'created_at',
                ],
                'possible_transitions' => [
                    '*' => [
                        'id',
                        'source_stage_id',
                        'target_stage_id',
                        'name',
                        'description',
                        'transition_conditions',
                        'required_permissions',
                        'is_automatic',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Test that workflow stages correctly identify as initial or final
     *
     * @return void
     */
    public function test_workflow_stage_initial_and_final_detection(): void
    {
        // Create a test workflow with stages and transitions
        $workflow = $this->createTestWorkflow($this->adminUser);
        $initialStage = $workflow->getInitialStage();
        $middleStage = $workflow->stages()->where('sequence', 2)->first();
        $finalStage = $workflow->stages()->where('sequence', 3)->first();

        // Get the initial stage
        $this->assertEquals(1, $initialStage->sequence);

        // Assert isInitialStage() returns true for the initial stage
        $this->assertTrue($initialStage->isInitialStage());

        // Assert isInitialStage() returns false for other stages
        $this->assertFalse($middleStage->isInitialStage());
        $this->assertFalse($finalStage->isInitialStage());

        // Get the final stage
        $this->assertEquals(3, $finalStage->sequence);

        // Assert isFinalStage() returns true for the final stage
        $this->assertTrue($finalStage->isFinalStage());

        // Assert isFinalStage() returns false for other stages
        $this->assertFalse($initialStage->isFinalStage());
        $this->assertFalse($middleStage->isFinalStage());
    }

    /**
     * Test that workflow transitions correctly evaluate conditions
     *
     * @return void
     */
    public function test_workflow_transition_condition_evaluation(): void
    {
        // Create a test workflow with stages
        $workflow = $this->createTestWorkflow($this->adminUser);
        $initialStage = $workflow->getInitialStage();
        $middleStage = $workflow->stages()->where('sequence', 2)->first();

        // Create a transition with conditions
        $transition = $this->workflowService->createWorkflowTransition($initialStage, $middleStage, [
            'name' => 'Conditional Transition',
            'transition_conditions' => ['application_type' => 'undergraduate'],
        ], $this->adminUser);

        // Create an application that meets the conditions
        $application = $this->createApplication($this->regularUser, ['application_type' => 'undergraduate']);

        // Assert isAvailableFor() returns true for the application
        $this->assertTrue($transition->isAvailableFor($application));

        // Create an application that doesn't meet the conditions
        $application2 = $this->createApplication($this->regularUser, ['application_type' => 'graduate']);

        // Assert isAvailableFor() returns false for the application
        $this->assertFalse($transition->isAvailableFor($application2));
    }

    /**
     * Test that workflow transitions correctly check permissions
     *
     * @return void
     */
    public function test_workflow_transition_permission_checking(): void
    {
        // Create a test workflow with stages
        $workflow = $this->createTestWorkflow($this->adminUser);
        $initialStage = $workflow->getInitialStage();
        $middleStage = $workflow->stages()->where('sequence', 2)->first();

        // Create a transition with required permissions
        $transition = $this->workflowService->createWorkflowTransition($initialStage, $middleStage, [
            'name' => 'Permissioned Transition',
            'required_permissions' => [['action' => 'update', 'resource' => 'application']],
        ], $this->adminUser);

        // Create a user with the required permissions
        $userWithPermission = $this->createAdminUser();

        // Assert userHasPermission() returns true for the user
        $this->assertTrue($transition->userHasPermission($userWithPermission));

        // Create a user without the required permissions
        $userWithoutPermission = $this->createUser();

        // Assert userHasPermission() returns false for the user
        $this->assertFalse($transition->userHasPermission($userWithoutPermission));
    }

    /**
     * Test that automatic workflow transitions are correctly identified
     *
     * @return void
     */
    public function test_workflow_automatic_transitions(): void
    {
        // Create a test workflow with stages
        $workflow = $this->createTestWorkflow($this->adminUser);
        $initialStage = $workflow->getInitialStage();
        $middleStage = $workflow->stages()->where('sequence', 2)->first();

        // Create an automatic transition
        $automaticTransition = $this->workflowService->createWorkflowTransition($initialStage, $middleStage, [
            'name' => 'Automatic Transition',
            'is_automatic' => true,
        ], $this->adminUser);

        // Create a manual transition
        $manualTransition = $this->workflowService->createWorkflowTransition($initialStage, $middleStage, [
            'name' => 'Manual Transition',
            'is_automatic' => false,
        ], $this->adminUser);

        // Assert isAutomatic() returns true for the automatic transition
        $this->assertTrue($automaticTransition->isAutomatic());

        // Assert isAutomatic() returns false for the manual transition
        $this->assertFalse($manualTransition->isAutomatic());

        // Get automatic transitions for a stage
        $automaticTransitions = $initialStage->getAutomaticTransitions();

        // Assert the automatic transition is included
        $this->assertTrue($automaticTransitions->contains($automaticTransition));

        // Assert the manual transition is not included
        $this->assertFalse($automaticTransitions->contains($manualTransition));
    }
}