import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.0.0
import { Box, Typography, Divider, Button, CircularProgress } from '@mui/material'; // @mui/material ^5.11.0
import { InfoOutlined, AccessTimeOutlined } from '@mui/icons-material'; // @mui/icons-material ^5.11.0
import Card from '../Common/Card';
import ProgressIndicator from '../Common/ProgressIndicator';
import StatusBadge, { StatusType } from '../Common/StatusBadge';
import ApplicationTimeline from '../Dashboard/ApplicationTimeline';
import { Application, ApplicationStatus, ApplicationStatusRecord } from '../../types/application';
import { getApplicationStatuses } from '../../api/applications';
import { formatDate } from '../../utils/dateUtils';

/**
 * Props interface for the ApplicationStatus component
 */
export interface ApplicationStatusProps {
  /**
   * The application object containing status information
   */
  application: Application;
  /**
   * Optional CSS class name for styling
   * @default ""
   */
  className?: string;
  /**
   * Whether to show the application timeline
   * @default true
   */
  showTimeline?: boolean;
  /**
   * Whether to show next steps guidance
   * @default true
   */
  showNextSteps?: boolean;
  /**
   * Whether to show estimated timeframe for next update
   * @default true
   */
  showEstimatedTimeframe?: boolean;
  /**
   * Optional callback for requesting additional information
   */
  onRequestInfo?: () => void;
}

// Styled components for the ApplicationStatus
const StatusContainer = styled(Box)`
  padding: 16px;
`;

const StatusHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const StatusContent = styled(Box)`
  display: flex;
  flex-direction: column;
`;

const StatusDescription = styled(Typography)`
  margin-top: 8px;
`;

const NextStepsSection = styled(Box)`
  margin-top: 24px;
`;

const NextStepsTitle = styled(Typography)`
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 8px;
`;

const NextStepsContent = styled(Typography)`
  color: #757575;
`;

const TimeframeSection = styled(Box)`
  display: flex;
  align-items: center;
  margin-top: 16px;
`;

const TimeframeTitle = styled(Typography)`
  display: flex;
  align-items: center;
  margin-right: 8px;
  color: #757575;
`;

const TimeframeContent = styled(Typography)`
  color: #757575;
`;

const StyledDivider = styled(Divider)`
  margin: 16px 0;
`;

const ActionButton = styled(Button)`
  margin-top: 16px;
`;

/**
 * A component that displays the current status of an application with visual indicators and detailed information
 */
