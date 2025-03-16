/**
 * API module for workflow-related operations in the Student Admissions Enrollment Platform.
 * Provides functions for interacting with the backend API endpoints related to workflows,
 * workflow stages, transitions, and application status tracking.
 */

import apiClient from './apiClient';
import {
  Workflow,
  WorkflowStage,
  WorkflowTransition,
  WorkflowType,
  WorkflowFilter,
  WorkflowValidationResult,
  ApplicationStatusTimeline,
  WorkflowTransitionFilter
} from '../types/workflow';
import { ID } from '../types/common';
import { ApiPaginatedResponse } from '../types/api';

/**
 * Fetch a list of workflows with optional filtering
 * @param filter - Optional filters for the workflow list
 * @returns Promise resolving to paginated workflows data
 */
export const getWorkflows = (
  filter?: WorkflowFilter
): Promise<ApiPaginatedResponse<Workflow>> => {
  return apiClient.get('/workflows', filter);
};

/**
 * Fetch a specific workflow by ID
 * @param id - ID of the workflow to fetch
 * @returns Promise resolving to the workflow details
 */
export const getWorkflow = (id: ID): Promise<Workflow> => {
  return apiClient.get(`/workflows/${id}`);
};

/**
 * Fetch the active workflow for a specific application type
 * @param type - The application type to get the active workflow for
 * @returns Promise resolving to the active workflow
 */
export const getActiveWorkflow = (type: WorkflowType): Promise<Workflow> => {
  return apiClient.get('/workflows/active', { type });
};

/**
 * Fetch all stages for a specific workflow
 * @param workflowId - ID of the workflow to fetch stages for
 * @returns Promise resolving to the workflow stages
 */
export const getWorkflowStages = (workflowId: ID): Promise<WorkflowStage[]> => {
  return apiClient.get(`/workflows/${workflowId}/stages`);
};

/**
 * Fetch transitions for a specific workflow with optional filtering
 * @param workflowId - ID of the workflow to fetch transitions for
 * @param filter - Optional filters for the transitions list
 * @returns Promise resolving to the workflow transitions
 */
export const getWorkflowTransitions = (
  workflowId: ID,
  filter?: WorkflowTransitionFilter
): Promise<WorkflowTransition[]> => {
  return apiClient.get(`/workflows/${workflowId}/transitions`, filter);
};

/**
 * Fetch available transitions for an application at its current stage
 * @param applicationId - ID of the application to fetch available transitions for
 * @returns Promise resolving to the available transitions
 */
export const getAvailableTransitions = (
  applicationId: ID
): Promise<WorkflowTransition[]> => {
  return apiClient.get(`/applications/${applicationId}/available-transitions`);
};

/**
 * Fetch the status timeline for a specific application
 * @param applicationId - ID of the application to fetch the status timeline for
 * @returns Promise resolving to the application status timeline
 */
export const getApplicationStatusTimeline = (
  applicationId: ID
): Promise<ApplicationStatusTimeline> => {
  return apiClient.get(`/applications/${applicationId}/status-timeline`);
};

/**
 * Create a new workflow
 * @param workflow - Workflow data to create
 * @returns Promise resolving to the created workflow
 */
export const createWorkflow = (
  workflow: Partial<Workflow>
): Promise<Workflow> => {
  return apiClient.post('/workflows', workflow);
};

/**
 * Update an existing workflow
 * @param id - ID of the workflow to update
 * @param workflow - Updated workflow data
 * @returns Promise resolving to the updated workflow
 */
export const updateWorkflow = (
  id: ID,
  workflow: Partial<Workflow>
): Promise<Workflow> => {
  return apiClient.put(`/workflows/${id}`, workflow);
};

/**
 * Delete a workflow
 * @param id - ID of the workflow to delete
 * @returns Promise resolving when the workflow is deleted
 */
export const deleteWorkflow = (id: ID): Promise<void> => {
  return apiClient.delete(`/workflows/${id}`);
};

/**
 * Activate a workflow, making it the active workflow for its type
 * @param id - ID of the workflow to activate
 * @returns Promise resolving to the activated workflow
 */
export const activateWorkflow = (id: ID): Promise<Workflow> => {
  return apiClient.post(`/workflows/${id}/activate`, {});
};

