/**
 * Service for managing document-related operations in the Student Admissions Enrollment Platform.
 * This service provides a higher-level interface for document management, including uploading,
 * downloading, verification, and analysis, with additional business logic and error handling
 * beyond the basic API client.
 */
import documentsApi from '../api/documents';
import FileUploadService from './FileUploadService';
import AIService from './AIService';
import {
  Document,
  DocumentType,
  DocumentUploadRequest,
  DocumentFilter,
  VerificationStatus,
  DocumentVerificationRequest,
  AIDocumentAnalysisResult,
  DocumentStatus
} from '../types/document';
import {
  formatFileSize,
  validateFileForDocumentType,
  getErrorMessageForFileValidation,
  isImageFile,
  isPdfFile,
  getFileExtension
} from '../utils/fileUtils';
import { ID } from '../types/common';

// Threshold for using chunked upload (5MB)
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024;

/**
 * Get documents based on filter criteria with error handling
 * @param filter - Filter criteria for documents
 * @returns Promise resolving to an array of documents
 */
const getDocuments = async (filter?: DocumentFilter): Promise<Document[]> => {
  try {
    const response = await documentsApi.getDocuments(filter);
    return response.data.map(enrichDocumentWithMetadata);
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw new Error('Failed to fetch documents. Please try again later.');
  }
};

/**
 * Get a single document by ID with error handling
 * @param documentId - Document ID
 * @returns Promise resolving to a document
 */
const getDocument = async (documentId: ID): Promise<Document> => {
  try {
    const response = await documentsApi.getDocument(documentId);
    return enrichDocumentWithMetadata(response.data);
  } catch (error) {
    console.error(`Error fetching document ${documentId}:`, error);
    throw new Error('Failed to fetch document. Please try again later.');
  }
};

/**
 * Get all documents for a specific application with error handling
 * @param applicationId - Application ID
 * @returns Promise resolving to an array of documents
 */
const getDocumentsByApplication = async (applicationId: ID): Promise<Document[]> => {
  try {
    const response = await documentsApi.getDocumentsByApplication(applicationId);
    return response.data.map(enrichDocumentWithMetadata);
  } catch (error) {
    console.error(`Error fetching documents for application ${applicationId}:`, error);
    throw new Error('Failed to fetch application documents. Please try again later.');
  }
};

/**
 * Upload a document with progress tracking and automatic chunking for large files
 * @param file - File to upload
 * @param documentType - Type of document being uploaded
 * @param applicationId - ID of the application this document belongs to
 * @param onProgress - Optional callback for tracking upload progress
 * @returns Promise resolving to the uploaded document
 */
const uploadDocument = async (
  file: File,
  documentType: string,
  applicationId: ID,
  onProgress?: (progress: number) => void
): Promise<Document> => {
  try {
    // Validate the file for the specified document type
    if (!validateFileForDocumentType(file, documentType)) {
      throw new Error(getErrorMessageForFileValidation(file, documentType));
    }
    
    // Determine if we should use chunked upload based on file size
    if (file.size > LARGE_FILE_THRESHOLD) {
      const response = await FileUploadService.uploadChunkedDocumentFile(
        file, 
        documentType, 
        applicationId, 
        onProgress
      );
      return enrichDocumentWithMetadata(response);
    } else {
      const response = await FileUploadService.uploadDocumentFile(
        file,
        documentType,
        applicationId,
        onProgress
      );
      return enrichDocumentWithMetadata(response);
    }
  } catch (error) {
    console.error('Error uploading document:', error);
    // Provide more specific error message based on the error
    if (error instanceof Error) {
      throw error; // Rethrow validation errors
    }
    throw new Error('Failed to upload document. Please try again later.');
  }
};

/**
 * Replace an existing document with a new file
 * @param documentId - Document ID
 * @param file - New file to replace the existing document
 * @param onProgress - Optional callback for tracking upload progress
 * @returns Promise resolving to the updated document
 */
const replaceDocument = async (
  documentId: ID,
  file: File,
  onProgress?: (progress: number) => void
): Promise<Document> => {
  try {
    // Get the existing document to check its document type
    const existingDocument = await getDocument(documentId);
    
    // Validate the file for the existing document type
    if (!validateFileForDocumentType(file, existingDocument.document_type)) {
      throw new Error(getErrorMessageForFileValidation(file, existingDocument.document_type));
    }
    
    // Use the appropriate upload method based on file size
    if (file.size > LARGE_FILE_THRESHOLD) {
      // For replacing large files with chunked upload, we need to create a new document
      // and then delete the old one after successful upload
      const response = await FileUploadService.uploadChunkedDocumentFile(
        file,
        existingDocument.document_type,
        existingDocument.application_id,
        onProgress
      );
      
      // Delete the old document
      await deleteDocument(documentId);
      
      return enrichDocumentWithMetadata(response);
    } else {
      // For smaller files, we can use the replace method directly
      const response = await documentsApi.replaceDocument(documentId, file);
      return enrichDocumentWithMetadata(response.data);
    }
  } catch (error) {
    console.error(`Error replacing document ${documentId}:`, error);
    if (error instanceof Error) {
      throw error; // Rethrow validation errors
    }
    throw new Error('Failed to replace document. Please try again later.');
  }
};

