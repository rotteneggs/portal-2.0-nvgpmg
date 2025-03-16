import React from 'react'; // react ^18.0.0
import { ReactNode } from 'react'; // react ^18.0.0
import { render, RenderOptions } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { Provider } from 'react-redux'; // react-redux ^8.0.5
import { configureStore, PreloadedState } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.3
import store from '../redux/store';
import rootReducer, { RootState } from '../redux/rootReducer';
import { ThemeProvider } from '../contexts/ThemeContext';
import defaultTheme from '../styles/themes/default';

/**
 * Renders a React component with all necessary providers (Redux, Theme) for testing
 * @param ui - The React component to render
 * @param options - Optional render options from testing-library/react
 * @param preloadedState - Optional preloaded state for the Redux store
 * @returns Rendered component with additional utility methods
 */
const renderWithProviders = (
  ui: ReactNode,
  options: RenderOptions = {},
  preloadedState?: PreloadedState<RootState>
) => {
  // Create a test store with optional preloaded state
  const testStore = configureStore({
    reducer: rootReducer,
    preloadedState,
  });

  // Merge default render options with provided options
  const mergedOptions = {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={testStore}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </Provider>
    ),
    ...options,
  };

  // Render the wrapped component using testing-library's render function
  return render(ui, mergedOptions);
};

/**
 * Creates a Redux store instance for testing with optional preloaded state
 * @param preloadedState - Optional preloaded state for the Redux store
 * @returns Configured Redux store for testing
 */
const createTestStore = (preloadedState?: PreloadedState<RootState>) => {
  // Configure a new store with the root reducer
  const testStore = configureStore({
    reducer: rootReducer,
    preloadedState,
  });

  // Return the configured store instance
  return testStore;
};

/**
 * Creates a mock implementation of localStorage for testing
 * @returns Mock localStorage object with get/set/remove methods
 */
const mockLocalStorage = () => {
  // Create an empty storage object to hold values
  let storage: { [key: string]: string } = {};

  return {
    getItem: (key: string) => key in storage ? storage[key] : null,
    setItem: (key: string, value: string) => (storage[key] = value || ''),
    removeItem: (key: string) => delete storage[key],
    clear: () => (storage = {}),
  };
};

/**
 * Creates a mock implementation of sessionStorage for testing
 * @returns Mock sessionStorage object with get/set/remove methods
 */
const mockSessionStorage = () => {
  // Create an empty storage object to hold values
  let storage: { [key: string]: string } = {};

  return {
    getItem: (key: string) => key in storage ? storage[key] : null,
    setItem: (key: string, value: string) => (storage[key] = value || ''),
    removeItem: (key: string) => delete storage[key],
    clear: () => (storage = {}),
  };
};

/**
 * Creates a mock implementation of the fetch API for testing
 * @param mockResponse - The mock response data to return
 * @param success - Whether the fetch should succeed or fail
 * @returns Mock fetch function that returns the specified response
 */
const mockFetch = (mockResponse: any, success: boolean = true) => {
  // Create a mock function that returns a Promise
  return jest.fn().mockImplementation(() => {
    // If success is true, resolve with Response containing mockResponse
    if (success) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });
    } else {
      // If success is false, reject with Error containing mockResponse
      return Promise.reject(new Error(JSON.stringify(mockResponse)));
    }
  });
};

/**
 * Utility to wait for a component to re-render after state changes
 * @param wrapper - The component wrapper
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves when component has re-rendered
 */
const waitForComponentToPaint = (wrapper: any, timeout: number = 0): Promise<void> => {
  // Return a Promise that resolves after a setTimeout
  return new Promise((resolve) => {
    setTimeout(() => {
      // Use act() to ensure all updates have been processed
      act(() => {
        resolve();
      });
    }, timeout);
  });
};

// Export utility functions for use in tests
export { renderWithProviders, createTestStore, mockLocalStorage, mockSessionStorage, mockFetch, waitForComponentToPaint };