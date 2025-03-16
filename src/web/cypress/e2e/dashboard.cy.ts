/// <reference types="cypress" />
import { User } from '../../src/types/auth';
import { Application } from '../../src/types/application';

/**
 * Sets up the test environment for dashboard testing with an authenticated user and application data
 */
function setupDashboardTest(): void {
  // Load fixture data
  cy.fixture('users/authenticated-user.json').as('user');
  cy.fixture('applications/submitted-application.json').as('application');
  cy.fixture('documents/user-documents.json').as('documents');
  cy.fixture('messages/recent-messages.json').as('messages');
  cy.fixture('notifications/user-notifications.json').as('notifications');
  
  // Stub API routes
  cy.get('@user').then((user: User) => {
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 200,
      body: { success: true, data: user, message: null }
    }).as('getUser');
  });
  
  cy.get('@application').then((application: Application) => {
    cy.intercept('GET', '/api/v1/applications?*', {
      statusCode: 200,
      body: { 
        success: true, 
        data: [application], 
        meta: { 
          pagination: { 
            total: 1, 
            per_page: 10, 
            current_page: 1, 
            last_page: 1,
            from: 1,
            to: 1 
          } 
        }, 
        message: null 
      }
    }).as('getApplications');
    
    cy.intercept('GET', `/api/v1/applications/${application.id}`, {
      statusCode: 200,
      body: { success: true, data: application, message: null }
    }).as('getApplication');
  });
  
  cy.get('@documents').then((documents) => {
    cy.intercept('GET', '/api/v1/documents?*', {
      statusCode: 200,
      body: { 
        success: true, 
        data: documents, 
        meta: { 
          pagination: { 
            total: documents.length, 
            per_page: 10, 
            current_page: 1, 
            last_page: 1,
            from: 1,
            to: documents.length 
          } 
        }, 
        message: null 
      }
    }).as('getDocuments');
  });
  
  cy.get('@messages').then((messages) => {
    cy.intercept('GET', '/api/v1/messages?*', {
      statusCode: 200,
      body: { 
        success: true, 
        data: messages, 
        meta: { 
          pagination: { 
            total: messages.length, 
            per_page: 10, 
            current_page: 1, 
            last_page: 1,
            from: 1,
            to: messages.length 
          } 
        }, 
        message: null 
      }
    }).as('getMessages');
  });
  
  cy.get('@notifications').then((notifications) => {
    cy.intercept('GET', '/api/v1/notifications?*', {
      statusCode: 200,
      body: { 
        success: true, 
        data: notifications, 
        meta: { 
          pagination: { 
            total: notifications.length, 
            per_page: 10, 
            current_page: 1, 
            last_page: 1,
            from: 1,
            to: notifications.length 
          } 
        }, 
        message: null 
      }
    }).as('getNotifications');
  });
  
  // Mock authenticated user
  cy.window().then((win) => {
    win.localStorage.setItem('auth_token', 'mock-jwt-token');
  });
  
  // Visit the dashboard page
  cy.visit('/dashboard');
  
  // Wait for dashboard to load completely
  cy.wait('@getUser');
  cy.wait('@getApplications');
  cy.wait('@getDocuments');
  cy.wait('@getMessages');
  cy.wait('@getNotifications');
}

/**
 * Sets up the test environment for dashboard testing with an authenticated user but no applications
 */
function setupEmptyDashboardTest(): void {
  // Load user fixture data
  cy.fixture('users/authenticated-user.json').as('user');
  
  // Stub API routes
  cy.get('@user').then((user: User) => {
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 200,
      body: { success: true, data: user, message: null }
    }).as('getUser');
  });
  
  // Stub empty applications response
  cy.intercept('GET', '/api/v1/applications?*', {
    statusCode: 200,
    body: { 
      success: true, 
      data: [], 
      meta: { 
        pagination: { 
          total: 0, 
          per_page: 10, 
          current_page: 1, 
          last_page: 1,
          from: 0,
          to: 0 
        } 
      }, 
      message: null 
    }
  }).as('getApplications');
  
  // Mock authenticated user
  cy.window().then((win) => {
    win.localStorage.setItem('auth_token', 'mock-jwt-token');
  });
  
  // Visit the dashboard page
  cy.visit('/dashboard');
  
  // Wait for dashboard to load completely
  cy.wait('@getUser');
  cy.wait('@getApplications');
}

