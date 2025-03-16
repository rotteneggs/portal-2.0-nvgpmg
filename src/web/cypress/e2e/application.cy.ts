import '@testing-library/cypress/add-commands';
import { ApplicationType, AcademicTerm, ApplicationFormStep } from '../../src/types/application';

/**
 * Sets up the test environment for application testing
 */
function setupApplicationTest() {
  // Login with test user credentials
  cy.intercept('POST', '/api/v1/auth/login').as('loginRequest');
  cy.visit('/login');
  cy.findByLabelText('Email Address').type('test@example.com');
  cy.findByLabelText('Password').type('password123');
  cy.findByRole('button', { name: /sign in/i }).click();
  cy.wait('@loginRequest');
  
  // Visit the dashboard page
  cy.visit('/dashboard');
  
  // Intercept API requests related to applications
  cy.intercept('GET', '/api/v1/applications*').as('getApplications');
  cy.intercept('POST', '/api/v1/applications').as('createApplication');
  cy.intercept('PUT', '/api/v1/applications/*').as('updateApplication');
  cy.intercept('POST', '/api/v1/applications/*/submit').as('submitApplication');
}

/**
 * Generates test data for application form steps
 */
function generateTestApplicationData() {
  return {
    personal_information: {
      first_name: 'John',
      middle_name: '',
      last_name: 'Doe',
      date_of_birth: '1995-01-15',
      gender: 'Male',
      citizenship: 'United States',
      ssn: null,
    },
    contact_details: {
      email: 'john.doe@example.com',
      phone_number: '(555) 123-4567',
      address_line1: '123 Main St',
      address_line2: 'Apt 4B',
      city: 'Springfield',
      state: 'IL',
      postal_code: '62701',
      country: 'United States',
    },
    academic_history: {
      institutions: [
        {
          name: 'Springfield High School',
          city: 'Springfield',
          state: 'IL',
          country: 'United States',
          start_date: '2010-09-01',
          end_date: '2014-05-30',
          degree: 'High School Diploma',
          major: null,
          gpa: 3.8,
        },
      ],
    },
    test_scores: {
      has_taken_tests: true,
      scores: [
        {
          test_type: 'SAT',
          test_date: '2014-03-15',
          scores: {
            verbal: 650,
            math: 700,
          },
        },
      ],
    },
    personal_statement: {
      statement: 'This is a test personal statement that meets the minimum length requirements for the application process. It discusses my academic and personal background, as well as my future goals and aspirations.',
    },
    recommendations: {
      recommendations: [
        {
          recommender_name: 'Jane Smith',
          recommender_email: 'jane.smith@example.com',
          recommender_title: 'Teacher',
          recommender_institution: 'Springfield High School',
          relationship: 'Teacher',
        },
      ],
    },
  };
}

