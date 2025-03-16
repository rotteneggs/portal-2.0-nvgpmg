/**
 * Service layer for financial aid functionality in the Student Admissions Enrollment Platform.
 * This service provides methods for managing financial aid applications, documents, and related
 * operations, acting as an abstraction layer between UI components and the API client.
 */
import {
  getFinancialAidApplications,
  getFinancialAidApplication,
  getFinancialAidApplicationByApplication,
  createFinancialAidApplication,
  updateFinancialAidApplication,
  submitFinancialAidApplication,
  deleteFinancialAidApplication,
  uploadFinancialAidDocument,
  getFinancialAidDocuments,
  getDocumentDownloadUrl,
  deleteFinancialAidDocument,
  getRequiredDocuments,
  getMissingDocuments,
  checkApplicationComplete,
  getSupportedAidTypes
} from '../api/financialAid';

import {
  FinancialAidApplication,
  FinancialAidDocument,
  CreateFinancialAidApplicationRequest,
  UpdateFinancialAidApplicationRequest,
  FinancialAidFilter,
  FinancialAidDocumentFilter,
  FinancialAidSummary,
  FinancialAidType,
  FinancialAidStatus
} from '../types/financialAid';

/**
 * Fetches financial aid applications with optional filtering and pagination
 * @param filters - Optional filters to apply to the query
 * @param page - Page number for pagination (default: 1)
 * @param perPage - Number of items per page (default: 10)
 * @returns Promise resolving to paginated financial aid applications with metadata
 */
const fetchFinancialAidApplications = async (
  filters?: FinancialAidFilter,
  page: number = 1,
  perPage: number = 10
): Promise<{ applications: FinancialAidApplication[], total: number, page: number, perPage: number }> => {
  const response = await getFinancialAidApplications(filters, page, perPage);
  
  return {
    applications: response.data,
    total: response.meta.pagination.total,
    page: response.meta.pagination.current_page,
    perPage: response.meta.pagination.per_page
  };
};

/**
 * Fetches a specific financial aid application by ID
 * @param id - The ID of the financial aid application to fetch
 * @param includeDocuments - Whether to include related documents in the response
 * @returns Promise resolving to the financial aid application details
 */
const fetchFinancialAidApplication = async (
  id: number,
  includeDocuments: boolean = false
): Promise<FinancialAidApplication> => {
  const response = await getFinancialAidApplication(id, includeDocuments);
  return response.data;
};

/**
 * Fetches a financial aid application by parent application ID
 * @param applicationId - The ID of the parent application
 * @param includeDocuments - Whether to include related documents in the response
 * @returns Promise resolving to the financial aid application or null if not found
 */
const fetchFinancialAidApplicationByApplicationId = async (
  applicationId: number,
  includeDocuments: boolean = false
): Promise<FinancialAidApplication | null> => {
  try {
    const response = await getFinancialAidApplicationByApplication(applicationId, includeDocuments);
    return response.data;
  } catch (error) {
    // If the application is not found, return null instead of throwing an error
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Creates a new financial aid application with progress tracking
 * @param applicationData - The financial aid application data to submit
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to the created financial aid application
 */
const createFinancialAidApplicationWithProgress = async (
  applicationData: CreateFinancialAidApplicationRequest,
  onProgress?: (progress: number) => void
): Promise<FinancialAidApplication> => {
  // Call the create endpoint
  const response = await createFinancialAidApplication(applicationData);
  
  // Update progress to 100% when complete
  if (onProgress) {
    onProgress(100);
  }
  
  return response.data;
};

/**
 * Updates an existing financial aid application with progress tracking
 * @param id - The ID of the financial aid application to update
 * @param applicationData - The updated financial aid application data
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to the updated financial aid application
 */
const updateFinancialAidApplicationWithProgress = async (
  id: number,
  applicationData: UpdateFinancialAidApplicationRequest,
  onProgress?: (progress: number) => void
): Promise<FinancialAidApplication> => {
  // Call the update endpoint
  const response = await updateFinancialAidApplication(id, applicationData);
  
  // Update progress to 100% when complete
  if (onProgress) {
    onProgress(100);
  }
  
  return response.data;
};

/**
 * Submits a financial aid application for review with progress tracking
 * @param id - The ID of the financial aid application to submit
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to the submitted financial aid application
 */
const submitFinancialAidApplicationWithProgress = async (
  id: number,
  onProgress?: (progress: number) => void
): Promise<FinancialAidApplication> => {
  // Call the submit endpoint
  const response = await submitFinancialAidApplication(id);
  
  // Update progress to 100% when complete
  if (onProgress) {
    onProgress(100);
  }
  
  return response.data;
};

/**
 * Deletes a draft financial aid application with confirmation
 * @param id - The ID of the financial aid application to delete
 * @param skipConfirmation - Whether to skip the confirmation dialog
 * @returns Promise resolving to true if deletion was successful
 */
const deleteFinancialAidApplicationWithConfirmation = async (
  id: number,
  skipConfirmation: boolean = false
): Promise<boolean> => {
  // Show confirmation dialog unless explicitly skipped
  if (!skipConfirmation) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this financial aid application? This action cannot be undone.'
    );
    
    if (!confirmed) {
      return false;
    }
  }
  
  // Delete the application
  await deleteFinancialAidApplication(id);
  return true;
};

/**
 * Uploads a document for a financial aid application with progress tracking
 * @param financialAidApplicationId - The ID of the financial aid application
 * @param file - The file to upload
 * @param documentType - The type of document being uploaded
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to the uploaded document details
 */
