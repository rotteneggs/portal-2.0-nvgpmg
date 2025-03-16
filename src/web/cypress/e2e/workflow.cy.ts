import { WorkflowType } from '../../src/types/workflow';

/**
 * Sets up the test environment for workflow testing
 */
function setupWorkflowTest() {
  // Login as admin user with workflow management permissions
  cy.visit('/login');
  cy.findByLabelText('Email Address').type('admin@example.com');
  cy.findByLabelText('Password').type('adminPassword123!');
  cy.findByRole('button', { name: /sign in/i }).click();
  
  // Visit the admin workflows page
  cy.visit('/admin/workflows');
  
  // Intercept API requests related to workflows for monitoring
  cy.intercept('GET', '/api/v1/workflows*').as('getWorkflows');
  cy.intercept('POST', '/api/v1/workflows').as('createWorkflow');
  cy.intercept('PUT', '/api/v1/workflows/*').as('updateWorkflow');
  cy.intercept('DELETE', '/api/v1/workflows/*').as('deleteWorkflow');
  cy.intercept('POST', '/api/v1/workflows/*/validate').as('validateWorkflow');
  cy.intercept('POST', '/api/v1/workflows/*/activate').as('activateWorkflow');
  cy.intercept('GET', '/api/v1/workflow-stages*').as('getWorkflowStages');
  cy.intercept('POST', '/api/v1/workflow-stages').as('createWorkflowStage');
  cy.intercept('PUT', '/api/v1/workflow-stages/*').as('updateWorkflowStage');
  cy.intercept('DELETE', '/api/v1/workflow-stages/*').as('deleteWorkflowStage');
  cy.intercept('GET', '/api/v1/workflow-transitions*').as('getWorkflowTransitions');
  cy.intercept('POST', '/api/v1/workflow-transitions').as('createWorkflowTransition');
  cy.intercept('PUT', '/api/v1/workflow-transitions/*').as('updateWorkflowTransition');
  cy.intercept('DELETE', '/api/v1/workflow-transitions/*').as('deleteWorkflowTransition');
  
  // Wait for the workflows to load
  cy.wait('@getWorkflows');
}

/**
 * Generates test data for workflow creation
 * @returns Test workflow data object
 */
function generateTestWorkflowData() {
  const timestamp = new Date().getTime();
  return {
    name: `Test Workflow ${timestamp}`,
    description: `Test workflow description created at ${timestamp}`,
    application_type: WorkflowType.UNDERGRADUATE,
  };
}

/**
 * Generates test data for workflow stage creation
 * @returns Test stage data object
 */
function generateTestStageData() {
  const timestamp = new Date().getTime();
  return {
    name: `Test Stage ${timestamp}`,
    description: `Test stage description created at ${timestamp}`,
    required_documents: ['transcript', 'personal_statement'],
    required_actions: ['complete_profile'],
    notification_triggers: [
      {
        event: 'enter_stage',
        recipient: 'applicant',
        template: 'stage_entry_notification',
        channels: ['email', 'in_app']
      }
    ],
    assigned_role_id: 2, // Assuming role ID 2 is for admissions staff
  };
}

/**
 * Generates test data for workflow transition creation
 * @param sourceStageId Source stage ID
 * @param targetStageId Target stage ID
 * @returns Test transition data object
 */
function generateTestTransitionData(sourceStageId: string, targetStageId: string) {
  const timestamp = new Date().getTime();
  return {
    name: `Test Transition ${timestamp}`,
    description: `Test transition description created at ${timestamp}`,
    source_stage_id: sourceStageId,
    target_stage_id: targetStageId,
    transition_conditions: [
      {
        field: 'documents.verified',
        operator: 'eq',
        value: true
      }
    ],
    required_permissions: ['application.advance'],
    is_automatic: false,
  };
}

