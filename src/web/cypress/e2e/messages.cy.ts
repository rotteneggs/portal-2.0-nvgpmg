import 'cypress';

describe('Messaging Center', () => {
  before(() => {
    // Mock authentication with test user
    cy.intercept('GET', '/api/v1/auth/me', { fixture: 'user.json' }).as('getUser');
    
    // Stub initial API routes for messages
    cy.intercept('GET', '/api/v1/messages*', { fixture: 'messages/list.json' }).as('getMessages');
  });

  beforeEach(() => {
    // Visit the messages page before each test
    cy.visit('/messages');
    cy.wait('@getMessages');
  });

  it('should display the message inbox', () => {
    // Verify the page title is displayed
    cy.get('h1').should('contain', 'Messaging Center');
    
    // Verify the compose button is displayed
    cy.get('[data-cy=compose-button]').should('be.visible');
    
    // Verify the message list is displayed
    cy.get('[data-cy=message-list]').should('be.visible');
    
    // Verify the correct number of messages are shown
    cy.get('[data-cy=message-item]').should('have.length', 3);
    
    // Verify message details are displayed correctly
    cy.get('[data-cy=message-item]').first().within(() => {
      cy.get('[data-cy=message-sender]').should('contain', 'Admissions Office');
      cy.get('[data-cy=message-subject]').should('contain', 'Transcript Review');
      cy.get('[data-cy=message-date]').should('contain', 'April 10, 2023');
      cy.get('[data-cy=message-read-status]').should('have.class', 'unread');
    });
  });

  it('should filter messages by read status', () => {
    // Mock API response for filtered messages
    cy.intercept('GET', '/api/v1/messages?unread_only=true', { 
      fixture: 'messages/unread.json' 
    }).as('getUnreadMessages');
    
    // Check the "Show unread only" checkbox
    cy.get('[data-cy=unread-filter]').click();
    cy.wait('@getUnreadMessages');
    
    // Verify only unread messages are displayed
    cy.get('[data-cy=message-item]').should('have.length', 2);
    cy.get('[data-cy=message-item]').each(($el) => {
      cy.wrap($el).find('[data-cy=message-read-status]').should('have.class', 'unread');
    });
    
    // Uncheck the filter
    cy.intercept('GET', '/api/v1/messages?unread_only=false', { 
      fixture: 'messages/list.json' 
    }).as('getAllMessages');
    
    cy.get('[data-cy=unread-filter]').click();
    cy.wait('@getAllMessages');
    
    // Verify all messages are displayed
    cy.get('[data-cy=message-item]').should('have.length', 3);
  });

  it('should search messages by content', () => {
    // Mock API response for search results
    cy.intercept('GET', '/api/v1/messages?search=transcript', { 
      fixture: 'messages/search.json' 
    }).as('searchMessages');
    
    // Enter search term
    cy.get('[data-cy=message-search]').type('transcript');
    cy.wait('@searchMessages');
    
    // Verify search results
    cy.get('[data-cy=message-item]').should('have.length', 1);
    cy.get('[data-cy=message-subject]').should('contain', 'Transcript Review');
    
    // Clear search
    cy.intercept('GET', '/api/v1/messages', { 
      fixture: 'messages/list.json' 
    }).as('resetSearch');
    
    cy.get('[data-cy=message-search]').clear();
    cy.wait('@resetSearch');
    
    // Verify all messages are displayed
    cy.get('[data-cy=message-item]').should('have.length', 3);
  });

  it('should paginate through messages', () => {
    // Mock API response for pagination
    cy.intercept('GET', '/api/v1/messages?page=1&per_page=10', { 
      fixture: 'messages/page1.json' 
    }).as('getFirstPage');
    
    cy.intercept('GET', '/api/v1/messages?page=2&per_page=10', { 
      fixture: 'messages/page2.json' 
    }).as('getSecondPage');
    
    // Navigate to next page
    cy.get('[data-cy=pagination-next]').click();
    cy.wait('@getSecondPage');
    
    // Verify page 2 messages
    cy.get('[data-cy=message-item]').first().find('[data-cy=message-subject]')
      .should('contain', 'Application Received');
    
    // Navigate back to first page
    cy.get('[data-cy=pagination-prev]').click();
    cy.wait('@getFirstPage');
    
    // Verify page 1 messages
    cy.get('[data-cy=message-item]').first().find('[data-cy=message-subject]')
      .should('contain', 'Transcript Review');
    
    // Change rows per page
    cy.intercept('GET', '/api/v1/messages?page=1&per_page=25', { 
      fixture: 'messages/per_page25.json' 
    }).as('getMoreRows');
    
    cy.get('[data-cy=rows-per-page-select]').click();
    cy.get('[data-cy=rows-per-page-option-25]').click();
    cy.wait('@getMoreRows');
    
    // Verify more messages are displayed
    cy.get('[data-cy=message-item]').should('have.length', 5);
  });

  it('should mark a message as read', () => {
    // Mock API response for mark as read
    cy.intercept('POST', '/api/v1/messages/*/read', {
      statusCode: 200,
      body: { success: true }
    }).as('markAsRead');
    
    // Click on an unread message's mark as read button
    cy.get('[data-cy=message-item]').first().within(() => {
      cy.get('[data-cy=mark-read-button]').click();
    });
    
    cy.wait('@markAsRead');
    
    // Verify message status updated
    cy.get('[data-cy=message-item]').first().find('[data-cy=message-read-status]')
      .should('have.class', 'read');
    
    // Verify success notification
    cy.get('[data-cy=notification]').should('contain', 'Message marked as read');
  });

  it('should mark a message as unread', () => {
    // Mock API response for mark as unread
    cy.intercept('POST', '/api/v1/messages/*/unread', {
      statusCode: 200,
      body: { success: true }
    }).as('markAsUnread');
    
    // Find a read message
    cy.get('[data-cy=message-item]').eq(2).within(() => {
      cy.get('[data-cy=mark-unread-button]').click();
    });
    
    cy.wait('@markAsUnread');
    
    // Verify message status updated
    cy.get('[data-cy=message-item]').eq(2).find('[data-cy=message-read-status]')
      .should('have.class', 'unread');
    
    // Verify success notification
    cy.get('[data-cy=notification]').should('contain', 'Message marked as unread');
  });

  it('should navigate to message details when clicking a message', () => {
    // Mock API response for message details
    cy.intercept('GET', '/api/v1/messages/*', { 
      fixture: 'messages/detail.json' 
    }).as('getMessageDetail');
    
    // Click on a message
    cy.get('[data-cy=message-item]').first().click();
    cy.wait('@getMessageDetail');
    
    // Verify navigation to detail page
    cy.url().should('include', '/messages/');
    
    // Verify message details displayed
    cy.get('[data-cy=message-detail-subject]').should('contain', 'Transcript Review');
    cy.get('[data-cy=message-detail-sender]').should('contain', 'Admissions Office');
    cy.get('[data-cy=message-detail-date]').should('contain', 'April 10, 2023');
    cy.get('[data-cy=message-detail-body]').should('contain', 'We have reviewed your transcript');
    
    // Verify attachments if present
    cy.get('[data-cy=message-attachments]').should('exist');
    cy.get('[data-cy=attachment-item]').should('have.length', 1);
    cy.get('[data-cy=attachment-name]').should('contain', 'transcript_requirements.pdf');
  });
});