const uploadFinancialAidDocumentWithProgress = async (
  financialAidApplicationId: number,
  file: File,
  documentType: string,
  onProgress?: (progress: number) => void
): Promise<FinancialAidDocument> => {
  // Call the upload endpoint
  const response = await uploadFinancialAidDocument(
    financialAidApplicationId,
    file,
    documentType
  );
  
  // Update progress to 100% when complete
  if (onProgress) {
    onProgress(100);
  }
  
  return response.data;
};

/**
 * Fetches documents for a financial aid application with optional filtering
 * @param financialAidApplicationId - The ID of the financial aid application
 * @param filters - Optional filters to apply to the query
 * @param includeDownloadUrls - Whether to include temporary download URLs in the response
 * @returns Promise resolving to an array of financial aid documents
 */
const fetchFinancialAidDocuments = async (
  financialAidApplicationId: number,
  filters?: FinancialAidDocumentFilter,
  includeDownloadUrls: boolean = false
): Promise<FinancialAidDocument[]> => {
  const response = await getFinancialAidDocuments(
    financialAidApplicationId,
    filters,
    includeDownloadUrls
  );
  
  return response.data;
};

/**
 * Fetches a temporary download URL for a financial aid document
 * @param financialAidApplicationId - The ID of the financial aid application
 * @param documentId - The ID of the document
 * @param expirationMinutes - Number of minutes until the URL expires (default: 30)
 * @returns Promise resolving to the document download URL
 */
const fetchDocumentDownloadUrl = async (
  financialAidApplicationId: number,
  documentId: number,
  expirationMinutes: number = 30
): Promise<string> => {
  const response = await getDocumentDownloadUrl(
    financialAidApplicationId,
    documentId,
    expirationMinutes
  );
  
  return response.data.download_url;
};

/**
 * Deletes a financial aid document with confirmation
 * @param financialAidApplicationId - The ID of the financial aid application
 * @param documentId - The ID of the document to delete
 * @param skipConfirmation - Whether to skip the confirmation dialog
 * @returns Promise resolving to true if deletion was successful
 */
const deleteFinancialAidDocumentWithConfirmation = async (
  financialAidApplicationId: number,
  documentId: number,
  skipConfirmation: boolean = false
): Promise<boolean> => {
  // Show confirmation dialog unless explicitly skipped
  if (!skipConfirmation) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this document? This action cannot be undone.'
    );
    
    if (!confirmed) {
      return false;
    }
  }
  
  // Delete the document
  await deleteFinancialAidDocument(financialAidApplicationId, documentId);
  return true;
};

/**
 * Fetches required documents for a financial aid application
 * @param financialAidApplicationId - The ID of the financial aid application
 * @returns Promise resolving to an array of required document types
 */
const fetchRequiredDocuments = async (
  financialAidApplicationId: number
): Promise<string[]> => {
  const response = await getRequiredDocuments(financialAidApplicationId);
  return response.data;
};

/**
 * Fetches missing documents for a financial aid application
 * @param financialAidApplicationId - The ID of the financial aid application
 * @returns Promise resolving to an array of missing document types
 */
const fetchMissingDocuments = async (
  financialAidApplicationId: number
): Promise<string[]> => {
  const response = await getMissingDocuments(financialAidApplicationId);
  return response.data;
};

/**
 * Checks if a financial aid application is complete with all required documents
 * @param financialAidApplicationId - The ID of the financial aid application
 * @returns Promise resolving to the application completion status and any missing documents
 */
const checkFinancialAidApplicationComplete = async (
  financialAidApplicationId: number
): Promise<{ isComplete: boolean, missingDocuments?: string[] }> => {
  const response = await checkApplicationComplete(financialAidApplicationId);
  
  return {
    isComplete: response.data.is_complete,
    missingDocuments: response.data.missing_documents
  };
};

/**
 * Fetches the list of supported financial aid types
 * @returns Promise resolving to an array of supported aid types
 */
const fetchSupportedAidTypes = async (): Promise<string[]> => {
  return await getSupportedAidTypes();
};

/**
 * Generates a summary of a financial aid application for dashboard display
 * @param application - The financial aid application to summarize
 * @returns A summarized version of the financial aid application
 */
const generateFinancialAidSummary = (
  application: FinancialAidApplication
): FinancialAidSummary => {
  const missingDocumentsCount = application.documents 
    ? application.documents.filter(doc => !doc.is_verified).length
    : 0;
    
  const isComplete = application.status === FinancialAidStatus.SUBMITTED || 
                    application.status === FinancialAidStatus.UNDER_REVIEW ||
                    application.status === FinancialAidStatus.APPROVED;
  
  return {
    id: application.id,
    aid_type: application.aid_type,
    status: application.status,
    submitted_at: application.submitted_at,
    is_complete: isComplete,
    missing_documents_count: missingDocumentsCount
  };
};

export default {
  fetchFinancialAidApplications,
  fetchFinancialAidApplication,
  fetchFinancialAidApplicationByApplicationId,
  createFinancialAidApplicationWithProgress,
  updateFinancialAidApplicationWithProgress,
  submitFinancialAidApplicationWithProgress,
  deleteFinancialAidApplicationWithConfirmation,
  uploadFinancialAidDocumentWithProgress,
  fetchFinancialAidDocuments,
  fetchDocumentDownloadUrl,
  deleteFinancialAidDocumentWithConfirmation,
  fetchRequiredDocuments,
  fetchMissingDocuments,
  checkFinancialAidApplicationComplete,
  fetchSupportedAidTypes,
  generateFinancialAidSummary
};