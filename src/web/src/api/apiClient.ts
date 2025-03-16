/**
 * Core API client module for the Student Admissions Enrollment Platform frontend application.
 * Provides a centralized interface for making HTTP requests to the backend API with consistent
 * error handling, authentication, and response formatting.
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'; // axios v1.3.4
import {
  formatApiUrl,
  createQueryString,
  handleApiResponse,
  handleApiError,
  getAuthHeader,
  createApiRequestConfig
} from '../utils/apiUtils';
import {
  ApiVersion,
  ApiResponse,
  ApiRequestConfig
} from '../types/api';

/**
 * Makes a GET request to the API
 * @param endpoint - The API endpoint path
 * @param params - Optional query parameters
 * @param config - Optional request configuration
 * @returns Promise resolving to the response data
 */
const get = <T = any>(
  endpoint: string,
  params: Record<string, any> = {},
  config: Partial<ApiRequestConfig> = {}
): Promise<T> => {
  const url = formatApiUrl(endpoint, ApiVersion.V1);
  const requestConfig = createApiRequestConfig({
    ...config,
    params
  });
  
  return axios.get<ApiResponse<T>>(url, requestConfig)
    .then(handleApiResponse)
    .catch(handleApiError);
};

/**
 * Makes a POST request to the API
 * @param endpoint - The API endpoint path
 * @param data - The data to send in the request body
 * @param params - Optional query parameters
 * @param config - Optional request configuration
 * @returns Promise resolving to the response data
 */
const post = <T = any>(
  endpoint: string,
  data: any,
  params: Record<string, any> = {},
  config: Partial<ApiRequestConfig> = {}
): Promise<T> => {
  const url = formatApiUrl(endpoint, ApiVersion.V1);
  const requestConfig = createApiRequestConfig({
    ...config,
    params
  });
  
  return axios.post<ApiResponse<T>>(url, data, requestConfig)
    .then(handleApiResponse)
    .catch(handleApiError);
};

/**
 * Makes a PUT request to the API
 * @param endpoint - The API endpoint path
 * @param data - The data to send in the request body
 * @param params - Optional query parameters
 * @param config - Optional request configuration
 * @returns Promise resolving to the response data
 */
const put = <T = any>(
  endpoint: string,
  data: any,
  params: Record<string, any> = {},
  config: Partial<ApiRequestConfig> = {}
): Promise<T> => {
  const url = formatApiUrl(endpoint, ApiVersion.V1);
  const requestConfig = createApiRequestConfig({
    ...config,
    params
  });
  
  return axios.put<ApiResponse<T>>(url, data, requestConfig)
    .then(handleApiResponse)
    .catch(handleApiError);
};

/**
 * Makes a PATCH request to the API
 * @param endpoint - The API endpoint path
 * @param data - The data to send in the request body
 * @param params - Optional query parameters
 * @param config - Optional request configuration
 * @returns Promise resolving to the response data
 */
const patch = <T = any>(
  endpoint: string,
  data: any,
  params: Record<string, any> = {},
  config: Partial<ApiRequestConfig> = {}
): Promise<T> => {
  const url = formatApiUrl(endpoint, ApiVersion.V1);
  const requestConfig = createApiRequestConfig({
    ...config,
    params
  });
  
  return axios.patch<ApiResponse<T>>(url, data, requestConfig)
    .then(handleApiResponse)
    .catch(handleApiError);
};

/**
 * Makes a DELETE request to the API
 * @param endpoint - The API endpoint path
 * @param params - Optional query parameters
 * @param config - Optional request configuration
 * @returns Promise resolving to the response data
 */
const del = <T = any>(
  endpoint: string,
  params: Record<string, any> = {},
  config: Partial<ApiRequestConfig> = {}
): Promise<T> => {
  const url = formatApiUrl(endpoint, ApiVersion.V1);
  const requestConfig = createApiRequestConfig({
    ...config,
    params
  });
  
  return axios.delete<ApiResponse<T>>(url, requestConfig)
    .then(handleApiResponse)
    .catch(handleApiError);
};

/**
 * Uploads a file to the API
 * @param endpoint - The API endpoint path
 * @param file - The file to upload (File object or FormData)
 * @param additionalData - Additional form data to include
 * @param config - Optional request configuration
 * @returns Promise resolving to the response data
 */
const upload = <T = any>(
  endpoint: string,
  file: File | FormData,
  additionalData: Record<string, any> = {},
  config: Partial<ApiRequestConfig> = {}
): Promise<T> => {
  const url = formatApiUrl(endpoint, ApiVersion.V1);
  
  // Create FormData if not already FormData
  let formData: FormData;
  if (file instanceof FormData) {
    formData = file;
  } else {
    formData = new FormData();
    formData.append('file', file);
  }
  
  // Add additional data to FormData if provided
  if (additionalData) {
    Object.keys(additionalData).forEach(key => {
      const value = additionalData[key];
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(item => formData.append(`${key}[]`, item));
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });
  }
  
  // Create request config with multipart/form-data content type
  const requestConfig = createApiRequestConfig({
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(config.headers || {})
    }
  });
  
  return axios.post<ApiResponse<T>>(url, formData, requestConfig)
    .then(handleApiResponse)
    .catch(handleApiError);
};

/**
 * Downloads a file from the API
 * @param endpoint - The API endpoint path
 * @param params - Optional query parameters
 * @param config - Optional request configuration
 * @returns Promise resolving to the file blob
 */
const download = (
  endpoint: string,
  params: Record<string, any> = {},
  config: Partial<ApiRequestConfig> = {}
): Promise<Blob> => {
  const url = formatApiUrl(endpoint, ApiVersion.V1);
  const requestConfig = createApiRequestConfig({
    ...config,
    params,
    responseType: 'blob'
  });
  
  return axios.get(url, requestConfig)
    .then(response => response.data)
    .catch(handleApiError);
};

/**
 * Sets up a request interceptor for all API requests
 * @param onFulfilled - Function to run before request is sent
 * @param onRejected - Function to run when request errors
 * @returns Interceptor ID that can be used to eject the interceptor
 */
const setRequestInterceptor = (
  onFulfilled: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>,
  onRejected?: (error: any) => any
): number => {
  return axios.interceptors.request.use(onFulfilled, onRejected);
};

/**
 * Sets up a response interceptor for all API responses
 * @param onFulfilled - Function to run when response is received
 * @param onRejected - Function to run when response errors
 * @returns Interceptor ID that can be used to eject the interceptor
 */
const setResponseInterceptor = (
  onFulfilled: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
  onRejected?: (error: any) => any
): number => {
  return axios.interceptors.response.use(onFulfilled, onRejected);
};

/**
 * Removes a request interceptor
 * @param interceptorId - ID of the interceptor to remove
 */
const ejectRequestInterceptor = (interceptorId: number): void => {
  axios.interceptors.request.eject(interceptorId);
};

/**
 * Removes a response interceptor
 * @param interceptorId - ID of the interceptor to remove
 */
const ejectResponseInterceptor = (interceptorId: number): void => {
  axios.interceptors.response.eject(interceptorId);
};

export default {
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  download,
  setRequestInterceptor,
  setResponseInterceptor,
  ejectRequestInterceptor,
  ejectResponseInterceptor
};