const ApplicationStatus: React.FC<ApplicationStatusProps> = ({
  application,
  className = '',
  showTimeline = true,
  showNextSteps = true,
  showEstimatedTimeframe = true,
  onRequestInfo,
}) => {
  // Track loading state for status history
  const [loading, setLoading] = useState(false);
  // Store status history records
  const [statusHistory, setStatusHistory] = useState<ApplicationStatusRecord[]>([]);

  /**
   * Fetches the status history for the application
   */
  const fetchStatusHistory = useCallback(async () => {
    setLoading(true);
    try {
      // Call getApplicationStatuses API with application ID
      const data = await getApplicationStatuses(application.id);
      // Update statusHistory state with the response data
      setStatusHistory(data);
    } catch (error) {
      console.error('Failed to fetch application status history:', error);
    } finally {
      setLoading(false);
    }
  }, [application.id]);

  // Fetch status history when application changes
  useEffect(() => {
    fetchStatusHistory();
  }, [fetchStatusHistory]);

  /**
   * Calculates the progress percentage based on application status
   */
  const calculateProgress = useCallback(() => {
    // Define a mapping of statuses to progress percentages
    const progressMap: { [key: string]: number } = {
      [ApplicationStatus.DRAFT]: 10,
      [ApplicationStatus.SUBMITTED]: 25,
      [ApplicationStatus.IN_REVIEW]: 40,
      [ApplicationStatus.ADDITIONAL_INFO_REQUESTED]: 50,
      [ApplicationStatus.COMMITTEE_REVIEW]: 60,
      [ApplicationStatus.DECISION_PENDING]: 75,
      [ApplicationStatus.ACCEPTED]: 90,
      [ApplicationStatus.WAITLISTED]: 90,
      [ApplicationStatus.REJECTED]: 100,
      [ApplicationStatus.DEPOSIT_PAID]: 95,
      [ApplicationStatus.ENROLLED]: 100,
      [ApplicationStatus.DECLINED]: 100,
    };

    // Return the progress percentage for the current status or a default value
    return progressMap[application.current_status?.status || ApplicationStatus.DRAFT] || 0;
  }, [application.current_status?.status]);

  /**
   * Renders the status badge with appropriate styling
   */
  const renderStatusBadge = useCallback(() => {
    return (
      <StatusBadge status={application.current_status?.status || ApplicationStatus.DRAFT} type={StatusType.APPLICATION} />
    );
  }, [application.current_status?.status]);

  /**
   * Renders the last updated timestamp
   */
  const renderLastUpdated = useCallback(() => {
    // Format the application's updated_at timestamp using formatDate
    const formattedDate = formatDate(application.updated_at, 'MMMM dd, yyyy');
    return (
      <Typography variant="body2">
        Last updated: {formattedDate}
      </Typography>
    );
  }, [application.updated_at]);

  /**
   * Renders the progress indicator
   */
  const renderProgressIndicator = useCallback(() => {
    // Calculate progress percentage using calculateProgress
    const progress = calculateProgress();
    return (
      <ProgressIndicator percentage={progress} />
    );
  }, [calculateProgress]);

  /**
   * Renders the application timeline if showTimeline is true
   */
  const renderTimeline = useCallback(() => {
    if (!showTimeline) return null;

    if (loading) {
      return <CircularProgress />;
    }

    return (
      <ApplicationTimeline application={application} statusHistory={statusHistory} />
    );
  }, [showTimeline, loading, application, statusHistory]);

  /**
   * Renders the next steps guidance if showNextSteps is true
   */
  const renderNextSteps = useCallback(() => {
    if (!showNextSteps) return null;

    // Get next steps guidance using getNextSteps with current status
    const nextSteps = getNextSteps(application.current_status?.status || ApplicationStatus.DRAFT);

    return (
      <NextStepsSection>
        <NextStepsTitle variant="h6">Next Steps</NextStepsTitle>
        <NextStepsContent variant="body2">{nextSteps}</NextStepsContent>
      </NextStepsSection>
    );
  }, [showNextSteps, application.current_status?.status]);

  /**
   * Renders the estimated timeframe if showEstimatedTimeframe is true
   */
  const renderEstimatedTimeframe = useCallback(() => {
    if (!showEstimatedTimeframe) return null;

    // Get estimated timeframe using getEstimatedTimeframe with current status
    const timeframe = getEstimatedTimeframe(application.current_status?.status || ApplicationStatus.DRAFT);

    return (
      <TimeframeSection>
        <TimeframeTitle variant="body2">
          <AccessTimeOutlined fontSize="small" sx={{ marginRight: '4px' }} />
          Estimated Timeframe:
        </TimeframeTitle>
        <TimeframeContent variant="body2">{timeframe}</TimeframeContent>
      </TimeframeSection>
    );
  }, [showEstimatedTimeframe, application.current_status?.status]);

  return (
    <Card className={className}>
      <StatusContainer>
        <StatusHeader>
          {renderStatusBadge()}
          {renderLastUpdated()}
        </StatusHeader>
        <StatusContent>
          <StatusDescription variant="body1">
            {getStatusDescription(application.current_status?.status || ApplicationStatus.DRAFT)}
          </StatusDescription>
          {renderProgressIndicator()}
        </StatusContent>
        <StyledDivider />
        {renderTimeline()}
        <StyledDivider />
        {renderNextSteps()}
        {renderEstimatedTimeframe()}
        {onRequestInfo && (
          <ActionButton variant="outlined" color="primary" onClick={onRequestInfo}>
            Request More Information
          </ActionButton>
        )}
      </StatusContainer>
    </Card>
  );
};

/**
 * Returns a human-readable description of the application status
 */
