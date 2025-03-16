import { useState, useEffect, useCallback } from 'react'; // react 18.x
import { StorageType, setItem, getItem, isStorageAvailable } from '../utils/storageUtils';

/**
 * Return type for the useLocalStorage hook
 */
interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((val: T) => T)) => void;
  removeValue: () => void;
}

/**
 * A custom React hook that provides a way to persist state in localStorage with a similar API to React's useState.
 * This hook enables components to easily store and retrieve data that persists across browser sessions,
 * with automatic serialization and deserialization of JSON data.
 * 
 * @param key - The key to store the value under in localStorage
 * @param initialValue - The initial value to use if no value is found in localStorage
 * @returns A tuple containing the current value, a setter function, and a function to remove the value
 */
const useLocalStorage = <T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, () => void] => {
  // Check if localStorage is available
  const storageAvailable = isStorageAvailable(StorageType.LOCAL);

  // Initialize state with the value from localStorage or the initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!storageAvailable) return initialValue;

    // Try to get the item from localStorage
    const item = getItem(key, StorageType.LOCAL);
    return item !== null ? item : initialValue;
  });

  // Create a function to update both the state and localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function (like React's setState)
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Update state
      setStoredValue(valueToStore);
      
      // Update localStorage if available
      if (storageAvailable) {
        setItem(key, valueToStore, StorageType.LOCAL);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, storageAvailable]);

  // Create a function to remove the value from localStorage and reset to initial value
  const removeValue = useCallback(() => {
    try {
      // Reset state to initial value
      setStoredValue(initialValue);
      
      // Remove the item from localStorage if available
      if (storageAvailable) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, storageAvailable]);

  // Listen for changes to localStorage in other tabs/windows
  useEffect(() => {
    if (!storageAvailable) return;

    // Handler for storage events
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        if (event.newValue === null) {
          // The key was removed, reset to initial value
          setStoredValue(initialValue);
        } else {
          // Get the updated value
          const newValue = getItem(key, StorageType.LOCAL);
          setStoredValue(newValue !== null ? newValue : initialValue);
        }
      }
    };

    // Add event listener
    window.addEventListener('storage', handleStorageChange);

    // Clean up
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue, storageAvailable]);

  return [storedValue, setValue, removeValue];
};

export default useLocalStorage;