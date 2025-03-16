# Workflows API Documentation

## Introduction
The Workflows API provides endpoints for interacting with the admissions workflow system, which defines the stages and transitions that applications go through during the admissions process. This API enables both administrators and applicants to view and interact with workflows in different ways.

For administrators, the API provides comprehensive WYSIWYG workflow editor capabilities, allowing them to create, edit, and manage workflow definitions, stages, and transitions. For applicants and staff, the API provides endpoints to view workflow information and track application status.

## Workflow Concepts
Before using the Workflows API, it's important to understand the key concepts of the workflow system:

### Workflow
A workflow is a definition of the entire admissions process for a specific application type. Each workflow contains a series of stages and transitions that define how applications move through the process. Only one workflow can be active for each application type at a time.

### Stage
A stage represents a distinct phase in the admissions process, such as 'Document Verification', 'Under Review', or 'Decision Pending'. Each stage can have specific requirements, such as required documents or actions, and can trigger notifications when entered or exited.

### Transition
A transition defines a possible path between two stages. Transitions can have conditions that must be met before an application can move from one stage to another, and may require specific permissions to execute. Transitions can be automatic (triggered when conditions are met) or manual (requiring user action).

### Application Status
An application's status is determined by its current stage in the workflow. As an application moves through the workflow, its status is updated to reflect its current stage.

## Standard User Endpoints
The following endpoints are available to standard users (applicants and staff) for viewing workflow information and tracking application status:

### Get Active Workflow
Retrieves the active workflow for a specific application type.

**Request:**
```http
GET /api/v1/workflows/active?application_type=undergraduate
```

**Parameters:**
- `application_type` (required, string): The type of application (e.g., 'undergraduate', 'graduate', 'transfer')

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Undergraduate Admissions",
    "description": "Standard workflow for undergraduate applications",
    "application_type": "undergraduate",
    "is_active": true,
    "created_at": "2023-01-15T10:30:00Z",
    "updated_at": "2023-02-01T14:45:00Z",
    "stages": [
      {
        "id": 1,
        "name": "Application Submission",
        "description": "Initial stage when application is submitted",
        "sequence": 1,
        "required_documents": ["transcript", "personal_statement"],
        "required_actions": ["complete_profile", "pay_application_fee"],
        "notification_triggers": ["application_received"],
        "assigned_role_id": 3,
        "assigned_role": {
          "id": 3,
          "name": "Admissions Staff"
        }
      },
      // Additional stages...
    ]
  }
}
```

### Get Application Workflow
Retrieves the workflow associated with a specific application.

**Request:**
```http
GET /api/v1/workflows/application/{applicationId}
```

**Parameters:**
- `applicationId` (required, integer): The ID of the application

**Response:**
Same format as the "Get Active Workflow" endpoint, returning the workflow associated with the specified application.

### Get Workflow Stages
Retrieves all stages for a specific workflow.

**Request:**
```http
GET /api/v1/workflows/{workflowId}/stages
```

**Parameters:**
- `workflowId` (required, integer): The ID of the workflow

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Application Submission",
      "description": "Initial stage when application is submitted",
      "sequence": 1,
      "required_documents": ["transcript", "personal_statement"],
      "required_actions": ["complete_profile", "pay_application_fee"],
      "notification_triggers": ["application_received"],
      "assigned_role_id": 3,
      "assigned_role": {
        "id": 3,
        "name": "Admissions Staff"
      }
    },
    // Additional stages...
  ]
}
```

### Get Workflow Transitions
Retrieves transitions for a specific workflow with optional filtering.

**Request:**
```http
GET /api/v1/workflows/{workflowId}/transitions?source_stage_id=1&is_automatic=true
```

