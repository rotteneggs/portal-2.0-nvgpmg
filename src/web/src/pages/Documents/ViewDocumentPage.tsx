import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { useParams, useNavigate, Link } from 'react-router-dom'; // react-router-dom v6.8.1
import {
  Box,
  Typography,
  Breadcrumbs,
  Divider,
  Chip,
  Grid,
  Alert,
} from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@emotion/styled'; // @emotion/styled v11.10.6
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  VerifiedUser as VerifiedUserIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
} from '@mui/icons-material'; // @mui/icons-material v5.11.11

import DashboardLayout from '../../layouts/DashboardLayout';
import DocumentViewer from '../../components/Documents/DocumentViewer';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import LoadingSkeleton from '../../components/Common/LoadingSkeleton';
import DocumentService from '../../services/DocumentService';
import { Document, VerificationStatus } from '../../types/document';
import useAuth from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';
import { formatDate } from '../../utils/dateUtils';

// Styled components for layout and visual elements
const PageContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: ${theme => theme.spacing(3)};
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const DocumentContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: ${theme => theme.spacing(2)};
`;

const ViewerContainer = styled(Box)`
  height: 600px;
  width: 100%;
  border-radius: ${theme => theme.shape.borderRadius}px;
  overflow: hidden;
`;

const MetadataContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: ${theme => theme.spacing(2)};
  padding: ${theme => theme.spacing(2)};
`;

const MetadataItem = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ActionContainer = styled(Box)`
  display: flex;
  gap: ${theme => theme.spacing(2)};
  margin-top: ${theme => theme.spacing(3)};
`;

const StatusChip = styled(Chip)`
  font-weight: 500;
`;

/**
 * Page component for viewing document details and content
 */
const ViewDocumentPage: React.FC = () => {
  // Extract documentId from URL parameters using useParams hook
  const { documentId } = useParams<{ documentId: string }>();

  // Get navigation function from useNavigate hook
  const navigate = useNavigate();

  // Get notification functions from useNotification hook
  const { displaySuccess, displayError } = useNotification();

  // Get admin status from useAuth hook
  const { isAdmin } = useAuth();

  // Initialize state for document, verification status, loading, and error
  const [document, setDocument] = useState<Document | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{ status: string, verified_at: string | null } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Function to fetch document details
   */
  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (documentId) {
        const fetchedDocument = await DocumentService.getDocument(documentId);
        setDocument(fetchedDocument);
      } else {
        setError('Document ID is missing.');
      }
    } catch (err: any) {
      console.error('Error fetching document:', err);
      setError(err.message || 'Failed to load document.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  /**
   * Function to fetch document verification status
   */
  const fetchVerificationStatus = useCallback(async () => {
    try {
      if (documentId) {
        const status = await DocumentService.getVerificationStatus(documentId);
        setVerificationStatus(status);
      }
    } catch (err: any) {
      console.error('Error fetching verification status:', err);
    }
  }, [documentId]);

  // Use useEffect to fetch document and verification status on component mount
  useEffect(() => {
    fetchDocument();
    fetchVerificationStatus();
  }, [fetchDocument, fetchVerificationStatus]);

  /**
   * Function to handle document download
   */
  const handleDownload = useCallback(async () => {
    try {
      if (document) {
        const blob = await DocumentService.downloadDocument(document.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        displaySuccess('Document download started');
      } else {
        displayError('Document not loaded yet.');
      }
    } catch (err: any) {
      console.error('Error downloading document:', err);
      displayError(err.message || 'Failed to download document.');
    }
  }, [document, displaySuccess, displayError]);

  /**
   * Function to handle back navigation
   */
  const handleBack = useCallback(() => {
    navigate('/documents');
  }, [navigate]);

  /**
   * Function to handle navigation to document verification page (admin only)
   */
  const handleVerifyDocument = useCallback(() => {
    if (documentId) {
      navigate(`/admin/documents/${documentId}/verify`);
    }
  }, [documentId, navigate]);

  return (
    <DashboardLayout title="View Document">
      <PageContainer>
        {/* Breadcrumbs for navigation */}
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={Link} to="/dashboard">
            Dashboard
          </Link>
          <Link component={Link} to="/documents">
            Documents
          </Link>
          <Typography color="text.primary">View Document</Typography>
        </Breadcrumbs>

        {loading && <LoadingSkeleton variant="rectangular" height={600} />}
        {error && <Alert severity="error">{error}</Alert>}

        {document && (
          <DocumentContainer>
            <Card>
              <MetadataContainer>
                <Typography variant="h6">{document.file_name}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <MetadataItem>
                      <Typography variant="subtitle2">Type:</Typography>
                      <Typography>{document.document_type}</Typography>
                    </MetadataItem>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <MetadataItem>
                      <Typography variant="subtitle2">Size:</Typography>
                      <Typography>{document.file_size_formatted}</Typography>
                    </MetadataItem>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <MetadataItem>
                      <Typography variant="subtitle2">Uploaded:</Typography>
                      <Typography>{formatDate(document.created_at, 'MM/dd/yyyy')}</Typography>
                    </MetadataItem>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <MetadataItem>
                      <Typography variant="subtitle2">Verification Status:</Typography>
                      {verificationStatus ? (
                        <StatusChip
                          label={verificationStatus.status}
                          color={
                            verificationStatus.status === 'verified'
                              ? 'success'
                              : verificationStatus.status === 'rejected'
                              ? 'error'
                              : 'warning'
                          }
                        />
                      ) : (
                        <Typography>Loading...</Typography>
                      )}
                    </MetadataItem>
                  </Grid>
                </Grid>
              </MetadataContainer>
            </Card>

            <Card>
              <ViewerContainer>
                <DocumentViewer Document={document} onClose={handleBack} />
              </ViewerContainer>
            </Card>

            <ActionContainer>
              <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
                Back to Documents
              </Button>
              <Button variant="contained" onClick={handleDownload} startIcon={<DownloadIcon />}>
                Download
              </Button>
              {isAdmin && (
                <Button variant="contained" onClick={handleVerifyDocument}>
                  Verify Document
                </Button>
              )}
            </ActionContainer>
          </DocumentContainer>
        )}
      </PageContainer>
    </DashboardLayout>
  );
};

export default ViewDocumentPage;