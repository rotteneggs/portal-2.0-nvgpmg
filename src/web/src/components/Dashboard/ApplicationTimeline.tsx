import React from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.0
import { useSelector } from 'react-redux'; // react-redux ^8.0.0
import {
  Typography,
  Box,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/material'; // @mui/material ^5.0.0
import { Timeline as MuiTimeline, TimelineItem as MuiTimelineItem, TimelineSeparator as MuiTimelineSeparator, TimelineConnector as MuiTimelineConnector, TimelineContent as MuiTimelineContent, TimelineDot as MuiTimelineDot, TimelineOppositeContent as MuiTimelineOppositeContent } from '@mui/lab'; // @mui/lab ^5.0.0
import { Card, StatusBadge } from '../Common';
import { ApplicationStatus } from '../../types/application';
import { formatStatus, formatDate } from '../../utils/formatUtils';
import { selectCurrentApplication } from '../../redux/slices/applicationsSlice';
import { StatusType } from '../Common/StatusBadge';

/**
 * Props interface for the ApplicationTimeline component
 */
export interface ApplicationTimelineProps {
  /** Optional CSS class name for styling */
  className?: string;
  /** Optional click handler for the timeline */
  onClick?: () => void;
}

/**
 * Interface for a timeline item object
 */
export interface TimelineItem {
  /** Status of the timeline item */
  status: string;
  /** Date of the status change */
  date: Date;
  /** Description of the status */
  description: string;
  /** Indicates if the status is the current status */
  isCurrent?: boolean;
  /** Indicates if the status is a future status */
  isFuture?: boolean;
  /** Estimated completion date for future statuses */
  estimatedCompletion?: Date | null;
}

/**
 * Generates timeline items based on application status history
 * @param application - The application object
 * @returns Array of timeline items with status, date, and description
 */
const getTimelineItems = (application: any): TimelineItem[] => {
  // Check if application or application.statuses is null/undefined
  if (!application || !application.statuses) {
    return [];
  }

  // Sort statuses by created_at date in ascending order
  const sortedStatuses = [...application.statuses].sort((a, b) => (new Date(a.created_at)).getTime() - (new Date(b.created_at)).getTime());

  // Map each status to a timeline item object with status, date, and description
  const timelineItems: TimelineItem[] = sortedStatuses.map(status => ({
    status: status.status,
    date: new Date(status.created_at),
    description: getStatusDescription(status.status),
  }));

  return timelineItems;
};

/**
 * Returns a descriptive text for a specific application status
 * @param status - The application status
 * @returns Human-readable description of the status
 */
const getStatusDescription = (status: string): string => {
  switch (status) {
    case ApplicationStatus.DRAFT:
      return 'Application is incomplete. Please complete all required sections.';
    case ApplicationStatus.SUBMITTED:
      return 'Application has been submitted and is awaiting review.';
    case ApplicationStatus.IN_REVIEW:
      return 'Application is currently being reviewed by the admissions committee.';
    case ApplicationStatus.ADDITIONAL_INFO_REQUESTED:
      return 'Additional information has been requested. Please provide the required details.';
    case ApplicationStatus.COMMITTEE_REVIEW:
      return 'Application is under review by the admissions committee.';
    case ApplicationStatus.DECISION_PENDING:
      return 'A decision on your application is pending.';
    case ApplicationStatus.ACCEPTED:
      return 'Congratulations! You have been accepted.';
    case ApplicationStatus.REJECTED:
      return 'We regret to inform you that your application has not been accepted.';
    case ApplicationStatus.WAITLISTED:
      return 'You have been placed on the waitlist.';
    case ApplicationStatus.DEPOSIT_PAID:
      return 'Your enrollment deposit has been received.';
    case ApplicationStatus.ENROLLED:
      return 'Enrollment is complete. Welcome to the institution!';
    case ApplicationStatus.DECLINED:
      return 'You have declined the admission offer.';
    default:
      return `Application is in ${formatStatus(status)} status.`;
  }
};

/**
 * Calculates an estimated completion date for a status based on typical processing times
 * @param status - The application status
 * @param startDate - The start date
 * @returns Estimated completion date or null if not applicable
 */
const getEstimatedCompletionDate = (status: string, startDate: Date): Date | null => {
  if (!status || !startDate) {
    return null;
  }

  switch (status) {
    case ApplicationStatus.IN_REVIEW:
      return new Date(startDate.setDate(startDate.getDate() + 10));
    case ApplicationStatus.COMMITTEE_REVIEW:
      return new Date(startDate.setDate(startDate.getDate() + 7));
    case ApplicationStatus.ADDITIONAL_INFO_REQUESTED:
      return new Date(startDate.setDate(startDate.getDate() + 14));
    default:
      return null;
  }
};

// Styled components for the ApplicationTimeline
const TimelineContainer = styled(Card)`
  padding: 16px;
  margin-bottom: 16px;
`;

const TimelineTitle = styled(Typography)`
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 16px;
`;

const TimelineDate = styled(Typography)`
  color: #757575;
`;

const TimelineStatus = styled(Box)`
  display: flex;
  align-items: center;
`;

const TimelineDescription = styled(Typography)`
  margin-top: 4px;
`;

const EstimatedCompletion = styled(Typography)`
  font-style: italic;
`;

const CurrentDot = styled(TimelineDot)`
  background-color: #1976D2;
`;

const CompletedDot = styled(TimelineDot)`
  background-color: #4CAF50;
`;

const FutureDot = styled(TimelineDot)`
  background-color: #9E9E9E;
`;

/**
 * A component that displays a visual timeline of an application's progress through the admissions process
 */
const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({ className }) => {
  // Get the current application from Redux store
  const application = useSelector(selectCurrentApplication);

  // Generate timeline items based on application status history
  const timelineItems = React.useMemo(() => {
    if (application) {
      return getTimelineItems(application);
    }
    return [];
  }, [application]);

  return (
    <TimelineContainer className={className}>
      <TimelineTitle variant="h6">Application Timeline</TimelineTitle>
      <Timeline>
        {timelineItems.map((item, index) => {
          const isCurrent = index === timelineItems.length - 1;
          const isFuture = index > timelineItems.length - 1;
          const estimatedCompletion = getEstimatedCompletionDate(item.status, item.date);

          return (
            <TimelineItem key={index}>
              <TimelineOppositeContent>
                <TimelineDate variant="body2">
                  {isCurrent ? 'Current' : isFuture ? 'Expected' : formatDate(item.date, 'MMMM dd, yyyy')}
                </TimelineDate>
                {isFuture && estimatedCompletion && (
                  <EstimatedCompletion variant="caption">
                    (Estimated: {formatDate(estimatedCompletion, 'MMMM dd, yyyy')})
                  </EstimatedCompletion>
                )}
              </TimelineOppositeContent>
              <TimelineSeparator>
                {isCurrent ? (
                  <CurrentDot />
                ) : isFuture ? (
                  <FutureDot />
                ) : (
                  <CompletedDot />
                )}
                {index < timelineItems.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <TimelineStatus>
                  <StatusBadge status={item.status} type={StatusType.APPLICATION} />
                </TimelineStatus>
                <TimelineDescription variant="body2">{item.description}</TimelineDescription>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </TimelineContainer>
  );
};

export default ApplicationTimeline;