**Parameters:**
- `workflowId` (required, integer): The ID of the workflow
- `source_stage_id` (optional, integer): Filter transitions by source stage ID
- `target_stage_id` (optional, integer): Filter transitions by target stage ID
- `is_automatic` (optional, boolean): Filter transitions by automatic flag

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Documents Verified",
      "description": "Transition when all documents are verified",
      "source_stage_id": 1,
      "target_stage_id": 2,
      "transition_conditions": [
        {
          "field": "documents_verified",
          "operator": "==",
          "value": true
        }
      ],
      "required_permissions": ["applications.update_status"],
      "is_automatic": true,
      "source_stage": {
        "id": 1,
        "name": "Application Submission"
      },
      "target_stage": {
        "id": 2,
        "name": "Document Verification"
      }
    },
    // Additional transitions...
  ]
}
```

### Get Application Status
Retrieves the current status and possible transitions for an application.

**Request:**
```http
GET /api/v1/applications/{applicationId}/status
```

**Parameters:**
- `applicationId` (required, integer): The ID of the application

**Response:**
```json
{
  "success": true,
  "data": {
    "current_status": {
      "id": 5,
      "status": "Under Review",
      "created_at": "2023-03-15T09:30:00Z",
      "workflow_stage": {
        "id": 3,
        "name": "Application Review",
        "description": "Application is being reviewed by admissions committee",
        "sequence": 3
      }
    },
    "available_transitions": [
      {
        "id": 4,
        "name": "Request Additional Information",
        "description": "Request additional information from applicant",
        "target_stage": {
          "id": 4,
          "name": "Additional Information Requested",
          "sequence": 4
        },
        "is_automatic": false,
        "requires_permission": true
      },
      {
        "id": 5,
        "name": "Complete Review",
        "description": "Mark review as complete and move to decision",
        "target_stage": {
          "id": 5,
          "name": "Decision Pending",
          "sequence": 5
        },
        "is_automatic": false,
        "requires_permission": true
      }
    ],
    "timeline": [
      {
        "id": 1,
        "status": "Submitted",
        "created_at": "2023-03-01T14:20:00Z",
        "workflow_stage": {
          "id": 1,
          "name": "Application Submission",
          "sequence": 1
        }
      },
      // Additional status history...
      {
        "id": 5,
        "status": "Under Review",
        "created_at": "2023-03-15T09:30:00Z",
        "workflow_stage": {
          "id": 3,
          "name": "Application Review",
          "sequence": 3
        }
      }
    ]
  }
}
```

## Administrative Endpoints
The following endpoints are available to administrators for managing workflow definitions, stages, and transitions through the WYSIWYG workflow editor:

### Workflow Management
Endpoints for managing workflow definitions.

#### List Workflows
Retrieves a paginated list of workflows with optional filtering.

**Request:**
```http
GET /api/v1/admin/workflows?application_type=undergraduate&is_active=true&search=admission&per_page=10
```

**Parameters:**
- `application_type` (optional, string): Filter by application type
- `is_active` (optional, boolean): Filter by active status
- `search` (optional, string): Search term for workflow name or description
- `per_page` (optional, integer): Number of items per page (default: 15)
- `page` (optional, integer): Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Undergraduate Admissions",
      "description": "Standard workflow for undergraduate applications",
      "application_type": "undergraduate",
      "is_active": true,
      "created_at": "2023-01-15T10:30:00Z",
      "updated_at": "2023-02-01T14:45:00Z",
      "created_by_user_id": 1,
      "created_by": {
        "id": 1,
        "name": "Admin User"
      }
    },
    // Additional workflows...
  ],
  "meta": {
    "pagination": {
      "total": 5,
      "per_page": 10,
      "current_page": 1,
      "last_page": 1,
      "from": 1,
      "to": 5
    }
  }
}
```

#### Get Workflow
Retrieves a specific workflow by ID.

**Request:**
```http
GET /api/v1/admin/workflows/{id}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Undergraduate Admissions",
    "description": "Standard workflow for undergraduate applications",
    "application_type": "undergraduate",
    "is_active": true,
    "created_at": "2023-01-15T10:30:00Z",
    "updated_at": "2023-02-01T14:45:00Z",
    "created_by_user_id": 1,
    "created_by": {
      "id": 1,
      "name": "Admin User"
    },
    "stages": [
      // Array of stages as shown in previous examples
    ]
  }
}
```