/**
 * Sets up the test environment for dashboard testing with a draft application
 */
function setupDraftApplicationDashboardTest(): void {
  // Load fixture data
  cy.fixture('users/authenticated-user.json').as('user');
  cy.fixture('applications/draft-application.json').as('draftApplication');
  
  // Stub API routes
  cy.get('@user').then((user: User) => {
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 200,
      body: { success: true, data: user, message: null }
    }).as('getUser');
  });
  
  cy.get('@draftApplication').then((application) => {
    cy.intercept('GET', '/api/v1/applications?*', {
      statusCode: 200,
      body: { 
        success: true, 
        data: [application], 
        meta: { 
          pagination: { 
            total: 1, 
            per_page: 10, 
            current_page: 1, 
            last_page: 1,
            from: 1,
            to: 1 
          } 
        }, 
        message: null 
      }
    }).as('getApplications');
    
    cy.intercept('GET', `/api/v1/applications/${application.id}`, {
      statusCode: 200,
      body: { success: true, data: application, message: null }
    }).as('getApplication');
  });
  
  // Mock authenticated user
  cy.window().then((win) => {
    win.localStorage.setItem('auth_token', 'mock-jwt-token');
  });
  
  // Visit the dashboard page
  cy.visit('/dashboard');
  
  // Wait for dashboard to load completely
  cy.wait('@getUser');
  cy.wait('@getApplications');
}

/**
 * Sets up the test environment for dashboard testing with a submitted application
 */
function setupSubmittedApplicationDashboardTest(): void {
  // Load fixture data
  cy.fixture('users/authenticated-user.json').as('user');
  cy.fixture('applications/submitted-application.json').as('submittedApplication');
  cy.fixture('documents/user-documents.json').as('documents');
  cy.fixture('messages/recent-messages.json').as('messages');
  cy.fixture('notifications/user-notifications.json').as('notifications');
  
  // Stub API routes
  cy.get('@user').then((user: User) => {
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 200,
      body: { success: true, data: user, message: null }
    }).as('getUser');
  });
  
  cy.get('@submittedApplication').then((application) => {
    cy.intercept('GET', '/api/v1/applications?*', {
      statusCode: 200,
      body: { 
        success: true, 
        data: [application], 
        meta: { 
          pagination: { 
            total: 1, 
            per_page: 10, 
            current_page: 1, 
            last_page: 1,
            from: 1,
            to: 1 
          } 
        }, 
        message: null 
      }
    }).as('getApplications');
    
    cy.intercept('GET', `/api/v1/applications/${application.id}`, {
      statusCode: 200,
      body: { success: true, data: application, message: null }
    }).as('getApplication');
  });
  
  cy.get('@documents').then((documents) => {
    cy.intercept('GET', '/api/v1/documents?*', {
      statusCode: 200,
      body: { 
        success: true, 
        data: documents, 
        meta: { 
          pagination: { 
            total: documents.length, 
            per_page: 10, 
            current_page: 1, 
            last_page: 1,
            from: 1,
            to: documents.length 
          } 
        }, 
        message: null 
      }
    }).as('getDocuments');
  });
  
  cy.get('@messages').then((messages) => {
    cy.intercept('GET', '/api/v1/messages?*', {
      statusCode: 200,
      body: { 
        success: true, 
        data: messages, 
        meta: { 
          pagination: { 
            total: messages.length, 
            per_page: 10, 
            current_page: 1, 
            last_page: 1,
            from: 1,
            to: messages.length 
          } 
        }, 
        message: null 
      }
    }).as('getMessages');
  });
  
  cy.get('@notifications').then((notifications) => {
    cy.intercept('GET', '/api/v1/notifications?*', {
      statusCode: 200,
      body: { 
        success: true, 
        data: notifications, 
        meta: { 
          pagination: { 
            total: notifications.length, 
            per_page: 10, 
            current_page: 1, 
            last_page: 1,
            from: 1,
            to: notifications.length 
          } 
        }, 
        message: null 
      }
    }).as('getNotifications');
  });
  
  // Mock authenticated user
  cy.window().then((win) => {
    win.localStorage.setItem('auth_token', 'mock-jwt-token');
  });
  
  // Visit the dashboard page
  cy.visit('/dashboard');
  
  // Wait for dashboard to load completely
  cy.wait('@getUser');
  cy.wait('@getApplications');
  cy.wait('@getDocuments');
  cy.wait('@getMessages');
  cy.wait('@getNotifications');
}

