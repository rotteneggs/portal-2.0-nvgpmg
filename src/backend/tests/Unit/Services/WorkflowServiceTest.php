<?php

namespace Tests\Unit\Services;

use Illuminate\Foundation\Testing\RefreshDatabase; // Laravel ^10.0
use Tests\TestCase; // Base test case class with common testing functionality
use App\Services\WorkflowService; // The service class being tested
use App\Models\Workflow; // Model for workflow data
use App\Models\WorkflowStage; // Model for workflow stage data
use App\Models\WorkflowTransition; // Model for workflow transition data
use App\Models\User; // Model for user data, used for testing workflow operations that require a user
use App\Services\AuditService; // Service for logging workflow actions, mocked in tests
use App\Exceptions\WorkflowException; // Exception class for workflow-related errors
use Mockery; // Mocking library for creating test doubles
use Illuminate\Support\Facades\DB; // Database facade for transaction testing
use Illuminate\Support\Collection; // Collection class for testing return values

class WorkflowServiceTest extends TestCase
{
    /**
     * @var WorkflowService
     */
    protected WorkflowService $workflowService;

    /**
     * @var AuditService
     */
    protected AuditService $auditService;

    /**
     * @var User
     */
    protected User $user;

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

        // Create a mock for AuditService
        $this->auditService = Mockery::mock(AuditService::class);

        // Create a new WorkflowService instance with the mocked AuditService
        $this->workflowService = new WorkflowService($this->auditService);