#### Create Workflow
Creates a new workflow.

**Request:**
```http
POST /api/v1/admin/workflows
Content-Type: application/json

{
  "name": "Graduate Admissions",
  "description": "Standard workflow for graduate applications",
  "application_type": "graduate",
  "is_active": false
}
```

**Parameters:**
- `name` (required, string): The name of the workflow
- `description` (optional, string): A description of the workflow
- `application_type` (required, string): The type of application this workflow applies to
- `is_active` (optional, boolean): Whether the workflow is active (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Graduate Admissions",
    "description": "Standard workflow for graduate applications",
    "application_type": "graduate",
    "is_active": false,
    "created_at": "2023-04-10T11:20:00Z",
    "updated_at": "2023-04-10T11:20:00Z",
    "created_by_user_id": 1
  },
  "message": "Workflow created successfully"
}
```

#### Update Workflow
Updates an existing workflow.

**Request:**
```http
PUT /api/v1/admin/workflows/{id}
Content-Type: application/json

{
  "name": "Graduate Admissions Process",
  "description": "Updated workflow for graduate applications",
  "application_type": "graduate"
}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow to update
- `name` (optional, string): The updated name of the workflow
- `description` (optional, string): The updated description of the workflow
- `application_type` (optional, string): The updated application type

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Graduate Admissions Process",
    "description": "Updated workflow for graduate applications",
    "application_type": "graduate",
    "is_active": false,
    "created_at": "2023-04-10T11:20:00Z",
    "updated_at": "2023-04-10T11:45:00Z",
    "created_by_user_id": 1
  },
  "message": "Workflow updated successfully"
}
```

#### Delete Workflow
Deletes a workflow.

**Request:**
```http
DELETE /api/v1/admin/workflows/{id}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow to delete

**Response:**
```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

**Error Response (Active Workflow):**
```json
{
  "success": false,
  "error": {
    "code": "ACTIVE_WORKFLOW_DELETE",
    "message": "Cannot delete an active workflow. Please deactivate it first."
  }
}
```

#### Activate Workflow
Activates a workflow. This will deactivate any other active workflow for the same application type.

**Request:**
```http
POST /api/v1/admin/workflows/{id}/activate
```

**Parameters:**
- `id` (required, integer): The ID of the workflow to activate

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Graduate Admissions Process",
    "description": "Updated workflow for graduate applications",
    "application_type": "graduate",
    "is_active": true,
    "created_at": "2023-04-10T11:20:00Z",
    "updated_at": "2023-04-10T12:30:00Z",
    "created_by_user_id": 1
  },
  "message": "Workflow activated successfully"
}
```

#### Deactivate Workflow
Deactivates a workflow.

**Request:**
```http
POST /api/v1/admin/workflows/{id}/deactivate
```

**Parameters:**
- `id` (required, integer): The ID of the workflow to deactivate

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Graduate Admissions Process",
    "description": "Updated workflow for graduate applications",
    "application_type": "graduate",
    "is_active": false,
    "created_at": "2023-04-10T11:20:00Z",
    "updated_at": "2023-04-10T12:45:00Z",
    "created_by_user_id": 1
  },
  "message": "Workflow deactivated successfully"
}
```

#### Duplicate Workflow
Creates a duplicate of an existing workflow with a new name.

**Request:**
```http
POST /api/v1/admin/workflows/{id}/duplicate
Content-Type: application/json