describe('Dashboard Layout and Components', () => {
  beforeEach(() => {
    setupDashboardTest();
  });

  it("should display welcome message with user's name", () => {
    cy.get('@user').then((user: User) => {
      cy.contains(`Welcome back, ${user.profile?.first_name}!`).should('be.visible');
      cy.contains('Welcome back').should('have.css', 'font-weight', '600');
    });
  });

  it('should display all required dashboard components', () => {
    // Verify StatusCard component is visible
    cy.get('[data-testid="status-card"]').should('be.visible');
    
    // Verify NextSteps component is visible
    cy.get('[data-testid="next-steps"]').should('be.visible');
    
    // Verify ImportantDates component is visible
    cy.get('[data-testid="important-dates"]').should('be.visible');
    
    // Verify RecentMessages component is visible
    cy.get('[data-testid="recent-messages"]').should('be.visible');
    
    // Verify DocumentStatus component is visible
    cy.get('[data-testid="document-status"]').should('be.visible');
    
    // Verify ApplicationTimeline component is visible (might be combined with StatusCard)
    cy.get('[data-testid="application-timeline"]').should('exist');
  });

  it('should display AI chatbot button', () => {
    // Verify chatbot button is visible in the bottom right corner
    cy.get('[data-testid="chatbot-button"]')
      .should('be.visible')
      .should('have.css', 'position', 'fixed')
      .should('have.css', 'bottom')
      .should('have.css', 'right');
    
    // Verify chatbot button has correct icon
    cy.get('[data-testid="chatbot-button"]')
      .find('svg')
      .should('exist');
  });

  it('should have responsive layout that adapts to screen size', () => {
    // Test dashboard at mobile viewport size (375x667)
    cy.viewport(375, 667);
    cy.get('[data-testid="dashboard-grid"]').should('be.visible');
    // Verify components stack vertically on mobile
    cy.get('[data-testid="dashboard-grid"] > div').each(($el) => {
      cy.wrap($el).should('have.css', 'grid-column', 'span 12 / span 12');
    });
    
    // Test dashboard at tablet viewport size (768x1024)
    cy.viewport(768, 1024);
    cy.get('[data-testid="dashboard-grid"]').should('be.visible');
    // Verify grid layout adjusts for tablet
    cy.get('[data-testid="status-card"]').should('be.visible');
    cy.get('[data-testid="next-steps"]').should('be.visible');
    
    // Test dashboard at desktop viewport size (1280x800)
    cy.viewport(1280, 800);
    cy.get('[data-testid="dashboard-grid"]').should('be.visible');
    // Verify grid layout optimizes for desktop
    cy.get('[data-testid="status-card"]').should('be.visible');
    cy.get('[data-testid="next-steps"]').should('be.visible');
    cy.get('[data-testid="important-dates"]').should('be.visible');
    cy.get('[data-testid="recent-messages"]').should('be.visible');
  });
});

describe('Empty Dashboard State', () => {
  beforeEach(() => {
    setupEmptyDashboardTest();
  });

  it('should display empty state message when no applications exist', () => {
    // Verify empty state message is displayed
    cy.contains('No applications found').should('be.visible');
    cy.contains('Start your admissions journey today').should('be.visible');
    
    // Verify create application button is visible
    cy.get('[data-testid="create-application-button"]').should('be.visible');
  });

  it('should navigate to application creation when clicking create button', () => {
    // Set up intercept for the navigation
    cy.intercept('GET', '/application/create*').as('createApplication');
    
    // Click create application button
    cy.get('[data-testid="create-application-button"]').click();
    
    // Verify navigation to application creation page
    cy.url().should('include', '/application/create');
    cy.wait('@createApplication');
  });
});

