/**
 * Utility functions for API interactions in the Student Admissions Enrollment Platform frontend application.
 * This file provides helper functions for formatting API URLs, handling API responses and errors,
 * creating request configurations, and managing authentication headers.
 */
import axios, { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios'; // axios v1.3.4
import {
  ApiResponse,
  ApiError,
  ApiVersion,
  ApiRequestConfig,
  ApiQueryParams
} from '../types/api';
import { isApiError, getErrorMessage, createErrorObject } from './errorUtils';
import { getToken } from './storageUtils';

/**
 * The base URL for API requests, from environment variables
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Formats a URL for API requests with the correct base URL and version
 * @param endpoint - The API endpoint path (e.g., "/applications")
 * @param version - The API version to use (default: ApiVersion.V1)
 * @returns Formatted API URL
 */
export const formatApiUrl = (
  endpoint: string,
  version: ApiVersion = ApiVersion.V1
): string => {
  // Ensure endpoint starts with a slash
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Combine the base URL, version, and endpoint
  return `${API_BASE_URL}/${version}${formattedEndpoint}`;
};

/**
 * Creates a URL query string from an object of parameters
 * @param params - Object containing query parameters
 * @returns URL query string with "?" prefix or empty string if no params
 */
export const createQueryString = (params: Record<string, any>): string => {
  // Return empty string if params is empty or undefined
  if (!params || Object.keys(params).length === 0) {
    return '';
  }
  
  const searchParams = new URLSearchParams();
  
  // Add each parameter to the URLSearchParams object
  Object.entries(params).forEach(([key, value]) => {
    // Skip null or undefined values
    if (value === null || value === undefined) {
      return;
    }
    
    // Handle arrays by adding multiple entries with the same key
    if (Array.isArray(value)) {
      value.forEach(item => {
        // Convert non-primitive array items to JSON strings
        if (typeof item === 'object' && item !== null) {
          searchParams.append(`${key}[]`, JSON.stringify(item));
        } else {
          searchParams.append(`${key}[]`, String(item));
        }
      });
    } 
    // Handle objects by converting to JSON strings
    else if (typeof value === 'object' && value !== null) {
      searchParams.append(key, JSON.stringify(value));
    } 
    // Handle primitive values
    else {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Processes API responses to extract data consistently
 * @param response - Axios response containing API response
 * @returns Extracted data from the response
 * @throws Error if response is not successful
 */
export const handleApiResponse = <T>(
  response: AxiosResponse<ApiResponse<T>>
): T => {
  // Check if response has data property
  if (!response || !response.data) {
    throw new Error('Invalid API response: Missing data');
  }
  
  // Check if response.data has success property and it's true
  if (!response.data.success) {
    throw createErrorObject(response.data);
  }
  
  // Return the data from the response
  return response.data.data as T;
};

/**
 * Handles API errors consistently
 * @param error - The error to handle
 * @throws Standardized API error
 */
export const handleApiError = (error: unknown): never => {
  // If it's already an API error, throw it directly
  if (isApiError(error)) {
    throw error;
  }
  
  // Create a standardized error object and throw it
  throw createErrorObject(error);
};

/**
 * Gets authentication headers for API requests
 * @returns Object containing authentication headers
 */
export const getAuthHeader = (): Record<string, string> => {
  const token = getToken();
  
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  
  return {};
};

/**
 * Creates a configuration object for API requests
 * @param config - Optional partial configuration to merge with defaults
 * @returns Axios request configuration
 */
export const createApiRequestConfig = (
  config: Partial<ApiRequestConfig> = {}
): AxiosRequestConfig => {
  // Get authentication headers
  const authHeaders = getAuthHeader();
  
  // Default configuration
  const defaultConfig: Partial<ApiRequestConfig> = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...authHeaders
    },
    timeout: 30000, // 30 seconds
    withCredentials: true,
    responseType: 'json'
  };
  
  // Merge default configuration with provided config
  // Ensure headers are properly merged
  const mergedConfig: Partial<ApiRequestConfig> = {
    ...defaultConfig,
    ...config,
    headers: {
      ...defaultConfig.headers,
      ...(config.headers || {})
    }
  };
  
  return mergedConfig as AxiosRequestConfig;
};

/**
 * Type guard to check if a response is a successful API response
 * @param response - The response to check
 * @returns True if the response is a successful API response
 */
export const isSuccessResponse = <T>(response: unknown): response is ApiResponse<T> => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === true &&
    'data' in response
  );
};