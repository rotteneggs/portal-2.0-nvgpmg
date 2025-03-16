/**
 * API client module for administrative endpoints in the Student Admissions Enrollment Platform.
 * Provides functions for interacting with the admin-specific backend APIs, including
 * user management, workflow management, application review, reporting, and system settings.
 * 
 * @module api/admin
 * @version 1.0.0
 */

import apiClient from './apiClient';
import {
  User, Role, Permission, CreateUserRequest, UpdateUserRequest,
  UserFilters, UserStatistics
} from '../types/user';
import {
  Workflow, WorkflowStage, WorkflowTransition, WorkflowFilter,
  WorkflowValidationResult
} from '../types/workflow';
import { ApiPaginatedResponse, ApiQueryParams } from '../types/api';

/**
 * User Management Functions
 */

/**
 * Fetch a paginated list of users with optional filtering
 * @param params - Query parameters and filters for the users list
 * @returns Promise resolving to paginated user data
 */
const getUsers = (params: ApiQueryParams & UserFilters): Promise<ApiPaginatedResponse<User>> => {
  return apiClient.get('admin/users', params);
};

/**
 * Fetch a specific user by ID
 * @param id - The user ID to fetch
 * @returns Promise resolving to user data
 */
const getUser = (id: number): Promise<User> => {
  return apiClient.get(`admin/users/${id}`);
};

/**
 * Create a new user
 * @param userData - The data for the new user
 * @returns Promise resolving to the created user data
 */
const createUser = (userData: CreateUserRequest): Promise<User> => {
  return apiClient.post('admin/users', userData);
};

/**
 * Update an existing user
 * @param id - The ID of the user to update
 * @param userData - The updated user data
 * @returns Promise resolving to the updated user data
 */
const updateUser = (id: number, userData: UpdateUserRequest): Promise<User> => {
  return apiClient.put(`admin/users/${id}`, userData);
};

/**
 * Delete a user
 * @param id - The ID of the user to delete
 * @returns Promise resolving when the user is deleted
 */
const deleteUser = (id: number): Promise<void> => {
  return apiClient.delete(`admin/users/${id}`);
};

/**
 * Search for users by name, email, or other criteria
 * @param searchTerm - The search term to look for
 * @param params - Additional query parameters and filters
 * @returns Promise resolving to paginated search results
 */
const searchUsers = (
  searchTerm: string, 
  params: ApiQueryParams & UserFilters
): Promise<ApiPaginatedResponse<User>> => {
  return apiClient.get('admin/users/search', { ...params, search: searchTerm });
};

/**
 * Assign a role to a user
 * @param userId - The ID of the user
 * @param roleId - The ID of the role to assign
 * @returns Promise resolving to the updated user data
 */
const assignRoleToUser = (userId: number, roleId: number | string): Promise<User> => {
  return apiClient.post(`admin/users/${userId}/roles`, { role_id: roleId });
};

/**
 * Remove a role from a user
 * @param userId - The ID of the user
 * @param roleId - The ID of the role to remove
 * @returns Promise resolving to the updated user data
 */
const removeRoleFromUser = (userId: number, roleId: number | string): Promise<User> => {
  return apiClient.delete(`admin/users/${userId}/roles/${roleId}`);
};

/**
 * Sync a user's roles with the provided role IDs
 * @param userId - The ID of the user
 * @param roleIds - Array of role IDs to assign to the user
 * @returns Promise resolving to the updated user data
 */
const syncUserRoles = (userId: number, roleIds: Array<number | string>): Promise<User> => {
  return apiClient.put(`admin/users/${userId}/roles`, { roles: roleIds });
};

/**
 * Activate a user account
 * @param userId - The ID of the user to activate
 * @returns Promise resolving when the user is activated
 */
const activateUser = (userId: number): Promise<void> => {
  return apiClient.post(`admin/users/${userId}/activate`);
};

/**
 * Deactivate a user account
 * @param userId - The ID of the user to deactivate
 * @returns Promise resolving when the user is deactivated
 */
const deactivateUser = (userId: number): Promise<void> => {
  return apiClient.post(`admin/users/${userId}/deactivate`);
};