describe('Status Card Component', () => {
  beforeEach(() => {
    setupDashboardTest();
  });

  it('should display correct application status', () => {
    cy.get('@application').then((application: Application) => {
      // Verify status badge shows correct status text
      cy.get('[data-testid="status-badge"]')
        .should('be.visible')
        .should('contain.text', application.current_status?.status);
      
      // Verify status badge has appropriate color for the status
      cy.get('[data-testid="status-badge"]').should('have.class', /status-/);
    });
  });

  it('should display correct completion percentage', () => {
    cy.get('@application').then((application: any) => {
      // Extract completion percentage from the application data
      const completionPercentage = application.completion_percentage || 0;
      
      // Verify progress indicator shows correct percentage
      cy.get('[data-testid="progress-indicator"]')
        .should('be.visible')
        .should('contain.text', `${completionPercentage}%`);
      
      // Verify progress bar visual representation matches percentage
      cy.get('[data-testid="progress-bar"]')
        .should('have.attr', 'aria-valuenow', String(completionPercentage));
    });
  });

  it('should display last updated timestamp', () => {
    cy.get('@application').then((application: Application) => {
      // Verify last updated text is visible
      cy.get('[data-testid="last-updated"]').should('be.visible');
      
      // Verify timestamp exists (exact format check would depend on formatting logic)
      cy.get('[data-testid="last-updated"]').should('contain.text', 'Updated');
    });
  });

  it('should navigate to application status page when clicked', () => {
    cy.get('@application').then((application: Application) => {
      // Set up intercept for the navigation
      cy.intercept('GET', `/application/${application.id}/status*`).as('applicationStatus');
      
      // Click on status card
      cy.get('[data-testid="status-card"]').click();
      
      // Verify navigation to application status page with correct application ID
      cy.url().should('include', `/application/${application.id}/status`);
      cy.wait('@applicationStatus');
    });
  });
});

describe('Next Steps Component', () => {
  beforeEach(() => {
    setupDashboardTest();
  });

  it('should display appropriate next steps based on application status', () => {
    // Verify next steps list contains appropriate items for current application status
    cy.get('[data-testid="next-steps-list"]').should('be.visible');
    cy.get('[data-testid="next-steps-list"] [data-testid="next-step-item"]')
      .should('have.length.at.least', 1);
    
    // Verify completed steps are marked as completed
    cy.get('[data-testid="next-steps-list"] [data-testid="next-step-item"].completed')
      .should('exist');
    
    // Verify pending steps are not marked as completed
    cy.get('[data-testid="next-steps-list"] [data-testid="next-step-item"]:not(.completed)')
      .should('exist');
  });

  it('should navigate to correct page when clicking on a step', () => {
    // Set up intercepts for the navigations
    cy.intercept('GET', '/profile*').as('profilePage');
    cy.intercept('GET', '/documents/upload*').as('documentsPage');
    cy.intercept('GET', '/payment*').as('paymentPage');
    
    // Click on 'Complete Profile' step
    cy.get('[data-testid="next-steps-list"]')
      .contains('Complete Profile')
      .click();
    
    // Verify navigation to profile page
    cy.url().should('include', '/profile');
    cy.wait('@profilePage');
    
    // Return to dashboard
    cy.visit('/dashboard');
    cy.wait('@getUser');
    cy.wait('@getApplications');
    
    // Click on 'Upload Documents' step
    cy.get('[data-testid="next-steps-list"]')
      .contains('Upload Documents')
      .click();
    
    // Verify navigation to document upload page
    cy.url().should('include', '/documents/upload');
    cy.wait('@documentsPage');
    
    // Return to dashboard
    cy.visit('/dashboard');
    cy.wait('@getUser');
    cy.wait('@getApplications');
    
    // Click on 'Pay Application Fee' step
    cy.get('[data-testid="next-steps-list"]')
      .contains('Pay Application Fee')
      .click();
    
    // Verify navigation to payment page
    cy.url().should('include', '/payment');
    cy.wait('@paymentPage');
  });
});