function getStatusDescription(status: string): string {
  switch (status) {
    case ApplicationStatus.DRAFT:
      return 'Your application has been started but not yet submitted.';
    case ApplicationStatus.SUBMITTED:
      return 'Your application has been submitted and is awaiting initial review.';
    case ApplicationStatus.IN_REVIEW:
      return 'Your application is currently being reviewed by the admissions committee.';
    case ApplicationStatus.ADDITIONAL_INFO_REQUESTED:
      return 'Additional information is required to continue processing your application.';
    case ApplicationStatus.COMMITTEE_REVIEW:
      return 'Your application is being reviewed by the admissions committee.';
    case ApplicationStatus.DECISION_PENDING:
      return 'A decision on your application is pending and will be communicated soon.';
    case ApplicationStatus.ACCEPTED:
      return 'Congratulations! Your application has been accepted.';
    case ApplicationStatus.WAITLISTED:
      return 'You have been placed on the waitlist. We will notify you if a spot becomes available.';
    case ApplicationStatus.REJECTED:
      return 'We regret to inform you that your application has not been accepted.';
    case ApplicationStatus.DEPOSIT_PAID:
      return 'Your enrollment deposit has been received.';
    case ApplicationStatus.ENROLLED:
      return 'You are officially enrolled. Welcome!';
    case ApplicationStatus.DECLINED:
      return 'You have declined the admission offer.';
    default:
      return 'Current status of your application.';
  }
}

/**
 * Returns guidance on next steps based on the current application status
 */
function getNextSteps(status: string): string {
  switch (status) {
    case ApplicationStatus.DRAFT:
      return 'Complete all required sections and submit your application.';
    case ApplicationStatus.SUBMITTED:
      return 'Ensure all required documents are uploaded and monitor your application status.';
    case ApplicationStatus.IN_REVIEW:
      return 'No action required. You will be notified if additional information is needed.';
    case ApplicationStatus.ADDITIONAL_INFO_REQUESTED:
      return 'Please provide the requested information as soon as possible.';
    case ApplicationStatus.COMMITTEE_REVIEW:
      return 'No action required. The committee is reviewing your application.';
    case ApplicationStatus.DECISION_PENDING:
      return 'A decision will be communicated to you shortly.';
    case ApplicationStatus.ACCEPTED:
      return 'Pay your enrollment deposit to secure your spot.';
    case ApplicationStatus.WAITLISTED:
      return 'No action required. We will contact you if a spot becomes available.';
    case ApplicationStatus.REJECTED:
      return 'You may apply again in the future or explore other programs.';
    case ApplicationStatus.DEPOSIT_PAID:
      return 'Complete the enrollment process and prepare for orientation.';
    case ApplicationStatus.ENROLLED:
      return 'Prepare for your academic journey. Check your email for orientation details.';
    case ApplicationStatus.DECLINED:
      return 'No further action required.';
    default:
      return 'Monitor your application status for updates.';
  }
}

/**
 * Returns an estimated timeframe for the next status update based on current status
 */
function getEstimatedTimeframe(status: string): string {
  switch (status) {
    case ApplicationStatus.DRAFT:
      return 'Submit at your own pace before the application deadline.';
    case ApplicationStatus.SUBMITTED:
      return 'Initial review typically takes 1-2 weeks.';
    case ApplicationStatus.IN_REVIEW:
      return 'Review process typically takes 2-4 weeks.';
    case ApplicationStatus.ADDITIONAL_INFO_REQUESTED:
      return 'Please respond within 2 weeks to avoid delays.';
    case ApplicationStatus.COMMITTEE_REVIEW:
      return 'Committee review typically takes 1-2 weeks.';
    case ApplicationStatus.DECISION_PENDING:
      return 'Decisions are typically communicated within 1 week.';
    case ApplicationStatus.ACCEPTED:
      return 'Please pay your deposit within 2 weeks to secure your spot.';
    case ApplicationStatus.WAITLISTED:
      return 'Waitlist updates are provided as spots become available.';
    default:
      return 'Timeframe varies based on application volume.';
  }
}

export default ApplicationStatus;