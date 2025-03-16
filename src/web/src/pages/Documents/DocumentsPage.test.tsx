import React from 'react'; // react v18.2.0
import { screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react v14.0.0
import { MemoryRouter, Routes, Route } from 'react-router-dom'; // react-router-dom v6.8.1
import { jest } from '@jest/globals'; // @jest/globals v29.5.0

import DocumentsPage from './DocumentsPage';
import DocumentService from '../../services/DocumentService';
import { renderWithProviders } from '../../utils/testUtils';
import { DocumentType } from '../../types/document';

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ applicationId: '1' }) // Mock URL parameters
}));

// Mock the useAuth hook
jest.mock('../../hooks/useAuth', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    user: { id: 1, email: 'test@example.com', roles: ['applicant'] },
    isAuthenticated: true,
    isAdmin: false
  })
}));

// Helper function to create mock document data for testing
const mockDocuments = () => [
  { id: 1, document_type: 'TRANSCRIPT', file_name: 'transcript.pdf', file_size: 1024, is_verified: true, created_at: '2023-01-01T00:00:00.000Z' },
  { id: 2, document_type: 'PERSONAL_STATEMENT', file_name: 'statement.pdf', file_size: 2048, is_verified: false, created_at: '2023-01-05T00:00:00.000Z' },
  { id: 3, document_type: 'RECOMMENDATION', file_name: 'recommendation.pdf', file_size: 512, is_verified: true, created_at: '2023-01-10T00:00:00.000Z' },
  { id: 4, document_type: 'OTHER', file_name: 'other.pdf', file_size: 4096, is_verified: false, created_at: '2023-01-15T00:00:00.000Z' },
  { id: 5, document_type: 'TEST_SCORE', file_name: 'test_score.pdf', file_size: 7000, is_verified: true, created_at: '2023-01-20T00:00:00.000Z' },
  { id: 6, document_type: 'FINANCIAL', file_name: 'financial.pdf', file_size: 9000, is_verified: false, created_at: '2023-01-25T00:00:00.000Z' }
];

// Helper function to create mock document type data
const mockDocumentTypes = () => ({
  allowed_types: ['TRANSCRIPT', 'PERSONAL_STATEMENT', 'RECOMMENDATION', 'IDENTIFICATION', 'TEST_SCORE', 'FINANCIAL', 'OTHER'],
  max_size: 10 * 1024 * 1024,
  supported_formats: ['pdf', 'jpg', 'png']
});

// Setup function to prepare the test environment
const setup = (options: { documents?: any[], documentTypes?: any[], error?: boolean } = {}) => {
  // Mock useAuth hook to return test user data
  jest.spyOn(DocumentService, 'getDocumentsByApplication').mockImplementation(() => {
    return options.documents ? Promise.resolve({ data: options.documents, meta: { pagination: { total: options.documents.length, per_page: 10, current_page: 1, last_page: 1, from: 1, to: options.documents.length } } }) : Promise.resolve({ data: [], meta: { pagination: { total: 0, per_page: 10, current_page: 1, last_page: 1, from: 0, to: 0 } } });
  });
  jest.spyOn(DocumentService, 'getAllowedDocumentTypes').mockImplementation(() => {
    return options.documentTypes ? Promise.resolve(options.documentTypes) : Promise.resolve(mockDocumentTypes());
  });

  // Mock error state
  if (options.error) {
    jest.spyOn(DocumentService, 'getDocumentsByApplication').mockRejectedValue(new Error('Failed to fetch documents'));
    jest.spyOn(DocumentService, 'getAllowedDocumentTypes').mockRejectedValue(new Error('Failed to fetch document types'));
  }

  // Render DocumentsPage with MemoryRouter and test route
  const renderResult = renderWithProviders(
    <MemoryRouter initialEntries={['/applications/1/documents']}>
      <Routes>
        <Route path="/applications/:applicationId/documents" element={<DocumentsPage />} />
      </Routes>
    </MemoryRouter>,
    {},
    {
      auth: {
        user: { id: 1, email: 'test@example.com', roles: ['applicant'] },
        isAuthenticated: true
      }
    }
  );

  return {
    ...renderResult,
    mockNavigate,
  };
};

describe('DocumentsPage', () => {
  it('renders loading state initially', async () => {
    const { getByText } = setup();
    expect(getByText('Loading documents...')).toBeInTheDocument();
  });

  it('renders document list when loaded', async () => {
    const { findAllByText } = setup({ documents: mockDocuments() });
    await waitFor(() => expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument());
    const documentItems = await findAllByText(/pdf/);
    expect(documentItems.length).toBeGreaterThan(0);
  });

  it('displays empty state when no documents', async () => {
    const { getByText } = setup({ documents: [] });
    await waitFor(() => expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument());
    expect(getByText('No documents found')).toBeInTheDocument();
    expect(getByText('Upload Document')).toBeInTheDocument();
  });

  it('navigates to upload page when upload button clicked', async () => {
    const { getByText } = setup({ documents: [] });
    await waitFor(() => expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument());
    fireEvent.click(getByText('Upload Document'));
    expect(mockNavigate).toHaveBeenCalledWith('/applications/1/upload-document');
  });

  it('filters documents when tab is changed', async () => {
    const { findAllByText, findByRole } = setup({ documents: mockDocuments(), documentTypes: mockDocumentTypes() });
    await waitFor(() => expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument());
    const academicTab = await findByRole('tab', { name: 'Academic' });
    fireEvent.click(academicTab);
    const academicDocuments = await findAllByText(/test_score\.pdf|transcript\.pdf/);
    expect(academicDocuments.length).toBeGreaterThan(0);
  });

  it('handles error state appropriately', async () => {
    const { getByText } = setup({ error: true });
    await waitFor(() => expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument());
    expect(getByText('Failed to fetch documents')).toBeInTheDocument();
  });

  it('navigates to document view when document is clicked', async () => {
    const { findAllByText } = setup({ documents: mockDocuments() });
    await waitFor(() => expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument());
    const documentItems = await findAllByText(/pdf/);
    fireEvent.click(documentItems[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/documents/1');
  });
});