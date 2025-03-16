// Custom Cypress commands for end-to-end testing of the Student Admissions Enrollment Platform
// This file extends Cypress with application-specific commands for authentication, application management,
// document handling, and other common testing operations.

import '@testing-library/cypress'; // v9.0.0 - Testing Library extensions for Cypress

// Type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to log in a user
       * @param email - The user's email address
       * @param password - The user's password
       * @example cy.login('test@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<Element>;

      /**
       * Custom command to log in a user via API directly (bypassing UI)
       * @param email - The user's email address
       * @param password - The user's password
       * @example cy.loginByApi('test@example.com', 'password123')
       */
      loginByApi(email: string, password: string): Chainable<Response>;

      /**
       * Custom command to register a new user
       * @param userData - Object containing user registration data
       * @example cy.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'securePassword123' })
       */
      register(userData: Record<string, any>): Chainable<Element>;

      /**
       * Custom command to log out the current user
       * @example cy.logout()
       */
      logout(): Chainable<Element>;

      /**
       * Custom command to create a new application
       * @param applicationType - The type of application (e.g., 'undergraduate', 'graduate')
       * @param term - The academic term (e.g., 'Fall', 'Spring')
       * @param academicYear - The academic year (e.g., '2023-2024')
       * @example cy.createApplication('undergraduate', 'Fall', '2023-2024')
       */
      createApplication(applicationType: string, term: string, academicYear: string): Chainable<Element>;

      /**
       * Custom command to create a new application via API directly
       * @param applicationType - The type of application (e.g., 'undergraduate', 'graduate')
       * @param term - The academic term (e.g., 'Fall', 'Spring')
       * @param academicYear - The academic year (e.g., '2023-2024')
       * @example cy.createApplicationByApi('undergraduate', 'Fall', '2023-2024')
       */
      createApplicationByApi(applicationType: string, term: string, academicYear: string): Chainable<Response>;

      /**
       * Custom command to fill out a specific step of the application form
       * @param stepName - The name of the application step (e.g., 'Personal Information', 'Academic History')
       * @param formData - Object containing form field values
       * @example cy.fillApplicationStep('Personal Information', { firstName: 'John', lastName: 'Doe', dob: '1990-01-01' })
       */
      fillApplicationStep(stepName: string, formData: Record<string, any>): Chainable<Element>;

      /**
       * Custom command to upload a document
       * @param documentType - The type of document (e.g., 'transcript', 'recommendation')
       * @param filePath - Path to the file to upload
       * @param applicationId - The ID of the application the document belongs to
       * @example cy.uploadDocument('transcript', 'fixtures/transcript.pdf', 123)
       */
      uploadDocument(documentType: string, filePath: string, applicationId: number): Chainable<Element>;

      /**
       * Custom command to upload a document via API directly
       * @param documentType - The type of document (e.g., 'transcript', 'recommendation')
       * @param filePath - Path to the file to upload
       * @param applicationId - The ID of the application the document belongs to
       * @example cy.uploadDocumentByApi('transcript', 'fixtures/transcript.pdf', 123)
       */
      uploadDocumentByApi(documentType: string, filePath: string, applicationId: number): Chainable<Response>;

      /**
       * Custom command to submit a completed application
       * @param applicationId - The ID of the application to submit
       * @example cy.submitApplication(123)
       */
      submitApplication(applicationId: number): Chainable<Element>;

      /**
       * Custom command to submit an application via API directly
       * @param applicationId - The ID of the application to submit
       * @example cy.submitApplicationByApi(123)
       */
      submitApplicationByApi(applicationId: number): Chainable<Response>;

      /**
       * Custom command to check the status of an application
       * @param applicationId - The ID of the application to check
       * @example cy.checkApplicationStatus(123)
       */
      checkApplicationStatus(applicationId: number): Chainable<string>;

      /**
       * Custom command to mock an authenticated user
       * @param user - Object containing user data
       * @example cy.mockAuthUser({ id: 1, name: 'John Doe', email: 'john@example.com', roles: ['applicant'] })
       */
      mockAuthUser(user: Record<string, any>): Chainable<Element>;

      /**
       * Custom command to stub an API route with mock data
       * @param method - HTTP method (GET, POST, PUT, DELETE)
       * @param url - API endpoint URL
       * @param response - Mock response data
       * @param statusCode - HTTP status code for the response
       * @example cy.stubApiRoute('GET', '/api/v1/applications', { data: [] }, 200)
       */
      stubApiRoute(method: string, url: string, response: Record<string, any>, statusCode?: number): Chainable<Element>;

      /**
       * Custom command to wait for an API response
       * @param alias - The alias of the intercepted API request
       * @example cy.waitForApiResponse('@getApplications')
       */
      waitForApiResponse(alias: string): Chainable<Response>;

      /**
       * Custom command to fill a form field with proper typing and validation
       * @param fieldName - The name or label of the form field
       * @param value - The value to enter into the field
       * @example cy.fillFormField('First Name', 'John')
       */
      fillFormField(fieldName: string, value: any): Chainable<Element>;

      /**
       * Custom command to select an option from a dropdown
       * @param fieldName - The name or label of the dropdown field
       * @param optionText - The text of the option to select
       * @example cy.selectDropdownOption('Application Type', 'Undergraduate')
       */
      selectDropdownOption(fieldName: string, optionText: string): Chainable<Element>;

      /**
       * Custom command to check for validation error messages
       * @param fieldName - The name or label of the form field
       * @param errorMessage - The expected error message
       * @example cy.checkValidationError('Email', 'Please enter a valid email address')
       */
      checkValidationError(fieldName: string, errorMessage: string): Chainable<Element>;

      /**
       * Custom command to mock a file upload without actually uploading a file
       * @param selector - The selector for the file input element
       * @param fileName - The name of the file to mock
       * @param mimeType - The MIME type of the file to mock
       * @example cy.mockFileUpload('[data-testid=file-upload]', 'transcript.pdf', 'application/pdf')
       */
      mockFileUpload(selector: string, fileName: string, mimeType: string): Chainable<Element>;
    }
  }
}

