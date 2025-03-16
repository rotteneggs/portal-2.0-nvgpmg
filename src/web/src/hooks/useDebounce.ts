import { useState, useEffect, useRef } from "react"; // React 18.x

/**
 * A hook that delays updating a value until a specified delay has passed since the last update.
 * This helps optimize performance by reducing the frequency of expensive operations like API calls
 * during rapid user input (e.g. search fields, form inputs with real-time validation).
 * 
 * @template T The type of the value being debounced
 * @param value The value to debounce
 * @param delay The delay in milliseconds before the value updates
 * @returns The debounced value that updates only after the specified delay
 * 
 * @example
 * // Basic usage with search input
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * // Effect only runs when debouncedSearchTerm changes (not on every keystroke)
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     searchApi(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 */
function useDebounce<T>(value: T, delay: number): T {
  // Initialize state for the debounced value with the initial value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  // Create a ref to store the timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing timeout to cancel pending updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Create a new timeout that updates the debounced value after the specified delay
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Clean up by clearing the timeout when the component unmounts or dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]); // Effect runs when value or delay changes
  
  // Return the debounced value
  return debouncedValue;
}

export default useDebounce;