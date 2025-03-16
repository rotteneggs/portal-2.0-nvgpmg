import { Document, DocumentType } from '../../src/types/document';

// Helper function to set up document tests with authentication
function setupDocumentsTest() {
  // Stub authentication
  cy.intercept('GET', '/api/v1/auth/me', { 
    fixture: 'user.json' 
  }).as('getUser');
  
  // Stub document list
  cy.intercept('GET', '/api/v1/documents*', { 
    fixture: 'documents.json' 
  }).as('getDocuments');
  
  // Visit documents page
  cy.visit('/documents');
  
  // Wait for page to load
  cy.wait('@getUser');
  cy.wait('@getDocuments');
  
  // Verify we're on the documents page
  cy.get('[data-testid="document-library"]').should('be.visible');
}

// Helper function to set up document upload test
function setupDocumentUploadTest() {
  // Stub authentication
  cy.intercept('GET', '/api/v1/auth/me', { 
    fixture: 'user.json' 
  }).as('getUser');
  
  // Stub document types
  cy.intercept('GET', '/api/v1/documents/types', { 
    fixture: 'document-types.json' 
  }).as('getDocumentTypes');
  
  // Visit upload page
  cy.visit('/documents/upload');
  
  // Wait for page to load
  cy.wait('@getUser');
  cy.wait('@getDocumentTypes');
  
  // Verify we're on the upload page
  cy.get('[data-testid="document-upload-form"]').should('be.visible');
}

// Helper function to set up document view test
function setupDocumentViewTest(documentId: number) {
  // Stub authentication
  cy.intercept('GET', '/api/v1/auth/me', { 
    fixture: 'user.json' 
  }).as('getUser');
  
  // Stub document get
  cy.intercept('GET', `/api/v1/documents/${documentId}`, { 
    fixture: 'document.json' 
  }).as('getDocument');
  
  // Visit document view page
  cy.visit(`/documents/${documentId}`);
  
  // Wait for page to load
  cy.wait('@getUser');
  cy.wait('@getDocument');
  
  // Verify document viewer is visible
  cy.get('[data-testid="document-viewer"]').should('be.visible');
}

// Helper function to stub document list
function stubDocumentList(filters = {}) {
  cy.fixture('documents.json').then((documents) => {
    // Apply filters if needed
    let filteredDocuments = documents;
    
    // Stub the API call
    cy.intercept('GET', '/api/v1/documents*', {
      statusCode: 200,
      body: {
        success: true,
        data: filteredDocuments,
        meta: {
          pagination: {
            total: filteredDocuments.length,
            per_page: 10,
            current_page: 1,
            last_page: Math.ceil(filteredDocuments.length / 10)
          }
        }
      }
    }).as('getDocuments');
  });
}

// Helper function to stub document upload
function stubDocumentUpload(success = true, errorMessage = '') {
  if (success) {
    cy.intercept('POST', '/api/v1/documents/upload', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 999,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/999/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf'
        },
        message: 'Document uploaded successfully'
      }
    }).as('uploadDocument');
  } else {
    cy.intercept('POST', '/api/v1/documents/upload', {
      statusCode: 422,
      body: {
        success: false,
        error: {
          message: errorMessage || 'Failed to upload document',
          details: {}
        }
      }
    }).as('uploadDocumentError');
  }
}

// Helper function to stub document types
function stubDocumentTypes() {
  cy.intercept('GET', '/api/v1/documents/types', {
    statusCode: 200,
    body: {
      success: true,
      data: [
        {
          type: 'transcript',
          label: 'Transcript',
          description: 'Academic transcript from your previous institution',
          allowed_formats: ['pdf'],
          max_size: 10485760, // 10MB
          required: true
        },
        {
          type: 'identification',
          label: 'Identification',
          description: 'Government-issued identification',
          allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
          max_size: 5242880, // 5MB
          required: true
        },
        {
          type: 'personal_statement',
          label: 'Personal Statement',
          description: 'Your personal statement essay',
          allowed_formats: ['pdf', 'doc', 'docx'],
          max_size: 5242880, // 5MB
          required: true
        }
      ]
    }
  }).as('getDocumentTypes');
}

