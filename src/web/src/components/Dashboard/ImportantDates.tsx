import React from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { Typography, Box, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import { Event, Warning } from '@mui/icons-material';

import Card from '../Common/Card';
import { formatDate } from '../../utils/formatUtils';
import { selectCurrentApplication } from '../../redux/slices/applicationsSlice';
import { ApplicationStatus } from '../../types/application';
import { colors } from '../../styles/variables';
import { Nullable } from '../../types/common';

/**
 * Interface for an important date item
 */
interface ImportantDateItem {
  name: string;
  date: Date;
  isUpcoming: boolean;
  description: string;
}

// Styled components for the date list and items
const DateList = styled(List)`
  padding: 0;
`;

const DateItem = styled(ListItem)`
  padding: 8px 0;
  &:hover {
    background-color: ${colors.background.paper};
  }
`;

const DateIcon = styled(ListItemIcon)<{ $isUpcoming?: boolean }>`
  min-width: 40px;
  color: ${props => props.$isUpcoming ? colors.warning : colors.primary};
`;

const DateText = styled(ListItemText)`
  margin: 0;
  
  .MuiListItemText-primary {
    font-weight: 500;
    color: ${colors.text.primary};
  }
  
  .MuiListItemText-secondary {
    color: ${colors.text.secondary};
  }
`;

const UpcomingDate = styled(Box)`
  background-color: ${colors.warning}10;
  border-left: 3px solid ${colors.warning};
  padding-left: 8px;
`;

const EmptyMessage = styled(Typography)`
  padding: 16px 0;
  color: ${colors.text.secondary};
  font-style: italic;
`;

/**
 * Helper function to determine if a date is upcoming (within 2 weeks)
 */
function isUpcoming(date: Date, now: Date): boolean {
  const twoWeeksInMs = 14 * 24 * 60 * 60 * 1000;
  return date.getTime() - now.getTime() <= twoWeeksInMs && date >= now;
}

/**
 * Determines important dates based on application status and type
 * 
 * @param application The current application object
 * @returns Array of important date objects with name, date, and isUpcoming properties
 */
const getImportantDates = (application: any): ImportantDateItem[] => {
  if (!application) return [];
  
  const dates: ImportantDateItem[] = [];
  const now = new Date();
  
  // Extract relevant data from the application
  const status = application.current_status?.status || '';
  const submittedAt = application.submitted_at ? new Date(application.submitted_at) : null;
  const createdAt = new Date(application.created_at);
  
  // Calculate expected decision date (typically 4-6 weeks after submission)
  let decisionDate = null;
  if (submittedAt) {
    decisionDate = new Date(submittedAt);
    decisionDate.setDate(decisionDate.getDate() + 30); // Approximately 4 weeks
  }
  
  // Calculate enrollment deadline (typically 2 weeks after decision)
  let enrollmentDeadline = null;
  if (decisionDate) {
    enrollmentDeadline = new Date(decisionDate);
    enrollmentDeadline.setDate(enrollmentDeadline.getDate() + 14); // 2 weeks
  }
  
  // Add application deadline if in DRAFT status
  if (status === ApplicationStatus.DRAFT) {
    // Set an arbitrary deadline 30 days from creation if not specified
    const deadline = new Date(createdAt);
    deadline.setDate(deadline.getDate() + 30);
    
    dates.push({
      name: 'Application Deadline',
      date: deadline,
      isUpcoming: isUpcoming(deadline, now),
      description: 'Deadline to submit your application'
    });
  }
  
  // Add document submission deadline if in relevant statuses
  if ([ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED, ApplicationStatus.ADDITIONAL_INFO_REQUESTED].includes(status as ApplicationStatus)) {
    const docDeadline = new Date(now);
    docDeadline.setDate(docDeadline.getDate() + 14); // 2 weeks from now as an example
    
    dates.push({
      name: 'Document Submission',
      date: docDeadline,
      isUpcoming: isUpcoming(docDeadline, now),
      description: 'Deadline to submit all required documents'
    });
  }
  
  // Add decision date if in appropriate statuses
  if ([
    ApplicationStatus.SUBMITTED, 
    ApplicationStatus.IN_REVIEW, 
    ApplicationStatus.COMMITTEE_REVIEW, 
    ApplicationStatus.DECISION_PENDING
  ].includes(status as ApplicationStatus) && decisionDate) {
    dates.push({
      name: 'Decision Date',
      date: decisionDate,
      isUpcoming: isUpcoming(decisionDate, now),
      description: 'Expected date for admission decision'
    });
  }
  
  // Add enrollment deadline if accepted
  if (status === ApplicationStatus.ACCEPTED && enrollmentDeadline) {
    dates.push({
      name: 'Enrollment Deadline',
      date: enrollmentDeadline,
      isUpcoming: isUpcoming(enrollmentDeadline, now),
      description: 'Deadline to confirm enrollment'
    });
  }
  
  // Add deposit deadline if accepted
  if (status === ApplicationStatus.ACCEPTED) {
    const depositDeadline = new Date(now);
    depositDeadline.setDate(depositDeadline.getDate() + 14);
    
    dates.push({
      name: 'Deposit Deadline',
      date: depositDeadline,
      isUpcoming: isUpcoming(depositDeadline, now),
      description: 'Deadline to pay enrollment deposit'
    });
  }
  
  // Sort dates by date (ascending)
  dates.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return dates;
};

/**
 * Component that displays important application deadlines and dates
 * 
 * This component shows upcoming deadlines such as decision dates,
 * enrollment deadlines, and other critical dates in the admissions process.
 */
const ImportantDates: React.FC = () => {
  // Get current application from Redux store
  const currentApplication = useSelector(selectCurrentApplication);
  
  // Get important dates based on application status
  const dates = getImportantDates(currentApplication);
  
  return (
    <Card title="Important Dates">
      {dates.length === 0 ? (
        <EmptyMessage variant="body2">
          No important dates to display at this time.
        </EmptyMessage>
      ) : (
        <DateList>
          {dates.map((date, index) => (
            <DateItem key={index}>
              <DateIcon $isUpcoming={date.isUpcoming}>
                {date.isUpcoming ? <Warning /> : <Event />}
              </DateIcon>
              {date.isUpcoming ? (
                <UpcomingDate>
                  <DateText
                    primary={date.name}
                    secondary={`${formatDate(date.date, 'MMM d, yyyy')} - ${date.description}`}
                  />
                </UpcomingDate>
              ) : (
                <DateText
                  primary={date.name}
                  secondary={`${formatDate(date.date, 'MMM d, yyyy')} - ${date.description}`}
                />
              )}
            </DateItem>
          ))}
        </DateList>
      )}
    </Card>
  );
};

export default ImportantDates;