{
  "name": "Graduate Admissions Copy"
}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow to duplicate
- `name` (required, string): The name for the duplicated workflow

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Graduate Admissions Copy",
    "description": "Updated workflow for graduate applications",
    "application_type": "graduate",
    "is_active": false,
    "created_at": "2023-04-10T13:00:00Z",
    "updated_at": "2023-04-10T13:00:00Z",
    "created_by_user_id": 1,
    "stages": [
      // Duplicated stages from the original workflow
    ]
  },
  "message": "Workflow duplicated successfully"
}
```

#### Validate Workflow
Validates a workflow for completeness and correctness.

**Request:**
```http
GET /api/v1/admin/workflows/{id}/validate
```

**Parameters:**
- `id` (required, integer): The ID of the workflow to validate

**Response:**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "issues": [],
    "warnings": [
      "Stage 'Document Verification' has no outgoing transitions for rejected documents"
    ]
  }
}
```

**Error Response (Invalid Workflow):**
```json
{
  "success": true,
  "data": {
    "is_valid": false,
    "issues": [
      "No initial stage found",
      "Stage 'Decision' has no outgoing transitions"
    ],
    "warnings": [
      "Stage 'Document Verification' has no outgoing transitions for rejected documents"
    ]
  }
}
```

### Stage Management
Endpoints for managing workflow stages.

#### List Stages
Retrieves all stages for a specific workflow.

**Request:**
```http
GET /api/v1/admin/workflows/{id}/stages
```

**Parameters:**
- `id` (required, integer): The ID of the workflow

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "workflow_id": 1,
      "name": "Application Submission",
      "description": "Initial stage when application is submitted",
      "sequence": 1,
      "required_documents": ["transcript", "personal_statement"],
      "required_actions": ["complete_profile", "pay_application_fee"],
      "notification_triggers": ["application_received"],
      "assigned_role_id": 3,
      "assigned_role": {
        "id": 3,
        "name": "Admissions Staff"
      },
      "created_at": "2023-01-15T10:30:00Z",
      "updated_at": "2023-01-15T10:30:00Z"
    },
    // Additional stages...
  ]
}
```

#### Create Stage
Creates a new workflow stage.

**Request:**
```http
POST /api/v1/admin/workflows/{id}/stages
Content-Type: application/json

{
  "name": "Committee Review",
  "description": "Application is reviewed by the admissions committee",
  "sequence": 4,
  "required_documents": ["transcript", "recommendation_letters", "personal_statement"],
  "required_actions": ["committee_evaluation"],
  "notification_triggers": ["committee_review_started"],
  "assigned_role_id": 4
}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow
- `name` (required, string): The name of the stage
- `description` (optional, string): A description of the stage
- `sequence` (required, integer): The sequence number of the stage in the workflow
- `required_documents` (optional, array): An array of document types required for this stage
- `required_actions` (optional, array): An array of actions required for this stage
- `notification_triggers` (optional, array): An array of notification triggers for this stage
- `assigned_role_id` (optional, integer): The ID of the role assigned to this stage

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "workflow_id": 1,
    "name": "Committee Review",
    "description": "Application is reviewed by the admissions committee",
    "sequence": 4,
    "required_documents": ["transcript", "recommendation_letters", "personal_statement"],
    "required_actions": ["committee_evaluation"],
    "notification_triggers": ["committee_review_started"],
    "assigned_role_id": 4,
    "assigned_role": {
      "id": 4,
      "name": "Admissions Committee"
    },
    "created_at": "2023-04-10T14:30:00Z",
    "updated_at": "2023-04-10T14:30:00Z"
  },
  "message": "Stage created successfully"
}
```

#### Update Stage
Updates an existing workflow stage.

**Request:**
```http
PUT /api/v1/admin/workflows/{id}/stages/{stageId}
Content-Type: application/json

