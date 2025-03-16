// This file is the main entry point for all Cypress end-to-end tests
// It imports custom commands and sets up global configurations for the
// Student Admissions Enrollment Platform testing environment

// Import custom Cypress commands for application testing
import './commands';

// Prevent Cypress from failing tests when the application throws uncaught exceptions
// This is particularly useful for handling unhandled promise rejections or
// third-party library errors that don't affect test functionality
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false prevents Cypress from failing the test
  return false;
});

// Configure consistent viewport dimensions for all tests
// This ensures tests run in a predictable environment regardless of the machine running them
Cypress.config('viewportWidth', 1280);
Cypress.config('viewportHeight', 800);

// Set appropriate timeout values for the application
// These values are tailored to accommodate expected application response times
Cypress.config('defaultCommandTimeout', 10000); // Time to wait for DOM elements
Cypress.config('responseTimeout', 30000);       // Time to wait for response
Cypress.config('requestTimeout', 30000);        // Time to wait for request
Cypress.config('pageLoadTimeout', 60000);       // Time to wait for page load

// Configure test artifacts for debugging and documentation
Cypress.config('screenshotOnRunFailure', true); // Take screenshots on failure
Cypress.config('video', true);                  // Record video of test runs
Cypress.config('videoCompression', 32);         // Compression level for videos

// Add additional global test configurations or hooks as needed for
// the Student Admissions Enrollment Platform testing requirements