describe('Document Library', () => {
  beforeEach(() => {
    stubDocumentList();
  });

  it('should display document library with all required elements', () => {
    setupDocumentsTest();
    cy.get('[data-testid="document-library"]').should('be.visible');
    cy.get('[data-testid="document-type-filter"]').should('be.visible');
    cy.get('[data-testid="document-search"]').should('be.visible');
    cy.get('[data-testid="view-toggle"]').should('be.visible');
    cy.get('[data-testid="upload-document-button"]').should('be.visible');
  });

  it('should display documents in table view by default', () => {
    setupDocumentsTest();
    cy.get('[data-testid="document-table"]').should('be.visible');
    cy.get('[data-testid="document-table"] thead th').should('contain', 'Type');
    cy.get('[data-testid="document-table"] thead th').should('contain', 'File Name');
    cy.get('[data-testid="document-table"] thead th').should('contain', 'Size');
    cy.get('[data-testid="document-table"] thead th').should('contain', 'Status');
    cy.get('[data-testid="document-table"] thead th').should('contain', 'Uploaded');
    cy.get('[data-testid="document-table"] thead th').should('contain', 'Actions');
    cy.get('[data-testid="document-table"] tbody tr').should('have.length.at.least', 1);
  });

  it('should switch between table and grid views', () => {
    setupDocumentsTest();
    // Check default table view
    cy.get('[data-testid="document-table"]').should('be.visible');
    cy.get('[data-testid="document-grid"]').should('not.exist');
    
    // Switch to grid view
    cy.get('[data-testid="view-toggle-grid"]').click();
    cy.get('[data-testid="document-table"]').should('not.exist');
    cy.get('[data-testid="document-grid"]').should('be.visible');
    
    // Switch back to table view
    cy.get('[data-testid="view-toggle-table"]').click();
    cy.get('[data-testid="document-grid"]').should('not.exist');
    cy.get('[data-testid="document-table"]').should('be.visible');
  });

  it('should filter documents by document type', () => {
    setupDocumentsTest();
    // Stub filtered response
    cy.intercept('GET', '/api/v1/documents?document_type=transcript*', {
      fixture: 'documents-transcript.json'
    }).as('getFilteredDocuments');
    
    // Select transcript filter
    cy.get('[data-testid="document-type-filter"]').click();
    cy.get('[data-testid="document-type-option-transcript"]').click();
    
    // Wait for filtered results
    cy.wait('@getFilteredDocuments');
    
    // Verify only transcript documents are shown
    cy.get('[data-testid="document-table"] tbody tr').each(($row) => {
      cy.wrap($row).find('[data-testid="document-type"]').should('contain', 'Transcript');
    });
    
    // Reset filter
    cy.get('[data-testid="document-type-filter"]').click();
    cy.get('[data-testid="document-type-option-all"]').click();
    cy.wait('@getDocuments');
  });

  it('should search documents by file name', () => {
    setupDocumentsTest();
    // Stub search response
    cy.intercept('GET', '/api/v1/documents?search=transcript*', {
      fixture: 'documents-search.json'
    }).as('getSearchResults');
    
    // Enter search term
    cy.get('[data-testid="document-search"]').type('transcript');
    cy.get('[data-testid="document-search-button"]').click();
    
    // Wait for search results
    cy.wait('@getSearchResults');
    
    // Verify search results
    cy.get('[data-testid="document-table"] tbody tr').should('have.length.at.least', 1);
    
    // Clear search
    cy.get('[data-testid="document-search-clear"]').click();
    cy.wait('@getDocuments');
  });

  it('should sort documents by different columns', () => {
    setupDocumentsTest();
    // Stub sorted responses
    cy.intercept('GET', '/api/v1/documents?sort_by=file_name&sort_direction=asc*', {
      fixture: 'documents-sorted-name-asc.json'
    }).as('getSortedNameAsc');
    
    cy.intercept('GET', '/api/v1/documents?sort_by=file_name&sort_direction=desc*', {
      fixture: 'documents-sorted-name-desc.json'
    }).as('getSortedNameDesc');
    
    // Sort by file name ascending
    cy.get('[data-testid="sort-file_name"]').click();
    cy.wait('@getSortedNameAsc');
    
    // Sort by file name descending
    cy.get('[data-testid="sort-file_name"]').click();
    cy.wait('@getSortedNameDesc');
  });

  it('should paginate through documents', () => {
    // Stub paginated responses
    cy.intercept('GET', '/api/v1/documents?page=1&per_page=10*', {
      body: {
        success: true,
        data: Array(10).fill(null).map((_, i) => ({
          id: i + 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: `document-${i + 1}.pdf`,
          file_path: `/documents/document-${i + 1}.pdf`,
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: `/api/v1/documents/${i + 1}/download`,
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf'
        })),
        meta: {
          pagination: {
            total: 25,
            per_page: 10,
            current_page: 1,
            last_page: 3
          }
        }
      }
    }).as('getPage1');
    
    cy.intercept('GET', '/api/v1/documents?page=2&per_page=10*', {
      body: {
        success: true,
        data: Array(10).fill(null).map((_, i) => ({
          id: i + 11,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: `document-${i + 11}.pdf`,
          file_path: `/documents/document-${i + 11}.pdf`,
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: `/api/v1/documents/${i + 11}/download`,
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf'
        })),
        meta: {
          pagination: {
            total: 25,
            per_page: 10,
            current_page: 2,
            last_page: 3
          }
        }
      }
    }).as('getPage2');
    
    setupDocumentsTest();
    
    // Verify first page
    cy.get('[data-testid="pagination"]').should('be.visible');
    cy.get('[data-testid="document-table"] tbody tr').should('have.length', 10);
    
    // Go to page 2
    cy.get('[data-testid="pagination-next"]').click();
    cy.wait('@getPage2');
    
    // Verify page 2
    cy.get('[data-testid="document-table"] tbody tr').first().find('[data-testid="document-name"]').should('contain', 'document-11.pdf');
    
    // Go back to page 1
    cy.get('[data-testid="pagination-prev"]').click();
    cy.wait('@getPage1');
    
    // Verify back on page 1
    cy.get('[data-testid="document-table"] tbody tr').first().find('[data-testid="document-name"]').should('contain', 'document-1.pdf');
  });

  it('should navigate to document upload page when clicking upload button', () => {
    setupDocumentsTest();
    cy.get('[data-testid="upload-document-button"]').click();
    cy.url().should('include', '/documents/upload');
    cy.get('[data-testid="document-upload-form"]').should('be.visible');
  });

  it('should navigate to document view page when clicking on a document', () => {
    setupDocumentsTest();
    // Stub document view
    cy.intercept('GET', '/api/v1/documents/1', {
      fixture: 'document-detail.json'
    }).as('getDocumentDetail');
    
    // Click on first document
    cy.get('[data-testid="document-row"]').first().click();
    
    // Verify navigation
    cy.url().should('include', '/documents/1');
    cy.wait('@getDocumentDetail');
    cy.get('[data-testid="document-viewer"]').should('be.visible');
  });

  it('should display verification status correctly', () => {
    setupDocumentsTest();
    // Verify status badges
    cy.get('[data-testid="status-verified"]').should('have.class', 'bg-success');
    cy.get('[data-testid="status-pending"]').should('have.class', 'bg-warning');
    cy.get('[data-testid="status-rejected"]').should('have.class', 'bg-danger');
  });

  it('should display empty state when no documents are available', () => {
    // Stub empty documents response
    cy.intercept('GET', '/api/v1/documents*', {
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
    }).as('getEmptyDocuments');
    
    cy.visit('/documents');
    cy.wait('@getEmptyDocuments');
    
    // Verify empty state
    cy.get('[data-testid="empty-state"]').should('be.visible');
    cy.get('[data-testid="empty-state"]').should('contain', 'No documents found');
    cy.get('[data-testid="upload-document-button"]').should('be.visible');
  });
});

