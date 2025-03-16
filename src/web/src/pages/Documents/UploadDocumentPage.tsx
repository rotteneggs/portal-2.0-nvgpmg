import React, { useState, useCallback, useEffect } from 'react'; // react v18.2.0
import { Box, Typography, Breadcrumbs, Link, Alert, Button } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { useSelector } from 'react-redux'; // react-redux v8.0.5
import DashboardLayout from '../../layouts/DashboardLayout';
import DocumentUploader from '../../components/Documents/DocumentUploader';
import Card from '../../components/Common';
import { DocumentType, Document } from '../../types/document';
import useNotification from '../../hooks/useNotification';
import { selectCurrentApplication } from '../../redux/slices/applicationsSlice';

// Styled components
const PageContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: ${theme => theme.spacing(3)};
`;

const UploaderContainer = styled(Box)`
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const ButtonContainer = styled(Box)`
  display: flex;
  gap: ${theme => theme.spacing(2)};
  margin-top: ${theme => theme.spacing(3)};
`;

/**
 * Page component for uploading documents
 */
const UploadDocumentPage: React.FC = () => {
  // Get application ID from URL parameters
  const { applicationId } = useParams<{ applicationId: string }>();

  // Get navigation function
  const navigate = useNavigate();

  // Get notification functions
  const { showSuccess, showError } = useNotification();

  // Get current application from Redux store
  const currentApplication = useSelector(selectCurrentApplication);

  // Initialize state for selectedDocumentType, uploadedDocument, and error
  const [selectedDocumentType, setSelectedDocumentType] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle document type selection change
  const handleDocumentTypeChange = (documentType: string) => {
    setSelectedDocumentType(documentType);
  };

  // Handle successful document upload
  const handleUploadSuccess = (document: Document) => {
    setUploadedDocument(document);
    showSuccess('Document uploaded successfully!');
  };

  // Handle document upload errors
  const handleUploadError = (error: Error) => {
    setError(error.message);
    showError(error.message);
  };

  // Navigate to the document view page
  const handleViewDocument = useCallback(() => {
    if (uploadedDocument) {
      navigate(`/documents/${uploadedDocument.id}`);
    }
  }, [navigate, uploadedDocument]);

  // Navigate back to the documents list
  const handleGoBack = () => {
    navigate('/documents');
  };

  return (
    <DashboardLayout title="Upload Document">
      <PageContainer>
        {/* Breadcrumbs for navigation */}
        <Breadcrumbs aria-label="breadcrumb">
          <Link component="a" underline="hover" color="inherit" href="/dashboard">
            Dashboard
          </Link>
          <Link component="a" underline="hover" color="inherit" href="/documents">
            Documents
          </Link>
          <Typography color="text.primary">Upload</Typography>
        </Breadcrumbs>

        {/* Page title and description */}
        <Typography variant="h4" component="h1">
          Upload Document
        </Typography>
        <Typography variant="body1">
          Select a document type and upload the corresponding file for your application.
        </Typography>

        {/* Document Uploader component */}
        <UploaderContainer>
          <Card>
            {applicationId && (
              <DocumentUploader
                applicationId={applicationId}
                documentType={selectedDocumentType || undefined}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            )}
          </Card>
        </UploaderContainer>

        {/* Success message */}
        {uploadedDocument !== null && (
          <Alert severity="success">
            Document uploaded successfully!
          </Alert>
        )}

        {/* Error message */}
        {error !== null && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {/* Navigation buttons */}
        <ButtonContainer>
          <Button variant="outlined" onClick={handleGoBack}>
            Back to Documents
          </Button>
          {uploadedDocument && (
            <Button variant="contained" onClick={handleViewDocument}>
              View Document
            </Button>
          )}
        </ButtonContainer>
      </PageContainer>
    </DashboardLayout>
  );
};

export default UploadDocumentPage;