/**
 * Delete a document by ID with error handling
 * @param documentId - Document ID
 * @returns Promise resolving to true if deletion was successful
 */
const deleteDocument = async (documentId: ID): Promise<boolean> => {
  try {
    const response = await documentsApi.deleteDocument(documentId);
    return response.data.success;
  } catch (error) {
    console.error(`Error deleting document ${documentId}:`, error);
    throw new Error('Failed to delete document. Please try again later.');
  }
};

/**
 * Get a temporary download URL for a document
 * @param documentId - Document ID
 * @param expiresIn - Optional expiration time in seconds
 * @returns Promise resolving to the download URL
 */
const getDocumentDownloadUrl = async (
  documentId: ID,
  expiresIn?: number
): Promise<string> => {
  try {
    const response = await documentsApi.getDocumentDownloadUrl(documentId, expiresIn);
    return response.data.download_url;
  } catch (error) {
    console.error(`Error getting download URL for document ${documentId}:`, error);
    throw new Error('Failed to generate download link. Please try again later.');
  }
};

/**
 * Download a document directly as a blob
 * @param documentId - Document ID
 * @returns Promise resolving to the document blob
 */
const downloadDocument = async (documentId: ID): Promise<Blob> => {
  try {
    return await documentsApi.downloadDocument(documentId);
  } catch (error) {
    console.error(`Error downloading document ${documentId}:`, error);
    throw new Error('Failed to download document. Please try again later.');
  }
};

/**
 * Manually verify a document (admin only)
 * @param documentId - Document ID
 * @param data - Verification data including notes
 * @returns Promise resolving to the verified document
 */
const verifyDocument = async (
  documentId: ID,
  data: DocumentVerificationRequest
): Promise<Document> => {
  try {
    const response = await documentsApi.verifyDocument(documentId, data);
    return enrichDocumentWithMetadata(response.data);
  } catch (error) {
    console.error(`Error verifying document ${documentId}:`, error);
    throw new Error('Failed to verify document. Please try again later.');
  }
};

/**
 * Reject a document with a reason (admin only)
 * @param documentId - Document ID
 * @param data - Rejection data including notes and reason
 * @returns Promise resolving to the rejected document
 */
const rejectDocument = async (
  documentId: ID,
  data: DocumentVerificationRequest
): Promise<Document> => {
  try {
    const response = await documentsApi.rejectDocument(documentId, data);
    return enrichDocumentWithMetadata(response.data);
  } catch (error) {
    console.error(`Error rejecting document ${documentId}:`, error);
    throw new Error('Failed to reject document. Please try again later.');
  }
};

/**
 * Get the current verification status for a document
 * @param documentId - Document ID
 * @returns Promise resolving to the verification status
 */
const getVerificationStatus = async (
  documentId: ID
): Promise<{ status: string, verified_at: string | null }> => {
  try {
    const response = await documentsApi.getVerificationStatus(documentId);
    return response.data;
  } catch (error) {
    console.error(`Error getting verification status for document ${documentId}:`, error);
    throw new Error('Failed to retrieve verification status. Please try again later.');
  }
};

/**
 * Get the verification history for a document
 * @param documentId - Document ID
 * @returns Promise resolving to the verification history
 */
const getVerificationHistory = async (documentId: ID): Promise<Array<any>> => {
  try {
    const response = await documentsApi.getVerificationHistory(documentId);
    return response.data;
  } catch (error) {
    console.error(`Error getting verification history for document ${documentId}:`, error);
    throw new Error('Failed to retrieve verification history. Please try again later.');
  }
};

/**
 * Analyze a document using AI to extract information and verify authenticity
 * @param documentId - Document ID
 * @returns Promise resolving to the AI analysis results
 */
const analyzeDocument = async (documentId: ID): Promise<AIDocumentAnalysisResult> => {
  try {
    const response = await AIService.analyzeDocument(documentId);
    return response.data;
  } catch (error) {
    console.error(`Error analyzing document ${documentId}:`, error);
    throw new Error('Failed to analyze document. Please try again later.');
  }
};

