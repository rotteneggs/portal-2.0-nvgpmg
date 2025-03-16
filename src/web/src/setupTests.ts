// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'; // @testing-library/jest-dom ^5.16.5
import { toHaveNoViolations } from 'jest-axe'; // jest-axe ^7.0.0
import { server } from 'msw/node'; // msw/node ^1.1.0
import { mockLocalStorage, mockSessionStorage, mockFetch } from './utils/testUtils';
// msw ^1.1.0

/**
 * Setup function that runs before all tests
 */
beforeAll(() => {
  // Start the MSW server to intercept API requests
  server.listen();

  // Set up any global test environment configurations
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage() });
  Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage() });
  global.fetch = jest.fn();
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  window.scrollTo = jest.fn();
  jest.setTimeout(10000);
});

/**
 * Cleanup function that runs after each test
 */
afterEach(() => {
  // Reset any mocks that were created during tests
  server.resetHandlers();

  // Clear any side effects from individual tests
  jest.clearAllMocks();
});

/**
 * Cleanup function that runs after all tests
 */
afterAll(() => {
  // Stop the MSW server
  server.close();

  // Clean up any remaining global test configurations
  jest.restoreAllMocks();
});

expect.extend(toHaveNoViolations);