{
  "name": "Committee Review and Evaluation",
  "description": "Updated description for committee review stage",
  "required_documents": ["transcript", "recommendation_letters", "personal_statement", "portfolio"],
  "notification_triggers": ["committee_review_started", "committee_review_completed"]
}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow
- `stageId` (required, integer): The ID of the stage to update
- `name` (optional, string): The updated name of the stage
- `description` (optional, string): The updated description of the stage
- `sequence` (optional, integer): The updated sequence number of the stage
- `required_documents` (optional, array): The updated array of required documents
- `required_actions` (optional, array): The updated array of required actions
- `notification_triggers` (optional, array): The updated array of notification triggers
- `assigned_role_id` (optional, integer): The updated role ID assigned to this stage

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "workflow_id": 1,
    "name": "Committee Review and Evaluation",
    "description": "Updated description for committee review stage",
    "sequence": 4,
    "required_documents": ["transcript", "recommendation_letters", "personal_statement", "portfolio"],
    "required_actions": ["committee_evaluation"],
    "notification_triggers": ["committee_review_started", "committee_review_completed"],
    "assigned_role_id": 4,
    "assigned_role": {
      "id": 4,
      "name": "Admissions Committee"
    },
    "created_at": "2023-04-10T14:30:00Z",
    "updated_at": "2023-04-10T15:00:00Z"
  },
  "message": "Stage updated successfully"
}
```

#### Delete Stage
Deletes a workflow stage.

**Request:**
```http
DELETE /api/v1/admin/workflows/{id}/stages/{stageId}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow
- `stageId` (required, integer): The ID of the stage to delete

**Response:**
```json
{
  "success": true,
  "message": "Stage deleted successfully"
}
```

**Error Response (Stage In Use):**
```json
{
  "success": false,
  "error": {
    "code": "STAGE_IN_USE",
    "message": "Cannot delete a stage that has applications currently in this stage."
  }
}
```

#### Reorder Stages
Reorders the stages of a workflow.

**Request:**
```http
POST /api/v1/admin/workflows/{id}/stages/reorder
Content-Type: application/json

{
  "stage_order": [1, 3, 5, 2, 4]
}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow
- `stage_order` (required, array): An array of stage IDs in the desired order

**Response:**
```json
{
  "success": true,
  "message": "Stages reordered successfully"
}
```

### Transition Management
Endpoints for managing workflow transitions.

#### List Transitions
Retrieves transitions for a specific workflow with optional filtering.

**Request:**
```http
GET /api/v1/admin/workflows/{id}/transitions?source_stage_id=1&is_automatic=true
```

**Parameters:**
- `id` (required, integer): The ID of the workflow
- `source_stage_id` (optional, integer): Filter transitions by source stage ID
- `target_stage_id` (optional, integer): Filter transitions by target stage ID
- `is_automatic` (optional, boolean): Filter transitions by automatic flag

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "source_stage_id": 1,
      "target_stage_id": 2,
      "name": "Documents Verified",
      "description": "Transition when all documents are verified",
      "transition_conditions": [
        {
          "field": "documents_verified",
          "operator": "==",
          "value": true
        }
      ],
      "required_permissions": ["applications.update_status"],
      "is_automatic": true,
      "created_at": "2023-01-15T10:30:00Z",
      "updated_at": "2023-01-15T10:30:00Z",
      "source_stage": {
        "id": 1,
        "name": "Application Submission"
      },
      "target_stage": {
        "id": 2,
        "name": "Document Verification"
      }
    },
    // Additional transitions...
  ]
}
```

#### Create Transition
Creates a new workflow transition between stages.

**Request:**
```http
POST /api/v1/admin/workflows/{id}/transitions
Content-Type: application/json

{
  "source_stage_id": 3,
  "target_stage_id": 5,
  "name": "Forward to Committee",
  "description": "Forward application to committee review",
  "transition_conditions": [
    {
      "field": "initial_review_complete",
      "operator": "==",
      "value": true
    },
    {
      "field": "gpa",
      "operator": ">=",
      "value": 3.0
    }
  ],
  "required_permissions": ["applications.forward_to_committee"],
  "is_automatic": false
}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow
- `source_stage_id` (required, integer): The ID of the source stage
- `target_stage_id` (required, integer): The ID of the target stage
- `name` (required, string): The name of the transition
- `description` (optional, string): A description of the transition
- `transition_conditions` (optional, array): An array of condition objects with field, operator, and value
- `required_permissions` (optional, array): An array of permission strings required to execute this transition
- `is_automatic` (optional, boolean): Whether the transition happens automatically when conditions are met

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 8,
    "source_stage_id": 3,
    "target_stage_id": 5,
    "name": "Forward to Committee",
    "description": "Forward application to committee review",
    "transition_conditions": [
      {
        "field": "initial_review_complete",
        "operator": "==",
        "value": true
      },
      {
        "field": "gpa",
        "operator": ">=",
        "value": 3.0
      }
    ],
    "required_permissions": ["applications.forward_to_committee"],
    "is_automatic": false,
    "created_at": "2023-04-10T16:30:00Z",
    "updated_at": "2023-04-10T16:30:00Z",
    "source_stage": {
      "id": 3,
      "name": "Application Review"
    },
    "target_stage": {
      "id": 5,
      "name": "Committee Review and Evaluation"
    }
  },
  "message": "Transition created successfully"
}
```