describe('Document Upload', () => {
  beforeEach(() => {
    stubDocumentTypes();
  });

  it('should display document upload form with all required elements', () => {
    setupDocumentUploadTest();
    cy.get('[data-testid="document-type-select"]').should('be.visible');
    cy.get('[data-testid="document-upload-dropzone"]').should('be.visible');
    cy.get('[data-testid="upload-button"]').should('be.visible');
    cy.get('[data-testid="cancel-button"]').should('be.visible');
  });

  it('should show validation error when no document type is selected', () => {
    setupDocumentUploadTest();
    
    // Attach file without selecting document type
    cy.get('[data-testid="document-upload-dropzone"]').attachFile('test-document.pdf');
    cy.get('[data-testid="upload-button"]').click();
    
    // Verify validation error
    cy.get('[data-testid="document-type-error"]').should('be.visible');
    cy.get('[data-testid="document-type-error"]').should('contain', 'Document type is required');
  });

  it('should show validation error when no file is selected', () => {
    setupDocumentUploadTest();
    
    // Select document type without attaching file
    cy.get('[data-testid="document-type-select"]').click();
    cy.get('[data-testid="document-type-option-transcript"]').click();
    cy.get('[data-testid="upload-button"]').click();
    
    // Verify validation error
    cy.get('[data-testid="file-error"]').should('be.visible');
    cy.get('[data-testid="file-error"]').should('contain', 'Please select a file to upload');
  });

  it('should show validation error for unsupported file type', () => {
    setupDocumentUploadTest();
    
    // Select document type
    cy.get('[data-testid="document-type-select"]').click();
    cy.get('[data-testid="document-type-option-transcript"]').click();
    
    // Attach unsupported file
    cy.get('[data-testid="document-upload-dropzone"]').attachFile({
      fileContent: 'test file content',
      fileName: 'test-document.exe',
      mimeType: 'application/octet-stream'
    });
    
    // Verify validation error
    cy.get('[data-testid="file-type-error"]').should('be.visible');
    cy.get('[data-testid="file-type-error"]').should('contain', 'File type not supported');
  });

  it('should show validation error for file exceeding size limit', () => {
    setupDocumentUploadTest();
    
    // Create oversized file mock
    const largeFile = Cypress.Buffer.from('a'.repeat(11 * 1024 * 1024)); // 11MB
    
    // Select document type
    cy.get('[data-testid="document-type-select"]').click();
    cy.get('[data-testid="document-type-option-transcript"]').click();
    
    // Attach oversized file
    cy.get('[data-testid="document-upload-dropzone"]').attachFile({
      fileContent: largeFile,
      fileName: 'large-document.pdf',
      mimeType: 'application/pdf',
      lastModified: new Date().getTime()
    });
    
    // Verify validation error
    cy.get('[data-testid="file-size-error"]').should('be.visible');
    cy.get('[data-testid="file-size-error"]').should('contain', 'File size exceeds the maximum limit');
  });

  it('should successfully upload a valid document', () => {
    setupDocumentUploadTest();
    stubDocumentUpload(true);
    
    // Select document type
    cy.get('[data-testid="document-type-select"]').click();
    cy.get('[data-testid="document-type-option-transcript"]').click();
    
    // Attach valid file
    cy.get('[data-testid="document-upload-dropzone"]').attachFile('test-document.pdf');
    
    // Submit upload
    cy.get('[data-testid="upload-button"]').click();
    
    // Verify upload progress
    cy.get('[data-testid="upload-progress"]').should('be.visible');
    
    // Wait for upload to complete
    cy.wait('@uploadDocument');
    
    // Verify success message
    cy.get('[data-testid="success-alert"]').should('be.visible');
    cy.get('[data-testid="success-alert"]').should('contain', 'Document uploaded successfully');
    
    // Verify redirection
    cy.url().should('include', '/documents');
  });

  it('should handle upload errors gracefully', () => {
    setupDocumentUploadTest();
    stubDocumentUpload(false, 'Invalid document format');
    
    // Select document type
    cy.get('[data-testid="document-type-select"]').click();
    cy.get('[data-testid="document-type-option-transcript"]').click();
    
    // Attach file
    cy.get('[data-testid="document-upload-dropzone"]').attachFile('test-document.pdf');
    
    // Submit upload
    cy.get('[data-testid="upload-button"]').click();
    
    // Wait for upload to fail
    cy.wait('@uploadDocumentError');
    
    // Verify error message
    cy.get('[data-testid="error-alert"]').should('be.visible');
    cy.get('[data-testid="error-alert"]').should('contain', 'Invalid document format');
    
    // Verify form is still available
    cy.get('[data-testid="upload-button"]').should('be.visible');
  });

  it('should cancel upload and return to documents page', () => {
    setupDocumentUploadTest();
    
    // Click cancel button
    cy.get('[data-testid="cancel-button"]').click();
    
    // Verify redirection to documents page
    cy.url().should('include', '/documents');
    cy.url().should('not.include', '/upload');
  });

  it('should display different file requirements based on document type', () => {
    setupDocumentUploadTest();
    
    // Select transcript
    cy.get('[data-testid="document-type-select"]').click();
    cy.get('[data-testid="document-type-option-transcript"]').click();
    
    // Verify transcript requirements
    cy.get('[data-testid="document-requirements"]').should('contain', 'PDF');
    
    // Select identification
    cy.get('[data-testid="document-type-select"]').click();
    cy.get('[data-testid="document-type-option-identification"]').click();
    
    // Verify identification requirements
    cy.get('[data-testid="document-requirements"]').should('contain', 'JPEG');
    cy.get('[data-testid="document-requirements"]').should('contain', 'PNG');
  });

  it('should support drag and drop file upload', () => {
    setupDocumentUploadTest();
    stubDocumentUpload(true);
    
    // Select document type
    cy.get('[data-testid="document-type-select"]').click();
    cy.get('[data-testid="document-type-option-transcript"]').click();
    
    // Simulate drag and drop
    cy.get('[data-testid="document-upload-dropzone"]').attachFile('test-document.pdf', { 
      subjectType: 'drag-n-drop' 
    });
    
    // Verify file is accepted
    cy.get('[data-testid="selected-file"]').should('be.visible');
    cy.get('[data-testid="selected-file"]').should('contain', 'test-document.pdf');
    
    // Submit upload
    cy.get('[data-testid="upload-button"]').click();
    
    // Wait for upload to complete
    cy.wait('@uploadDocument');
    
    // Verify success
    cy.get('[data-testid="success-alert"]').should('be.visible');
  });
});

