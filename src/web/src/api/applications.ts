/**
 * API client module for application-related endpoints in the Student Admissions Enrollment Platform.
 * This file provides functions to interact with the application management API endpoints,
 * handling CRUD operations, status tracking, and document requirements.
 * 
 * Key features implemented:
 * - Online application submission and management (F-001)
 * - Application status tracking (F-003)
 * - Document requirement management (F-002)
 * - Multi-step application form with progress saving (F-001-RQ-001)
 */
import apiClient from './apiClient';
import { 
  Application,
  ApplicationListItem,
  ApplicationCreateRequest, 
  ApplicationUpdateRequest,
  ApplicationSubmitRequest,
  ApplicationResponse,
  ApplicationListResponse,
  ApplicationCompletionStatus,
  ApplicationFilter,
  ApplicationStatusRecord
} from '../types/application';

/**
 * Fetches a list of applications for the current user with optional filtering and pagination
 * 
 * @param filters - Optional filters for the applications list
 * @param page - Page number for pagination (default: 1)
 * @param perPage - Number of items per page (default: 10)
 * @returns Promise resolving to a paginated list of applications
 */
export const getApplications = async (
  filters: ApplicationFilter = {},
  page: number = 1,
  perPage: number = 10
): Promise<ApplicationListResponse> => {
  const params = {
    ...filters,
    page,
    per_page: perPage
  };
  
  return apiClient.get<ApplicationListResponse>('/applications', params);
};

/**
 * Fetches a specific application by ID with optional includes for related data
 * 
 * @param id - The ID of the application to fetch
 * @param includeDocuments - Whether to include related documents (default: false)
 * @param includeStatuses - Whether to include status history (default: false)
 * @returns Promise resolving to the application details
 */
export const getApplication = async (
  id: number,
  includeDocuments: boolean = false,
  includeStatuses: boolean = false
): Promise<ApplicationResponse> => {
  const params: Record<string, any> = {};
  
  // Add includes if specified
  if (includeDocuments || includeStatuses) {
    params.include = [];
    
    if (includeDocuments) {
      params.include.push('documents');
    }
    
    if (includeStatuses) {
      params.include.push('statuses');
    }
  }
  
  return apiClient.get<ApplicationResponse>(`/applications/${id}`, params);
};

/**
 * Creates a new application with the specified type, term, and year
 * 
 * @param applicationData - The application data including type, term, and year
 * @returns Promise resolving to the created application
 */
export const createApplication = async (
  applicationData: ApplicationCreateRequest
): Promise<ApplicationResponse> => {
  return apiClient.post<ApplicationResponse>('/applications', applicationData);
};

/**
 * Updates an existing application with new data
 * 
 * @param id - The ID of the application to update
 * @param applicationData - The updated application data
 * @returns Promise resolving to the updated application
 */
export const updateApplication = async (
  id: number,
  applicationData: ApplicationUpdateRequest
): Promise<ApplicationResponse> => {
  return apiClient.put<ApplicationResponse>(`/applications/${id}`, applicationData);
};

/**
 * Submits an application for review
 * 
 * @param id - The ID of the application to submit
 * @returns Promise resolving to the submitted application
 */
export const submitApplication = async (
  id: number
): Promise<ApplicationResponse> => {
  const submitRequest: ApplicationSubmitRequest = {
    application_id: id
  };
  
  return apiClient.post<ApplicationResponse>(`/applications/${id}/submit`, submitRequest);
};

/**
 * Deletes a draft application
 * 
 * @param id - The ID of the application to delete
 * @returns Promise resolving when the application is deleted
 */
export const deleteApplication = async (
  id: number
): Promise<void> => {
  return apiClient.delete<void>(`/applications/${id}`);
};

/**
 * Checks if an application is complete and ready for submission
 * 
 * @param id - The ID of the application to check
 * @returns Promise resolving to the application completion status
 */
export const checkApplicationComplete = async (
  id: number
): Promise<ApplicationCompletionStatus> => {
  return apiClient.get<ApplicationCompletionStatus>(`/applications/${id}/check-completion`);
};

/**
 * Gets a list of required documents for an application
 * 
 * @param id - The ID of the application
 * @returns Promise resolving to an array of required document types
 */
export const getRequiredDocuments = async (
  id: number
): Promise<string[]> => {
  return apiClient.get<string[]>(`/applications/${id}/required-documents`);
};

/**
 * Gets a list of missing documents for an application
 * 
 * @param id - The ID of the application
 * @returns Promise resolving to an array of missing document types
 */
export const getMissingDocuments = async (
  id: number
): Promise<string[]> => {
  return apiClient.get<string[]>(`/applications/${id}/missing-documents`);
};

/**
 * Gets the status history for an application
 * 
 * @param id - The ID of the application
 * @returns Promise resolving to an array of status history records
 */
export const getApplicationStatuses = async (
  id: number
): Promise<ApplicationStatusRecord[]> => {
  return apiClient.get<ApplicationStatusRecord[]>(`/applications/${id}/statuses`);
};