/**
 * Get all permissions assigned to a user through their roles
 * @param userId - The ID of the user
 * @returns Promise resolving to the user's permissions
 */
const getUserPermissions = (userId: number): Promise<Permission[]> => {
  return apiClient.get(`admin/users/${userId}/permissions`);
};

/**
 * Get activity logs for a specific user
 * @param userId - The ID of the user
 * @param params - Pagination and filtering parameters
 * @returns Promise resolving to paginated activity logs
 */
const getUserActivityLogs = (
  userId: number, 
  params: ApiQueryParams
): Promise<ApiPaginatedResponse<any>> => {
  return apiClient.get(`admin/users/${userId}/activity-logs`, params);
};

/**
 * Create multiple users in bulk
 * @param usersData - Array of user data objects for creation
 * @returns Promise resolving to results of bulk creation
 */
const bulkCreateUsers = (
  usersData: CreateUserRequest[]
): Promise<{ success: User[]; errors: any[] }> => {
  return apiClient.post('admin/users/bulk', { users: usersData });
};

/**
 * Update multiple users in bulk
 * @param usersData - Array of user data objects with IDs for updating
 * @returns Promise resolving to results of bulk update
 */
const bulkUpdateUsers = (
  usersData: Array<{ id: number } & UpdateUserRequest>
): Promise<{ success: User[]; errors: any[] }> => {
  return apiClient.put('admin/users/bulk', { users: usersData });
};

/**
 * Delete multiple users in bulk
 * @param userIds - Array of user IDs to delete
 * @returns Promise resolving to results of bulk deletion
 */
const bulkDeleteUsers = (
  userIds: number[]
): Promise<{ success: number[]; errors: any[] }> => {
  return apiClient.delete('admin/users/bulk', { user_ids: userIds });
};

/**
 * Get user statistics (counts by role, active/inactive)
 * @returns Promise resolving to user statistics
 */
const getUserStatistics = (): Promise<UserStatistics> => {
  return apiClient.get('admin/users/statistics');
};

/**
 * Role and Permission Management Functions
 */

/**
 * Get a list of all roles with their permissions
 * @param params - Optional parameters like whether to include system roles
 * @returns Promise resolving to roles data
 */
const getRoles = (params: { includeSystem?: boolean } = {}): Promise<Role[]> => {
  return apiClient.get('admin/roles', params);
};

/**
 * Get details of a specific role with its permissions
 * @param id - The role ID to fetch
 * @returns Promise resolving to role data
 */
const getRole = (id: number): Promise<Role> => {
  return apiClient.get(`admin/roles/${id}`);
};

/**
 * Create a new role with optional permissions
 * @param roleData - Data for the new role
 * @returns Promise resolving to the created role data
 */
const createRole = (
  roleData: { name: string; description?: string; permissions?: number[] }
): Promise<Role> => {
  return apiClient.post('admin/roles', roleData);
};

/**
 * Update an existing role and its permissions
 * @param id - The ID of the role to update
 * @param roleData - The updated role data
 * @returns Promise resolving to the updated role data
 */
const updateRole = (
  id: number, 
  roleData: { name?: string; description?: string; permissions?: number[] }
): Promise<Role> => {
  return apiClient.put(`admin/roles/${id}`, roleData);
};

/**
 * Delete a role if it's not a system role
 * @param id - The ID of the role to delete
 * @returns Promise resolving when the role is deleted
 */
const deleteRole = (id: number): Promise<void> => {
  return apiClient.delete(`admin/roles/${id}`);
};

/**
 * Get a list of all permissions
 * @param filters - Optional filters for permissions
 * @returns Promise resolving to permissions data
 */
const getPermissions = (
  filters: { resource?: string; action?: string } = {}
): Promise<Permission[]> => {
  return apiClient.get('admin/permissions', filters);
};

/**
 * Create a new permission
 * @param permissionData - Data for the new permission
 * @returns Promise resolving to the created permission data
 */
const createPermission = (
  permissionData: { resource: string; action: string; description?: string }
): Promise<Permission> => {
  return apiClient.post('admin/permissions', permissionData);
};