describe('Application Creation', () => {
  beforeEach(() => {
    setupApplicationTest();
  });

  it('should create a new application from dashboard', () => {
    // Click the 'Create New Application' button
    cy.findByRole('button', { name: /create new application/i }).click();
    
    // Select application type, term, and year
    cy.findByLabelText(/application type/i).select(ApplicationType.UNDERGRADUATE);
    cy.findByLabelText(/academic term/i).select(AcademicTerm.FALL);
    
    // Calculate next year for academic year
    const nextYear = (new Date().getFullYear() + 1).toString();
    cy.findByLabelText(/academic year/i).select(nextYear);
    
    // Create application
    cy.findByRole('button', { name: /create/i }).click();
    
    // Verify API request is made
    cy.wait('@createApplication').its('response.statusCode').should('eq', 201);
    
    // Verify redirection to application form
    cy.url().should('include', '/applications/');
    cy.url().should('include', '/edit');
    
    // Verify first step is displayed
    cy.findByText(/personal information/i).should('be.visible');
  });
  
  it('should create a new application from applications page', () => {
    // Visit the applications page
    cy.visit('/applications');
    
    // Click the 'Create New Application' button
    cy.findByRole('button', { name: /create new application/i }).click();
    
    // Select 'Graduate' application type
    cy.findByLabelText(/application type/i).select(ApplicationType.GRADUATE);
    cy.findByLabelText(/academic term/i).select(AcademicTerm.SPRING);
    
    // Calculate next year for academic year
    const nextYear = (new Date().getFullYear() + 1).toString();
    cy.findByLabelText(/academic year/i).select(nextYear);
    
    // Create application
    cy.findByRole('button', { name: /create/i }).click();
    
    // Verify API request is made
    cy.wait('@createApplication').its('response.statusCode').should('eq', 201);
    
    // Verify redirection to application form
    cy.url().should('include', '/applications/');
    cy.url().should('include', '/edit');
    
    // Verify first step is displayed
    cy.findByText(/personal information/i).should('be.visible');
  });
  
  it('should show validation errors for missing application details', () => {
    // Visit the applications page
    cy.visit('/applications');
    
    // Click the 'Create New Application' button
    cy.findByRole('button', { name: /create new application/i }).click();
    
    // Try to create without selecting any options
    cy.findByRole('button', { name: /create/i }).click();
    
    // Verify validation errors
    cy.findByText(/application type is required/i).should('be.visible');
    cy.findByText(/academic term is required/i).should('be.visible');
    cy.findByText(/academic year is required/i).should('be.visible');
    
    // Verify form is not submitted
    cy.get('@createApplication.all').should('have.length', 0);
  });
  
  it('should show existing applications on dashboard', () => {
    // This test assumes there's already an application for the test user
    
    // Mock the response to return existing applications
    cy.intercept('GET', '/api/v1/applications*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            application_type: ApplicationType.UNDERGRADUATE,
            academic_term: AcademicTerm.FALL,
            academic_year: '2024',
            status: 'draft',
            is_submitted: false,
            submitted_at: null,
            created_at: '2023-07-01T00:00:00Z',
            updated_at: '2023-07-01T00:00:00Z',
            completion_percentage: 35
          }
        ],
        meta: {
          pagination: {
            total: 1,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getApplications');
    
    // Visit dashboard
    cy.visit('/dashboard');
    cy.wait('@getApplications');
    
    // Verify application status card
    cy.findByTestId('application-status-card').should('be.visible');
    cy.findByText(/undergraduate/i).should('be.visible');
    cy.findByText(/fall 2024/i).should('be.visible');
    cy.findByText(/draft/i).should('be.visible');
    
    // Verify progress indicator
    cy.findByRole('progressbar').should('have.attr', 'aria-valuenow', '35');
  });
});

describe('Application Form Navigation', () => {
  beforeEach(() => {
    setupApplicationTest();
    
    // Create a new application first
    cy.intercept('POST', '/api/v1/applications', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          id: 1,
          application_type: ApplicationType.UNDERGRADUATE,
          academic_term: AcademicTerm.FALL,
          academic_year: '2024',
          current_status_id: null,
          application_data: {
            personal_information: {},
            contact_details: {},
            academic_history: { institutions: [] },
            test_scores: { has_taken_tests: false, scores: [] },
            personal_statement: { statement: '' },
            recommendations: { recommendations: [] }
          },
          is_submitted: false,
          submitted_at: null,
          created_at: '2023-07-01T00:00:00Z',
          updated_at: '2023-07-01T00:00:00Z'
        }
      }
    }).as('createApplication');
    
    cy.visit('/applications/create');
    cy.findByLabelText(/application type/i).select(ApplicationType.UNDERGRADUATE);
    cy.findByLabelText(/academic term/i).select(AcademicTerm.FALL);
    const nextYear = (new Date().getFullYear() + 1).toString();
    cy.findByLabelText(/academic year/i).select(nextYear);
    cy.findByRole('button', { name: /create/i }).click();
    cy.wait('@createApplication');
  });
  
  it('should navigate through all form steps', () => {
    const testData = generateTestApplicationData();
    
    // First step - Personal Information
    cy.findByText(/personal information/i).should('be.visible');
    cy.findByLabelText(/first name/i).type(testData.personal_information.first_name);
    cy.findByLabelText(/last name/i).type(testData.personal_information.last_name);
    cy.findByLabelText(/date of birth/i).type(testData.personal_information.date_of_birth);
    cy.findByLabelText(/gender/i).select(testData.personal_information.gender);
    cy.findByLabelText(/citizenship/i).select(testData.personal_information.citizenship);
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Second step - Contact Details
    cy.findByText(/contact details/i).should('be.visible');
    cy.findByLabelText(/email/i).type(testData.contact_details.email);
    cy.findByLabelText(/phone number/i).type(testData.contact_details.phone_number);
    cy.findByLabelText(/address line 1/i).type(testData.contact_details.address_line1);
    cy.findByLabelText(/address line 2/i).type(testData.contact_details.address_line2);
    cy.findByLabelText(/city/i).type(testData.contact_details.city);
    cy.findByLabelText(/state/i).type(testData.contact_details.state);
    cy.findByLabelText(/postal code/i).type(testData.contact_details.postal_code);
    cy.findByLabelText(/country/i).select(testData.contact_details.country);
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Third step - Academic History
    cy.findByText(/academic history/i).should('be.visible');
    cy.findByRole('button', { name: /add institution/i }).click();
    cy.findByLabelText(/institution name/i).type(testData.academic_history.institutions[0].name);
    cy.findByLabelText(/city/i).type(testData.academic_history.institutions[0].city);
    cy.findByLabelText(/state/i).type(testData.academic_history.institutions[0].state);
    cy.findByLabelText(/country/i).select(testData.academic_history.institutions[0].country);
    cy.findByLabelText(/start date/i).type(testData.academic_history.institutions[0].start_date);
    cy.findByLabelText(/end date/i).type(testData.academic_history.institutions[0].end_date);
    cy.findByLabelText(/degree/i).type(testData.academic_history.institutions[0].degree);
    cy.findByLabelText(/gpa/i).type(testData.academic_history.institutions[0].gpa.toString());
    cy.findByRole('button', { name: /save institution/i }).click();
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Fourth step - Test Scores
    cy.findByText(/test scores/i).should('be.visible');
    cy.findByLabelText(/have you taken any standardized tests/i).check();
    cy.findByRole('button', { name: /add test score/i }).click();
    cy.findByLabelText(/test type/i).select(testData.test_scores.scores[0].test_type);
    cy.findByLabelText(/test date/i).type(testData.test_scores.scores[0].test_date);
    cy.findByLabelText(/verbal\/reading score/i).type(testData.test_scores.scores[0].scores.verbal.toString());
    cy.findByLabelText(/math score/i).type(testData.test_scores.scores[0].scores.math.toString());
    cy.findByRole('button', { name: /save test score/i }).click();
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Fifth step - Personal Statement
    cy.findByText(/personal statement/i).should('be.visible');
    cy.findByLabelText(/personal statement/i).type(testData.personal_statement.statement);
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Sixth step - Recommendations
    cy.findByText(/recommendations/i).should('be.visible');
    cy.findByRole('button', { name: /add recommender/i }).click();
    cy.findByLabelText(/recommender name/i).type(testData.recommendations.recommendations[0].recommender_name);
    cy.findByLabelText(/recommender email/i).type(testData.recommendations.recommendations[0].recommender_email);
    cy.findByLabelText(/recommender title/i).type(testData.recommendations.recommendations[0].recommender_title);
    cy.findByLabelText(/recommender institution/i).type(testData.recommendations.recommendations[0].recommender_institution);
    cy.findByLabelText(/relationship/i).select(testData.recommendations.recommendations[0].relationship);
    cy.findByRole('button', { name: /save recommender/i }).click();
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Final step - Review & Submit
    cy.findByText(/review & submit/i).should('be.visible');
  });
  
  it('should navigate back to previous steps', () => {
    // Fill out first step
    const testData = generateTestApplicationData();
    cy.findByLabelText(/first name/i).type(testData.personal_information.first_name);
    cy.findByLabelText(/last name/i).type(testData.personal_information.last_name);
    cy.findByLabelText(/date of birth/i).type(testData.personal_information.date_of_birth);
    cy.findByLabelText(/gender/i).select(testData.personal_information.gender);
    cy.findByLabelText(/citizenship/i).select(testData.personal_information.citizenship);
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Fill out second step
    cy.findByLabelText(/email/i).type(testData.contact_details.email);
    cy.findByLabelText(/phone number/i).type(testData.contact_details.phone_number);
    cy.findByLabelText(/address line 1/i).type(testData.contact_details.address_line1);
    cy.findByLabelText(/city/i).type(testData.contact_details.city);
    cy.findByLabelText(/state/i).type(testData.contact_details.state);
    cy.findByLabelText(/postal code/i).type(testData.contact_details.postal_code);
    cy.findByLabelText(/country/i).select(testData.contact_details.country);
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Navigate to third step
    cy.findByText(/academic history/i).should('be.visible');
    
    // Go back to second step
    cy.findByRole('button', { name: /previous/i }).click();
    cy.findByText(/contact details/i).should('be.visible');
    
    // Verify data is preserved
    cy.findByLabelText(/email/i).should('have.value', testData.contact_details.email);
    cy.findByLabelText(/phone number/i).should('have.value', testData.contact_details.phone_number);
    
    // Go back to first step
    cy.findByRole('button', { name: /previous/i }).click();
    cy.findByText(/personal information/i).should('be.visible');
    
    // Verify data is preserved
    cy.findByLabelText(/first name/i).should('have.value', testData.personal_information.first_name);
    cy.findByLabelText(/last name/i).should('have.value', testData.personal_information.last_name);
  });
  
  it('should show progress indicator with correct percentage', () => {
    // Check initial progress
    cy.findByRole('progressbar').should('have.attr', 'aria-valuenow', '0');
    
    // Complete first step
    const testData = generateTestApplicationData();
    cy.findByLabelText(/first name/i).type(testData.personal_information.first_name);
    cy.findByLabelText(/last name/i).type(testData.personal_information.last_name);
    cy.findByLabelText(/date of birth/i).type(testData.personal_information.date_of_birth);
    cy.findByLabelText(/gender/i).select(testData.personal_information.gender);
    cy.findByLabelText(/citizenship/i).select(testData.personal_information.citizenship);
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Check progress after first step
    cy.findByRole('progressbar').should('have.attr', 'aria-valuenow').and('be.greaterThan', 0);
  });
  
  it('should save draft application automatically', () => {
    // Intercept the auto-save request
    cy.intercept('PUT', '/api/v1/applications/*').as('saveApplication');
    
    // Fill out part of the form
    const testData = generateTestApplicationData();
    cy.findByLabelText(/first name/i).type(testData.personal_information.first_name);
    cy.findByLabelText(/last name/i).type(testData.personal_information.last_name);
    
    // Wait for auto-save (typically after some delay)
    cy.wait('@saveApplication', { timeout: 10000 }).its('response.statusCode').should('eq', 200);
    
    // Verify "Last saved" indicator is updated
    cy.findByText(/last saved/i).should('be.visible');
    
    // Refresh the page
    cy.reload();
    
    // Verify form data is preserved
    cy.findByLabelText(/first name/i).should('have.value', testData.personal_information.first_name);
    cy.findByLabelText(/last name/i).should('have.value', testData.personal_information.last_name);
  });
});