#### Update Transition
Updates an existing workflow transition.

**Request:**
```http
PUT /api/v1/admin/workflows/{id}/transitions/{transitionId}
Content-Type: application/json

{
  "name": "Forward to Committee Review",
  "description": "Updated description for committee transition",
  "transition_conditions": [
    {
      "field": "initial_review_complete",
      "operator": "==",
      "value": true
    },
    {
      "field": "gpa",
      "operator": ">=",
      "value": 3.5
    }
  ],
  "is_automatic": true
}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow
- `transitionId` (required, integer): The ID of the transition to update
- `name` (optional, string): The updated name of the transition
- `description` (optional, string): The updated description of the transition
- `transition_conditions` (optional, array): The updated array of condition objects
- `required_permissions` (optional, array): The updated array of required permissions
- `is_automatic` (optional, boolean): The updated automatic flag

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 8,
    "source_stage_id": 3,
    "target_stage_id": 5,
    "name": "Forward to Committee Review",
    "description": "Updated description for committee transition",
    "transition_conditions": [
      {
        "field": "initial_review_complete",
        "operator": "==",
        "value": true
      },
      {
        "field": "gpa",
        "operator": ">=",
        "value": 3.5
      }
    ],
    "required_permissions": ["applications.forward_to_committee"],
    "is_automatic": true,
    "created_at": "2023-04-10T16:30:00Z",
    "updated_at": "2023-04-10T17:00:00Z",
    "source_stage": {
      "id": 3,
      "name": "Application Review"
    },
    "target_stage": {
      "id": 5,
      "name": "Committee Review and Evaluation"
    }
  },
  "message": "Transition updated successfully"
}
```

#### Delete Transition
Deletes a workflow transition.

**Request:**
```http
DELETE /api/v1/admin/workflows/{id}/transitions/{transitionId}
```

**Parameters:**
- `id` (required, integer): The ID of the workflow
- `transitionId` (required, integer): The ID of the transition to delete

**Response:**
```json
{
  "success": true,
  "message": "Transition deleted successfully"
}
```

## Transition Conditions
Transition conditions define when an application can move from one stage to another. Each condition consists of a field, an operator, and a value to compare against.

### Condition Structure
Each condition is an object with the following properties:

- `field`: The name of the field to check (e.g., 'documents_verified', 'gpa')
- `operator`: The comparison operator (e.g., '==', '!=', '>', '>=', '<', '<=')
- `value`: The value to compare against

Multiple conditions are combined with AND logic - all conditions must be met for the transition to be available.

### Available Fields
The following fields are available for use in transition conditions:

- `documents_verified`: Boolean indicating whether all required documents have been verified
- `application_complete`: Boolean indicating whether the application is complete
- `application_fee_paid`: Boolean indicating whether the application fee has been paid
- `gpa`: Numeric GPA value from the application
- `test_score`: Numeric test score value from the application
- `recommendation_count`: Number of recommendation letters received
- `days_in_stage`: Number of days the application has been in the current stage
- `custom_field_*`: Any custom field defined in the application form

### Example Conditions
Here are some example transition conditions: