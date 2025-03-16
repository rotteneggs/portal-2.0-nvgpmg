import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Button, CircularProgress } from '@mui/material'; // @mui/material v5.11.10
import { ArrowBack } from '@mui/icons-material'; // @mui/icons-material v5.11.9
import { styled } from '@emotion/styled'; // @emotion/styled v11.10.6

import AdminLayout from '../../layouts/AdminLayout';
import DocumentVerification from '../../components/Admin/DocumentVerification';
import { useNotification } from '../../hooks/useNotification';
import DocumentService from '../../services/DocumentService';

/**
 * Styled components for consistent styling
 */
const Container = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: ${theme => theme.spacing(3)};
`;

const BackButton = styled(Button)`
  margin-right: ${theme => theme.spacing(2)};
`;

const LoadingContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
`;

const ErrorContainer = styled(Box)`
  text-align: center;
  padding: ${theme => theme.spacing(4)};
  color: ${theme => theme.palette.error.main};
`;

/**
 * Admin page component for document verification
 * @returns Rendered DocumentVerificationPage component
 */
const DocumentVerificationPage: React.FC = () => {
  // Extract documentId from URL parameters using useParams hook
  const { documentId } = useParams<{ documentId: string }>();

  // Initialize state for document, loading status, and error
  const [document, setDocument] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize notification hook for displaying success/error messages
  const { displaySuccess, displayError } = useNotification();

  // Initialize navigate function for programmatic navigation
  const navigate = useNavigate();

  /**
   * Fetches document details by ID
   * @param documentId - The ID of the document to fetch
   */
  const fetchDocument = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedDocument = await DocumentService.getDocument(documentId);
      setDocument(fetchedDocument);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch document');
      displayError(e.message || 'Failed to fetch document');
    } finally {
      setLoading(false);
    }
  }, [displayError]);

  /**
   * Handles navigation back to previous page
   */
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  /**
   * Handles completion of document verification
   */
  const handleVerificationComplete = useCallback(() => {
    displaySuccess('Document verification complete');
    // Navigate back to the previous page
    navigate(-1);
  }, [displaySuccess, navigate]);

  // Fetch document details when component mounts or documentId changes
  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
    }
  }, [documentId, fetchDocument]);

  return (
    <AdminLayout title="Document Verification">
      <Container>
        <Header>
          <BackButton
            variant="outlined"
            color="primary"
            startIcon={<ArrowBack />}
            onClick={handleBack}
          >
            Back
          </BackButton>
          <Typography variant="h5">
            Document Verification
          </Typography>
        </Header>

        {loading && (
          <LoadingContainer>
            <CircularProgress />
            <Typography variant="body1">Loading document...</Typography>
          </LoadingContainer>
        )}

        {error && (
          <ErrorContainer>
            <Typography variant="body1" color="error">
              Error: {error}
            </Typography>
          </ErrorContainer>
        )}

        {document && (
          <DocumentVerification
            documentId={documentId!}
            onVerificationComplete={handleVerificationComplete}
          />
        )}
      </Container>
    </AdminLayout>
  );
};

export default DocumentVerificationPage;