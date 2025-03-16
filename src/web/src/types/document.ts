import { ID, Timestamp, Nullable, Optional } from './common';

/**
 * Enum of supported document types in the system
 */
export enum DocumentType {
  TRANSCRIPT = 'transcript',
  RECOMMENDATION = 'recommendation',
  PERSONAL_STATEMENT = 'personal_statement',
  IDENTIFICATION = 'identification',
  TEST_SCORE = 'test_score',
  FINANCIAL = 'financial',
  OTHER = 'other'
}

/**
 * Enum of document verification methods
 */
export enum VerificationMethod {
  AI = 'ai',
  MANUAL = 'manual',
  EXTERNAL = 'external'
}

/**
 * Enum of document verification statuses
 */
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

/**
 * Interface representing a document in the system
 */
export interface Document {
  id: ID;
  user_id: ID;
  application_id: ID;
  document_type: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  file_size_formatted: string;
  is_verified: boolean;
  verified_at: Nullable<Timestamp>;
  verified_by_user_id: Nullable<ID>;
  created_at: Timestamp;
  updated_at: Timestamp;
  download_url: Optional<string>;
  is_image: boolean;
  is_pdf: boolean;
  file_extension: string;
  user: Optional<any>;
  application: Optional<any>;
  verifier: Optional<any>;
  verification: Optional<DocumentVerification>;
  verification_history: Optional<DocumentVerification[]>;
}

/**
 * Interface representing a document verification record
 */
export interface DocumentVerification {
  id: ID;
  document_id: ID;
  verification_method: string;
  verification_status: string;
  verification_data: any;
  confidence_score: Nullable<number>;
  confidence_percentage: Nullable<number>;
  notes: Nullable<string>;
  verified_by_user_id: Nullable<ID>;
  created_at: Timestamp;
  verifier: Optional<any>;
}

/**
 * Interface representing AI document analysis results
 */
export interface AIDocumentAnalysisResult {
  document_id: ID;
  detected_document_type: string;
  confidence_score: number;
  extracted_data: Record<string, any>;
  authenticity_score: number;
  potential_issues: string[];
  verification_recommendation: string;
  created_at: Timestamp;
}

/**
 * Interface for document upload request data
 */
export interface DocumentUploadRequest {
  file: File;
  document_type: string;
  application_id: ID;
}

/**
 * Interface for document verification request data
 */
export interface DocumentVerificationRequest {
  notes: Optional<string>;
  verification_data: Optional<any>;
}

/**
 * Interface for filtering documents in API requests
 */
export interface DocumentFilter {
  application_id: Optional<ID>;
  document_type: Optional<string | string[]>;
  is_verified: Optional<boolean>;
  page: Optional<number>;
  per_page: Optional<number>;
  sort_by: Optional<string>;
  sort_direction: Optional<'asc' | 'desc'>;
}

/**
 * Interface for API responses containing a single document
 */
export interface DocumentResponse {
  success: boolean;
  data: Document;
  message: Optional<string>;
}

/**
 * Interface for API responses containing multiple documents
 */
export interface DocumentsResponse {
  success: boolean;
  data: Document[];
  meta: Optional<{
    pagination: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
    }
  }>;
  message: Optional<string>;
}

/**
 * Interface for API responses after document verification
 */
export interface DocumentVerificationResponse {
  success: boolean;
  data: Document & { verification: DocumentVerification };
  message: Optional<string>;
}

/**
 * Interface for document type metadata and requirements
 */
export interface DocumentTypeInfo {
  type: string;
  label: string;
  description: string;
  allowed_formats: string[];
  max_size: number;
  required: boolean;
}

/**
 * Interface for tracking document status in an application
 */
export interface DocumentStatus {
  document_type: string;
  uploaded: boolean;
  verified: boolean;
  document_id: Optional<ID>;
  required: boolean;
  upload_date: Optional<Timestamp>;
  verification_date: Optional<Timestamp>;
}