import React, { useState, useEffect, useMemo, useCallback } from 'react'; // react v18.0.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material'; // @mui/material v5.0.0
import {
  CheckCircleOutline,
  ErrorOutline,
  UploadFile,
  DescriptionOutlined,
} from '@mui/icons-material'; // @mui/icons-material v5.0.0
import {
  DocumentStatus as DocumentStatusType,
  DocumentType,
  VerificationStatus,
} from '../../types/document';
import DocumentService from '../../services/DocumentService';
import StatusBadge, { StatusType } from '../Common/StatusBadge';
import ProgressIndicator from '../Common/ProgressIndicator';
import useNotification from '../../hooks/useNotification';
import { formatDate } from '../../utils/dateUtils';

/**
 * TypeScript interface for DocumentStatus component props
 */
export interface DocumentStatusProps {
  applicationId: string | number;
  applicationType: string;
  onUploadClick: () => void;
  className?: string;
}

/**
 * Formats a document type enum value into a human-readable string
 * @param type 
 * @returns Formatted document type label
 */
const formatDocumentType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

/**
 * Calculates the percentage of completed documents
 * @param documents 
 * @returns Percentage of completed documents
 */
const calculateCompletionPercentage = (documents: DocumentStatusType[]): number => {
  const requiredDocuments = documents.filter(doc => doc.required);
  const uploadedDocuments = requiredDocuments.filter(doc => doc.uploaded);

  if (requiredDocuments.length === 0) {
    return 0;
  }

  return (uploadedDocuments.length / requiredDocuments.length) * 100;
};

/**
 * Component that displays the status of required documents for an application
 * @param props 
 * @returns Rendered component
 */
const DocumentStatus: React.FC<DocumentStatusProps> = ({
  applicationId,
  applicationType,
  onUploadClick,
  className,
}) => {
  // Initialize state for documents, loading status, and error
  const [documents, setDocuments] = useState<DocumentStatusType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use useNotification hook to display error messages
  const { displayError } = useNotification();

  // Define fetchDocumentStatus function to load document status data
  const fetchDocumentStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedDocuments = await DocumentService.getDocumentStatus(
        applicationId,
        applicationType
      );
      setDocuments(fetchedDocuments);
    } catch (e: any) {
      setError(e.message || 'Failed to load document status.');
      displayError(e.message || 'Failed to load document status.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, applicationType, displayError]);

  // Use useEffect to fetch document status when component mounts or when applicationId/applicationType changes
  useEffect(() => {
    fetchDocumentStatus();
  }, [fetchDocumentStatus]);

  // Calculate completion percentage using calculateCompletionPercentage function
  const completionPercentage = useMemo(() => {
    return calculateCompletionPercentage(documents);
  }, [documents]);

  // Define handleUploadClick function to handle upload button click
  const handleUploadClick = () => {
    onUploadClick();
  };

  // Render loading state if data is being fetched
  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center">
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Render error state if there was an error fetching data
  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <Typography color="error">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  // Render empty state if no documents are required
  if (documents.length === 0) {
    return (
      <Card className={className}>
        <CardContent>
          <Typography>No documents required for this application.</Typography>
        </CardContent>
      </Card>
    );
  }

  // Render card with document status information
  return (
    <Card className={className}>
      <CardHeader title="Document Status" />
      <CardContent>
        <ProgressIndicator percentage={completionPercentage} label="Completion" />
        <List>
          {documents.map((document) => (
            <React.Fragment key={document.document_type}>
              <ListItem>
                <ListItemIcon>
                  {document.uploaded && document.verified ? (
                    <CheckCircleOutline color="success" />
                  ) : (
                    <DescriptionOutlined color="action" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={formatDocumentType(document.document_type)}
                  secondary={
                    <>
                      {document.uploaded ? (
                        <>
                          Uploaded: {formatDate(document.upload_date, 'MMM d, yyyy')}
                          <br />
                          Verification Status:
                          <StatusBadge
                            status={
                              document.verified
                                ? VerificationStatus.VERIFIED
                                : VerificationStatus.PENDING
                            }
                            type={StatusType.DOCUMENT}
                            size="small"
                            showIcon={false}
                          />
                        </>
                      ) : (
                        'Not Uploaded'
                      )}
                    </>
                  }
                />
                {!document.uploaded && document.required && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<UploadFile />}
                    onClick={handleUploadClick}
                  >
                    Upload
                  </Button>
                )}
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
        <Button variant="contained" color="primary" onClick={handleUploadClick}>
          Upload Documents
        </Button>
      </CardContent>
    </Card>
  );
};

export default DocumentStatus;