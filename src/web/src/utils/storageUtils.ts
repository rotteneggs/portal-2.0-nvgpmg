/**
 * Utility functions for browser storage operations in the Student Admissions Enrollment Platform.
 * Provides a consistent interface for storing, retrieving, and removing data from 
 * localStorage and sessionStorage with proper error handling and type safety.
 */

/**
 * Enum for specifying which browser storage to use
 */
export enum StorageType {
  LOCAL = 'localStorage',
  SESSION = 'sessionStorage'
}

/**
 * Checks if code is running in a browser environment
 * @returns True if in browser, false otherwise
 */
const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Stores data in browser storage with error handling
 * @param key - The key to store the data under
 * @param value - The value to store (will be stringified if not a string)
 * @param storageType - Which storage to use (localStorage or sessionStorage)
 * @returns True if successful, false if an error occurred
 */
export const setItem = (key: string, value: any, storageType: StorageType = StorageType.LOCAL): boolean => {
  if (!isBrowser()) return false;
  
  try {
    // Try to stringify the value if it's not a string
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Try to store the stringified value in the specified storage type
    window[storageType].setItem(key, stringValue);
    return true;
  } catch (error) {
    // Handle errors like quota exceeded or security errors
    console.error(`Error storing item in ${storageType}:`, error);
    return false;
  }
};

/**
 * Retrieves data from browser storage with error handling and optional parsing
 * @param key - The key to retrieve data for
 * @param storageType - Which storage to use (localStorage or sessionStorage)
 * @param parse - Whether to attempt to parse the value as JSON
 * @returns Retrieved value or null if not found or error occurred
 */
export const getItem = (key: string, storageType: StorageType = StorageType.LOCAL, parse: boolean = true): any => {
  if (!isBrowser()) return null;
  
  try {
    // Try to retrieve the value from the specified storage type
    const value = window[storageType].getItem(key);
    
    // If value is null or undefined, return null
    if (value === null || typeof value === 'undefined') {
      return null;
    }
    
    // If parse is true and the value is a string, try to parse it as JSON
    if (parse) {
      try {
        return JSON.parse(value);
      } catch (parseError) {
        // If parsing fails, return the string value
        return value;
      }
    }
    
    // Return the value as-is if no parsing is needed
    return value;
  } catch (error) {
    // Catch any errors during retrieval
    console.error(`Error retrieving item from ${storageType}:`, error);
    return null;
  }
};

/**
 * Removes an item from browser storage with error handling
 * @param key - The key to remove
 * @param storageType - Which storage to use (localStorage or sessionStorage)
 * @returns True if successful, false if an error occurred
 */
export const removeItem = (key: string, storageType: StorageType = StorageType.LOCAL): boolean => {
  if (!isBrowser()) return false;
  
  try {
    // Try to remove the item from the specified storage type
    window[storageType].removeItem(key);
    return true;
  } catch (error) {
    // Catch any errors during removal
    console.error(`Error removing item from ${storageType}:`, error);
    return false;
  }
};

/**
 * Clears all items from the specified storage type
 * @param storageType - Which storage to clear (localStorage or sessionStorage)
 * @returns True if successful, false if an error occurred
 */
export const clearStorage = (storageType: StorageType = StorageType.LOCAL): boolean => {
  if (!isBrowser()) return false;
  
  try {
    // Try to clear all items from the specified storage type
    window[storageType].clear();
    return true;
  } catch (error) {
    // Catch any errors during clearing
    console.error(`Error clearing ${storageType}:`, error);
    return false;
  }
};

// Constants for token storage
const TOKEN_KEY = 'auth_token';

/**
 * Stores authentication token in browser storage
 * @param token - The authentication token to store
 * @returns True if successful, false if an error occurred
 */
export const setToken = (token: string): boolean => {
  return setItem(TOKEN_KEY, token, StorageType.LOCAL);
};

/**
 * Retrieves authentication token from browser storage
 * @returns The token if found, null otherwise
 */
export const getToken = (): string | null => {
  return getItem(TOKEN_KEY, StorageType.LOCAL, false);
};

/**
 * Removes authentication token from browser storage
 * @returns True if successful, false if an error occurred
 */
export const removeToken = (): boolean => {
  return removeItem(TOKEN_KEY, StorageType.LOCAL);
};

/**
 * Checks if a specific storage type is available in the browser
 * @param storageType - Which storage to check (localStorage or sessionStorage)
 * @returns True if storage is available, false otherwise
 */
export const isStorageAvailable = (storageType: StorageType): boolean => {
  if (!isBrowser()) return false;
  
  try {
    const storage = window[storageType];
    const testKey = '__storage_test__';
    
    // Try to set and remove a test item
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    
    return true;
  } catch (error) {
    // Return false if any errors occur
    return false;
  }
};