describe('Important Dates Component', () => {
  beforeEach(() => {
    setupDashboardTest();
  });

  it('should display relevant deadlines and dates', () => {
    // Verify important dates component contains expected dates
    cy.get('[data-testid="important-dates"]').should('be.visible');
    cy.get('[data-testid="important-dates"] [data-testid="date-item"]')
      .should('have.length.at.least', 1);
    
    // Verify dates are formatted correctly
    cy.get('[data-testid="important-dates"] [data-testid="date-item"] [data-testid="date-value"]')
      .each(($date) => {
        cy.wrap($date).invoke('text').should('match', /[A-Za-z]+ \d{1,2}, \d{4}/);
      });
    
    // Verify dates have appropriate labels
    cy.get('[data-testid="important-dates"] [data-testid="date-item"] [data-testid="date-label"]')
      .should('have.length.at.least', 1)
      .should('not.be.empty');
  });

  it('should highlight approaching deadlines', () => {
    // Stub API with approaching deadline
    cy.intercept('GET', '/api/v1/applications/*/important-dates', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            title: "Application Deadline",
            date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days from now
            is_approaching: true,
            days_remaining: 5
          }
        ],
        message: null
      }
    }).as('importantDates');
    
    // Refresh the page to trigger new data
    cy.visit('/dashboard');
    cy.wait('@getUser');
    cy.wait('@getApplications');
    cy.wait('@importantDates');
    
    // Verify approaching deadline has highlight styling
    cy.get('[data-testid="important-dates"] [data-testid="date-item"].approaching')
      .should('exist');
    
    // Verify deadline shows correct number of days remaining
    cy.get('[data-testid="important-dates"] [data-testid="date-item"].approaching')
      .should('contain.text', 'days remaining');
  });
});

describe('Recent Messages Component', () => {
  beforeEach(() => {
    setupDashboardTest();
  });

  it('should display recent messages with correct information', () => {
    // Verify recent messages component shows expected messages
    cy.get('[data-testid="recent-messages"]').should('be.visible');
    cy.get('[data-testid="recent-messages"] [data-testid="message-item"]')
      .should('have.length.at.least', 1);
    
    // Verify message subjects are displayed
    cy.get('[data-testid="recent-messages"] [data-testid="message-item"] [data-testid="message-subject"]')
      .should('have.length.at.least', 1)
      .should('not.be.empty');
    
    // Verify message timestamps are formatted correctly
    cy.get('[data-testid="recent-messages"] [data-testid="message-item"] [data-testid="message-time"]')
      .should('have.length.at.least', 1)
      .should('not.be.empty');
    
    // Verify unread messages are visually distinguished
    cy.get('[data-testid="recent-messages"] [data-testid="message-item"].unread')
      .should('exist');
  });

  it('should navigate to messaging center when clicking view all', () => {
    // Set up intercept for the navigation
    cy.intercept('GET', '/messages*').as('messagesPage');
    
    // Click 'View All Messages' button
    cy.get('[data-testid="recent-messages"] [data-testid="view-all-button"]').click();
    
    // Verify navigation to messaging center page
    cy.url().should('include', '/messages');
    cy.wait('@messagesPage');
  });

  it('should navigate to specific message when clicking on a message', () => {
    // Set up intercept for the navigation
    cy.intercept('GET', '/messages/*').as('messagePage');
    
    // Click on a specific message
    cy.get('[data-testid="recent-messages"] [data-testid="message-item"]').first().click();
    
    // Verify navigation to message detail page with correct message ID
    cy.url().should('include', '/messages/');
    cy.wait('@messagePage');
  });
});

