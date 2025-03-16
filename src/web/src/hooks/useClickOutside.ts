import { useEffect, useRef } from 'react'; // React 18.x

/**
 * A custom hook that detects clicks outside of a specified element.
 * Useful for dismissible components like dropdowns, modals, and popups.
 *
 * @param callback - Function to call when a click outside is detected
 * @returns A ref object to attach to the DOM element that should detect outside clicks
 */
const useClickOutside = <T extends HTMLElement = HTMLElement>(callback: () => void) => {
  // Create a ref to store the DOM element
  const ref = useRef<T>(null);

  useEffect(() => {
    // Handler function to check if click is outside the element
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // If the ref is attached to an element and the click target is not contained within that element
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    // Add event listeners for both mouse and touch events
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Clean up the event listeners when the component unmounts or dependencies change
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [callback]); // Re-run effect if callback changes

  // Return the ref to be attached to the element
  return ref;
};

export default useClickOutside;