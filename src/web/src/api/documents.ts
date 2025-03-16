/**
 * API client module for document-related operations in the Student Admissions Enrollment Platform.
 * Implements functionality for document upload, retrieval, verification, and status checking
 * as specified in F-002 (Document Upload and Management) and F-006 (Document Verification System).
 */
import apiClient from './apiClient';
import {
  Document,
  DocumentResponse,
  DocumentsResponse,
  DocumentUploadRequest,
  DocumentVerificationRequest,
  DocumentFilter,
  VerificationStatus,
  DocumentVerificationResponse
} from '../types/document';
import { ApiResponse } from '../types/api';

/**
 * Fetch documents based on optional filter criteria
 * @param filter - Optional filter parameters for documents
 * @returns Promise resolving to a list of documents
 */
const getDocuments = (filter?: DocumentFilter): Promise<DocumentsResponse> => {
  return apiClient.get('documents', filter || {});
};

/**
 * Fetch a specific document by ID
 * @param id - Document ID
 * @returns Promise resolving to a single document
 */
const getDocument = (id: string | number): Promise<DocumentResponse> => {
  return apiClient.get(`documents/${id}`);
};

/**
 * Get all documents for a specific application
 * @param applicationId - Application ID
 * @returns Promise resolving to a list of documents
 */
const getDocumentsByApplication = (applicationId: string | number): Promise<DocumentsResponse> => {
  return apiClient.get('documents', { application_id: applicationId });
};

/**
 * Upload a new document
 * Implements core functionality for F-002 Document Upload and Management
 * @param data - Document upload data including file, type, and application ID
 * @returns Promise resolving to the uploaded document
 */
const uploadDocument = (data: DocumentUploadRequest): Promise<DocumentResponse> => {
  const { file, document_type, application_id } = data;
  return apiClient.upload('documents', file, { document_type, application_id });
};

/**
 * Replace an existing document with a new file
 * @param id - Document ID
 * @param file - New file to replace the existing document
 * @returns Promise resolving to the updated document
 */
const replaceDocument = (id: string | number, file: File): Promise<DocumentResponse> => {
  return apiClient.upload(`documents/${id}`, file);
};

/**
 * Delete a document by ID
 * @param id - Document ID
 * @returns Promise resolving to a success response
 */
const deleteDocument = (id: string | number): Promise<ApiResponse<{ success: boolean }>> => {
  return apiClient.delete(`documents/${id}`);
};

/**
 * Get a temporary download URL for a document
 * @param id - Document ID
 * @param expiresIn - Optional expiration time in seconds
 * @returns Promise resolving to an object containing the download URL
 */
const getDocumentDownloadUrl = (
  id: string | number,
  expiresIn?: number
): Promise<ApiResponse<{ download_url: string }>> => {
  return apiClient.get(`documents/${id}/download`, expiresIn ? { expires_in: expiresIn } : {});
};

/**
 * Download a document directly as a blob
 * @param id - Document ID
 * @returns Promise resolving to the document blob
 */
const downloadDocument = (id: string | number): Promise<Blob> => {
  return apiClient.download(`documents/${id}/download`);
};

/**
 * Manually verify a document (admin only)
 * Implements F-006 Document Verification System functionality
 * @param id - Document ID
 * @param data - Verification data including notes
 * @returns Promise resolving to the verification result
 */
const verifyDocument = (
  id: string | number, 
  data: DocumentVerificationRequest
): Promise<DocumentVerificationResponse> => {
  return apiClient.post(`documents/${id}/verify`, data);
};

/**
 * Reject a document with a reason (admin only)
 * Part of the Document Verification Workflow (4.1.2)
 * @param id - Document ID
 * @param data - Rejection data including notes and reason
 * @returns Promise resolving to the rejection result
 */
const rejectDocument = (
  id: string | number, 
  data: DocumentVerificationRequest
): Promise<DocumentVerificationResponse> => {
  return apiClient.post(`documents/${id}/reject`, data);
};

/**
 * Get the current verification status for a document
 * @param id - Document ID
 * @returns Promise resolving to the verification status
 */
const getVerificationStatus = (
  id: string | number
): Promise<ApiResponse<{ status: string, verified_at: string | null }>> => {
  return apiClient.get(`documents/${id}/verification`);
};

/**
 * Get the verification history for a document
 * Provides audit trail for document verification process
 * @param id - Document ID
 * @returns Promise resolving to the verification history
 */
const getVerificationHistory = (id: string | number): Promise<ApiResponse<Array<any>>> => {
  return apiClient.get(`documents/${id}/verification/history`);
};

/**
 * Get information about allowed document types and file specifications
 * Supports the document upload interface with file validation requirements
 * @returns Promise resolving to document specifications
 */
const getAllowedDocumentTypes = (): Promise<ApiResponse<{
  allowed_types: string[],
  max_size: number,
  supported_formats: string[]
}>> => {
  return apiClient.get('documents/types');
};

/**
 * Get the status of required documents for an application
 * Used to track document requirements as part of the application process
 * @param applicationId - Application ID
 * @param applicationType - Application type
 * @returns Promise resolving to document status information
 */
const getDocumentStatus = (
  applicationId: string | number,
  applicationType: string
): Promise<ApiResponse<Array<{
  document_type: string,
  uploaded: boolean,
  verified: boolean,
  required: boolean
}>>> => {
  return apiClient.get(`documents/status/${applicationId}`, { application_type: applicationType });
};

export default {
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
  getAllowedDocumentTypes,
  getDocumentStatus
};