describe('Document Status Component', () => {
  beforeEach(() => {
    setupDashboardTest();
  });

  it('should display document status with correct information', () => {
    // Verify document status component shows expected documents
    cy.get('[data-testid="document-status"]').should('be.visible');
    cy.get('[data-testid="document-status"] [data-testid="document-item"]')
      .should('have.length.at.least', 1);
    
    // Verify document types are displayed correctly
    cy.get('[data-testid="document-status"] [data-testid="document-item"] [data-testid="document-type"]')
      .should('have.length.at.least', 1)
      .should('not.be.empty');
    
    // Verify verified documents show verification status
    cy.get('[data-testid="document-status"] [data-testid="document-item"].verified')
      .should('exist')
      .should('contain.text', 'Verified');
    
    // Verify pending documents show pending status
    cy.get('[data-testid="document-status"] [data-testid="document-item"].pending')
      .should('exist')
      .should('contain.text', 'Pending');
  });

  it('should navigate to document upload page when clicking upload button', () => {
    // Set up intercept for the navigation
    cy.intercept('GET', '/documents/upload*').as('documentsPage');
    
    // Click 'Upload Documents' button
    cy.get('[data-testid="document-status"] [data-testid="upload-documents-button"]').click();
    
    // Verify navigation to document upload page
    cy.url().should('include', '/documents/upload');
    cy.wait('@documentsPage');
  });
});

describe('Application Timeline Component', () => {
  beforeEach(() => {
    setupDashboardTest();
  });

  it('should display application timeline with correct stages', () => {
    // Verify application timeline component shows expected stages
    cy.get('[data-testid="application-timeline"]').should('be.visible');
    cy.get('[data-testid="application-timeline"] [data-testid="timeline-stage"]')
      .should('have.length.at.least', 1);
    
    // Verify current stage is highlighted
    cy.get('[data-testid="application-timeline"] [data-testid="timeline-stage"].current')
      .should('exist');
    
    // Verify completed stages are marked as completed
    cy.get('[data-testid="application-timeline"] [data-testid="timeline-stage"].completed')
      .should('exist');
    
    // Verify future stages are not marked as completed
    cy.get('[data-testid="application-timeline"] [data-testid="timeline-stage"]:not(.completed):not(.current)')
      .should('exist');
  });

  it('should display stage dates correctly', () => {
    // Verify timeline shows correct dates for each stage
    cy.get('[data-testid="application-timeline"] [data-testid="timeline-stage"] [data-testid="stage-date"]')
      .should('have.length.at.least', 1);
    
    // Verify date formatting is consistent
    cy.get('[data-testid="application-timeline"] [data-testid="timeline-stage"] [data-testid="stage-date"]')
      .each(($date) => {
        cy.wrap($date).invoke('text').should('match', /[A-Za-z]+ \d{1,2}, \d{4}|Expected: [A-Za-z]+ \d{1,2}, \d{4}/);
      });
  });
});

describe('AI Chatbot Component', () => {
  beforeEach(() => {
    setupDashboardTest();
  });

  it('should open chatbot when clicking chatbot button', () => {
    // Click chatbot button
    cy.get('[data-testid="chatbot-button"]').click();
    
    // Verify chatbot interface becomes visible
    cy.get('[data-testid="chatbot-interface"]').should('be.visible');
    
    // Verify chatbot shows welcome message
    cy.get('[data-testid="chatbot-interface"] [data-testid="chat-message"].bot')
      .should('be.visible')
      .should('contain.text', 'Hello');
  });

  it('should close chatbot when clicking close button', () => {
    // Click chatbot button to open
    cy.get('[data-testid="chatbot-button"]').click();
    
    // Verify chatbot is visible
    cy.get('[data-testid="chatbot-interface"]').should('be.visible');
    
    // Click close button on chatbot
    cy.get('[data-testid="chatbot-interface"] [data-testid="close-button"]').click();
    
    // Verify chatbot is no longer visible
    cy.get('[data-testid="chatbot-interface"]').should('not.be.visible');
  });

  it('should allow sending messages to chatbot', () => {
    // Stub chatbot API response
    cy.intercept('POST', '/api/v1/chatbot/message', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          message: 'I can help answer your questions about the application process.',
          timestamp: new Date().toISOString()
        },
        message: null
      }
    }).as('chatbotResponse');
    
    // Click chatbot button to open
    cy.get('[data-testid="chatbot-button"]').click();
    
    // Type a test message in chatbot input
    cy.get('[data-testid="chatbot-interface"] [data-testid="chat-input"]')
      .type('What is the application deadline?');
    
    // Click send button
    cy.get('[data-testid="chatbot-interface"] [data-testid="send-button"]').click();
    
    // Verify message appears in chat history
    cy.get('[data-testid="chatbot-interface"] [data-testid="chat-message"].user')
      .should('contain.text', 'What is the application deadline?');
    
    // Wait for API response
    cy.wait('@chatbotResponse');
    
    // Verify chatbot response appears after sending
    cy.get('[data-testid="chatbot-interface"] [data-testid="chat-message"].bot')
      .should('contain.text', 'I can help answer your questions');
  });
});

