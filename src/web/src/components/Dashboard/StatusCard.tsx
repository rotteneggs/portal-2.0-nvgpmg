import React from 'react';
import styled from '@emotion/styled';
import { Box, Typography, Divider } from '@mui/material';
import Card from '../Common/Card';
import ProgressIndicator from '../Common/ProgressIndicator';
import StatusBadge, { StatusType } from '../Common/StatusBadge';
import { formatStatus } from '../../utils/formatUtils';
import { formatDate } from '../../utils/dateUtils';
import { ApplicationStatus } from '../../types/application';
import { colors, spacing } from '../../styles/variables';

/**
 * Props interface for the StatusCard component
 */
interface StatusCardProps {
  /** Current application status */
  status: string;
  /** Percentage of application completion (0-100) */
  completionPercentage: number;
  /** ISO timestamp of when the application was last updated */
  updatedAt: string;
  /** Optional callback function when card is clicked */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Optional CSS class name */
  className?: string;
}

// Styled components for the card layout and styling
const StatusContainer = styled(Box)`
  padding: ${spacing.md};
`;

const StatusHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.md};
`;

const ProgressContainer = styled(Box)`
  margin: ${spacing.md} 0;
`;

const UpdatedText = styled(Typography)`
  color: ${colors.neutralMedium};
  font-size: 0.875rem;
`;

const DescriptionText = styled(Typography)`
  margin: ${spacing.md} 0;
`;

const NextStepsText = styled(Typography)`
  font-weight: 500;
  margin-top: ${spacing.md};
`;

/**
 * A card component that displays application status information on the student dashboard.
 * Shows the current status, completion percentage, and last update time in a visually appealing card format.
 */
const StatusCard: React.FC<StatusCardProps> = ({
  status,
  completionPercentage = 0,
  updatedAt,
  onClick,
  className = '',
}) => {
  /**
   * Returns a description based on the current application status
   */
  const getStatusDescription = (status: string): string => {
    switch (status) {
      case ApplicationStatus.DRAFT:
        return 'Your application is in draft mode. Complete all required sections and submit when ready.';
      case ApplicationStatus.SUBMITTED:
        return 'Your application has been received and is under initial review.';
      case ApplicationStatus.IN_REVIEW:
        return 'Your application is being reviewed by the admissions committee.';
      case ApplicationStatus.ADDITIONAL_INFO_REQUESTED:
        return 'Additional information is needed to continue processing your application.';
      case ApplicationStatus.COMMITTEE_REVIEW:
        return 'Your application is being evaluated by the admissions committee.';
      case ApplicationStatus.DECISION_PENDING:
        return 'A decision on your application is being finalized.';
      case ApplicationStatus.ACCEPTED:
        return 'Congratulations! Your application has been accepted.';
      case ApplicationStatus.REJECTED:
        return 'We regret to inform you that your application has not been accepted.';
      case ApplicationStatus.WAITLISTED:
        return 'Your application has been placed on our waitlist.';
      case ApplicationStatus.DEPOSIT_PAID:
        return 'Your enrollment deposit has been received. Please complete the remaining enrollment steps.';
      case ApplicationStatus.ENROLLED:
        return 'You are officially enrolled! Welcome to our institution.';
      case ApplicationStatus.DECLINED:
        return 'You have declined your admission offer.';
      default:
        return 'Your application is being processed.';
    }
  };

  /**
   * Returns guidance on next steps based on the current application status
   */
  const getNextSteps = (status: string): string => {
    switch (status) {
      case ApplicationStatus.DRAFT:
        return 'Complete all required sections of your application before the deadline.';
      case ApplicationStatus.SUBMITTED:
        return 'Monitor your application status and check for messages from the admissions office.';
      case ApplicationStatus.IN_REVIEW:
        return 'Please be patient while we review your application. This may take several weeks.';
      case ApplicationStatus.ADDITIONAL_INFO_REQUESTED:
        return 'Please provide the requested additional information as soon as possible.';
      case ApplicationStatus.COMMITTEE_REVIEW:
        return 'Your application is being reviewed by the committee. No action is required at this time.';
      case ApplicationStatus.DECISION_PENDING:
        return 'A decision will be made soon. Check back regularly for updates.';
      case ApplicationStatus.ACCEPTED:
        return 'Complete enrollment steps and pay your deposit to secure your spot.';
      case ApplicationStatus.REJECTED:
        return 'Contact the admissions office if you have questions about your application result.';
      case ApplicationStatus.WAITLISTED:
        return 'Monitor your status regularly for potential updates on your waitlist status.';
      case ApplicationStatus.DEPOSIT_PAID:
        return 'Complete the remaining enrollment steps including course registration and orientation.';
      case ApplicationStatus.ENROLLED:
        return 'Prepare for orientation and the start of classes.';
      case ApplicationStatus.DECLINED:
        return 'No further action is required. Contact admissions if you wish to discuss your decision.';
      default:
        return 'Check back later for updates on your application.';
    }
  };

  const statusDescription = getStatusDescription(status);
  const nextSteps = getNextSteps(status);
  const formattedDate = formatDate(updatedAt, 'MMM d, yyyy');

  return (
    <Card onClick={onClick} className={className} clickable={!!onClick}>
      <StatusContainer>
        <StatusHeader>
          <StatusBadge status={status} type={StatusType.APPLICATION} />
          <UpdatedText variant="caption">
            Last updated: {formattedDate}
          </UpdatedText>
        </StatusHeader>
        
        <ProgressContainer>
          <ProgressIndicator 
            percentage={completionPercentage} 
            label="Application Progress"
          />
        </ProgressContainer>
        
        <Divider />
        
        <DescriptionText variant="body2">
          {statusDescription}
        </DescriptionText>
        
        <NextStepsText variant="body2">
          Next steps: {nextSteps}
        </NextStepsText>
      </StatusContainer>
    </Card>
  );
};

export default StatusCard;