        // Create a test user for workflow operations
        $this->user = $this->createUser();
    }

    /**
     * Test retrieving workflows with optional filtering
     *
     * @return void
     */
    public function test_get_workflows(): void
    {
        // Create multiple test workflows with different attributes
        $workflow1 = Workflow::factory()->create(['application_type' => 'undergraduate', 'is_active' => true]);
        $workflow2 = Workflow::factory()->create(['application_type' => 'graduate', 'is_active' => false]);
        $workflow3 = Workflow::factory()->create(['application_type' => 'undergraduate', 'is_active' => false, 'name' => 'Searchable Workflow']);

        // Test retrieving all workflows
        $workflows = $this->workflowService->getWorkflows();
        $this->assertCount(3, $workflows);

        // Test filtering by application type
        $workflows = $this->workflowService->getWorkflows(['application_type' => 'undergraduate']);
        $this->assertCount(2, $workflows);
        $this->assertEquals('undergraduate', $workflows[0]->application_type);

        // Test filtering by active status
        $workflows = $this->workflowService->getWorkflows(['is_active' => true]);
        $this->assertCount(1, $workflows);
        $this->assertTrue($workflows[0]->is_active);

        // Test filtering by search term
        $workflows = $this->workflowService->getWorkflows(['search' => 'Searchable']);
        $this->assertCount(1, $workflows);
        $this->assertEquals('Searchable Workflow', $workflows[0]->name);

        // Assert that the correct workflows are returned in each case
    }

    /**
     * Test retrieving a specific workflow by ID
     *
     * @return void
     */
    public function test_get_workflow_by_id(): void
    {
        // Create a test workflow
        $workflow = Workflow::factory()->create();

        // Retrieve the workflow by its ID
        $retrievedWorkflow = $this->workflowService->getWorkflowById($workflow->id);

        // Assert that the correct workflow is returned
        $this->assertEquals($workflow->id, $retrievedWorkflow->id);

        // Test retrieving a non-existent workflow
        $nonExistentWorkflow = $this->workflowService->getWorkflowById(999);

        // Assert that null is returned for a non-existent workflow
        $this->assertNull($nonExistentWorkflow);
    }

    /**
     * Test retrieving the active workflow for a specific application type
     *
     * @return void
     */
    public function test_get_active_workflow_for_type(): void
    {
        // Create multiple workflows for the same application type
        $workflow1 = Workflow::factory()->create(['application_type' => 'undergraduate', 'is_active' => false]);
        $workflow2 = Workflow::factory()->create(['application_type' => 'undergraduate', 'is_active' => true]);
        $workflow3 = Workflow::factory()->create(['application_type' => 'undergraduate', 'is_active' => false]);

        // Activate one of the workflows
        $workflow2->activate();

        // Retrieve the active workflow for the application type
        $activeWorkflow = $this->workflowService->getActiveWorkflowForType('undergraduate');

        // Assert that the correct workflow is returned
        $this->assertEquals($workflow2->id, $activeWorkflow->id);

        // Test retrieving an active workflow for a type with no active workflow
        $noActiveWorkflow = $this->workflowService->getActiveWorkflowForType('graduate');

        // Assert that null is returned when no active workflow exists
        $this->assertNull($noActiveWorkflow);
    }

    /**
     * Test creating a new workflow
     *
     * @return void
     */
    public function test_create_workflow(): void
    {
        // Define workflow data for creation
        $workflowData = [
            'name' => 'New Workflow',
            'description' => 'A new workflow for testing',
            'application_type' => 'undergraduate',
        ];

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('create', 'workflow', Mockery::any(), null, Mockery::subset(['name' => 'New Workflow', 'application_type' => 'undergraduate']), $this->user);

        // Create a new workflow using the service
        $workflow = $this->workflowService->createWorkflow($workflowData, $this->user);

        // Assert that the workflow was created with the correct attributes
        $this->assertEquals('New Workflow', $workflow->name);
        $this->assertEquals('undergraduate', $workflow->application_type);

        // Assert that the workflow is not active by default
        $this->assertFalse($workflow->is_active);

        // Assert that the audit log was called for the creation
    }

    /**
     * Test updating an existing workflow
     *
     * @return void
     */
    public function test_update_workflow(): void
    {
        // Create a test workflow
        $workflow = Workflow::factory()->create();

        // Define updated workflow data
        $updatedData = [
            'name' => 'Updated Workflow Name',
            'description' => 'Updated workflow description',
            'application_type' => 'graduate',
        ];

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('update', 'workflow', $workflow->id, null, Mockery::subset(['old' => Mockery::any(), 'new' => Mockery::any()]), $this->user);

        // Update the workflow using the service
        $updatedWorkflow = $this->workflowService->updateWorkflow($workflow, $updatedData, $this->user);

        // Assert that the workflow was updated with the correct attributes
        $this->assertEquals('Updated Workflow Name', $updatedWorkflow->name);
        $this->assertEquals('Updated workflow description', $updatedWorkflow->description);
        $this->assertEquals('graduate', $updatedWorkflow->application_type);

        // Assert that the audit log was called for the update
    }

    /**
     * Test deleting a workflow
     *
     * @return void
     */
    public function test_delete_workflow(): void
    {
        // Create a test workflow
        $workflow = Workflow::factory()->create();

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('delete', 'workflow', $workflow->id, null, Mockery::subset(['name' => $workflow->name, 'application_type' => $workflow->application_type]), $this->user);

        // Delete the workflow using the service
        $this->workflowService->deleteWorkflow($workflow, $this->user);

        // Assert that the workflow was deleted from the database
        $this->assertNull(Workflow::find($workflow->id));

        // Assert that the audit log was called for the deletion
    }

    /**
     * Test that deleting an active workflow throws an exception
     *
     * @return void
     */
    public function test_delete_active_workflow_throws_exception(): void
    {
        // Create a test workflow
        $workflow = Workflow::factory()->create();

        // Activate the workflow
        $workflow->activate();

        // Expect a WorkflowException when trying to delete the active workflow
        $this->expectException(WorkflowException::class);

        // Attempt to delete the active workflow
        $this->workflowService->deleteWorkflow($workflow, $this->user);

        // Assert that the exception is thrown
    }

    /**
     * Test activating a workflow
     *
     * @return void
     */
    public function test_activate_workflow(): void
    {
        // Create a test workflow
        $workflow = Workflow::factory()->create();

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('activate', 'workflow', $workflow->id, null, Mockery::subset(['name' => $workflow->name, 'application_type' => $workflow->application_type]), $this->user);

        // Activate the workflow using the service
        $this->workflowService->activateWorkflow($workflow, $this->user);

        // Assert that the workflow is now active
        $this->assertTrue($workflow->fresh()->is_active);

        // Assert that the audit log was called for the activation
    }

    /**
     * Test that activating a workflow deactivates the currently active workflow of the same type
     *
     * @return void
     */
    public function test_activate_workflow_deactivates_current_active(): void
    {
        // Create two workflows of the same application type
        $workflow1 = Workflow::factory()->create(['application_type' => 'undergraduate', 'is_active' => false]);
        $workflow2 = Workflow::factory()->create(['application_type' => 'undergraduate', 'is_active' => false]);

        // Activate the first workflow
        $this->workflowService->activateWorkflow($workflow1, $this->user);

        // Mock the AuditService to expect two log calls
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('deactivate', 'workflow', $workflow1->id, null, Mockery::subset(['name' => $workflow1->name, 'replaced_by' => $workflow2->name]), $this->user);

        $this->auditService->shouldReceive('log')
            ->once()
            ->with('activate', 'workflow', $workflow2->id, null, Mockery::subset(['name' => $workflow2->name, 'application_type' => $workflow2->application_type]), $this->user);

        // Activate the second workflow
        $this->workflowService->activateWorkflow($workflow2, $this->user);

        // Assert that the first workflow is now inactive
        $this->assertFalse($workflow1->fresh()->is_active);

        // Assert that the second workflow is now active
        $this->assertTrue($workflow2->fresh()->is_active);

        // Assert that the audit log was called for both operations
    }

    /**
     * Test deactivating a workflow
     *
     * @return void
     */
    public function test_deactivate_workflow(): void
    {
        // Create a test workflow
        $workflow = Workflow::factory()->create();

        // Activate the workflow
        $workflow->activate();

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('deactivate', 'workflow', $workflow->id, null, Mockery::subset(['name' => $workflow->name, 'application_type' => $workflow->application_type]), $this->user);

        // Deactivate the workflow using the service
        $this->workflowService->deactivateWorkflow($workflow, $this->user);

        // Assert that the workflow is now inactive
        $this->assertFalse($workflow->fresh()->is_active);

        // Assert that the audit log was called for the deactivation
    }

    /**
     * Test duplicating a workflow
     *
     * @return void
     */
    public function test_duplicate_workflow(): void
    {
        // Create a test workflow with stages and transitions
        $workflow = Workflow::factory()->create();
        $stage1 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 1]);
        $stage2 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 2]);
        WorkflowTransition::factory()->create(['source_stage_id' => $stage1->id, 'target_stage_id' => $stage2->id]);

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('duplicate', 'workflow', Mockery::any(), null, Mockery::subset(['name' => 'Duplicated Workflow', 'original_id' => $workflow->id, 'original_name' => $workflow->name]), $this->user);

        // Duplicate the workflow with a new name
        $duplicate = $this->workflowService->duplicateWorkflow($workflow, 'Duplicated Workflow', $this->user);

        // Assert that the duplicated workflow has the new name
        $this->assertEquals('Duplicated Workflow', $duplicate->name);

        // Assert that the duplicated workflow is not active
        $this->assertFalse($duplicate->is_active);

        // Assert that the stages and transitions were duplicated
        $this->assertCount(2, $duplicate->stages);
        $this->assertCount(1, WorkflowTransition::where('source_stage_id', $duplicate->stages[0]->id)->get());

        // Assert that the audit log was called for the duplication
    }

    /**
     * Test validating a workflow for completeness and correctness
     *
     * @return void
     */
    public function test_validate_workflow(): void
    {
        // Create a valid workflow with proper stages and transitions
        $workflow = Workflow::factory()->create();
        $stage1 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 1]);
        $stage2 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 2]);
        WorkflowTransition::factory()->create(['source_stage_id' => $stage1->id, 'target_stage_id' => $stage2->id]);

        // Validate the workflow using the service
        $validationResults = $this->workflowService->validateWorkflow($workflow);

        // Assert that the validation passes
        $this->assertTrue($validationResults['valid']);
        $this->assertEmpty($validationResults['issues']);

        // Create an invalid workflow (e.g., no stages)
        $invalidWorkflow = Workflow::factory()->create();

        // Validate the invalid workflow
        $invalidValidationResults = $this->workflowService->validateWorkflow($invalidWorkflow);

        // Assert that the validation fails with appropriate issues
        $this->assertFalse($invalidValidationResults['valid']);
        $this->assertNotEmpty($invalidValidationResults['issues']);
    }

    /**
     * Test retrieving stages for a specific workflow
     *
     * @return void
     */
    public function test_get_workflow_stages(): void
    {
        // Create a test workflow with multiple stages
        $workflow = Workflow::factory()->create();
        $stage1 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 1]);
        $stage2 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 2]);
        $stage3 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 3]);

        // Retrieve the stages using the service
        $stages = $this->workflowService->getWorkflowStages($workflow);

        // Assert that all stages are returned in the correct sequence
        $this->assertCount(3, $stages);
        $this->assertEquals($stage1->id, $stages[0]->id);
        $this->assertEquals($stage2->id, $stages[1]->id);
        $this->assertEquals($stage3->id, $stages[2]->id);
    }

    /**
     * Test creating a new workflow stage
     *
     * @return void
     */
    public function test_create_workflow_stage(): void
    {
        // Create a test workflow
        $workflow = Workflow::factory()->create();

        // Define stage data for creation
        $stageData = [
            'name' => 'New Stage',
            'description' => 'A new stage for testing',
            'required_documents' => ['transcript', 'personal_statement'],
            'required_actions' => ['review_documents'],
            'notification_triggers' => ['on_enter' => ['applicant', 'staff']],
            'assigned_role_id' => null,
        ];

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('create', 'workflow_stage', Mockery::any(), null, Mockery::subset(['name' => 'New Stage', 'workflow_id' => $workflow->id, 'workflow_name' => $workflow->name]), $this->user);

        // Create a new stage using the service
        $stage = $this->workflowService->createWorkflowStage($workflow, $stageData, $this->user);

        // Assert that the stage was created with the correct attributes
        $this->assertEquals('New Stage', $stage->name);
        $this->assertEquals($workflow->id, $stage->workflow_id);

        // Assert that the stage is assigned to the correct workflow
        $this->assertEquals($workflow->id, $stage->workflow_id);

        // Assert that the audit log was called for the creation
    }

    /**
     * Test updating an existing workflow stage
     *
     * @return void
     */
    public function test_update_workflow_stage(): void
    {
        // Create a test workflow with a stage
        $workflow = Workflow::factory()->create();
        $stage = WorkflowStage::factory()->create(['workflow_id' => $workflow->id]);

        // Define updated stage data
        $updatedData = [
            'name' => 'Updated Stage Name',
            'description' => 'Updated stage description',
            'required_documents' => ['transcript'],
            'required_actions' => ['verify_documents'],
            'notification_triggers' => ['on_enter' => ['applicant']],
            'assigned_role_id' => null,
        ];

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('update', 'workflow_stage', $stage->id, null, Mockery::subset(['old' => Mockery::any(), 'new' => Mockery::any(), 'workflow_id' => $stage->workflow_id]), $this->user);

        // Update the stage using the service
        $updatedStage = $this->workflowService->updateWorkflowStage($stage, $updatedData, $this->user);

        // Assert that the stage was updated with the correct attributes
        $this->assertEquals('Updated Stage Name', $updatedStage->name);
        $this->assertEquals('Updated stage description', $updatedStage->description);

        // Assert that the audit log was called for the update
    }

    /**
     * Test deleting a workflow stage
     *
     * @return void
     */
    public function test_delete_workflow_stage(): void
    {
        // Create a test workflow with multiple stages
        $workflow = Workflow::factory()->create();
        $stage1 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 1]);
        $stage2 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 2]);
        $stage3 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 3]);

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('delete', 'workflow_stage', $stage2->id, null, Mockery::subset(['name' => $stage2->name, 'workflow_id' => $workflow->id]), $this->user);

        // Delete one of the stages using the service
        $this->workflowService->deleteWorkflowStage($stage2, $this->user);

        // Assert that the stage was deleted from the database
        $this->assertNull(WorkflowStage::find($stage2->id));

        // Assert that the remaining stages were reordered correctly
        $this->assertEquals(1, $stage1->fresh()->sequence);
        $this->assertEquals(2, $stage3->fresh()->sequence);

        // Assert that the audit log was called for the deletion
    }

    /**
     * Test reordering the stages of a workflow
     *
     * @return void
     */
    public function test_reorder_workflow_stages(): void
    {
        // Create a test workflow with multiple stages
        $workflow = Workflow::factory()->create();
        $stage1 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 1]);
        $stage2 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 2]);
        $stage3 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 3]);

        // Define a new order for the stages
        $newOrder = [$stage3->id, $stage1->id, $stage2->id];

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('reorder', 'workflow_stages', $workflow->id, null, Mockery::subset(['workflow_id' => $workflow->id, 'new_order' => $newOrder]), $this->user);

        // Reorder the stages using the service
        $this->workflowService->reorderWorkflowStages($workflow, $newOrder, $this->user);

        // Assert that the stages have the new sequence numbers
        $this->assertEquals(1, $stage3->fresh()->sequence);
        $this->assertEquals(2, $stage1->fresh()->sequence);
        $this->assertEquals(3, $stage2->fresh()->sequence);

        // Assert that the audit log was called for the reordering
    }

    /**
     * Test retrieving transitions for a specific workflow with optional filtering
     *
     * @return void
     */
    public function test_get_workflow_transitions(): void
    {
        // Create a test workflow with stages and transitions
        $workflow = Workflow::factory()->create();
        $stage1 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 1]);
        $stage2 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 2]);
        $transition1 = WorkflowTransition::factory()->create(['source_stage_id' => $stage1->id, 'target_stage_id' => $stage2->id, 'is_automatic' => true]);
        $transition2 = WorkflowTransition::factory()->create(['source_stage_id' => $stage2->id, 'target_stage_id' => $stage1->id, 'is_automatic' => false]);

        // Test retrieving all transitions for the workflow
        $transitions = $this->workflowService->getWorkflowTransitions($workflow);
        $this->assertCount(2, $transitions);

        // Test filtering by source stage
        $transitions = $this->workflowService->getWorkflowTransitions($workflow, ['source_stage_id' => $stage1->id]);
        $this->assertCount(1, $transitions);
        $this->assertEquals($stage1->id, $transitions[0]->source_stage_id);

        // Test filtering by target stage
        $transitions = $this->workflowService->getWorkflowTransitions($workflow, ['target_stage_id' => $stage1->id]);
        $this->assertCount(1, $transitions);
        $this->assertEquals($stage1->id, $transitions[0]->target_stage_id);

        // Test filtering by automatic flag
        $transitions = $this->workflowService->getWorkflowTransitions($workflow, ['is_automatic' => true]);
        $this->assertCount(1, $transitions);
        $this->assertTrue($transitions[0]->is_automatic);

        // Assert that the correct transitions are returned in each case
    }

    /**
     * Test creating a new workflow transition between stages
     *
     * @return void
     */
    public function test_create_workflow_transition(): void
    {
        // Create a test workflow with multiple stages
        $workflow = Workflow::factory()->create();
        $stage1 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 1]);
        $stage2 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 2]);

        // Define transition data for creation
        $transitionData = [
            'name' => 'New Transition',
            'description' => 'A new transition for testing',
            'transition_conditions' => ['documents_verified' => true],
            'required_permissions' => [],
            'is_automatic' => false,
        ];

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('create', 'workflow_transition', Mockery::any(), null, Mockery::subset(['name' => 'New Transition', 'source_stage_id' => $stage1->id, 'source_stage_name' => $stage1->name, 'target_stage_id' => $stage2->id, 'target_stage_name' => $stage2->name, 'workflow_id' => $workflow->id]), $this->user);

        // Create a new transition using the service
        $transition = $this->workflowService->createWorkflowTransition($stage1, $stage2, $transitionData, $this->user);

        // Assert that the transition was created with the correct attributes
        $this->assertEquals('New Transition', $transition->name);
        $this->assertEquals($stage1->id, $transition->source_stage_id);
        $this->assertEquals($stage2->id, $transition->target_stage_id);

        // Assert that the transition connects the correct stages
        $this->assertEquals($stage1->id, $transition->sourceStage->id);
        $this->assertEquals($stage2->id, $transition->targetStage->id);

        // Assert that the audit log was called for the creation
    }

    /**
     * Test updating an existing workflow transition
     *
     * @return void
     */
    public function test_update_workflow_transition(): void
    {
        // Create a test workflow with stages and a transition
        $workflow = Workflow::factory()->create();
        $stage1 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 1]);
        $stage2 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 2]);
        $transition = WorkflowTransition::factory()->create(['source_stage_id' => $stage1->id, 'target_stage_id' => $stage2->id]);

        // Define updated transition data
        $updatedData = [
            'name' => 'Updated Transition Name',
            'description' => 'Updated transition description',
            'transition_conditions' => ['documents_verified' => false],
            'required_permissions' => [],
            'is_automatic' => true,
        ];

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('update', 'workflow_transition', $transition->id, null, Mockery::subset(['old' => Mockery::any(), 'new' => Mockery::any(), 'source_stage_id' => $transition->source_stage_id, 'target_stage_id' => $transition->target_stage_id]), $this->user);

        // Update the transition using the service
        $updatedTransition = $this->workflowService->updateWorkflowTransition($transition, $updatedData, $this->user);

        // Assert that the transition was updated with the correct attributes
        $this->assertEquals('Updated Transition Name', $updatedTransition->name);
        $this->assertEquals('Updated transition description', $updatedTransition->description);

        // Assert that the audit log was called for the update
    }

    /**
     * Test deleting a workflow transition
     *
     * @return void
     */
    public function test_delete_workflow_transition(): void
    {
        // Create a test workflow with stages and a transition
        $workflow = Workflow::factory()->create();
        $stage1 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 1]);
        $stage2 = WorkflowStage::factory()->create(['workflow_id' => $workflow->id, 'sequence' => 2]);
        $transition = WorkflowTransition::factory()->create(['source_stage_id' => $stage1->id, 'target_stage_id' => $stage2->id]);

        // Mock the AuditService to expect a log call
        $this->auditService->shouldReceive('log')
            ->once()
            ->with('delete', 'workflow_transition', $transition->id, null, Mockery::subset(['id' => $transition->id, 'name' => $transition->name, 'source_stage_id' => $transition->source_stage_id, 'target_stage_id' => $transition->target_stage_id]), $this->user);

        // Delete the transition using the service
        $this->workflowService->deleteWorkflowTransition($transition, $this->user);

        // Assert that the transition was deleted from the database
        $this->assertNull(WorkflowTransition::find($transition->id));

        // Assert that the audit log was called for the deletion
    }

    /**
     * Test that database transactions are rolled back on error
     *
     * @return void
     */
    public function test_transaction_rollback_on_error(): void
    {
        // Mock the AuditService to throw an exception
        $this->auditService->shouldReceive('log')
            ->andThrow(new Exception('Simulated error'));

        // Expect a WorkflowException when trying to create the workflow
        $this->expectException(Exception::class);

        // Attempt to create a workflow, which should fail
        try {
            $this->workflowService->createWorkflow([
                'name' => 'Test Workflow',
                'description' => 'A test workflow',
                'application_type' => 'undergraduate',
            ], $this->user);
        } catch (Exception $e) {
            // Assert that no workflow was created in the database due to transaction rollback
            $this->assertDatabaseCount('workflows', 0);
            throw $e; // Re-throw the exception to satisfy the expectException assertion
        }
    }
}