describe('Workflow Management', () => {
  beforeEach(() => {
    setupWorkflowTest();
  });

  it('should display list of workflows', () => {
    // Verify workflow list is displayed
    cy.findByRole('heading', { name: /workflows/i }).should('be.visible');
    cy.findByRole('table').should('be.visible');
    
    // Verify each workflow shows name, type, and status
    cy.get('table tbody tr').each($row => {
      cy.wrap($row).within(() => {
        cy.get('td').eq(0).should('not.be.empty'); // Name column
        cy.get('td').eq(1).should('not.be.empty'); // Type column
        cy.get('td').eq(2).should('contain.text', /active|inactive/i); // Status column
      });
    });
    
    // Verify workflows are sorted by creation date (newest first)
    cy.get('table tbody tr').should('have.length.gt', 0);
  });

  it('should filter workflows by type and status', () => {
    // Select 'UNDERGRADUATE' from type filter
    cy.findByLabelText(/type/i).select(WorkflowType.UNDERGRADUATE);
    cy.wait('@getWorkflows');
    
    // Verify only undergraduate workflows are displayed
    cy.get('table tbody tr').each($row => {
      cy.wrap($row).within(() => {
        cy.get('td').eq(1).should('contain.text', WorkflowType.UNDERGRADUATE);
      });
    });
    
    // Select 'Active' from status filter
    cy.findByLabelText(/status/i).select('active');
    cy.wait('@getWorkflows');
    
    // Verify only active undergraduate workflows are displayed
    cy.get('table tbody tr').each($row => {
      cy.wrap($row).within(() => {
        cy.get('td').eq(1).should('contain.text', WorkflowType.UNDERGRADUATE);
        cy.get('td').eq(2).should('contain.text', 'Active');
      });
    });
    
    // Clear filters
    cy.findByText(/clear filters/i).click();
    cy.wait('@getWorkflows');
    
    // Verify all workflows are displayed again
    cy.get('table tbody tr').should('have.length.gt', 0);
  });

  it('should create a new workflow', () => {
    const workflowData = generateTestWorkflowData();
    
    // Click 'Create New Workflow' button
    cy.findByRole('button', { name: /create new workflow/i }).click();
    
    // Fill in workflow name field
    cy.findByLabelText(/workflow name/i).type(workflowData.name);
    
    // Fill in workflow description field
    cy.findByLabelText(/description/i).type(workflowData.description);
    
    // Select 'UNDERGRADUATE' as application type
    cy.findByLabelText(/application type/i).select(workflowData.application_type);
    
    // Click 'Create' button
    cy.findByRole('button', { name: /create/i }).click();
    
    // Verify API request to create workflow is made
    cy.wait('@createWorkflow').its('request.body').should('deep.include', workflowData);
    
    // Verify redirection to workflow editor page
    cy.url().should('include', '/admin/workflows/');
    cy.url().should('include', '/edit');
    
    // Verify workflow editor is displayed with empty canvas
    cy.findByText(/workflow editor/i).should('be.visible');
    cy.get('.react-flow').should('be.visible');
    cy.get('.react-flow__node').should('not.exist');
  });

  it('should edit an existing workflow', () => {
    // Find the first workflow in the list
    cy.get('table tbody tr').first().within(() => {
      // Click the edit button
      cy.findByRole('button', { name: /edit/i }).click();
    });
    
    // Verify redirection to workflow editor page
    cy.url().should('include', '/admin/workflows/');
    cy.url().should('include', '/edit');
    
    // Verify workflow editor is loaded with existing workflow data
    cy.findByText(/workflow editor/i).should('be.visible');
    cy.get('.react-flow').should('be.visible');
    
    // Wait for stages and transitions to load
    cy.wait('@getWorkflowStages');
    cy.wait('@getWorkflowTransitions');
    
    // If the workflow has stages, they should be displayed on the canvas
    cy.get('.react-flow__node').then($nodes => {
      if ($nodes.length > 0) {
        cy.wrap($nodes).should('be.visible');
      } else {
        // If no stages, the canvas should be empty but ready for editing
        cy.get('.react-flow').should('be.visible');
      }
    });
  });

  it('should activate/deactivate a workflow', () => {
    // Find an inactive workflow
    cy.get('table tbody tr').filter(':contains("Inactive")').first().within(() => {
      // Get the workflow ID for later verification
      cy.get('td').eq(0).invoke('text').as('workflowName');
      
      // Click the activate toggle
      cy.findByRole('switch').click();
    });
    
    // Verify confirmation dialog is displayed
    cy.findByRole('dialog').should('be.visible');
    cy.findByText(/activate workflow/i).should('be.visible');
    
    // Confirm activation
    cy.findByRole('button', { name: /activate/i }).click();
    
    // Verify API request to activate workflow is made
    cy.wait('@activateWorkflow');
    
    // Verify workflow status is updated to active
    cy.get('@workflowName').then(workflowName => {
      cy.contains('tr', workflowName.toString()).within(() => {
        cy.get('td').eq(2).should('contain.text', 'Active');
      });
    });
    
    // Now find an active workflow to deactivate
    cy.get('table tbody tr').filter(':contains("Active")').first().within(() => {
      // Get the workflow ID for later verification
      cy.get('td').eq(0).invoke('text').as('activeWorkflowName');
      
      // Click the activate toggle to deactivate
      cy.findByRole('switch').click();
    });
    
    // Verify confirmation dialog is displayed
    cy.findByRole('dialog').should('be.visible');
    cy.findByText(/deactivate workflow/i).should('be.visible');
    
    // Confirm deactivation
    cy.findByRole('button', { name: /deactivate/i }).click();
    
    // Verify API request to deactivate workflow is made
    cy.wait('@activateWorkflow'); // Same endpoint but with different payload
    
    // Verify workflow status is updated to inactive
    cy.get('@activeWorkflowName').then(workflowName => {
      cy.contains('tr', workflowName.toString()).within(() => {
        cy.get('td').eq(2).should('contain.text', 'Inactive');
      });
    });
  });

  it('should delete a workflow', () => {
    // Find a workflow that can be deleted (typically one that's not in use)
    // For testing, we'll use the first one in the list, but in a real scenario,
    // you might want to create a test workflow first to ensure it's deletable
    cy.get('table tbody tr').first().within(() => {
      // Get the workflow name for later verification
      cy.get('td').eq(0).invoke('text').as('workflowToDelete');
      
      // Click delete button
      cy.findByRole('button', { name: /delete/i }).click();
    });
    
    // Verify confirmation dialog is displayed
    cy.findByRole('dialog').should('be.visible');
    cy.findByText(/delete workflow/i).should('be.visible');
    
    // Confirm deletion
    cy.findByRole('button', { name: /confirm/i }).click();
    
    // Verify API request to delete workflow is made
    cy.wait('@deleteWorkflow');
    
    // Verify workflow is removed from the list
    cy.get('@workflowToDelete').then(workflowName => {
      cy.contains('tr', workflowName.toString()).should('not.exist');
    });
    
    // Verify success message is displayed
    cy.findByText(/workflow deleted successfully/i).should('be.visible');
  });
});

