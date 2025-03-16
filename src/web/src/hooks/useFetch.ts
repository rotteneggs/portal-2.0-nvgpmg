import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey, UseQueryOptions, UseMutationOptions } from 'react-query'; // react-query v4.0.0
import apiClient from '../api/apiClient';
import { ApiRequestConfig } from '../types/api';
import { handleApiError } from '../utils/apiUtils';

/**
 * Hook for making GET requests with React Query
 * @param queryKey - Cache key for React Query
 * @param endpoint - API endpoint path
 * @param params - Query parameters
 * @param options - Additional React Query options
 * @returns Query result with data, loading state, and error
 */
export const useApiQuery = <T = any>(
  queryKey: QueryKey,
  endpoint: string,
  params: Record<string, any> = {},
  options: UseQueryOptions<T, Error> = {}
) => {
  return useQuery<T, Error>(
    queryKey,
    async () => {
      try {
        return await apiClient.get<T>(endpoint, params);
      } catch (error) {
        throw handleApiError(error);
      }
    },
    options
  );
};

/**
 * Hook for making POST, PUT, PATCH, and DELETE requests with React Query
 * @param method - HTTP method (post, put, patch, delete)
 * @param endpoint - API endpoint path
 * @param options - React Query mutation options
 * @returns Mutation result with mutate function, loading state, and error
 */
export const useApiMutation = <T = any, TVariables = any>(
  method: 'post' | 'put' | 'patch' | 'delete',
  endpoint: string,
  options: UseMutationOptions<T, Error, TVariables> = {}
) => {
  return useMutation<T, Error, TVariables>(
    async (variables) => {
      try {
        if (method === 'post') {
          return await apiClient.post<T>(endpoint, variables);
        } else if (method === 'put') {
          return await apiClient.put<T>(endpoint, variables);
        } else if (method === 'patch') {
          return await apiClient.patch<T>(endpoint, variables);
        } else if (method === 'delete') {
          return await apiClient.delete<T>(endpoint, variables);
        }
        throw new Error(`Unsupported method: ${method}`);
      } catch (error) {
        throw handleApiError(error);
      }
    },
    options
  );
};

/**
 * Hook for uploading files with React Query
 * @param endpoint - API endpoint path
 * @param options - React Query mutation options
 * @returns Mutation result for file uploads
 */
export const useApiUpload = <T = any>(
  endpoint: string,
  options: UseMutationOptions<
    T,
    Error,
    { file: File | FormData; additionalData?: Record<string, any> }
  > = {}
) => {
  return useMutation<T, Error, { file: File | FormData; additionalData?: Record<string, any> }>(
    async ({ file, additionalData }) => {
      try {
        return await apiClient.upload<T>(endpoint, file, additionalData);
      } catch (error) {
        throw handleApiError(error);
      }
    },
    options
  );
};

/**
 * Hook for downloading files with React Query
 * @param endpoint - API endpoint path
 * @param params - Query parameters
 * @param options - React Query options
 * @returns Query result for file downloads
 */
export const useApiDownload = (
  endpoint: string,
  params: Record<string, any> = {},
  options: UseQueryOptions<Blob, Error> = {}
) => {
  return useQuery<Blob, Error>(
    ['download', endpoint, params],
    async () => {
      try {
        return await apiClient.download(endpoint, params);
      } catch (error) {
        throw handleApiError(error);
      }
    },
    {
      ...options,
      // By default, don't automatically fetch downloads (enable when needed)
      enabled: options.enabled !== undefined ? options.enabled : false
    }
  );
};

/**
 * Custom hook that provides a simplified interface for making API requests
 * with React Query for efficient data fetching, caching, and state management.
 */
const useFetch = () => {
  const queryClient = useQueryClient();

  /**
   * Invalidates queries to refresh data
   * @param queryKey - Cache key to invalidate
   */
  const invalidateQueries = useCallback((queryKey: QueryKey) => {
    return queryClient.invalidateQueries(queryKey);
  }, [queryClient]);

  /**
   * Prefetches data for a query to improve user experience
   * @param queryKey - Cache key for React Query
   * @param endpoint - API endpoint path
   * @param params - Query parameters
   */
  const prefetchQuery = useCallback(<T = any>(
    queryKey: QueryKey,
    endpoint: string,
    params: Record<string, any> = {}
  ) => {
    return queryClient.prefetchQuery<T, Error>(
      queryKey,
      async () => {
        try {
          return await apiClient.get<T>(endpoint, params);
        } catch (error) {
          throw handleApiError(error);
        }
      }
    );
  }, [queryClient]);

  return {
    invalidateQueries,
    prefetchQuery,
  };
};

export { useApiQuery, useApiMutation, useApiUpload, useApiDownload };
export default useFetch;