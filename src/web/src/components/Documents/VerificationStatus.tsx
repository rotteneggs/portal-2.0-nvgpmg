import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.0
import {
  Typography,
  Box,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Collapse
} from '@mui/material'; // @mui/material ^5.0.0
import {
  CheckCircle,
  Cancel,
  Warning,
  Info,
  VerifiedUser,
  Person,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material'; // @mui/icons-material ^5.0.0

import Card from '../Common/Card';
import StatusBadge, { StatusType } from '../Common/StatusBadge';
import ProgressIndicator from '../Common/ProgressIndicator';
import DocumentAnalysisResults from '../AIAssistant/DocumentAnalysisResults';
import {
  Document,
  DocumentVerification,
  VerificationStatus as VerificationStatusEnum,
  VerificationMethod,
  AIDocumentAnalysisResult
} from '../../types/document';
import { formatDate } from '../../utils/dateUtils';
import DocumentService from '../../services/DocumentService';

/**
 * Interface defining the props for the VerificationStatus component.
 * It includes the document, verification data, and optional flags for showing details and analysis results.
 */
interface VerificationStatusProps {
  document: Document;
  verification?: DocumentVerification | null | undefined;
  showDetails?: boolean;
  showAnalysisResults?: boolean;
  className?: string;
}

/**
 * Converts verification method code to human-readable label
 * @param method - Verification method code
 * @returns Human-readable verification method label
 */
const getVerificationMethodLabel = (method: string): string => {
  switch (method) {
    case VerificationMethod.AI:
      return 'AI Verification';
    case VerificationMethod.MANUAL:
      return 'Manual Verification';
    case VerificationMethod.EXTERNAL:
      return 'External Verification';
    default:
      return 'Unknown Method';
  }
};

/**
 * Returns the appropriate icon component for a verification method
 * @param method - Verification method code
 * @returns Icon component for the verification method
 */
const getVerificationIcon = (method: string): React.ReactNode => {
  switch (method) {
    case VerificationMethod.AI:
      return <Info />;
    case VerificationMethod.MANUAL:
      return <Person />;
    case VerificationMethod.EXTERNAL:
      return <VerifiedUser />;
    default:
      return <Info />;
  }
};

/**
 * Formats a confidence score as a percentage
 * @param score - Confidence score (number between 0 and 1)
 * @returns Formatted percentage string or 'N/A' if score is null or undefined
 */
const formatConfidenceScore = (score: number | null | undefined): string => {
  if (score === null || score === undefined) {
    return 'N/A';
  }
  return `${Math.round(score * 100)}%`;
};

// Styled components for consistent styling and layout
const Container = styled(Card)`
  /* Custom styling for the verification status container with appropriate padding and spacing */
  padding: 16px;
  margin-bottom: 16px;
`;

const Header = styled(Box)`
  /* Flex container for the header section with space-between alignment */
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const StatusSection = styled(Box)`
  /* Container for the status badge and basic verification info */
  display: flex;
  align-items: center;
`;

const VerificationInfo = styled(Box)`
  /* Container for verification method and timestamp with appropriate spacing */
  display: flex;
  align-items: center;
  margin-left: 16px;
`;

const MethodChip = styled(Chip)`
  /* Styled chip for displaying verification method with icon */
  margin-right: 8px;
`;

const TimestampText = styled(Typography)`
  /* Styled typography for verification timestamp with appropriate color and size */
  font-size: 0.875rem;
  color: #757575;
`;

const ConfidenceSection = styled(Box)`
  /* Container for confidence score display with margin */
  margin-top: 16px;
`;

const ConfidenceLabel = styled(Typography)`
  /* Label for confidence score with appropriate size and weight */
  font-size: 0.875rem;
  font-weight: 500;
`;

const DetailsButton = styled(Button)`
  /* Toggle button for expanding/collapsing details section */
  margin-top: 16px;
`;

const DetailsList = styled(List)`
  /* List container for detailed verification information */
  padding: 0;
`;

const DetailItem = styled(ListItem)`
  /* List item for individual verification details */
  paddingLeft: 0;
  paddingRight: 0;
`;

const AnalysisSection = styled(Box)`
  /* Container for AI analysis results with appropriate margin */
  margin-top: 16px;
`;

/**
 * A component that displays the verification status of a document, including verification method, timestamp, and confidence score.
 * It also supports toggling detailed verification information and displaying AI analysis results.
 */
const VerificationStatus: React.FC<VerificationStatusProps> = ({
  document,
  verification,
  showDetails = true,
  showAnalysisResults = true,
  className,
}) => {
  // State for managing expanded details and analysis results
  const [expanded, setExpanded] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AIDocumentAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Fetch analysis results when showAnalysisResults is true
  useEffect(() => {
    if (showAnalysisResults && document.id) {
      setAnalysisLoading(true);
      DocumentService.getDocumentAnalysisResult(document.id)
        .then(results => {
          setAnalysisResults(results);
          setAnalysisError(null);
        })
        .catch(error => {
          setAnalysisError(error.message || 'Failed to load analysis results.');
          setAnalysisResults(null);
        })
        .finally(() => setAnalysisLoading(false));
    }
  }, [document.id, showAnalysisResults]);

  // Determine verification status display
  let statusDisplay: string = 'Pending';
  if (document.is_verified) {
    statusDisplay = 'Verified';
  } else if (verification && verification.verification_status === VerificationStatusEnum.REJECTED) {
    statusDisplay = 'Rejected';
  }

  // Format verification date
  const verificationDate = verification?.verified_at ? formatDate(verification.verified_at, 'MM/dd/yyyy hh:mm a') : null;

  // Calculate confidence score display
  const confidenceScoreDisplay = verification?.confidence_score !== null && verification?.confidence_score !== undefined
    ? formatConfidenceScore(verification.confidence_score)
    : 'N/A';

  // Calculate progress percentage
  const progressPercentage = verification?.confidence_score !== null && verification?.confidence_score !== undefined
    ? Math.round(verification.confidence_score * 100)
    : 0;

  return (
    <Container className={className} data-testid="verification-status">
      <Header>
        <StatusSection>
          <StatusBadge status={statusDisplay} type={StatusType.DOCUMENT} />
          {verification && (
            <VerificationInfo>
              <MethodChip
                icon={getVerificationIcon(verification.verification_method)}
                label={getVerificationMethodLabel(verification.verification_method)}
                size="small"
              />
              {verificationDate && (
                <TimestampText variant="caption">
                  {verificationDate}
                </TimestampText>
              )}
            </VerificationInfo>
          )}
        </StatusSection>
        {verification && verification.confidence_score !== null && verification.confidence_score !== undefined && (
          <ConfidenceSection>
            <ConfidenceLabel variant="body2">
              Confidence: {confidenceScoreDisplay}
            </ConfidenceLabel>
            <ProgressIndicator percentage={progressPercentage} height={5} showPercentage={false} />
          </ConfidenceSection>
        )}
      </Header>

      {showDetails && (
        <>
          <DetailsButton
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse verification details' : 'Expand verification details'}
            endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </DetailsButton>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box mt={2}>
              <Typography variant="subtitle1">Verification Details</Typography>
              <DetailsList>
                <DetailItem>
                  <ListItemText primary={`Status: ${statusDisplay}`} />
                </DetailItem>
                {verification && (
                  <>
                    <DetailItem>
                      <ListItemText primary={`Method: ${getVerificationMethodLabel(verification.verification_method)}`} />
                    </DetailItem>
                    <DetailItem>
                      <ListItemText primary={`Verified By: ${verification.verified_by_user_id || 'System'}`} />
                    </DetailItem>
                    <DetailItem>
                      <ListItemText primary={`Notes: ${verification.notes || 'N/A'}`} />
                    </DetailItem>
                  </>
                )}
              </DetailsList>
            </Box>
          </Collapse>
        </>
      )}

      {showAnalysisResults && (
        <AnalysisSection>
          <DocumentAnalysisResults
            analysisResult={analysisResults}
            isLoading={analysisLoading}
            error={analysisError}
          />
        </AnalysisSection>
      )}
    </Container>
  );
};

export default VerificationStatus;