describe('Application Form Validation', () => {
  beforeEach(() => {
    setupApplicationTest();
    
    // Create a new application
    cy.intercept('POST', '/api/v1/applications', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          id: 1,
          application_type: ApplicationType.UNDERGRADUATE,
          academic_term: AcademicTerm.FALL,
          academic_year: '2024',
          current_status_id: null,
          application_data: {
            personal_information: {},
            contact_details: {},
            academic_history: { institutions: [] },
            test_scores: { has_taken_tests: false, scores: [] },
            personal_statement: { statement: '' },
            recommendations: { recommendations: [] }
          },
          is_submitted: false,
          submitted_at: null,
          created_at: '2023-07-01T00:00:00Z',
          updated_at: '2023-07-01T00:00:00Z'
        }
      }
    }).as('createApplication');
    
    cy.visit('/applications/create');
    cy.findByLabelText(/application type/i).select(ApplicationType.UNDERGRADUATE);
    cy.findByLabelText(/academic term/i).select(AcademicTerm.FALL);
    const nextYear = (new Date().getFullYear() + 1).toString();
    cy.findByLabelText(/academic year/i).select(nextYear);
    cy.findByRole('button', { name: /create/i }).click();
    cy.wait('@createApplication');
  });
  
  it('should validate Personal Information step', () => {
    // Try to continue without filling required fields
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Check validation errors
    cy.findByText(/first name is required/i).should('be.visible');
    cy.findByText(/last name is required/i).should('be.visible');
    cy.findByText(/date of birth is required/i).should('be.visible');
    
    // Fill with invalid data
    cy.findByLabelText(/first name/i).type('John123');
    
    // Check format validation
    cy.findByText(/first name must contain only letters/i).should('be.visible');
    
    // Fix the entry
    cy.findByLabelText(/first name/i).clear().type('John');
    
    // Set future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    cy.findByLabelText(/date of birth/i).type(futureDateStr);
    
    // Check date validation
    cy.findByText(/date of birth cannot be in the future/i).should('be.visible');
    
    // Fix all fields with valid data
    const testData = generateTestApplicationData();
    cy.findByLabelText(/first name/i).clear().type(testData.personal_information.first_name);
    cy.findByLabelText(/last name/i).type(testData.personal_information.last_name);
    cy.findByLabelText(/date of birth/i).clear().type(testData.personal_information.date_of_birth);
    cy.findByLabelText(/gender/i).select(testData.personal_information.gender);
    cy.findByLabelText(/citizenship/i).select(testData.personal_information.citizenship);
    
    // Try to continue now
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Verify navigation to next step
    cy.findByText(/contact details/i).should('be.visible');
  });
  
  it('should validate Contact Details step', () => {
    // Navigate to Contact Details
    const testData = generateTestApplicationData();
    cy.findByLabelText(/first name/i).type(testData.personal_information.first_name);
    cy.findByLabelText(/last name/i).type(testData.personal_information.last_name);
    cy.findByLabelText(/date of birth/i).type(testData.personal_information.date_of_birth);
    cy.findByLabelText(/gender/i).select(testData.personal_information.gender);
    cy.findByLabelText(/citizenship/i).select(testData.personal_information.citizenship);
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Try to continue without filling required fields
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Check validation errors
    cy.findByText(/email is required/i).should('be.visible');
    cy.findByText(/phone number is required/i).should('be.visible');
    cy.findByText(/address line 1 is required/i).should('be.visible');
    
    // Fill with invalid data
    cy.findByLabelText(/email/i).type('invalid-email');
    cy.findByLabelText(/phone number/i).type('123');
    cy.findByLabelText(/postal code/i).type('ABC');
    
    // Check format validation
    cy.findByText(/please enter a valid email address/i).should('be.visible');
    cy.findByText(/please enter a valid phone number/i).should('be.visible');
    cy.findByText(/please enter a valid postal code/i).should('be.visible');
    
    // Fix all fields with valid data
    cy.findByLabelText(/email/i).clear().type(testData.contact_details.email);
    cy.findByLabelText(/phone number/i).clear().type(testData.contact_details.phone_number);
    cy.findByLabelText(/address line 1/i).type(testData.contact_details.address_line1);
    cy.findByLabelText(/city/i).type(testData.contact_details.city);
    cy.findByLabelText(/state/i).type(testData.contact_details.state);
    cy.findByLabelText(/postal code/i).clear().type(testData.contact_details.postal_code);
    cy.findByLabelText(/country/i).select(testData.contact_details.country);
    
    // Try to continue now
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Verify navigation to next step
    cy.findByText(/academic history/i).should('be.visible');
  });
  
  it('should validate Academic History step', () => {
    // Navigate to Academic History
    const testData = generateTestApplicationData();
    // Fill personal information
    cy.findByLabelText(/first name/i).type(testData.personal_information.first_name);
    cy.findByLabelText(/last name/i).type(testData.personal_information.last_name);
    cy.findByLabelText(/date of birth/i).type(testData.personal_information.date_of_birth);
    cy.findByLabelText(/gender/i).select(testData.personal_information.gender);
    cy.findByLabelText(/citizenship/i).select(testData.personal_information.citizenship);
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Fill contact details
    cy.findByLabelText(/email/i).type(testData.contact_details.email);
    cy.findByLabelText(/phone number/i).type(testData.contact_details.phone_number);
    cy.findByLabelText(/address line 1/i).type(testData.contact_details.address_line1);
    cy.findByLabelText(/city/i).type(testData.contact_details.city);
    cy.findByLabelText(/state/i).type(testData.contact_details.state);
    cy.findByLabelText(/postal code/i).type(testData.contact_details.postal_code);
    cy.findByLabelText(/country/i).select(testData.contact_details.country);
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Try to continue without adding institutions
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Check validation error
    cy.findByText(/at least one institution is required/i).should('be.visible');
    
    // Add institution with missing fields
    cy.findByRole('button', { name: /add institution/i }).click();
    
    // Submit with missing fields
    cy.findByRole('button', { name: /save institution/i }).click();
    
    // Check validation errors for institution fields
    cy.findByText(/institution name is required/i).should('be.visible');
    cy.findByText(/start date is required/i).should('be.visible');
    
    // Add institution with end date before start date
    cy.findByLabelText(/institution name/i).type(testData.academic_history.institutions[0].name);
    cy.findByLabelText(/city/i).type(testData.academic_history.institutions[0].city);
    cy.findByLabelText(/state/i).type(testData.academic_history.institutions[0].state);
    cy.findByLabelText(/country/i).select(testData.academic_history.institutions[0].country);
    cy.findByLabelText(/start date/i).type('2015-01-01');
    cy.findByLabelText(/end date/i).type('2014-01-01');
    
    // Check date range validation
    cy.findByText(/end date cannot be before start date/i).should('be.visible');
    
    // Fix dates and save institution
    cy.findByLabelText(/start date/i).clear().type('2010-09-01');
    cy.findByLabelText(/end date/i).clear().type('2014-05-30');
    cy.findByLabelText(/degree/i).type(testData.academic_history.institutions[0].degree);
    cy.findByLabelText(/gpa/i).type(testData.academic_history.institutions[0].gpa.toString());
    cy.findByRole('button', { name: /save institution/i }).click();
    
    // Continue to next step
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Verify navigation to next step
    cy.findByText(/test scores/i).should('be.visible');
  });
  
  it('should validate Personal Statement step', () => {
    // Navigate to Personal Statement step (abbreviating previous steps)
    const testData = generateTestApplicationData();
    
    // Mock navigation to personal statement step
    cy.visit(`/applications/1/edit/${ApplicationFormStep.PERSONAL_STATEMENT}`);
    
    // Try to continue without entering statement
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Check validation error
    cy.findByText(/personal statement is required/i).should('be.visible');
    
    // Enter very short statement
    cy.findByLabelText(/personal statement/i).type('Too short');
    
    // Check minimum length validation
    cy.findByText(/personal statement must be at least/i).should('be.visible');
    
    // Enter valid statement
    cy.findByLabelText(/personal statement/i).clear().type(testData.personal_statement.statement);
    
    // Continue to next step
    cy.findByRole('button', { name: /save & continue/i }).click();
    
    // Verify navigation to next step
    cy.findByText(/recommendations/i).should('be.visible');
  });
});