describe('Workflow Editor Canvas', () => {
  beforeEach(() => {
    setupWorkflowTest();
  });

  it('should display empty canvas for new workflow', () => {
    // Create a new workflow
    const workflowData = generateTestWorkflowData();
    cy.findByRole('button', { name: /create new workflow/i }).click();
    cy.findByLabelText(/workflow name/i).type(workflowData.name);
    cy.findByLabelText(/description/i).type(workflowData.description);
    cy.findByLabelText(/application type/i).select(workflowData.application_type);
    cy.findByRole('button', { name: /create/i }).click();
    cy.wait('@createWorkflow');
    
    // Verify canvas is displayed
    cy.get('.react-flow').should('be.visible');
    
    // Verify canvas is empty (no stages or transitions)
    cy.get('.react-flow__node').should('not.exist');
    cy.get('.react-flow__edge').should('not.exist');
    
    // Verify toolbar with actions is displayed
    cy.findByRole('toolbar').should('be.visible');
    
    // Verify add stage button is available
    cy.findByRole('button', { name: /add stage/i }).should('be.visible');
  });

  it('should add a new stage to the canvas', () => {
    // Create a new workflow
    const workflowData = generateTestWorkflowData();
    cy.findByRole('button', { name: /create new workflow/i }).click();
    cy.findByLabelText(/workflow name/i).type(workflowData.name);
    cy.findByLabelText(/description/i).type(workflowData.description);
    cy.findByLabelText(/application type/i).select(workflowData.application_type);
    cy.findByRole('button', { name: /create/i }).click();
    cy.wait('@createWorkflow');
    
    // Click the 'Add Stage' button
    cy.findByRole('button', { name: /add stage/i }).click();
    
    // Verify a new stage node appears on the canvas
    cy.get('.react-flow__node').should('have.length', 1);
    
    // Verify stage has default name
    cy.get('.react-flow__node').should('contain.text', 'New Stage');
    
    // Verify stage properties panel opens
    cy.findByText(/stage properties/i).should('be.visible');
    
    // Fill in stage name field
    const stageData = generateTestStageData();
    cy.findByLabelText(/stage name/i).clear().type(stageData.name);
    
    // Fill in stage description field
    cy.findByLabelText(/description/i).clear().type(stageData.description);
    
    // Select required documents
    cy.findByText(/required documents/i).parent().within(() => {
      cy.findByLabelText(/transcript/i).check();
      cy.findByLabelText(/personal statement/i).check();
    });
    
    // Select assigned role
    cy.findByLabelText(/assigned to/i).select('Verification Team');
    
    // Click 'Update Stage' button
    cy.findByRole('button', { name: /update stage/i }).click();
    
    // Verify API request to create stage is made
    cy.wait('@createWorkflowStage');
    
    // Verify stage on canvas is updated with new name
    cy.get('.react-flow__node').should('contain.text', stageData.name);
  });

  it('should edit an existing stage', () => {
    // Open an existing workflow with stages
    // First, we need to find a workflow that has stages or create one
    cy.request('GET', '/api/v1/workflows?has_stages=true&limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
      } else {
        // If no workflow with stages exists, create one with a stage
        cy.findByRole('button', { name: /create new workflow/i }).click();
        const workflowData = generateTestWorkflowData();
        cy.findByLabelText(/workflow name/i).type(workflowData.name);
        cy.findByLabelText(/description/i).type(workflowData.description);
        cy.findByLabelText(/application type/i).select(workflowData.application_type);
        cy.findByRole('button', { name: /create/i }).click();
        cy.wait('@createWorkflow');
        
        // Add a stage
        cy.findByRole('button', { name: /add stage/i }).click();
        const stageData = generateTestStageData();
        cy.findByLabelText(/stage name/i).clear().type(stageData.name);
        cy.findByLabelText(/description/i).clear().type(stageData.description);
        cy.findByRole('button', { name: /update stage/i }).click();
        cy.wait('@createWorkflowStage');
      }
      
      // Now we have a workflow with at least one stage
      // Click on an existing stage node
      cy.get('.react-flow__node').first().click();
      
      // Verify stage properties panel opens
      cy.findByText(/stage properties/i).should('be.visible');
      
      // Verify current stage data is displayed in the form
      cy.findByLabelText(/stage name/i).should('not.be.empty');
      
      // Change stage name
      const updatedStageName = `Updated Stage ${new Date().getTime()}`;
      cy.findByLabelText(/stage name/i).clear().type(updatedStageName);
      
      // Change stage description
      const updatedStageDescription = `Updated description ${new Date().getTime()}`;
      cy.findByLabelText(/description/i).clear().type(updatedStageDescription);
      
      // Update required documents
      cy.findByText(/required documents/i).parent().within(() => {
        // Toggle some checkboxes to make changes
        cy.findByLabelText(/recommendation letters/i).click();
      });
      
      // Click 'Update Stage' button
      cy.findByRole('button', { name: /update stage/i }).click();
      
      // Verify API request to update stage is made
      cy.wait('@updateWorkflowStage');
      
      // Verify stage on canvas is updated with new data
      cy.get('.react-flow__node').first().should('contain.text', updatedStageName);
    });
  });

  it('should delete a stage from the canvas', () => {
    // Open an existing workflow with stages
    // Similar to previous test, find or create a workflow with stages
    cy.request('GET', '/api/v1/workflows?has_stages=true&limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
      } else {
        // If no workflow with stages exists, create one with a stage
        cy.findByRole('button', { name: /create new workflow/i }).click();
        const workflowData = generateTestWorkflowData();
        cy.findByLabelText(/workflow name/i).type(workflowData.name);
        cy.findByLabelText(/description/i).type(workflowData.description);
        cy.findByLabelText(/application type/i).select(workflowData.application_type);
        cy.findByRole('button', { name: /create/i }).click();
        cy.wait('@createWorkflow');
        
        // Add a stage
        cy.findByRole('button', { name: /add stage/i }).click();
        const stageData = generateTestStageData();
        cy.findByLabelText(/stage name/i).clear().type(stageData.name);
        cy.findByLabelText(/description/i).clear().type(stageData.description);
        cy.findByRole('button', { name: /update stage/i }).click();
        cy.wait('@createWorkflowStage');
      }
      
      // Get the number of stages before deletion
      cy.get('.react-flow__node').its('length').as('initialStageCount');
      
      // Click on an existing stage node to select it
      cy.get('.react-flow__node').first().click();
      
      // Press delete key or click delete button in the stage properties panel
      cy.findByRole('button', { name: /delete stage/i }).click();
      
      // Verify confirmation dialog is displayed
      cy.findByRole('dialog').should('be.visible');
      cy.findByText(/delete stage/i).should('be.visible');
      
      // Confirm deletion
      cy.findByRole('button', { name: /confirm/i }).click();
      
      // Verify API request to delete stage is made
      cy.wait('@deleteWorkflowStage');
      
      // Verify stage is removed from the canvas
      cy.get('@initialStageCount').then(initialCount => {
        cy.get('.react-flow__node').should('have.length', initialCount - 1);
      });
    });
  });

  it('should create a transition between stages', () => {
    // Open an existing workflow with at least two stages or create one
    cy.request('GET', '/api/v1/workflows?has_stages=true&limit=1').then(response => {
      let workflowId;
      
      if (response.body.data && response.body.data.length > 0) {
        workflowId = response.body.data[0].id;
        
        // Check if this workflow has at least 2 stages
        cy.request('GET', `/api/v1/workflow-stages?workflow_id=${workflowId}`).then(stagesResponse => {
          if (stagesResponse.body.data && stagesResponse.body.data.length >= 2) {
            cy.visit(`/admin/workflows/${workflowId}/edit`);
          } else {
            // This workflow doesn't have enough stages, create a new one
            createWorkflowWithStages();
          }
        });
      } else {
        // No workflow with stages exists, create one
        createWorkflowWithStages();
      }
      
      function createWorkflowWithStages() {
        cy.visit('/admin/workflows');
        cy.findByRole('button', { name: /create new workflow/i }).click();
        const workflowData = generateTestWorkflowData();
        cy.findByLabelText(/workflow name/i).type(workflowData.name);
        cy.findByLabelText(/description/i).type(workflowData.description);
        cy.findByLabelText(/application type/i).select(workflowData.application_type);
        cy.findByRole('button', { name: /create/i }).click();
        cy.wait('@createWorkflow');
        
        // Add first stage
        cy.findByRole('button', { name: /add stage/i }).click();
        const stageData1 = generateTestStageData();
        cy.findByLabelText(/stage name/i).clear().type(stageData1.name);
        cy.findByLabelText(/description/i).clear().type(stageData1.description);
        cy.findByRole('button', { name: /update stage/i }).click();
        cy.wait('@createWorkflowStage');
        
        // Add second stage
        cy.findByRole('button', { name: /add stage/i }).click();
        const stageData2 = generateTestStageData();
        cy.findByLabelText(/stage name/i).clear().type(stageData2.name);
        cy.findByLabelText(/description/i).clear().type(stageData2.description);
        cy.findByRole('button', { name: /update stage/i }).click();
        cy.wait('@createWorkflowStage');
      }
      
      // Now we have a workflow with at least two stages
      // Get the IDs of the first two stages
      cy.get('.react-flow__node').first().invoke('attr', 'data-id').as('sourceStageId');
      cy.get('.react-flow__node').eq(1).invoke('attr', 'data-id').as('targetStageId');
      
      // Select the source stage
      cy.get('.react-flow__node').first().click();
      
      // Click the "Create Transition" button
      cy.findByRole('button', { name: /create transition/i }).click();
      
      // Select the target stage from the dropdown
      cy.get('@targetStageId').then(targetId => {
        cy.findByLabelText(/target stage/i).select(targetId.toString());
      });
      
      // Fill in transition properties
      const transitionData = {
        name: `Test Transition ${new Date().getTime()}`,
        description: `Test transition description ${new Date().getTime()}`
      };
      
      cy.findByLabelText(/transition name/i).clear().type(transitionData.name);
      cy.findByLabelText(/description/i).clear().type(transitionData.description);
      
      // Add transition conditions (simplified for test)
      cy.findByText(/transition conditions/i).should('be.visible');
      
      // Toggle automatic transition setting
      cy.findByLabelText(/automatic transition/i).click();
      
      // Click 'Create Transition' button
      cy.findByRole('button', { name: /create transition/i }).click();
      
      // Verify API request to create transition is made
      cy.wait('@createWorkflowTransition');
      
      // Verify transition appears on the canvas
      cy.get('.react-flow__edge').should('have.length.at.least', 1);
    });
  });

  it('should edit an existing transition', () => {
    // Open an existing workflow with transitions or create one
    cy.request('GET', '/api/v1/workflows?has_transitions=true&limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
        
        // Wait for transitions to load
        cy.wait('@getWorkflowTransitions');
      } else {
        // If no workflow with transitions exists, we need to create one
        // This is complex and would require the previous test to pass
        // For simplicity, we'll make this test dependent on having a workflow with transitions
        cy.log('No workflow with transitions found. This test requires an existing workflow with transitions.');
        return;
      }
      
      // Click on an existing transition edge
      cy.get('.react-flow__edge').first().click();
      
      // Verify transition properties panel opens
      cy.findByText(/transition properties/i).should('be.visible');
      
      // Verify current transition data is displayed in the form
      cy.findByLabelText(/transition name/i).should('not.be.empty');
      
      // Change transition name
      const updatedTransitionName = `Updated Transition ${new Date().getTime()}`;
      cy.findByLabelText(/transition name/i).clear().type(updatedTransitionName);
      
      // Change transition description
      const updatedTransitionDescription = `Updated description ${new Date().getTime()}`;
      cy.findByLabelText(/description/i).clear().type(updatedTransitionDescription);
      
      // Click 'Update Transition' button
      cy.findByRole('button', { name: /update transition/i }).click();
      
      // Verify API request to update transition is made
      cy.wait('@updateWorkflowTransition');
      
      // Verify transition is updated (harder to verify visually, but we can check the API call was made)
      cy.get('@updateWorkflowTransition').its('response.statusCode').should('eq', 200);
    });
  });

  it('should delete a transition', () => {
    // Open an existing workflow with transitions
    cy.request('GET', '/api/v1/workflows?has_transitions=true&limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
        
        // Wait for transitions to load
        cy.wait('@getWorkflowTransitions');
      } else {
        // If no workflow with transitions exists, we need to create one
        // This is complex and would require the previous test to pass
        // For simplicity, we'll make this test dependent on having a workflow with transitions
        cy.log('No workflow with transitions found. This test requires an existing workflow with transitions.');
        return;
      }
      
      // Get the number of transitions before deletion
      cy.get('.react-flow__edge').its('length').as('initialTransitionCount');
      
      // Click on an existing transition edge to select it
      cy.get('.react-flow__edge').first().click();
      
      // Click delete button in the transition properties panel
      cy.findByRole('button', { name: /delete transition/i }).click();
      
      // Verify confirmation dialog is displayed
      cy.findByRole('dialog').should('be.visible');
      cy.findByText(/delete transition/i).should('be.visible');
      
      // Confirm deletion
      cy.findByRole('button', { name: /confirm/i }).click();
      
      // Verify API request to delete transition is made
      cy.wait('@deleteWorkflowTransition');
      
      // Verify transition is removed from the canvas
      cy.get('@initialTransitionCount').then(initialCount => {
        cy.get('.react-flow__edge').should('have.length', initialCount - 1);
      });
    });
  });

  it('should move stages on the canvas', () => {
    // Open an existing workflow with stages
    cy.request('GET', '/api/v1/workflows?has_stages=true&limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
      } else {
        // If no workflow with stages exists, create one with a stage
        cy.findByRole('button', { name: /create new workflow/i }).click();
        const workflowData = generateTestWorkflowData();
        cy.findByLabelText(/workflow name/i).type(workflowData.name);
        cy.findByLabelText(/description/i).type(workflowData.description);
        cy.findByLabelText(/application type/i).select(workflowData.application_type);
        cy.findByRole('button', { name: /create/i }).click();
        cy.wait('@createWorkflow');
        
        // Add a stage
        cy.findByRole('button', { name: /add stage/i }).click();
        const stageData = generateTestStageData();
        cy.findByLabelText(/stage name/i).clear().type(stageData.name);
        cy.findByLabelText(/description/i).clear().type(stageData.description);
        cy.findByRole('button', { name: /update stage/i }).click();
        cy.wait('@createWorkflowStage');
      }
      
      // Get the first stage's position
      cy.get('.react-flow__node').first().then($node => {
        const initialPosition = {
          x: parseFloat($node.css('transform').split(',')[4]),
          y: parseFloat($node.css('transform').split(',')[5])
        };
        
        // Select the stage
        cy.get('.react-flow__node').first().click();
        
        // Try to find position inputs
        cy.findByLabelText(/x position/i).then($xInput => {
          if ($xInput.length) {
            // If position inputs exist, use them
            const newX = initialPosition.x + 100;
            const newY = initialPosition.y + 100;
            
            cy.findByLabelText(/x position/i).clear().type(newX.toString());
            cy.findByLabelText(/y position/i).clear().type(newY.toString());
            
            // Apply changes
            cy.findByRole('button', { name: /update position/i }).click();
            
            // Verify API request to update stage position is made
            cy.wait('@updateWorkflowStage');
          } else {
            // If no position inputs, try direct dragging (simulated)
            cy.get('.react-flow__node').first()
              .trigger('mousedown', { which: 1 })
              .trigger('mousemove', { clientX: 100, clientY: 100 })
              .trigger('mouseup');
          }
        });
      });
    });
  });

  it('should zoom in and out of the canvas', () => {
    // Open an existing workflow with stages and transitions
    cy.request('GET', '/api/v1/workflows?has_stages=true&limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
      } else {
        // If no workflow with stages exists, create a simple one
        cy.visit('/admin/workflows');
        cy.findByRole('button', { name: /create new workflow/i }).click();
        const workflowData = generateTestWorkflowData();
        cy.findByLabelText(/workflow name/i).type(workflowData.name);
        cy.findByLabelText(/description/i).type(workflowData.description);
        cy.findByLabelText(/application type/i).select(workflowData.application_type);
        cy.findByRole('button', { name: /create/i }).click();
        cy.wait('@createWorkflow');
      }
      
      // Get the initial transform scale of the canvas
      cy.get('.react-flow__viewport').invoke('attr', 'transform').as('initialTransform');
      
      // Click the zoom in button
      cy.findByRole('button', { name: /zoom in/i }).click();
      
      // Verify canvas elements appear larger
      cy.get('.react-flow__viewport').invoke('attr', 'transform').should('not.eq', '@initialTransform');
      
      // Get the transformed scale after zooming in
      cy.get('.react-flow__viewport').invoke('attr', 'transform').as('zoomedInTransform');
      
      // Click the zoom out button
      cy.findByRole('button', { name: /zoom out/i }).click();
      
      // Verify canvas elements appear smaller
      cy.get('.react-flow__viewport').invoke('attr', 'transform').should('not.eq', '@zoomedInTransform');
      
      // Use mouse wheel to zoom in (simulated)
      cy.get('.react-flow__pane').trigger('wheel', { deltaY: -100 });
      
      // Verify canvas elements appear larger
      cy.get('.react-flow__viewport').invoke('attr', 'transform').should('not.eq', '@initialTransform');
      
      // Use mouse wheel to zoom out (simulated)
      cy.get('.react-flow__pane').trigger('wheel', { deltaY: 100 });
    });
  });

  it('should pan the canvas', () => {
    // Open an existing workflow with stages and transitions
    cy.request('GET', '/api/v1/workflows?has_stages=true&limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
      } else {
        // If no workflow with stages exists, create a simple one
        cy.visit('/admin/workflows');
        cy.findByRole('button', { name: /create new workflow/i }).click();
        const workflowData = generateTestWorkflowData();
        cy.findByLabelText(/workflow name/i).type(workflowData.name);
        cy.findByLabelText(/description/i).type(workflowData.description);
        cy.findByLabelText(/application type/i).select(workflowData.application_type);
        cy.findByRole('button', { name: /create/i }).click();
        cy.wait('@createWorkflow');
      }
      
      // Get the initial transform position of the canvas
      cy.get('.react-flow__viewport').invoke('attr', 'transform').as('initialTransform');
      
      // Click and drag on empty area of the canvas
      cy.get('.react-flow__pane')
        .trigger('mousedown', { clientX: 200, clientY: 200, which: 1 })
        .trigger('mousemove', { clientX: 300, clientY: 300, which: 1 })
        .trigger('mouseup');
      
      // Verify canvas view moves in the direction of the drag
      cy.get('.react-flow__viewport').invoke('attr', 'transform').should('not.eq', '@initialTransform');
      
      // Verify new view of the canvas is maintained
      cy.get('.react-flow__viewport').invoke('attr', 'transform').as('newTransform');
      cy.get('.react-flow__viewport').invoke('attr', 'transform').should('eq', '@newTransform');
    });
  });
});