describe('Dashboard Data Loading', () => {
  it('should display loading skeletons while data is loading', () => {
    // Stub API responses with delay
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 200,
      body: { success: true, data: {}, message: null },
      delay: 1000
    }).as('getUser');
    
    cy.intercept('GET', '/api/v1/applications?*', {
      statusCode: 200,
      body: { success: true, data: [], meta: { pagination: { total: 0, per_page: 10, current_page: 1, last_page: 1, from: 0, to: 0 } }, message: null },
      delay: 1000
    }).as('getApplications');
    
    // Visit dashboard page
    cy.visit('/dashboard');
    
    // Verify loading skeletons are displayed
    cy.get('[data-testid="skeleton-loader"]').should('be.visible');
    
    // Wait for data to load
    cy.wait('@getUser');
    cy.wait('@getApplications');
    
    // Verify actual content replaces skeletons
    cy.get('[data-testid="skeleton-loader"]').should('not.exist');
  });

  it('should handle API errors gracefully', () => {
    // Stub API responses with error status
    cy.intercept('GET', '/api/v1/auth/me', {
      statusCode: 200,
      body: { success: true, data: {}, message: null }
    }).as('getUser');
    
    cy.intercept('GET', '/api/v1/applications?*', {
      statusCode: 500,
      body: { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An error occurred', details: null } }
    }).as('getApplications');
    
    // Visit dashboard page
    cy.visit('/dashboard');
    
    // Wait for API response
    cy.wait('@getUser');
    cy.wait('@getApplications');
    
    // Verify error state is displayed
    cy.get('[data-testid="error-state"]').should('be.visible');
    
    // Verify retry button is available
    cy.get('[data-testid="retry-button"]').should('be.visible');
    
    // Stub successful API responses for retry
    cy.intercept('GET', '/api/v1/applications?*', {
      statusCode: 200,
      body: { success: true, data: [], meta: { pagination: { total: 0, per_page: 10, current_page: 1, last_page: 1, from: 0, to: 0 } }, message: null }
    }).as('getApplicationsRetry');
    
    // Click retry button
    cy.get('[data-testid="retry-button"]').click();
    
    // Wait for retry API response
    cy.wait('@getApplicationsRetry');
    
    // Verify dashboard loads correctly after retry
    cy.get('[data-testid="error-state"]').should('not.exist');
    cy.get('[data-testid="dashboard-content"]').should('be.visible');
  });
});

