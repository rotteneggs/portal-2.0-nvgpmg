import { AxiosRequestConfig } from 'axios'; // axios v1.3.4

/**
 * Enum representing available API versions
 */
export enum ApiVersion {
  V1 = 'v1'
}

/**
 * Type representing HTTP methods used in API requests
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Interface for pagination information in API responses
 */
export interface ApiPagination {
  total: number;        // Total number of items
  per_page: number;     // Number of items per page
  current_page: number; // Current page number
  last_page: number;    // Last page number
  from: number;         // Starting item index on current page
  to: number;           // Ending item index on current page
}

/**
 * Interface for metadata in API responses, such as pagination information
 */
export interface ApiMeta {
  pagination: ApiPagination;
}

/**
 * Generic interface for successful API responses with data payload
 */
export interface ApiResponse<T = any> {
  success: boolean;        // Indicates if the request was successful
  data: T | null;          // The actual data payload
  meta: ApiMeta | null;    // Additional metadata (pagination, etc.)
  message: string | null;  // Optional success message
}

/**
 * Interface for detailed error information in API error responses
 */
export interface ApiErrorDetails {
  code: string;                          // Error code
  message: string;                       // Human-readable error message
  details: Record<string, string[]> | null; // Optional detailed error information (e.g., validation errors)
}

/**
 * Interface for API error responses
 */
export interface ApiError {
  success: boolean;        // Always false for error responses
  error: ApiErrorDetails;  // Detailed error information
}

/**
 * Interface extending Axios request configuration with custom properties for the application
 */
export interface ApiRequestConfig extends AxiosRequestConfig {
  headers: Record<string, string>;
  params: Record<string, any>;
  timeout: number;
  withCredentials: boolean;
  responseType: string;
  onUploadProgress?: (progressEvent: any) => void;
  onDownloadProgress?: (progressEvent: any) => void;
}

/**
 * Interface for standardized query parameters used in API requests
 */
export interface ApiQueryParams {
  page?: number;                 // Page number for pagination
  per_page?: number;             // Items per page for pagination
  sort_by?: string;              // Field to sort by
  sort_direction?: 'asc' | 'desc'; // Sort direction
  search?: string;               // Search query
  filters?: Record<string, any>; // Additional filters
  include?: string[];            // Related resources to include
}

/**
 * Enum representing standardized error codes used across the application
 */
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

/**
 * Type representing sort directions for API queries
 */
export type ApiSortDirection = 'asc' | 'desc';

/**
 * Type for specifying related resources to include in API responses
 */
export type ApiInclude = string[];

/**
 * Interface for defining filters in API requests
 */
export interface ApiFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like';
  value: any;
}

/**
 * Specialized interface for paginated API responses
 */
export interface ApiPaginatedResponse<T = any> {
  success: boolean;    // Indicates if the request was successful
  data: T[];           // Array of items
  meta: ApiMeta;       // Metadata including pagination info
  message: string | null; // Optional success message
}