/**
 * Deactivate a workflow
 * @param id - ID of the workflow to deactivate
 * @returns Promise resolving to the deactivated workflow
 */
export const deactivateWorkflow = (id: ID): Promise<Workflow> => {
  return apiClient.post(`/workflows/${id}/deactivate`, {});
};

/**
 * Create a duplicate of an existing workflow
 * @param id - ID of the workflow to duplicate
 * @param name - Name for the duplicated workflow
 * @returns Promise resolving to the duplicated workflow
 */
export const duplicateWorkflow = (id: ID, name: string): Promise<Workflow> => {
  return apiClient.post(`/workflows/${id}/duplicate`, { name });
};

/**
 * Validate a workflow for completeness and correctness
 * @param id - ID of the workflow to validate
 * @returns Promise resolving to the validation results
 */
export const validateWorkflow = (id: ID): Promise<WorkflowValidationResult> => {
  return apiClient.get(`/workflows/${id}/validate`);
};

/**
 * Create a new workflow stage
 * @param workflowId - ID of the workflow to create a stage for
 * @param stage - Stage data to create
 * @returns Promise resolving to the created stage
 */
export const createWorkflowStage = (
  workflowId: ID,
  stage: Partial<WorkflowStage>
): Promise<WorkflowStage> => {
  return apiClient.post(`/workflows/${workflowId}/stages`, stage);
};

/**
 * Update an existing workflow stage
 * @param workflowId - ID of the workflow containing the stage
 * @param stageId - ID of the stage to update
 * @param stage - Updated stage data
 * @returns Promise resolving to the updated stage
 */
export const updateWorkflowStage = (
  workflowId: ID,
  stageId: ID,
  stage: Partial<WorkflowStage>
): Promise<WorkflowStage> => {
  return apiClient.put(`/workflows/${workflowId}/stages/${stageId}`, stage);
};

/**
 * Delete a workflow stage
 * @param workflowId - ID of the workflow containing the stage
 * @param stageId - ID of the stage to delete
 * @returns Promise resolving when the stage is deleted
 */
export const deleteWorkflowStage = (
  workflowId: ID,
  stageId: ID
): Promise<void> => {
  return apiClient.delete(`/workflows/${workflowId}/stages/${stageId}`);
};

/**
 * Reorder the stages of a workflow
 * @param workflowId - ID of the workflow containing the stages
 * @param stageOrder - Array of stage IDs in the desired order
 * @returns Promise resolving when the stages are reordered
 */
export const reorderWorkflowStages = (
  workflowId: ID,
  stageOrder: ID[]
): Promise<void> => {
  return apiClient.post(`/workflows/${workflowId}/stages/reorder`, { stageOrder });
};

/**
 * Create a new workflow transition between stages
 * @param workflowId - ID of the workflow to create a transition for
 * @param transition - Transition data to create
 * @returns Promise resolving to the created transition
 */
export const createWorkflowTransition = (
  workflowId: ID,
  transition: Partial<WorkflowTransition>
): Promise<WorkflowTransition> => {
  return apiClient.post(`/workflows/${workflowId}/transitions`, transition);
};

/**
 * Update an existing workflow transition
 * @param workflowId - ID of the workflow containing the transition
 * @param transitionId - ID of the transition to update
 * @param transition - Updated transition data
 * @returns Promise resolving to the updated transition
 */
export const updateWorkflowTransition = (
  workflowId: ID,
  transitionId: ID,
  transition: Partial<WorkflowTransition>
): Promise<WorkflowTransition> => {
  return apiClient.put(`/workflows/${workflowId}/transitions/${transitionId}`, transition);
};

/**
 * Delete a workflow transition
 * @param workflowId - ID of the workflow containing the transition
 * @param transitionId - ID of the transition to delete
 * @returns Promise resolving when the transition is deleted
 */
export const deleteWorkflowTransition = (
  workflowId: ID,
  transitionId: ID
): Promise<void> => {
  return apiClient.delete(`/workflows/${workflowId}/transitions/${transitionId}`);
};

/**
 * Get a list of roles that can be assigned to workflow stages
 * @returns Promise resolving to a list of available roles
 */
export const getAvailableRoles = (): Promise<{id: ID, name: string}[]> => {
  return apiClient.get('/roles/available-for-workflows');
};