describe('Application Submission', () => {
  beforeEach(() => {
    setupApplicationTest();
    
    // Mock a complete application
    cy.intercept('GET', '/api/v1/applications/*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          application_type: ApplicationType.UNDERGRADUATE,
          academic_term: AcademicTerm.FALL,
          academic_year: '2024',
          current_status_id: null,
          application_data: generateTestApplicationData(),
          is_submitted: false,
          submitted_at: null,
          created_at: '2023-07-01T00:00:00Z',
          updated_at: '2023-07-01T00:00:00Z',
          completion_status: {
            isComplete: true,
            missingItems: [],
            completionPercentage: 100
          }
        }
      }
    }).as('getApplication');
    
    // Visit the final review step
    cy.visit(`/applications/1/edit/${ApplicationFormStep.REVIEW_SUBMIT}`);
    cy.wait('@getApplication');
  });
  
  it('should submit a completed application', () => {
    // Mock the submission response
    cy.intercept('POST', '/api/v1/applications/*/submit', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          application_type: ApplicationType.UNDERGRADUATE,
          academic_term: AcademicTerm.FALL,
          academic_year: '2024',
          current_status_id: 2,
          application_data: generateTestApplicationData(),
          is_submitted: true,
          submitted_at: new Date().toISOString(),
          created_at: '2023-07-01T00:00:00Z',
          updated_at: new Date().toISOString()
        },
        message: 'Application submitted successfully'
      }
    }).as('submitApplication');
    
    // Verify all sections show as complete
    cy.findByText(/personal information/i).closest('section').should('contain.text', 'Complete');
    cy.findByText(/contact details/i).closest('section').should('contain.text', 'Complete');
    cy.findByText(/academic history/i).closest('section').should('contain.text', 'Complete');
    
    // Check the confirmation checkbox
    cy.findByLabelText(/I confirm that all information provided is accurate/i).check();
    
    // Click submit button
    cy.findByRole('button', { name: /submit application/i }).click();
    
    // Verify API request
    cy.wait('@submitApplication');
    
    // Verify success message
    cy.findByText(/application submitted successfully/i).should('be.visible');
    
    // Verify redirection to status page
    cy.url().should('include', '/applications/1/status');
    
    // Verify updated status
    cy.findByText(/submitted/i).should('be.visible');
  });
  
  it('should prevent submission of incomplete application', () => {
    // Mock an incomplete application
    cy.intercept('GET', '/api/v1/applications/*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          application_type: ApplicationType.UNDERGRADUATE,
          academic_term: AcademicTerm.FALL,
          academic_year: '2024',
          current_status_id: null,
          application_data: {
            personal_information: generateTestApplicationData().personal_information,
            contact_details: generateTestApplicationData().contact_details,
            academic_history: { institutions: [] },  // Missing institutions
            test_scores: { has_taken_tests: false, scores: [] },
            personal_statement: { statement: '' },  // Missing statement
            recommendations: { recommendations: [] }
          },
          is_submitted: false,
          submitted_at: null,
          created_at: '2023-07-01T00:00:00Z',
          updated_at: '2023-07-01T00:00:00Z',
          completion_status: {
            isComplete: false,
            missingItems: ['Academic History', 'Personal Statement'],
            completionPercentage: 40
          }
        }
      }
    }).as('getIncompleteApplication');
    
    // Reload to get the incomplete version
    cy.reload();
    cy.wait('@getIncompleteApplication');
    
    // Verify incomplete sections are marked
    cy.findByText(/academic history/i).closest('section').should('contain.text', 'Incomplete');
    cy.findByText(/personal statement/i).closest('section').should('contain.text', 'Incomplete');
    
    // Check the confirmation checkbox
    cy.findByLabelText(/I confirm that all information provided is accurate/i).check();
    
    // Verify Submit button is disabled
    cy.findByRole('button', { name: /submit application/i }).should('be.disabled');
    
    // Verify helpful message
    cy.findByText(/complete all required sections before submission/i).should('be.visible');
  });
  
  it('should require confirmation checkbox before submission', () => {
    // Verify all sections show as complete
    cy.findByText(/personal information/i).closest('section').should('contain.text', 'Complete');
    
    // Verify Submit button is disabled without checkbox
    cy.findByRole('button', { name: /submit application/i }).should('be.disabled');
    
    // Check the checkbox
    cy.findByLabelText(/I confirm that all information provided is accurate/i).check();
    
    // Verify Submit button becomes enabled
    cy.findByRole('button', { name: /submit application/i }).should('be.enabled');
  });
  
  it('should handle submission errors gracefully', () => {
    // Mock submission error
    cy.intercept('POST', '/api/v1/applications/*/submit', {
      statusCode: 500,
      body: {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while submitting your application',
          details: null
        }
      }
    }).as('submissionError');
    
    // Check the confirmation checkbox
    cy.findByLabelText(/I confirm that all information provided is accurate/i).check();
    
    // Click submit button
    cy.findByRole('button', { name: /submit application/i }).click();
    
    // Verify API request
    cy.wait('@submissionError');
    
    // Verify error message
    cy.findByText(/an error occurred while submitting your application/i).should('be.visible');
    
    // Verify user remains on the Review & Submit step
    cy.url().should('include', `/${ApplicationFormStep.REVIEW_SUBMIT}`);
    
    // Verify can try again
    cy.findByRole('button', { name: /submit application/i }).should('be.enabled');
  });
});

