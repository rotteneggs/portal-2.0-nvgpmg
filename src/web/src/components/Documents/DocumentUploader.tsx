import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import { 
  Box, 
  Typography, 
  LinearProgress, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText 
} from '@mui/material'; // @mui/material v5.0.0
import FileUploader from '../Common/FileUploader';
import DocumentService from '../../services/DocumentService';
import { DocumentType, Document, DocumentTypeInfo } from '../../types/document';
import { getAcceptedFileTypesForDocumentType, getMaxFileSizeForDocumentType } from '../../utils/fileUtils';
import formatFileSize from '../../utils/fileUtils';
import useNotification from '../../hooks/useNotification';

/**
 * Props interface for the DocumentUploader component
 */
interface DocumentUploaderProps {
  applicationId: string;
  documentType?: string;
  onUploadSuccess: (document: Document) => void;
  onUploadError: (error: Error) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

// Styled components
const UploaderContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 16px; /* spacing.md */
`;

const DocumentTypeSelector = styled(FormControl)`
  margin-bottom: 16px; /* spacing.md */
`;

const ProgressContainer = styled(Box)`
  margin-top: 16px; /* spacing.md */
`;

const ErrorMessage = styled(Typography)`
  color: #F44336; /* colors.error */
  margin-top: 4px; /* spacing.xs */
  font-size: 0.75rem;
`;

const SuccessMessage = styled(Typography)`
  color: #4CAF50; /* colors.success */
  margin-top: 4px; /* spacing.xs */
  font-size: 0.75rem;
`;

/**
 * A specialized document upload component with document type selection and integration with DocumentService
 */
const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  applicationId,
  documentType: initialDocumentType,
  onUploadSuccess,
  onUploadError,
  label = 'Upload Document',
  helperText = 'Select a document type and upload the corresponding file',
  disabled = false,
  className,
}) => {
  // Initialize state for selected document type, document types, upload progress, etc.
  const [selectedDocumentType, setSelectedDocumentType] = useState<string | null>(initialDocumentType || null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeInfo[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<Document | null>(null);

  // Create a notification instance using useNotification hook
  const { showSuccess, showError } = useNotification();

  // Implement useEffect to fetch allowed document types on component mount if no documentType is provided
  useEffect(() => {
    // Only fetch document types if a specific documentType is not already provided
    if (!initialDocumentType) {
      const fetchDocumentTypes = async () => {
        try {
          const allowedTypes = await DocumentService.getAllowedDocumentTypes();
          // Map the allowed types to DocumentTypeInfo objects
          const documentTypeInfo: DocumentTypeInfo[] = allowedTypes.allowed_types.map(type => ({
            type: type,
            label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format label
            description: `Upload your ${type.replace(/_/g, ' ')} here.`,
            allowed_formats: allowedTypes.supported_formats,
            max_size: allowedTypes.max_size,
            required: true // Assuming all are required for now
          }));
          setDocumentTypes(documentTypeInfo);
        } catch (err: any) {
          console.error('Failed to fetch document types:', err);
          setError('Failed to load document types. Please try again.');
        }
      };
      fetchDocumentTypes();
    }
  }, [initialDocumentType]);

  // Implement handleDocumentTypeChange to update the selectedDocumentType state
  const handleDocumentTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedDocumentType(event.target.value as string);
  };

  // Implement handleFileSelect to validate and upload the selected file
  const handleFileSelect = useCallback(
    async (files: File[]) => {
      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];

      if (!selectedDocumentType) {
        setError('Please select a document type.');
        return;
      }

      setIsUploading(true);
      setError(null);
      setUploadedDocument(null);
      setUploadProgress(0);

      try {
        const uploadedDoc = await DocumentService.uploadDocument(
          file,
          selectedDocumentType,
          applicationId,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        setUploadedDocument(uploadedDoc);
        showSuccess('Document uploaded successfully!');
        onUploadSuccess(uploadedDoc);
      } catch (err: any) {
        console.error('Document upload failed:', err);
        setError(err.message || 'Document upload failed. Please try again.');
        showError(err.message || 'Document upload failed. Please try again.');
        onUploadError(err);
      } finally {
        setIsUploading(false);
      }
    },
    [applicationId, selectedDocumentType, onUploadSuccess, onUploadError, showSuccess, showError]
  );

  // Implement handleUploadProgress to update the upload progress state
  const handleUploadProgress = (progress: number) => {
    setUploadProgress(progress);
  };

  // Implement handleUploadSuccess to handle successful uploads
  const handleUploadSuccess = (document: Document) => {
    setUploadedDocument(document);
    showSuccess('Document uploaded successfully!');
    onUploadSuccess(document);
  };

  // Implement handleUploadError to handle upload errors
  const handleUploadError = (error: Error) => {
    console.error('Document upload failed:', error);
    setError(error.message || 'Document upload failed. Please try again.');
    showError(error.message || 'Document upload failed. Please try again.');
    onUploadError(error);
  };

  // Determine acceptedFileTypes and maxFileSize based on the selected document type
  const acceptedFileTypes = selectedDocumentType
    ? getAcceptedFileTypesForDocumentType(selectedDocumentType)
    : [];
  const maxFileSize = selectedDocumentType
    ? getMaxFileSizeForDocumentType(selectedDocumentType)
    : 10 * 1024 * 1024; // 10MB default

  // Render document type selector if documentType prop is not provided
  return (
    <UploaderContainer className={className}>
      {!initialDocumentType && (
        <DocumentTypeSelector fullWidth>
          <InputLabel id="document-type-label">Document Type</InputLabel>
          <Select
            labelId="document-type-label"
            id="document-type-select"
            value={selectedDocumentType || ''}
            label="Document Type"
            onChange={handleDocumentTypeChange}
          >
            {documentTypes.map((type) => (
              <MenuItem key={type.type} value={type.type}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{helperText}</FormHelperText>
        </DocumentTypeSelector>
      )}

      {/* Render FileUploader component with appropriate props */}
      <FileUploader
        onFileSelect={handleFileSelect}
        acceptedFileTypes={acceptedFileTypes}
        maxFileSize={maxFileSize}
        label={label}
        helperText={helperText}
        error={!!error}
        disabled={disabled || isUploading}
        documentType={selectedDocumentType || undefined}
      />

      {/* Render upload progress indicator when isUploading is true */}
      {isUploading && (
        <ProgressContainer>
          <Typography variant="subtitle2">Uploading...</Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </ProgressContainer>
      )}

      {/* Render error message when error state is not null */}
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Render success message when uploadedDocument is not null */}
      {uploadedDocument && (
        <SuccessMessage>
          {uploadedDocument.file_name} uploaded successfully!
        </SuccessMessage>
      )}
    </UploaderContainer>
  );
};

export default DocumentUploader;