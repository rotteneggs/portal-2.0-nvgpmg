import {
  formatApiUrl,
  createQueryString,
  handleApiResponse,
  handleApiError,
  getAuthHeader,
  createApiRequestConfig,
  isSuccessResponse
} from './apiUtils';
import { ApiVersion } from '../types/api';
import axios, { AxiosResponse, AxiosError } from 'axios'; // axios v1.3.4

// Mock the getToken function from storageUtils
jest.mock('./storageUtils', () => ({
  getToken: jest.fn()
}));

// Import the mocked module to access the mock functions
import { getToken } from './storageUtils';

/**
 * Mock implementation of getToken for testing
 */
const mockGetToken = (): string | null => {
  return 'mock-token-value';
};

describe('apiUtils', () => {
  // Common test data
  const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset process.env values to defaults
    process.env = {
      ...process.env,
      REACT_APP_API_URL: undefined
    };
  });

  afterEach(() => {
    // Clean up after each test
    jest.resetAllMocks();
  });

  describe('formatApiUrl', () => {
    test('should format URL with default API version', () => {
      const endpoint = '/applications';
      const expected = `${API_BASE_URL}/v1/applications`;
      expect(formatApiUrl(endpoint)).toBe(expected);
    });

    test('should format URL with specified API version', () => {
      const endpoint = '/applications';
      const expected = `${API_BASE_URL}/v1/applications`;
      expect(formatApiUrl(endpoint, ApiVersion.V1)).toBe(expected);
    });

    test('should handle endpoints without leading slash', () => {
      const endpoint = 'applications';
      const expected = `${API_BASE_URL}/v1/applications`;
      expect(formatApiUrl(endpoint)).toBe(expected);
    });

    test('should use custom API base URL when provided', () => {
      // Set custom API base URL
      process.env.REACT_APP_API_URL = 'https://api.example.com';
      const endpoint = '/applications';
      const expected = 'https://api.example.com/v1/applications';
      expect(formatApiUrl(endpoint)).toBe(expected);
    });
  });

  describe('createQueryString', () => {
    test('should return empty string for empty or undefined params', () => {
      expect(createQueryString({})).toBe('');
      expect(createQueryString(undefined as any)).toBe('');
    });

    test('should create query string with simple parameters', () => {
      const params = { page: 1, search: 'test' };
      expect(createQueryString(params)).toBe('?page=1&search=test');
    });

    test('should handle array parameters', () => {
      const params = { ids: [1, 2, 3] };
      expect(createQueryString(params)).toBe('?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3');
    });

    test('should handle object parameters', () => {
      const params = { filter: { name: 'test', active: true } };
      const expectedJson = JSON.stringify({ name: 'test', active: true });
      expect(createQueryString(params)).toBe(`?filter=${encodeURIComponent(expectedJson)}`);
    });

    test('should skip null and undefined values', () => {
      const params = { page: 1, search: null, filter: undefined };
      expect(createQueryString(params)).toBe('?page=1');
    });

    test('should handle complex parameters with mix of types', () => {
      const params = {
        page: 1,
        search: 'test',
        sort: 'name',
        direction: 'asc',
        filters: { status: 'active' },
        ids: [1, 2, 3]
      };
      
      const queryString = createQueryString(params);
      
      // Verify all parameters are included
      expect(queryString).toContain('page=1');
      expect(queryString).toContain('search=test');
      expect(queryString).toContain('sort=name');
      expect(queryString).toContain('direction=asc');
      expect(queryString).toContain(`filters=${encodeURIComponent(JSON.stringify({ status: 'active' }))}`);
      expect(queryString).toContain('ids%5B%5D=1');
      expect(queryString).toContain('ids%5B%5D=2');
      expect(queryString).toContain('ids%5B%5D=3');
      
      // Verify it starts with question mark
      expect(queryString.startsWith('?')).toBe(true);
    });

    test('should handle array of objects', () => {
      const params = { 
        filters: [{ field: 'status', value: 'active' }, { field: 'type', value: 'student' }]
      };
      
      const queryString = createQueryString(params);
      
      expect(queryString).toContain('filters%5B%5D=');
      expect(queryString).toContain(encodeURIComponent(JSON.stringify({ field: 'status', value: 'active' })));
      expect(queryString).toContain(encodeURIComponent(JSON.stringify({ field: 'type', value: 'student' })));
    });
  });

  describe('handleApiResponse', () => {
    test('should extract data from successful API response', () => {
      const responseData = { name: 'John', email: 'john@example.com' };
      const response = {
        data: {
          success: true,
          data: responseData,
          meta: null,
          message: null
        }
      } as AxiosResponse;

      expect(handleApiResponse(response)).toEqual(responseData);
    });

    test('should throw error if response is missing data property', () => {
      const response = {} as AxiosResponse;
      
      expect(() => handleApiResponse(response)).toThrow('Invalid API response: Missing data');
    });

    test('should throw error if response.data is null', () => {
      const response = { data: null } as AxiosResponse;
      
      expect(() => handleApiResponse(response)).toThrow('Invalid API response: Missing data');
    });

    test('should throw error if response indicates failure', () => {
      const response = {
        data: {
          success: false,
          error: {
            code: 'ERROR_CODE',
            message: 'Error message',
            details: null
          }
        }
      } as AxiosResponse;
      
      expect(() => handleApiResponse(response)).toThrow();
      
      try {
        handleApiResponse(response);
      } catch (error: any) {
        expect(error.success).toBe(false);
        expect(error.error.code).toBe('ERROR_CODE');
        expect(error.error.message).toBe('Error message');
      }
    });
  });

  describe('handleApiError', () => {
    test('should pass through API errors', () => {
      const apiError = {
        success: false,
        error: {
          code: 'ERROR_CODE',
          message: 'Error message',
          details: null
        }
      };
      
      try {
        handleApiError(apiError);
        fail('Expected handleApiError to throw');
      } catch (error) {
        expect(error).toEqual(apiError);
      }
    });

    test('should create error object from Error instance', () => {
      const errorMessage = 'Test error message';
      const error = new Error(errorMessage);
      
      try {
        handleApiError(error);
        fail('Expected handleApiError to throw');
      } catch (error: any) {
        expect(error.success).toBe(false);
        expect(error.error.message).toBe(errorMessage);
      }
    });

    test('should create error object from string', () => {
      const errorMessage = 'Test error message';
      
      try {
        handleApiError(errorMessage);
        fail('Expected handleApiError to throw');
      } catch (error: any) {
        expect(error.success).toBe(false);
        expect(error.error.message).toBe(errorMessage);
      }
    });

    test('should create error object from unknown error type', () => {
      try {
        handleApiError({});
        fail('Expected handleApiError to throw');
      } catch (error: any) {
        expect(error.success).toBe(false);
        expect(error.error.message).toBeDefined();
      }
    });

    test('should handle Axios errors', () => {
      const axiosError = new AxiosError(
        'Request failed with status code 404',
        'ERR_BAD_REQUEST',
        undefined,
        {},
        {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Resource not found' },
          headers: {},
          config: {} as any
        }
      );
      
      try {
        handleApiError(axiosError);
        fail('Expected handleApiError to throw');
      } catch (error: any) {
        expect(error.success).toBe(false);
        expect(error.error.message).toContain('not found');
      }
    });
  });

  describe('getAuthHeader', () => {
    test('should return authorization header with token when token exists', () => {
      (getToken as jest.Mock).mockImplementation(mockGetToken);
      
      const headers = getAuthHeader();
      
      expect(headers).toEqual({
        'Authorization': 'Bearer mock-token-value'
      });
      expect(getToken).toHaveBeenCalledTimes(1);
    });

    test('should return empty object when token does not exist', () => {
      (getToken as jest.Mock).mockReturnValue(null);
      
      const headers = getAuthHeader();
      
      expect(headers).toEqual({});
      expect(getToken).toHaveBeenCalledTimes(1);
    });

    test('should return empty object when token is empty string', () => {
      (getToken as jest.Mock).mockReturnValue('');
      
      const headers = getAuthHeader();
      
      expect(headers).toEqual({});
      expect(getToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('createApiRequestConfig', () => {
    test('should create config with default values', () => {
      (getToken as jest.Mock).mockImplementation(mockGetToken);
      
      const config = createApiRequestConfig();
      
      expect(config).toEqual({
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer mock-token-value'
        },
        timeout: 30000,
        withCredentials: true,
        responseType: 'json'
      });
    });

    test('should merge custom config with defaults', () => {
      (getToken as jest.Mock).mockImplementation(mockGetToken);
      
      const customConfig = {
        timeout: 5000,
        baseURL: 'https://api.example.com',
        headers: {
          'Custom-Header': 'custom-value'
        }
      };
      
      const config = createApiRequestConfig(customConfig);
      
      expect(config).toEqual({
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer mock-token-value',
          'Custom-Header': 'custom-value'
        },
        timeout: 5000,
        withCredentials: true,
        responseType: 'json',
        baseURL: 'https://api.example.com'
      });
    });

    test('should handle null or undefined headers in custom config', () => {
      (getToken as jest.Mock).mockImplementation(mockGetToken);
      
      const customConfig = {
        timeout: 5000,
        headers: undefined
      };
      
      const config = createApiRequestConfig(customConfig);
      
      expect(config.headers).toEqual({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer mock-token-value'
      });
    });

    test('should override default headers with custom headers', () => {
      (getToken as jest.Mock).mockImplementation(mockGetToken);
      
      const customConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Custom-Header': 'custom-value'
        }
      };
      
      const config = createApiRequestConfig(customConfig);
      
      expect(config.headers).toEqual({
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
        'Authorization': 'Bearer mock-token-value',
        'Custom-Header': 'custom-value'
      });
    });

    test('should include upload progress handler if provided', () => {
      const progressHandler = jest.fn();
      const customConfig = {
        onUploadProgress: progressHandler
      };
      
      const config = createApiRequestConfig(customConfig);
      
      expect(config.onUploadProgress).toBe(progressHandler);
    });
  });

  describe('isSuccessResponse', () => {
    test('should return true for valid successful API responses', () => {
      const response = {
        success: true,
        data: { result: 'test' },
        meta: null,
        message: null
      };
      
      expect(isSuccessResponse(response)).toBe(true);
    });

    test('should return false for API error responses', () => {
      const response = {
        success: false,
        error: {
          code: 'ERROR_CODE',
          message: 'Error message',
          details: null
        }
      };
      
      expect(isSuccessResponse(response)).toBe(false);
    });

    test('should return false for null or undefined', () => {
      expect(isSuccessResponse(null)).toBe(false);
      expect(isSuccessResponse(undefined)).toBe(false);
    });

    test('should return false for non-object values', () => {
      expect(isSuccessResponse('string')).toBe(false);
      expect(isSuccessResponse(123)).toBe(false);
      expect(isSuccessResponse(true)).toBe(false);
    });

    test('should return false for objects without required properties', () => {
      expect(isSuccessResponse({})).toBe(false);
      expect(isSuccessResponse({ success: true })).toBe(false);
      expect(isSuccessResponse({ data: {} })).toBe(false);
      expect(isSuccessResponse({ success: false, data: {} })).toBe(false);
    });

    test('should return false when success is not true', () => {
      expect(isSuccessResponse({ success: 'true', data: {} })).toBe(false);
      expect(isSuccessResponse({ success: 1, data: {} })).toBe(false);
      expect(isSuccessResponse({ success: null, data: {} })).toBe(false);
    });
  });
});