/**
 * Get the results of a previous document analysis
 * @param documentId - Document ID
 * @returns Promise resolving to the AI analysis results
 */
const getDocumentAnalysisResult = async (documentId: ID): Promise<AIDocumentAnalysisResult> => {
  try {
    const response = await AIService.getDocumentAnalysisResult(documentId);
    return response.data;
  } catch (error) {
    console.error(`Error getting analysis results for document ${documentId}:`, error);
    throw new Error('Failed to retrieve document analysis. Please try again later.');
  }
};

/**
 * Get AI-driven suggestions for document preparation
 * @param applicationId - Application ID
 * @param documentType - Document type
 * @returns Promise resolving to document preparation suggestions
 */
const getDocumentSuggestions = async (
  applicationId: ID,
  documentType: string
): Promise<Array<{ tip: string, importance: string }>> => {
  try {
    const response = await AIService.getDocumentSuggestions(applicationId, documentType);
    return response.data.suggestions;
  } catch (error) {
    console.error('Error getting document suggestions:', error);
    throw new Error('Failed to retrieve document suggestions. Please try again later.');
  }
};

/**
 * Get fraud detection analysis for a document
 * @param documentId - Document ID
 * @returns Promise resolving to fraud detection results
 */
const getFraudDetectionResult = async (
  documentId: ID
): Promise<{
  authenticity_score: number,
  potential_issues: string[],
  verification_recommendation: string
}> => {
  try {
    const response = await AIService.getFraudDetectionResult(documentId);
    return response.data;
  } catch (error) {
    console.error(`Error getting fraud detection for document ${documentId}:`, error);
    throw new Error('Failed to retrieve fraud detection results. Please try again later.');
  }
};

/**
 * Get information about allowed document types and file specifications
 * @returns Promise resolving to document specifications
 */
const getAllowedDocumentTypes = async (): Promise<{
  allowed_types: string[],
  max_size: number,
  supported_formats: string[]
}> => {
  try {
    const response = await documentsApi.getAllowedDocumentTypes();
    return response.data;
  } catch (error) {
    console.error('Error getting allowed document types:', error);
    throw new Error('Failed to retrieve document specifications. Please try again later.');
  }
};

/**
 * Get the status of required documents for an application
 * @param applicationId - Application ID
 * @param applicationType - Application type
 * @returns Promise resolving to document status information
 */
const getDocumentStatus = async (
  applicationId: ID,
  applicationType: string
): Promise<Array<DocumentStatus>> => {
  try {
    const response = await documentsApi.getDocumentStatus(applicationId, applicationType);
    return response.data;
  } catch (error) {
    console.error(`Error getting document status for application ${applicationId}:`, error);
    throw new Error('Failed to retrieve document status. Please try again later.');
  }
};

/**
 * Cancel an ongoing document upload
 * @param uploadId - Upload ID
 * @returns Promise resolving to true if cancellation was successful
 */
const cancelUpload = async (uploadId: string): Promise<boolean> => {
  try {
    return await FileUploadService.cancelUpload(uploadId);
  } catch (error) {
    console.error(`Error cancelling upload ${uploadId}:`, error);
    throw new Error('Failed to cancel upload. Please try again later.');
  }
};

/**
 * Get the current progress of an ongoing document upload
 * @param uploadId - Upload ID
 * @returns Promise resolving to the upload progress information
 */
const getUploadProgress = async (
  uploadId: string
): Promise<{ progress: number, status: string }> => {
  try {
    return FileUploadService.getUploadProgress(uploadId);
  } catch (error) {
    console.error(`Error getting upload progress for ${uploadId}:`, error);
    throw new Error('Failed to retrieve upload progress. Please try again later.');
  }
};

/**
 * Enrich a document object with additional metadata and derived properties
 * @param document - Document object
 * @returns Document with additional metadata
 */
const enrichDocumentWithMetadata = (document: Document): Document => {
  return {
    ...document,
    file_extension: getFileExtension(document.file_name),
    is_image: isImageFile(document.mime_type),
    is_pdf: isPdfFile(document.mime_type),
    file_size_formatted: formatFileSize(document.file_size)
  };
};

const DocumentService = {
  getDocuments,
  getDocument,
  getDocumentsByApplication,
  uploadDocument,
  replaceDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  downloadDocument,
  verifyDocument,
  rejectDocument,
  getVerificationStatus,
  getVerificationHistory,
  analyzeDocument,
  getDocumentAnalysisResult,
  getDocumentSuggestions,
  getFraudDetectionResult,
  getAllowedDocumentTypes,
  getDocumentStatus,
  cancelUpload,
  getUploadProgress,
  enrichDocumentWithMetadata
};

export default DocumentService;