describe('Message Composition', () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept('GET', '/api/v1/auth/me', { fixture: 'user.json' }).as('getUser');
    
    // Visit compose page
    cy.visit('/messages/compose');
  });

  it('should navigate to compose message page', () => {
    // Verify compose form elements are present
    cy.get('[data-cy=compose-form]').should('be.visible');
    cy.get('[data-cy=recipient-field]').should('be.visible');
    cy.get('[data-cy=subject-field]').should('be.visible');
    cy.get('[data-cy=message-body-field]').should('be.visible');
    cy.get('[data-cy=attachment-upload]').should('be.visible');
    cy.get('[data-cy=send-button]').should('be.visible');
  });

  it('should validate required fields when composing a message', () => {
    // Try to submit without entering any data
    cy.get('[data-cy=send-button]').click();
    
    // Verify validation errors
    cy.get('[data-cy=recipient-error]').should('be.visible')
      .and('contain', 'Recipient is required');
    cy.get('[data-cy=subject-error]').should('be.visible')
      .and('contain', 'Subject is required');
    cy.get('[data-cy=message-body-error]').should('be.visible')
      .and('contain', 'Message body is required');
    
    // Fill recipient field
    cy.get('[data-cy=recipient-field]').type('Admissions Office');
    cy.get('[data-cy=recipient-error]').should('not.exist');
    
    // Fill subject field
    cy.get('[data-cy=subject-field]').type('Question about my application');
    cy.get('[data-cy=subject-error]').should('not.exist');
    
    // Fill message body
    cy.get('[data-cy=message-body-field]').type('I have a question regarding my recent application submission.');
    cy.get('[data-cy=message-body-error]').should('not.exist');
    
    // Verify send button is enabled
    cy.get('[data-cy=send-button]').should('be.enabled');
  });

  it('should attach files to a message', () => {
    // Setup file upload mock
    cy.fixture('sample-file.pdf', 'base64').then(fileContent => {
      cy.get('[data-cy=attachment-upload]').attachFile({
        fileContent,
        fileName: 'sample-file.pdf',
        mimeType: 'application/pdf'
      });
    });
    
    // Verify file is displayed in attachments list
    cy.get('[data-cy=attachment-list]').should('be.visible');
    cy.get('[data-cy=attachment-item]').should('have.length', 1);
    cy.get('[data-cy=attachment-name]').should('contain', 'sample-file.pdf');
    cy.get('[data-cy=attachment-size]').should('contain', 'KB');
    
    // Verify remove button works
    cy.get('[data-cy=remove-attachment]').click();
    cy.get('[data-cy=attachment-item]').should('not.exist');
  });

  it('should send a message successfully', () => {
    // Mock API response for sending message
    cy.intercept('POST', '/api/v1/messages', {
      statusCode: 201,
      body: {
        success: true,
        data: { id: 123 }
      }
    }).as('sendMessage');
    
    // Fill out the compose form
    cy.get('[data-cy=recipient-field]').type('Admissions Office');
    cy.get('[data-cy=subject-field]').type('Question about my application');
    cy.get('[data-cy=message-body-field]').type('I have a question regarding my recent application submission.');
    
    // Submit the form
    cy.get('[data-cy=send-button]').click();
    
    // Verify API call with correct data
    cy.wait('@sendMessage').its('request.body').should('deep.include', {
      recipient_id: '1', // Assuming ID is part of the selection
      subject: 'Question about my application',
      message_body: 'I have a question regarding my recent application submission.'
    });
    
    // Verify success notification
    cy.get('[data-cy=notification]').should('contain', 'Message sent successfully');
    
    // Verify redirection to inbox
    cy.url().should('include', '/messages');
  });
});

