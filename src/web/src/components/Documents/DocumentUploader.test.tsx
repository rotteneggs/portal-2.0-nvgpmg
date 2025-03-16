import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils ^18.2.0
import DocumentUploader from './DocumentUploader';
import DocumentService from '../../services/DocumentService';
import { DocumentType } from '../../types/document';
import { renderWithProviders } from '../../utils/testUtils';

// Mock DocumentService module
jest.mock('../../services/DocumentService', () => ({
  __esModule: true,
  default: {
    uploadDocument: jest.fn(),
    getAllowedDocumentTypes: jest.fn()
  }
}));

// Mock useNotification hook
jest.mock('../../hooks/useNotification', () => ({
  __esModule: true,
  default: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn()
  })
}));

// Describe the test suite for DocumentUploader component
describe('DocumentUploader', () => {
  // Define mock document types and document data
  const mockDocumentTypes = [
    { type: DocumentType.TRANSCRIPT, label: 'Transcript', description: 'Upload your transcript here.', allowed_formats: ['pdf'], max_size: 5242880, required: true },
    { type: DocumentType.RECOMMENDATION, label: 'Recommendation', description: 'Upload your recommendation letter here.', allowed_formats: ['pdf'], max_size: 5242880, required: true }
  ];
  const mockDocument = {
    id: 1,
    user_id: 1,
    application_id: 1,
    document_type: DocumentType.TRANSCRIPT,
    file_name: 'transcript.pdf',
    file_path: '/path/to/transcript.pdf',
    mime_type: 'application/pdf',
    file_size: 1024,
    is_verified: false,
    verified_at: null,
    verified_by_user_id: null,
    created_at: '2023-08-01T00:00:00.000Z',
    updated_at: '2023-08-01T00:00:00.000Z',
    download_url: '/download/transcript.pdf',
    is_image: false,
    is_pdf: true,
    file_extension: 'pdf'
  };

  // Set up beforeEach to reset mocks before each test
  beforeEach(() => {
    // Reset all mocks to clear previous test interactions
    jest.clearAllMocks();

    // Set up default mock implementations for DocumentService methods
    (DocumentService.getAllowedDocumentTypes as jest.Mock).mockResolvedValue({ allowed_types: mockDocumentTypes.map(dt => dt.type), supported_formats: ['pdf'], max_size: 5242880 });
    (DocumentService.uploadDocument as jest.Mock).mockResolvedValue(mockDocument);
  });

  // Helper function to create mock File objects for testing
  const createMockFile = (name: string, type: string, size: number): File => {
    // Create a new File object with specified name, type, and size
    const blob = new Blob([''], { type });
    const file = new File([blob], name, { type });

    // Return the mock File object
    return file;
  };

  // Test that the component renders correctly
  it('renders correctly with document type selector', async () => {
    // Mock getAllowedDocumentTypes to return document types
    (DocumentService.getAllowedDocumentTypes as jest.Mock).mockResolvedValue({ allowed_types: mockDocumentTypes.map(dt => dt.type), supported_formats: ['pdf'], max_size: 5242880 });

    // Render DocumentUploader component with required props
    renderWithProviders(<DocumentUploader applicationId="1" onUploadSuccess={jest.fn()} onUploadError={jest.fn()} />);

    // Verify document type selector is rendered
    expect(screen.getByLabelText('Document Type')).toBeInTheDocument();

    // Verify file uploader component is rendered
    expect(screen.getByText('Drag & Drop Files Here or Browse')).toBeInTheDocument();

    // Verify helper text is displayed
    expect(screen.getByText('Select a document type and upload the corresponding file')).toBeInTheDocument();
  });

  // Test that the component renders correctly with pre-selected document type
  it('renders correctly with pre-selected document type', () => {
    // Render DocumentUploader with applicationId and documentType props
    renderWithProviders(<DocumentUploader applicationId="1" documentType={DocumentType.TRANSCRIPT} onUploadSuccess={jest.fn()} onUploadError={jest.fn()} />);

    // Verify document type selector is not rendered
    expect(screen.queryByLabelText('Document Type')).not.toBeInTheDocument();

    // Verify file uploader component is rendered with correct accepted file types
    expect(screen.getByText('Drag & Drop Files Here or Browse')).toBeInTheDocument();
  });

  // Test document type selection functionality
  it('handles document type selection', async () => {
    // Mock getAllowedDocumentTypes to return document types
    (DocumentService.getAllowedDocumentTypes as jest.Mock).mockResolvedValue({ allowed_types: mockDocumentTypes.map(dt => dt.type), supported_formats: ['pdf'], max_size: 5242880 });

    // Render DocumentUploader component
    renderWithProviders(<DocumentUploader applicationId="1" onUploadSuccess={jest.fn()} onUploadError={jest.fn()} />);

    // Select a document type from the dropdown
    await userEvent.click(screen.getByLabelText('Document Type'));
    await userEvent.click(screen.getByText('Transcript'));

    // Verify file uploader updates with correct accepted file types for selected document type
    expect(screen.getByText('Accepted formats: PDF (Max 5.0 MB)')).toBeInTheDocument();
  });

  // Test file upload functionality
  it('handles file selection and uploads document', async () => {
    // Mock uploadDocument to return a successful response
    (DocumentService.uploadDocument as jest.Mock).mockResolvedValue(mockDocument);

    // Mock callback functions
    const onUploadSuccessMock = jest.fn();

    // Render DocumentUploader with required props
    renderWithProviders(<DocumentUploader applicationId="1" onUploadSuccess={onUploadSuccessMock} onUploadError={jest.fn()} />);

    // Select a document type
    await userEvent.click(screen.getByLabelText('Document Type'));
    await userEvent.click(screen.getByText('Transcript'));

    // Upload a valid file
    const file = createMockFile('transcript.pdf', 'application/pdf', 1024);
    const fileInput = screen.getByLabelText('File upload');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify uploadDocument was called with correct parameters
    await waitFor(() => {
      expect(DocumentService.uploadDocument).toHaveBeenCalledWith(
        file,
        DocumentType.TRANSCRIPT,
        "1",
        expect.any(Function)
      );
    });

    // Verify success message is displayed
    await waitFor(() => {
      expect(screen.getByText('transcript.pdf uploaded successfully!')).toBeInTheDocument();
    });

    // Verify onUploadSuccess callback was called
    await waitFor(() => {
      expect(onUploadSuccessMock).toHaveBeenCalledWith(mockDocument);
    });
  });

  // Test error handling for invalid files
  it('shows error for invalid file type', async () => {
    // Render DocumentUploader with required props
    renderWithProviders(<DocumentUploader applicationId="1" onUploadSuccess={jest.fn()} onUploadError={jest.fn()} />);

    // Select a document type
    await userEvent.click(screen.getByLabelText('Document Type'));
    await userEvent.click(screen.getByText('Transcript'));

    // Upload a file with invalid type
    const file = createMockFile('transcript.txt', 'text/plain', 1024);
    const fileInput = screen.getByLabelText('File upload');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify error message about invalid file type is displayed
    await waitFor(() => {
      expect(screen.getByText('File type not accepted. Allowed formats: PDF')).toBeInTheDocument();
    });

    // Verify uploadDocument was not called
    expect(DocumentService.uploadDocument).not.toHaveBeenCalled();
  });

  // Test error handling for file exceeding size limit
  it('shows error for file exceeding size limit', async () => {
    // Render DocumentUploader with required props
    renderWithProviders(<DocumentUploader applicationId="1" onUploadSuccess={jest.fn()} onUploadError={jest.fn()} />);

    // Select a document type
    await userEvent.click(screen.getByLabelText('Document Type'));
    await userEvent.click(screen.getByText('Transcript'));

    // Upload a file exceeding size limit
    const file = createMockFile('transcript.pdf', 'application/pdf', 10 * 1024 * 1024 + 1);
    const fileInput = screen.getByLabelText('File upload');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify error message about file size is displayed
    await waitFor(() => {
      expect(screen.getByText('File "transcript.pdf" exceeds the maximum size of 10.0 MB.')).toBeInTheDocument();
    });

    // Verify uploadDocument was not called
    expect(DocumentService.uploadDocument).not.toHaveBeenCalled();
  });

  // Test upload progress during file upload
  it('shows upload progress during file upload', async () => {
    // Mock uploadDocument to simulate progress updates
    (DocumentService.uploadDocument as jest.Mock).mockImplementation(
      (file, documentType, applicationId, onProgress) => {
        return new Promise((resolve) => {
          // Simulate progress updates
          onProgress(25);
          setTimeout(() => onProgress(50), 50);
          setTimeout(() => onProgress(75), 100);
          setTimeout(() => {
            onProgress(100);
            resolve(mockDocument);
          }, 150);
        });
      }
    );

    // Render DocumentUploader with required props
    renderWithProviders(<DocumentUploader applicationId="1" onUploadSuccess={jest.fn()} onUploadError={jest.fn()} />);

    // Select a document type
    await userEvent.click(screen.getByLabelText('Document Type'));
    await userEvent.click(screen.getByText('Transcript'));

    // Upload a valid file
    const file = createMockFile('transcript.pdf', 'application/pdf', 1024);
    const fileInput = screen.getByLabelText('File upload');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify progress indicator is displayed
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  // Test error handling during upload
  it('handles upload error', async () => {
    // Mock uploadDocument to reject with an error
    (DocumentService.uploadDocument as jest.Mock).mockRejectedValue(new Error('Upload failed'));

    // Mock callback functions
    const onUploadErrorMock = jest.fn();

    // Render DocumentUploader with required props
    renderWithProviders(<DocumentUploader applicationId="1" onUploadSuccess={jest.fn()} onUploadError={onUploadErrorMock} />);

    // Select a document type
    await userEvent.click(screen.getByLabelText('Document Type'));
    await userEvent.click(screen.getByText('Transcript'));

    // Upload a valid file
    const file = createMockFile('transcript.pdf', 'application/pdf', 1024);
    const fileInput = screen.getByLabelText('File upload');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });

    // Verify onUploadError callback was called
    await waitFor(() => {
      expect(onUploadErrorMock).toHaveBeenCalledWith(new Error('Upload failed'));
    });
  });

  // Test disabled state
  it('disables the uploader when disabled prop is true', () => {
    // Render DocumentUploader with disabled prop set to true
    renderWithProviders(<DocumentUploader applicationId="1" onUploadSuccess={jest.fn()} onUploadError={jest.fn()} disabled />);

    // Verify document type selector is disabled
    expect(screen.getByLabelText('Document Type')).toBeDisabled();

    // Verify file uploader is disabled
    expect(screen.getByText('Drag & Drop Files Here or Browse')).toHaveAttribute('aria-disabled', 'true');
  });
});