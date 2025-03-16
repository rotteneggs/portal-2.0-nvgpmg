import { ID, Timestamp, Nullable } from './common';
import { ApiResponse, ApiPaginatedResponse } from './api';

/**
 * Enum representing the types of financial aid available
 */
export enum FinancialAidType {
    NEED_BASED = 'need_based',
    MERIT_BASED = 'merit_based',
    SCHOLARSHIP = 'scholarship'
}

/**
 * Enum representing the possible statuses of a financial aid application
 */
export enum FinancialAidStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    UNDER_REVIEW = 'under_review',
    ADDITIONAL_INFO_REQUIRED = 'additional_info_required',
    APPROVED = 'approved',
    DENIED = 'denied'
}

/**
 * Enum representing the types of documents that can be uploaded for financial aid applications
 */
export enum FinancialAidDocumentType {
    TAX_RETURN = 'tax_return',
    FINANCIAL_STATEMENT = 'financial_statement',
    FAFSA_CONFIRMATION = 'fafsa_confirmation',
    TRANSCRIPT = 'transcript',
    ACHIEVEMENT_EVIDENCE = 'achievement_evidence',
    RECOMMENDATION_LETTER = 'recommendation_letter',
    ESSAY = 'essay',
    RESUME = 'resume'
}

/**
 * Interface for financial data submitted as part of a financial aid application
 */
export interface FinancialData {
    household_income: number;
    household_size: number;
    dependents: number;
    has_other_financial_aid: boolean;
    other_financial_aid_amount: Nullable<number>;
    special_circumstances: Nullable<string>;
    additional_information: Record<string, any>;
}

/**
 * Interface representing a financial aid application
 */
export interface FinancialAidApplication {
    id: ID;
    user_id: ID;
    application_id: ID;
    aid_type: string;
    financial_data: FinancialData;
    status: string;
    submitted_at: Nullable<Timestamp>;
    reviewed_at: Nullable<Timestamp>;
    reviewed_by_user_id: Nullable<ID>;
    created_at: Timestamp;
    updated_at: Timestamp;
    documents: FinancialAidDocument[];
}

/**
 * Interface representing a document uploaded for a financial aid application
 */
export interface FinancialAidDocument {
    id: ID;
    financial_aid_application_id: ID;
    document_type: string;
    file_name: string;
    file_path: string;
    mime_type: string;
    file_size: number;
    is_verified: boolean;
    verified_at: Nullable<Timestamp>;
    verified_by_user_id: Nullable<ID>;
    created_at: Timestamp;
    updated_at: Timestamp;
    download_url: Nullable<string>;
}

/**
 * Interface for creating a new financial aid application
 */
export interface CreateFinancialAidApplicationRequest {
    application_id: ID;
    aid_type: string;
    financial_data: FinancialData;
}

/**
 * Interface for updating an existing financial aid application
 */
export interface UpdateFinancialAidApplicationRequest {
    aid_type: string;
    financial_data: FinancialData;
}

/**
 * Type for API responses containing a single financial aid application
 */
export type FinancialAidApplicationResponse = ApiResponse<FinancialAidApplication>;

/**
 * Type for API responses containing multiple financial aid applications
 */
export type FinancialAidApplicationsResponse = ApiPaginatedResponse<FinancialAidApplication>;

/**
 * Type for API responses containing a single financial aid document
 */
export type FinancialAidDocumentResponse = ApiResponse<FinancialAidDocument>;

/**
 * Type for API responses containing multiple financial aid documents
 */
export type FinancialAidDocumentsResponse = ApiPaginatedResponse<FinancialAidDocument>;

/**
 * Type for API responses containing a list of required document types
 */
export type RequiredDocumentsResponse = ApiResponse<string[]>;

/**
 * Type for API responses containing a document download URL
 */
export type DocumentDownloadUrlResponse = ApiResponse<{ download_url: string }>;

/**
 * Type for API responses containing application completion status
 */
export type ApplicationCompleteResponse = ApiResponse<{
    is_complete: boolean;
    missing_documents?: string[];
}>;

/**
 * Interface for filtering financial aid applications in API requests
 */
export interface FinancialAidFilter {
    aid_type: string | string[];
    status: string | string[];
    start_date: string;
    end_date: string;
}

/**
 * Interface for filtering financial aid documents in API requests
 */
export interface FinancialAidDocumentFilter {
    document_type: string | string[];
    is_verified: boolean;
}

/**
 * Interface for summarized financial aid application information for dashboard display
 */
export interface FinancialAidSummary {
    id: ID;
    aid_type: string;
    status: string;
    submitted_at: Nullable<Timestamp>;
    is_complete: boolean;
    missing_documents_count: number;
}