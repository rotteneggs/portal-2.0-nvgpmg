import React from 'react';
import styled from '@emotion/styled';
import {
  Typography,
  Box,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  Info,
  Description
} from '@mui/icons-material';

import Card from '../Common/Card';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import { AIDocumentAnalysisResult, DocumentType } from '../../types/document';
import { colors, spacing } from '../../styles/variables';

/**
 * Props interface for the DocumentAnalysisResults component
 */
interface DocumentAnalysisResultsProps {
  analysisResult?: AIDocumentAnalysisResult;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

/**
 * Props interface for the ExtractedDataItem component
 */
interface ExtractedDataItemProps {
  label: string;
  value: string | number | null;
}

/**
 * Formats a confidence score as a percentage
 */
const formatConfidenceScore = (score: number): string => {
  return `${Math.round(score * 100)}%`;
};

/**
 * Determines the color to use based on confidence score or verification status
 */
const getStatusColor = (score: number): string => {
  if (score >= 0.9) return colors.success;
  if (score >= 0.7) return colors.warning;
  return colors.error;
};

/**
 * Converts document type code to human-readable label
 */
const getDocumentTypeLabel = (documentType: string): string => {
  switch (documentType) {
    case DocumentType.TRANSCRIPT:
      return 'Academic Transcript';
    case DocumentType.RECOMMENDATION:
      return 'Recommendation Letter';
    case DocumentType.PERSONAL_STATEMENT:
      return 'Personal Statement';
    case DocumentType.IDENTIFICATION:
      return 'Identification Document';
    case DocumentType.TEST_SCORE:
      return 'Test Score Report';
    case DocumentType.FINANCIAL:
      return 'Financial Document';
    case DocumentType.OTHER:
      return 'Other Document';
    default:
      return 'Unknown Document';
  }
};

// Styled components
const Container = styled(Card)`
  margin-bottom: ${spacing.md};
`;

const Section = styled(Box)`
  margin-bottom: ${spacing.md};
`;

const SectionTitle = styled(Typography)`
  font-weight: 500;
  margin-bottom: ${spacing.sm};
`;

const ConfidenceChip = styled(Chip)<{ $score: number }>`
  background-color: ${props => getStatusColor(props.$score)};
  color: ${colors.white};
  font-weight: 500;
  margin-left: ${spacing.sm};
`;

const DocumentTypeChip = styled(Chip)`
  background-color: ${colors.primary};
  color: ${colors.white};
  margin-left: ${spacing.sm};
`;

const ExtractedDataList = styled(List)`
  padding: 0;
`;

const VerificationItem = styled(ListItem)`
  padding-left: 0;
  padding-right: 0;
  margin-bottom: ${spacing.sm};
`;

const IssueItem = styled(ListItem)`
  padding-left: 0;
  padding-right: 0;
  margin-bottom: ${spacing.sm};
`;

const ErrorMessage = styled(Typography)`
  color: ${colors.error};
`;

const LoadingContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${spacing.md};
`;

const RecommendationBox = styled(Box)`
  padding: ${spacing.md};
  background-color: ${colors.neutralLight};
  border-radius: 4px;
  border-left: 4px solid ${colors.primary};
`;

/**
 * A component that displays a single extracted data item with label and value
 */
const ExtractedDataItem: React.FC<ExtractedDataItemProps> = ({ label, value }) => {
  if (value === null || value === undefined) return null;
  
  return (
    <ListItem sx={{ py: 0.5 }}>
      <ListItemText 
        primary={
          <Typography variant="body2">
            <strong>{label}:</strong> {value.toString()}
          </Typography>
        } 
      />
    </ListItem>
  );
};

/**
 * A component that displays AI-powered document analysis results
 */
const DocumentAnalysisResults: React.FC<DocumentAnalysisResultsProps> = ({
  analysisResult,
  isLoading = false,
  error,
  className
}) => {
  // Render loading state
  if (isLoading) {
    return (
      <Container className={className} data-testid="document-analysis-loading">
        <LoadingSkeleton variant="rectangular" height="200px" />
      </Container>
    );
  }

  // Render error state
  if (error) {
    return (
      <Container className={className} data-testid="document-analysis-error">
        <ErrorMessage variant="body1" color="error" role="alert">
          Error loading analysis results: {error}
        </ErrorMessage>
      </Container>
    );
  }

  // If no data and not loading/error, show empty message
  if (!analysisResult) {
    return (
      <Container className={className} data-testid="document-analysis-empty">
        <Typography variant="body1">
          No analysis results available for this document.
        </Typography>
      </Container>
    );
  }

  // Render extracted data section
  const renderExtractedData = () => {
    const { extracted_data } = analysisResult;
    if (!extracted_data || Object.keys(extracted_data).length === 0) {
      return (
        <Typography variant="body2">
          No data could be extracted from this document.
        </Typography>
      );
    }

    // Helper to handle potentially complex data
    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'object') return JSON.stringify(value);
      return value.toString();
    };

    return (
      <ExtractedDataList data-testid="extracted-data-list">
        {Object.entries(extracted_data).map(([key, value]) => (
          <ExtractedDataItem
            key={key}
            label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            value={formatValue(value)}
          />
        ))}
      </ExtractedDataList>
    );
  };

  // Render verification checks section
  const renderVerificationChecks = () => {
    return (
      <List data-testid="verification-checks">
        <VerificationItem>
          <ListItemIcon>
            {analysisResult.authenticity_score >= 0.9 ? (
              <CheckCircle sx={{ color: colors.success }} />
            ) : analysisResult.authenticity_score >= 0.7 ? (
              <Warning sx={{ color: colors.warning }} />
            ) : (
              <Cancel sx={{ color: colors.error }} />
            )}
          </ListItemIcon>
          <ListItemText 
            primary="Document appears authentic" 
            secondary={`Authenticity score: ${formatConfidenceScore(analysisResult.authenticity_score)}`}
          />
        </VerificationItem>
        <VerificationItem>
          <ListItemIcon>
            <CheckCircle sx={{ color: colors.success }} />
          </ListItemIcon>
          <ListItemText primary="Document type matches expected type" />
        </VerificationItem>
        <VerificationItem>
          <ListItemIcon>
            <CheckCircle sx={{ color: colors.success }} />
          </ListItemIcon>
          <ListItemText primary="Document quality is sufficient for verification" />
        </VerificationItem>
      </List>
    );
  };

  // Render potential issues section
  const renderPotentialIssues = () => {
    const { potential_issues } = analysisResult;
    if (!potential_issues || potential_issues.length === 0) {
      return (
        <Typography variant="body2">
          No issues detected with this document.
        </Typography>
      );
    }

    return (
      <List data-testid="potential-issues">
        {potential_issues.map((issue, index) => (
          <IssueItem key={index}>
            <ListItemIcon>
              <Warning sx={{ color: colors.warning }} />
            </ListItemIcon>
            <ListItemText primary={issue} />
          </IssueItem>
        ))}
      </List>
    );
  };

  // Main render
  return (
    <Container className={className} data-testid="document-analysis-results">
      <Section>
        <Box display="flex" alignItems="center">
          <SectionTitle variant="h6">AI Analysis Results</SectionTitle>
          <ConfidenceChip 
            $score={analysisResult.confidence_score} 
            label={`Confidence: ${formatConfidenceScore(analysisResult.confidence_score)}`} 
            size="small"
            aria-label={`Confidence score: ${formatConfidenceScore(analysisResult.confidence_score)}`}
          />
        </Box>
      </Section>

      <Section>
        <Box display="flex" alignItems="center">
          <SectionTitle variant="subtitle1">Document Type:</SectionTitle>
          <DocumentTypeChip 
            icon={<Description />} 
            label={getDocumentTypeLabel(analysisResult.detected_document_type)} 
            size="small"
            aria-label={`Detected document type: ${getDocumentTypeLabel(analysisResult.detected_document_type)}`}
          />
        </Box>
      </Section>

      {analysisResult.verification_recommendation && (
        <Section>
          <SectionTitle variant="subtitle1">Recommendation:</SectionTitle>
          <RecommendationBox data-testid="verification-recommendation">
            <Typography variant="body2">{analysisResult.verification_recommendation}</Typography>
          </RecommendationBox>
        </Section>
      )}

      <Divider sx={{ my: 2 }} />

      <Section>
        <SectionTitle variant="subtitle1">Extracted Information:</SectionTitle>
        {renderExtractedData()}
      </Section>

      <Divider sx={{ my: 2 }} />

      <Section>
        <SectionTitle variant="subtitle1">Verification Checks:</SectionTitle>
        {renderVerificationChecks()}
      </Section>

      <Divider sx={{ my: 2 }} />

      <Section>
        <SectionTitle variant="subtitle1">Potential Issues:</SectionTitle>
        {renderPotentialIssues()}
      </Section>
    </Container>
  );
};

export default DocumentAnalysisResults;