describe('Message Replies', () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept('GET', '/api/v1/auth/me', { fixture: 'user.json' }).as('getUser');
    
    // Mock message details
    cy.intercept('GET', '/api/v1/messages/1', { 
      fixture: 'messages/detail.json' 
    }).as('getMessageDetail');
    
    // Visit message detail page
    cy.visit('/messages/1');
    cy.wait('@getMessageDetail');
  });

  it('should reply to a message', () => {
    // Mock API response for sending reply
    cy.intercept('POST', '/api/v1/messages/1/replies', {
      statusCode: 201,
      body: {
        success: true,
        data: { id: 124 }
      }
    }).as('sendReply');
    
    // Click reply button
    cy.get('[data-cy=reply-button]').click();
    
    // Verify reply form is displayed
    cy.get('[data-cy=reply-form]').should('be.visible');
    
    // Verify recipient is pre-filled and disabled
    cy.get('[data-cy=recipient-field]')
      .should('have.value', 'Admissions Office')
      .and('be.disabled');
    
    // Verify subject is pre-filled with RE: prefix and disabled
    cy.get('[data-cy=subject-field]')
      .should('have.value', 'RE: Transcript Review')
      .and('be.disabled');
    
    // Enter reply message
    cy.get('[data-cy=message-body-field]').type('Thank you for the information. I will provide the requested syllabus.');
    
    // Submit reply
    cy.get('[data-cy=send-button]').click();
    
    // Verify API call with correct data
    cy.wait('@sendReply').its('request.body').should('deep.include', {
      message_body: 'Thank you for the information. I will provide the requested syllabus.'
    });
    
    // Verify success notification
    cy.get('[data-cy=notification]').should('contain', 'Reply sent successfully');
    
    // Verify updated conversation thread
    cy.get('[data-cy=message-thread]').should('be.visible');
    cy.get('[data-cy=message-thread-item]').should('have.length.at.least', 2);
    cy.get('[data-cy=message-thread-item]').last().within(() => {
      cy.get('[data-cy=message-body]').should('contain', 'Thank you for the information');
      cy.get('[data-cy=message-sender]').should('contain', 'You');
    });
  });
});