describe('Document Viewing', () => {
  it('should display document viewer with all required elements', () => {
    setupDocumentViewTest(1);
    cy.get('[data-testid="document-preview"]').should('be.visible');
    cy.get('[data-testid="document-metadata"]').should('be.visible');
    cy.get('[data-testid="document-actions"]').should('be.visible');
    cy.get('[data-testid="verification-status"]').should('be.visible');
  });

  it('should display PDF documents in PDF viewer', () => {
    cy.intercept('GET', '/api/v1/documents/1', {
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf'
        }
      }
    }).as('getPdfDocument');
    
    setupDocumentViewTest(1);
    
    cy.get('[data-testid="pdf-viewer"]').should('be.visible');
    cy.get('[data-testid="pdf-controls"]').should('be.visible');
  });

  it('should display image documents in image viewer', () => {
    cy.intercept('GET', '/api/v1/documents/2', {
      body: {
        success: true,
        data: {
          id: 2,
          user_id: 1,
          application_id: 1,
          document_type: 'identification',
          file_name: 'test-image.jpg',
          file_path: '/documents/test-image.jpg',
          mime_type: 'image/jpeg',
          file_size: 512,
          file_size_formatted: '512 B',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/2/download',
          is_image: true,
          is_pdf: false,
          file_extension: 'jpg'
        }
      }
    }).as('getImageDocument');
    
    setupDocumentViewTest(2);
    
    cy.get('[data-testid="image-viewer"]').should('be.visible');
    cy.get('[data-testid="image-controls"]').should('be.visible');
  });

  it('should download document when clicking download button', () => {
    setupDocumentViewTest(1);
    
    // Stub download API
    cy.intercept('GET', '/api/v1/documents/1/download', {
      body: 'test file content',
      headers: {
        'content-disposition': 'attachment; filename="test-document.pdf"'
      }
    }).as('downloadDocument');
    
    // Click download button
    cy.get('[data-testid="download-button"]').click();
    
    // Verify download API call
    cy.wait('@downloadDocument');
  });

  it('should delete document when clicking delete button', () => {
    setupDocumentViewTest(1);
    
    // Stub delete API
    cy.intercept('DELETE', '/api/v1/documents/1', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Document deleted successfully'
      }
    }).as('deleteDocument');
    
    // Click delete button
    cy.get('[data-testid="delete-button"]').click();
    
    // Confirm deletion
    cy.get('[data-testid="confirm-delete"]').click();
    
    // Verify delete API call
    cy.wait('@deleteDocument');
    
    // Verify success message
    cy.get('[data-testid="success-alert"]').should('be.visible');
    cy.get('[data-testid="success-alert"]').should('contain', 'Document deleted successfully');
    
    // Verify redirection
    cy.url().should('include', '/documents');
  });

  it('should cancel document deletion', () => {
    setupDocumentViewTest(1);
    
    // Stub delete API to confirm it's not called
    cy.intercept('DELETE', '/api/v1/documents/1', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Document deleted successfully'
      }
    }).as('deleteDocument');
    
    // Click delete button
    cy.get('[data-testid="delete-button"]').click();
    
    // Cancel deletion
    cy.get('[data-testid="cancel-delete"]').click();
    
    // Verify delete API was not called
    cy.get('@deleteDocument.all').should('have.length', 0);
    
    // Verify document view is still displayed
    cy.get('[data-testid="document-preview"]').should('be.visible');
  });

  it('should display verification details for verified documents', () => {
    cy.intercept('GET', '/api/v1/documents/1', {
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: true,
          verified_at: '2023-07-15T10:30:00Z',
          verified_by_user_id: 999,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf',
          verification: {
            verification_method: 'manual',
            verification_status: 'verified',
            notes: 'Document looks valid',
            verified_by_user_id: 999,
            verifier: {
              name: 'Admin User'
            }
          }
        }
      }
    }).as('getVerifiedDocument');
    
    setupDocumentViewTest(1);
    
    cy.get('[data-testid="verification-status"]').should('contain', 'Verified');
    cy.get('[data-testid="verification-date"]').should('be.visible');
    cy.get('[data-testid="verification-method"]').should('contain', 'Manual');
    cy.get('[data-testid="verification-details"]').should('contain', 'Document looks valid');
  });

  it('should display AI analysis results for AI-verified documents', () => {
    cy.intercept('GET', '/api/v1/documents/1', {
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: true,
          verified_at: '2023-07-15T10:30:00Z',
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf',
          verification: {
            verification_method: 'ai',
            verification_status: 'verified',
            confidence_score: 0.95,
            confidence_percentage: 95,
            verification_data: {
              extracted_data: {
                institution: 'Test University',
                student_name: 'John Smith',
                graduation_date: '2022-05-15'
              },
              authenticity_check: {
                passed: true,
                score: 0.98
              }
            }
          }
        }
      }
    }).as('getAIVerifiedDocument');
    
    setupDocumentViewTest(1);
    
    cy.get('[data-testid="ai-analysis"]').should('be.visible');
    cy.get('[data-testid="confidence-score"]').should('contain', '95%');
    cy.get('[data-testid="extracted-data"]').should('contain', 'Test University');
    cy.get('[data-testid="authenticity-check"]').should('contain', 'Passed');
  });

  it('should navigate back to documents page', () => {
    setupDocumentViewTest(1);
    
    // Click back button
    cy.get('[data-testid="back-button"]').click();
    
    // Verify redirect to documents page
    cy.url().should('include', '/documents');
    cy.url().should('not.include', '/documents/1');
  });
});

