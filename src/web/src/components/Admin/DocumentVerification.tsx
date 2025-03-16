import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.0
import { Box, Grid, Typography, Divider, CircularProgress, Tooltip } from '@mui/material'; // @mui/material ^5.0.0
import { ZoomIn, ZoomOut, RotateRight, Download, CheckCircle, Cancel, Warning } from '@mui/icons-material'; // @mui/icons-material ^5.0.0

import {
  Card,
  Button,
  TextField,
  RadioButton,
  StatusBadge,
  LoadingSkeleton,
} from '../Common';
import DocumentAnalysisResults from '../AIAssistant/DocumentAnalysisResults';
import DocumentService from '../../services/DocumentService';
import { Document, VerificationStatus, AIDocumentAnalysisResult } from '../../types/document';
import { useNotification } from '../../hooks/useNotification';
import { colors, spacing } from '../../styles/variables';

/**
 * Interface for the DocumentVerification component props
 */
interface DocumentVerificationProps {
  documentId: string;
  onVerificationComplete?: Function;
  className?: string;
}

/**
 * Styled components for consistent styling
 */
const Container = styled(Box)`
  padding: ${spacing.md};
`;

const DocumentPreviewContainer = styled(Card)`
  margin-bottom: ${spacing.md};
`;

const PreviewArea = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 600px;
  transform: scale(${props => props.scale}) rotate(${props => props.rotate}deg);
  transition: transform 0.3s ease-in-out;
`;

const PreviewControls = styled(Box)`
  display: flex;
  justify-content: space-around;
  padding: ${spacing.sm};
`;

const ControlButton = styled(Button)`
  /* Add any specific button styles here */
`;

const VerificationForm = styled(Box)`
  margin-top: ${spacing.md};
`;

const VerificationOptions = styled(Box)`
  margin-bottom: ${spacing.md};
`;

const CommentsField = styled(TextField)`
  width: 100%;
`;

const SubmitButton = styled(Button)`
  margin-top: ${spacing.md};
`;

const LoadingContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const ErrorMessage = styled(Typography)`
  color: ${colors.error};
  margin-top: ${spacing.sm};
`;

/**
 * Component for administrators to review and verify documents
 */
const DocumentVerification: React.FC<DocumentVerificationProps> = ({ documentId, onVerificationComplete, className }) => {
  // State variables
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AIDocumentAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [verificationDecision, setVerificationDecision] = useState<VerificationStatus | null>(null);
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Notification hook
  const { displaySuccess, displayError } = useNotification();

  /**
   * Fetches document details by ID
   */
  const fetchDocument = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedDocument = await DocumentService.getDocument(documentId);
      setDocument(fetchedDocument);
      const downloadUrl = await DocumentService.getDocumentDownloadUrl(documentId);
      setPreviewUrl(downloadUrl);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch document');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches AI analysis results for the document
   */
  const fetchAnalysisResults = useCallback(async (documentId: string) => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const results = await DocumentService.getDocumentAnalysisResult(documentId);
      setAnalysisResults(results);
    } catch (e: any) {
      setAnalysisError(e.message || 'Failed to fetch analysis results');
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  /**
   * Handles submission of verification decision
   */
  const handleVerificationSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      if (!verificationDecision) {
        throw new Error('Please select a verification decision');
      }

      const verificationData = { notes: comments };

      if (verificationDecision === VerificationStatus.VERIFIED) {
        await DocumentService.verifyDocument(documentId, verificationData);
        displaySuccess('Document verified successfully');
      } else if (verificationDecision === VerificationStatus.REJECTED) {
        await DocumentService.rejectDocument(documentId, verificationData);
        displaySuccess('Document rejected successfully');
      }

      // Refresh document data
      await fetchDocument(documentId);
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (e: any) {
      displayError(e.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  }, [documentId, verificationDecision, comments, displaySuccess, displayError, fetchDocument, onVerificationComplete]);

  /**
   * Increases zoom level for document preview
   */
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prevZoom => Math.min(prevZoom + 0.2, 2));
  }, []);

  /**
   * Decreases zoom level for document preview
   */
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prevZoom => Math.max(prevZoom - 0.2, 0.5));
  }, []);

  /**
   * Rotates document preview by 90 degrees
   */
  const handleRotate = useCallback(() => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  }, []);

  /**
   * Initiates download of the original document
   */
  const handleDownload = useCallback(async () => {
    try {
      const downloadUrl = await DocumentService.getDocumentDownloadUrl(documentId);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = document.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      displayError(e.message || 'Failed to download document');
    }
  }, [document, documentId, displayError]);

  // Fetch document and analysis results on mount
  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
      fetchAnalysisResults(documentId);
    }
  }, [documentId, fetchDocument, fetchAnalysisResults]);

  return (
    <Container className={className}>
      {loading && (
        <LoadingContainer>
          <LoadingSkeleton variant="rectangular" width={400} height={300} />
          <Typography variant="body1">Loading document...</Typography>
        </LoadingContainer>
      )}

      {error && (
        <ErrorMessage variant="body1" role="alert">
          Error: {error}
        </ErrorMessage>
      )}

      {document && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <DocumentPreviewContainer>
              <PreviewArea>
                {previewUrl ? (
                  <PreviewImage
                    src={previewUrl}
                    alt={`Preview of ${document.file_name}`}
                    scale={zoomLevel}
                    rotate={rotation}
                  />
                ) : (
                  <Typography variant="body1">No preview available</Typography>
                )}
              </PreviewArea>
              <PreviewControls>
                <Tooltip title="Zoom In">
                  <ControlButton onClick={handleZoomIn} disabled={zoomLevel >= 2}>
                    <ZoomIn />
                  </ControlButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <ControlButton onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
                    <ZoomOut />
                  </ControlButton>
                </Tooltip>
                <Tooltip title="Rotate">
                  <ControlButton onClick={handleRotate}>
                    <RotateRight />
                  </ControlButton>
                </Tooltip>
                <Tooltip title="Download">
                  <ControlButton onClick={handleDownload}>
                    <Download />
                  </ControlButton>
                </Tooltip>
              </PreviewControls>
            </DocumentPreviewContainer>
          </Grid>

          <Grid item xs={12} md={6}>
            <DocumentAnalysisResults
              analysisResult={analysisResults}
              isLoading={analysisLoading}
              error={analysisError}
            />

            <VerificationForm>
              <Typography variant="h6">Verification Decision</Typography>
              <VerificationOptions>
                <RadioButton
                  id="verified-radio"
                  name="verificationDecision"
                  value={VerificationStatus.VERIFIED}
                  label="Verified"
                  checked={verificationDecision === VerificationStatus.VERIFIED}
                  onChange={(e) => setVerificationDecision(e.target.value as VerificationStatus)}
                />
                <RadioButton
                  id="rejected-radio"
                  name="verificationDecision"
                  value={VerificationStatus.REJECTED}
                  label="Rejected"
                  checked={verificationDecision === VerificationStatus.REJECTED}
                  onChange={(e) => setVerificationDecision(e.target.value as VerificationStatus)}
                />
              </VerificationOptions>

              <CommentsField
                label="Comments"
                multiline
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />

              <SubmitButton
                variant="contained"
                color="primary"
                onClick={handleVerificationSubmit}
                disabled={submitting || !verificationDecision}
              >
                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Decision'}
              </SubmitButton>
            </VerificationForm>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default DocumentVerification;