/**
 * Update an existing permission
 * @param id - The ID of the permission to update
 * @param permissionData - The updated permission data
 * @returns Promise resolving to the updated permission data
 */
const updatePermission = (
  id: number, 
  permissionData: { description: string }
): Promise<Permission> => {
  return apiClient.put(`admin/permissions/${id}`, permissionData);
};

/**
 * Delete a permission if it's not in use
 * @param id - The ID of the permission to delete
 * @returns Promise resolving when the permission is deleted
 */
const deletePermission = (id: number): Promise<void> => {
  return apiClient.delete(`admin/permissions/${id}`);
};

/**
 * Workflow Management Functions
 */

/**
 * Get a paginated list of workflows with optional filtering
 * @param params - Query parameters and filters for the workflows list
 * @returns Promise resolving to paginated workflow data
 */
const getWorkflows = (
  params: ApiQueryParams & WorkflowFilter
): Promise<ApiPaginatedResponse<Workflow>> => {
  return apiClient.get('admin/workflows', params);
};

/**
 * Get a specific workflow by ID
 * @param id - The workflow ID to fetch
 * @returns Promise resolving to workflow data with stages
 */
const getWorkflow = (id: number): Promise<Workflow & { stages: WorkflowStage[] }> => {
  return apiClient.get(`admin/workflows/${id}`);
};

/**
 * Create a new workflow
 * @param workflowData - Data for the new workflow
 * @returns Promise resolving to the created workflow data
 */
const createWorkflow = (
  workflowData: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id'>
): Promise<Workflow> => {
  return apiClient.post('admin/workflows', workflowData);
};

/**
 * Update an existing workflow
 * @param id - The ID of the workflow to update
 * @param workflowData - The updated workflow data
 * @returns Promise resolving to the updated workflow data
 */
const updateWorkflow = (
  id: number, 
  workflowData: Partial<Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id'>>
): Promise<Workflow> => {
  return apiClient.put(`admin/workflows/${id}`, workflowData);
};

/**
 * Delete a workflow
 * @param id - The ID of the workflow to delete
 * @returns Promise resolving when the workflow is deleted
 */
const deleteWorkflow = (id: number): Promise<void> => {
  return apiClient.delete(`admin/workflows/${id}`);
};

/**
 * Activate a workflow
 * @param id - The ID of the workflow to activate
 * @returns Promise resolving to the activated workflow data
 */
const activateWorkflow = (id: number): Promise<Workflow> => {
  return apiClient.post(`admin/workflows/${id}/activate`);
};

/**
 * Deactivate a workflow
 * @param id - The ID of the workflow to deactivate
 * @returns Promise resolving to the deactivated workflow data
 */
const deactivateWorkflow = (id: number): Promise<Workflow> => {
  return apiClient.post(`admin/workflows/${id}/deactivate`);
};

/**
 * Create a duplicate of an existing workflow
 * @param id - The ID of the workflow to duplicate
 * @param newName - The name for the duplicated workflow
 * @returns Promise resolving to the duplicated workflow data with stages
 */
const duplicateWorkflow = (
  id: number, 
  newName: string
): Promise<Workflow & { stages: WorkflowStage[] }> => {
  return apiClient.post(`admin/workflows/${id}/duplicate`, { name: newName });
};

/**
 * Validate a workflow for completeness and correctness
 * @param id - The ID of the workflow to validate
 * @returns Promise resolving to validation results
 */
const validateWorkflow = (id: number): Promise<WorkflowValidationResult> => {
  return apiClient.get(`admin/workflows/${id}/validate`);
};

/**
 * Get all stages for a specific workflow
 * @param workflowId - The ID of the workflow
 * @returns Promise resolving to workflow stages
 */
const getWorkflowStages = (workflowId: number): Promise<WorkflowStage[]> => {
  return apiClient.get(`admin/workflows/${workflowId}/stages`);
};

/**
 * Create a new workflow stage
 * @param workflowId - The ID of the workflow
 * @param stageData - Data for the new stage
 * @returns Promise resolving to the created stage data
 */