describe('Document Verification (Admin)', () => {
  it('should display verification interface for admins', () => {
    // Stub admin user
    cy.intercept('GET', '/api/v1/auth/me', {
      body: {
        id: 999,
        name: 'Admin User',
        email: 'admin@example.com',
        roles: ['admin']
      }
    }).as('getAdminUser');
    
    // Stub unverified document
    cy.intercept('GET', '/api/v1/documents/1', {
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf'
        }
      }
    }).as('getUnverifiedDocument');
    
    cy.visit('/documents/1');
    cy.wait('@getAdminUser');
    cy.wait('@getUnverifiedDocument');
    
    // Verify admin controls are visible
    cy.get('[data-testid="verification-controls"]').should('be.visible');
    cy.get('[data-testid="verify-button"]').should('be.visible');
    cy.get('[data-testid="reject-button"]').should('be.visible');
  });

  it('should verify a document', () => {
    // Stub admin user
    cy.intercept('GET', '/api/v1/auth/me', {
      body: {
        id: 999,
        name: 'Admin User',
        email: 'admin@example.com',
        roles: ['admin']
      }
    }).as('getAdminUser');
    
    // Stub unverified document
    cy.intercept('GET', '/api/v1/documents/1', {
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf'
        }
      }
    }).as('getUnverifiedDocument');
    
    // Stub verification API
    cy.intercept('POST', '/api/v1/documents/1/verify', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: true,
          verified_at: '2023-07-15T10:30:00Z',
          verified_by_user_id: 999,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf',
          verification: {
            verification_method: 'manual',
            verification_status: 'verified',
            notes: 'Document verified by admin'
          }
        },
        message: 'Document verified successfully'
      }
    }).as('verifyDocument');
    
    cy.visit('/documents/1');
    cy.wait('@getAdminUser');
    cy.wait('@getUnverifiedDocument');
    
    // Click verify button
    cy.get('[data-testid="verify-button"]').click();
    
    // Enter verification notes
    cy.get('[data-testid="verification-notes"]').type('Document verified by admin');
    
    // Confirm verification
    cy.get('[data-testid="confirm-verify"]').click();
    
    // Verify API call
    cy.wait('@verifyDocument');
    
    // Verify success message
    cy.get('[data-testid="success-alert"]').should('be.visible');
    cy.get('[data-testid="success-alert"]').should('contain', 'Document verified successfully');
    
    // Verify status update
    cy.get('[data-testid="verification-status"]').should('contain', 'Verified');
  });

  it('should reject a document', () => {
    // Stub admin user
    cy.intercept('GET', '/api/v1/auth/me', {
      body: {
        id: 999,
        name: 'Admin User',
        email: 'admin@example.com',
        roles: ['admin']
      }
    }).as('getAdminUser');
    
    // Stub unverified document
    cy.intercept('GET', '/api/v1/documents/1', {
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf'
        }
      }
    }).as('getUnverifiedDocument');
    
    // Stub rejection API
    cy.intercept('POST', '/api/v1/documents/1/reject', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: 999,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf',
          verification: {
            verification_method: 'manual',
            verification_status: 'rejected',
            notes: 'Document appears to be altered'
          }
        },
        message: 'Document rejected successfully'
      }
    }).as('rejectDocument');
    
    cy.visit('/documents/1');
    cy.wait('@getAdminUser');
    cy.wait('@getUnverifiedDocument');
    
    // Click reject button
    cy.get('[data-testid="reject-button"]').click();
    
    // Enter rejection reason
    cy.get('[data-testid="rejection-reason"]').type('Document appears to be altered');
    
    // Confirm rejection
    cy.get('[data-testid="confirm-reject"]').click();
    
    // Verify API call
    cy.wait('@rejectDocument');
    
    // Verify success message
    cy.get('[data-testid="success-alert"]').should('be.visible');
    cy.get('[data-testid="success-alert"]').should('contain', 'Document rejected successfully');
    
    // Verify status update
    cy.get('[data-testid="verification-status"]').should('contain', 'Rejected');
  });

  it('should not display verification controls for non-admin users', () => {
    // Stub regular user
    cy.intercept('GET', '/api/v1/auth/me', {
      body: {
        id: 123,
        name: 'Regular User',
        email: 'user@example.com',
        roles: ['student']
      }
    }).as('getRegularUser');
    
    // Stub unverified document
    cy.intercept('GET', '/api/v1/documents/1', {
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: false,
          verified_at: null,
          verified_by_user_id: null,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf'
        }
      }
    }).as('getUnverifiedDocument');
    
    cy.visit('/documents/1');
    cy.wait('@getRegularUser');
    cy.wait('@getUnverifiedDocument');
    
    // Verify admin controls are not visible
    cy.get('[data-testid="verification-controls"]').should('not.exist');
    cy.get('[data-testid="verify-button"]').should('not.exist');
    cy.get('[data-testid="reject-button"]').should('not.exist');
  });

  it('should display verification history', () => {
    // Stub admin user
    cy.intercept('GET', '/api/v1/auth/me', {
      body: {
        id: 999,
        name: 'Admin User',
        email: 'admin@example.com',
        roles: ['admin']
      }
    }).as('getAdminUser');
    
    // Stub document with verification history
    cy.intercept('GET', '/api/v1/documents/1', {
      body: {
        success: true,
        data: {
          id: 1,
          user_id: 1,
          application_id: 1,
          document_type: 'transcript',
          file_name: 'test-document.pdf',
          file_path: '/documents/test-document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_size_formatted: '1 KB',
          is_verified: true,
          verified_at: '2023-07-15T10:30:00Z',
          verified_by_user_id: 999,
          created_at: '2023-07-15T10:30:00Z',
          updated_at: '2023-07-15T10:30:00Z',
          download_url: '/api/v1/documents/1/download',
          is_image: false,
          is_pdf: true,
          file_extension: 'pdf',
          verification_history: [
            {
              id: 101,
              document_id: 1,
              verification_method: 'ai',
              verification_status: 'pending',
              verification_data: null,
              confidence_score: null,
              confidence_percentage: null,
              notes: null,
              verified_by_user_id: null,
              created_at: '2023-07-14T09:00:00Z'
            },
            {
              id: 102,
              document_id: 1,
              verification_method: 'manual',
              verification_status: 'verified',
              verification_data: null,
              confidence_score: null,
              confidence_percentage: null,
              notes: 'Document verified after review',
              verified_by_user_id: 999,
              verifier: {
                name: 'Admin User'
              },
              created_at: '2023-07-15T10:30:00Z'
            }
          ]
        }
      }
    }).as('getDocumentWithHistory');
    
    cy.visit('/documents/1');
    cy.wait('@getAdminUser');
    cy.wait('@getDocumentWithHistory');
    
    // Click to view verification history
    cy.get('[data-testid="view-history-button"]').click();
    
    // Verify history modal is displayed
    cy.get('[data-testid="verification-history-modal"]').should('be.visible');
    
    // Verify history entries
    cy.get('[data-testid="history-entry"]').should('have.length', 2);
    cy.get('[data-testid="history-entry"]').first().should('contain', 'AI');
    cy.get('[data-testid="history-entry"]').last().should('contain', 'Manual');
    cy.get('[data-testid="history-entry"]').last().should('contain', 'Admin User');
  });
});