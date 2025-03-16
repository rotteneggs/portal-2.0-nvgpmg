/**
 * Utility functions for error handling in the Student Admissions Enrollment Platform.
 * 
 * This file provides helper functions for standardizing error handling,
 * creating consistent error objects, extracting human-readable error messages,
 * and type guards for error types.
 */
import { ApiError, ApiErrorDetails, ApiErrorCode } from '../types/api';
import { AxiosError } from 'axios'; // axios v1.3.4

/**
 * Type guard to check if an error is an API error response
 * @param error - The error to check
 * @returns True if the error is an API error response
 */
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    !error.success &&
    'error' in error &&
    typeof error.error === 'object'
  );
};

/**
 * Type guard to check if an error is an Axios error
 * @param error - The error to check
 * @returns True if the error is an Axios error
 */
export const isAxiosError = <T = any>(error: unknown): error is AxiosError<T> => {
  return error instanceof AxiosError;
};

/**
 * Extracts a human-readable error message from various error types
 * @param error - The error to extract a message from
 * @returns A human-readable error message
 */
export const getErrorMessage = (error: unknown): string => {
  // If it's an API error, use the error message from the API response
  if (isApiError(error)) {
    return error.error.message;
  }

  // If it's an Axios error, handle different scenarios
  if (isAxiosError(error)) {
    // If the server returned an error response
    if (error.response?.data) {
      // Check if it matches our API error format
      if (isApiError(error.response.data)) {
        return error.response.data.error.message;
      }
      
      // If it's a string, use it directly
      if (typeof error.response.data === 'string') {
        return error.response.data;
      }
      
      // If it has a message property, use that
      if (typeof error.response.data === 'object' && 'message' in error.response.data) {
        return String(error.response.data.message);
      }
    }
    
    // If it's a network error
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again later.';
    }
    
    if (error.message) {
      return error.message;
    }
    
    // Fall back to HTTP status text
    if (error.response?.statusText) {
      return error.response.statusText;
    }
  }

  // If it's a string, return it directly
  if (typeof error === 'string') {
    return error;
  }

  // If it's an Error object, return its message
  if (error instanceof Error) {
    return error.message;
  }

  // Default fallback message
  return 'An unexpected error occurred. Please try again later.';
};

/**
 * Extracts validation errors from an API error response
 * @param error - The API error response
 * @returns Validation errors by field or null if not available
 */
export const getValidationErrors = (
  error: unknown
): Record<string, string[]> | null => {
  if (isApiError(error) && 
      error.error.code === ApiErrorCode.VALIDATION_ERROR && 
      error.error.details) {
    return error.error.details;
  }
  
  // If it's an Axios error, try to extract validation errors from the response
  if (isAxiosError(error) && error.response?.data) {
    // Check if the response data is an API error
    if (isApiError(error.response.data) && 
        error.response.data.error.code === ApiErrorCode.VALIDATION_ERROR && 
        error.response.data.error.details) {
      return error.response.data.error.details;
    }
  }
  
  return null;
};

/**
 * Creates a standardized API error object from various error types
 * @param error - The error to standardize
 * @returns A standardized API error object
 */
export const createErrorObject = (error: unknown): ApiError => {
  // If it's already an API error, return it directly
  if (isApiError(error)) {
    return error;
  }

  // Handle Axios errors
  if (isAxiosError(error)) {
    // If the server returned an API error response, use that
    if (error.response?.data && isApiError(error.response.data)) {
      return error.response.data;
    }

    // Otherwise, create an appropriate error based on status code
    if (error.response) {
      const status = error.response.status;
      let code = ApiErrorCode.INTERNAL_SERVER_ERROR;
      let message = 'A server error occurred.';

      if (status === 400) {
        code = ApiErrorCode.VALIDATION_ERROR;
        message = 'Invalid request data.';
      } else if (status === 401) {
        code = ApiErrorCode.AUTHENTICATION_ERROR;
        message = 'You must be logged in to perform this action.';
      } else if (status === 403) {
        code = ApiErrorCode.AUTHORIZATION_ERROR;
        message = 'You do not have permission to perform this action.';
      } else if (status === 404) {
        code = ApiErrorCode.RESOURCE_NOT_FOUND;
        message = 'The requested resource was not found.';
      } else if (status === 409) {
        code = ApiErrorCode.RESOURCE_CONFLICT;
        message = 'The request could not be completed due to a conflict.';
      } else if (status === 503) {
        code = ApiErrorCode.SERVICE_UNAVAILABLE;
        message = 'The service is currently unavailable. Please try again later.';
      }

      // Use the error message from the response if available
      if (error.response.data && typeof error.response.data === 'object') {
        if ('message' in error.response.data) {
          message = String(error.response.data.message);
        }
      }

      return {
        success: false,
        error: {
          code,
          message,
          details: null
        }
      };
    }

    // For network errors (no response)
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: {
          code: ApiErrorCode.TIMEOUT_ERROR,
          message: 'Request timed out. Please try again later.',
          details: null
        }
      };
    }

    return {
      success: false,
      error: {
        code: ApiErrorCode.NETWORK_ERROR,
        message: error.message || 'A network error occurred. Please check your connection.',
        details: null
      }
    };
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: error.message || 'An unexpected error occurred.',
        details: null
      }
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: error,
        details: null
      }
    };
  }

  // Default fallback for unknown error types
  return {
    success: false,
    error: {
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
      details: null
    }
  };
};

/**
 * Formats validation errors into a more user-friendly structure
 * @param errors - Validation errors by field
 * @returns Formatted validation errors with first message per field
 */
export const formatValidationErrors = (
  errors: Record<string, string[]>
): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};
  
  // Take the first error message for each field
  Object.keys(errors).forEach(field => {
    if (errors[field] && errors[field].length > 0) {
      formattedErrors[field] = errors[field][0];
    }
  });
  
  return formattedErrors;
};