const createWorkflowStage = (
  workflowId: number, 
  stageData: Omit<WorkflowStage, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>
): Promise<WorkflowStage> => {
  return apiClient.post(`admin/workflows/${workflowId}/stages`, stageData);
};

/**
 * Update an existing workflow stage
 * @param workflowId - The ID of the workflow
 * @param stageId - The ID of the stage to update
 * @param stageData - The updated stage data
 * @returns Promise resolving to the updated stage data
 */
const updateWorkflowStage = (
  workflowId: number, 
  stageId: number, 
  stageData: Partial<Omit<WorkflowStage, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>>
): Promise<WorkflowStage> => {
  return apiClient.put(`admin/workflows/${workflowId}/stages/${stageId}`, stageData);
};

/**
 * Delete a workflow stage
 * @param workflowId - The ID of the workflow
 * @param stageId - The ID of the stage to delete
 * @returns Promise resolving when the stage is deleted
 */
const deleteWorkflowStage = (workflowId: number, stageId: number): Promise<void> => {
  return apiClient.delete(`admin/workflows/${workflowId}/stages/${stageId}`);
};

/**
 * Reorder the stages of a workflow
 * @param workflowId - The ID of the workflow
 * @param stageOrder - Array of stage IDs in the desired order
 * @returns Promise resolving when the stages are reordered
 */
const reorderWorkflowStages = (workflowId: number, stageOrder: number[]): Promise<void> => {
  return apiClient.post(`admin/workflows/${workflowId}/stages/reorder`, { stage_order: stageOrder });
};

/**
 * Get transitions for a specific workflow with optional filtering
 * @param workflowId - The ID of the workflow
 * @param filters - Optional filters for transitions
 * @returns Promise resolving to workflow transitions
 */
const getWorkflowTransitions = (
  workflowId: number, 
  filters: { source_stage_id?: number; target_stage_id?: number; is_automatic?: boolean } = {}
): Promise<WorkflowTransition[]> => {
  return apiClient.get(`admin/workflows/${workflowId}/transitions`, filters);
};

/**
 * Create a new workflow transition between stages
 * @param workflowId - The ID of the workflow
 * @param transitionData - Data for the new transition
 * @returns Promise resolving to the created transition data
 */
const createWorkflowTransition = (
  workflowId: number, 
  transitionData: Omit<WorkflowTransition, 'id' | 'created_at' | 'updated_at' | 'sourceStage' | 'targetStage'>
): Promise<WorkflowTransition> => {
  return apiClient.post(`admin/workflows/${workflowId}/transitions`, transitionData);
};

/**
 * Update an existing workflow transition
 * @param workflowId - The ID of the workflow
 * @param transitionId - The ID of the transition to update
 * @param transitionData - The updated transition data
 * @returns Promise resolving to the updated transition data
 */
const updateWorkflowTransition = (
  workflowId: number, 
  transitionId: number, 
  transitionData: Partial<Omit<WorkflowTransition, 'id' | 'source_stage_id' | 'target_stage_id' | 'created_at' | 'updated_at' | 'sourceStage' | 'targetStage'>>
): Promise<WorkflowTransition> => {
  return apiClient.put(`admin/workflows/${workflowId}/transitions/${transitionId}`, transitionData);
};

/**
 * Delete a workflow transition
 * @param workflowId - The ID of the workflow
 * @param transitionId - The ID of the transition to delete
 * @returns Promise resolving when the transition is deleted
 */
const deleteWorkflowTransition = (workflowId: number, transitionId: number): Promise<void> => {
  return apiClient.delete(`admin/workflows/${workflowId}/transitions/${transitionId}`);
};

/**
 * Application Review Functions
 */

/**
 * Get a list of applications pending review
 * @param params - Pagination and filtering parameters
 * @returns Promise resolving to paginated applications data
 */
const getPendingApplications = (
  params: ApiQueryParams & { status?: string; type?: string; term?: string; year?: string } = {}
): Promise<ApiPaginatedResponse<any>> => {
  return apiClient.get('admin/applications/review', params);
};

/**
 * Get detailed information about an application for review
 * @param id - The ID of the application to review
 * @returns Promise resolving to detailed application data
 */
