import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import {
  Box,
  Typography,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  Paper,
  SelectChangeEvent
} from '@mui/material';
import { CloudUploadOutlined, CheckCircleOutline } from '@mui/icons-material';

import FileUploader from '../Common/FileUploader';
import FinancialAidService from '../../services/FinancialAidService';
import { FinancialAidDocumentType, FinancialAidDocument } from '../../types/financialAid';
import useNotification from '../../hooks/useNotification';
import {
  getAcceptedFileTypesForDocumentType,
  getMaxFileSizeForDocumentType,
  formatFileSize
} from '../../utils/fileUtils';
import { colors } from '../../styles/variables';

/**
 * Props interface for the AidDocumentUpload component
 */
interface AidDocumentUploadProps {
  /** ID of the financial aid application to associate the document with */
  financialAidApplicationId: number;
  /** Optional pre-selected document type */
  documentType?: string;
  /** Callback function called when document upload is successful */
  onUploadSuccess?: (document: FinancialAidDocument) => void;
  /** Callback function called when document upload fails */
  onUploadError?: (error: Error) => void;
  /** Label text for the uploader */
  label?: string;
  /** Helper text displayed below the uploader */
  helperText?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS class for styling */
  className?: string;
}

// Styled components
const UploaderContainer = styled(Paper)`
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
`;

const DocumentTypeSelector = styled(FormControl)`
  width: 100%;
  margin-bottom: 16px;
`;

const ProgressContainer = styled(Box)`
  margin-top: 16px;
  padding: 8px;
`;

const ErrorMessage = styled(Typography)`
  color: ${colors.error};
  margin-top: 8px;
`;

const SuccessMessage = styled(Typography)`
  color: ${colors.success};
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RequiredIndicator = styled(Box)`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${colors.warning};
  margin-left: 8px;
`;

const MissingIndicator = styled(Box)`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${colors.error};
  margin-left: 8px;