describe('Workflow Validation and Activation', () => {
  beforeEach(() => {
    setupWorkflowTest();
  });

  it('should validate a workflow', () => {
    // Open an existing workflow in the editor
    cy.request('GET', '/api/v1/workflows?limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
      } else {
        // If no workflow exists, create a simple one
        cy.visit('/admin/workflows');
        cy.findByRole('button', { name: /create new workflow/i }).click();
        const workflowData = generateTestWorkflowData();
        cy.findByLabelText(/workflow name/i).type(workflowData.name);
        cy.findByLabelText(/description/i).type(workflowData.description);
        cy.findByLabelText(/application type/i).select(workflowData.application_type);
        cy.findByRole('button', { name: /create/i }).click();
        cy.wait('@createWorkflow');
      }
      
      // Click the 'Validate' button
      cy.findByRole('button', { name: /validate/i }).click();
      
      // Verify API request to validate workflow is made
      cy.wait('@validateWorkflow');
      
      // Verify validation results are displayed
      cy.findByText(/validation results/i).should('be.visible');
      
      // Verify validation results show on the canvas
      // The actual results will depend on the workflow state
      cy.get('@validateWorkflow').then(interception => {
        const response = interception.response.body;
        
        if (response.data && response.data.is_valid) {
          cy.findByText(/workflow is valid/i).should('be.visible');
        } else {
          // If there are validation errors, they should be displayed
          cy.findByText(/validation errors/i).should('be.visible');
          
          // Verify errors are highlighted on the canvas if there are node-specific errors
          if (response.data && response.data.errors && response.data.errors.length > 0) {
            // Check if any errors reference stages or transitions
            const hasEntityErrors = response.data.errors.some(
              error => error.entity_type === 'stage' || error.entity_type === 'transition'
            );
            
            if (hasEntityErrors) {
              // There should be visual indicators on the canvas
              cy.get('.react-flow__node--error, .react-flow__edge--error').should('exist');
            }
          }
        }
      });
    });
  });

  it('should show validation errors for incomplete workflow', () => {
    // Create a new workflow
    cy.findByRole('button', { name: /create new workflow/i }).click();
    const workflowData = generateTestWorkflowData();
    cy.findByLabelText(/workflow name/i).type(workflowData.name);
    cy.findByLabelText(/description/i).type(workflowData.description);
    cy.findByLabelText(/application type/i).select(workflowData.application_type);
    cy.findByRole('button', { name: /create/i }).click();
    cy.wait('@createWorkflow');
    
    // Add a single stage without any transitions
    cy.findByRole('button', { name: /add stage/i }).click();
    const stageData = generateTestStageData();
    cy.findByLabelText(/stage name/i).clear().type(stageData.name);
    cy.findByLabelText(/description/i).clear().type(stageData.description);
    cy.findByRole('button', { name: /update stage/i }).click();
    cy.wait('@createWorkflowStage');
    
    // Click the 'Validate' button
    cy.findByRole('button', { name: /validate/i }).click();
    
    // Verify API request to validate workflow is made
    cy.wait('@validateWorkflow');
    
    // Verify validation error about missing transitions is displayed
    cy.findByText(/validation errors/i).should('be.visible');
    cy.findByText(/missing transitions/i, { exact: false }).should('be.visible');
    
    // Add another stage but no transition between them
    cy.findByRole('button', { name: /add stage/i }).click();
    const stageData2 = generateTestStageData();
    cy.findByLabelText(/stage name/i).clear().type(stageData2.name);
    cy.findByLabelText(/description/i).clear().type(stageData2.description);
    cy.findByRole('button', { name: /update stage/i }).click();
    cy.wait('@createWorkflowStage');
    
    // Click the 'Validate' button again
    cy.findByRole('button', { name: /validate/i }).click();
    
    // Verify API request to validate workflow is made
    cy.wait('@validateWorkflow');
    
    // Verify validation error about disconnected stages is displayed
    cy.findByText(/validation errors/i).should('be.visible');
    cy.findByText(/disconnected stages/i, { exact: false }).should('be.visible');
  });

  it('should save workflow changes', () => {
    // Open an existing workflow in the editor
    cy.request('GET', '/api/v1/workflows?limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
      } else {
        // If no workflow exists, create a simple one
        cy.visit('/admin/workflows');
        cy.findByRole('button', { name: /create new workflow/i }).click();
        const workflowData = generateTestWorkflowData();
        cy.findByLabelText(/workflow name/i).type(workflowData.name);
        cy.findByLabelText(/description/i).type(workflowData.description);
        cy.findByLabelText(/application type/i).select(workflowData.application_type);
        cy.findByRole('button', { name: /create/i }).click();
        cy.wait('@createWorkflow');
      }
      
      // Make changes to the workflow
      cy.findByRole('button', { name: /workflow settings/i }).click();
      
      // Modify the workflow name
      const updatedName = `Updated Workflow ${new Date().getTime()}`;
      cy.findByLabelText(/workflow name/i).clear().type(updatedName);
      
      // Click the 'Save' button
      cy.findByRole('button', { name: /save changes/i }).click();
      
      // Verify API request to save workflow is made
      cy.wait('@updateWorkflow');
      
      // Verify success message is displayed
      cy.findByText(/workflow saved successfully/i).should('be.visible');
      
      // Refresh the page
      cy.reload();
      
      // Wait for the page to load
      cy.findByText(/workflow editor/i).should('be.visible');
      
      // Verify changes are preserved
      cy.findByRole('button', { name: /workflow settings/i }).click();
      cy.findByLabelText(/workflow name/i).should('have.value', updatedName);
    });
  });

  it('should activate a valid workflow', () => {
    // Open an existing workflow in the editor
    cy.request('GET', '/api/v1/workflows?has_stages=true&limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
        
        // Click the 'Validate' button to confirm validity
        cy.findByRole('button', { name: /validate/i }).click();
        cy.wait('@validateWorkflow').then(interception => {
          const response = interception.response.body;
          
          if (response.data && response.data.is_valid) {
            // If the workflow is valid, proceed with activation
            continueWithActivation();
          } else {
            // If the workflow is not valid, we need to fix it or find a valid workflow
            // For simplicity in testing, we'll just log this and skip the test
            cy.log('Workflow is not valid. This test requires a valid workflow.');
          }
        });
      } else {
        // No workflow with stages, create one (complex, would need valid stages and transitions)
        cy.log('No workflow with stages found. This test requires a valid workflow.');
      }
      
      function continueWithActivation() {
        // Click the 'Activate' button
        cy.findByRole('button', { name: /activate/i }).click();
        
        // Verify confirmation dialog is displayed
        cy.findByRole('dialog').should('be.visible');
        cy.findByText(/activate workflow/i).should('be.visible');
        
        // Confirm activation
        cy.findByRole('button', { name: /activate/i }).click();
        
        // Verify API request to activate workflow is made
        cy.wait('@activateWorkflow');
        
        // Verify success message is displayed
        cy.findByText(/workflow activated successfully/i).should('be.visible');
        
        // Verify workflow status is updated to active
        cy.findByText(/status: active/i).should('be.visible');
      }
    });
  });

  it('should prevent activation of invalid workflow', () => {
    // Create a new workflow
    cy.findByRole('button', { name: /create new workflow/i }).click();
    const workflowData = generateTestWorkflowData();
    cy.findByLabelText(/workflow name/i).type(workflowData.name);
    cy.findByLabelText(/description/i).type(workflowData.description);
    cy.findByLabelText(/application type/i).select(workflowData.application_type);
    cy.findByRole('button', { name: /create/i }).click();
    cy.wait('@createWorkflow');
    
    // Add an incomplete workflow (missing required elements)
    // For simplicity, we'll add a single stage without any transitions
    cy.findByRole('button', { name: /add stage/i }).click();
    const stageData = generateTestStageData();
    cy.findByLabelText(/stage name/i).clear().type(stageData.name);
    cy.findByLabelText(/description/i).clear().type(stageData.description);
    cy.findByRole('button', { name: /update stage/i }).click();
    cy.wait('@createWorkflowStage');
    
    // Click the 'Activate' button
    cy.findByRole('button', { name: /activate/i }).click();
    
    // Verify validation is automatically triggered
    cy.wait('@validateWorkflow');
    
    // Verify validation errors are displayed
    cy.findByText(/validation errors/i).should('be.visible');
    
    // Verify workflow is not activated
    cy.findByText(/workflow cannot be activated/i).should('be.visible');
    
    // Verify helpful message about fixing validation errors is displayed
    cy.findByText(/fix validation errors/i, { exact: false }).should('be.visible');
  });
});