// Authentication commands
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.findByLabelText(/email/i).type(email);
  cy.findByLabelText(/password/i).type(password);
  cy.findByRole('button', { name: /sign in/i }).click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('loginByApi', (email: string, password: string) => {
  return cy.request({
    method: 'POST',
    url: '/api/v1/auth/login',
    body: {
      email,
      password
    }
  }).then((response) => {
    // Store token in localStorage
    window.localStorage.setItem('auth_token', response.body.data.token);
    
    // Set user object in application state
    window.localStorage.setItem('user', JSON.stringify(response.body.data.user));
    
    return cy.wrap(response);
  });
});

Cypress.Commands.add('register', (userData) => {
  cy.visit('/register');
  cy.findByLabelText(/first name/i).type(userData.firstName);
  cy.findByLabelText(/last name/i).type(userData.lastName);
  cy.findByLabelText(/email/i).type(userData.email);
  cy.findByLabelText(/^password$/i).type(userData.password);
  cy.findByLabelText(/confirm password/i).type(userData.password);
  cy.findByRole('checkbox', { name: /terms/i }).check();
  cy.findByRole('button', { name: /create account/i }).click();
  
  // Wait for registration to complete - either redirect or success message
  cy.url().should('not.include', '/register')
    .or('contain', 'success')
    .or('contain', 'verification');
});

Cypress.Commands.add('logout', () => {
  cy.findByRole('button', { name: /account/i }).click();
  cy.findByRole('menuitem', { name: /logout/i }).click();
  cy.url().should('include', '/login');
});

// Application management commands
Cypress.Commands.add('createApplication', (applicationType: string, term: string, academicYear: string) => {
  cy.visit('/applications');
  cy.findByRole('button', { name: /create new application/i }).click();
  
  cy.selectDropdownOption('Application Type', applicationType);
  cy.selectDropdownOption('Term', term);
  cy.selectDropdownOption('Academic Year', academicYear);
  
  cy.findByRole('button', { name: /create/i }).click();
  cy.url().should('include', '/applications/');
  cy.findByText(/application form/i).should('be.visible');
});

Cypress.Commands.add('createApplicationByApi', (applicationType: string, term: string, academicYear: string) => {
  return cy.request({
    method: 'POST',
    url: '/api/v1/applications',
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('auth_token')}`
    },
    body: {
      application_type: applicationType,
      academic_term: term,
      academic_year: academicYear
    }
  });
});

Cypress.Commands.add('fillApplicationStep', (stepName: string, formData: Record<string, any>) => {
  // Find the correct step tab or section
  cy.findByRole('tab', { name: new RegExp(stepName, 'i') })
    .click()
    .should('have.attr', 'aria-selected', 'true');
  
  // Fill in all fields in the form data
  Object.entries(formData).forEach(([fieldName, value]) => {
    cy.fillFormField(fieldName, value);
  });
  
  // Save and continue
  cy.findByRole('button', { name: /save & continue/i }).click();
  
  // Wait for the save to complete
  cy.findByText(/saving/i).should('not.exist');
});

Cypress.Commands.add('uploadDocument', (documentType: string, filePath: string, applicationId: number) => {
  cy.visit(`/applications/${applicationId}/documents`);
  
  // Select document type if not already selected
  cy.selectDropdownOption('Document Type', documentType);
  
  // Upload the file
  cy.findByTestId('document-upload').attachFile(filePath);
  
  // Wait for upload to complete
  cy.findByText(/uploading/i).should('not.exist');
  cy.findByText(/upload complete/i).should('be.visible');
  
  // Verify document appears in list
  cy.findByRole('table')
    .findByText(new RegExp(documentType, 'i'))
    .should('be.visible');
});

Cypress.Commands.add('uploadDocumentByApi', (documentType: string, filePath: string, applicationId: number) => {
  // Create form data for file upload
  const formData = new FormData();
  formData.append('document_type', documentType);
  formData.append('application_id', applicationId.toString());
  
  // Get the file from fixtures
  return cy.fixture(filePath, 'binary')
    .then(fileBinary => {
      const blob = Cypress.Blob.binaryStringToBlob(fileBinary);
      const fileName = filePath.split('/').pop();
      formData.append('file', blob, fileName);
      
      return cy.request({
        method: 'POST',
        url: '/api/v1/documents/upload',
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('auth_token')}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });
    });
});

Cypress.Commands.add('submitApplication', (applicationId: number) => {
  cy.visit(`/applications/${applicationId}/review`);
  
  // Check confirmation checkbox
  cy.findByRole('checkbox', { name: /confirm/i }).check();
  
  // Submit application
  cy.findByRole('button', { name: /submit application/i }).click();
  
  // Confirm submission in modal
  cy.findByRole('dialog')
    .within(() => {
      cy.findByRole('button', { name: /submit/i }).click();
    });
  
  // Wait for submission confirmation
  cy.findByText(/application submitted/i).should('be.visible');
  
  // Verify redirect to status page
  cy.url().should('include', `/applications/${applicationId}/status`);
});

Cypress.Commands.add('submitApplicationByApi', (applicationId: number) => {
  return cy.request({
    method: 'POST',
    url: `/api/v1/applications/${applicationId}/submit`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('auth_token')}`
    }
  });
});