const getApplicationForReview = (id: number): Promise<any> => {
  return apiClient.get(`admin/applications/review/${id}`);
};

/**
 * Update the status of an application by executing a workflow transition
 * @param id - The ID of the application
 * @param data - The transition data including optional notes
 * @returns Promise resolving to the updated application
 */
const updateApplicationStatus = (
  id: number, 
  data: { transition_id: number; notes?: string }
): Promise<any> => {
  return apiClient.post(`admin/applications/review/${id}/status`, data);
};

/**
 * Add a review note to an application
 * @param id - The ID of the application
 * @param data - The note data
 * @returns Promise resolving to the created note
 */
const addApplicationNote = (
  id: number, 
  data: { content: string; is_internal: boolean }
): Promise<any> => {
  return apiClient.post(`admin/applications/review/${id}/notes`, data);
};

/**
 * Get review notes for an application
 * @param id - The ID of the application
 * @param params - Optional parameters like internal_only flag
 * @returns Promise resolving to application notes
 */
const getApplicationNotes = (
  id: number, 
  params: { internal_only?: boolean } = {}
): Promise<any[]> => {
  return apiClient.get(`admin/applications/review/${id}/notes`, params);
};

/**
 * Manually verify or reject a document during application review
 * @param documentId - The ID of the document to verify
 * @param data - The verification decision data
 * @returns Promise resolving to the verification result
 */
const verifyDocument = (
  documentId: number, 
  data: { decision: 'approve' | 'reject'; notes?: string }
): Promise<any> => {
  return apiClient.post(`admin/documents/${documentId}/verify`, data);
};

/**
 * Get a list of documents pending verification
 * @param params - Pagination and filtering parameters
 * @returns Promise resolving to paginated documents data
 */
const getPendingDocuments = (
  params: ApiQueryParams & { document_type?: string } = {}
): Promise<ApiPaginatedResponse<any>> => {
  return apiClient.get('admin/documents/pending', params);
};

/**
 * Get the verification history for a document
 * @param documentId - The ID of the document
 * @returns Promise resolving to document verification history
 */
const getDocumentVerificationHistory = (documentId: number): Promise<any[]> => {
  return apiClient.get(`admin/documents/${documentId}/verification-history`);
};

/**
 * Make a final decision on an application (accept/reject/waitlist)
 * @param id - The ID of the application
 * @param data - The decision data
 * @returns Promise resolving to the decision result
 */
const makeApplicationDecision = (
  id: number, 
  data: { decision: 'accept' | 'reject' | 'waitlist'; notes?: string }
): Promise<any> => {
  return apiClient.post(`admin/applications/review/${id}/decision`, data);
};

/**
 * Request additional information from an applicant
 * @param id - The ID of the application
 * @param data - The information request data
 * @returns Promise resolving to the request result
 */
const requestAdditionalInformation = (
  id: number, 
  data: { information_needed: string; deadline?: string }
): Promise<any> => {
  return apiClient.post(`admin/applications/review/${id}/request-info`, data);
};

/**
 * Assign an application to committee review
 * @param id - The ID of the application
 * @param data - The committee assignment data
 * @returns Promise resolving to the assignment result
 */
const assignToCommittee = (
  id: number, 
  data: { committee_name: string; review_date?: string }
): Promise<any> => {
  return apiClient.post(`admin/applications/review/${id}/committee`, data);
};

/**
 * Get statistics about applications in the review process
 * @param params - Optional parameters like date range and application type
 * @returns Promise resolving to application statistics
 */