describe('Application Status Tracking', () => {
  beforeEach(() => {
    setupApplicationTest();
  });
  
  it('should display application status on dashboard', () => {
    // Mock API response for a submitted application
    cy.intercept('GET', '/api/v1/applications*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            application_type: ApplicationType.UNDERGRADUATE,
            academic_term: AcademicTerm.FALL,
            academic_year: '2024',
            status: 'submitted',
            is_submitted: true,
            submitted_at: '2023-07-10T00:00:00Z',
            created_at: '2023-07-01T00:00:00Z',
            updated_at: '2023-07-10T00:00:00Z',
            completion_percentage: 100
          }
        ],
        meta: {
          pagination: {
            total: 1,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getApplications');
    
    // Visit dashboard
    cy.visit('/dashboard');
    cy.wait('@getApplications');
    
    // Verify status card
    cy.findByTestId('application-status-card').should('be.visible');
    cy.findByText(/submitted/i).should('be.visible');
    cy.findByRole('progressbar').should('have.attr', 'aria-valuenow', '100');
    
    // Verify next steps
    cy.findByText(/next steps/i).should('be.visible');
    cy.findByText(/await document verification/i).should('be.visible');
  });
  
  it('should display detailed application timeline', () => {
    // Mock API response for application status
    cy.intercept('GET', '/api/v1/applications/*/status*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          application_type: ApplicationType.UNDERGRADUATE,
          academic_term: AcademicTerm.FALL,
          academic_year: '2024',
          current_status_id: 2,
          application_data: generateTestApplicationData(),
          is_submitted: true,
          submitted_at: '2023-07-10T00:00:00Z',
          created_at: '2023-07-01T00:00:00Z',
          updated_at: '2023-07-10T00:00:00Z',
          statuses: [
            {
              id: 1,
              application_id: 1,
              status: 'draft',
              notes: null,
              created_at: '2023-07-01T00:00:00Z'
            },
            {
              id: 2,
              application_id: 1,
              status: 'submitted',
              notes: null,
              created_at: '2023-07-10T00:00:00Z'
            }
          ],
          timeline: [
            {
              stage: 'Started Application',
              date: '2023-07-01T00:00:00Z',
              completed: true
            },
            {
              stage: 'Submitted Application',
              date: '2023-07-10T00:00:00Z',
              completed: true
            },
            {
              stage: 'Document Verification',
              date: '2023-07-20T00:00:00Z',
              completed: false,
              current: true
            },
            {
              stage: 'Under Review',
              date: '2023-08-01T00:00:00Z',
              completed: false
            },
            {
              stage: 'Decision',
              date: '2023-08-15T00:00:00Z',
              completed: false
            }
          ]
        }
      }
    }).as('getApplicationStatus');
    
    // Visit application status page
    cy.visit('/applications/1/status');
    cy.wait('@getApplicationStatus');
    
    // Verify timeline is displayed
    cy.findByTestId('application-timeline').should('be.visible');
    
    // Verify completed stages
    cy.findByText(/started application/i).should('be.visible')
      .closest('[data-completed=true]').should('exist');
    cy.findByText(/submitted application/i).should('be.visible')
      .closest('[data-completed=true]').should('exist');
    
    // Verify current stage
    cy.findByText(/document verification/i).should('be.visible')
      .closest('[data-current=true]').should('exist');
    
    // Verify future stages with estimated dates
    cy.findByText(/under review/i).should('be.visible');
    cy.findByText(/expected by: august 1, 2023/i).should('be.visible');
  });
  
  it('should update status when changed by admissions office', () => {
    // First mock the initial status
    cy.intercept('GET', '/api/v1/applications/*/status*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          current_status_id: 2,
          is_submitted: true,
          statuses: [
            {
              id: 1,
              application_id: 1,
              status: 'draft',
              notes: null,
              created_at: '2023-07-01T00:00:00Z'
            },
            {
              id: 2,
              application_id: 1,
              status: 'submitted',
              notes: null,
              created_at: '2023-07-10T00:00:00Z'
            }
          ],
          timeline: [
            {
              stage: 'Started Application',
              date: '2023-07-01T00:00:00Z',
              completed: true
            },
            {
              stage: 'Submitted Application',
              date: '2023-07-10T00:00:00Z',
              completed: true,
              current: true
            },
            {
              stage: 'Document Verification',
              date: '2023-07-20T00:00:00Z',
              completed: false
            }
          ]
        }
      }
    }).as('getInitialStatus');
    
    // Then mock the updated status
    cy.intercept('GET', '/api/v1/applications/*/status*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          current_status_id: 3,
          is_submitted: true,
          statuses: [
            {
              id: 1,
              application_id: 1,
              status: 'draft',
              notes: null,
              created_at: '2023-07-01T00:00:00Z'
            },
            {
              id: 2,
              application_id: 1,
              status: 'submitted',
              notes: null,
              created_at: '2023-07-10T00:00:00Z'
            },
            {
              id: 3,
              application_id: 1,
              status: 'in_review',
              notes: 'Application is now under review',
              created_at: '2023-07-15T00:00:00Z'
            }
          ],
          timeline: [
            {
              stage: 'Started Application',
              date: '2023-07-01T00:00:00Z',
              completed: true
            },
            {
              stage: 'Submitted Application',
              date: '2023-07-10T00:00:00Z',
              completed: true
            },
            {
              stage: 'In Review',
              date: '2023-07-15T00:00:00Z',
              completed: true,
              current: true
            },
            {
              stage: 'Decision',
              date: '2023-08-15T00:00:00Z',
              completed: false
            }
          ]
        }
      }
    }).as('getUpdatedStatus');
    
    // Visit application status page
    cy.visit('/applications/1/status');
    cy.wait('@getInitialStatus');
    
    // Verify initial status
    cy.findByText(/submitted application/i).closest('[data-current=true]').should('exist');
    
    // Simulate status update (this would be triggered by WebSocket or polling in the real app)
    // Here we'll just wait and then force a refresh
    cy.wait(1000);
    cy.get('@getInitialStatus.all').then(() => {
      cy.reload();
    });
    
    cy.wait('@getUpdatedStatus');
    
    // Verify status is updated
    cy.findByText(/in review/i).closest('[data-current=true]').should('exist');
    
    // Verify timeline is updated
    cy.findByText(/in review/i).should('be.visible');
    
    // Verify notification about status change
    cy.findByText(/status updated/i).should('be.visible');
  });
  
  it('should display document requirements based on status', () => {
    // Mock API response for application with additional info requested
    cy.intercept('GET', '/api/v1/applications/*/status*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          current_status_id: 4,
          is_submitted: true,
          statuses: [
            {
              id: 4,
              application_id: 1,
              status: 'additional_info_requested',
              notes: 'Please provide additional documents',
              created_at: '2023-07-15T00:00:00Z'
            }
          ],
          timeline: [
            {
              stage: 'Additional Information Requested',
              date: '2023-07-15T00:00:00Z',
              completed: false,
              current: true
            }
          ],
          required_documents: [
            {
              document_type: 'transcript',
              label: 'Official Transcript',
              uploaded: false,
              required: true
            },
            {
              document_type: 'recommendation',
              label: 'Additional Letter of Recommendation',
              uploaded: false,
              required: true
            }
          ]
        }
      }
    }).as('getAdditionalInfoStatus');
    
    // Visit application status page
    cy.visit('/applications/1/status');
    cy.wait('@getAdditionalInfoStatus');
    
    // Verify required documents section
    cy.findByText(/required documents/i).should('be.visible');
    
    // Verify missing documents are highlighted
    cy.findByText(/official transcript/i).closest('[data-missing=true]').should('exist');
    cy.findByText(/additional letter of recommendation/i).closest('[data-missing=true]').should('exist');
    
    // Verify upload buttons
    cy.findByRole('button', { name: /upload transcript/i }).should('be.visible');
    cy.findByRole('button', { name: /upload recommendation/i }).should('be.visible');
  });
});

