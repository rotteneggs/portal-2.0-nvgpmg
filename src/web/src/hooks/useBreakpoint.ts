import { useState, useEffect, useDebounce } from 'react';
import { breakpoints, getBreakpointFromWidth, getDeviceTypeFromBreakpoint } from '../styles/breakpoints';

/**
 * Interface defining the return type of the useBreakpoint hook
 */
interface BreakpointState {
  breakpoint: string;
  deviceType: string;
}

/**
 * Custom hook that provides the current responsive design breakpoint based on window width.
 * It monitors window resize events and returns the appropriate breakpoint and device type
 * for responsive UI adjustments.
 * 
 * @returns An object containing the current breakpoint (xs, sm, md, lg, xl) and 
 * device type (mobile, tablet, desktop, largeDesktop)
 */
const useBreakpoint = (): BreakpointState => {
  // Handle SSR - window will be undefined during server-side rendering
  const isClient = typeof window === 'object';
  
  // Initialize state with appropriate defaults
  const [width, setWidth] = useState<number>(isClient ? window.innerWidth : 0);
  
  // Use debounce hook to limit update frequency for performance optimization
  const debouncedWidth = useDebounce(width, 200);
  
  // Determine current breakpoint and device type based on window width
  const breakpoint = getBreakpointFromWidth(debouncedWidth);
  const deviceType = getDeviceTypeFromBreakpoint(breakpoint);
  
  useEffect(() => {
    // Skip effect during server-side rendering
    if (!isClient) return;
    
    // Set initial width
    setWidth(window.innerWidth);
    
    // Handler to update window width on resize
    const handleResize = () => {
      setWidth(window.innerWidth);
    };
    
    // Set up resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up event listener when component unmounts
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]); // Only re-run if isClient changes (it shouldn't)
  
  return { breakpoint, deviceType };
};

export default useBreakpoint;