Cypress.Commands.add('checkApplicationStatus', (applicationId: number) => {
  cy.visit(`/applications/${applicationId}/status`);
  
  return cy.findByTestId('application-status')
    .invoke('text')
    .then(text => {
      return cy.wrap(text.trim());
    });
});

// Test utility commands
Cypress.Commands.add('mockAuthUser', (user: Record<string, any>) => {
  // Set token in localStorage
  window.localStorage.setItem('auth_token', 'mock-jwt-token');
  
  // Set user data in localStorage
  window.localStorage.setItem('user', JSON.stringify(user));
  
  // Stub the user endpoint to return the mock user
  cy.stubApiRoute('GET', '/api/v1/auth/me', { success: true, data: user }, 200);
  
  return cy.wrap(null);
});

Cypress.Commands.add('stubApiRoute', (method: string, url: string, response: Record<string, any>, statusCode: number = 200) => {
  const alias = `${method.toLowerCase()}${url.replace(/\//g, '_')}`;
  
  cy.intercept(
    {
      method,
      url
    },
    {
      statusCode,
      body: response
    }
  ).as(alias);
  
  return cy.wrap(null);
});

Cypress.Commands.add('waitForApiResponse', (alias: string) => {
  return cy.wait(alias).then(interception => {
    return cy.wrap(interception.response);
  });
});

// Form interaction commands
Cypress.Commands.add('fillFormField', (fieldName: string, value: any) => {
  // Try finding by label first
  cy.findByLabelText(new RegExp(fieldName, 'i'))
    .then($el => {
      // Handle different input types
      if ($el.attr('type') === 'checkbox') {
        if (value === true) cy.wrap($el).check();
        else if (value === false) cy.wrap($el).uncheck();
      }
      else if ($el.attr('type') === 'radio') {
        cy.wrap($el).check();
      }
      else if ($el.prop('tagName') === 'SELECT') {
        cy.wrap($el).select(value);
      }
      else {
        cy.wrap($el).clear().type(value);
      }
      
      // Trigger blur to activate validation
      cy.wrap($el).blur();
    })
    .catch(() => {
      // If can't find by label, try by placeholder or name
      cy.findByPlaceholderText(new RegExp(fieldName, 'i'))
        .then($el => {
          cy.wrap($el).clear().type(value).blur();
        })
        .catch(() => {
          cy.get(`[name="${fieldName}"], [name="${fieldName.toLowerCase().replace(/\s+/g, '_')}"]`)
            .then($el => {
              cy.wrap($el).clear().type(value).blur();
            });
        });
    });
});

Cypress.Commands.add('selectDropdownOption', (fieldName: string, optionText: string) => {
  // Handle Material-UI select components
  cy.findByLabelText(new RegExp(fieldName, 'i'))
    .closest('.MuiFormControl-root')
    .then($formControl => {
      // Click the select element to open dropdown
      cy.wrap($formControl).find('.MuiSelect-root').click();
      
      // Wait for dropdown to open
      cy.get('.MuiMenu-paper')
        .findByText(new RegExp(`^${optionText}$`, 'i'))
        .click();
    })
    .catch(() => {
      // Fallback for standard HTML select elements
      cy.findByLabelText(new RegExp(fieldName, 'i'))
        .select(optionText);
    });
});

Cypress.Commands.add('checkValidationError', (fieldName: string, errorMessage: string) => {
  cy.findByLabelText(new RegExp(fieldName, 'i'))
    .parents('.MuiFormControl-root')
    .find('.Mui-error')
    .should('contain.text', errorMessage);
});

Cypress.Commands.add('mockFileUpload', (selector: string, fileName: string, mimeType: string) => {
  // Create a test file object
  const testFile = new File(['test file content'], fileName, { type: mimeType });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(testFile);
  
  return cy.get(selector).then(subject => {
    const el = subject[0];
    el.files = dataTransfer.files;
    
    // Trigger change event
    return cy.wrap(subject).trigger('change', { force: true });
  });
});