describe('Application Management', () => {
  beforeEach(() => {
    setupApplicationTest();
  });
  
  it('should list all user applications', () => {
    // Mock API response with multiple applications
    cy.intercept('GET', '/api/v1/applications*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            application_type: ApplicationType.UNDERGRADUATE,
            academic_term: AcademicTerm.FALL,
            academic_year: '2024',
            status: 'submitted',
            is_submitted: true,
            submitted_at: '2023-07-10T00:00:00Z',
            created_at: '2023-07-01T00:00:00Z',
            updated_at: '2023-07-10T00:00:00Z',
            completion_percentage: 100
          },
          {
            id: 2,
            application_type: ApplicationType.GRADUATE,
            academic_term: AcademicTerm.SPRING,
            academic_year: '2024',
            status: 'draft',
            is_submitted: false,
            submitted_at: null,
            created_at: '2023-07-05T00:00:00Z',
            updated_at: '2023-07-05T00:00:00Z',
            completion_percentage: 35
          },
          {
            id: 3,
            application_type: ApplicationType.TRANSFER,
            academic_term: AcademicTerm.FALL,
            academic_year: '2023',
            status: 'in_review',
            is_submitted: true,
            submitted_at: '2023-06-15T00:00:00Z',
            created_at: '2023-06-01T00:00:00Z',
            updated_at: '2023-06-20T00:00:00Z',
            completion_percentage: 100
          }
        ],
        meta: {
          pagination: {
            total: 3,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getApplications');
    
    // Visit applications page
    cy.visit('/applications');
    cy.wait('@getApplications');
    
    // Verify all applications are listed
    cy.findByTestId('applications-list').should('be.visible');
    cy.findByTestId('application-item-1').should('be.visible');
    cy.findByTestId('application-item-2').should('be.visible');
    cy.findByTestId('application-item-3').should('be.visible');
    
    // Verify each application shows correct info
    cy.findByTestId('application-item-1').should('contain.text', ApplicationType.UNDERGRADUATE);
    cy.findByTestId('application-item-1').should('contain.text', AcademicTerm.FALL);
    cy.findByTestId('application-item-1').should('contain.text', '2024');
    cy.findByTestId('application-item-1').should('contain.text', 'submitted');
    
    // Verify applications are sorted by creation date (newest first)
    cy.findByTestId('applications-list').within(() => {
      cy.findAllByTestId(/application-item-/).eq(0).should('contain.text', 'Graduate');
      cy.findAllByTestId(/application-item-/).eq(1).should('contain.text', 'Undergraduate');
      cy.findAllByTestId(/application-item-/).eq(2).should('contain.text', 'Transfer');
    });
  });
  
  it('should filter applications by type and status', () => {
    // Mock initial applications response
    cy.intercept('GET', '/api/v1/applications*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            application_type: ApplicationType.UNDERGRADUATE,
            academic_term: AcademicTerm.FALL,
            academic_year: '2024',
            status: 'submitted',
            is_submitted: true,
            submitted_at: '2023-07-10T00:00:00Z',
            created_at: '2023-07-01T00:00:00Z',
            updated_at: '2023-07-10T00:00:00Z',
            completion_percentage: 100
          },
          {
            id: 2,
            application_type: ApplicationType.GRADUATE,
            academic_term: AcademicTerm.SPRING,
            academic_year: '2024',
            status: 'draft',
            is_submitted: false,
            submitted_at: null,
            created_at: '2023-07-05T00:00:00Z',
            updated_at: '2023-07-05T00:00:00Z',
            completion_percentage: 35
          },
          {
            id: 3,
            application_type: ApplicationType.UNDERGRADUATE,
            academic_term: AcademicTerm.FALL,
            academic_year: '2023',
            status: 'draft',
            is_submitted: false,
            submitted_at: null,
            created_at: '2023-06-01T00:00:00Z',
            updated_at: '2023-06-20T00:00:00Z',
            completion_percentage: 50
          }
        ],
        meta: {
          pagination: {
            total: 3,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getAllApplications');
    
    // Mock filtered response for undergraduate type
    cy.intercept('GET', '/api/v1/applications*application_type=undergraduate*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            application_type: ApplicationType.UNDERGRADUATE,
            academic_term: AcademicTerm.FALL,
            academic_year: '2024',
            status: 'submitted',
            is_submitted: true,
            submitted_at: '2023-07-10T00:00:00Z',
            created_at: '2023-07-01T00:00:00Z',
            updated_at: '2023-07-10T00:00:00Z',
            completion_percentage: 100
          },
          {
            id: 3,
            application_type: ApplicationType.UNDERGRADUATE,
            academic_term: AcademicTerm.FALL,
            academic_year: '2023',
            status: 'draft',
            is_submitted: false,
            submitted_at: null,
            created_at: '2023-06-01T00:00:00Z',
            updated_at: '2023-06-20T00:00:00Z',
            completion_percentage: 50
          }
        ],
        meta: {
          pagination: {
            total: 2,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getUndergraduateApplications');
    
    // Mock filtered response for undergraduate + submitted
    cy.intercept('GET', '/api/v1/applications*application_type=undergraduate*status=submitted*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            application_type: ApplicationType.UNDERGRADUATE,
            academic_term: AcademicTerm.FALL,
            academic_year: '2024',
            status: 'submitted',
            is_submitted: true,
            submitted_at: '2023-07-10T00:00:00Z',
            created_at: '2023-07-01T00:00:00Z',
            updated_at: '2023-07-10T00:00:00Z',
            completion_percentage: 100
          }
        ],
        meta: {
          pagination: {
            total: 1,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getSubmittedUndergraduateApplications');
    
    // Visit applications page
    cy.visit('/applications');
    cy.wait('@getAllApplications');
    
    // Verify all applications initially
    cy.findAllByTestId(/application-item-/).should('have.length', 3);
    
    // Filter by undergraduate
    cy.findByLabelText(/application type/i).select(ApplicationType.UNDERGRADUATE);
    cy.wait('@getUndergraduateApplications');
    
    // Verify only undergraduate applications
    cy.findAllByTestId(/application-item-/).should('have.length', 2);
    cy.findByTestId('application-item-1').should('be.visible');
    cy.findByTestId('application-item-3').should('be.visible');
    
    // Filter by submitted status
    cy.findByLabelText(/status/i).select('submitted');
    cy.wait('@getSubmittedUndergraduateApplications');
    
    // Verify only submitted undergraduate applications
    cy.findAllByTestId(/application-item-/).should('have.length', 1);
    cy.findByTestId('application-item-1').should('be.visible');
    
    // Clear filters
    cy.findByRole('button', { name: /clear filters/i }).click();
    cy.wait('@getAllApplications');
    
    // Verify all applications again
    cy.findAllByTestId(/application-item-/).should('have.length', 3);
  });
  
  it('should continue editing a draft application', () => {
    // Mock API responses
    cy.intercept('GET', '/api/v1/applications*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 2,
            application_type: ApplicationType.GRADUATE,
            academic_term: AcademicTerm.SPRING,
            academic_year: '2024',
            status: 'draft',
            is_submitted: false,
            submitted_at: null,
            created_at: '2023-07-05T00:00:00Z',
            updated_at: '2023-07-05T00:00:00Z',
            completion_percentage: 35
          }
        ],
        meta: {
          pagination: {
            total: 1,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getApplications');
    
    // Mock draft application with partial data
    cy.intercept('GET', '/api/v1/applications/2', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 2,
          application_type: ApplicationType.GRADUATE,
          academic_term: AcademicTerm.SPRING,
          academic_year: '2024',
          current_status_id: null,
          application_data: {
            personal_information: {
              first_name: 'Jane',
              middle_name: '',
              last_name: 'Smith',
              date_of_birth: '1992-05-20',
              gender: 'Female',
              citizenship: 'United States',
              ssn: null
            },
            contact_details: {},
            academic_history: { institutions: [] },
            test_scores: { has_taken_tests: false, scores: [] },
            personal_statement: { statement: '' },
            recommendations: { recommendations: [] }
          },
          is_submitted: false,
          submitted_at: null,
          created_at: '2023-07-05T00:00:00Z',
          updated_at: '2023-07-05T00:00:00Z',
          current_step: ApplicationFormStep.CONTACT_DETAILS
        }
      }
    }).as('getDraftApplication');
    
    // Mock update response
    cy.intercept('PUT', '/api/v1/applications/2', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 2
        }
      }
    }).as('updateApplication');
    
    // Visit applications page
    cy.visit('/applications');
    cy.wait('@getApplications');
    
    // Click on draft application
    cy.findByTestId('application-item-2').click();
    cy.wait('@getDraftApplication');
    
    // Verify redirection to application form
    cy.url().should('include', '/applications/2/edit');
    
    // Verify form is loaded with saved data
    cy.findByLabelText(/first name/i).should('have.value', 'Jane');
    cy.findByLabelText(/last name/i).should('have.value', 'Smith');
    
    // Verify current step (contact details) is active
    cy.findByText(/contact details/i).should('be.visible');
    
    // Make changes
    cy.findByLabelText(/email/i).type('jane.smith@example.com');
    cy.findByLabelText(/phone number/i).type('(555) 987-6543');
    
    // Save and continue
    cy.findByRole('button', { name: /save & continue/i }).click();
    cy.wait('@updateApplication');
    
    // Verify navigation to next step
    cy.findByText(/academic history/i).should('be.visible');
  });
  
  it('should delete a draft application', () => {
    // Mock API responses
    cy.intercept('GET', '/api/v1/applications*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 2,
            application_type: ApplicationType.GRADUATE,
            academic_term: AcademicTerm.SPRING,
            academic_year: '2024',
            status: 'draft',
            is_submitted: false,
            submitted_at: null,
            created_at: '2023-07-05T00:00:00Z',
            updated_at: '2023-07-05T00:00:00Z',
            completion_percentage: 35
          }
        ],
        meta: {
          pagination: {
            total: 1,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getApplications');
    
    // Mock delete response
    cy.intercept('DELETE', '/api/v1/applications/2', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Application deleted successfully'
      }
    }).as('deleteApplication');
    
    // Mock empty applications after deletion
    cy.intercept('GET', '/api/v1/applications*', {
      statusCode: 200,
      body: {
        success: true,
        data: [],
        meta: {
          pagination: {
            total: 0,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getEmptyApplications');
    
    // Visit applications page
    cy.visit('/applications');
    cy.wait('@getApplications');
    
    // Click delete button
    cy.findByTestId('delete-application-2').click();
    
    // Verify confirmation dialog
    cy.findByRole('dialog').should('be.visible');
    cy.findByText(/are you sure you want to delete this application/i).should('be.visible');
    
    // Confirm deletion
    cy.findByRole('button', { name: /delete/i }).click();
    
    // Verify API request
    cy.wait('@deleteApplication');
    
    // Verify application is removed
    cy.wait('@getEmptyApplications');
    cy.findByText(/no applications found/i).should('be.visible');
    
    // Verify success message
    cy.findByText(/application deleted successfully/i).should('be.visible');
  });
  
  it('should not allow deleting submitted applications', () => {
    // Mock API response with submitted application
    cy.intercept('GET', '/api/v1/applications*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            application_type: ApplicationType.UNDERGRADUATE,
            academic_term: AcademicTerm.FALL,
            academic_year: '2024',
            status: 'submitted',
            is_submitted: true,
            submitted_at: '2023-07-10T00:00:00Z',
            created_at: '2023-07-01T00:00:00Z',
            updated_at: '2023-07-10T00:00:00Z',
            completion_percentage: 100
          }
        ],
        meta: {
          pagination: {
            total: 1,
            per_page: 10,
            current_page: 1,
            last_page: 1
          }
        }
      }
    }).as('getApplications');
    
    // Visit applications page
    cy.visit('/applications');
    cy.wait('@getApplications');
    
    // Verify delete button is not present for submitted application
    cy.findByTestId('application-item-1').should('be.visible');
    cy.findByTestId('delete-application-1').should('not.exist');
  });
});