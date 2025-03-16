/**
 * API client module for financial aid-related endpoints in the Student Admissions Enrollment Platform.
 * Handles interactions with the backend for financial aid applications, documents, and status management.
 */
import apiClient from './apiClient'; // axios v1.3.4
import {
  FinancialAidApplication,
  FinancialAidDocument,
  CreateFinancialAidApplicationRequest,
  UpdateFinancialAidApplicationRequest,
  FinancialAidApplicationResponse,
  FinancialAidApplicationsResponse,
  FinancialAidDocumentResponse,
  FinancialAidDocumentsResponse,
  RequiredDocumentsResponse,
  DocumentDownloadUrlResponse,
  ApplicationCompleteResponse,
  FinancialAidFilter,
  FinancialAidDocumentFilter
} from '../types/financialAid';

/**
 * Fetches a list of financial aid applications for the current user with optional filtering and pagination
 * @param filters - Optional filters to apply to the query
 * @param page - Page number for pagination (default: 1)
 * @param perPage - Number of items per page (default: 10)
 * @returns Promise resolving to a paginated list of financial aid applications
 */
export const getFinancialAidApplications = (
  filters?: FinancialAidFilter,
  page: number = 1,
  perPage: number = 10
): Promise<FinancialAidApplicationsResponse> => {
  const params = {
    ...(filters || {}),
    page,
    per_page: perPage
  };

  return apiClient.get('/financial-aid', params);
};

/**
 * Fetches a specific financial aid application by ID with optional includes for related data
 * @param id - The ID of the financial aid application to fetch
 * @param includeDocuments - Whether to include related documents in the response
 * @returns Promise resolving to the financial aid application details
 */
export const getFinancialAidApplication = (
  id: number,
  includeDocuments: boolean = false
): Promise<FinancialAidApplicationResponse> => {
  const params = {
    include: includeDocuments ? ['documents'] : []
  };

  return apiClient.get(`/financial-aid/${id}`, params);
};

/**
 * Fetches a financial aid application by parent application ID
 * @param applicationId - The ID of the parent application
 * @param includeDocuments - Whether to include related documents in the response
 * @returns Promise resolving to the financial aid application details
 */
export const getFinancialAidApplicationByApplication = (
  applicationId: number,
  includeDocuments: boolean = false
): Promise<FinancialAidApplicationResponse> => {
  const params = {
    include: includeDocuments ? ['documents'] : []
  };

  return apiClient.get(`/financial-aid/application/${applicationId}`, params);
};

/**
 * Creates a new financial aid application
 * @param applicationData - The financial aid application data to submit
 * @returns Promise resolving to the created financial aid application
 */
export const createFinancialAidApplication = (
  applicationData: CreateFinancialAidApplicationRequest
): Promise<FinancialAidApplicationResponse> => {
  return apiClient.post('/financial-aid', applicationData);
};

/**
 * Updates an existing financial aid application with new data
 * @param id - The ID of the financial aid application to update
 * @param applicationData - The updated financial aid application data
 * @returns Promise resolving to the updated financial aid application
 */
export const updateFinancialAidApplication = (
  id: number,
  applicationData: UpdateFinancialAidApplicationRequest
): Promise<FinancialAidApplicationResponse> => {
  return apiClient.put(`/financial-aid/${id}`, applicationData);
};

/**
 * Submits a financial aid application for review
 * @param id - The ID of the financial aid application to submit
 * @returns Promise resolving to the submitted financial aid application
 */
export const submitFinancialAidApplication = (
  id: number
): Promise<FinancialAidApplicationResponse> => {
  return apiClient.post(`/financial-aid/${id}/submit`);
};

/**
 * Deletes a draft financial aid application
 * @param id - The ID of the financial aid application to delete
 * @returns Promise resolving when the financial aid application is deleted
 */
export const deleteFinancialAidApplication = (
  id: number
): Promise<void> => {
  return apiClient.delete(`/financial-aid/${id}`);
};

/**
 * Uploads a document for a financial aid application
 * @param financialAidApplicationId - The ID of the financial aid application
 * @param file - The file to upload
 * @param documentType - The type of document being uploaded
 * @returns Promise resolving to the uploaded document details
 */
export const uploadFinancialAidDocument = (
  financialAidApplicationId: number,
  file: File,
  documentType: string
): Promise<FinancialAidDocumentResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  return apiClient.upload(
    `/financial-aid/${financialAidApplicationId}/documents`,
    formData
  );
};

/**
 * Fetches all documents for a financial aid application
 * @param financialAidApplicationId - The ID of the financial aid application
 * @param filters - Optional filters to apply to the query
 * @param includeDownloadUrls - Whether to include temporary download URLs in the response
 * @returns Promise resolving to a list of financial aid documents
 */
export const getFinancialAidDocuments = (
  financialAidApplicationId: number,
  filters?: FinancialAidDocumentFilter,
  includeDownloadUrls: boolean = false
): Promise<FinancialAidDocumentsResponse> => {
  const params = {
    ...(filters || {}),
    include_download_urls: includeDownloadUrls
  };

  return apiClient.get(`/financial-aid/${financialAidApplicationId}/documents`, params);
};

/**
 * Gets a temporary download URL for a financial aid document
 * @param financialAidApplicationId - The ID of the financial aid application
 * @param documentId - The ID of the document
 * @param expirationMinutes - Number of minutes until the URL expires
 * @returns Promise resolving to an object containing the download URL
 */
export const getDocumentDownloadUrl = (
  financialAidApplicationId: number,
  documentId: number,
  expirationMinutes: number = 30
): Promise<DocumentDownloadUrlResponse> => {
  const params = {
    expiration_minutes: expirationMinutes
  };

  return apiClient.get(
    `/financial-aid/${financialAidApplicationId}/documents/${documentId}/download`,
    params
  );
};

/**
 * Deletes a financial aid document
 * @param financialAidApplicationId - The ID of the financial aid application
 * @param documentId - The ID of the document to delete
 * @returns Promise resolving when the document is deleted
 */
export const deleteFinancialAidDocument = (
  financialAidApplicationId: number,
  documentId: number
): Promise<void> => {
  return apiClient.delete(`/financial-aid/${financialAidApplicationId}/documents/${documentId}`);
};

/**
 * Gets a list of required documents for a financial aid application
 * @param financialAidApplicationId - The ID of the financial aid application
 * @returns Promise resolving to an array of required document types
 */
export const getRequiredDocuments = (
  financialAidApplicationId: number
): Promise<RequiredDocumentsResponse> => {
  return apiClient.get(`/financial-aid/${financialAidApplicationId}/required-documents`);
};

/**
 * Gets a list of missing documents for a financial aid application
 * @param financialAidApplicationId - The ID of the financial aid application
 * @returns Promise resolving to an array of missing document types
 */
export const getMissingDocuments = (
  financialAidApplicationId: number
): Promise<RequiredDocumentsResponse> => {
  return apiClient.get(`/financial-aid/${financialAidApplicationId}/missing-documents`);
};

/**
 * Checks if a financial aid application is complete with all required documents
 * @param financialAidApplicationId - The ID of the financial aid application
 * @returns Promise resolving to the application completion status
 */
export const checkApplicationComplete = (
  financialAidApplicationId: number
): Promise<ApplicationCompleteResponse> => {
  return apiClient.get(`/financial-aid/${financialAidApplicationId}/check-complete`);
};

/**
 * Gets a list of supported financial aid types
 * @returns Promise resolving to an array of supported aid types
 */
export const getSupportedAidTypes = (): Promise<string[]> => {
  return apiClient.get('/financial-aid/aid-types');
};