describe('Dashboard for Different Application States', () => {
  it('should display appropriate content for draft application', () => {
    setupDraftApplicationDashboardTest();
    
    // Verify status shows as 'Draft'
    cy.get('[data-testid="status-badge"]')
      .should('be.visible')
      .should('contain.text', 'Draft');
    
    // Verify next steps emphasize application completion
    cy.get('[data-testid="next-steps-list"]')
      .should('contain.text', 'Complete Application');
    
    // Verify document status shows required documents for submission
    cy.get('[data-testid="document-status"]')
      .should('contain.text', 'Required Documents');
  });

  it('should display appropriate content for submitted application', () => {
    setupSubmittedApplicationDashboardTest();
    
    // Verify status shows as 'Submitted' or review status
    cy.get('[data-testid="status-badge"]')
      .should('be.visible')
      .should(($badge) => {
        const text = $badge.text();
        expect(text).to.match(/Submitted|In Review|Under Review/);
      });
    
    // Verify next steps emphasize monitoring status
    cy.get('[data-testid="next-steps-list"]')
      .should('contain.text', 'Monitor');
    
    // Verify document status shows verification progress
    cy.get('[data-testid="document-status"]')
      .should('contain.text', 'Verification');
  });

  it('should display appropriate content for accepted application', () => {
    // Load fixture data for accepted application
    cy.fixture('users/authenticated-user.json').as('user');
    cy.fixture('applications/accepted-application.json').as('acceptedApplication');
    
    // Stub API routes
    cy.get('@user').then((user: User) => {
      cy.intercept('GET', '/api/v1/auth/me', {
        statusCode: 200,
        body: { success: true, data: user, message: null }
      }).as('getUser');
    });
    
    cy.get('@acceptedApplication').then((application) => {
      cy.intercept('GET', '/api/v1/applications?*', {
        statusCode: 200,
        body: { 
          success: true, 
          data: [application], 
          meta: { 
            pagination: { 
              total: 1, 
              per_page: 10, 
              current_page: 1, 
              last_page: 1,
              from: 1,
              to: 1 
            } 
          }, 
          message: null 
        }
      }).as('getApplications');
    });
    
    // Mock authenticated user
    cy.window().then((win) => {
      win.localStorage.setItem('auth_token', 'mock-jwt-token');
    });
    
    // Visit the dashboard page
    cy.visit('/dashboard');
    
    // Wait for dashboard to load completely
    cy.wait('@getUser');
    cy.wait('@getApplications');
    
    // Verify status shows as 'Accepted'
    cy.get('[data-testid="status-badge"]')
      .should('be.visible')
      .should('contain.text', 'Accepted');
    
    // Verify next steps emphasize enrollment actions
    cy.get('[data-testid="next-steps-list"]')
      .should('contain.text', 'Pay Enrollment Deposit');
    
    // Verify important dates show enrollment deadlines
    cy.get('[data-testid="important-dates"]')
      .should('contain.text', 'Enrollment Deadline');
  });
});

describe('Dashboard Notifications', () => {
  beforeEach(() => {
    setupDashboardTest();
  });

  it('should display notification badge with correct count', () => {
    cy.get('@notifications').then((notifications) => {
      // Calculate expected unread count
      const unreadCount = notifications.filter(n => !n.is_read).length;
      
      if (unreadCount > 0) {
        // Verify notification badge is visible in header
        cy.get('[data-testid="notification-badge"]')
          .should('be.visible');
        
        // Verify badge shows correct count of unread notifications
        cy.get('[data-testid="notification-badge"]')
          .should('contain.text', String(unreadCount > 99 ? '99+' : unreadCount));
      }
    });
  });

  it('should open notifications panel when clicking notification icon', () => {
    // Click notification icon in header
    cy.get('[data-testid="notification-icon"]').click();
    
    // Verify notifications panel opens
    cy.get('[data-testid="notifications-panel"]').should('be.visible');
    
    // Verify notifications list is displayed with correct items
    cy.get('[data-testid="notifications-panel"] [data-testid="notification-item"]')
      .should('have.length.at.least', 1);
  });

  it('should mark notification as read when clicked', () => {
    // Set up intercept for marking notification as read
    cy.intercept('POST', '/api/v1/notifications/*/read', {
      statusCode: 200,
      body: { success: true, data: {}, message: null }
    }).as('markAsRead');
    
    // Click notification icon to open panel
    cy.get('[data-testid="notification-icon"]').click();
    
    // Get current unread count
    let unreadCount;
    cy.get('[data-testid="notification-badge"]').then(($badge) => {
      unreadCount = parseInt($badge.text(), 10);
    });
    
    // Click on an unread notification
    cy.get('[data-testid="notifications-panel"] [data-testid="notification-item"].unread')
      .first()
      .click();
    
    // Verify notification is marked as read
    cy.wait('@markAsRead');
    
    // Verify unread count decreases
    cy.get('[data-testid="notification-badge"]').then(($badge) => {
      const newUnreadCount = parseInt($badge.text(), 10);
      expect(newUnreadCount).to.be.lessThan(unreadCount);
    });
  });
});