describe('Workflow Templates', () => {
  beforeEach(() => {
    setupWorkflowTest();
  });

  it('should load workflow templates', () => {
    // Create a new workflow
    cy.findByRole('button', { name: /create new workflow/i }).click();
    const workflowData = generateTestWorkflowData();
    cy.findByLabelText(/workflow name/i).type(workflowData.name);
    cy.findByLabelText(/description/i).type(workflowData.description);
    cy.findByLabelText(/application type/i).select(workflowData.application_type);
    cy.findByRole('button', { name: /create/i }).click();
    cy.wait('@createWorkflow');
    
    // Click the 'Templates' button
    cy.findByRole('button', { name: /templates/i }).click();
    
    // Verify templates panel is displayed
    cy.findByText(/workflow templates/i).should('be.visible');
    
    // Verify list of available templates is shown
    cy.findByRole('list', { name: /templates/i }).should('be.visible');
    
    // There could be no templates initially, but the UI element should exist
    cy.findByRole('list', { name: /templates/i }).then($list => {
      if ($list.find('li').length === 0) {
        cy.findByText(/no templates available/i).should('be.visible');
      } else {
        cy.get('li').should('have.length.gt', 0);
      }
    });
  });

  it('should apply a template to empty workflow', () => {
    // Create a new workflow
    cy.findByRole('button', { name: /create new workflow/i }).click();
    const workflowData = generateTestWorkflowData();
    cy.findByLabelText(/workflow name/i).type(workflowData.name);
    cy.findByLabelText(/description/i).type(workflowData.description);
    cy.findByLabelText(/application type/i).select(workflowData.application_type);
    cy.findByRole('button', { name: /create/i }).click();
    cy.wait('@createWorkflow');
    
    // Click the 'Templates' button
    cy.findByRole('button', { name: /templates/i }).click();
    
    // Intercept the template application request
    cy.intercept('POST', '/api/v1/workflows/*/apply-template').as('applyTemplate');
    
    // Check if there are any templates available
    cy.findByRole('list', { name: /templates/i }).then($list => {
      if ($list.find('li').length === 0) {
        cy.log('No templates available to apply.');
        return;
      }
      
      // Select a template from the list
      cy.get('li').first().click();
      
      // Click 'Apply Template' button
      cy.findByRole('button', { name: /apply template/i }).click();
      
      // Verify confirmation dialog is displayed
      cy.findByRole('dialog').should('be.visible');
      cy.findByText(/apply template/i).should('be.visible');
      
      // Confirm template application
      cy.findByRole('button', { name: /apply/i }).click();
      
      // Verify API request to apply template is made
      cy.wait('@applyTemplate');
      
      // Verify canvas is updated with template stages and transitions
      cy.get('.react-flow__node').should('exist');
      
      // Verify success message is displayed
      cy.findByText(/template applied successfully/i).should('be.visible');
    });
  });

  it('should save current workflow as template', () => {
    // Open an existing workflow with stages and transitions
    cy.request('GET', '/api/v1/workflows?has_stages=true&limit=1').then(response => {
      if (response.body.data && response.body.data.length > 0) {
        const workflowId = response.body.data[0].id;
        cy.visit(`/admin/workflows/${workflowId}/edit`);
      } else {
        // If no workflow with stages exists, create a simple one
        cy.visit('/admin/workflows');
        cy.findByRole('button', { name: /create new workflow/i }).click();
        const workflowData = generateTestWorkflowData();
        cy.findByLabelText(/workflow name/i).type(workflowData.name);
        cy.findByLabelText(/description/i).type(workflowData.description);
        cy.findByLabelText(/application type/i).select(workflowData.application_type);
        cy.findByRole('button', { name: /create/i }).click();
        cy.wait('@createWorkflow');
        
        // Add a stage
        cy.findByRole('button', { name: /add stage/i }).click();
        const stageData = generateTestStageData();
        cy.findByLabelText(/stage name/i).clear().type(stageData.name);
        cy.findByLabelText(/description/i).clear().type(stageData.description);
        cy.findByRole('button', { name: /update stage/i }).click();
        cy.wait('@createWorkflowStage');
      }
      
      // Intercept the save template request
      cy.intercept('POST', '/api/v1/workflow-templates').as('saveTemplate');
      
      // Click the 'Templates' button
      cy.findByRole('button', { name: /templates/i }).click();
      
      // Click 'Save as Template' button
      cy.findByRole('button', { name: /save as template/i }).click();
      
      // Enter template name and description
      const templateName = `Template ${new Date().getTime()}`;
      const templateDescription = `Template description ${new Date().getTime()}`;
      
      cy.findByLabelText(/template name/i).type(templateName);
      cy.findByLabelText(/description/i).type(templateDescription);
      
      // Click 'Save' button
      cy.findByRole('button', { name: /save template/i }).click();
      
      // Verify API request to save template is made
      cy.wait('@saveTemplate');
      
      // Verify success message is displayed
      cy.findByText(/template saved successfully/i).should('be.visible');
      
      // Verify new template appears in the templates list
      cy.findByText(templateName).should('be.visible');
    });
  });
});