describe('Application-Specific Messages', () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept('GET', '/api/v1/auth/me', { fixture: 'user.json' }).as('getUser');
    
    // Mock application-specific messages
    cy.intercept('GET', '/api/v1/messages?application_id=123', { 
      fixture: 'messages/application.json' 
    }).as('getApplicationMessages');
  });

  it('should view application-specific messages', () => {
    // Visit application-specific message page
    cy.visit('/messages?application_id=123');
    cy.wait('@getApplicationMessages');
    
    // Verify application context is displayed
    cy.get('[data-cy=application-context]').should('be.visible')
      .and('contain', 'Undergraduate Fall 2023');
    
    // Verify messages related to the application are displayed
    cy.get('[data-cy=message-item]').should('have.length', 2);
    cy.get('[data-cy=message-item]').each(($el) => {
      cy.wrap($el).find('[data-cy=application-badge]').should('be.visible');
    });
    
    // Verify compose button includes application context
    cy.get('[data-cy=compose-button]').click();
    cy.url().should('include', '/messages/compose')
      .and('include', 'application_id=123');
  });

  it('should send a message in application context', () => {
    // Mock application data
    cy.intercept('GET', '/api/v1/applications/123', { 
      fixture: 'applications/detail.json' 
    }).as('getApplicationDetail');
    
    // Mock sending message
    cy.intercept('POST', '/api/v1/messages', {
      statusCode: 201,
      body: {
        success: true,
        data: { id: 125 }
      }
    }).as('sendMessage');
    
    // Visit compose page with application context
    cy.visit('/messages/compose?application_id=123');
    cy.wait('@getApplicationDetail');
    
    // Verify application context is displayed
    cy.get('[data-cy=application-context]').should('be.visible')
      .and('contain', 'Undergraduate Fall 2023');
    
    // Verify recipient is pre-selected based on application type
    cy.get('[data-cy=recipient-field]')
      .should('have.value', 'Undergraduate Admissions');
    
    // Fill out form
    cy.get('[data-cy=subject-field]').type('Question about my undergraduate application');
    cy.get('[data-cy=message-body-field]').type('I have a question about the requirements for my application.');
    
    // Submit form
    cy.get('[data-cy=send-button]').click();
    
    // Verify API call includes application_id
    cy.wait('@sendMessage').its('request.body').should('deep.include', {
      recipient_id: '2', // Assuming ID for Undergraduate Admissions
      subject: 'Question about my undergraduate application',
      message_body: 'I have a question about the requirements for my application.',
      application_id: '123'
    });
    
    // Verify redirect to application-specific inbox
    cy.url().should('include', '/messages')
      .and('include', 'application_id=123');
  });
});