const getApplicationStatistics = (
  params: { date_range?: [string, string]; application_type?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/applications/review/statistics', params);
};

/**
 * Reporting Functions
 */

/**
 * Get a list of available reports
 * @returns Promise resolving to available reports
 */
const getReportsList = (): Promise<any> => {
  return apiClient.get('admin/reports');
};

/**
 * Generate application statistics report
 * @param params - Optional parameters for filtering the report
 * @returns Promise resolving to application statistics
 */
const getApplicationStats = (
  params: { start_date?: string; end_date?: string; application_type?: string; status?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/applications/stats', params);
};

/**
 * Generate application trend data over time
 * @param params - Optional parameters for filtering and grouping the trend data
 * @returns Promise resolving to application trend data
 */
const getApplicationTrends = (
  params: { start_date?: string; end_date?: string; grouping?: 'day' | 'week' | 'month'; application_type?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/applications/trends', params);
};

/**
 * Generate document statistics report
 * @param params - Optional parameters for filtering the report
 * @returns Promise resolving to document statistics
 */
const getDocumentStats = (
  params: { start_date?: string; end_date?: string; document_type?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/documents/stats', params);
};

/**
 * Generate document verification trend data over time
 * @param params - Optional parameters for filtering and grouping the trend data
 * @returns Promise resolving to document verification trend data
 */
const getDocumentVerificationTrends = (
  params: { start_date?: string; end_date?: string; grouping?: 'day' | 'week' | 'month'; document_type?: string; verification_method?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/documents/verification-trends', params);
};

/**
 * Generate payment statistics report
 * @param params - Optional parameters for filtering the report
 * @returns Promise resolving to payment statistics
 */
const getPaymentStats = (
  params: { start_date?: string; end_date?: string; payment_type?: string; payment_method?: string; status?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/payments/stats', params);
};

/**
 * Generate payment trend data over time
 * @param params - Optional parameters for filtering and grouping the trend data
 * @returns Promise resolving to payment trend data
 */
const getPaymentTrends = (
  params: { start_date?: string; end_date?: string; grouping?: 'day' | 'week' | 'month'; payment_type?: string; payment_method?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/payments/trends', params);
};

/**
 * Generate user statistics report
 * @param params - Optional parameters for filtering the report
 * @returns Promise resolving to user statistics
 */
const getUserStats = (
  params: { start_date?: string; end_date?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/users/stats', params);
};

/**
 * Generate application conversion funnel report
 * @param params - Optional parameters for filtering the report
 * @returns Promise resolving to conversion funnel data
 */
const getConversionFunnel = (
  params: { start_date?: string; end_date?: string; application_type?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/conversion-funnel', params);
};

/**
 * Generate workflow efficiency report
 * @param params - Optional parameters for filtering the report
 * @returns Promise resolving to workflow efficiency data
 */
const getWorkflowEfficiency = (
  params: { start_date?: string; end_date?: string; workflow_id?: number } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/workflow-efficiency', params);
};

/**
 * Generate AI performance report
 * @param params - Optional parameters for filtering the report
 * @returns Promise resolving to AI performance data
 */
const getAIPerformance = (
  params: { start_date?: string; end_date?: string } = {}
): Promise<any> => {
  return apiClient.get('admin/reports/ai-performance', params);
};

/**
 * Export a report in CSV format
 * @param reportType - The type of report to export
 * @param params - Parameters for filtering the report
 * @returns Promise resolving to CSV file as a Blob
 */
const exportReport = (reportType: string, params: Record<string, any>): Promise<Blob> => {
  return apiClient.download(`admin/reports/export/${reportType}`, params);
};

/**
 * System Settings Functions
 */

/**
 * Get all system settings or a specific setting group
 * @param params - Optional parameters like group name
 * @returns Promise resolving to system settings
 */
const getSystemSettings = (params: { group?: string } = {}): Promise<any> => {
  return apiClient.get('admin/settings', params);
};

/**
 * Update system settings
 * @param settings - The settings to update
 * @returns Promise resolving to updated settings
 */
const updateSystemSettings = (settings: Record<string, any>): Promise<any> => {
  return apiClient.put('admin/settings', settings);
};

/**
 * Get all email templates or a specific template
 * @param params - Optional parameters like template name
 * @returns Promise resolving to email templates
 */
const getEmailTemplates = (params: { template?: string } = {}): Promise<any> => {
  return apiClient.get('admin/settings/email-templates', params);
};

/**
 * Update an email template
 * @param templateName - The name of the template to update
 * @param templateData - The updated template data
 * @returns Promise resolving to updated template
 */
const updateEmailTemplate = (
  templateName: string, 
  templateData: { subject: string; body: string; variables?: Record<string, string> }
): Promise<any> => {
  return apiClient.put(`admin/settings/email-templates/${templateName}`, templateData);
};

/**
 * Get settings for external system integrations
 * @param params - Optional parameters like integration type
 * @returns Promise resolving to integration settings
 */
const getIntegrationSettings = (params: { integration_type?: string } = {}): Promise<any> => {
  return apiClient.get('admin/settings/integrations', params);
};

/**
 * Update settings for an external system integration
 * @param integrationType - The type of integration to update
 * @param settings - The updated integration settings
 * @param options - Optional parameters like test_connection flag
 * @returns Promise resolving to updated integration settings
 */
const updateIntegrationSettings = (
  integrationType: string, 
  settings: Record<string, any>, 
  options: { test_connection?: boolean } = {}
): Promise<any> => {
  return apiClient.put(`admin/settings/integrations/${integrationType}`, settings, options);
};

/**
 * Get security-related system settings
 * @returns Promise resolving to security settings
 */
const getSecuritySettings = (): Promise<any> => {
  return apiClient.get('admin/settings/security');
};

/**
 * Update security-related system settings
 * @param settings - The updated security settings
 * @returns Promise resolving to updated security settings
 */
const updateSecuritySettings = (settings: Record<string, any>): Promise<any> => {
  return apiClient.put('admin/settings/security', settings);
};

/**
 * Get application appearance settings
 * @returns Promise resolving to appearance settings
 */
const getAppearanceSettings = (): Promise<any> => {
  return apiClient.get('admin/settings/appearance');
};

/**
 * Update application appearance settings
 * @param settings - The updated appearance settings
 * @param logo - Optional logo file to upload
 * @returns Promise resolving to updated appearance settings
 */
const updateAppearanceSettings = (settings: Record<string, any>, logo?: File): Promise<any> => {
  const formData = new FormData();
  formData.append('settings', JSON.stringify(settings));
  
  if (logo) {
    formData.append('logo', logo);
  }
  
  return apiClient.upload('admin/settings/appearance', formData);
};

/**
 * Reset settings to system defaults
 * @param params - Parameters with group to reset
 * @returns Promise resolving to success message
 */
const resetSettingsToDefaults = (params: { group: string }): Promise<any> => {
  return apiClient.post('admin/settings/reset', params);
};

export default {
  // User Management
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
  assignRoleToUser,
  removeRoleFromUser,
  syncUserRoles,
  activateUser,
  deactivateUser,
  getUserPermissions,
  getUserActivityLogs,
  bulkCreateUsers,
  bulkUpdateUsers,
  bulkDeleteUsers,
  getUserStatistics,
  
  // Role and Permission Management
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  
  // Workflow Management
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  duplicateWorkflow,
  validateWorkflow,
  getWorkflowStages,
  createWorkflowStage,
  updateWorkflowStage,
  deleteWorkflowStage,
  reorderWorkflowStages,
  getWorkflowTransitions,
  createWorkflowTransition,
  updateWorkflowTransition,
  deleteWorkflowTransition,
  
  // Application Review
  getPendingApplications,
  getApplicationForReview,
  updateApplicationStatus,
  addApplicationNote,
  getApplicationNotes,
  verifyDocument,
  getPendingDocuments,
  getDocumentVerificationHistory,
  makeApplicationDecision,
  requestAdditionalInformation,
  assignToCommittee,
  getApplicationStatistics,
  
  // Reporting
  getReportsList,
  getApplicationStats,
  getApplicationTrends,
  getDocumentStats,
  getDocumentVerificationTrends,
  getPaymentStats,
  getPaymentTrends,
  getUserStats,
  getConversionFunnel,
  getWorkflowEfficiency,
  getAIPerformance,
  exportReport,
  
  // System Settings
  getSystemSettings,
  updateSystemSettings,
  getEmailTemplates,
  updateEmailTemplate,
  getIntegrationSettings,
  updateIntegrationSettings,
  getSecuritySettings,
  updateSecuritySettings,
  getAppearanceSettings,
  updateAppearanceSettings,
  resetSettingsToDefaults
};