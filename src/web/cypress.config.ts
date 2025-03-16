import { defineConfig } from 'cypress'; // cypress version ^12.7.0

/**
 * Cypress Configuration for Student Admissions Enrollment Platform
 * 
 * This configuration file sets up Cypress for end-to-end and component testing,
 * addressing the testing requirements specified in the technical specifications.
 * It includes settings for browser configuration, timeouts, retries, and
 * environment variables needed for test execution.
 */
export default defineConfig({
  // End-to-end testing configuration
  e2e: {
    // Base URL for the application under test
    baseUrl: 'http://localhost:3000',
    
    // Pattern for locating test specs
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // Support file for global test configuration
    supportFile: 'cypress/support/e2e.ts',
    
    // Set up Cypress Node events for plugin configuration
    setupNodeEvents(on, config) {
      // Register event listeners for test events
      on('task', {
        // Custom tasks for file operations, database seeding, etc.
        log(message) {
          console.log(message);
          return null;
        },
        // Add more custom tasks as needed
      });

      // Add plugins for test execution
      // Example: Configure database reset between tests
      
      // Modify environment variables based on current environment
      const environment = process.env.NODE_ENV || 'development';
      if (environment === 'ci') {
        // CI-specific configurations
        config.env.apiUrl = 'http://ci-api:8000/api/v1';
      }

      // Return the modified config
      return config;
    },
    
    // Default viewport size for desktop testing
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Timeouts for various operations
    defaultCommandTimeout: 10000, // Default timeout for most commands
    requestTimeout: 15000,        // Timeout for network requests
    responseTimeout: 15000,       // Timeout for network responses
    pageLoadTimeout: 30000,       // Timeout for page loads
    
    // Capture video of test runs to aid in debugging
    video: true,
    
    // Take screenshots on test failures
    screenshotOnRunFailure: true,
    
    // Clear previous test artifacts before runs
    trashAssetsBeforeRuns: true,
  },
  
  // Component testing configuration
  component: {
    // Development server configuration for component testing
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
    
    // Pattern for locating component test specs
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    
    // Support file for component test configuration
    supportFile: 'cypress/support/component.ts',
  },
  
  // Environment variables available to tests
  env: {
    // API endpoint for backend services
    apiUrl: 'http://localhost:8000/api/v1',
    
    // Test user credentials for various roles
    adminEmail: 'admin@example.com',
    adminPassword: 'Cypress_Test_Password',
    studentEmail: 'student@example.com',
    studentPassword: 'Cypress_Test_Password',
    
    // Feature flags for testing
    mockData: true,
  },
  
  // Test retry configuration
  retries: {
    // Number of times to retry a failed test in run mode (CI)
    runMode: 2,
    
    // Number of times to retry a failed test in open mode (dev)
    openMode: 0,
  },
});