`;

/**
 * A component for uploading financial aid documents with document type selection and progress tracking
 */
const AidDocumentUpload: React.FC<AidDocumentUploadProps> = ({
  financialAidApplicationId,
  documentType,
  onUploadSuccess,
  onUploadError,
  label = 'Upload Financial Aid Document',
  helperText = 'Select a document type and upload the corresponding file',
  disabled = false,
  className
}) => {
  // Component state
  const [selectedDocumentType, setSelectedDocumentType] = useState<string | null>(documentType || null);
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<FinancialAidDocument | null>(null);

  // Get notification hook for displaying notifications to the user
  const notification = useNotification();

  // Fetch required and missing documents on component mount or after successful upload
  useEffect(() => {
    const fetchDocumentRequirements = async () => {
      try {
        // Fetch required documents
        const requiredDocs = await FinancialAidService.fetchRequiredDocuments(financialAidApplicationId);
        setRequiredDocuments(requiredDocs);
        
        // Fetch missing documents
        const missingDocs = await FinancialAidService.fetchMissingDocuments(financialAidApplicationId);
        setMissingDocuments(missingDocs);
      } catch (error) {
        console.error('Error fetching document requirements:', error);
        setError('Failed to load document requirements. Please try again.');
      }
    };

    if (financialAidApplicationId) {
      fetchDocumentRequirements();
    }
  }, [financialAidApplicationId, uploadedDocument]);

  // Handle document type change
  const handleDocumentTypeChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedDocumentType(event.target.value);
    setError(null);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((files: File[]) => {
    if (!files.length || !selectedDocumentType) {
      return;
    }

    const file = files[0];

    // Reset state
    setUploadProgress(0);
    setError(null);
    setUploadedDocument(null);
    setIsUploading(true);

    // Upload the file
    FinancialAidService.uploadFinancialAidDocumentWithProgress(
      financialAidApplicationId,
      file,
      selectedDocumentType,
      handleUploadProgress
    )
      .then(handleUploadSuccess)
      .catch(handleUploadError);
  }, [financialAidApplicationId, selectedDocumentType]);

  // Handle upload progress
  const handleUploadProgress = useCallback((progress: number) => {
    setUploadProgress(progress);
  }, []);

  // Handle upload success
  const handleUploadSuccess = useCallback((document: FinancialAidDocument) => {
    setIsUploading(false);
    setUploadedDocument(document);
    setError(null);
    
    // Refresh missing documents list
    FinancialAidService.fetchMissingDocuments(financialAidApplicationId)
      .then(missingDocs => {
        setMissingDocuments(missingDocs);
      })
      .catch(err => {
        console.error('Error fetching missing documents after upload:', err);
      });
    
    // Call onUploadSuccess callback if provided
    if (onUploadSuccess) {
      onUploadSuccess(document);
    }
  }, [financialAidApplicationId, onUploadSuccess]);

  // Handle upload error
  const handleUploadError = useCallback((error: Error) => {
    setIsUploading(false);
    setUploadProgress(0);
    setError(error.message || 'An error occurred while uploading the document. Please try again.');
    
    // Call onUploadError callback if provided
    if (onUploadError) {
      onUploadError(error);
    }
  }, [onUploadError]);

  // Get document type label with required/missing indicators
  const getDocumentTypeLabel = useCallback((docType: string) => {
    const isRequired = requiredDocuments.includes(docType);
    const isMissing = missingDocuments.includes(docType);
    
    return (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        {docType.replace(/_/g, ' ')}
        {isRequired && <RequiredIndicator title="Required" />}
        {isMissing && <MissingIndicator title="Missing" />}
      </Box>
    );
  }, [requiredDocuments, missingDocuments]);

  // Determine accepted file types and max file size based on document type
  const acceptedFileTypes = selectedDocumentType
    ? getAcceptedFileTypesForDocumentType(selectedDocumentType)
    : [];
    
  const maxFileSize = selectedDocumentType
    ? getMaxFileSizeForDocumentType(selectedDocumentType)
    : 10 * 1024 * 1024; // Default to 10MB

  return (
    <UploaderContainer className={className}>
      <Typography variant="h6" gutterBottom>
        {label}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {/* Document type selector */}
      <DocumentTypeSelector disabled={disabled || isUploading}>
        <InputLabel id="document-type-label">Document Type</InputLabel>
        <Select
          labelId="document-type-label"
          id="document-type-select"
          value={selectedDocumentType || ''}
          onChange={handleDocumentTypeChange}
          label="Document Type"
        >
          <MenuItem value="" disabled>
            Select a document type
          </MenuItem>
          {Object.values(FinancialAidDocumentType).map((docType) => (
            <MenuItem key={docType} value={docType}>
              {getDocumentTypeLabel(docType)}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          Please select the type of document you are uploading
        </FormHelperText>
      </DocumentTypeSelector>
      
      {/* File uploader */}
      {selectedDocumentType && (
        <FileUploader
          onFileSelect={handleFileSelect}
          acceptedFileTypes={acceptedFileTypes}
          maxFileSize={maxFileSize}
          multiple={false}
          disabled={disabled || isUploading}
          label={`Upload ${selectedDocumentType.replace(/_/g, ' ')}`}
          helperText={`Accepted formats: ${acceptedFileTypes.map(type => {
            if (type === 'application/pdf') return 'PDF';
            if (type.startsWith('image/')) return type.replace('image/', '').toUpperCase();
            return type;
          }).join(', ')} (Max ${formatFileSize(maxFileSize)})`}
          documentType={selectedDocumentType}
        />
      )}
      
      {/* Upload progress */}
      {isUploading && (
        <ProgressContainer>
          <Typography variant="body2" gutterBottom>
            Uploading document... {uploadProgress.toFixed(0)}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </ProgressContainer>
      )}
      
      {/* Error message */}
      {error && (
        <ErrorMessage variant="body2">
          {error}
        </ErrorMessage>
      )}
      
      {/* Success message */}
      {uploadedDocument && (
        <SuccessMessage variant="body2">
          <CheckCircleOutline />
          Document uploaded successfully: {uploadedDocument.file_name}
        </SuccessMessage>
      )}
    </UploaderContainer>
  );
};

export default AidDocumentUpload;